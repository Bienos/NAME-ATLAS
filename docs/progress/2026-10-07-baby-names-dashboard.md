# 2026-10-07 — TASK-170: the baby-names year-by-year dashboard

## What changed

- `apps/web/src/lib/baby-names-dashboard.ts` (new, pure): `dashYears`, `buildDashboard` (total and "at least", years on the list, best rank, latest change, rises and falls, biggest rise and fall, decades, key moments), `sortOrders`.
- `apps/web/src/lib/baby-names-dashboard-view.tsx` (new): `DashSummary`, `ChartSwitch` (count chart / share-‰ chart), `Moments`, `YearOnYear`, `Decades`, `YearGrid`; radio inputs read by CSS `:has()`, no script.
- `apps/web/src/lib/baby-names-page.tsx`: `History` renders the panels around the existing chart, "×", callouts, ladder and sourced table (unchanged).
- `apps/web/src/lib/baby-names-text.ts`: the panels' copy, Polish and English.
- `apps/web/src/app/globals.css`: `.bn-dash-*`, `.bn-metric*`, `.bn-share-*`, `.bn-moments`, `.bn-yoy*`, `.bn-decades`, `.bn-meter`, `.bn-grid*` under `.baby-names.atlas-v1`.
- Tests: `baby-names-dashboard.test.ts` (new: the arithmetic, the gaps, the sort, every panel in both languages, no zero for a missing year, no script or button); one case in `baby-names-page.test.ts` (panels for paid and free-window readers, none when locked).
- `tasks/170-baby-names-dashboard.md`, `docs/CODEMAP.md`, `STATUS.md`.

## Verification (run in this session, on the branch rebased on `main` @ `7db2909`)

- `pnpm format:check`: "All matched files use Prettier code style!"
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm lint`: exit 0. `pnpm typecheck`: exit 0.
- `pnpm test`: exit 0; apps/web 1251 tests passed, every package passed.
- `pnpm test:integration` (local PostgreSQL 16 + PostGIS 3, `TEST_DATABASE_URL`): 50 files, 547 tests passed.
- `BABY_NAMES_ENABLED=1 pnpm --filter ./apps/web build`: exit 0.
- Chromium (Playwright, pre-installed): the page's own markup for ZOFIA with the 8,99 zł view, rendered from the test fixtures with `globals.css` and `brand-system.css`, at 1280 and 390 px: `scrollWidth` 1280 and 390; "liczba dzieci" ordered the grid 2017, 2018, 2016 first; "Udział ‰" showed the share chart and hid the count chart.

## Not verified

- The running app against a database, and the live page signed in.
- CI: GitHub Actions starts no job in this repository.
