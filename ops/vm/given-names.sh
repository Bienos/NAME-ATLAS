#!/usr/bin/env bash
# Loads the PESEL first-name lists on the database VM and derives every name's
# count and rank on each list (TASK-133), and every name's origin and meaning
# from the two public-domain works (TASK-147), so the full-name report
# (TASK-124) has its first-name facts in production:
#
#   1. unpack the pushed commit into $APP (data/ and node_modules/ kept) and
#      pnpm install, as meanings.sh does; the register build is left alone;
#   2. pnpm db:migrate: 0031 (the given-name tables, TASK-078), 0038 (their
#      claim types, TASK-122), 0039 (the full-name report, TASK-124), 0044
#      (the meaning claim type, TASK-147) and any other migration still
#      pending;
#   3. download each first-name file of the registry
#      (packages/sources/src/given-names/registry.ts) into $FILES, unless the
#      copy there already has the registry's size and SHA-256; a download that
#      differs in either is refused, never imported;
#   4. import each file with its committed metadata, and the three committed
#      first-name meaning files (sources/given-name-meanings/; Brückner 1927
#      since TASK-150). Identical bytes
#      import nothing; the importer checks the checksum again before parsing;
#   5. derive every name's GIVEN_NAME_POPULATION on each list and, the files
#      being the complete official ones, its GIVEN_NAME_RANK, in one process;
#      then every GIVEN_NAME_MEANING the meaning files support. A claim that
#      already stands is reused;
#   6. the gate: one ACTIVE record per file, the registry's count of names on
#      each, a count claim and a rank claim for every stored row, nothing
#      refused, one ACTIVE record per meaning file, as many ACTIVE meaning
#      claims as the derivation tallied, one ACTIVE claim per claim_key; then
#      read access for the web role.
#
# Repeatable: a second run downloads, imports and derives nothing, and passes
# the gate. Runs after finalize.sh, and not while the register build, the
# archive load, the bearers load or the change-over-time batch runs, since
# unpacking would change the code under them. Runs as root:
# `sudo bash given-names.sh ABSOLUTE_PATH_TO_ARCHIVE`. Everything under the
# build user's home is done as the build user, over the Unix socket.
set -euo pipefail

BUSY_UNITS=(name-atlas-register-build name-atlas-archive-load name-atlas-bearers-load name-atlas-shift-batch)
DB=name_atlas
WEB_ROLE=nameatlas_web
BUILD_USER=nameatlas
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
STATE=/var/lib/name-atlas
FINALIZED=$STATE/register-finalized
FILES=$APP/data/given-names
METADATA=$APP/docs/sources/acquisition/2026-10-03/metadata
REGISTRY=./packages/sources/src/given-names/registry.ts
SOURCE_KEY=pl_pesel_given_names
MEANING_FILES=(buryan-1933 yonge-1884 bruckner-1927)
MEANING_SOURCE_KEYS=(buryan_1933_skad_pochodzi yonge_1884_history_of_christian_names bruckner_1927_slownik_etymologiczny)
ARCHIVE=${1:-}

log() { echo "[given-names] $*"; }
die() { echo "[given-names] ERROR: $*" >&2; exit 1; }
q() { runuser -u postgres -- psql -X -tA -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }

build_env=(env HOME="$OPS_HOME" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 PATH=/usr/local/bin:/usr/bin:/bin
  DATABASE_URL="postgresql://$BUILD_USER@/$DB?host=/var/run/postgresql")
as_build() {
  # shellcheck disable=SC2016 # $1 and $@ belong to the inner shell
  runuser -u "$BUILD_USER" -- "${build_env[@]}" bash -c 'cd "$1" && shift && exec "$@"' _ "$APP" "$@"
}

[ "$(id -u)" = 0 ] || die "run as root"
# The SSH user's home, where `sudo` leaves the working directory, is not
# readable by the users these scripts run commands as (`runuser -u ...`).
cd /
[ -f "$FINALIZED" ] || die "finalize has not run ($FINALIZED is missing)"
if [ -d /run/systemd/system ]; then
  for unit in "${BUSY_UNITS[@]}"; do
    state=$(systemctl show -p ActiveState --value "$unit" 2>/dev/null || true)
    case "$state" in
      active | activating | deactivating | reloading) die "$unit is running (ActiveState=$state); run this when it has finished" ;;
    esac
  done
