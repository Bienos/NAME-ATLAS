# 2026-10-07 — TASK-160: the baby-names free window (D-051)

## What changed

- `apps/web/src/lib/baby-names-config.ts`: `BABY_NAMES_FREE_UNTIL_ENV`, `babyNamesFreeUntil` (an ISO 8601 instant with `Z` or an offset; unset, malformed or past → null), `BabyNamesAccess` and `readBabyNamesAccess` (`paid` = holds a tier with the view; `full` = paid or the window open; `freeUntil` only when the window alone opens it).
- `baby-names-page.tsx`: the loader decides access with `readBabyNamesAccess`; `readFacts(name, history, paid)` reads on PAID only when history and paid; `readMeaning(name, paid)`. The data carries `freeUntil`. In the window, without a purchase, the card `BabyFreeWindow` (struck price, "dziś 0 zł", the end in Warsaw time, a `<details>` whose `<summary>` is "Sprawdź dziś za darmo") holds the paid view, now its own component `FullView`. The running deps read the variable.
- `baby-names-list-page.tsx`, `baby-names-compare-page.tsx`, `baby-names-share-page.tsx`, `baby-names-share-route.ts`: the same access; PAID surface only for a purchase.
- `baby-names-text.ts`: `freeCta`, `freeToday`, `freeUntil`, Polish and English.
- `apps/web/src/app/globals.css`: `.bn-free`, `.bn-free-open`, `.bn-free-pill` under `.baby-names.atlas-v1`; the button in Atlas Blue (ADR-0046).
- Tests: the variable's parsing, the window open without and with a purchase, closed (`baby-names-page.test.ts`); the list in the window on FREE and with a purchase on PAID (`baby-names-list-page.test.ts`); the comparison in the window on FREE (`baby-names-compare-page.test.ts`). One existing assertion now expects the third `readFacts` argument.
- Records: `tasks/160-baby-names-free-window.md`, D-051 in `docs/DECISIONS_NEEDED.md`, `STATUS.md`.

## Verification (run in this session)

- `pnpm format:check`: "All matched files use Prettier code style!"
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm lint`: exit 0, no findings.
- `pnpm typecheck`: exit 0.
- `pnpm test`: exit 0; apps/web 108 files, 1202 tests passed (every other package passed). After moving the price line above the button: `vitest run src/lib/baby-names` 8 files, 123 tests passed; prettier and eslint on the changed files clean.
- Chromium (Playwright, the pre-installed browser): the page's own markup for ZOFIA in the window, rendered from the test fixtures with `globals.css` and `brand-system.css`, at 1280 and 390 px; the card closed and, after clicking the button, open with the year chart, ladder and table; `scrollWidth` 1280 and 390, no horizontal overflow. Not the running app: no `next dev`, no database.

## Not verified

- `pnpm test:integration` and `pnpm build`: not run.
- The running app on a database; staging; production. `BABY_NAMES_FREE_UNTIL` is not set anywhere: the owner sets it on the deployment (for example `2026-10-08T23:59:00+02:00`) and redeploys.
- CI: GitHub Actions starts no job in this repository (account-level block, STATUS).
