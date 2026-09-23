#!/usr/bin/env bash
# One command from an empty local database to a fully derived one.
# See docs/LOCAL_DATABASE.md for what each step does and how long it takes.
#
#   docker compose up -d        # or any PostgreSQL 16 + PostGIS 3.4
#   pnpm local:setup
#
# Every step is idempotent: re-running after a failure continues where it
# stopped, and re-running after success changes nothing.
set -euo pipefail
cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/name_atlas}"
echo "[setup] DATABASE_URL=$DATABASE_URL"

step() { echo; echo "[setup] === $* ==="; }

step "1/6 download and verify the four PESEL files into data/"
pnpm exec tsx packages/sources/bin/fetch-pesel.ts --dir data

step "2/6 migrate"
pnpm db:migrate

MANIFEST=fixtures/pesel/source-manifest.json
step "3/6 import national (male, female)"
pnpm exec tsx packages/sources/bin/import-pesel.ts --resource 1148808 --file data/national-male-2026-01-20.csv --metadata "$MANIFEST"
pnpm exec tsx packages/sources/bin/import-pesel.ts --resource 1148811 --file data/national-female-2026-01-20.csv --metadata "$MANIFEST"

step "4/6 import regional (male, female)"
pnpm exec tsx packages/sources/bin/import-pesel-regional.ts --resource 1148786 --file data/regional-male-2026-01-20.csv --metadata "$MANIFEST"
pnpm exec tsx packages/sources/bin/import-pesel-regional.ts --resource 1148790 --file data/regional-female-2026-01-20.csv --metadata "$MANIFEST"

step "5/6 surname page addresses"
pnpm seo:backfill-slugs

step "6/6 derive population, distribution, rank and rarity (the long step; resumable)"
pnpm truth:derive-batch --rank ${DERIVE_LIMIT:+--limit "$DERIVE_LIMIT"}

echo
echo "[setup] done. Start the site with:"
echo "  pnpm --filter ./apps/web build && (cd apps/web && DATABASE_URL=\"$DATABASE_URL\" pnpm start)"
echo "  then open http://localhost:3000/pl/nazwisko/nowak"
