# 2026-10-06 — First names given to children: count, rank and trend as claims (TASK-137)

The second build step of D-044 (`tasks/137-given-name-birth-claims.md`; ADR-0043, proposed). Built on `main` @ `6efc7c0`. Nothing is deployed, applied on the VM or derived on staging or production.

## What changed

- **Migration 0041** (`packages/db/migrations/0041_given_name_birth_claims.ts`): `claim_type` gains `GIVEN_NAME_BIRTH_COUNT`, `GIVEN_NAME_BIRTH_RANK` and `GIVEN_NAME_BIRTH_TREND`; the check `claims_given_name_birth_scope` holds them at `SHARED`. Down drops the check; enum values stay. `packages/db/src/generated/db.ts` regenerated (the `ClaimType` line only).
- **`packages/truth/src/given-name-births.ts`** (new):
  - `birthTrend`, pure: D-044 §6 in integers, with `BIRTH_TREND_WINDOW_YEARS = 5` and `BIRTH_TREND_CHANGE_PERCENT = 10`. An absence five years earlier is read as "at most the earlier list's `publication_threshold` − 1", never 0.
  - `loadBirthRunContext`: the active lists once, each with its completeness verdict (registry checksum and the list's own `row_count`) and rank table; the latest list per sex, read from the data; the list five years earlier.
  - `deriveBirthName` (one name; a flagged name returns `FLAGGED`) and `deriveAllBirthNames` (every name with a stored count). Count, rank and trend claims through evidence → claim → confidence → citation, one `BASIC_GIVEN_NAME` run per name when something is written, an ACTIVE claim with the same key reused. A trend is cited to both lists' resources.
  - `version.ts`: `given_name_birth_count@1`, `given_name_birth_rank@1`, `given_name_birth_trend@1`.
- **`packages/truth/bin/derive-given-name-births.ts`**, `pnpm truth:derive-given-name-births` (root) and `derive-given-name-births` (`@name-atlas/truth`).
- **Fixtures:** `fixtures/pesel-given-name-births/full-first-{male,female}-{2020,2025}.csv`, the four full official files, each checksum equal to the registry's `official_sha256`; `source-manifest.json` lists them.
- **Tests:** `packages/truth/src/given-name-births.test.ts` (7, unit); `tests/integration/src/given-name-birth-claims.test.ts` (9). The migration lists in `packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts` and `canonical-key-v2.test.ts`, and the claim-type list in `current-rank.test.ts`, include 0041.
- ADR-0043 (new), ADR-0042 (one consequence line), `tasks/137-given-name-birth-claims.md`, `STATUS.md`, `docs/CODEMAP.md`.

## Verification (commands run, results as returned)

GitHub Actions starts no jobs on this account (billing), so there is no CI result. Run locally on PostgreSQL 16 with PostGIS 3 (`apt-get install postgresql-16-postgis-3`, `pg_ctlcluster 16 main start`); `TEST_DATABASE_URL` pointed at that server.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm check:ids` | exit 0: "every task, ADR, migration and decision number is used once" |
| `pnpm test` | exit 0: 15 packages, 2,370 tests |
| `pnpm build` | exit 0 |
| `pnpm test:integration` | exit 0: 45 files, 509 tests (9 new) |
| `pnpm test:golden` | exit 0: 4 files, 364 tests |
| `pnpm db:migrate`, then `pnpm db:generate-types` | 0040 and 0041 applied on a fresh database; the regenerated file differs from `main` only by the three new claim types |

### The full dataset, once, on a disposable local database

`atlas_births`, a fresh database migrated to 0041, holding nothing else. The thirteen files were downloaded from each descriptor's `official_source_url` on 2026-10-06; every SHA-256 equals the registry's `official_sha256`.

- `pnpm import:given-name-births --resource {id} --file {file} --metadata {saved object}` for the thirteen resources: each `IMPORTED`, exit 0, 0 flagged. 35,598 counts in all (21457: 24,461; then 799, 799, 860, 822, 1,033, 1,015, 984, 976, 967, 978, 965, 939), 4,624 names.
- `pnpm truth:derive-given-name-births`, first run: exit 0, 55 s wall (53.1 s reported by the command).

  | Claim type | Derived | Refused |
  |---|---:|---:|
  | `GIVEN_NAME_BIRTH_COUNT` | 35,598 | 0 |
  | `GIVEN_NAME_BIRTH_RANK` | 35,598 | 0 |
  | `GIVEN_NAME_BIRTH_TREND` | 1,904 | 0 |

  Names: 4,624, flagged 0. Trend years: 2025 against 2020 for both sexes. Directions: boys 621 rising, 98 steady, 246 falling; girls 580 rising, 104 steady, 255 falling. 671 of the rising trends are names absent from the 2020 list (354 boys', 317 girls'), each read against the 2020 cut-off of 2.
  Rows after the run: 73,100 claims, 4,624 research runs, 109,369 evidence items, 75,004 citations.
- Second run: exit 0, 10 s wall. Count 0 derived / 35,598 existing, rank 0 / 35,598, trend 0 / 1,904. The four table counts were the same before and after (73,100; 4,624; 109,369; 75,004).

Named examples, 2025, read from the claims:

| Name | List | Count | Rank | Count 2020 | Trend |
|---|---|---:|---|---:|---|
| ZOFIA | girls | 4,415 | 1 of 939 | 7,073 | FALLING |
| JULIA | girls | 3,207 | 6 of 939 | 7,351 | FALLING |
| ANTONI | boys | 5,253 | 2 of 965 | 8,368 | FALLING |
| JAKUB | boys | 3,386 | 9 of 965 | 7,162 | FALLING |

The same counts and ranks were recomputed from the raw CSVs with `awk`, independently of the code, and matched.

## Not verified

- Nothing ran on staging, production or the Register VM; 0041 is not applied there.
- No page or contract reads the claims, so no surface was checked.
- No flagged form exists on any 2000–2025 national list. The "no claim for a flagged name" rule was tested by setting `form_review` by hand on ABDUL in the integration test's database.
- The rule `BELOW_CUTOFF_TOO_CLOSE` (an absence under a cut-off of 5) is covered by unit tests only. No stored pair of years reaches it while the latest year is 2025.
