# 2026-10-01 — TASK-053: the surname journey as a sequence of screens

Scope authority: `tasks/053-surname-journey-flow.md`. Decision: ADR-0022.

## What changed

- `apps/web/src/app/page.tsx`, `apps/web/src/lib/dusk-zoom.tsx`: the analysis screen. A submitted search on the landing shows the typed surname over the four parts of the answer the request reads; the status line is now visually hidden and stays the one announcement.
- `apps/web/src/lib/next-step.tsx` (new), `result-view.tsx`, `snapshot.tsx`: the snapshot, each chapter and the sources end on a link to the next screen, labelled with its question, in the page's order.
- `apps/web/src/lib/surname-page.tsx`: the summary screen after the sources, with the share card (`opengraph-image`), Share, Save image, search another, compare and report a problem.
- `apps/web/src/lib/dusk-world.tsx`: the world names the screen in view (`data-step`); the stylesheet keeps the map beside the count, rarity and meaning screens and steps it back on the voivodeships, sources and summary.
- `apps/web/src/lib/sections.ts`: the snapshot's and summary's anchors.
- `apps/web/src/lib/landing-sections.tsx` (new): how it works in three sentences and a two-field comparison, after the atlas.
- `apps/web/src/lib/messages.ts`: the analysis lines, the sources question, the summary's and the landing sections' copy, in Polish and English.
- `apps/web/src/app/globals.css`: the analysis screen, the step links, the summary, the landing sections, one screen per chapter on phones; the atlas's ground and the landing footer's now reach the window's edges.
- Tests: `result-view.test.ts` (the steps in order, and in an intent's order), `landing-sections.test.ts` and `dusk-world-steps.test.ts` (new).
- `tasks/053-surname-journey-flow.md`, `docs/adr/0022-surname-journey-screens.md`, `docs/CODEMAP.md`, `STATUS.md`.

## Verification (run 2026-10-01, on this branch)

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: each exit 0. The first lint run warned once, on a plain `<img>` for the summary card; it now uses `next/image` with `unoptimized`, and lint reports nothing.
- `pnpm test`: exit 0; `apps/web` 35 files, 336 tests passed. The first run had one failure: the step link's icon carried `aria-hidden`, which the result view's honesty test refuses. The chevron is now drawn by the stylesheet.
- `pnpm build`: exit 0.
- Read with headless Chromium at 1440 × 900 and 390 × 844 against `next dev` without a database. The surname page was rendered through a temporary local route, removed before commit, from production's `GET /api/v1/surname-results?surname=Zaremba` response. The share card request was answered with the NOWAK card captured from production, so the summary screenshots show NOWAK's card under ZAREMBA's page. Seen: the analysis screen at 0.7 s and 2.1 s after a submitted search; every step with its link to the next; the map beside the count, rarity and meaning screens and stepped back on the others; the summary; the landing's two new sections and its footer. Fixed on the way: the first screen's link sat at the right edge, the sources' heading was a small label, the summary's share row wrapped badly, and the landing footer showed the horizon through its text on a phone.

## Not verified

- `pnpm test:integration` and `pnpm test:golden`: not run.
- Save image in a real browser. The link carries a `download` attribute to the same-origin card; whether a phone saves it or opens it depends on the browser.
- Browsers other than Chromium.
