# ADR-0022 — the surname journey is a sequence of screens

- **Status:** Proposed. It is accepted when the project owner merges TASK-053's pull request.
- **Date:** 2026-10-01
- **Deciders:** the project owner asked for the flow of the redesign proposal of 30 September and 1 October (2026-10-01).
- **Relates to:** ADR-0021 (the dusk direction), ADR-0012 (evidence at the foot), TASK-023 (the claim unit and the snapshot), TASK-034 (the section registry).
- **Amended by:** ADR-0034 (TASK-093), 2026-10-04, in §2.4: the journey ends on the share studio, which the deck's last card leads to.
- **Code:** `apps/web/src/app/page.tsx`, `apps/web/src/lib/dusk-zoom.tsx`, `next-step.tsx`, `result-view.tsx`, `snapshot.tsx`, `surname-page.tsx`, `dusk-world.tsx`, `landing-sections.tsx`, `sections.ts`, `apps/web/src/app/globals.css`.

## 1. Context

- The proposal's journey runs twelve phone screens: start, analysis, count, rarity, map, regions, meaning, sources, change over time, summary, "we found more", and a paid report. Each screen answers the question the previous one raised.
- The surname page already holds the same answers as one page: a snapshot, four chapters and the sources. Its markup is what the honesty tests assert against.
- Several of the proposal's screens show figures the product does not have or may not show: a 0–100 rarity score, "1 in N residents", an inventory of historical forms and archive references, a price.

## 2. Decision

1. **The page stays one page; its parts become screens.** The snapshot, each chapter and the sources end on a link to the next part, labelled with that part's own question. On phones each part with figures fills the screen, as on desktop. Anchors, order and intent are unchanged, so shared links and the chapter bar keep working.
2. **The analysis screen names what the request reads, and nothing is ticked off.** The four lines are the parts of the answer one request fetches together. Ticking them one by one, or a progress bar, would invent stages the server does not run (`docs/canonical/16` §44: "Only emit stage if real work corresponding to it exists").
3. **The map is pinned beside the screens whose figures sit in a column** and steps back where a screen brings its own map or runs the full width. The world reads the screen in view from the registry's anchors.
4. **The journey ends on a summary**: the share card the page already serves, to share or save, then where to go next.
5. **Screens without a lawful source are left out**, and the task file lists each with its reason. They return when their data and decisions exist: change over time with TASK-051, an inventory with its sources, a purchase with a product decision.

## 3. Why not the alternatives

- **Separate routes per screen.** A surname's sections are anchors on its one canonical address, and section parameters canonicalise to that address (`docs/canonical/21` §34–§35). Twelve routes per surname would split it, and a reader could no longer scroll the whole answer.
- **A scripted pager that shows one screen at a time.** It would hide the rest of the answer from readers without script and from the honesty tests, which assert that nothing in the result view is hidden.
- **Drawing the missing screens with placeholder figures.** A figure without a source is not a figure in this product.

## 4. Consequences

- `sections.ts` also declares the snapshot's and the summary's anchors, and a test holds the world's list of screens to it.
- The landing gains two sections after the atlas, both restating what exists: the rules, and the comparison.
