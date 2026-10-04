# 2026-10-04 — Wikipedia and Wikidata links on the deck's known-people card

**Changed:** the deck's "Znane osoby" card (`apps/web/src/lib/deck.tsx`, `bearers`) now links each person to their Wikipedia article when `article_url` is present, and always to their Wikidata item, as the full result page's `BearerItem` already did. Styling in `apps/web/src/app/globals.css` (`.dk-bearer-links`). No contract or data change: `article_url` and `wikidata_url` were already in the response (TASK-073, ADR-0030). One new test in `apps/web/src/lib/deck.test.ts`; the fixture's first person gains an `article_url`.

**Verified:**

- `pnpm exec vitest run src/lib/deck.test.ts src/lib/result-view.test.ts` (in `apps/web`): 2 files, 144 tests passed.
- `pnpm exec tsc --noEmit -p .` (in `apps/web`): no errors.
- `pnpm exec eslint apps/web/src/lib/deck.tsx apps/web/src/lib/deck.test.ts`: no findings.
- `npx prettier --check` on the three changed source files: clean.

**Not verified:** the card was not rendered in a browser; whether production rows carry `article_url` for every listed person was not checked.
