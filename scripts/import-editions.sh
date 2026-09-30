#!/usr/bin/env bash
# Imports every earlier edition of the PESEL surname lists into the database
# DATABASE_URL names (TASK-045): the 2019 national pair, the 2020–2025 national
# editions of both series, and the 2025 regional pair — fifteen resources, each
# fetched from api.dane.gov.pl and verified against the registry's SHA-256
# before import, each stored as its own dated snapshot with the publisher's
# resource metadata as its raw payload. An edition creates no surname entity
# and yields no claim; the current resources alone do (packages/sources).
#
# Idempotent: a verified file is not fetched again, and an already imported
# resource is reported ALREADY_IMPORTED and left alone. Run from the repository
# root, after the current register is loaded (scripts/local-setup.sh), with
# DATABASE_URL set. Fails on the first fetch, checksum, metadata or import
# error.
set -euo pipefail

DIR=${EDITIONS_DIR:-data}
API=https://api.dane.gov.pl/1.4/resources

log() { echo "[editions] $*"; }
die() { echo "[editions] ERROR: $*" >&2; exit 1; }

[ -n "${DATABASE_URL:-}" ] || die "DATABASE_URL is not set"
[ -f package.json ] && [ -d packages/sources ] || die "run from the repository root"
command -v curl >/dev/null || die "curl is missing"

log "1/3 fetch and verify the editions into $DIR"
pnpm exec tsx packages/sources/bin/fetch-pesel.ts --editions --dir "$DIR"

log "2/3 the publisher's resource metadata, stored verbatim as each record's payload"
# "<resource_id> <role> <data_date> <rows>" per edition, from the registry itself.
mapfile -t editions < <(pnpm exec tsx packages/sources/bin/list-editions.ts)
[ "${#editions[@]}" -gt 0 ] || die "the registry lists no editions"
for line in "${editions[@]}"; do
  read -r id role date _rows <<<"$line"
  meta=$DIR/resource-$id.metadata.json
  if [ -s "$meta" ] && python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if d.get("data",{}).get("id")==sys.argv[2] else 1)' "$meta" "$id"; then
    continue
  fi
  curl -fsS --retry 5 --retry-delay 10 -o "$meta.partial" "$API/$id"
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); assert d["data"]["id"]==sys.argv[2], "metadata is for another resource"' "$meta.partial" "$id" \
    || die "the metadata fetched for resource $id is not its own"
  mv "$meta.partial" "$meta"
  log "  $id ($role $date): metadata fetched"
done

log "3/3 import"
for line in "${editions[@]}"; do
  read -r id role date _rows <<<"$line"
  file=$DIR/${role//_/-}-$date.csv
  meta=$DIR/resource-$id.metadata.json
  [ -f "$file" ] || die "$file is missing after the fetch step"
  case "$role" in
    national_*) importer=packages/sources/bin/import-pesel.ts ;;
    regional_*) importer=packages/sources/bin/import-pesel-regional.ts ;;
    *) die "unknown role $role for resource $id" ;;
  esac
  log "  $id ($role $date)"
  pnpm exec tsx "$importer" --resource "$id" --file "$file" --metadata "$meta" | sed 's/^/[editions]     /'
done
log "done: every edition the registry lists is imported"
