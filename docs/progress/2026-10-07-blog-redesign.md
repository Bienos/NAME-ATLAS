# 2026-10-07 — TASK-174: the blog in Brand System v1

## What changed

- `apps/web/src/lib/blog-page.tsx`: `BlogIndexView` and `BlogPostView` render in `.atlas-v1` (`mainClassName` `blog blog-index atlas-v1` / `blog blog-article atlas-v1`). Index: a masthead (kicker with `AtlasPoint`, title, lede) beside contour art (`ContourField` ×2, `AtlasGrid`, `AtlasPoint`); the newest post as the feature card (`blog-card-feature`, "Najnowszy wpis"); the others numbered `02`, `03`, …; each card with the date, minutes to read and "Czytaj wpis →". Post: a kicker linking to the blog, the title, the description as the lede, the date with minutes to read; the feature image, or drawn contours (`blog-post-art`) seeded by the slug when there is none; a numbered contents list (`blog-toc`, two numbered sections or more) beside the body; each numbered section has an id (`sekcja-N` / `section-N`). New export `readingMinutes` (200 words a minute, at least 1). A card without an image draws contours instead of a gradient. Metadata, JSON-LD and the Markdown rendering are unchanged.
- `apps/web/src/design-system/blog.css` (new, imported in `app/layout.tsx` after `family-surnames.css`): every blog style, scoped to `main.blog.atlas-v1`; one column below 48rem; transforms off under reduced motion.
- `apps/web/src/app/globals.css`: the old dusk blog block (TASK-071/075) removed.
- `apps/web/src/lib/messages.ts`: `blogKicker`, `blogFeatured`, `blogRead`, `blogMinutes`, `blogToc`, Polish and English.
- `apps/web/src/lib/blog.test.ts`: the FAQ/sources case accepts the section id; four new cases (atlas-v1 scope, feature card and numbering, contents list and anchors, minutes to read).
- `tasks/172-blog-redesign.md`, `STATUS.md`, `docs/CODEMAP.md`.

## Verification (run in this session, on `main` @ `e0c42a8`, then rebased on `6e2fb72` and re-run: format, IDs, lint, typecheck, test, build)

- `pnpm format:check`: "All matched files use Prettier code style!"
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm lint`: exit 0. `pnpm typecheck`: exit 0.
- `pnpm test`: exit 0; apps/web 1321 tests passed before the rebase, 1329 after.
- `pnpm --filter ./apps/web build`: exit 0.
- Chromium (Playwright, pre-installed) against `next dev`: `/pl/blog` and `/pl/blog/koncowki-nazwisk` at 1280 and 390 px, `scrollWidth - innerWidth` = 0 in all four. A first pass showed the feature card's image pushing its text out of the card at 1280 px, and the global `section` rule drawing rules above sections and uppercasing `h3`; both fixed and re-shot.

## Not verified

- The English pages in a browser (rendered in the tests only).
- `pnpm test:integration`: not run (no reader or database change).
- CI: not observed.
