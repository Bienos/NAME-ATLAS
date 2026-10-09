# ADR-0051 — Statistics about the first-name birth lists as a committed artefact

- **Status:** Proposed 2026-10-09. Accepted when TASK-178's pull request is merged.
- **Date:** 2026-10-09
- **Deciders:** the project owner asked on 2026-10-09 for an Atlas page with "general statistics about general names, not about specific names" and approved the mockup that shows six plates about the first-name lists ("run it"). This ADR records the data path.
- **Relates to:** ADR-0015 (list-scope statistics as a committed artefact), ADR-0018 (named selections), ADR-0042 (the stored birth lists), ADR-0043 (count, rank and trend claims), D-044.
- **Amends:** ADR-0015 §2.1 and §2.7, for the first-name birth lists only (§2 below).
- **Code:** `packages/contracts/src/given-name-list-facts.ts`, `packages/truth/src/given-name-list-facts/`, `packages/truth/bin/build-given-name-list-facts.ts`, `packages/truth/src/generated/given-name-list-facts.ts`, `docs/contracts/given-name-list-facts.md`.

## 1. Context

1. ADR-0042 stores dataset 219's national first-name lists, one per year of birth (2000–2025) and sex, and ADR-0043 derives one name's count, rank and trend from them. Nothing says anything about a list as a whole: how many names it holds, which name led it, how concentrated it is.
2. ADR-0015 made such figures about the surname lists a list fact: derived offline from the registry's pinned bytes, validated, committed, rendered and never recomputed. Its §2.1 scopes a list fact to the two national surname files, and §2.7 keeps "any trend across snapshots" out.
3. The birth lists are not snapshots of one list. Each year's list is a different published list, of a different universe (the children born that year), as ADR-0042 §4 says: lists of different years are never summed. Setting them side by side is a comparison of lists, each figure about one of them, as the baby-names dashboard already sets one name's yearly counts side by side.
4. The publisher's threshold changed in 2013 (5 to 2, ADR-0042 Context 2), so the number of names on a list is longer from 2013 for that reason too. A page that shows the lists over the years must say so.

## 2. Decision

1. **A first-name list fact is a derived statistic whose subject is one published birth list:** one year of birth and one sex, inside one registry resource. ADR-0015 §2.1 is extended to these lists; everything else in ADR-0015 holds unchanged: derived offline in `packages/truth` from bytes whose SHA-256, byte size, row count and people sum equal the registry's (`births-registry.ts`), gated by the completeness, confidence and FREE-surface rules, committed as a generated module validated by its contract, rendered by the web app which derives nothing.
2. **Every year on its own.** The artefact holds, per sex, one block per year with that list's figures: its names, its children, its threshold, its most common name and that name's share, the share of its ten most common, how many of its most common names cover half its children, its most common first letter and its share of names ending in `-a`. No figure adds two lists, two years or two sexes; a share is a share of the children on that published list, as ADR-0043 §4 defines it, never of all births.
3. **Comparisons are of sets and sequences, never sums.** Three blocks compare lists: `change` counts the names on the last year's list and not the first's, on the first and not the last, and on both, by exact spelling; `number_one` is the sequence of each year's most common name, as runs of consecutive years; `always_top10` is the names in every year's ten most common. These are facts about the lists' name sets, not trends in a name, and ADR-0015 §2.7's bar on trends across snapshots is not lifted for anything else.
4. **A first name appears as a string only by a list-scope rule** (ADR-0018's principle): a year's most common name (`TOP_1`), the ten most common names of the first and the last year (`TOP_10`), and the names in every year's ten. Each is chosen over the whole list, ties broken by code-point order, and stored only when its count is at least `NAMED_GIVEN_NAME_FLOOR` = 100 on its list. The letter and ending figures carry no name. No other name crosses this boundary; a name's own figures stay in ADR-0043's claims.
5. **The threshold travels with every year.** Each year's block records the publisher's threshold; the page draws the 2013 change and says it, so a longer list from 2013 is never read as more names given.
6. **One rights decision.** The lists are CC0 under `BIRTH_NAMES_RIGHTS_PROFILE` (ADR-0042 §6); the generator refuses unless `evaluateSurface(…, "FREE")` allows, as ADR-0015 §2.2 does for the surname lists.

## 3. Why not the alternatives

- **Claims in the database.** A claim's subject is a knowledge entity; a list has none (ADR-0015 §1). The lists are small enough to compute from in a page, but presentation may not derive facts (`AGENTS.md` §10).
- **Computing at request time in `packages/truth` from the stored lists.** Possible, but then production would compute statistics on every visit from tables that must be complete, and the result would carry no pinned lineage. The surname lists already have the artefact pattern; one pattern for both is simpler.
- **Only the latest year.** The owner asked for statistics about names in general; what changed between 2000 and 2025 is the most telling part, and each figure stays about one list.

## 4. Consequences

- `pnpm truth:given-name-list-facts` regenerates the module from `data/birth-names-{resource}.csv`; CI cannot (it has no files) and checks the committed module instead (`artefact.test.ts`).
- A new year's resource means a new artefact: `births-registry.ts` gains the resource, the generator reads it, the page shows the new last year.
- `docs/contracts/list-facts.md`'s "Not regional" and "never both lists summed" rules apply here as written; the contract doc `docs/contracts/given-name-list-facts.md` states the shape and what the schema refuses.
- Removing the artefact removes Part II of the Atlas page and nothing else.
