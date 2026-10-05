# 2026-10-05 — The DiscoveryIndex (TASK-116, PRE-001)

M4's second step (`tasks/116-discovery-index.md`). The owner asked to "build next step premium report" and, offered the DiscoveryIndex, PremiumEligibility with it, or the report itself, chose the DiscoveryIndex. Built on `main` @ `de39642` and rebased onto `45168cb` (TASK-114, #134), then merged with `e1b18c2` (TASK-115, #135) and `291caaa` (ADR-0039, #132); of these files they touched only `STATUS.md` and `docs/CODEMAP.md`. Nothing is deployed, stored or run on production.

## What changed

- **`packages/truth/src/discovery-index.ts`** (new):
  - `discoveryIndexOf(paid, internal)` projects two validated responses of the query service into `docs/canonical/11` §24's eight categories. Each entry has `validated_count` (read on INTERNAL), `eligible_count` (read on PAID), `count_semantics`, `confidence_distribution`, `availability_status` (the TASK-080 coverage dimension it draws from), `reason_code` and `preview_allowed` (true exactly when `eligible_count` > 0). Version `discovery@0`.
  - **Rules `discovery@0`:** ORIGIN_ALTERNATIVES counts distinct proposed roots, by the meaning chain's own agreement key. SOURCES counts the distinct works behind them. ARCHIVE_REFERENCES counts no Polona search match. HISTORICAL_OCCURRENCES, HISTORICAL_VARIANTS, HISTORICAL_PLACES, MIGRATION_CLUES and HISTORICAL_LAYERS are NOT_RETRIEVED with `NO_SOURCE_YET`. Famous bearers are not counted.
  - `buildDiscoveryIndex(db, surname)` reads the PAID surface, and the INTERNAL surface only when the meaning section is rights-blocked on PAID. The query service blocks or passes that section whole, so otherwise the two surfaces would return the same interpretations.
  - `discoveryRun` and `discoveryRunMarkdown` index every active surname and tally, per category, the surnames with eligible items, their total, the surnames whose items are all rights-blocked, and each availability; and, per list, the surnames and people with any eligible item. Lists are never summed.
- **`packages/truth/bin/discovery-index.ts`**, `pnpm discovery:index` (root) and `discovery-index` (`@name-atlas/truth`).
- **`packages/truth/src/coverage-assessment.ts`:** the register loop moved out of `coverageRun` into `forEachActiveSurname`, which both runs use. `coverageRun`'s behaviour is unchanged.
- **`packages/truth/src/meaning.ts`:** `meaningRootKey`, the key `interpretationsAgree` already used, exported so the index dedupes by the same rule.
- `packages/truth/src/index.ts` exports. `packages/truth/src/discovery-index.test.ts` (5 unit tests of the dedupe rule). `tests/integration/src/coverage-assessment.test.ts`: a `DiscoveryIndex (TASK-116)` block of 5 tests on TASK-080's data, plus a shared helper for the rights toggle its AC-4 test already used.
- `tasks/116-discovery-index.md`, `STATUS.md`, `PLAN.md` (the M4 row), `docs/CODEMAP.md`.

## Verification (commands run, results as returned)

Local PostgreSQL 16 with PostGIS 3.4.2 (`postgresql-16-postgis-3`, installed with apt in this session), through `TEST_DATABASE_URL`. Docker is unavailable here.

| Command | Result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0, after `prettier --write` on the integration test file |
| `pnpm check:ids` | exit 0, "every task, ADR, migration and decision number is used once" |
| `pnpm test` | exit 0; truth 388 tests in 32 files (5 new) |
| `pnpm test:integration` | exit 0; 37 files, 452 tests (5 new; TASK-080's 6 still pass on the shared loop) |
| `pnpm test:golden` | exit 0; 4 files, 364 tests |
| `pnpm build` | exit 0 |
| `pnpm db:migrate`, then `pnpm discovery:index -- --limit 5`, on a fresh empty database | migrations to 0036 applied; the tables print with 0 surnames, exit 0 |
| `pnpm discovery:index -- --limit 0` | "--limit needs a positive whole number", exit 2 |
| After the rebase onto `45168cb`: `pnpm typecheck`, `lint`, `format:check`, `check:ids`; truth's unit tests; `tests/integration` `coverage-assessment.test.ts` and `family.test.ts` | each exit 0; truth 388 tests; the two integration files 32 tests |

What the integration tests show on the committed PESEL male excerpt (genuine surnames and counts) with the synthetic meaning works and ZAREMBA's recorded Polona responses:

- **AC-1:** MAZUR has all eight categories in order. ORIGIN_ALTERNATIVES is NONE. ARCHIVE_REFERENCES is NOT_RETRIEVED. The five sourceless categories are NOT_RETRIEVED with `NO_SOURCE_YET`.
- **AC-2:** KOWALCZYK's archive section is READY with catalogue matches, yet ARCHIVE_REFERENCES counts 0 validated and 0 eligible: PARTIAL, `UNVERIFIED_SEARCH_MATCHES`, no preview.
- **AC-3:** two works agreeing on KOWALCZYK's root (in different letter case) give 1 ORIGIN_ALTERNATIVE (STRONG, `{LIKELY: 1}`) and 2 SOURCES. NOWAK's two conflicting roots give 2 and 2 (PARTIAL, `CONFIDENCE_CONFLICTING`, `{CONFLICTING: 2}`).
- **AC-4:** with the meaning works' commercial use UNKNOWN, KOWALCZYK's ORIGIN_ALTERNATIVES is validated 1, eligible 0, BLOCKED_RIGHTS, no preview; SOURCES validated 2, eligible 0.
- **AC-5 (local part):** `discoveryRun` reads every active surname once. 2 have inventory, with ORIGIN_ALTERNATIVES 3 items and SOURCES 4. ARCHIVE_REFERENCES has 0 items and 1 PARTIAL. There is one list, `pesel_2026_national_male`.

## Not verified

- **AC-5 on production:** no run over the full register, locally or on production. This environment has no copy of the register and no production credentials. It is the owner's command: `DATABASE_URL=<read-only URL> pnpm discovery:index > discovery-index.md`; `-- --limit 2000` first gives the time per surname. TASK-080's `pnpm coverage:assess` has not had its run either.
- **What the run will likely show,** inferred from the code and `STATUS.md`, not measured. Surnames with inventory can only be those with a meaning on the PAID surface: 25 in production today, 1,324 once the Register VM step `meanings` (TASK-081) runs. Every other category counts 0 for every surname.
- No page, preview or offer reads the index. PremiumEligibility (PRE-002) is not built.
