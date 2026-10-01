# TASK-053 — The surname journey as a sequence of screens

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-surname-journey-flow.md`).
- **Requested by:** the project owner, 2026-10-01, pointing at the redesign proposal of 30 September and 1 October ("I want this to have such flow"). The proposal's §4 "The first 90 seconds on a phone" lays out twelve screens; its §5 lists the landing's sections top to bottom.
- **Decision:** ADR-0022.
- **Milestone:** none in `PLAN.md`.
- **Depends on:** TASK-052 (the dusk site, ADR-0021), merged as #51.
- **Model guidance:** implementation session.

## 1. Goal

The site follows the proposal's flow as far as the product's data and rules allow. A search shows the surname and what is being checked while the camera comes down. The surname page reads one question per screen, each screen ending on the question the next one answers, and ends on a summary with the share card to share or save. The landing continues past the atlas with how it works and a comparison.

## 2. Facts (checked on `main` @ `65c6254`, 2026-10-01)

1. The search runs one request, `querySurnameResult`, which returns the count, rarity, regional distribution and meaning together.
2. The surname page renders the snapshot, a chapter bar, four chapters (count, rarity, voivodeships, meaning), the sources, then the share control and links. Their anchors are declared in `sections.ts`.
3. `result-view.test.ts` refuses any `hidden` in the result view's markup.
4. `/pl/nazwisko/{slug}/opengraph-image` and its English twin serve the share card, drawn only from validated facts.
5. The landing renders the hero, the most common surnames and the atlas plates, then the footer.
6. Task number 053 and ADR-0022 are free on `main` and in the open pull requests #30, #43 and #44.

## 3. In scope

- **The analysis screen.** On a submitted search the landing shows the typed surname over four lines naming the parts of the answer the request reads (`analysisSteps`). No line is ticked off and there is no progress bar: the request does all of it at once. The status line stays the one announcement for assistive technology.
- **One question per screen.** Each chapter and the snapshot end on a link to the next screen, labelled with that screen's own question; the sources' question is "Skąd to wiemy?" / "How do we know?". On phones every chapter with figures fills the screen, as it already did on desktop.
- **The map pinned beside the steps.** On desktop the world's map stays at the right beside the count, rarity and meaning screens, and steps back on the voivodeships screen, which brings its own map, and on the sources and summary.
- **The summary screen.** After the sources: the share card, Share, Save image, then search another, compare and report a problem.
- **The landing's last sections.** After the atlas: how it works in three sentences, linked to the full page, and a two-field comparison form.
- **Two layout fixes.** The atlas's dark ground reaches the window's edges at every width, and the landing's footer has the same ground.
- Copy in `messages.ts`; the snapshot and summary anchors in `sections.ts`.

## 4. Out of scope

From the proposal, each for the reason given:

- **A 0–100 rarity score and percentile** (proposal screen 04). No claim gives one; the product shows "1 in X" and the rank, each with its source.
- **"1 in N residents of Poland"** (screen 03). It would set one list's count against the whole population, which the register's two separate lists do not support.
- **A dot-density cluster map** (screen 05). The voivodeship choropleth and table stay the regional answer.
- **Competing meanings with segmented confidence bars** (screen 07). Meanings render as the meaning chapter already renders them; confidence stays a word and a symbol (ADR-0021 §2.9).
- **Change over time** (screen 09). This is TASK-051's feature (#43, ADR-0020), not built on `main`.
- **"We found more" and the paid report** (screens 11 and 12). No inventory of historical forms or archive references exists, and the product has no purchase.
- **A horizontal strip previewing the twelve screens** on the landing (proposal §5 item 4). It would show placeholder figures.
- A count of surnames in the register line (ADR-0021 §2.7).

## 5. Acceptance criteria

- **AC-1.** A submitted search on `/` reveals the analysis screen with the typed surname and the four lines, and still issues the `GET` to `/`.
- **AC-2.** On a resolved surname the snapshot, each chapter and the sources end on a link to the next screen, in the order the page shows them, labelled with that screen's question (unit test, including an intent's order).
- **AC-3.** The world's list of screens is the registry's anchors: the snapshot, the four chapters, the sources and the summary (unit test).
- **AC-4.** The summary screen shows the page's share card with Share and Save image.
- **AC-5.** The landing's how-it-works section states the three rules and links to the full page; its comparison form sends `qa` and `qb` to the comparison route with ids of its own (unit test).
- **AC-6.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```
