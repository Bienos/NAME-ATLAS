# TASK-145 — The baby-names page shows how many people hold the name in the PESEL register

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-baby-names-stock-count.md`).
- **Requested by:** the project owner, 2026-10-06, who asked why the page shows only about 900 names and agreed to show "how many people in Poland hold this name today", for every name.
- **Decision:** none new. D-044, D-045, ADR-0032 (the register's first-name lists), ADR-0041 (`readGivenNameFacts`), ADR-0042. No migration, no ADR, no D- number.
- **Number:** 145. 144 was the last on `main` (`f7c2460`); open #173 holds D-046.
- **Model guidance:** implementation session.

## 1. Goal

Signed in, under each sex's section, a name's page also shows how many people have it as their first name in the PESEL register's list of men or of women (2026-01-20), apart from the birth-year figures, and a rare name that is on no birth list but is in the register is no longer "not found".

## 2. Facts (2026-10-06)

1. The page read only the lists of names given to children born in a year. The publisher leaves out a name given fewer than 2 times in a year (fewer than 5 up to 2012): 939 girls' and 965 boys' names in 2025, 4,624 different names over 2000–2025.
2. The register's first-name lists of 2026-01-20 hold 71,433 names with a count of people per name and sex (ADR-0032, TASK-078, TASK-122). They are two lists, men and women (`comparability_group` `pesel_given_names_2026_first_male` / `_first_female`), of the **first** name only. ADR-0032 records the publisher's note that single occurrences and deceased people are left out; neither ADR says "living", so the copy does not.
3. `readGivenNameFacts` returns the active `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` claims per list with citation and rights; `UNAVAILABLE` when the name has no count claim.
4. A rare name is a `given_names` row, so `findBirthGivenName` finds it; before this change its birth facts said `NOT_ON_ANY_LIST` and the page said it was on no list.

## 3. In scope

1. **Reader:** the page's load also calls `readGivenNameFacts` (surface `FREE`) for the resolved name, and `readActiveBirthLists` for a name on no birth list. Adapter `stockListOfSex` beside `assembleBirthNameFacts`: the list of one sex by the group's suffix, the latest date if two stand, never a sum.
2. **Page, signed in, free:** a block under each sex after the birth-year figures: the count, "N of M" from the claim, date and source from the citation. A list with no claim: one plain line, never 0.
3. **A name with register claims and no birth claims:** the block, plus "In YYYY it was given fewer than T times" per sex (latest stored list's year and cut-off). A name in neither: "not found" as before.
4. **Copy,** Polish and English: one line saying the birth-year figures count children born in that year and the register figure counts everyone with the name as first name on the list's date, of any age, never added.
5. Rights as for the birth figures: a held form shows nothing; `RIGHTS_BLOCKED` shows the plain refusal in the block.

## 4. Out of scope

Second names, voivodeships, half-years, comparing names, a browsable list, a pair count of first name and surname (D-033), claims, migrations, the VM, the paid view, the locked card, the price and checkout, production configuration, the offer page.

## 5. Not decided

The register block is in the **free** signed-in view, an assumption from the owner's "every name". To move it into the 8,99 zł view, render `Register` in `baby-names-page.tsx` only when `full` is true (in `Facts` and `StockOnly`).

## 6. Acceptance criteria

- **AC-1:** signed in, a name on both datasets shows its birth-year figures as before and, separately, each register list's count (and rank where a claim stands) with source and date; no figure is a sum.
- **AC-2:** a name with register claims and no birth claims shows the block and the cut-off statement, never 0; a name in neither says not found.
- **AC-3:** signed out: no figure. The locked card and "8,99 zł · Wkrótce" are unchanged.
- **AC-4:** every new figure comes from claims with their citation; `given_name_counts` is not read.
- **AC-5:** no horizontal overflow at 390 px (checked in Chromium, or the record says it was not).

## 7. Verification

`pnpm format:check`, `check:ids`, `typecheck`, `lint`, `test`, `test:integration`, `test:golden`, `build`; Chromium at 390 and 1280 px.
