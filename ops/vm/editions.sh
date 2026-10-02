#!/usr/bin/env bash
# Loads every earlier edition of the PESEL surname lists into the finalized
# database on the VM (TASK-045): the 2019 national pair, the 2020–2025 national
# editions and the 2025 regional pair, fifteen resources, each fetched from the
# publisher and verified against the registry's SHA-256, each its own dated
# snapshot. An edition creates no surname entity and yields no claim, so the
# pages do not change; the gate below proves it.
#
#   1. unpack the pushed commit into $APP (data/ and node_modules/ kept),
#      pnpm install, as build.sh does — without touching the register build
#      unit or its completion marker: the register is finished;
#   2. scripts/import-editions.sh as the build user over the Unix socket;
#   3. the gate: every edition present with its official row count of values
#      minus the rows for surnames absent from the current register (reported
#      by the importer, read back from the payload count), the surnames count
#      and every ACTIVE claim count exactly as before, no surname with more
#      than two ACTIVE claims of one type;
#   4. read access for the web role, VACUUM ANALYZE, and a pg_dump beside
#      finalize's.
#
# Runs after finalize.sh (its marker is required). Idempotent: a second run
# finds the files verified, every import ALREADY_IMPORTED, and repeats the gate.
# Usage: sudo bash editions.sh ABSOLUTE_PATH_TO_ARCHIVE
set -euo pipefail

UNIT=name-atlas-register-build
DB=name_atlas
WEB_ROLE=nameatlas_web
BUILD_USER=nameatlas
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
STATE=/var/lib/name-atlas
FINALIZED=$STATE/register-finalized
BACKUP_DIR=$STATE/backup
ARCHIVE=${1:-}

log() { echo "[editions] $*"; }
die() { echo "[editions] ERROR: $*" >&2; exit 1; }
q() { runuser -u postgres -- psql -X -tA -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }

build_env=(env HOME="$OPS_HOME" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 PATH=/usr/local/bin:/usr/bin:/bin
  DATABASE_URL="postgresql://$BUILD_USER@/$DB?host=/var/run/postgresql" EDITIONS_DIR="$APP/data")
as_build() {
  # shellcheck disable=SC2016 # $1 and $@ belong to the inner shell
  runuser -u "$BUILD_USER" -- "${build_env[@]}" bash -c 'cd "$1" && shift && exec "$@"' _ "$APP" "$@"
}

[ "$(id -u)" = 0 ] || die "run as root"
export LC_ALL=C.UTF-8
cd /
if [ -d /run/systemd/system ]; then
  state=$(systemctl show -p ActiveState --value "$UNIT")
  [ "$state" = inactive ] || [ "$state" = failed ] || die "the build is running (ActiveState=$state)"
