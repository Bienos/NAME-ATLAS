# TASK-170 — The baby-names year-by-year dashboard

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-baby-names-dashboard.md`).
- **Requested by:** the project owner, 2026-10-07: "create me very advanced dashboard for this section … very very detailed but easy to check"; a mockup was approved, part 1 (TASK-160, TASK-162) shipped the free button; then "ok so go live" for part 2, and "avoid action, just merge live": merge on local checks while GitHub Actions runs no job.
- **Decision:** D-044 (the paid view), D-051 (the free window). No new decision: the panels show the same claims, read on the same surfaces.
- **Numbers:** TASK-170 (169 is claimed by the open #198). `pnpm check:ids` exit 0.

## In scope

Inside each sex's paid view (`History` in `baby-names-page.tsx`), around the existing chart, callouts, ladder and sourced table, which are unchanged:

1. Summary tiles: total since 2000 ("co najmniej" when a stored year is below the cut-off), years on the list with years up and down, the best rank with its years, the latest year-on-year change.
2. A switch between the count chart and a share-‰ chart.
3. Key moments: first year on the list, first time in the top ten, years at no. 1, the peak, the biggest jump, the last year on the list when later years are below the cut-off.
4. Year on year: one tile per year, lightness by the size of the change; the biggest rise and fall.
5. Decades: sum, average and best rank, years on the list.
6. A grid of every year with children, rank and its move, share ‰, change, a bar against the peak; sortable by year, children, rank or change.

The figures come from `buildDashboard` (`baby-names-dashboard.ts`, pure): differences, ratios, sums and averages of count and rank claims. A year without a count claim is skipped, never 0; boys and girls are never summed. The switch and the sort are radio inputs read by CSS `:has()`; without it the count chart and newest-first stay. No script, no new dependency.

## Out of scope

A second name drawn on the chart (the comparison page does that), pricing, the free window, the offer page, migrations.

## Acceptance

- **AC-1:** with the view (paid or free window), each sex with a count shows the six panels; a locked reader sees none.
- **AC-2:** no figure is invented; a missing year reads "poniżej progu" or "brak listy", never 0; sums over such years are "co najmniej".
- **AC-3:** no horizontal overflow at 390 px.

## Verification

`pnpm format:check`, `check:ids`, `lint`, `typecheck`, `test`, `test:integration`, `build`; Chromium at 390 and 1280 px.
