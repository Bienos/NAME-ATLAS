#!/usr/bin/env bash
# Loads what the register build does not (TASK-041), into the finalized
# database on the VM:
#
#   1. TERC and SIMC, downloaded from GUS through the "Pliki pełne" page's own
#      postback, each CSV member checked against fixtures/teryt/source-manifest.json;
#   2. the source catalogue, then the TERYT import;
#   3. Buryan 1933 (sources/onomastics/buryan-1933.json), then a SURNAME_MEANING
#      derivation for each of its surnames;
#   4. the gate: TERYT's counts, one meaning per Buryan surname in the register,
#      and the PESEL register exactly as finalize left it;
#   5. read access for the web role, VACUUM ANALYZE, and a pg_dump beside
#      finalize's.
#
# It runs after finalize.sh and never before: finalize's gate counts exactly the
# four PESEL source records, and TERYT adds 106,227. A later re-run of
# finalize.sh therefore fails that one check, which is expected.
#
# Runs as root: `sudo bash extras.sh`. Everything under the build user's home is
# done as the build user, over the Unix socket, as build.sh does. Idempotent:
# a second run finds the files verified, the imports ALREADY_IMPORTED and the
# claims derived, repeats the gate and replaces its dump.
set -euo pipefail

UNIT=name-atlas-register-build
DB=name_atlas
WEB_ROLE=nameatlas_web
BUILD_USER=nameatlas
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
TERYT_DIR=$APP/data/teryt
STATE=/var/lib/name-atlas
FINALIZED=$STATE/register-finalized
BACKUP_DIR=$STATE/backup
TERYT_MANIFEST=fixtures/teryt/source-manifest.json
BURYAN=sources/onomastics/buryan-1933.json
TERYT_PAGE='https://eteryt.stat.gov.pl/eTeryt/rejestr_teryt/udostepnianie_danych/baza_teryt/uzytkownicy_indywidualni/pobieranie/pliki_pelne.aspx?contrast=default'

log() { echo "[extras] $*"; }
die() { echo "[extras] ERROR: $*" >&2; exit 1; }
q() { runuser -u postgres -- psql -X -tA -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }

# The build user's environment, as build.sh's unit gives it.
build_env=(env HOME="$OPS_HOME" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 PATH=/usr/local/bin:/usr/bin:/bin
  DATABASE_URL="postgresql://$BUILD_USER@/$DB?host=/var/run/postgresql")
# Runs its arguments as the build user, in $APP.
as_build() {
  # shellcheck disable=SC2016 # $1 and $@ belong to the inner shell
  runuser -u "$BUILD_USER" -- "${build_env[@]}" bash -c 'cd "$1" && shift && exec "$@"' _ "$APP" "$@"
}

[ "$(id -u)" = 0 ] || die "run as root"
# The SSH user's home, where `sudo` leaves the working directory, is not
# readable by the users these scripts run commands as (`runuser -u ...`), and
# `find` and others fail when they cannot return to it.
cd /
if [ -d /run/systemd/system ]; then
  state=$(systemctl show -p ActiveState --value "$UNIT")
  [ "$state" = inactive ] || [ "$state" = failed ] || die "the build is running (ActiveState=$state)"
fi
[ -f "$FINALIZED" ] ||
  die "finalize has not run ($FINALIZED is missing). Its gate counts exactly the four PESEL source records, so this runs after it"
{ [ -f "$APP/$TERYT_MANIFEST" ] && [ -f "$APP/$BURYAN" ]; } || die "$APP has no $TERYT_MANIFEST or $BURYAN; push build first"
command -v python3 >/dev/null || die "python3 is missing (it unpacks the TERYT zips)"

pesel_state() {
  q "SELECT (SELECT count(*) FROM surnames) || ' surnames, '
         || (SELECT count(*) FROM distribution_values WHERE place_id IS NULL) || ' national and '
         || (SELECT count(*) FROM distribution_values WHERE place_id IS NOT NULL) || ' regional values, hashes '
         || (SELECT string_agg(sr.content_hash, ',' ORDER BY sr.content_hash) FROM source_records sr
               JOIN sources s ON s.source_id = sr.source_id WHERE s.source_key = 'pl_pesel_surnames')"
}
before=$(pesel_state)
log "PESEL before: $before"

