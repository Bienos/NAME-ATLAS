#!/usr/bin/env bash
# Builds the complete register on production's database server (TASK-041,
# ADR-0016 §2 item 3). Run as root on the VM, from the repository's clone,
# after provision-db.sh:
#
#   sudo bash scripts/production/build-register.sh
#
# It installs the Node version pinned in .nvmrc (checked against nodejs.org's
# published SHA-256), creates an unprivileged `atlas` user that owns the clone,
# and runs `pnpm local:setup` as that user. `local:setup` downloads the four
# official PESEL files from dane.gov.pl and refuses any whose size or SHA-256
# differs from the registry; then it migrates, imports and derives. It is
# resumable: if it stops, run this script again.
#
# The build runs as the systemd unit `name-atlas-build`, so it survives an SSH
# disconnect. Follow it with:
#   journalctl -u name-atlas-build -f
#
# --foreground: run in this terminal instead of as a unit (a machine without
# systemd, or a rehearsal). DERIVE_LIMIT is passed through when set.
set -euo pipefail

FOREGROUND=0
if [[ "${1:-}" == "--foreground" ]]; then FOREGROUND=1; fi

CREDS=/root/name-atlas-credentials
BUILD_USER=atlas
UNIT=name-atlas-build
REPO=$(cd "$(dirname "$0")/../.." && pwd)

log() { echo "[build] $*"; }
die() { echo "[build] ERROR: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run as root"
[[ -f "$CREDS" ]] || die "$CREDS is missing; run provision-db.sh first"
grep -q '^OWNER_DATABASE_URL=' "$CREDS" || die "$CREDS has no OWNER_DATABASE_URL; run provision-db.sh first"
[[ -f "$REPO/scripts/local-setup.sh" ]] || die "$REPO is not the repository's clone"

# --- Node, as pinned --------------------------------------------------------

node_version="v$(tr -d '[:space:]' <"$REPO/.nvmrc")"
case "$(uname -m)" in
  aarch64) node_arch=arm64 ;;
  x86_64) node_arch=x64 ;;
  *) die "unsupported architecture $(uname -m)" ;;
esac
node_dir="/opt/node-$node_version-linux-$node_arch"
if [[ "$(command -v node >/dev/null && node --version)" != "$node_version" ]]; then
  if [[ ! -x "$node_dir/bin/node" ]]; then
    tarball="node-$node_version-linux-$node_arch.tar.xz"
    work=$(mktemp -d)
    log "downloading $tarball from nodejs.org"
    curl -fsSL -o "$work/$tarball" "https://nodejs.org/dist/$node_version/$tarball"
    curl -fsSL -o "$work/SHASUMS256.txt" "https://nodejs.org/dist/$node_version/SHASUMS256.txt"
    (cd "$work" && grep " $tarball\$" SHASUMS256.txt | sha256sum -c --status) ||
      die "$tarball does not match nodejs.org's SHA-256"
    tar -xJf "$work/$tarball" -C /opt
    rm -rf "$work"
  fi
  for bin in node npm npx corepack; do ln -sf "$node_dir/bin/$bin" "/usr/local/bin/$bin"; done
fi
corepack enable --install-directory /usr/local/bin
log "node $(node --version), pnpm from package.json's packageManager"

# --- the build user ---------------------------------------------------------

if ! id "$BUILD_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/home/$BUILD_USER" --shell /usr/sbin/nologin "$BUILD_USER"
fi
chown -R "$BUILD_USER:$BUILD_USER" "$REPO"

# --- the build --------------------------------------------------------------

# `$$` stops systemd expanding the variable itself, so the connection string
# stays out of the unit's command line; bash expands it inside the unit.
# shellcheck disable=SC2016
build_cmd='export DATABASE_URL="$$OWNER_DATABASE_URL" && pnpm install --frozen-lockfile && exec bash scripts/local-setup.sh'

if ((FOREGROUND)); then
  set -a
  # shellcheck source=/dev/null
  . "$CREDS"
  set +a
  cd "$REPO"
  exec runuser -u "$BUILD_USER" -- env HOME="/home/$BUILD_USER" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    DATABASE_URL="$OWNER_DATABASE_URL" ${DERIVE_LIMIT:+DERIVE_LIMIT="$DERIVE_LIMIT"} \
    bash -c 'pnpm install --frozen-lockfile && exec bash scripts/local-setup.sh'
fi

if systemctl is-active --quiet "$UNIT"; then
  die "$UNIT is already running; follow it with: journalctl -u $UNIT -f"
fi
systemctl reset-failed "$UNIT" 2>/dev/null || true
systemd-run --unit="$UNIT" --collect \
  --uid="$BUILD_USER" --gid="$BUILD_USER" --working-directory="$REPO" \
  -p EnvironmentFile="$CREDS" \
  -p Environment="HOME=/home/$BUILD_USER" \
  -p Environment=COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  ${DERIVE_LIMIT:+-p Environment="DERIVE_LIMIT=$DERIVE_LIMIT"} \
  /bin/bash -c "$build_cmd"
log "started. Follow it with: journalctl -u $UNIT -f"
log "when it finishes: sudo bash scripts/production/check-db.sh stats"
