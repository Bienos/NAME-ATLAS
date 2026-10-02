#!/usr/bin/env bash
# TASK-049: run on the owner's trusted restore machine, never on the VM.
# The age private identity stays there. PostgreSQL 17 + PostGIS must be installed.
set -euo pipefail
set +x
umask 077
die() { echo "[restore] ERROR: $*" >&2; exit 1; }
object=${1:-}
[[ "$object" =~ ^name_atlas-[0-9]{8}T[0-9]{6}Z-([a-f0-9]{64})\.dump\.age$ ]] || die "pass the verified backup's object name"
expected_hash=${BASH_REMATCH[1]}
: "${RESTORE_DATABASE_URL:?set an empty scratch database URL}"
: "${BACKUP_R2_BUCKET:?set the backup bucket}"
: "${BACKUP_RCLONE_CONFIG:?set the private rclone config path}"
: "${BACKUP_AGE_IDENTITY:?set the local age identity path}"
# Match the database name, without printing a URL that may carry a password.
database=$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c 'SELECT current_database()' 2>/dev/null)
[[ "$database" =~ ^name_atlas_restore_[a-z0-9_]+$ ]] || die "destination must be named name_atlas_restore_<suffix>"
tables=$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','S')" 2>/dev/null)
[ "$tables" = 0 ] || die "the scratch database must be empty (including extensions)"
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
trap 'exit 1' HUP INT TERM
remote="nameatlas:$BACKUP_R2_BUCKET/name-atlas/$object"
rclone --config "$BACKUP_RCLONE_CONFIG" --log-level ERROR copyto "$remote" "$tmp/dump.age" 2>"$tmp/error" || die "download failed"
hash=$(shasum -a 256 "$tmp/dump.age" | cut -d' ' -f1)
[ "$hash" = "$expected_hash" ] || die "download SHA-256 differs; database untouched"
rclone --config "$BACKUP_RCLONE_CONFIG" --log-level ERROR copyto "$remote.manifest.age" "$tmp/manifest.age" 2>"$tmp/error" || die "manifest download failed"
age -d -i "$BACKUP_AGE_IDENTITY" -o "$tmp/manifest.json" "$tmp/manifest.age" 2>"$tmp/error" || die "manifest decryption failed"
if ! age -d -i "$BACKUP_AGE_IDENTITY" "$tmp/dump.age" 2>"$tmp/error" |
  pg_restore --exit-on-error --single-transaction --no-owner --no-acl -d "$RESTORE_DATABASE_URL" 2>"$tmp/restore-error"; then
  die "restore failed; discard this scratch database and retry in a fresh one"
fi
cd "$(dirname "$0")/../.."
DATABASE_URL="$RESTORE_DATABASE_URL" pnpm exec tsx ops/vm/backup-check.ts verify "$tmp/manifest.json"
echo "[restore] restore drill passed in the scratch database"
