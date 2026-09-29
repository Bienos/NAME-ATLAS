# 2026-09-29 — TASK-036: the rarity denominator computed once per batch run

Scope authority: `tasks/036-rarity-denominator-once-per-run.md`.

## Found

The TASK-035 rehearsal loaded the complete 2026-01-20 register into a local PostgreSQL 16 with PostGIS 3.4.2:
- 598,476 surnames;
- the four official files, SHA-256-verified.

It then ran `pnpm truth:derive-batch --rank`, which derived 5 surnames a second. At that rate the two derive steps of `pnpm local:setup` would take over a day.

`pg_stat_activity`, sampled three times, showed every active backend running the same statement:

```
select sum("v"."count") as "total" from "distribution_snapshots" as "s"
  inner join "distribution_values" as "v" …
```

Each run took between 0.14 and 1.35 s. This is `publishedUniverseSum` in `packages/truth/src/rarity.ts`:
- it is the denominator of `RARITY_CONTEXT`;
- it is summed over the whole resource once per surname;
- it has no cache.

The completeness count behind it has had a run-scoped cache since TASK-028, and the rank a run-scoped table. The record of that work noted that "the end-to-end `derive-batch --rank` rate was **not** re-measured: that needs a universe that passes the completeness gate, i.e. the real files". This is the first such run.

## Changed

- **`packages/truth/src/rarity.ts`.**
  - `UniverseSumCache` is a run-scoped `Map` of source record to sum. It is documented with the same lifetime rule as `UniverseSizeCache`: it is only true once an import has finished, and it is consulted only after the completeness gate has passed.
  - `publishedUniverseSum` reads the cache first and writes the sum after computing it.
  - `DeriveRarityOptions.universeSumCache` passes the cache in.
- **`packages/truth/src/index.ts`** exports `publishedUniverseSum` and `UniverseSumCache`.
- **`packages/truth/bin/derive-batch.ts`** creates one `UniverseSumCache` per run and passes it to `deriveRarityContext`.
- **`tests/integration/src/universe-cache.test.ts`** has three new tests:
  - the first call fills the cache;
  - a poisoned entry is returned, rather than the sum computed again;
  - the cached sum equals the uncached one and a direct SQL sum of the national values.

## Verified

Against a local PostgreSQL 16.13 with PostGIS 3.4.2, through `TEST_DATABASE_URL`:

| Command | Result |
|---|---|
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| `pnpm format:check` | Passed |
| `pnpm check:ids` | Passed |
| `pnpm test` | Passed: 714 |
| `pnpm test:integration` | Passed: 284, which is 281 before plus the three new tests |
| `pnpm test:golden` | Passed: 364 |

Regression proof, with the fix undone one piece at a time and restored byte-identical afterwards:

| Removed | Result |
|---|---|
| The cache write (`cache?.set`) | "populates the cache on the first call" fails; the other 7 pass |
| The cache read (`return cached`) | "returns what the cache holds rather than summing again" fails; the other 7 pass |

Rate, measured on the same local database holding the complete register, by counting `ACTIVE` claims over one minute:

| Run | Rate |
|---|---|
| Before: `derive-batch --rank`, 8 workers | 5 surnames a second (`CURRENT_POPULATION` 128 → 432 in 60 s) |
| After, first minute | 65 surnames a second (`RARITY_CONTEXT` 880 → 4,887 in 61 s) |
| After, sustained, with nothing else running on the machine | 35 surnames a second (`RARITY_CONTEXT` 13,818 → 18,100 in 120 s), load average 5.9 on 4 CPUs |

The sustained figure is the one to plan with: about 7× faster, and bound by CPU rather than by one repeated query.

## Not verified

- **The rate over a whole run.** The full derivation was still running when this was written. Its end-to-end figures belong to the TASK-035 rehearsal record.
