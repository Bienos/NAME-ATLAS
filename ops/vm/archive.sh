#!/usr/bin/env bash
# Loads Polona's archive availability on the database VM (TASK-054, ADR-0024)
# and returns at once:
#
#   1. unpack the pushed commit into $APP (data/ and node_modules/ kept) and
#      pnpm install, as editions.sh does; the register build is left alone;
#   2. pnpm db:migrate: migration 0025 adds the ARCHIVE_AVAILABILITY claim type;
#   3. read access for the web role, checked;
#   4. start the systemd unit name-atlas-archive-load, which runs
#      `pnpm truth:archive-load --top-rank N` (N defaults to 2000): every surname
#      ranked within N in either register list, best rank first, eight paced
#      requests to Polona each, at least 250 ms apart (ADR-0036), so at least
#      2 s a surname and more when Polona answers slowly: hours.
#
# The load is resumable: a surname searched within the last 90 days is not
# searched again, so a restart continues where it stopped. Ten Polona failures
# in a row stop the loader with an error; the unit then waits ten minutes
# before it restarts, so an outage at Polona is not hammered. Only a complete
# run writes $LOADED, and the unit does not start again once it exists, at
# boot or otherwise. Running this step again starts a fresh pass, which
# searches only the surnames whose last search is older than 90 days.
#
# A running load is left alone unless the third argument is `restart`
# (TASK-097): then it is stopped and started again on the pushed commit, and
# the restart continues where it stopped.
#
# Runs after finalize.sh (its marker is required). Runs as root:
# `sudo bash archive.sh ABSOLUTE_PATH_TO_ARCHIVE [TOP_RANK [restart]]`. Everything under
# the build user's home is done as the build user, over the Unix socket.
set -euo pipefail

UNIT=name-atlas-archive-load
BUILD_UNIT=name-atlas-register-build
DB=name_atlas
WEB_ROLE=nameatlas_web
BUILD_USER=nameatlas
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
STATE=/var/lib/name-atlas
FINALIZED=$STATE/register-finalized
# In a directory the build user owns, since the unit runs as that user.
LOADED=$STATE/archive/loaded
ARCHIVE=${1:-}
TOP_RANK=${2:-2000}
RESTART=${3:-}

log() { echo "[archive] $*"; }
die() { echo "[archive] ERROR: $*" >&2; exit 1; }
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
[ -d /run/systemd/system ] || die "systemd is required"
case "$TOP_RANK" in '' | *[!0-9]*) die "TOP_RANK must be a positive integer, got '$TOP_RANK'" ;; esac
[ "$TOP_RANK" -ge 1 ] || die "TOP_RANK must be at least 1"
[ -f "$FINALIZED" ] || die "finalize has not run ($FINALIZED is missing)"
state=$(systemctl show -p ActiveState --value "$BUILD_UNIT")
[ "$state" = inactive ] || [ "$state" = failed ] || die "the register build is running (ActiveState=$state)"
# Unpacking would change the code under Wikidata's load (bearers.sh, TASK-077).
state=$(systemctl show -p ActiveState --value name-atlas-bearers-load 2>/dev/null || true)
case "$state" in
  active | activating | deactivating | reloading) die "name-atlas-bearers-load is running (ActiveState=$state)" ;;
esac
state=$(systemctl show -p ActiveState --value "$UNIT" 2>/dev/null || true)
case "$RESTART" in '' | restart) ;; *) die "the third argument must be 'restart' or empty, got '$RESTART'" ;; esac
if [ "$state" = active ] || [ "$state" = activating ]; then
  if [ "$RESTART" != restart ]; then
    # Unpacking now would change the code under the running loader.
    log "already running ($state); nothing unpacked or started. status.sh shows its progress."
    exit 0
  fi
  log "already running ($state); stopping it to restart on the pushed commit (TASK-097)"
  systemctl stop "$UNIT"
  state=$(systemctl show -p ActiveState --value "$UNIT")
  [ "$state" = inactive ] || [ "$state" = failed ] || die "$UNIT did not stop (ActiveState=$state)"
fi

log "1/4 unpack the pushed commit into $APP and pnpm install (the register build is left alone)"
case "$ARCHIVE" in /*) ;; *) die "usage: archive.sh ABSOLUTE_PATH_TO_ARCHIVE [TOP_RANK [restart]]" ;; esac
if [ ! -f "$ARCHIVE" ] || [ -L "$ARCHIVE" ] || [ ! -s "$ARCHIVE" ]; then
  die "$ARCHIVE must be a non-empty regular file"
fi
runuser -u "$BUILD_USER" -- mkdir -p "$APP"
runuser -u "$BUILD_USER" -- find "$APP" -mindepth 1 -maxdepth 1 ! -name data ! -name node_modules -exec rm -rf {} +
runuser -u "$BUILD_USER" -- tar -C "$APP" -xzf - <"$ARCHIVE"
rm -f "$ARCHIVE"
as_build pnpm install --frozen-lockfile --reporter=append-only | tail -n 5

log "2/4 pnpm db:migrate"
as_build pnpm db:migrate | tail -n 10
q "SELECT '[archive]   migrations ' || count(*) || ', last ' || max(name) FROM kysely_migration"
[ "$(q "SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'claim_type' AND e.enumlabel = 'ARCHIVE_AVAILABILITY'")" = 1 ] ||
  die "claim_type has no ARCHIVE_AVAILABILITY after the migration"

log "3/4 read access for $WEB_ROLE"
q "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE" >/dev/null
unreadable=$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
     AND NOT has_table_privilege('$WEB_ROLE', c.oid, 'SELECT')")
[ "$unreadable" = 0 ] || die "$WEB_ROLE cannot read $unreadable tables"

log "4/4 start $UNIT (--top-rank $TOP_RANK)"
# A fresh pass: the previous completion no longer counts.
rm -f "$LOADED"
install -d -o "$BUILD_USER" -g "$BUILD_USER" -m 755 "$STATE/archive"
cat >/etc/systemd/system/$UNIT.service <<UNITFILE
# Written by ops/vm/archive.sh (TASK-054). Do not edit by hand.
[Unit]
Description=Name Atlas: load Polona's archive availability for the top-ranked surnames
After=postgresql@17-main.service network-online.target
Wants=network-online.target
# The loader exits with an error after ten Polona failures in a row. Six
# restarts within 12 hours stop the unit, so an outage cannot loop forever.
StartLimitIntervalSec=12h
StartLimitBurst=6
ConditionPathExists=!$LOADED

[Service]
Type=exec
User=$BUILD_USER
Group=$BUILD_USER
WorkingDirectory=$APP
Environment=HOME=$OPS_HOME
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=COREPACK_ENABLE_DOWNLOAD_PROMPT=0
Environment=DATABASE_URL=postgresql://$BUILD_USER@/$DB?host=/var/run/postgresql
ExecStart=/bin/bash -c 'pnpm truth:archive-load --top-rank $TOP_RANK && date -u +%%Y-%%m-%%dT%%H:%%M:%%SZ > $LOADED'
Restart=on-failure
RestartSec=600
Nice=10

[Install]
WantedBy=multi-user.target
UNITFILE
systemctl daemon-reload
systemctl enable --quiet "$UNIT"
systemctl reset-failed "$UNIT" 2>/dev/null || true
systemctl start --no-block "$UNIT"
sleep 45
systemctl show -p ActiveState,SubState,MainPID "$UNIT" | sed 's/^/[archive]   /'
journalctl -u "$UNIT" -o cat --no-pager -n 15 | sed 's/^/[archive]   /'
log "started. At least 2 s a surname; status.sh reports the progress."
