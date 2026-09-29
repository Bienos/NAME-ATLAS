# TASK-034 — One section registry and one set of design tokens for the web app

- **Status:** IMPLEMENTED 2026-09-29. The record is in
  `docs/progress/2026-09-29-web-section-registry-and-design-tokens.md`. Specified and implemented in one pull
  request, at the project owner's request ("Both, one after the other": TASK-034, then TASK-031).
- **Requested by:** the project owner, who chose this on 2026-09-24 as the next cleanup (`STATUS.md`).
- **Milestone:** none. A presentation cleanup with no change in behaviour.
- **Numbering:** 034 is the next number free on `origin/main`, and no pull request is open.
- **Base:** `STATUS.md` held this task until GitHub's default branch is `main`, so sessions would not start
  from the stale one. This session started from `origin/main` explicitly (`AGENTS.md` §11), and the owner
  asked for the task now.

## 1. Goal

The surname page's sections and the web app's design tokens are each declared in several places that must
agree. Nothing checks that they do. Make each a single declaration, checked by tests, without changing a
single rendered byte.

1. **Sections.** The same four sections go by four vocabularies:
   - the contract fields: `population`, `rarity`, `distribution`, `meaning`;
   - the view keys: `count`, `rarity`, `map`, `meaning`;
   - the anchors: `today-count`, `rarity`, `where`, `meaning`;
   - the presentation intents: `rarity`, `map`, `meaning`.

   They are spelled out separately in `result-view.tsx` (`SectionKey`, `sectionOrder`, `CHAPTER_ANCHOR`,
   the nav labels, and a literal `id` in each of the five `<Chapter>` calls), in `compare-view.tsx` (three
   literal `id`s), in `messages.ts` (`Intent`, `parseIntent`) and in `globals.css`. The CSS styles
   `#today-count`, `#rarity` and `#where` by id. Renaming an anchor in one place silently breaks the chapter
   links, the compare layout, or both.
2. **Tokens.** The Visual System v1 tokens are CSS custom properties in `globals.css`. The places that cannot
   read CSS copy their values by hand:
   - `og-card.tsx` keeps its own five-colour palette, one entry commented with a token name that does not
     exist;
   - `name-print.tsx` repeats Atlas Blue as a fallback;
   - `MAP_CLASS_COUNT = 5` must equal the five `--map-N` tokens and two sets of five band rules in the CSS.

## 2. In scope

- **`apps/web/src/lib/sections.ts`**, the section registry. For each of the four chapters, in page order, it
  holds:
  - its view key;
  - its contract field;
  - its anchor;
  - its intent, if any;
  - its nav, title and lede message keys.

  It also holds the sources footer's anchor. From it come:
  - `SectionKey`;
  - `Intent` and `parseIntent`, moved from `messages.ts`, which re-exports them so importers do not change;
  - `sectionOrder`;
  - `anchorOf`.
- **`result-view.tsx` and `compare-view.tsx` read the registry:**
  - `Chapter` takes a section key, and its id, title and lede come from the registry;
  - `ChapterNav` takes its anchors and labels from the registry;
  - the compare sections take their ids from `anchorOf`.
- **`apps/web/src/lib/design-tokens.ts`**, the token set. It holds:
  - every custom property of `globals.css`'s `:root` block, by name and exact value;
  - the map bands, in order;
  - the three type families of the share card.

  Its consumers:
  - `og-card.tsx` takes its palette and family names from it;
  - `name-print.tsx` takes its fallback from it;
  - `voivodeship-map-scale.ts` derives `MAP_CLASS_COUNT` from the bands.
- **Tests that fail on drift:**
  - **Tokens.** `:root` in `globals.css` declares exactly the token set: same names, same values, nothing
    extra on either side.
  - **Map bands.** Each band has exactly one `.vmap-bN` and one `.rb-fill[data-band="N"]` rule, and no others
    exist.
  - **Registry.** Keys, anchors and intents are unique.
  - **Contract.** The registry's fields equal the contract's section fields.
  - **CSS ids.** Every id `globals.css` selects is a registered anchor.
  - **Routing.** Every registered intent parses and puts its section first.
- **Docs:** `docs/CODEMAP.md` names the two modules. A `docs/progress/` record is added and `STATUS.md` is
  rewritten.

## 3. Out of scope

- **Any visible change:** colour, spacing, type, layout, copy, order and markup all stay as they are.
- **Renaming an anchor.** They are URL fragments, and shared links may hold them.
- **Generating `globals.css` from TypeScript,** or any build step or new dependency. CSS cannot import
  TypeScript, so the CSS keeps its `:root` block and a test holds it equal to the token module.
- **Rights per section.** That is server-side (`packages/truth`, TASK-033) and is not touched.
- **The contract,** `apps/admin`, and the other packages.

## 4. Acceptance criteria

- **AC-01 — One declaration for the sections.**
  - After this task, a section's key, anchor, intent and message keys are written only in `sections.ts`.
  - `result-view.tsx` and `compare-view.tsx` contain no anchor literal, and `messages.ts` no intent list.
  - The CSS still selects three anchors by id, as before; AC-04 checks them.
- **AC-02 — One declaration for the tokens.**
  - No hex colour appears in a `.ts` or `.tsx` file of `apps/web/src` outside `design-tokens.ts`.
  - `MAP_CLASS_COUNT` is derived from the token module, not written.
- **AC-03 — Nothing rendered changes.**
  - The page's markup is byte-identical before and after the refactor, for every registered intent and each
    reachable section state:
    - the result page, rendered from schema-valid payloads;
    - the compare page.
  - The share card's element tree is identical too.
  - The check is recorded in the progress record.
- **AC-04 — Drift fails a test.** Each drift named in §2 is caught by a unit test, and each such test is
  shown to fail when the drift is introduced.
- **AC-05 — The repository's own checks pass:** `typecheck`, `lint`, `format:check`, `check:ids`, `test` and
  `build`.

## 5. Verification

```bash
pnpm install --frozen-lockfile
pnpm check:ids && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm build
```

- **No integration or golden suite needed.** No query, migration or package outside `apps/web` changes, so
  `pnpm test:integration` and `pnpm test:golden` have nothing new to exercise. They are run anyway if
  PostgreSQL is available, and the record says whether they were.
- **Markup equivalence (AC-03).** A scratch harness, not committed, renders the same payloads on `main` and
  on this branch and compares the output byte for byte.
