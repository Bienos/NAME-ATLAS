#!/usr/bin/env bash
# Loads the first names given to children, by year of birth (dane.gov.pl
# dataset 219; TASK-136, ADR-0042), on the database VM and derives their
# claims (TASK-137, TASK-139, ADR-0043), so the baby-name page (TASK-141) has
# data in production (TASK-142):
#
#   1. unpack the pushed commit into $APP (data/ and node_modules/ kept) and
#      pnpm install, as given-names.sh does; the register build is left alone;
#   2. pnpm db:migrate: 0040 (the birth-list tables), 0041 (their claim types)
#      and any other migration still pending;
#   3. download each file of BIRTH_NAME_RESOURCES
#      (packages/sources/src/given-names/births-registry.ts) into $FILES,
#      unless the copy there already has the registry's SHA-256; a download
#      whose size or SHA-256 differs is refused, never imported;
#   4. import each file with its committed metadata. Identical bytes import
#      nothing; the importer checks the checksum again before parsing;
#   5. derive every name's GIVEN_NAME_BIRTH_COUNT and GIVEN_NAME_BIRTH_RANK on
#      each list and its GIVEN_NAME_BIRTH_TREND on the latest, in one process.
#      A claim that already stands is reused;
#   6. the gate: one ACTIVE record per file, the registry's lists, rows and
#      children on each, a count claim and a rank claim for every stored
#      count, every ACTIVE trend at the current method version and as many as
#      the derivation tallied, nothing refused, one ACTIVE claim per
#      claim_key; then read access for the web role.
#
# Repeatable: a second run downloads, imports and derives nothing, and passes
# the gate. Runs after finalize.sh, and not while the register build, the
# archive load, the bearers load or the change-over-time batch runs, since
# unpacking would change the code under them. Runs as root:
# `sudo bash given-name-births.sh ABSOLUTE_PATH_TO_ARCHIVE`. Everything under
# the build user's home is done as the build user, over the Unix socket.
set -euo pipefail

BUSY_UNITS=(name-atlas-register-build name-atlas-archive-load name-atlas-bearers-load name-atlas-shift-batch)
DB=name_atlas
WEB_ROLE=nameatlas_web
BUILD_USER=nameatlas
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
STATE=/var/lib/name-atlas
FINALIZED=$STATE/register-finalized
FILES=$APP/data/given-name-births
METADATA=$APP/docs/sources/acquisition/2026-10-06/metadata
REGISTRY=./packages/sources/src/given-names/births-registry.ts
VERSIONS=./packages/truth/src/version.ts
SOURCE_KEY=pl_pesel_birth_given_names
TREND_METHOD=given_name_birth_trend@2
ARCHIVE=${1:-}

