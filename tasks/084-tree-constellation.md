# TASK-084 — The family tree, the Konstelacja view: ancestors as stars, with a side panel

- **Status:** IMPLEMENTED 2026-10-03; AC-1 to AC-8 verified (`docs/progress/2026-10-03-tree-constellation.md`).
- **Requested by:** the project owner, 2026-10-03: "ok start konstelacja". The owner chose the tree's look on 2026-10-01 from the first round of mockups (ADR-0029's header): the artboard "A · Konstelacja" of the design canvas is the brief for this view.
- **Number:** 084, the next free on `main` (up to 083) and in the open pull requests (070 in #76, 078 in #81, 080 in #79, 082 in #93 and #94).
- **Builds on:** TASK-066 (the core), TASK-076 (the pages: `tree-load.ts` decides, `tree-page.tsx` renders, `tree-pedigree.ts` derives the Ahnentafel slots), ADR-0029 §2.5.16 (no view is stored; every view is derived from the contract's `tree` object), ADR-0021 (the dusk direction).
- **Record:** `docs/progress/2026-10-03-tree-constellation.md`.

## 1. Outcome

A second view of one tree beside the Rodowód: the same four generations drawn as a constellation in a dusk sky. The root is at the bottom centre with the sun's glow behind it; each generation up is an arc of stars; a parent is joined to its child by a line, solid when both are known, dashed when one place is empty, lit when the picked person is at either end. A star is lit for a person with a source note, plain for one entered from memory, a ring with a lock for a living person (private), a dotted ring for a hidden one (a member without `sees_living`), a dashed ring for an empty place. A side panel shows the picked person: name, years, chips, birth, birth surname, death, the source note, the living note, and the way to the person's form; for an empty place, the way to add that parent.

## 2. In scope

1. **The address:** `/pl/konto/drzewa/{tree}/konstelacja` and `/en/account/trees/{tree}/constellation` (`tree-paths.ts`: page `constellation`; `treeTarget`, `treePath`). Anything else under a tree stays 404. The analytics path keeps `[tree]` for it (`analytics-path.ts` already replaces the fourth segment).
2. **The layout, pure** (`tree-constellation.ts`): from the pedigree's slots, the stars' positions on concentric half-circles over the root (generation *g* at radius `R[g]`, slot *i* of 2^g at the angle `π · (1 − (i + ½) / 2^g)`), the arcs, the lines typed `solid` / `open` / `hot`, the generation labels, each star's kind (`source`, `entered`, `living`, `hidden`, `empty`) and words, and the panel's data for a picked slot. The picked slot is `sel` in the query (an Ahnentafel number the pedigree has), else the root.
3. **The island** (`tree-constellation.tsx`, `"use client"`): one SVG (viewBox 1000 × 640) whose stars are links `?sel=n`, so the page reads and works without script; with script a click changes the picked star and the panel in place, with no navigation. Nothing else runs in the browser; no new dependency.
4. **The page** (`tree-load.ts` kind `constellation`; `tree-page.tsx` `ConstellationView`): the heading, the back link, the view switch, the island, the legend, the note on light and empty places, the count of people outside the pedigree with the way to the Rodowód, the hidden count for a member. The Rodowód gains the same view switch (`nav.tree-seg`: Rodowód · Konstelacja, `aria-current` on the page's own). Metadata as the other pages' (`noindex`).
5. **Words** in `tree-text.ts`, Polish and English, the same structure.
6. **Styles** in `globals.css`: the switch, the sky (the dusk tokens, the sun's glow), the stars, the panel, the two-column layout that stacks on a phone; on a narrow screen the sky scrolls inside itself (`overflow-x: auto`), never the page.
7. Tests: the layout (positions, line types, kinds, the pick), the paths, the loader, the rendering in both languages (the switch, the links, the panel for the root, for an empty place, for a viewer), the integration case over a real database (a member's hidden star), and the run in Chromium (AC-8).

## 3. Out of scope

- The Mapa view (its own task); matching ("Możliwe połączenie"); documents (D-027); invitations; any change to the schema, the service, the contract or the routes under `/api/tree/`.
- Dragging, zooming, animation of the stars; a stored view.

## 4. Acceptance criteria

- **AC-1** `treeTarget` names the page from both languages' slugs and nothing else; `treePath` builds it; `redactTreePath` leaves `[tree]/konstelacja`.
- **AC-2** The layout puts the root at the bottom centre and every other slot on its generation's arc at the angle above, father left of mother; a line is `open` when either end is empty or hidden, `hot` when the picked slot is at either end, else `solid`; the arcs are one per generation above the root.
- **AC-3** A star's kind follows the slot: hidden → `hidden`; no person → `empty`; `treated_as_living` → `living`; a source note → `source`; else `entered`.
- **AC-4** Without script every star is a link to `?sel=n` and the panel shows the picked slot; an unknown or absent `sel` shows the root; with script a click changes the panel without a navigation.
- **AC-5** The panel: a person's name, years, status chip, birth (year and place), birth surname, death, source note; the living note for a living person; the link to the person's form for an editor; for an empty place, the link to add that parent (editors only); for a hidden place, the words for it.
- **AC-6** Both languages render the same structure; the Rodowód and the Konstelacja each carry the switch with `aria-current` on themselves.
- **AC-7** At 390 px wide the page does not scroll horizontally; the sky does, inside itself.
- **AC-8** In Chromium against `next start` over a migrated database: the switch leads to the Konstelacja, the root is picked, a click on a star changes the panel without a navigation, `?sel=` picks without script; screenshots at 390 and 1280.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids
pnpm test
FAMILY_TREE_ENABLED=1 <the five accounts variables> pnpm --filter web build
TEST_DATABASE_URL=… pnpm test:integration
node scratchpad/e2e/constellation.mjs   # AC-8, against next start
```
