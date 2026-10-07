# TASK-171 — The baby-names search in Brand System v1 (design A, "Punkt na mapie")

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-baby-names-search-redesign.md`).
- **Requested by:** the project owner, 2026-10-07: a design for the "Imiona dla dziecka" search page; of the canvas "Imiona dla dziecka — wyszukiwarka" the owner chose row A, "Punkt na mapie — wyszukiwarka obok mapy warstwic (rekomendacja)".
- **Decision:** ADR-0046 (Brand System v1), D-044. No new ADR, no migration, no D- number.
- **Numbers:** TASK-171 (170 is the highest on `main` @ `493438e`; 165 is held by open #196). `pnpm check:ids` exit 0.
- **Model guidance:** implementation session.

## In scope

The top of `/pl/imiona-dla-dziecka` and `/en/baby-names` (`BabyNamesView`), in the page's `.atlas-v1` scope:

1. Before a search, signed in: a mono kicker with the Atlas Point, the title at display size, the lede, the search as an ivory pill with the Atlas Blue button, four example names (links that search), beside a panel of contour art (`ContourField`, `AtlasPoint`, "PESEL · zbiór 219") listing what the result shows; then "Cała lista imion" as two cards opening the list on girls or on boys (`?sex=girls|boys`), the existing list and couple links, and the source line.
2. Signed out: the same hero with the existing explanation and sign-in link on a card, the panel headed "Co zobaczysz po zalogowaniu"; no form, no list cards.
3. After a search: the title and the pill folded into one bar above the answer; an invalid, absent or held name on a card; the example names under an invalid or absent name.

## Out of scope

The answer below the bar (TASK-151, 157, 160, 170: unchanged), the site header and footer, the list page, the comparison, copy that states a figure, new routes.

## Acceptance

- **AC-1:** every state renders what is listed above in Polish and English; the signed-out page has no form and no figure.
- **AC-2:** the facts, gates and source line are those of before; the example names are links, not claims.
- **AC-3:** no horizontal overflow at 390 px.

## Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `test`, `BABY_NAMES_ENABLED=1 pnpm --filter ./apps/web build`; Chromium at 390 and 1280 px.
