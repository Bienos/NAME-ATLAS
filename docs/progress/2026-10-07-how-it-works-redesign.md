# 2026-10-07 — TASK-161: "Jak to działa" / "How it works", redrawn

## What changed

- `apps/web/src/lib/how-text.ts`: sections carry `id`, `visual`, `short`; the document carries `labels` (illustration words, six confidence glosses, the closing link) in Polish and English. Every TASK-052 sentence is unchanged.
- `apps/web/src/lib/how-page.tsx`: hero with three promises; the answer anatomy (a sample answer with placeholder bars, the source line "PESEL · dane.gov.pl" and the word "Zweryfikowane", four pinned parts); a sticky jump strip; numbered illustrated step cards; the confidence ladder with glosses; the crossed "what we do not do" items; a link back to the search.
- `apps/web/src/app/globals.css`: the `.how-…` block after `.legal-updated`; `main.reading.how` widened to 64rem.
- `apps/web/src/lib/how-page.test.ts`: two cases (anchors and jump links, glosses; no digit in the drawn words).

## Verification (run in this session)

- `pnpm format:check` — "All matched files use Prettier code style!"
- `pnpm lint` — exit 0, no findings.
- `pnpm check:ids` — "every task, ADR, migration and decision number is used once".
- `pnpm --filter web typecheck` — exit 0.
- `pnpm --filter web test` — 108 files, 1197 tests passed.
- Chromium (Playwright 1.56.1, `next dev --webpack`): `/pl/jak-to-dziala` at 1280 and 390 px and `/en/how-it-works` at 1280 px; `scrollWidth − innerWidth` = 0 on all three; screenshots inspected.

## Not verified

- `pnpm build` and the integration tests were not run (the page is static and reads no database).
- CI did not run.
