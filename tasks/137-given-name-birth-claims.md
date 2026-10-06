# TASK-137 — First names given to children: count, rank and trend as claims

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-given-name-birth-claims.md`). Not on staging or production.
- **Requested by:** the project owner, 2026-10-06: the second build step of D-044 (including §6–8).
- **Decision:** ADR-0043 (proposed with this task), extending ADR-0042 and following ADR-0032 §6's chain.
- **Number:** 137, ADR-0043, migration 0041: the next free on `main` (`6efc7c0`) with no pull request open, checked at the start and again before the pull request.
- **Model guidance:** implementation session.

## 1. Goal

For every first name on the stored lists of children born in each year (TASK-136), state as claims its count and its rank on each list, and whether it is rising, steady or falling on the latest list of each sex under D-044 §6. Nothing is shown.

## 2. Facts (2026-10-06)

1. TASK-136 stores 13 resources as 52 lists, one per year from 2000 to 2025 and sex, in `given_name_birth_lists` (with the cut-off, `publication_threshold`) and `given_name_birth_counts`. Nothing is derived from them.
2. Each list leaves out only the names given fewer times than its cut-off (5 up to 2012, 2 from 2013), so a rank among the listed names is exact (ADR-0043 §3).
3. TASK-122's `given-name.ts` is the pattern: `BASIC_GIVEN_NAME` runs, `SHARED` scope, evidence → claim → confidence → citation, the completeness gate, reuse of an ACTIVE claim. It gives flagged forms their claims; D-044's build asks that they get none.
4. The latest year in the data is 2025 for both sexes; 2020 is five years earlier. Both have cut-off 2.

## 3. In scope

- **ADR-0043.**
- **Migration 0041:** `claim_type` gains `GIVEN_NAME_BIRTH_COUNT`, `GIVEN_NAME_BIRTH_RANK` and `GIVEN_NAME_BIRTH_TREND`; a check holds them at `SHARED`.
- **`packages/truth/src/given-name-births.ts`:** `birthTrend` (pure, D-044 §6 with `BIRTH_TREND_WINDOW_YEARS` and `BIRTH_TREND_CHANGE_PERCENT`), `loadBirthRunContext`, `deriveBirthName`, `deriveAllBirthNames`.
- **`pnpm truth:derive-given-name-births`** (all names, or `-- --name NAME`): idempotent.
- **Fixtures:** the full official boys' and girls' files of 2020 and 2025, checksums equal to the registry's.
- **Tests:** unit tests of the rule, integration tests on the full files and the 2000–2019 excerpt.

## 4. Out of scope

Any page, contract or API field; the free/paid split; shares of births; voivodeships, half-years, second names, civil registry offices; checkout; the Register VM; anything on staging or production.

## 5. Acceptance criteria

- **AC-1:** every stored row of a name that is not flagged gets a count claim, `SHARED`, cited and assessed. A claim at another scope is refused by the database.
- **AC-2:** a rank is derived on a complete list and refused, with the gate's reason, on an excerpt.
- **AC-3:** the trend follows D-044 §6 with both parameters as named constants; the latest year is read from the data; an absence five years earlier on a complete list is rising, read against the list's stored cut-off and never as zero; an absence from an excerpt gives no trend; no earlier list gives no trend.
- **AC-4:** boys' and girls' lists, and lists of different years, are never summed or ranked together.
- **AC-5:** a flagged name gets no claim.
- **AC-6:** a second run derives nothing.
- **AC-7:** the full 2000–2025 import derives every claim; totals, time and ZOFIA, ANTONI, JULIA and JAKUB in 2025 are recorded.

## 6. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration`, `test:golden`. Once, on a disposable local database: the thirteen files with `pnpm import:given-name-births`, `pnpm truth:derive-given-name-births` twice.
