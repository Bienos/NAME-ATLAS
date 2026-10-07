# 2026-10-07 — TASK-171: the baby-names search in Brand System v1 (design A)

## What changed

- `apps/web/src/lib/baby-names-page.tsx`: `BabyNamesView` draws design A. Before a search (and signed out) a hero: kicker with the Atlas Point, the title, the lede, the search as a pill (`SearchForm`) and four example names (`Examples`, links that search), beside a panel (`SeePanel`: `ContourField`, `AtlasPoint`, the source tag and the five things the result shows); signed in, the two list cards (`ListCards`, `?sex=girls|boys`) with the existing list and couple links. Signed out, the existing explanation and sign-in link on a card; no form. After a search the title and the pill fold into one bar (`bn-search-bar`); an invalid, absent or held name on a card, and the example names under an invalid or absent name. The answer below is unchanged.
- `apps/web/src/lib/baby-names-text.ts`: the hero's, panel's and cards' copy, Polish and English. No figure.
- `apps/web/src/app/globals.css`: `.bn-search-*`, `.bn-see*`, `.bn-examples`, `.bn-signin`, `.bn-lists*`, `.bn-list-card*`, `.bn-message`, `.bn-source` under `.baby-names.atlas-v1`; one column below 760 px.
- `apps/web/src/lib/baby-names-page.test.ts`: three cases (before a search in both languages, after a search and an absent name, signed out).
- `tasks/171-baby-names-search-redesign.md`, `STATUS.md`.

## Verification (run in this session, on the branch rebased on `main` @ `493438e`)

- `pnpm format:check`: "All matched files use Prettier code style!"
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm lint`: exit 0. `pnpm typecheck`: exit 0.
- `pnpm test`: exit 0; apps/web 112 files, 1317 tests passed; every package passed (re-run after the rebase).
- `BABY_NAMES_ENABLED=1 pnpm --filter ./apps/web build`: exit 0.
- Chromium (Playwright, pre-installed): the page's own markup rendered from the test fixtures with `globals.css` and `brand-system.css` (before a search, ZOFIA, an absent name, signed out) at 1280 and 390 px: `scrollWidth` 1280 and 390 in all eight. A first pass gave 395 at 390 px before a search (the pill's input); fixed with `width: 0` on the input and a `minmax(0, 1fr)` form track, then re-checked.

## Not verified

- `pnpm test:integration`: not run (no change to a reader or the database).
- The running app against a database, and the live page signed in.
- CI: GitHub Actions starts no job in this repository.
