# TASK-085 — No years for a bearer whose death Wikidata dates before the birth

- **Status:** IMPLEMENTED 2026-10-03 on `claude/blissful-johnson-450rie` (`docs/progress/2026-10-03-bearer-years.md`).
- **Requested by:** the project owner, 2026-10-03: "do the years fix", after the report that ZAREMBA's third free bearer, Tomasz II Zaremba, reads "1300–1292".
- **Decision:** ADR-0030 §2.4, amended by one sentence.
- **Depends on:** TASK-073 (the bearers, on `main`).
- **Model guidance:** implementation session.

## 1. Goal

A well-known bearer is never shown with a death before the birth. Where Wikidata's answer states one, neither year is shown; the person still counts, and still counts as having a date of death.

## 2. Facts (checked on `main` @ `53ae446`, 2026-10-03)

1. The people query takes `MIN(YEAR(?b))` and `MIN(YEAR(?d))`: the earliest of several stated values for each.
2. ZAREMBA's captured answer (`fixtures/wikidata-bearers/`) gives Q331544, Tomasz II Zaremba, born 1300 and died 1292. He is third on the free page.
3. Task number 085 is free on `main` and on every remote branch (084 is `share-studio`).

## 3. In scope

- `statedYears` in `packages/sources/src/wikidata/bearers.ts`, applied where the summary reads each person; `with_death_date` counts a stated death either way.
- Unit tests over the pinned ZAREMBA answer.
- One sentence each in ADR-0030 §2.4, the contract's `born`/`died` comment and `docs/contracts/surname-result.md` invariant 29.

## 4. Out of scope

- Choosing between several stated years, or querying them differently.
- Re-deriving claims already loaded: none are in production yet; a later load writes the corrected summary and supersedes any claim that differs.

## 5. Acceptance criteria

- **AC-1.** `statedYears` keeps both years unless the death is before the birth, then gives neither (unit tests).
- **AC-2.** ZAREMBA's summary shows Tomasz II Zaremba with no years, still counts 37 with a date of death, and shows no bearer whose death precedes the birth (unit tests).
- **AC-3.** `pnpm typecheck`, `lint`, `format:check`, `check:ids` and `test` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test
TEST_DATABASE_URL=postgres://… pnpm --filter @name-atlas/integration-tests exec vitest run src/notable-bearers.test.ts
```
