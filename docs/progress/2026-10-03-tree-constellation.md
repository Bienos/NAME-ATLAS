# 2026-10-03 — TASK-084: the tree's Konstelacja view, ancestors as stars with a side panel

**Task:** `tasks/084-tree-constellation.md`. **Number:** 084, the next free on `main` (up to 083) and in the open pull requests. **Requested by:** the project owner, "ok start konstelacja" (2026-10-03), the view chosen on 2026-10-01 from the first round of mockups (the artboard "A · Konstelacja").

## What changed

- `apps/web/src/lib/tree-constellation.ts` (new, pure): the sky's geometry (`SKY`, 1000 × 640, the root at 500 × 580, radii 0 / 150 / 300 / 460), `position` (slot *i* of 2^g at the angle π · (1 − (i + ½) / 2^g), father left of mother), `starKind` (hidden → `hidden`; no person → `empty`; `treated_as_living` → `living`; a source note → `source`; else `entered`), `pickSlot` (`sel` from the address when the pedigree has that number, else the root), `constellation` (the stars, the lines typed `open` to an empty or hidden place, `hot` at the picked star, `solid` otherwise, the arcs of the generations present), `linePath`, `arcPath`, `viewBox` (the top just above the highest arc, so a short tree is not drawn under empty sky).
- `apps/web/src/lib/tree-stars.tsx` (new, `"use client"`): the island. One SVG: the sun's gradient behind the root, the arcs and their labels, three `<path>`s for the line kinds, and a star per slot as `<a href="?sel=n">` carrying a transparent hit circle (68 units), the picked ring, the glyph (a lit core with a halo, a plain core, a ring with a lock, a dotted ring, a dashed ring), the first given name and the years. With script a click calls `preventDefault` and sets the picked slot; nothing else runs. The legend, the note, and the panel: for a person the name, years, the status chip and the source / entered chip, birth (year, place), birth surname, death, the source note, the living note, and the link to the person's form for an editor; for an empty place the words and the link to add that parent (editors only); for a hidden place its words.
- `apps/web/src/lib/tree-paths.ts`: page `constellation` (`konstelacja` / `constellation`), `treePath`, `treeTarget`. `tree-load.ts`: kind `constellation` (the pedigree's slots, `picked`, `unplacedCount`). `tree-page.tsx`: `ConstellationView` (the back link, the title, the lede, the switch, the viewer and hidden-count lines, the island or the start line for a tree with no root, the outside-the-pedigree line) and `ViewSwitch` (`nav.tree-seg`, Rodowód · Konstelacja, `aria-current` on the page's own), added to the Rodowód too. `tree-text.ts`: `constellation` words in both languages, `headings.constellation`, an empty status map. `globals.css`: the switch, the sky (dusk tokens, `overflow-x: auto`, the SVG at least 40 rem wide), the stars, the legend, the panel, the two-column layout from 64 rem, the view's `main` at 76 rem.
- Tests: `tree-constellation.test.ts` (new), and cases in `tree-paths.test.ts`, `tree-load.test.ts`, `tree-page.test.ts` (both languages render the same structure of the view; the empty, hidden and viewer panels; the switch on the Rodowód; the metadata), `analytics-path.test.ts` (`[tree]/konstelacja`), and `tests/integration/src/tree-pages.test.ts` (the owner's and the member's constellation over a real database).
- `docs/CODEMAP.md` (the tree row), `STATUS.md`, `tasks/084-tree-constellation.md`.

No new dependency. Nothing in production changes: the view exists only where the tree's pages do (accounts on and `FAMILY_TREE_ENABLED=1`).

## Verification

Run on 2026-10-03 in this container (PostgreSQL 16 with PostGIS, local), after the last edit:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids` — exit 0.
- `pnpm test` — exit 0 (`apps/web` 64 files, 685 tests; the whole suite green).
- `pnpm --filter web build` with `FAMILY_TREE_ENABLED=1` and the five accounts variables pointing at the local database — exit 0 (the tree's routes dynamic, as before).
- `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm test:integration` — exit 0: 33 files, 388 tests (the new case inside `tree-pages.test.ts` AC-5).
- **AC-7 and AC-8 in Chromium** (`scratchpad/e2e/constellation.mjs`, Playwright against `next start` over `na_e2e` migrated through 0029 with the roles file, the seeded account and the TERYT excerpt): sign-in; a tree of three (Józef 1934–2009 with a source note, his mother Marianna 1906 living, his father Franciszek 1903 living; the seeded account was on the clause's terms already, so no consent step came); the Rodowód's switch marks itself and leads to the Konstelacja, which marks itself; 7 stars (3 people, 4 empty places); the root picked (`?sel=1`), its panel with the source chip, its star lit; a click on `?sel=2` changed the panel to Franciszek with the living note and the picked mark, and the address did not change; `?sel=5` gave the empty place's panel with the link to add the parent; at 390 × 844 the page's `scrollWidth` was 390 for an `innerWidth` of 390 and the sky's 640 for a `clientWidth` of 352 (it scrolls inside itself); in a context without JavaScript, `?sel=2` showed Franciszek and a click on the mother's star navigated to `?sel=3` and showed her; the tree was deleted at the end. Output `CONSTELLATION OK`. Screenshots at 1280 and 390 in the scratchpad (`shots/20-…`, `22-…`): the sky beside the panel at 1280 with the whole drawing in view; at 390 the sky in a scrolling box with readable labels.
- A first run found the click on a star landing between the glyph and its label (an SVG link has no body of its own): the hit circle was added and the run repeated. A second found the sky scrolling at 1280 inside the 46 rem reading column: the view's `main` is now 76 rem wide and the viewBox fits the generations present.

## Not verified

- A tree of four generations in the browser (the fixture tests draw one; the browser run had three).
- The view in production: the tree is dark there.
- The Mapa view, invitations, matching, documents: not built (the task's §3).
