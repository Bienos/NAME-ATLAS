# 2026-09-29 — TASK-036: batch derivation fast enough for the real register

Scope authority: `tasks/036-batch-derivation-at-register-scale.md`.

## Found

The TASK-035 rehearsal loaded the complete 2026-01-20 register into a local PostgreSQL 16 with PostGIS 3.4.2:
- 598,476 surnames;
- the four official files, SHA-256-verified.

It then ran `pnpm truth:derive-batch --rank`. The TASK-028 record said "the end-to-end `derive-batch --rank` rate was **not** re-measured: that needs a universe that passes the completeness gate, i.e. the real files". This was that measurement. Two causes showed up, one after the other, each by sampling `pg_stat_activity`.

**1. The denominator, summed per surname.**
- Every active backend was running `select sum("v"."count") as "total" from "distribution_snapshots" …`, for 0.14–1.35 s each time.
- This is `publishedUniverseSum` in `packages/truth/src/rarity.ts`, the denominator of `RARITY_CONTEXT`. It was summed over the whole resource once per surname, with no cache.
- The rate was 5 surnames a second.

**2. The universe's evidence item, found by fetching all of them.**
- With the sum cached, the rate fell as the run went on: 35 a second at 11:01, then 13.3 a second on average over the next 43 minutes.
- The backends were now running `select "evidence_item_id" from "evidence_items" where "source_record_id" = $1 and "evidence_type" = $2 and "subject_entity_id" is null order by "created_at"` for 0.15–0.28 s.
- `deriveRarityContext` (and `deriveCurrentDistribution`) reuse the earliest such item. `deriveCurrentRank` writes one per ranked surname. At that point there were 28,339 and 24,435 of them on the two national source records, against exactly 1 on each regional one.
- The only index was on `source_record_id`. The query had no `LIMIT`, because Kysely's `executeTakeFirst()` keeps the first row without asking for only one.
- Every lookup therefore fetched every such item, and each surname ranked added another: quadratic over the register.

## Changed

- **`packages/truth/src/rarity.ts`.**
  - `UniverseSumCache` is a run-scoped `Map` of source record to sum. It follows the same lifetime rule as `UniverseSizeCache`: it is consulted only after the completeness gate has passed.
  - `publishedUniverseSum` reads the cache and writes it.
  - `DeriveRarityOptions.universeSumCache` passes the cache in.
  - The universe-evidence lookup gains `.limit(1)`.
- **`packages/truth/src/distribution.ts`.** The same lookup gains `.limit(1)`.
- **`packages/truth/src/index.ts`** exports `publishedUniverseSum` and `UniverseSumCache`.
- **`packages/truth/bin/derive-batch.ts`** creates one `UniverseSumCache` per run.
- **`packages/db/migrations/0022_universe_evidence_lookup_index.ts`** adds a partial index `evidence_items (source_record_id, evidence_type, created_at) WHERE subject_entity_id IS NULL`, so the earliest item is the first index entry.
- **Tests.**
  - `tests/integration/src/universe-cache.test.ts` has three new tests for the cache (it is filled, a poisoned entry is returned, and the result equals the uncached sum and a direct SQL sum), plus an `EXPLAIN` test that the lookup can be served by the new index.
  - The three lists of migrations include `0022`: `packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts` and `tests/integration/src/canonical-key-v2.test.ts`.

## Verified

Against a local PostgreSQL 16.13 with PostGIS 3.4.2, through `TEST_DATABASE_URL`:

| Command | Result |
|---|---|
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| `pnpm format:check` | Passed |
| `pnpm check:ids` | Passed |
| `pnpm test` | Passed: 714 |
| `pnpm test:integration` | Passed: 285, which is 281 before plus four new tests |
| `pnpm test:golden` | Passed: 364 |

Regression proof, with each change undone on its own and restored byte-identical afterwards:

| Undone | Result |
|---|---|
| The cache write | "populates the cache on the first call" fails |
| The cache read | "returns what the cache holds rather than summing again" fails |
| The index (migration `up` emptied) | "serves the universe-evidence lookup from its partial index (0022)" fails |

The `.limit(1)` has no test of its own. Its effect is the last row of the table below.

**Rate on the real register.** All figures were measured on the same local database, holding the complete register, by counting `ACTIVE` claims over a fixed window. Eight workers ran on 4 CPUs.

| State of the code | Surnames a second |
|---|---|
| Before any change | 5 (`CURRENT_POPULATION` 128 → 432 in 60 s) |
| Sum cached, first minute | 65 (`RARITY_CONTEXT` 880 → 4,887 in 61 s) |
| Sum cached, two minutes at 11:01 | 35 (13,818 → 18,100 in 120 s) |
| Sum cached, the next 43 minutes | 13.3 on average (18,100 → 52,457), and falling |
| Sum cached and index `0022`, no `LIMIT` | 13 (53,493 → 55,167 in 120 s); the lookup still 0.1–0.25 s, waiting on `BufferIO` and `DataFileRead` |
| Sum cached, index `0022` and `.limit(1)` | **83** (57,344 → 67,337 in 120 s); no statement in `pg_stat_activity` over a few milliseconds |

The lookup itself, run through `psql` with `EXPLAIN ANALYZE` on that database with the index and `LIMIT 1`, took 0.064 ms as a custom plan and 0.042 ms as a generic one. Both are an `Index Scan using evidence_items_universe_lookup_idx`.

## Not verified

- **The rate over a whole run.** The full derivation was still running when this was written. Its end-to-end figures belong to the TASK-035 rehearsal record.
- **Migration `0022` on production.** Production holds 21 migrations. `0022` is applied there as part of TASK-035's load.
