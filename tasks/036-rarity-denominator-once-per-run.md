# TASK-036 — Compute the rarity denominator once per batch run

- **Status:** IMPLEMENTED 2026-09-29. The record is in `docs/progress/2026-09-29-rarity-denominator-cache.md`.
- **Found by:** the TASK-035 rehearsal, the first run of `derive-batch --rank` against the real register since `RARITY_CONTEXT` joined the batch.
- **Milestone:** none. This is a defect fix that TASK-035 depends on.

## 1. Goal

`pnpm truth:derive-batch --rank` against the real register ran at 5 surnames a second:
- For every surname, `deriveRarityContext` summed every published count in the resource: the denominator of "about 1 in X".
- The sum takes 0.4–1.3 s and is identical for every surname in the resource.
- The completeness count (TASK-028) and the rank table are already computed once per run. The denominator was not.

## 2. In scope

- **`UniverseSumCache`** in `packages/truth/src/rarity.ts`: a run-scoped memo of published-universe sums by source record, the same shape and lifetime as `UniverseSizeCache` and `RankTableCache`.
  - `DeriveRarityOptions.universeSumCache` passes it in.
  - `publishedUniverseSum` fills it and reads it.
  - Both are exported so the cache can be tested directly.
- **`derive-batch`** creates one cache per run.
- **Tests** asserting that the cache is written and read, not only that the arithmetic is right (`tests/integration/src/universe-cache.test.ts`).

## 3. Out of scope

- **The single-surname CLI and the worker.** They derive one surname and keep calling without a cache.
- **The denominator itself.** Its definition, rounding and label are unchanged.

## 4. Acceptance criteria

1. **AC-1.** One call fills the cache. A poisoned cache entry is returned. The cached sum equals both the uncached sum and a direct SQL sum of the national values.
2. **AC-2.** With the cache's write removed, or its read removed, a new test fails.
3. **AC-3.** Against the real register, the rarity rate is measured before and after the change.
4. **AC-4.** Typecheck, lint, format, unit, integration and golden all pass.

## 5. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids
pnpm test
TEST_DATABASE_URL=postgres://… pnpm test:integration
TEST_DATABASE_URL=postgres://… pnpm test:golden
```
