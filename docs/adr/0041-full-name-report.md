# ADR-0041 — The full-name report: a first name and a surname in one frozen report

- **Status:** Proposed 2026-10-05. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-05
- **Deciders:** the project owner. Asked "what should the full-name report hold?", they chose "Name + surname": a first-name chapter, then the surname's chapters. Asked how far this step goes, they chose "Stored + preview".
- **Extends:** `docs/canonical/11` §26 (reports): one report type and one section type beyond §26.3's list. The canonical text is unchanged (`AGENTS.md` §2); this ADR is where the extension is recorded.
- **Relates to:** ADR-0032 (given names; §4 doubtful forms, §7 privacy), ADR-0037 (the 28,99 zł tier), D-033, D-043, TASK-119, TASK-120, TASK-122.
- **Implemented by:** TASK-124.

## Context

D-043 made the full-name report a paid part of the 28,99 zł tier, for every listed first name. Meanings may come only from a dictionary publisher's free permission or the public domain, and none exists yet. TASK-122 stores each first name's count and rank on each PESEL list as claims. TASK-119 freezes a surname's report as immutable versions, and TASK-120 previews one behind a flag. `docs/canonical/11` §26.3 names nine section types, all about a surname. No source pairs first names with surnames (D-033), and ADR-0032 §7 forbids combining a first-name count with a surname count into "N people called X Y".

## Decision

1. **One report for the pair.** A report of type `FULL_NAME` has a surname and a first name. `reports.given_name_id` is set for `FULL_NAME` and null for the surname report (`NAME_ATLAS`), and a check ties the two. There is one report per subject and entitlement: a surname, or a first name with a surname. Its versions are immutable, as TASK-119's are.
2. **A first-name chapter first.** The section type `GIVEN_NAME` comes before the surname's nine. It holds the name's count on each list and its rank there, each from its own claim, with its confidence and citation. The two lists are never summed. A list without a rank claim shows no rank, never zero. The first name's citations lead the bibliography.
3. **The surname's part is the surname report's.** It is read exactly as `buildReport` reads it: the PAID response, coverage, DiscoveryIndex and the surname's eligibility. The payload is `full_name_report@0`, which is `report@0` plus the first-name facts.
4. **What it does not say.** There is no meaning until an admissible source exists (D-043), and no count or estimate of people with both names (D-033, ADR-0032 §7). The "what we don't know" chapter states both.
5. **Who may be named.** A placeholder is not a first name. A form held for review (ADR-0032 §4) gets no report. A first name with no claims yet gets a chapter that says so.
6. **Privacy.** The preview's address holds only the version id. The build command takes the two names as arguments and prints neither. The pair is two name entities, never a person.
7. **Eligibility.** `eligibility@0` judges a surname report. A full-name report freezes the surname's eligibility and shows it only as "why the surname part alone would not be offered". It is not a verdict on the full-name report, whose tier D-043 set.
8. **The name given to children (amended 2026-10-07, TASK-159).** D-044, as ADR-0037 records it, puts the baby-names figures in every tier from 28,99 zł. So `full_name_report@2` freezes them in the first-name chapter:
   - **What is frozen:** the name's `GIVEN_NAME_BIRTH_*` claims as `readBirthNameFacts` reads them on the PAID surface. That is each sex's years from 2000, with count and rank, and the trend on the latest list.
   - **How a year reads:** a year the name is not on a list reads as below that list's cut-off, never 0. Boys and girls are never added together.
   - **Claims:** the claims shown support the chapter.
   - **Bibliography:** it lists each list file once, however many figures cite it.
   - **Older versions:** a version frozen under `@0` or `@1` has no such part.
   - **Out of scope:** voivodeships, half-years and comparing names are not in the report.

## Why not the alternatives

- **A first-name report alone.** The owner chose the full name. A first-name-only report would also leave the surname, the half of the name with most material, to a second purchase.
- **Combining two stored reports at render time.** The page would need both ids and would show two frozen states that need not agree. One version freezes one state.
- **Placing the first name under an existing section type.** DISTRIBUTION and ORIGIN are the surname's. Mixing them would make a claim's section ambiguous.

## Consequences

- Migration 0039 adds `reports.given_name_id`, the type `FULL_NAME`, the check, the uniqueness per subject (`NULLS NOT DISTINCT`) and the section type `GIVEN_NAME`. Its down migration refuses while a full-name report is stored.
- `pnpm report:build -- --surname NAME --given-name NAME` builds one. The preview at `/pl/raport/{id}` and `/en/report/{id}` shows it, still dark unless `REPORT_PREVIEW_ENABLED=1`.
- Nothing is sold. The offer page still names the report only once it can be bought (ADR-0037 §2).
- A meaning section for first names, and any change to the surname eligibility policy for full-name reports, need their own decisions.
- With §8 (TASK-159), a report holds its first name's figures as given to children, frozen with the rest. A version built before the birth claims existed, or before `@2`, does not.
