# TASK-071 — Coverage per surname on the paid surface

M4's first step (`tasks/071-coverage-assessment.md`). The owner decided the rules on 2026-10-03: the proposed v0 tier rule, and Polona's raw hits at most PARTIAL. Built on #77's head. Nothing is deployed or run on production.

## What changed

- `packages/truth/src/coverage-assessment.ts`:
  - `assessCoverage(db, surname)` reads the surname through `querySurnameResult` on the PAID surface. It returns twelve dimensions, each with an availability, an item count and a reason code, plus a tier and the version `coverage@0`.
  - Rules:
    - **STRONG** needs a ready section at VERIFIED or LIKELY confidence on the PAID surface.
    - **Archives** are never STRONG.
    - **Localities** are reported but never counted.
    - **Dimensions with no source yet** are NOT_RETRIEVED, never NONE.
    - **Tiers:** RICH needs a strong meaning and strong archives; STANDARD needs one of the two; LIMITED needs population and rarity plus change over time; everything else is MINIMAL.
  - `coverageRun` and `coverageRunMarkdown` assess every active surname through the same function and tally the results by tier, by list (its comparability group; lists are never summed) and by dimension.
- `packages/truth/bin/coverage-assess.ts` and `pnpm coverage:assess [-- --limit N --concurrency N]`: a read-only command that prints Markdown, with progress to stderr.
- Tests:
  - `packages/truth/src/coverage-assessment.test.ts`: six tier tests.
  - `tests/integration/src/coverage-assessment.test.ts`: six tests on the PESEL excerpt.
    - Every dimension is listed, and an unsearched source reads NOT_RETRIEVED.
    - A meaning two works agree on is STRONG; a conflicting meaning is PARTIAL.
    - Polona matches are PARTIAL.
    - A source with UNKNOWN commercial use reads BLOCKED_RIGHTS.
    - A surname is MINIMAL without rarity and STANDARD with a READY rarity section put into its real response.
    - The register run counts every surname once.
- `tasks/071-coverage-assessment.md`, this record and `STATUS.md`.

## Verification, 2026-10-03

Local PostgreSQL 16 with PostGIS (`TEST_DATABASE_URL`).

| Command | Result |
|---|---|
| `pnpm typecheck`, `lint`, `format:check`, `check:ids` | exit 0 |
| `pnpm test` | exit 0; truth 381 tests (six new) |
| `pnpm test:integration` | exit 0; 33 files, 403 tests (six new) |
| `pnpm test:golden` | exit 0; 364 tests |
| `pnpm coverage:assess -- --limit 5` on a freshly migrated empty database | prints the tables with 0 surnames; `--limit 0` is refused with exit 2 |

## Not verified

- **AC-3 and AC-5:** a run over the full register, locally or on production. This environment has no copy of the register and no production credentials. It is the owner's command to run: `DATABASE_URL=<read-only URL> pnpm coverage:assess > coverage.md`. A first sample with `-- --limit 2000` gives the time per surname.
- **What the run will likely show,** inferred from the code and `STATUS.md` but not measured:
  - **RICH:** no surname can be RICH, because archives are never STRONG.
  - **STANDARD:** needs a LIKELY meaning, which takes two agreeing works. The 172 meanings come from one work per surname (Buryan, or Walkowiak's article), so they read POSSIBLE and give PARTIAL. If so, nothing is STANDARD either.
  - **LIMITED and MINIMAL:** the split depends on whether rarity and change over time are ready on the PAID surface. The PESEL profile states CC0 and allowed commercial use, as the fixture shows.
