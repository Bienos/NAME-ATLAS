# TASK-036 — Make batch derivation fast enough for the real register

- **Status:** IMPLEMENTED 2026-09-29. The record is in `docs/progress/2026-09-29-batch-derivation-at-register-scale.md`.
- **Found by:** the TASK-035 rehearsal, the first run of `derive-batch --rank` against the real register since `RARITY_CONTEXT` joined the batch.
- **Milestone:** none. This is a defect fix that TASK-035 depends on.

## 1. Goal

`pnpm truth:derive-batch --rank` against the real register must finish in hours, not days. It started at 5 surnames a second and slowed as it ran. Two things cost it per surname what should be paid once per universe:

1. **The rarity's denominator was summed per surname.**
   - For every surname, `deriveRarityContext` summed every published count in the resource: the denominator of "about 1 in X".
   - The sum takes 0.4–1.3 s and is identical for every surname in the resource.
   - The completeness count (TASK-028) and the rank table are computed once per run; the denominator was not.
2. **The universe's evidence item was found by reading every one of them.**
   - `deriveRarityContext` and `deriveCurrentDistribution` reuse the earliest subject-less `AUTHORITATIVE_INDEX` evidence item on the source record.
   - `deriveCurrentRank` writes one such item per ranked surname.
   - The lookup had no index beyond `source_record_id` and no `LIMIT`, so it fetched every such item, one more for each surname already ranked. The run was quadratic.

## 2. In scope

- **`UniverseSumCache`** in `packages/truth/src/rarity.ts`: a run-scoped memo of published-universe sums by source record, the same shape and lifetime as `UniverseSizeCache` and `RankTableCache`.
  - `DeriveRarityOptions.universeSumCache` passes it in.
  - `publishedUniverseSum` fills it and reads it.
  - Both are exported so the cache can be tested directly.
  - `derive-batch` creates one cache per run.
- **Migration `0022_universe_evidence_lookup_index`**: a partial index on `evidence_items (source_record_id, evidence_type, created_at) WHERE subject_entity_id IS NULL`.
- **`.limit(1)`** on the two universe-evidence lookups, in `rarity.ts` and `distribution.ts`. `executeTakeFirst()` keeps the first row but does not add a `LIMIT`.
- **Tests.**
  - The cache is written and read, not only arithmetically right.
  - The lookup can be served by the new index.
  - The three lists of migrations include `0022`.

## 3. Out of scope

- **The single-surname CLI and the worker.** They keep calling without a cache. Both still gain from the index and the `LIMIT`.
- **The evidence model.** `deriveCurrentRank` still writes one universe item per ranked surname.
- **The denominator.** Its definition, rounding and label are unchanged.
- **Other `executeTakeFirst()` queries without a `LIMIT`.** They are keyed by a claim, a surname or a snapshot, and return a handful of rows.

## 4. Acceptance criteria

1. **AC-1.** One call fills the cache. A poisoned cache entry is returned. The cached sum equals both the uncached sum and a direct SQL sum of the national values.
2. **AC-2.** With the cache's write removed, or its read removed, or the index removed, a new test fails.
3. **AC-3.** Against the real register, the rate is measured before and after each change, and it no longer falls as the run proceeds.
4. **AC-4.** Typecheck, lint, format, unit, integration and golden all pass.

## 5. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids
pnpm test
TEST_DATABASE_URL=postgres://… pnpm test:integration
TEST_DATABASE_URL=postgres://… pnpm test:golden
```