fi
[ -f "$FINALIZED" ] || die "finalize has not run ($FINALIZED is missing); the editions come after the register"
case "$ARCHIVE" in /*) ;; *) die "usage: editions.sh ABSOLUTE_PATH_TO_ARCHIVE" ;; esac
if [ ! -f "$ARCHIVE" ] || [ -L "$ARCHIVE" ] || [ ! -s "$ARCHIVE" ]; then
  die "$ARCHIVE must be a non-empty regular file"
fi

# The state the gate must find unchanged.
claims_before=$(q "SELECT string_agg(claim_type || '=' || n, ',' ORDER BY claim_type)
                     FROM (SELECT claim_type, count(*) AS n FROM claims WHERE claim_status = 'ACTIVE' GROUP BY 1) c")
surnames_before=$(q "SELECT count(*) FROM surnames")
log "before: $surnames_before surnames; ACTIVE claims $claims_before"

log "1/4 unpack the pushed commit into $APP and pnpm install (the register build is left alone)"
runuser -u "$BUILD_USER" -- mkdir -p "$APP"
runuser -u "$BUILD_USER" -- find "$APP" -mindepth 1 -maxdepth 1 ! -name data ! -name node_modules -exec rm -rf {} +
runuser -u "$BUILD_USER" -- tar -C "$APP" -xzf - <"$ARCHIVE"
rm -f "$ARCHIVE"
as_build pnpm install --frozen-lockfile --reporter=append-only | tail -n 5

log "2/4 fetch, verify and import every edition (scripts/import-editions.sh)"
as_build bash scripts/import-editions.sh

log "3/4 the gate"
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "[editions]   ok   $1 = $3"; else echo "[editions]   FAIL $1 = $3, expected $2"; fail=1; fi
}
# Each edition: one ACTIVE source record with the official hash, and as many
# values as the importer wrote (its report is not stored, so the count is
# checked against the file: official rows minus the rows whose surname is not
# in the current register, which the importer prints and this recomputes from
# the values it wrote — the two agree when nothing else was written).
while read -r id role date rows; do
  got=$(q "SELECT count(*) FROM source_records sr JOIN sources s ON s.source_id = sr.source_id
            WHERE s.source_key = 'pl_pesel_surnames' AND sr.external_record_id = '$id' AND sr.record_status = 'ACTIVE'")
  check "edition $id ($role $date): one ACTIVE source record" 1 "$got"
  values=$(q "SELECT count(*) FROM distribution_values v
                JOIN distribution_snapshots ds ON ds.distribution_snapshot_id = v.distribution_snapshot_id
                JOIN source_records sr ON sr.source_record_id = ds.source_record_id
               WHERE sr.external_record_id = '$id'")
  if [ "$values" -gt 0 ] && [ "$values" -le "$rows" ]; then
    echo "[editions]   ok   edition $id: $values values of $rows rows (the rest name surnames not in the current register)"
  else
    echo "[editions]   FAIL edition $id: $values values, expected between 1 and $rows"; fail=1
  fi
done < <(as_build pnpm exec tsx packages/sources/bin/list-editions.ts)
check "surnames unchanged" "$surnames_before" "$(q "SELECT count(*) FROM surnames")"
check "ACTIVE claims unchanged" "$claims_before" "$(q "SELECT string_agg(claim_type || '=' || n, ',' ORDER BY claim_type)
  FROM (SELECT claim_type, count(*) AS n FROM claims WHERE claim_status = 'ACTIVE' GROUP BY 1) c")"
check "surnames with more than two ACTIVE claims of one type" 0 \
  "$(q "SELECT count(*) FROM (SELECT 1 FROM claims WHERE claim_status = 'ACTIVE' GROUP BY subject_entity_id, claim_type HAVING count(*) > 2) d")"
q "SELECT '[editions]   database size ' || pg_size_pretty(pg_database_size(current_database()))"
[ "$fail" = 0 ] || die "the gate failed; grants, statistics and the dump were not touched"

log "4/4 read access for $WEB_ROLE, VACUUM ANALYZE, and a dump"
q "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE" >/dev/null
runuser -u postgres -- vacuumdb --analyze --jobs=2 --quiet -d "$DB"
check "tables $WEB_ROLE cannot read" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
     AND NOT has_table_privilege('$WEB_ROLE', c.oid, 'SELECT')")"
[ "$fail" = 0 ] || die "the web role cannot read every table"
install -d -o postgres -g postgres -m 700 "$BACKUP_DIR"
dump=$BACKUP_DIR/name_atlas-register-2026-01-20-editions.dump
# The definition of schema accounts goes in, its rows never do (TASK-063, ADR-0027 §5.2): a restore
# leaves accounts empty and consistent with the migrations table, and no address or password
# hash is copied into a file here. scripts/check-vm-dumps.sh holds every dump to it.
runuser -u postgres -- pg_dump --format=custom --exclude-table-data='accounts.*' --exclude-table-data='family.*' -d "$DB" -f "$dump.partial"
mv "$dump.partial" "$dump"
log "  $(du -h "$dump" | cut -f1) $dump"

date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE/editions-loaded"
log "done: every edition is loaded; the pages read the current resources only"
