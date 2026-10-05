# 2026-10-05 — Premium eligibility (TASK-117, PRE-002)

M4's third step (`tasks/117-premium-eligibility.md`). The owner asked to "build next step premium eligibility" after TASK-116 merged, and decided the policy the same day (§6 U-1, U-2). Built on `main` @ `38f5f45`. Nothing is deployed, stored or run on production.

## What changed

- **`packages/truth/src/premium-eligibility.ts`** (new):
  - `premiumEligibilityOf(paid, free, tier)` applies policy `eligibility@0`. Its inputs are the surname's DiscoveryIndex on the PAID surface, the same index built from its FREE response, and its coverage tier. ELIGIBLE needs all of:
    - two kinds of deeper evidence (DiscoveryIndex categories other than SOURCES) with premium items. A premium item is one the PAID surface allows less those the free page shows;
    - coverage STANDARD or RICH;
    - some premium item that is neither UNCONFIRMED nor INSUFFICIENT_DATA.

    Otherwise the state is INSUFFICIENT_MEANINGFUL_CONTENT, or RIGHTS_BLOCKED when paid rights alone leave nothing. The reasons are NO_PREMIUM_INVENTORY, ALL_SHOWN_FREE, PAID_RIGHTS_BLOCKED, ONE_CATEGORY_ONLY, UNCONFIRMED_ONLY and COVERAGE_BELOW_STANDARD.
  - `assessPremiumEligibility(db, surname)` builds the DiscoveryIndex. It reads the FREE surface only when some kind has an item the PAID surface allows, so most surnames cost one read.
  - `premiumEligibilityRun` and `premiumEligibilityRunMarkdown` give the register-wide tally by state, by reason and, per list, the surnames and people eligible. Lists are never summed.
- **`packages/truth/bin/premium-eligibility.ts`**, `pnpm premium:eligibility` (root) and `premium-eligibility` (`@name-atlas/truth`).
- **`packages/truth/src/discovery-index.ts`:** `buildDiscoveryIndex`'s outcome carries its `coverage` assessment instead of only its `people`, so the tier is read once; `discoveryRun` reads `coverage.people`.
- `packages/truth/src/index.ts` exports. `packages/truth/src/premium-eligibility.test.ts`: 7 unit tests of `docs/canonical/17` §44's cases. `tests/integration/src/coverage-assessment.test.ts`: a `premium eligibility (TASK-117)` block of 5 tests on TASK-080's data.
- `tasks/117-premium-eligibility.md`, `STATUS.md`, `PLAN.md` (the M4 row), `docs/CODEMAP.md`.

## Verification (commands run, results as returned)

CI's `verify` job cannot run on GitHub (the account's billing block; see #136). Its steps from `.github/workflows/ci.yml` were run locally in order, on the working tree of `ed24695`, against PostgreSQL 16.13 with PostGIS 3.4.2 (`DATABASE_URL` a fresh `name_atlas`; `TEST_DATABASE_URL` the same server), with the pre-installed Chromium for Playwright.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `python3 scripts/test-backup.py` | exit 0, 6 tests |
| `pnpm test` | exit 0; 2,260 tests, of which truth 395 (7 new) |
| `pnpm db:migrate`; `db:generate-types` and `git diff --exit-code -- packages/db/src/generated` | exit 0; generated types unchanged |
| `pnpm premium:eligibility -- --limit 5` on that fresh migrated database | exit 0; the tables print with 0 surnames |
| `pnpm premium:eligibility -- --limit 0` | "--limit needs a positive whole number", exit 2 |
| `pnpm test:integration` | exit 0; 37 files, 458 tests (5 new; TASK-080's and TASK-116's still pass) |
| `pnpm test:golden` | exit 0; 4 files, 364 tests |
| `pnpm build` | exit 0 |
| `pnpm e2e:seed`; `pnpm test:e2e` | exit 0; 10 Playwright tests passed |

What the tests show:

- **Unit, `docs/canonical/17` §44:**
  - RICH and STANDARD with two kinds beyond the free page are ELIGIBLE; LIMITED and MINIMAL with the same are not (COVERAGE_BELOW_STANDARD).
  - One kind plus SOURCES is ONE_CATEGORY_ONLY.
  - Unconfirmed items, or items with no confidence, are UNCONFIRMED_ONLY.
  - Validated items the PAID surface blocks are RIGHTS_BLOCKED.
  - Two kinds both shown free are ALL_SHOWN_FREE; with one shown free, ONE_CATEGORY_ONLY.
  - RESEARCH_STILL_RUNNING is not reachable: no research run exists.
- **Integration, on the committed PESEL male excerpt with the synthetic meaning works:**
  - MAZUR is NO_PREMIUM_INVENTORY and COVERAGE_BELOW_STANDARD.
  - KOWALCZYK's meaning is on the free page, so it is ALL_SHOWN_FREE.
  - With the meaning works' `metadata_rights` PROHIBITED, the free page blocks the meaning and PAID allows it. ORIGIN_ALTERNATIVES then counts 1 premium item, and the reasons are ONE_CATEGORY_ONLY and COVERAGE_BELOW_STANDARD.
  - With commercial use UNKNOWN, the state is RIGHTS_BLOCKED.
  - The run reads every active surname once. None is ELIGIBLE, ALL_SHOWN_FREE counts 2, and the male list has 0 eligible.

## Not verified

- **AC-4 on production:** no run over the full register. It is the owner's command: `DATABASE_URL=<read-only URL> pnpm premium:eligibility > premium-eligibility.md`. Expected, not measured: 0 ELIGIBLE, since meanings are the only countable kind and the free page shows them.
- Nothing offers a surname report, so nothing calls this yet. TASK-111's checkout sells ADR-0037's tiers, which promise no surname report.
