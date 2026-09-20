# TASK-013 — Importer throughput: one resolution query, batched writes

- **Status:** IMPLEMENTED 2026-09-20 — see `PROGRESS.md` for what was run and measured.
- **Created:** 2026-09-20, at the project owner's direction, ahead of TASK-011 (whose two regional
  resources hold 646,052 and 694,553 rows and would otherwise take about an hour to import).
- **Milestone:** M2 (engineering throughput; no product capability).
- **Depends on:** TASK-004 (the importer), TASK-003 (the resolver), TASK-010 (`RESOLVE_FLAGGED`).
- **Changes no behaviour.** Same rows, same keys, same reconciliation report, same single
  transaction, same fail-closed rules. The acceptance criteria are written to prove that.

## 1. Why

Measured on the real male import (22m28s for 408,182 rows) and on a throwaway copy of the schema:

| Phase | Today | Why it is slow | Measured alternative |
|---|---|---|---|
| Resolve pass | ~3.5 min | 408,182 sequential `resolveSurname` calls, each its own `READ ONLY` transaction | one `WHERE canonical_key = ANY(…)` lookup: **76×** faster (20,000 keys: 4.93 s → 0.07 s) |
| Write pass | ~19 min | ~2.04 M single-row `INSERT`s (3 per new surname, 2 per row) | 1,000-row multi-row `INSERT`s: **5.6×** on a warm empty table (20,000 surnames: 8.34 s → 1.50 s), more on a large one where the per-row path degraded to ~360 rows/s |

Both phases are round-trip bound, not database bound.

## 2. In scope

1. **`resolveSurnamesBulk(db, inputs, options)`** in `@name-atlas/resolver`: validates each input
   with the same `validateSurnameInput`, then runs T0 and T1 for all valid keys inside **one**
   `READ ONLY` transaction, in chunks of at most 5,000 keys per statement, and classifies each key
   with the **same functions** `resolveSurname` uses. `matchCanonical`/`matchNameForm` are
   refactored into pure classifiers over fetched rows so that the single and bulk paths cannot
   drift: one fetch shape each, one classification. Returns one `SurnameLookupOutcome` per input,
   in input order; a database failure is one `LOOKUP_FAILED` for the whole batch, never `UNKNOWN`.
2. **Importer read pass** uses `resolveSurnamesBulk` with `RESOLVE_FLAGGED`.
3. **Importer write pass** buffers rows and inserts in chunks of 1,000: `knowledge_entities`,
   `surnames`, `name_forms` for created identities, then `distribution_snapshots` and
   `distribution_values` for every row. Still one transaction; the `canonical_key` UNIQUE
   constraint still closes the time-of-check/time-of-use gap (U-7); a constraint violation still
   rolls the whole resource back.
4. Tests, `PROGRESS.md` with the measured before/after, `docs/CODEMAP.md`.

## 3. Out of scope

- `COPY`, staging tables, index dropping, any Postgres tuning.
- Any change to what is stored, to the report's numbers, to U-5, or to the query path
  (`resolveSurname` keeps its signature and behaviour; the API never calls the bulk path).
- Parallelism. One transaction, in order.

## 4. Acceptance criteria

- **AC-1 Equivalence.** For every input in a seeded set covering `EXACT`, `KNOWN_VARIANT`,
  `MULTIPLE_EXACT` (T0-level and T1-level), `UNKNOWN`, `MIXED_SCRIPT_REVIEW` under both policies,
  `EMPTY`, control characters and the operational limit, `resolveSurnamesBulk` returns a resolution
  deep-equal to `resolveSurname` on the same input. Also for a batch containing duplicates and for
  an empty batch.
- **AC-2 Same rows.** Importing the committed fixtures produces reports equal to what the existing
  TASK-004/TASK-010 integration tests already assert; those tests pass unchanged.
- **AC-3 Same data at scale.** A fresh database imported with the new path from the official male
  bytes holds the same surname count, snapshot count, value count, key set and count-by-key as the
  populated dev database imported with the old path.
- **AC-4 Fail-closed unchanged.** A `MULTIPLE_EXACT` row still aborts with `UNRESOLVED_ROWS` and
  writes nothing; a checksum mismatch still refuses before any read; a mid-batch constraint
  violation leaves zero rows.
- **AC-5 Measured.** The full male import completes in under four minutes on the same machine
  where it took 22m28s (a ~5× floor; the measured multipliers suggest more).

## 5. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration
# fresh database, official male bytes, timed
DATABASE_URL=<fresh> pnpm db:migrate && time pnpm --filter @name-atlas/sources run import-pesel --resource 1148808 --file <csv> --metadata <json>
# AC-3: compare key sets and counts between <fresh> and the dev database
pnpm build
```

## 6. Do not

- Do not write a second tier logic in the importer. The classification lives in the resolver.
- Do not drop the UNIQUE constraint or the single transaction to go faster.
- Do not change a single stored byte.
