#!/usr/bin/env bash
# Starts the complete register build on the database VM (TASK-040) and returns
# at once. The build is `scripts/local-setup.sh`, the same one command a
# developer runs, pointed at the VM's own PostgreSQL over the Unix socket with
# peer authentication, so its connection string carries no password.
#
# It runs in the systemd unit name-atlas-register-build, detached from the SSH
# session that started it: the build takes hours, longer than a GitHub job may
# run. It restarts itself after a failure and continues where it stopped,
# because every step of local-setup.sh is resumable. It is enabled, so a reboot
# resumes it too. Only a complete run writes $OPS_HOME/.register-built, and the
# unit does not start again once that marker exists. status.sh reports it.
#
# Runs as root: `sudo bash build.sh ARCHIVE`. The `Register VM` workflow first
# copies the repository at the pushed commit (`git archive`) to ARCHIVE in the
# SSH user's own home, so the VM needs no GitHub credentials. node_modules is
# installed here, on arm64, never copied from the x86 runner. Everything inside
# the build user's home is done as the build user, never as root, so nothing it
# placed there (a symlink, say) can steer a root write.
set -euo pipefail

UNIT=name-atlas-register-build
BUILD_USER=nameatlas
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
BUILT=$OPS_HOME/.register-built
ARCHIVE=${1:-}

log() { echo "[build] $*"; }
die() { echo "[build] ERROR: $*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "run as root"
[ -d /run/systemd/system ] || die "systemd is required"
id -u "$BUILD_USER" >/dev/null 2>&1 || die "run provision.sh first"
command -v pnpm >/dev/null || die "run provision.sh first (pnpm is missing)"

state=$(systemctl show -p ActiveState --value "$UNIT" 2>/dev/null || true)
if [ "$state" = active ] || [ "$state" = activating ]; then
  log "already running ($state); nothing started. status.sh shows its progress."
  exit 0
fi

log "1/3 unpack the repository into $APP (data/ and node_modules/ are kept)"
if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ] || [ -L "$ARCHIVE" ] || [ ! -s "$ARCHIVE" ]; then
  die "usage: build.sh ARCHIVE (a non-empty regular file)"
fi
as_build() { runuser -u "$BUILD_USER" -- "$@"; }
as_build mkdir -p "$APP"
as_build find "$APP" -mindepth 1 -maxdepth 1 ! -name data ! -name node_modules -exec rm -rf {} +
# Root opens the archive; the build user unpacks it from stdin.
as_build tar -C "$APP" -xzf - <"$ARCHIVE"
rm -f "$ARCHIVE"
# A deliberate build starts over from the resumable steps, so the previous
# completion no longer counts.
as_build rm -f "$BUILT"

log "2/3 pnpm install --frozen-lockfile (arm64 binaries)"
runuser -u "$BUILD_USER" -- env HOME="$OPS_HOME" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  PATH=/usr/local/bin:/usr/bin:/bin bash -c "cd '$APP' && pnpm install --frozen-lockfile --reporter=append-only" |
  tail -n 15

log "3/3 start $UNIT"
cat >/etc/systemd/system/$UNIT.service <<UNITFILE
# Written by ops/vm/build.sh (TASK-040). Do not edit by hand.
[Unit]
Description=Name Atlas: build the complete PESEL register into PostgreSQL
After=postgresql@17-main.service network-online.target
Wants=network-online.target
# A failure restarts the build, which resumes. Eight failures within 12 hours
# stop it, so a failure that repeats cannot loop forever. After a complete run
# the marker keeps it from starting again, at boot or otherwise.
StartLimitIntervalSec=12h
StartLimitBurst=8
ConditionPathExists=!$BUILT

[Service]
Type=exec
User=$BUILD_USER
Group=$BUILD_USER
WorkingDirectory=$APP
Environment=HOME=$OPS_HOME
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=COREPACK_ENABLE_DOWNLOAD_PROMPT=0
Environment=DATABASE_URL=postgresql://$BUILD_USER@/name_atlas?host=/var/run/postgresql
ExecStart=/bin/bash -c 'bash scripts/local-setup.sh && touch $BUILT'
Restart=on-failure
RestartSec=120
Nice=5

[Install]
WantedBy=multi-user.target
UNITFILE
systemctl daemon-reload
systemctl enable --quiet "$UNIT"
systemctl reset-failed "$UNIT" 2>/dev/null || true
systemctl start --no-block "$UNIT"
sleep 20
systemctl show -p ActiveState,SubState,MainPID "$UNIT" | sed 's/^/[build]   /'
journalctl -u "$UNIT" -o cat --no-pager -n 20 | sed 's/^/[build]   /'
log "started. The build takes hours; status.sh reports it."
