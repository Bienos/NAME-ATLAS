# ADR-0043 — First names given to children: count, rank and trend as claims

- **Status:** Proposed 2026-10-06. The first build (TASK-137) is internal: no page, no contract and no API field reads these claims.
- **Deciders:** the project owner decided the section (D-044) and its trend rule (D-044 §6) on 2026-10-06, and asked for this as the second build step. This ADR records how the claims are derived. The product rules (who sees what, the 5,99 zł tier) are D-044's and ADR-0037's and are not changed here.
- **Supersedes:** nothing. It extends ADR-0042 (the stored lists) and follows ADR-0032 §6's chain.

## Context

1. ADR-0042 stores dataset 219's national first-name lists, one per year of birth (2000–2025) and sex, in `given_name_birth_lists` (with the publisher's cut-off, `publication_threshold`: 5 up to 2012, 2 from 2013) and `given_name_birth_counts`. Nothing derives from them yet.
2. TASK-122 (migration 0038) derives `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` from the living-register lists (ADR-0032) through evidence → claim → confidence → citation, with a `BASIC_GIVEN_NAME` run, `SHARED` scope, and a rank refused by the completeness gate (`completeness.ts`) unless the stored names are the complete official file.
3. D-044 §6: the latest full year's count against the count five years earlier, on the same list; more than 10% higher is rising, more than 10% lower is falling, anything else is steady. Absent five years earlier but on the latest list is rising; absent from the latest list has no direction. Other edge cases are left to this task, which may not treat an absent count as zero.

## Decision

1. **Three claim types, `SHARED` scope** (migration 0041, check `claims_given_name_birth_scope`), each about one given name:
   - `GIVEN_NAME_BIRTH_COUNT`: the publisher's count on one list. Key `GIVEN_NAME_BIRTH_COUNT|{given_name_id}|{list_id}`.
   - `GIVEN_NAME_BIRTH_RANK`: the competition rank on that list, with the list's size as `universe_size`. Key `GIVEN_NAME_BIRTH_RANK|{given_name_id}|{list_id}`.
   - `GIVEN_NAME_BIRTH_TREND`: `RISING`, `STEADY` or `FALLING`, on the latest list of one sex against the list of the same sex five years earlier. Key `GIVEN_NAME_BIRTH_TREND|{given_name_id}|{latest_list_id}|{earlier_list_id}`.
   Runs reuse `BASIC_GIVEN_NAME`. Counts take the source-native confidence rule; ranks and trends take the derived-statistic rule (`docs/canonical/14` §29–30). A claim is cited to every source record it rests on: one for a count or a rank, two for a trend whose lists are in different resources.
2. **Lists apart.** A count and a rank are about one list; a trend is about two lists of one sex. The boys' and the girls' lists, and lists of different years, are never summed or ranked together.
3. **The rank is exact for every listed name.** A list leaves out only the names given fewer times than its cut-off. Every one of those has a count below the cut-off, and every listed name has a count at or above it, so no unlisted name has a greater count than a listed one. "One plus the number of listed names with a greater count" is therefore also "one plus the number of all names with a greater count". Ties share the lowest rank (`COMPETITION`, as every rank here).
   - The rank is still refused unless the list is complete: the source record's checksum must be the registry's `official_sha256` and the names stored on the list must equal the list's `row_count`, read from the file at import (TASK-009's gate, with the list's own row count). An excerpt is not the list. A list with a publisher placeholder would fail the row count and be refused; no 2000–2025 national list has one (ADR-0042, Context 3).
4. **The trend rule, with its parameters as named constants** (`packages/truth/src/given-name-births.ts`):
   - `BIRTH_TREND_WINDOW_YEARS = 5`, `BIRTH_TREND_CHANGE_PERCENT = 10`. A change of either is a new method version (`given_name_birth_trend@1` today).
   - **The latest year** is the latest year of birth with an active list of that sex. It is read from the data, never written in code (2025 for both sexes on 2026-10-06). The earlier year is the latest minus 5 (2020). Half-year lists are not imported, so every stored list is a full year.
   - **Both listed:** with L the latest count and E the earlier, `100·L > 110·E` is `RISING`, `100·L < 90·E` is `FALLING`, else `STEADY`. Integers only; exactly 10% either way is steady.
   - **Absent five years earlier, on the latest list:** the earlier count is an unknown whole number below the earlier list's stored `publication_threshold` (T), never 0. `RISING` is written only if it holds for the largest such number: `100·L > 110·(T − 1)`. With T = 2 (every year from 2013) and L at least 2 this always holds, which is D-044 §6's rule. With T = 5 (a year up to 2012, only if the window ever reaches back that far) it fails for L = 4, and no trend is written (`BELOW_CUTOFF_TOO_CLOSE`).
   - **An absence counts only on a complete list.** If the name is absent from an earlier list that fails the completeness gate (an excerpt), no trend is written: absence from an excerpt says nothing about the list.
   - **No earlier list stored:** no trend (`NO_EARLIER_LIST`).
   - **Absent from the latest list:** no trend claim, and no count or rank for that year, since no row exists.
5. **A flagged form gets no claim.** A given name with `form_review` set (ADR-0032 §4, ADR-0042 §5) is skipped and counted as flagged. This differs from TASK-122, which writes claims for flagged forms and leaves them to the surface. No 2000–2025 national list holds such a form.
6. **Idempotent.** An ACTIVE claim with the same key is reused; a name's run is written only when a claim is. A second run over the same lists writes nothing.
7. **A new year is new claims.** The keys name the lists, so a new year's lists (or a superseding version of a resource, whose lists are new rows) give new count, rank and trend claims. The claims on the older lists stay ACTIVE: each is still true of its own lists. Choosing the latest trend to show is the page's read, a later task.

## Consequences

- `pnpm truth:derive-given-name-births` (`-- --name ZOFIA` for one name) derives every claim. On the full 2000–2025 import (TASK-137's record): 35,598 counts, 35,598 ranks, 1,904 trends, no refusal.
- No page, contract or API field reads the claims yet; the free/paid split of D-044 §2 is the page task's.
- Shares of births, voivodeships, half-years, second names and civil registry offices are not derived. Each needs its own lists first (ADR-0042, Consequences).
- Nothing is applied or derived on staging or production by this ADR.
