#!/usr/bin/env bash
# TASK-049: a fresh, complete pg_dump streams into age. Never reuse the data-load
# dumps: those deliberately omit accounts and family rows. No private key on VM.
set -euo pipefail
set +x
umask 077

log() { echo "[backup] $*"; }
die() { echo "[backup] ERROR: $*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || die "run as root"
cd /
DB=name_atlas
BUILD_USER=nameatlas
APP=${BACKUP_APP:-/srv/name-atlas/app}
STATE=${BACKUP_STATE:-/var/lib/name-atlas/offhost-backup}
KEEP=${BACKUP_KEEP:-3}
[[ "$KEEP" =~ ^[1-3]$ ]] || die "BACKUP_KEEP must be 1 to 3"
for tool in age rclone flock node runuser; do
  command -v "$tool" >/dev/null || die "required tool is missing: $tool"
done
for unit in name-atlas-register-build name-atlas-shift-batch name-atlas-archive-load; do
  if [ -d /run/systemd/system ] && systemctl is-active --quiet "$unit"; then
    die "a data load is running; try again after it finishes"
  fi
done
[ -f "$APP/ops/vm/backup-check.ts" ] || die "the backup verifier is missing from the app checkout"
install -d -m 700 "$STATE"
exec 9>"$STATE/lock"
flock -n 9 || die "a backup is already running"
tmp=$(mktemp -d "$STATE/run.XXXXXX")
snapshot_pid=
snapshot_open=0
uploaded_object=
upload_verified=0
cleanup() {
  if [ -n "$snapshot_pid" ]; then
    if [ "$snapshot_open" = 1 ]; then printf '\n' >&6 || true; fi
    wait "$snapshot_pid" || true
  fi
  if [ -n "$uploaded_object" ] && [ "$upload_verified" = 0 ]; then
    # A failed upload/read-back is not a retained backup. Best-effort cleanup
    # touches only this run's objects, never a previously verified copy.
    r deletefile "$remote/$uploaded_object.manifest.age" || true
    r deletefile "$remote/$uploaded_object" || true
  fi
  rm -rf -- "$tmp"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

if [ "${1:-}" = --stdin ]; then
  IFS= read -r recipient
  IFS= read -r bucket
  IFS= read -r endpoint
  IFS= read -r access_key
  IFS= read -r secret_key
  [[ "$endpoint" =~ ^https://[a-f0-9]{32}(\.eu)?\.r2\.cloudflarestorage\.com$ ]] || die "invalid R2 endpoint"
  [[ "$access_key" =~ ^[A-Za-z0-9]+$ && "$secret_key" =~ ^[A-Za-z0-9]+$ ]] || die "invalid R2 credential format"
  config=$tmp/rclone.conf
  printf '[nameatlas]\ntype = s3\nprovider = Cloudflare\naccess_key_id = %s\nsecret_access_key = %s\nendpoint = %s\nacl = private\nno_check_bucket = true\n' \
    "$access_key" "$secret_key" "$endpoint" >"$config"
  unset access_key secret_key
else
  config=${BACKUP_RCLONE_CONFIG:-/etc/name-atlas-backup.conf}
  recipient=$(cat "${BACKUP_RECIPIENT_FILE:-/etc/name-atlas-backup.recipient}")
  bucket=${BACKUP_R2_BUCKET:-}
fi
[[ "$recipient" =~ ^age1[0-9a-z]+$ ]] || die "a native age public recipient is required"
[[ "$bucket" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] || die "invalid backup bucket"
[ -f "$config" ] && [ "$(stat -c '%a' "$config")" = 600 ] || die "rclone config must be a mode-600 file"
remote="nameatlas:$bucket/name-atlas"
r() { rclone --config "$config" --log-level ERROR "$@" 2>"$tmp/rclone.err"; }
as_build() {
  # shellcheck disable=SC2016 # the variables belong to the child shell
  runuser -u "$BUILD_USER" -- env DATABASE_URL="postgresql://$BUILD_USER@/$DB?host=/var/run/postgresql" \
    bash -c 'cd "$1" && exec pnpm exec tsx ops/vm/backup-check.ts snapshot' _ "$APP"
}

log "capture a consistent snapshot and encrypt the complete database"
mkfifo "$tmp/snapshot.in" "$tmp/snapshot.out"
as_build <"$tmp/snapshot.in" >"$tmp/snapshot.out" 2>"$tmp/snapshot.err" &
snapshot_pid=$!
exec 6>"$tmp/snapshot.in"
exec 7<"$tmp/snapshot.out"
snapshot_open=1
IFS= read -r snapshot <&7 || die "could not open the snapshot"
[[ "$snapshot" =~ ^[A-Fa-f0-9]+-[A-Fa-f0-9]+-[0-9]+$ ]] || die "invalid exported snapshot"
IFS= read -r manifest <&7 || die "could not capture the restore manifest"
printf '%s\n' "$manifest" >"$tmp/manifest.json"
# This is the sole exception to check-vm-dumps' exclusions: ciphertext on stdout,
# a snapshot held open by backup-check.ts, and no plaintext private data on disk.
if ! runuser -u postgres -- pg_dump --format=custom --snapshot="$snapshot" -d "$DB" 2>"$tmp/dump.err" |
  age -r "$recipient" -o "$tmp/dump.age" 2>"$tmp/age.err"; then
  die "database dump or encryption failed; nothing uploaded"
fi
printf '\n' >&6
wait "$snapshot_pid" || die "snapshot verification failed"
snapshot_pid=
age -r "$recipient" -o "$tmp/manifest.age" "$tmp/manifest.json" 2>"$tmp/age.err" || die "manifest encryption failed"
rm -f "$tmp/manifest.json"
size=$(stat -c '%s' "$tmp/dump.age")
# Three retained copies plus the next upload fit the 10 GB Standard allowance
# only below this ceiling, in a dedicated bucket with a 30-day lifecycle rule.
[ "$size" -gt 0 ] && [ "$size" -le 2490000000 ] || die "encrypted dump exceeds the configured free-tier size budget"
hash=$(sha256sum "$tmp/dump.age" | cut -d' ' -f1)
object="name_atlas-$(date -u +%Y%m%dT%H%M%SZ)-$hash.dump.age"
log "upload encrypted dump and verify bytes read back from the destination"
uploaded_object=$object
r copyto "$tmp/dump.age" "$remote/$object" || die "encrypted upload failed"
r cat "$remote/$object" >"$tmp/verify.age" || die "could not read the uploaded object"
[ "$(stat -c '%s' "$tmp/verify.age")" = "$size" ] &&
  [ "$(sha256sum "$tmp/verify.age" | cut -d' ' -f1)" = "$hash" ] || die "uploaded size or SHA-256 differs; old backups retained"
r copyto "$tmp/manifest.age" "$remote/$object.manifest.age" || die "manifest upload failed; old backups retained"
r cat "$remote/$object.manifest.age" >"$tmp/verify-manifest.age" || die "manifest read-back failed"
cmp -s "$tmp/manifest.age" "$tmp/verify-manifest.age" || die "manifest differs; old backups retained"
upload_verified=1
# Enumerate only this script's dump objects. Never delete another bucket prefix.
r lsf --files-only --include 'name_atlas-*.dump.age' "$remote" >"$tmp/list" || die "retention listing failed"
sort -r "$tmp/list" >"$tmp/sorted"
n=0
while IFS= read -r old; do
  [[ "$old" =~ ^name_atlas-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{64}\.dump\.age$ ]] || die "unexpected object name; retention stopped"
  n=$((n + 1))
  [ "$n" -le "$KEEP" ] && continue
  r deletefile "$remote/$old.manifest.age" || die "old manifest removal failed"
  r deletefile "$remote/$old" || die "old backup removal failed"
done <"$tmp/sorted"
printf '%s\n' "$object" >"$STATE/latest"
log "verified $size bytes, SHA-256 $hash; retained at most $KEEP copies"
log "object: $object (a production restore drill is still required)"
