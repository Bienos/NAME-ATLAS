# TASK-173 — The offer page made to stand out, and shorter on a phone

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-offer-page-stand-out.md`).
- **Requested by:** the project owner, 2026-10-07, in a Claude Code session, about the live https://name-atlas.pl/pl/oferta: "wez to jakos wyrwoaj czy cos ladniej to zrob i lepiej pod mobile tez" ("make it stand out somehow, make it nicer, and better on mobile too").
- **Decision:** none. Presentation only: no price, product, entitlement, checkout or wording of what a product holds changes.
- **Numbers:** TASK-173. 171 is on `main` (`e0c42a8`) and in #204, 172 in #206.

## 1. Facts (`main` @ `e0c42a8`)

1. At 390 px the page is 10,049 px tall: every paid card carries an open waiting-list form, and the 800 zł card the whole enquiry form.
2. The hero is a long paragraph with no prices; the table scrolls sideways with nothing saying so, and its first column scrolls away.

## 2. In scope

- A lit hero (the dusk sky's wine and ember) with a shorter lede, three facts and a row of every price, each a link to its card.
- Each waiting list and the enquiry folded behind a button (`<details>`), opened on a tap; the form inside is unchanged.
- The free-window baby-names card and the 89,99 zł pack glowing; cards lift on hover where there is one.
- On a phone: the three packs as a sideways row with the next card showing, a hint under them and over the table, the table's first column fixed, smaller paddings.
- Numbered steps as amber circles; the questions with a +/− mark.

## 3. Out of scope

Prices, products, what each holds, the checkout forms, the table's cells, the URL and the landing page's offer strip (its lede follows the offer's).

## 4. Acceptance

- **AC-1:** every card is reached from a price in the hero, in both languages.
- **AC-2:** the five waiting lists and the enquiry are folded; their forms and fallbacks are unchanged.
- **AC-3:** at 390 px the page does not scroll sideways and is shorter than before.

## 5. Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `test`, `build`; the built page looked at in Chromium at 390 and 1280 px.
