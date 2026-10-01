# 2026-10-01 — TASK-056: a share card for each answer in the deck

Scope authority: `tasks/056-share-cards.md`. Built on `main` @ `9a7b421`.

## What changed

- **What a card may say** (`apps/web/src/lib/share-facts.ts`, pure). There are eight cards: rarity, neighbours, where, change, the other form, meaning, old print and the summary. Each carries:
  - one figure;
  - an explanation of what it means and what it does not;
  - its source and date.

  All are read from the validated response in the deck's order: the surname's main list first, through `deck-order.ts`, now shared with `deck.tsx`. A section that is not ready has no card. The map card carries the coverage warning before its figure when coverage is not `READY`.
- **How a card looks** (`share-card.tsx`). It draws 1080 × 1920 with `next/og`, in the brand fonts through `og-card.tsx`'s loader, now exported. The look is the dusk; the old print is on paper. Colours come from the design tokens: eleven new ones (`dusk-tile`, `dusk-tile-line`, `dusk-track`, `dusk-amber-wash`, `paper` …), declared in `design-tokens.ts` and in the stylesheet's `:root`.
- **Routes:** `/pl/nazwisko/{slug}/karta/{card}` and `/en/surname/{slug}/card/{card}`, through `share-route.ts`. They answer:
  - a PNG, cached at the edge for an hour;
  - 404 for an unknown card, an unknown surname or a section that is not ready;
  - 308 for a retired address;
  - 503 when the database cannot answer.

  `next.config.ts` traces the fonts for both routes.
- **The deck.** "Udostępnij kartę" / "Share this card" fetches the image of the card in view: its own, or the summary for the surname and the catalogue cards. It shares the file where the browser can share files, and downloads it elsewhere, as `{surname folded to ASCII}-{card}.png`. Chromium drops a download name containing "ą" and saves "download" instead (checked). On a phone the progress bars take their own row above the buttons.

## Verification (run 2026-10-01, on this branch)

- `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `build`: exit 0. The build lists both routes.
- `pnpm test`: exit 0, 1,651 tests. `deck.test.ts` now holds 31 tests. The share-card tests check:
  - every card is drawn for a fully ready response, in both languages;
  - every figure on every card appears in the page's rendered text, in both languages;
  - only the summary is drawn when only the count is ready;
  - every card has an explanation and a source with a year;
  - the map card carries the coverage warning;
  - the other form is a form, never a relative;
  - cards lead with the main list (KOWALSKA: 1 in 320, −3.7%);
  - the deck maps cards to images, addresses them in both languages and names the files in ASCII;
  - an unknown card answers 404 before any read.

  `design-tokens.test.ts` still finds no hand-written colour in the app's TypeScript.
- `pnpm test:integration`: exit 0, 342 tests. `pnpm test:golden`: exit 0, 364 tests. The counts are from the run before the colour tokens moved; the token change is limited to the web app, whose unit tests ran after it.
- Locally on `next dev`, with production's own 1.10 responses for NOWAK, KOWALSKI, KOWALSKA and ZAREMBA (fetched 14:46 UTC) fed through a temporary route that is not committed:
  - ten cards rendered at 1080 × 1920 in 0.17–0.42 s each, and were looked at;
  - two fixes came from looking: the figure's line height (the comma of "18,1%" ran into the line below) and the footer button's wrapping.
- The real routes against the local database (fixture surnames with population only):
  - DĄBROWSKI's summary answered a PNG in both languages, with the cache header;
  - its rarity card (not ready), an unknown card and an unknown surname answered 404.
- In headless Chromium at 1440 × 900 and 390 × 844, the deck's button downloaded `dabrowski-summary.png` (1080 × 1920), with no page errors.

## Not verified

- The share sheet on a real phone. Headless Chromium cannot share files, so only the download path ran.
- The routes on production.
