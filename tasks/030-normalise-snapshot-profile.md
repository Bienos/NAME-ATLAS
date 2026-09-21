# TASK-030 — take 1 GB of repeated text off the snapshot rows

- **Status:** IMPLEMENTED AND VERIFIED 2026-09-21.
- **Priority:** P0 for deployment. The database must fit an 8 GB plan with room for a year's growth.
- **Depends on:** the full register (imported 2026-09-21), TASK-028 (the derivation that filled it).

## 1. Goal

Fit 8 GB comfortably, without storing less information.

## 2. What was wrong

Five columns on `distribution_snapshots` describe the **resource**, not the surname, and were stored
once per snapshot — 1,223,015 times over four source records:

| Column | Space | Distinct values |
|---|---:|---:|
| `coverage_notes` | 695 MB | **2** |
| `universe_description` | 157 MB | 4 |
| `methodology_key` | 60 MB | 4 |
| `comparability_group` | 30 MB | 4 |
| `dataset_version` | 25 MB | 4 |

967 MB of a 1,162 MB table — **83%** — holding at most four strings.

The functional dependency was **verified before anything was changed**, not assumed: grouping the
whole table by `source_record_id` returned exactly one distinct value of every column for all four
records.

## 3. Acceptance criteria

- **AC-1** The five columns live on `source_records`, nullable there because a source record need not
  carry a distribution at all — an onomastic work has none.
- **AC-2** Nothing the product says changes. The same text reaches the same places.
- **AC-3** A snapshot whose source record has no profile **throws**, naming the record. It is a
  broken database, not a value to render as an empty string.
- **AC-4** `migrateDown` restores the columns, restores `NOT NULL` on exactly the two that had it,
  and **refuses** rather than inventing values if any snapshot's source record has no profile.
- **AC-5** Measured saving on the real register.

## 4. Result

**6,974 MB → 5,917 MB.** 1,057 MB saved, in a 4.3-second `VACUUM FULL`. 5.8 GB against an 8 GB
plan is 72% with 2.1 GB spare — and the saving compounds each year another register is added.

A page rendered identically afterwards: the same scope line, the same limitations, the same
methodology. Verified against the full register before and after.

## 5. Why a view was considered and rejected

Renaming the table and exposing the old shape through a view would have left all eight reading files
untouched. It was rejected because `kysely-codegen` types every view column as nullable regardless of
the underlying constraint — the resolver's `resolvable_name_forms` already carries a comment about
exactly that — so the nullability churn would have arrived anyway, with a view in the way.

Retargeting was cheaper than it looked: three of the six reading queries **already joined**
`source_records`, so those were one-token changes.

## 6. In scope

- `packages/db/migrations/0019_snapshot_profile_to_source_record.ts`
- `packages/truth/src/{universe,derive,read}.ts` — six query sites, plus `requiredProfileText`
- `packages/sources/src/{importer,regional-importer}.ts` — write once, not per row
- Four integration tests that read or write the columns directly

## 7. Out of scope

- `structured_value` on `claims` (719 MB) and `evidence_items` (900 MB). Genuinely different for
  every row — that 1.6 GB is the irreducible core, and shrinking it is a contract change.
- `VACUUM FULL` in any automated path. It takes an exclusive lock; a database built by running these
  migrations from empty never holds the columns and needs no rewrite.

## 8. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:golden
pnpm test:integration
```
