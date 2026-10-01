# 2026-10-01 — The deck leads each card with the surname's main list

Scope authority: `tasks/055-cards-first-surname-view.md` (TASK-055, merged in #56). A follow-up to what the live check of #56 showed.

## What was wrong

The production deck after #56 used each section's first entry, and the contract lists the men's list first. For KOWALSKA, the second most common surname on the women's list (67,308 women, 3 men), that meant:

- the rarity card led with "1 na 7 065 846" (#247 412 among men's surnames);
- the change card led with the men's 2 → 3, +50%.

The same applied to every surname mostly borne by women, such as every -ska. KOWALSKI's neighbours card opened on the women's list (#6 103, 535 women): the lists are ordered by group name, so `…_female` comes first.

## What changed

- `apps/web/src/lib/deck.tsx`: `mainSide` names the list that holds more of the surname's people, from the population section. `deckCards` reorders each section's entries so that list comes first: population, rarity, neighbours, distribution and change. Every card, the neighbours' default tab and the summary then lead with it. Nothing is dropped, and the other list stays as the second line or tab.
- The page keeps the contract's order. A test asserts that.

## Verification (run 2026-10-01, on this branch)

- `deck.test.ts`: 18 tests pass, 4 of them new. They use a KOWALSKA-shaped response with production's figures: rarity leads with 1 in 320 and #2, the neighbours open on the women's list, change leads with −3.7%, and the page's order is unchanged.
- The full suite results are in the pull request.

## The live check of #56 (production, `main` @ `34bb1d1`, deployment `dpl_2DYWbooH6tjdYdM3BpTZMdHwkDGh`, created 14:45 UTC)

- `/api/v1/surname-results` answered schema 1.10 at 14:46 UTC.
- Its neighbours matched the competition ranks computed from the official CSVs in `data/`: KOWALSKI #2 men's / #6 103 women's, ZAREMBA #298 / #295, KOWALSKA #2 women's / #247 412 men's.
- Its `other_form` paired KOWALSKI ↔ KOWALSKA, and NOWAK and ZAREMBA had none.
- Response times seen from this container: 0.4–1.3 s.
- Headless Chromium, 1440 × 900 and 390 × 844 with touch:
  - `/?surname=Kowalski` redirected to `/pl/nazwisko/kowalski?view=cards`, and the deck showed 9 cards;
  - every card was reached by key and by tap;
  - "Cała strona" and Escape closed the deck and removed `view`;
  - a direct visit showed the page and the "Zobacz karty" button, and the rarity chapter showed both neighbour lists and the other form;
  - the canonical link was `/pl/nazwisko/kowalski`;
  - no console errors.
- Migration 0026 is not yet on the production database. The Register VM `archive` step applies it once the Polona load in progress has finished.
