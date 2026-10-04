# TASK-092 — The family tree, the Mapa view: birthplaces on the map of Poland, by voivodeship

- **Status:** IMPLEMENTED 2026-10-04; AC-1 to AC-7 verified (`docs/progress/2026-10-04-tree-map.md`).
- **Requested by:** the project owner, 2026-10-04: "Go next", after the Konstelacja (TASK-091); STATUS names the Mapa view as the tree's next step. The artboard "B · Mapa" of the first round of mockups (ADR-0029's header) is the brief.
- **Number:** 092, the next free on `main` (up to 091) and in the open pull requests (084 in #96 and #99).
- **Builds on:** TASK-066 (the core; `place_codes` on the `tree` object), TASK-076 (the pages; `tree-places.ts` resolves a locality's district and voivodeship through `administrative_memberships`), TASK-091 (the view switch, the island pattern: links `?sel=n`, a pick in place with script), TASK-040 (`voivodeship-geometry.ts`, the 16 voivodeships keyed by TERC), ADR-0029 §2.5.16 (every view is derived from the `tree` object).
- **Record:** `docs/progress/2026-10-04-tree-map.md`.

## 1. Outcome

A third view of one tree: the people placed on the map of Poland by the voivodeship of their birthplace. The register (TERYT) holds no coordinates for a locality, so a person stands in their voivodeship, not at a point: a voivodeship with people is lit by how many, carries its name and the count, and a marker of the best provenance among them (a source note lights it; a living person is private). A child is joined to a parent by an arc when they were born in different voivodeships. Beside the map, the people by generation as a rail; picking one (a link `?sel=n`, in place with script) outlines their voivodeship and shows their card. People whose birthplace is not in the register, or who have none, are listed under the rail as not on the map. The artboard's year slider is left out (its own task: it needs script to mean anything).

## 2. In scope

1. **The address:** `/pl/konto/drzewa/{tree}/mapa` and `/en/account/trees/{tree}/map` (`tree-paths.ts`: page `map`); the switch gains Mapa on all three views.
2. **The register's part** (`tree-places.ts`, `placeRegions(db, codes)`): for the tree's `place_codes`, each known locality's name, district and voivodeship with its TERC code, through the read-only pool, with no user id in the query. Unknown codes are left out.
3. **The layout, pure** (`tree-map.ts`): a voivodeship's anchor (the centre of its outline's bounding box, from the geometry), the people on the map (a slot whose person has a known birthplace), the groups per voivodeship (count, best kind, whether the picked person is there), the arcs child → parent between different voivodeships, the rail by generation, the picked slot (`pickSlot` as the Konstelacja's), the count of people off the map.
4. **The island** (`tree-map-view.tsx`): the 16 outlines (dim where nobody was born; lit by count where someone was; the picked person's outlined), the markers and labels, the arcs, the rail as links `?sel=n`, the picked person's card. Reads and works without script.
5. **The page** (`tree-load.ts` kind `map`, with `regions` as a new loader dependency; `tree-page.tsx` `MapView`), words in both languages, styles, metadata `noindex`.
6. Tests: the layout, the paths, the loader, the rendering in both languages, the integration case over the TERYT excerpt (a locality resolved to its voivodeship and TERC), the browser run.

## 3. Out of scope

- The year slider; coordinates for localities (the register has none); matching, invitations, documents; any change to the schema, the service, the contract (`places` with `lat`/`lon` stays as specified for a register that one day has them) or the routes.

## 4. Acceptance criteria

- **AC-1** `treeTarget` and `treePath` know the page in both languages; `redactTreePath` leaves `[tree]/mapa`.
- **AC-2** `placeRegions` returns, for a known SIMC code, the locality's name, its district and its voivodeship's name and two-digit TERC; an unknown code is absent.
- **AC-3** The layout: a person with a known birthplace is in exactly one voivodeship's group; a group's count is its people; its kind is `source` if any has a source note, else `entered` if any is deceased without one, else `living`; an arc exists for each child–parent pair on the map in different voivodeships and for none in the same; the anchor of every voivodeship lies inside the map's viewBox.
- **AC-4** Without script every rail item is a link `?sel=n` and the card shows the picked person; with script a click changes the card and the outline without a navigation.
- **AC-5** Both languages render the same structure; the three views each carry the switch with `aria-current` on themselves.
- **AC-6** At 390 px the page does not scroll horizontally.
- **AC-7** In Chromium against `next start` over the TERYT excerpt: a person born in a locality of the excerpt stands in their voivodeship with the label and the count; a person with a typed place only is listed off the map; a click picks in place; `?sel=` picks without script.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids
pnpm test
FAMILY_TREE_ENABLED=1 <the five accounts variables> pnpm --filter web build
TEST_DATABASE_URL=… pnpm test:integration
node scratchpad/e2e/map.mjs   # AC-6, AC-7, against next start
```
