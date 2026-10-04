# 2026-10-04 — Known people's Wikipedia and Wikidata links open in a new tab

**Changed:** the Wikipedia and Wikidata links for each known person now carry `target="_blank"` (with the existing `rel="noopener noreferrer"`), on the deck's "Znane osoby" card (`apps/web/src/lib/deck.tsx`) and in the result page's list (`apps/web/src/lib/result-view.tsx`, `BearerItem`), so reading about a person does not leave the surname page. One assertion added to the deck test in `apps/web/src/lib/deck.test.ts`.

**Verified:**

- `pnpm exec vitest run src/lib/deck.test.ts src/lib/result-view.test.ts` (in `apps/web`): 2 files, 144 tests passed.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test` (repo root): each exited 0.

**Not verified:** not clicked in a browser; GitHub Actions `verify` has failed before any step on every recent run, `main` included, so CI gives no signal.
