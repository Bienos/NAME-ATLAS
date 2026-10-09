# TASK-178 — The Atlas page, the simplified landing and the first-name list facts

- **Status:** IMPLEMENTED 2026-10-09 (`docs/progress/2026-10-09-atlas-page-and-landing.md`).
- **Requested by:** the project owner, 2026-10-09: leave on the landing "only the most important information" (what Name Atlas is, why it exists, how to use it, what to expect) and move every general statistic to a separate page called Atlas, "redesign them and improve them to showcase it very nicely, in one theme format", and add "general statistics about general names, not about specific names". The owner approved the two mockups the same day ("run it"): the landing, https://claude.ai/artifact/9u5kKM9GPiNy6ywE7WUfQL, and the Atlas, https://claude.ai/artifact/DjmjUDTNMKybacZ5M43qUW.
- **Decision:** ADR-0051 (list facts about the first-name birth lists, extending ADR-0015 and ADR-0042). ADR-0046 for the Atlas page's data colours (Atlas Blue for the current list, amber for earlier editions and years). No migration, no D- number.
- **Numbers:** TASK-178 (177 is the highest on `main` @ `e36b8df`; no open pull request). ADR-0051 (0050 is the highest).
- **Model guidance:** implementation session.

## In scope

1. **The Atlas page**, `/pl/atlas` and `/en/atlas` (`atlas-page.tsx`), in the site shell with "Atlas" current in the header. A hero with four ledgers (the two surname lists as of the artefact's date, the two first-name lists of the last year), never summed; a sticky chapter nav; then two parts, each with its own sticky list switch.
2. **Part I, surnames: eleven plates**, numbered `01`–`11` in one anatomy (number and name, a title that states the figure, a lede, the figure, a caption, the source line with the method and the confidence word). The seven plates of TASK-040/043/044 move from the landing unchanged in what they state (`02` Gwiazdozbiór, `03` Połowa, `04` Rzadkość, `06` Końcówki, `07` Alfabet, `08` Dwie listy, `11` Zmiany w czasie). Four are added, from figures the artefact already carries or the claim chain already serves:
   - `01` Najczęstsze: the ten most common surnames of each list from `CURRENT_RANK` claims (`mostCommonSurnames`, moved from the landing), with counts for the three `named_top` names only;
   - `05` Progi: `summary.thresholds`;
   - `09` Zbieg nazwisk: `collision` (`n_half`, `p_at_n_half`, `pair_one_in`, the curve) beside `birthday_reference`;
   - `10` Tysiąc osób: `crowd` (`expected_distinct`, `share_without_namesake`, `reach_half`, the seeded example).
3. **Part II, first names given to children, 2000–2025: six plates** (`12`–`17`) from the new artefact (`givenNameListFacts()`, ADR-0051): how many names a year's list holds, the number-one name of each year, the share of the ten most common and the names that cover half the children, the ten most common of the first and the last year, the names on one of the two lists only, the first letter and the `-a` ending. Boys and girls are two lists with a switch; the 2013 change of the publisher's threshold is drawn and said, never hidden.
4. **The artefact** `given_name_list_facts@1`: contract `packages/contracts/src/given-name-list-facts.ts`, pure functions and tests in `packages/truth/src/given-name-list-facts/`, the generator `packages/truth/bin/build-given-name-list-facts.ts` (`pnpm truth:given-name-list-facts`) over the thirteen registry resources in `data/`, refusing any file whose size, SHA-256, row count or people sum differs from `births-registry.ts`; the committed module `packages/truth/src/generated/given-name-list-facts.ts`; a CI test that the committed module parses, is pinned to the registry and is internally consistent.
5. **The landing** keeps its hero word for word and gets four sections below it: what it is and why (`PRODUCT.md` §1, §7), how to use it (three steps and the surnames to try), what to expect (the six questions of TASK-065 and one real card of the example surname), and one tile per other tool (the Atlas, featured, with one figure per surname list; compare; family surnames; baby names; the tree) with the offer in one line. The plates, the most common surnames, the offer strip, the how-it-works list, the comparison form and the tree section leave the landing.
6. **Links:** `atlasPath` is the page; the header, the footer and the landing's Atlas tile open it. `PRODUCT.md` §5's line about the landing's statistics now names the Atlas page.

## Out of scope

Regional, half-year, second-name and civil-registry first-name files (ADR-0042, Consequences); a sitemap entry (no static page is in the sitemap today); a share card or Open Graph image for the Atlas; any change to the baby-names page or the surname page; new claims in the database; per-voivodeship surname plates (STATUS "further plates", still open).

## Acceptance

- **AC-1:** `/pl/atlas` and `/en/atlas` render every Part I plate for both lists from `listFacts()` and every Part II plate for both sexes from `givenNameListFacts()`; no figure on either page is a sum across two lists; each plate's source line names the resource, the date and the method.
- **AC-2:** every figure in Part I is a stored artefact or claim value formatted by `messages.ts`; the four new plates print only values the artefact carries (`list-atlas.test.ts`'s printed-figures rule extends to `collision` and `crowd`).
- **AC-3:** the committed first-name artefact parses against its schema; each of its thirteen resources' SHA-256, byte size, row count and people sum equal `births-registry.ts`; every year 2000–2025 is present once per sex; no stored share exceeds 1; every named first name has at least `NAMED_GIVEN_NAME_FLOOR` children on its list.
- **AC-4:** the landing renders the hero, the four sections and the footer, and no `.lf-plate`, `.common`, `.offer-strip`, `.compare-form` or `.landing-tree` block; the example card is `deckCards`'s own face of the example surname.
- **AC-5:** the header's and the footer's "Atlas" link to `/pl/atlas` (`/en/atlas`).
- **AC-6:** no horizontal overflow at 390 px on either page.

## Verification

`pnpm format:check`, `pnpm check:ids`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (contracts, truth, web); `pnpm truth:given-name-list-facts` run twice over the same files gives a byte-identical module; Chromium at 390 and 1150 px on `/`, `/pl/atlas` and `/en/atlas`.
