# 2026-10-07 — TASK-173: the offer page made to stand out, and shorter on a phone

## What changed

- `apps/web/src/lib/offer-page.tsx`: the hero carries a row of every price (`LADDER`), each a link to its card's heading; each waiting list and the 800 zł enquiry is a `<details>` whose summary is the button; the free-window baby-names card gets `is-free` and the 89,99 zł pack `is-featured`; the packs' row is `offer-carousel`, with a hint under it and over the table for a phone.
- `apps/web/src/lib/offer-text.ts`: a shorter lede and three facts ("Ceny brutto, z VAT", "Zakup nie wygasa", "Konto za darmo"; a purchase never expires, as `hasPurchaseOf` records), and the words for the price row and the two hints, in both languages.
- `apps/web/src/app/globals.css`: the hero lit with the dusk sky's wine and ember; glowing free and featured cards; a hover lift (not under reduced motion); the folded forms' buttons with +/−; the table's first column `position: sticky`; amber step numbers and +/− on the questions; below 760 px the price row and the packs scroll sideways with snapping, and paddings shrink.
- `offer-page.test.ts`: a test that every card is reached from the price row and that six forms are folded.

No price, product, entitlement, checkout form or table cell changed.

## Verification (run in this session)

GitHub Actions still starts no job in this repository (account billing), so the checks were run locally on `main` @ `e0c42a8` plus this change:

- `pnpm format:check`, `check:ids`, `lint`, `typecheck` — exit 0
- `pnpm test` — exit 0; `apps/web` 112 files, 1318 tests
- `pnpm --filter ./apps/web build` — exit 0

The built site was served with `next start` (no accounts, so as a signed-out reader with no free window) and `/pl/oferta` was looked at in Chromium:

- 390 px wide: the page is 7,160 px tall (the live page before this change measured 10,049 px at the same width), and does not scroll sideways; the price row and the packs scroll sideways inside themselves; the table's first column stays put while the rest scrolls.
- 1280 px wide: 4,841 px tall; the hero, the glowing 89,99 zł pack and the folded forms render as intended.

## Not verified

- Integration, golden and end-to-end tests were not run for this change (it touches only the offer page's markup, words and CSS).
- The signed-in, tester and free-window states were checked through the rendered markup in tests, not in a browser.
- Safari and Firefox were not tried.