log "1/5 TERC and SIMC from GUS, checked against $TERYT_MANIFEST"
as_build mkdir -p "$TERYT_DIR"
# "TERC <sha256>" and "SIMC <sha256>": the CSV members' checksums.
expected=$(as_build node -e \
  'for (const r of require(process.argv[1]).resources) console.log(r.registry, r.csv.sha256)' "$APP/$TERYT_MANIFEST")
for reg in TERC SIMC; do
  want=$(awk -v r="$reg" '$1 == r { print $2 }' <<<"$expected")
  [[ "$want" =~ ^[0-9a-f]{64}$ ]] || die "no CSV checksum for $reg in $TERYT_MANIFEST"
  csv=$TERYT_DIR/$reg.csv
  if [ -f "$csv" ] && [ "$(sha256sum "$csv" | cut -d' ' -f1)" = "$want" ]; then
    log "  $reg: $csv already verified"
    continue
  fi
  # A fresh GET before each POST: the postback carries the page's own view state.
  runuser -u "$BUILD_USER" -- "${build_env[@]}" bash -s -- "$reg" "$TERYT_DIR" "$TERYT_PAGE" <<'SH'
set -euo pipefail
reg=$1 dir=$2 page=$3
cd "$dir"
rm -f jar page.html "$reg.zip" "$reg.headers" "$reg.csv.partial"
curl -fsS --retry 5 --retry-delay 10 -c jar -b jar -o page.html "$page"
field() { sed -n "s/.*name=\"$1\"[^>]*value=\"\([^\"]*\)\".*/\1/p" page.html | head -n 1; }
vs=$(field __VIEWSTATE)
gen=$(field __VIEWSTATEGENERATOR)
day=$(field 'ctl00\$body\$TBData')
if [ -z "$vs" ] || [ -z "$day" ]; then
  echo "the page carries no view state or date field" >&2
  exit 1
fi
curl -fsS --retry 5 --retry-delay 10 -c jar -b jar -D "$reg.headers" -o "$reg.zip" "$page" \
  --data-urlencode "__EVENTTARGET=ctl00\$body\$B${reg}UrzedowyPobierz" --data-urlencode "__EVENTARGUMENT=" \
  --data-urlencode "__VIEWSTATE=$vs" --data-urlencode "__VIEWSTATEGENERATOR=$gen" \
  --data-urlencode "ctl00\$body\$TBData=$day"
echo "[extras]   $reg: $(grep -i '^content-disposition' "$reg.headers" | tr -d '\r')"
python3 - "$reg.zip" "$reg.csv.partial" <<'PY'
import sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
csvs = [n for n in z.namelist() if n.lower().endswith(".csv")]
if len(csvs) != 1:
    sys.exit(f"expected one CSV member, found {csvs}")
with z.open(csvs[0]) as src, open(sys.argv[2], "wb") as dst:
    dst.write(src.read())
print(f"[extras]   member {csvs[0]}")
PY
rm -f jar page.html "$reg.zip" "$reg.headers"
SH
  got=$(sha256sum "$csv.partial" | cut -d' ' -f1)
  if [ "$got" != "$want" ]; then
    die "$reg: the CSV member hashes to $got, not $want. GUS now publishes a different register state; record it (TASK-039 refuses a refresh) and stop"
  fi
  as_build mv "$csv.partial" "$csv"
  log "  $reg: $got, as the manifest records"
done

log "2/5 the source catalogue, then TERYT"
as_build pnpm --silent seed:sources | sed 's/^/[extras]   /'
as_build pnpm --silent import:teryt --terc "$TERYT_DIR/TERC.csv" --simc "$TERYT_DIR/SIMC.csv" | sed 's/^/[extras]   /'

log "3/5 Buryan 1933, then SURNAME_MEANING for each of its surnames"
as_build pnpm --silent import-onomastics --file "$APP/$BURYAN" | sed 's/^/[extras]   /'
mapfile -t surnames < <(as_build node -e \
  'for (const e of require(process.argv[1]).entries) console.log(e.surname)' "$APP/$BURYAN")
