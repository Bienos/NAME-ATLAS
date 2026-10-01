# 2026-10-01 — TASK-065, third cut: the landing's motion

Branch `claude/optimistic-gauss-sp4p9d`, on top of `d288251` (the second cut, `docs/progress/2026-10-01-landing-second-screen.md`). Task file: `tasks/065-landing-sells-the-deck.md` (§3, "Motion").

## Why

The project owner, after the second cut: "can you make it more creative and creative animations that would be nonconventional". The site already ties the rarity scale's drawing to scrolling (`animation-timeline: view()`, guarded by `prefers-reduced-motion` and `@supports`), the plates and the deck have entrance motion, and ADR-0021 makes the zoom the one choreography of a search. The hero's words and layout stay the owner's mockup.

## What changed

Every surname is a lit point (ADR-0021), so the landing's words are made of them. All of it is CSS, tied to scrolling, and absent with reduced motion or without `animation-timeline`: then everything is simply in place. No figure moves, nothing is derived, and no dependency was added.

- **`landing-sections.tsx`:** `Scatter` splits a text into words and letters, each letter with a start of its own (`--dx`, `--dy`, `--r`, `--i`) computed from its index alone, so the server and the browser agree; the whole text stays once, visually hidden, for assistive technology, and the letters are `aria-hidden`. `LandingTries` renders each surname's letters as flaps, the link named by the whole surname. `LandingPitch` wraps each card in a `.flip` with a back face that says only the surname and "NAME ATLAS".
- **`page.tsx`:** the hero's headline goes through `Scatter`, its words unchanged.
- **`globals.css`**, the block "The landing's motion": the hero's headline drifts apart into amber points as it leaves the screen (each letter's own exit); the second screen's heading gathers from them as the heading comes into view (its `view-timeline`); each answer and tier lights along a fuse on its top edge, its number igniting and its text rising; the surnames to try turn over letter by letter on the row's timeline, as a departures board does; the cards are dealt face down and turned as they come into view, each a little later than the last, and on a phone as they are swiped in (`view(inline)`); the eyebrow's point pulses; the three cards fan when the way to the deck is under the pointer. `.landing-headline span { display: block }` became `.landing-headline > span`, since the letters are spans too. The answers' grid keeps three columns at the site's width.
- **`landing-sections.test.ts`:** two new tests (a scattered text is kept whole and hidden, its letters have starts, and the render is the same twice; the cards are dealt with their backs), and the tries' test reads the link's name and its flaps.
- `STATUS.md`, `docs/CODEMAP.md`, the task file.

## Verified

Run on 2026-10-01 after the last edit to the components and the tests; one line of the stylesheet (the answers' grid, a column's minimum width from 17rem to 20rem) changed after the suite, and `pnpm exec prettier --check apps/web/src/app/globals.css` ran on it:

- `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm check:ids`, `pnpm test` and `pnpm build` — each exit 0. `apps/web`: 39 files, 430 tests, all passing; the workspace's other packages all passing.
- The built app (before the grid line), served with `next start` and no `DATABASE_URL`, in headless Chromium at 1440 × 900 and 390 × 844, at rest and at scroll offsets: the hero at rest reads as the mockup in the brand fonts; 300 px down, the headline's letters drift apart in amber and the second screen's heading is still gathering; further down, the last surname's flaps are still turning, the answers' fuses and numbers are lit, and the offer's strip follows. On the phone the hero is unchanged at rest and the second screen reads in order.
- The static render (a temporary test, not committed) with ZAREMBA's production answer and the site's stylesheet, at 1440 × 900 and 390 × 844, at scroll offsets: the heading gathering from scattered amber letters, the fuses drawing, the flaps, the three cards face down with their backs and then turning one after another, and all three face up at the end; with `prefers-reduced-motion: reduce` emulated, everything in place and nothing moving.

## Not verified

- The flip on a phone as a card is swiped in (`view(inline)`): the captures scroll the page, not the row.
- Browsers without scroll-driven animations (older Safari and Firefox): the `@supports` guard leaves the letters, flaps and cards in place; not run in one.
- The landing with a database, end to end (as in the first two records).
- `pnpm test:integration` and `pnpm test:golden`: not in this task's verification; nothing on the read path changed.
