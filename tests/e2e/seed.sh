#!/usr/bin/env bash
# Seeds the database the end-to-end tests read (TASK-103): the committed PESEL
# fixtures (22 + 23 national rows, 40 + 38 regional rows; fixtures/pesel/),
# their page addresses, the derivations the batch makes from them, and NOWAK's
# well-known bearers from the pinned Wikidata answer (seed-bearers.ts).
# Nothing is downloaded. Idempotent: a second run changes nothing.
#
#   DATABASE_URL=postgres://… bash tests/e2e/seed.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${DATABASE_URL:?DATABASE_URL must point at the database the tests read}"

META=docs/sources/acquisition/2026-09-18/metadata
sha() { sha256sum "$1" | cut -d' ' -f1; }
national() {
  pnpm exec tsx packages/sources/bin/import-pesel.ts --resource "$1" --file "fixtures/pesel/$2" \
    --metadata "$META/$3" --sha256 "$(sha "fixtures/pesel/$2")"
}
regional() {
  pnpm exec tsx packages/sources/bin/import-pesel-regional.ts --resource "$1" --file "fixtures/pesel/$2" \
    --metadata "$META/$3" --sha256 "$(sha "fixtures/pesel/$2")"
}

echo "[e2e-seed] migrate"
pnpm db:migrate
echo "[e2e-seed] national and regional fixtures"
national 1148808 national-male-2026-01-20.csv pesel_national_2026_male_1148808.official_resource.json
national 1148811 national-female-2026-01-20.csv pesel_national_2026_female_1148811.official_resource.json
regional 1148786 regional-male-2026-01-20.csv pesel_regional_2026_male_1148786.official_resource.json
regional 1148790 regional-female-2026-01-20.csv pesel_regional_2026_female_1148790.official_resource.json
echo "[e2e-seed] page addresses"
pnpm seo:backfill-slugs
echo "[e2e-seed] derivations"
pnpm truth:derive-batch --all
echo "[e2e-seed] NOWAK's well-known bearers"
pnpm exec tsx tests/e2e/seed-bearers.ts
echo "[e2e-seed] done"