[ "${#surnames[@]}" -gt 0 ] || die "$BURYAN lists no surnames"
with_meaning=0 without_meaning=0 not_in_register=0
for s in "${surnames[@]}"; do
  out=$(as_build pnpm exec tsx packages/truth/bin/surname-meaning.ts "$s")
  first=${out%%$'\n'*}
  echo "[extras]   $first"
  case "$first" in
    *"interpretation(s))") with_meaning=$((with_meaning + 1)) ;;
    *"NO SOURCED MEANING"*) without_meaning=$((without_meaning + 1)) ;;
    *) not_in_register=$((not_in_register + 1)) ;;
  esac
done
log "  ${#surnames[@]} surnames: $with_meaning with a meaning, $without_meaning in the register without one, $not_in_register not resolved"

log "4/5 the gate"
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "[extras]   ok   $1 = $3"; else echo "[extras]   FAIL $1 = $3, expected $2"; fail=1; fi
}
# The counts TASK-039 measured on these same bytes (the CSV hashes above).
check "TERC ids (16 voivodeships + 380 powiats + 2,479 gminas)" 2875 \
  "$(q "SELECT count(*) FROM entity_external_ids WHERE provider_key = 'TERYT'")"
check "SIMC ids (localities)" 101865 "$(q "SELECT count(*) FROM entity_external_ids WHERE provider_key = 'TERYT_SIMC'")"
check "TERYT source records (2 files + 4,360 + 101,865 rows)" 106227 "$(q "
  SELECT count(*) FROM source_records sr JOIN sources s ON s.source_id = sr.source_id WHERE s.source_key = 'pl_teryt'")"
check "REGION places" 16 "$(q "SELECT count(*) FROM places WHERE place_type = 'REGION'")"
check "Buryan surnames in the register without a meaning" 0 "$without_meaning"
check "ACTIVE SURNAME_MEANING claims" "$with_meaning" \
  "$(q "SELECT count(*) FROM claims WHERE claim_type = 'SURNAME_MEANING' AND claim_status = 'ACTIVE'")"
check "ACTIVE claims sharing a claim_key" 0 \
  "$(q "SELECT count(*) FROM (SELECT 1 FROM claims WHERE claim_status = 'ACTIVE' GROUP BY claim_key HAVING count(*) > 1) d")"
check "PESEL as finalize left it" "$before" "$(pesel_state)"
q "SELECT '[extras]   places ' || place_type || ' ' || count(*) FROM places GROUP BY place_type ORDER BY place_type"
q "SELECT '[extras]   database size ' || pg_size_pretty(pg_database_size(current_database()))"
[ "$fail" = 0 ] || die "the gate failed; grants, statistics and the dump were not touched"

log "5/5 read access for $WEB_ROLE, VACUUM ANALYZE, and a dump"
q "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE" >/dev/null
runuser -u postgres -- vacuumdb --analyze --jobs=2 --quiet -d "$DB"
check "tables $WEB_ROLE cannot read" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
     AND NOT has_table_privilege('$WEB_ROLE', c.oid, 'SELECT')")"
[ "$fail" = 0 ] || die "the web role cannot read every table"
install -d -o postgres -g postgres -m 700 "$BACKUP_DIR"
dump=$BACKUP_DIR/name_atlas-register-2026-01-20-teryt-buryan.dump
# The definitions of schemas accounts and family go in, their rows never do (TASK-063, ADR-0027 §5.2;
# ADR-0029): a restore leaves them empty and consistent with the migrations table, and no address,
# password hash or person of a tree is copied into a file here. scripts/check-vm-dumps.sh holds every dump to it.
runuser -u postgres -- pg_dump --format=custom --exclude-table-data='accounts.*' --exclude-table-data='family.*' -d "$DB" -f "$dump.partial"
mv "$dump.partial" "$dump"
log "  $(du -h "$dump" | cut -f1) $dump"

date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE/extras-loaded"
log "done: TERYT and Buryan 1933 are loaded"
