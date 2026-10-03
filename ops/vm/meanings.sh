#!/usr/bin/env bash
# Loads the current version of Buryan 1933 (sources/onomastics/buryan-1933.json)
# on the database VM and derives a SURNAME_MEANING claim for each of its
# surnames (TASK-081):
#
#   1. unpack the pushed commit into $APP (data/ and node_modules/ kept) and
#      pnpm install, as archive.sh does; the register build is left alone;
#   2. pnpm db:migrate, for any migration still pending;
#   3. import the file: a new version replaces the one extras.sh imported (that
#      record becomes UPDATED), identical bytes import nothing;
#   4. derive every surname of the file in one process. A surname that already
#      has its claim keeps it; derivation adds nothing for it;
#   5. the gate: every listed surname the register holds has a meaning, one
#      ACTIVE claim per claim_key, and exactly one ACTIVE version of the work;
#      then read access for the web role.
#
# Repeatable: a second run imports nothing, derives nothing and passes the gate.
# Runs after finalize.sh and extras.sh, and not while the register build, the
# archive load, the bearers load or the change-over-time batch runs, since
# unpacking would change the code under them. Runs as root:
# `sudo bash meanings.sh ABSOLUTE_PATH_TO_ARCHIVE`. Everything under the build
# user's home is done as the build user, over the Unix socket.
set -euo pipefail

BUSY_UNITS=(name-atlas-register-build name-atlas-archive-load name-atlas-bearers-load name-atlas-shift-batch)
DB=name_atlas
WEB_ROLE=nameatlas_web
BUILD_USER=nameatlas
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
STATE=/var/lib/name-atlas
FINALIZED=$STATE/register-finalized
EXTRAS=$STATE/extras-loaded
BURYAN=sources/onomastics/buryan-1933.json
SOURCE_KEY=buryan_1933_skad_pochodzi
ARCHIVE=${1:-}

log() { echo "[meanings] $*"; }
die() { echo "[meanings] ERROR: $*" >&2; exit 1; }
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
[ -f "$EXTRAS" ] || die "extras has not run ($EXTRAS is missing); it seeds the source catalogue"
if [ -d /run/systemd/system ]; then
  for unit in "${BUSY_UNITS[@]}"; do
    state=$(systemctl show -p ActiveState --value "$unit" 2>/dev/null || true)
    case "$state" in
      active | activating | deactivating | reloading) die "$unit is running (ActiveState=$state); run this when it has finished" ;;
    esac
  done
fi

log "1/5 unpack the pushed commit into $APP and pnpm install (the register build is left alone)"
case "$ARCHIVE" in /*) ;; *) die "usage: meanings.sh ABSOLUTE_PATH_TO_ARCHIVE" ;; esac
if [ ! -f "$ARCHIVE" ] || [ -L "$ARCHIVE" ] || [ ! -s "$ARCHIVE" ]; then
  die "$ARCHIVE must be a non-empty regular file"
fi
runuser -u "$BUILD_USER" -- mkdir -p "$APP"
runuser -u "$BUILD_USER" -- find "$APP" -mindepth 1 -maxdepth 1 ! -name data ! -name node_modules -exec rm -rf {} +
runuser -u "$BUILD_USER" -- tar -C "$APP" -xzf - <"$ARCHIVE"
rm -f "$ARCHIVE"
[ -f "$APP/$BURYAN" ] || die "the pushed commit has no $BURYAN"
as_build pnpm install --frozen-lockfile --reporter=append-only | tail -n 5

log "2/5 pnpm db:migrate"
as_build pnpm db:migrate | tail -n 10
q "SELECT '[meanings]   migrations ' || count(*) || ', last ' || max(name) FROM kysely_migration"

log "3/5 import $BURYAN"
as_build pnpm --silent import-onomastics --file "$APP/$BURYAN" | sed 's/^/[meanings]   /'

log "4/5 SURNAME_MEANING for each surname of the file, in one process"
mapfile -t surnames < <(as_build node -e \
  'for (const e of require(process.argv[1]).entries) console.log(e.surname)' "$APP/$BURYAN")
[ "${#surnames[@]}" -gt 0 ] || die "$BURYAN lists no surnames"
out=$(as_build pnpm exec tsx packages/truth/bin/surname-meaning.ts "${surnames[@]}")
# One unindented line per surname; the indented lines below each are its detail.
summary=$(grep -v '^ ' <<<"$out")
with_meaning=$(grep -c 'interpretation(s))$' <<<"$summary" || true)
without_meaning=$(grep -c 'NO SOURCED MEANING' <<<"$summary" || true)
not_resolved=$(grep -Evc 'interpretation\(s\)\)$|NO SOURCED MEANING' <<<"$summary" || true)
grep -Ev 'interpretation\(s\)\)$' <<<"$summary" | sed 's/^/[meanings]   /' || true
log "  ${#surnames[@]} surnames: $with_meaning with a meaning, $without_meaning in the register without one, $not_resolved not resolved"

log "5/5 the gate, then read access for $WEB_ROLE"
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "[meanings]   ok   $1 = $3"; else echo "[meanings]   FAIL $1 = $3, expected $2"; fail=1; fi
}
check "surnames derived" "${#surnames[@]}" "$((with_meaning + without_meaning + not_resolved))"
check "listed surnames in the register without a meaning" 0 "$without_meaning"
check "ACTIVE versions of the work" 1 "$(q "
  SELECT count(*) FROM source_records sr JOIN sources s ON s.source_id = sr.source_id
   WHERE s.source_key = '$SOURCE_KEY' AND sr.record_status = 'ACTIVE'")"
check "ACTIVE claims sharing a claim_key" 0 \
  "$(q "SELECT count(*) FROM (SELECT 1 FROM claims WHERE claim_status = 'ACTIVE' GROUP BY claim_key HAVING count(*) > 1) d")"
q "SELECT '[meanings]   ACTIVE SURNAME_MEANING claims ' || count(*) FROM claims
    WHERE claim_type = 'SURNAME_MEANING' AND claim_status = 'ACTIVE'"
q "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE" >/dev/null
check "tables $WEB_ROLE cannot read" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
     AND NOT has_table_privilege('$WEB_ROLE', c.oid, 'SELECT')")"
[ "$fail" = 0 ] || die "the gate failed"

date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE/meanings-loaded"
log "done: $with_meaning surnames carry a meaning from Buryan 1933"
