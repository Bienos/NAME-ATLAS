#!/usr/bin/env bash
# Loads the well-known bearers of surnames from Wikidata on the database VM
# (TASK-077; the loader is TASK-073, ADR-0030; in batches since TASK-140,
# ADR-0044) and returns at once:
#
#   1. unpack the pushed commit into $APP (data/ and node_modules/ kept) and
#      pnpm install, as archive.sh does; the register build is left alone;
#   2. pnpm db:migrate: migration 0029 adds the NOTABLE_BEARERS claim type
#      (and 0028, the family tree's empty schema, if it is still pending);
#   3. read access for the web role, checked;
#   4. start the systemd unit name-atlas-bearers-load, which runs
#      `pnpm truth:bearers-load --top-rank N` (N defaults to 2000): every
#      surname ranked within N in either register list, best rank first, in
#      batches of 50, 100 or 400 surnames to a query of the Wikidata Query
#      Service, one query at a time and at least a second apart. Any N of
#      301,370 or more takes every surname: about 4-6 hours for all 598,476,
#      measured on samples on 2026-10-05, where one query a surname took 7-22
#      days.
#
# The load is resumable: a surname queried within the last 30 days is not
# queried again, so a restart continues where it stopped. Ten failures in a
# row stop the loader with an error; the unit then waits ten minutes before it
# restarts, so an outage at Wikidata is not hammered. Only a complete run
# writes $LOADED, and the unit does not start again once it exists, at boot or
# otherwise. Running this step again starts a fresh pass, which queries only
# the surnames whose last query is older than 30 days.
#
# A running load is left alone unless the third argument is `restart`
# (TASK-140, as archive.sh's): then it is stopped and started again on the
# pushed commit, and the restart continues where it stopped.
#
# Runs after finalize.sh (its marker is required), and not while the archive
# load or the change-over-time batch runs, since unpacking would change the
# code under them. Runs as root:
# `sudo bash bearers.sh ABSOLUTE_PATH_TO_ARCHIVE [TOP_RANK [restart]]`. Everything under
# the build user's home is done as the build user, over the Unix socket.
set -euo pipefail

UNIT=name-atlas-bearers-load
OTHER_UNITS=(name-atlas-archive-load name-atlas-shift-batch)
BUILD_UNIT=name-atlas-register-build
DB=name_atlas
WEB_ROLE=nameatlas_web
BUILD_USER=nameatlas
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
STATE=/var/lib/name-atlas
FINALIZED=$STATE/register-finalized
# In a directory the build user owns, since the unit runs as that user.
LOADED=$STATE/bearers/loaded
ARCHIVE=${1:-}
TOP_RANK=${2:-2000}
RESTART=${3:-}

log() { echo "[bearers] $*"; }
die() { echo "[bearers] ERROR: $*" >&2; exit 1; }
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
for unit in "${OTHER_UNITS[@]}"; do
  state=$(systemctl show -p ActiveState --value "$unit" 2>/dev/null || true)
  case "$state" in
    active | activating | deactivating | reloading) die "$unit is running (ActiveState=$state); run this when it has finished" ;;
  esac
done
state=$(systemctl show -p ActiveState --value "$UNIT" 2>/dev/null || true)
case "$RESTART" in '' | restart) ;; *) die "the third argument must be 'restart' or empty, got '$RESTART'" ;; esac
if [ "$state" = active ] || [ "$state" = activating ]; then
  if [ "$RESTART" != restart ]; then
    # Unpacking now would change the code under the running loader.
    log "already running ($state); nothing unpacked or started. status.sh shows its progress."
    exit 0
  fi
  log "already running ($state); stopping it to restart on the pushed commit (TASK-140)"
  systemctl stop "$UNIT"
  state=$(systemctl show -p ActiveState --value "$UNIT")
  [ "$state" = inactive ] || [ "$state" = failed ] || die "$UNIT did not stop (ActiveState=$state)"
fi

log "1/4 unpack the pushed commit into $APP and pnpm install (the register build is left alone)"
case "$ARCHIVE" in /*) ;; *) die "usage: bearers.sh ABSOLUTE_PATH_TO_ARCHIVE [TOP_RANK [restart]]" ;; esac
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
q "SELECT '[bearers]   migrations ' || count(*) || ', last ' || max(name) FROM kysely_migration"
[ "$(q "SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'claim_type' AND e.enumlabel = 'NOTABLE_BEARERS'")" = 1 ] ||
  die "claim_type has no NOTABLE_BEARERS after the migration"

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
install -d -o "$BUILD_USER" -g "$BUILD_USER" -m 755 "$STATE/bearers"
cat >/etc/systemd/system/$UNIT.service <<UNITFILE
# Written by ops/vm/bearers.sh (TASK-077). Do not edit by hand.
[Unit]
Description=Name Atlas: load Wikidata's well-known bearers for the surnames ranked within $TOP_RANK
After=postgresql@17-main.service network-online.target
Wants=network-online.target
# The loader exits with an error after ten failed batches in a row. Six
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
ExecStart=/bin/bash -c 'pnpm truth:bearers-load --top-rank $TOP_RANK && date -u +%%Y-%%m-%%dT%%H:%%M:%%SZ > $LOADED'
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
systemctl show -p ActiveState,SubState,MainPID "$UNIT" | sed 's/^/[bearers]   /'
journalctl -u "$UNIT" -o cat --no-pager -n 15 | sed 's/^/[bearers]   /'
log "started. Batches of 50, 100 or 400 surnames a query, a second apart at least; status.sh reports the progress."
