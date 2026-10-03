# 2026-10-03 — TASK-085: no years for a bearer whose death Wikidata dates before the birth

Scope authority: `tasks/085-bearer-years.md`. Decision: ADR-0030 §2.4, one sentence added.

## What changed

- `packages/sources/src/wikidata/bearers.ts`: `statedYears(born, died)` keeps both years unless the death is before the birth, then gives neither. The summary applies it to each person; a candidate carries `death_recorded`, so `with_death_date` still counts a stated death, and the stored bearer does not carry the flag. Exported from the package.
- `packages/sources/src/wikidata/bearers.test.ts`: `statedYears` cases, and ZAREMBA's pinned answer: Tomasz II Zaremba (Q331544, stated born 1300, died 1292) has no years, `with_death_date` is still 37, and no kept bearer's death precedes the birth.
- One sentence each in ADR-0030 §2.4, the contract's `born`/`died` comment (`packages/contracts/src/surname-result.ts`) and `docs/contracts/surname-result.md` invariant 29. The contract's shape is unchanged.

## Verification (run 2026-10-03, on `main` @ `53ae446`)

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: each exit 0.
- `pnpm test`: exit 0; `packages/sources` 587 (2 new), `packages/contracts` 138, `packages/truth` 375, `apps/web` 673.
- `TEST_DATABASE_URL=… vitest run src/notable-bearers.test.ts` against local PostgreSQL 16 with PostGIS 3: 7 passed.

## Not verified

- Nothing is loaded in production yet; the next `bearers` run writes the corrected summaries.