log() { echo "[given-name-births] $*"; }
die() { echo "[given-name-births] ERROR: $*" >&2; exit 1; }
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
case "$ARCHIVE" in /*) ;; *) die "usage: given-name-births.sh ABSOLUTE_PATH_TO_ARCHIVE" ;; esac
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
q "SELECT '[given-name-births]   migrations ' || count(*) || ', last ' || max(name) FROM kysely_migration"
[ "$(q "SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'claim_type'
           AND e.enumlabel IN ('GIVEN_NAME_BIRTH_COUNT', 'GIVEN_NAME_BIRTH_RANK', 'GIVEN_NAME_BIRTH_TREND')")" = 3 ] ||
  die "claim_type lacks GIVEN_NAME_BIRTH_COUNT, GIVEN_NAME_BIRTH_RANK or GIVEN_NAME_BIRTH_TREND after the migration"
code_method=$(as_build pnpm exec tsx -e "
  import { GIVEN_NAME_BIRTH_TREND_METHOD_VERSION as v } from '$VERSIONS';
  console.log(v);")
[ "$code_method" = "$TREND_METHOD" ] ||
  die "the pushed commit derives trends as $code_method; this step gates $TREND_METHOD and must be updated with it"

# One line per file: resource id, SHA-256, bytes, rows, children, lists (years × sexes), URL.
mapfile -t resources < <(as_build pnpm exec tsx -e "
  import { BIRTH_NAME_RESOURCES as r } from '$REGISTRY';
  for (const x of r) console.log([x.resource_id, x.official_sha256, x.official_byte_size,
    x.official_row_count, x.official_people_sum, x.years.length * x.sexes.length,
    x.official_source_url].join(' '));")
[ "${#resources[@]}" -gt 0 ] || die "the registry lists no birth-name files"

log "3/6 download the ${#resources[@]} birth-name files into $FILES"
runuser -u "$BUILD_USER" -- mkdir -p "$FILES"
for line in "${resources[@]}"; do
  read -r id sha bytes _ _ _ url <<<"$line"
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
  as_build pnpm exec tsx packages/sources/bin/import-given-name-births.ts --resource "$id" \
    --file "$FILES/$id.csv" \
    --metadata "$METADATA/pesel_birth_given_names_first_$id.official_resource.json" |
    sed 's/^\[given-name-births\] /[given-name-births]   /'
done

log "5/6 every name's count and rank on each list, and its trend, in one process"
# The tally is the one JSON document on stdout; progress goes to stderr.
tally=$(as_build pnpm exec tsx packages/truth/bin/derive-given-name-births.ts)
read -r names flagged count_new count_kept count_refused rank_new rank_kept rank_refused \
  trend_new trend_kept trend_refused trend_superseded < <(
  as_build node -e '
    const t = JSON.parse(process.argv[1]);
    const sum = (r) => Object.values(r).reduce((a, b) => a + b, 0);
    console.log([t.names, t.flagged,
      t.count.derived, t.count.existing, sum(t.count.refused),
      t.rank.derived, t.rank.existing, sum(t.rank.refused),
      t.trend.derived, t.trend.existing, sum(t.trend.refused), t.trend.superseded].join(" "));' "$tally")
log "  $names names ($flagged flagged): counts $count_new new, $count_kept kept, $count_refused refused;" \
  "ranks $rank_new new, $rank_kept kept, $rank_refused refused;" \
  "trends $trend_new new, $trend_kept kept, $trend_refused refused, $trend_superseded superseded"
if [ "$count_refused" != 0 ] || [ "$rank_refused" != 0 ] || [ "$trend_refused" != 0 ]; then
  log "  refusals by reason: $(as_build node -e '
    const t = JSON.parse(process.argv[1]);
    console.log(JSON.stringify({ count: t.count.refused, rank: t.rank.refused, trend: t.trend.refused }));' "$tally")"
fi

log "6/6 the gate, then read access for $WEB_ROLE"
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "[given-name-births]   ok   $1 = $3"; else echo "[given-name-births]   FAIL $1 = $3, expected $2"; fail=1; fi
}
active_lists="given_name_birth_lists l
  JOIN source_records sr ON sr.source_record_id = l.source_record_id AND sr.record_status = 'ACTIVE'
  JOIN sources s ON s.source_id = sr.source_id AND s.source_key = '$SOURCE_KEY'"
lists_expected=0
for line in "${resources[@]}"; do
  read -r id _ _ rows people lists _ <<<"$line"
  check "$id: ACTIVE records" 1 "$(q "
    SELECT count(*) FROM source_records sr JOIN sources s ON s.source_id = sr.source_id
     WHERE s.source_key = '$SOURCE_KEY' AND sr.external_record_id = '$id' AND sr.record_status = 'ACTIVE'")"
  check "$id: lists, rows, children" "$lists $rows $people" "$(q "
    SELECT count(*) || ' ' || coalesce(sum(l.row_count), 0) || ' ' || coalesce(sum(l.people_sum), 0)
      FROM $active_lists WHERE sr.external_record_id = '$id'")"
  lists_expected=$((lists_expected + lists))
done
check "ACTIVE lists" "$lists_expected" "$(q "SELECT count(*) FROM $active_lists")"
check "ACTIVE lists sharing a year and sex" 0 "$(q "
  SELECT count(*) FROM (SELECT 1 FROM $active_lists GROUP BY l.birth_year, l.sex HAVING count(*) > 1) d")"
stored=$(q "SELECT count(*) FROM given_name_birth_counts c
  JOIN $active_lists ON l.given_name_birth_list_id = c.given_name_birth_list_id")
active_claims() { q "SELECT count(*) FROM claims WHERE claim_type::text = '$1' AND claim_status = 'ACTIVE'"; }
check "ACTIVE GIVEN_NAME_BIRTH_COUNT claims" "$stored" "$(active_claims GIVEN_NAME_BIRTH_COUNT)"
check "ACTIVE GIVEN_NAME_BIRTH_RANK claims" "$stored" "$(active_claims GIVEN_NAME_BIRTH_RANK)"
check "ACTIVE GIVEN_NAME_BIRTH_TREND claims" "$((trend_new + trend_kept))" "$(active_claims GIVEN_NAME_BIRTH_TREND)"
check "ACTIVE GIVEN_NAME_BIRTH_TREND claims not at $TREND_METHOD" 0 "$(q "
  SELECT count(*) FROM claims WHERE claim_type::text = 'GIVEN_NAME_BIRTH_TREND' AND claim_status = 'ACTIVE'
     AND method_version <> '$TREND_METHOD'")"
check "ACTIVE GIVEN_NAME_BIRTH_TREND claims at given_name_birth_trend@1" 0 "$(q "
  SELECT count(*) FROM claims WHERE claim_type::text = 'GIVEN_NAME_BIRTH_TREND' AND claim_status = 'ACTIVE'
     AND method_version = 'given_name_birth_trend@1'")"
check "counts refused" 0 "$count_refused"
check "ranks refused" 0 "$rank_refused"
check "trends refused" 0 "$trend_refused"
check "ACTIVE claims sharing a claim_key" 0 \
  "$(q "SELECT count(*) FROM (SELECT 1 FROM claims WHERE claim_status = 'ACTIVE' GROUP BY claim_key HAVING count(*) > 1) d")"
q "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE" >/dev/null
check "tables $WEB_ROLE cannot read" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
     AND NOT has_table_privilege('$WEB_ROLE', c.oid, 'SELECT')")"
[ "$fail" = 0 ] || die "the gate failed"

date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE/given-name-births-loaded"
log "done: $lists_expected lists, $stored counts, each with its count and rank claim; $((trend_new + trend_kept)) trends"
