# ADR-0018 — the landing atlas may name surnames that a list-scope rule selects, and may compare the two lists' sets of surnames

- **Status:** Proposed. It is accepted when the project owner merges TASK-043's pull request.
- **Date:** 2026-09-30
- **Deciders:** the project owner chose the six-plate atlas mock-up for the landing page ("go wtih 2 push live", 2026-09-30). Its plates name surnames and count the surnames on both lists. This ADR is what TASK-043 proposes to allow that.
- **Relates to:** ADR-0015 (list-scope statistics as a committed artefact), TASK-040 §4.2 and §6 U-1/U-2
- **Amends:**
  - ADR-0015 §2.7 ("a named surname's count, rank or map stays in the claim chain"), for the named selections of §2.1 only;
  - `docs/contracts/list-facts.md` "Never a named surname" and "Never both lists", as §2.1 and §2.3 state.
- **Code:** `packages/contracts/src/list-facts.ts` (`list_facts@2`), `packages/truth/src/list-facts/`, `docs/contracts/list-facts.md`

## 1. Context

- **ADR-0015 kept names off the landing.** A named surname's count is a surname claim, and TASK-040 §4.2 said a named example "waits for the claim chain or a surname projection".
- **A selected name is still a list-scope figure.** "The list's most common hyphenated surname" is chosen by a rule over the whole list. Its count comes from the same SHA-pinned bytes, with the lineage, completeness, confidence and rights assessment the artefact already carries for each list.
- **The chosen design needs names and one cross-list count.**
  - Plate I names the list's most common surnames.
  - Plate VI names the most common hyphenated surname, and counts the surnames on the male list only, on both lists, and on the female list only.

## 2. Decision

1. **A plate may name a surname only when a list-scope rule selects it.** The rules are fixed and run in the generator, never in the page:
   - `TOP_3`: the list's three most common surnames;
   - `HYPHENATED_TOP`: the list's most common surname containing a hyphen;
   - `ON_BOTH_TOP`: the male list's most common surname that is also on the female list;
   - `ONE_LIST_TOP`: each list's most common surname that is absent from the other list.

   Ties are broken by code-point order of the key, so a selection is deterministic. The artefact stores the selected key, its source string as published, and its count on its list.
2. **A floor of 20 people** (resolves TASK-040 U-1 for this use). A selection whose count is below 20 is not named: the generator stores no name for it and the page names none.
3. **The two lists' sets of surnames may be compared.** The artefact stores how many surnames are on the male list only, on both lists and on the female list only.
   - Surnames are compared by `canonical_key_v2`, so `Łuczak` and `Luczak` stay two surnames.
   - These are counts of surnames, not people. No field adds the people of the two lists.
4. **Words, not origins** (TASK-040 U-2). A named surname is never framed with origin, region or nationality, and a surname ending is described as a spelling.
5. **A named surname is text, not a link.** Production's search answers only the surnames its database holds (seven, in 2026-09). A link to the search waits until the database holds the full register.

## 3. Why not the alternatives

- **Unnamed examples only.** The design's point on plates I and VI is the names themselves. "The list's most common surname" says less than "Nowak".
- **Waiting for the claim chain to hold every surname.** It is being moved to a new database (#35) with no date yet, and the landing would stay without the design the owner chose.
- **A cross-list count of people.** That would add the two lists, which the invariants forbid.

## 4. Consequences

- `list_facts@2` carries a handful of surname strings. Each one is selected by a rule stated here, at or above the floor.
- When the claim chain holds these surnames, the same counts will also exist as surname claims. Both come from the same SHA-pinned bytes, and a new resource version regenerates the artefact.