fi

log "1/6 unpack the pushed commit into $APP and pnpm install (the register build is left alone)"
case "$ARCHIVE" in /*) ;; *) die "usage: given-names.sh ABSOLUTE_PATH_TO_ARCHIVE" ;; esac
if [ ! -f "$ARCHIVE" ] || [ -L "$ARCHIVE" ] || [ ! -s "$ARCHIVE" ]; then
  die "$ARCHIVE must be a non-empty regular file"
fi
runuser -u "$BUILD_USER" -- mkdir -p "$APP"
runuser -u "$BUILD_USER" -- find "$APP" -mindepth 1 -maxdepth 1 ! -name data ! -name node_modules -exec rm -rf {} +
runuser -u "$BUILD_USER" -- tar -C "$APP" -xzf - <"$ARCHIVE"
rm -f "$ARCHIVE"
as_build pnpm install --frozen-lockfile --reporter=append-only | tail -n 5

log "2/6 pnpm db:migrate"
as_build pnpm db:migrate | tail -n 10
q "SELECT '[given-names]   migrations ' || count(*) || ', last ' || max(name) FROM kysely_migration"
[ "$(q "SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'claim_type'
           AND e.enumlabel IN ('GIVEN_NAME_POPULATION', 'GIVEN_NAME_RANK', 'GIVEN_NAME_MEANING')")" = 3 ] ||
  die "claim_type has no GIVEN_NAME_POPULATION, GIVEN_NAME_RANK and GIVEN_NAME_MEANING after the migration"

# One line per file: resource id, SHA-256, bytes, names a complete import stores, URL.
mapfile -t resources < <(as_build pnpm exec tsx -e "
  import { GIVEN_NAME_RESOURCES_2026 as r } from '$REGISTRY';
  for (const x of r) console.log([x.resource_id, x.official_sha256, x.official_byte_size,
    x.official_name_row_count, x.official_source_url].join(' '));")
[ "${#resources[@]}" -gt 0 ] || die "the registry lists no first-name files"

log "3/6 download the ${#resources[@]} first-name files into $FILES"
runuser -u "$BUILD_USER" -- mkdir -p "$FILES"
for line in "${resources[@]}"; do
  read -r id sha bytes _ url <<<"$line"
  file=$FILES/$id.csv
  if [ -f "$file" ] && [ "$(sha256sum "$file" | cut -d' ' -f1)" = "$sha" ]; then
    log "  $id: already on disk with the registry's checksum"
    continue
  fi
  runuser -u "$BUILD_USER" -- curl -fsSL --retry 5 --retry-delay 10 -o "$file.partial" "$url"
  got_bytes=$(stat -c %s "$file.partial")
  got_sha=$(sha256sum "$file.partial" | cut -d' ' -f1)
  if [ "$got_bytes" != "$bytes" ] || [ "$got_sha" != "$sha" ]; then
    rm -f "$file.partial"
    die "$id: downloaded $got_bytes bytes, SHA-256 $got_sha; the registry pins $bytes bytes, $sha. The publisher has changed the file: nothing is imported."
  fi
  runuser -u "$BUILD_USER" -- mv "$file.partial" "$file"
  log "  $id: $got_bytes bytes, SHA-256 matches the registry"
done

log "4/6 import each file"
for line in "${resources[@]}"; do
  read -r id _ <<<"$line"
  as_build pnpm exec tsx packages/sources/bin/import-given-names.ts --resource "$id" \
    --file "$FILES/$id.csv" \
    --metadata "$METADATA/pesel_given_names_2026_first_$id.official_resource.json" |
    sed 's/^/[given-names]   /'
done
for file in "${MEANING_FILES[@]}"; do
  as_build pnpm exec tsx packages/sources/bin/import-given-name-meanings.ts \
    --file "sources/given-name-meanings/$file.json" | sed 's/^/[given-names]   /'
done

log "5/6 every name's count and rank on each list, in one process"
# The tally is the one JSON document on stdout; progress goes to stderr.
tally=$(as_build pnpm exec tsx packages/truth/bin/derive-given-names.ts)
read -r names pop_derived pop_existing pop_refused rank_derived rank_existing rank_refused < <(
  as_build node -e '
    const t = JSON.parse(process.argv[1]);
    const refused = Object.values(t.rank.refused).reduce((a, b) => a + b, 0);
    console.log([t.names, t.population.derived, t.population.existing, t.population.refused,
      t.rank.derived, t.rank.existing, refused].join(" "));' "$tally")
log "  $names names: counts $pop_derived new, $pop_existing kept, $pop_refused refused; ranks $rank_derived new, $rank_existing kept, $rank_refused refused"
[ "$rank_refused" = 0 ] || log "  rank refusals by reason: $(as_build node -e 'console.log(JSON.stringify(JSON.parse(process.argv[1]).rank.refused))' "$tally")"
meanings=$(as_build pnpm exec tsx packages/truth/bin/derive-given-name-meanings.ts)
read -r m_names m_derived m_existing m_superseded m_retracted < <(
  as_build node -e '
    const t = JSON.parse(process.argv[1]);
    console.log([t.names, t.derived, t.existing, t.superseded, t.retracted].join(" "));' "$meanings")
log "  meanings of $m_names names: $m_derived new ($m_superseded replacing one), $m_existing kept, $m_retracted retracted"

log "6/6 the gate, then read access for $WEB_ROLE"
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "[given-names]   ok   $1 = $3"; else echo "[given-names]   FAIL $1 = $3, expected $2"; fail=1; fi
}
stored_total=0
for line in "${resources[@]}"; do
  read -r id _ _ rows _ <<<"$line"
  check "$id: ACTIVE records" 1 "$(q "
    SELECT count(*) FROM source_records sr JOIN sources s ON s.source_id = sr.source_id
     WHERE s.source_key = '$SOURCE_KEY' AND sr.external_record_id = '$id' AND sr.record_status = 'ACTIVE'")"
  stored=$(q "
    SELECT count(*) FROM given_name_counts gc
      JOIN source_records sr ON sr.source_record_id = gc.source_record_id
      JOIN sources s ON s.source_id = sr.source_id
     WHERE s.source_key = '$SOURCE_KEY' AND sr.external_record_id = '$id' AND sr.record_status = 'ACTIVE'")
  check "$id: names stored" "$rows" "$stored"
  stored_total=$((stored_total + stored))
done
check "names derived" "$(q "SELECT count(*) FROM given_names")" "$names"
check "counts refused" 0 "$pop_refused"
check "ranks refused" 0 "$rank_refused"
check "ACTIVE GIVEN_NAME_POPULATION claims" "$stored_total" "$(q "
  SELECT count(*) FROM claims WHERE claim_type::text = 'GIVEN_NAME_POPULATION' AND claim_status = 'ACTIVE'")"
check "ACTIVE GIVEN_NAME_RANK claims" "$stored_total" "$(q "
  SELECT count(*) FROM claims WHERE claim_type::text = 'GIVEN_NAME_RANK' AND claim_status = 'ACTIVE'")"
for i in "${!MEANING_FILES[@]}"; do
  check "${MEANING_FILES[$i]}: ACTIVE first-name meaning records" 1 "$(q "
    SELECT count(*) FROM source_records sr JOIN sources s ON s.source_id = sr.source_id
     WHERE s.source_key = '${MEANING_SOURCE_KEYS[$i]}'
       AND sr.external_record_id LIKE '%:given-names' AND sr.record_status = 'ACTIVE'")"
done
check "ACTIVE GIVEN_NAME_MEANING claims" "$((m_derived + m_existing))" "$(q "
  SELECT count(*) FROM claims WHERE claim_type::text = 'GIVEN_NAME_MEANING' AND claim_status = 'ACTIVE'")"
check "ACTIVE claims sharing a claim_key" 0 \
  "$(q "SELECT count(*) FROM (SELECT 1 FROM claims WHERE claim_status = 'ACTIVE' GROUP BY claim_key HAVING count(*) > 1) d")"
q "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE" >/dev/null
check "tables $WEB_ROLE cannot read" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
     AND NOT has_table_privilege('$WEB_ROLE', c.oid, 'SELECT')")"
[ "$fail" = 0 ] || die "the gate failed"

date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE/given-names-loaded"
log "done: $names first names, each with its count and rank on every list it is on; $((m_derived + m_existing)) with an origin or meaning"
