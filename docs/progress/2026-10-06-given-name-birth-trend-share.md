# 2026-10-06 — TASK-139: the trend of first names given to children compares shares, not counts

Task: `tasks/139-given-name-birth-trend-share.md`. Decision: D-044 §6, amended 2026-10-06 (the owner: "yes switch to share and merge it"); ADR-0043 §4, amended. Built on `main` @ `3ca15e1`.

## What changed

- **`packages/truth/src/given-name-births.ts`:**
  - `birthTrend(latest, earlier)` takes each side's count and its list's `people_sum`. Both listed: `L·Es·100 > E·Ls·110` is RISING, `L·Es·100 < E·Ls·90` is FALLING, else STEADY. Absent earlier: RISING only if `L·Es·100 > (T − 1)·Ls·110`, else INDETERMINATE (`BELOW_CUTOFF_TOO_CLOSE`). Products in `BigInt`. A count or `people_sum` that is not a positive whole number, or a count above its `people_sum`, throws.
  - `sharePerMillion`: a share in parts per million, rounded down, for reading only.
  - `BirthListContext.people_sum`, read from `given_name_birth_lists`.
  - The trend requires both lists to pass the completeness gate. TASK-137 required it of the earlier list only when the name was absent from it.
  - A trend claim's value and its derived evidence add, for each list, `people_sum` and `share_per_million`, and `comparison` (the basis, the whole-number test and the earlier count used, T − 1 when absent). `derivation_method` is `birth_share_against_share_five_years_earlier`.
  - Per name, before deriving, every ACTIVE `GIVEN_NAME_BIRTH_TREND` claim with another method version is set `SUPERSEDED`. A new claim with the same key names it in `supersedes_claim_id`. The run tally adds `trend.superseded`; a name's outcome adds `superseded_trends`.
- **`packages/truth/src/version.ts`:** `GIVEN_NAME_BIRTH_TREND_METHOD_VERSION = "given_name_birth_trend@2"`. Count and rank stay `@1`.
- **`packages/truth/src/index.ts`:** exports `sharePerMillion` and `BirthTrendListed`.
- **Tests:** `given-name-births.test.ts` rewritten for the share rule (11 tests: each branch at and around the 10% bounds, shares against counts, the four published examples, absent-earlier RISING and INDETERMINATE under cut-offs 2 and 5, values at the PostgreSQL integer limit, invalid input, `sharePerMillion`). `given-name-birth-claims.test.ts`: new totals and the four names with `people_sum` and shares; MYROSLAV's `earlier_count_used: 1`; the excerpt case now refuses all 965 trends; a new test sets stored trend claims to `@1` by hand (one also on another key) and checks they are superseded, none stays ACTIVE, and a further run writes nothing.
- **Docs:** ADR-0043 (status, Context 4, Decision 4, Consequences), D-044 §6 (an amendment below the first text, which stays), `PRODUCT.md` §6's free-view line, this record, `STATUS.md`.

No migration, claim type or contract changed.

## Verification

GitHub Actions starts no jobs on this account (billing), so there is no CI result. Run locally on PostgreSQL 16 with PostGIS 3 (`apt-get install postgresql-16-postgis-3`, `pg_ctlcluster 16 main start`); Docker is not available, so `TEST_DATABASE_URL` pointed at that server.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | first run exit 1 (two files); after `prettier --write` on them, exit 0 |
| `pnpm check:ids` | exit 0: "every task, ADR, migration and decision number is used once" |
| `pnpm test` | exit 0: 15 packages, 2,378 tests (truth 406) |
| `pnpm build` | exit 0 |
| `pnpm test:integration` | exit 0: 45 files, 510 tests (1 new) |
| `pnpm test:golden` | exit 0: 4 files, 364 tests |

**The full dataset, on a disposable local database** (`atlas_births_139`, migrated to 0041, holding nothing else). The 13 resources of dataset 219 were downloaded from each registry `official_source_url`; every SHA-256 equals the registry's. `pnpm import:given-name-births --resource {id} --file {file} --metadata {saved object}` for each: all 13 imported, exit 0 (2025: 126,404 boys, 119,788 girls; 2020: 186,590 and 176,829).

1. `pnpm truth:derive-given-name-births` from a worktree of `main` @ `3ca15e1` (the `@1` rule): exit 0, 77.4 s. Counts 35,598, ranks 35,598, trends 1,904 derived, none refused; 1,904 `@1` trend claims ACTIVE.
2. The same command on this branch (`@2`): exit 0, 17.2 s. Counts and ranks 35,598 existing each, none derived; trends 1,904 derived, 0 refused, 1,904 superseded.
3. Again on this branch: exit 0; counts, ranks and trends all existing, 0 derived, 0 superseded. `claims` 75,004, `evidence_items` 111,944, `research_runs` 6,528, `citations` 78,812, `confidence_assessments` 75,004, the same before and after.
4. Trend claims afterwards: `given_name_birth_trend@1` SUPERSEDED 1,904; `given_name_birth_trend@2` ACTIVE 1,904, each with `supersedes_claim_id` set. No `@1` trend claim is ACTIVE.

Directions, 2025 against 2020:

| | `@1` (counts) | `@2` (shares) |
|---|---|---|
| Boys | 621 rising, 98 steady, 246 falling | 771 rising, 68 steady, 126 falling |
| Girls | 580 rising, 104 steady, 255 falling | 727 rising, 63 steady, 149 falling |

The four names (share in parts per million of the children on the list, rounded down):

| Name | 2025 count / people_sum | share 2025 | 2020 count / people_sum | share 2020 | `@1` | `@2` |
|---|---|---|---|---|---|---|
| ZOFIA | 4,415 / 119,788 | 36,856 | 7,073 / 176,829 | 39,999 | FALLING | STEADY |
| JULIA | 3,207 / 119,788 | 26,772 | 7,351 / 176,829 | 41,571 | FALLING | FALLING |
| ANTONI | 5,253 / 126,404 | 41,557 | 8,368 / 186,590 | 44,846 | FALLING | STEADY |
| JAKUB | 3,386 / 126,404 | 26,787 | 7,162 / 186,590 | 38,383 | FALLING | FALLING |

## Not verified

- No INDETERMINATE trend occurs on the stored data: for 2025 against 2020 every name absent in 2020 is RISING. That branch is covered by unit tests only.
- Nothing was run on staging, production or the VM; migration 0041 and the claims are still not there.
