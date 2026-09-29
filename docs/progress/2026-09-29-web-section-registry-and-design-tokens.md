# 2026-09-29 — TASK-034: one section registry and one set of design tokens for the web app

Scope authority: `tasks/034-web-section-registry-and-design-tokens.md`, written and implemented in this change at
the project owner's request.

The branch `claude/procent-continuation-7c2e00` had been started from the stale default branch.
- `STATUS.md` had marked its earlier commits "do not merge".
- The project owner chose to reset the branch onto `origin/main`, and it was force-pushed there before this work
  began.
- The discarded head was `1c44746`. It is still reachable by that SHA, and nothing on it was missing from `main`.

## Changed

- **Sections — `apps/web/src/lib/sections.ts` (new).**
  - For each of the four chapters, the registry holds: view key, contract field, anchor, intent, and the nav,
    title and lede message keys. It also holds the sources footer's anchor.
  - From it come `SectionKey`, `Intent`, `parseIntent`, `sectionOrder` and `anchorOf`.
  - `result-view.tsx`:
    - `Chapter` now takes a chapter key, and its id, question and reading note come from the registry;
    - the nav's anchor map and label map are gone;
    - `SectionKey` and `sectionOrder` moved to the registry.
  - `compare-view.tsx` takes its three section ids from `anchorOf`.
  - `messages.ts` re-exports `Intent` and `parseIntent` from the registry, so no importer changed.
- **Tokens — `apps/web/src/lib/design-tokens.ts` (new).**
  - It holds every custom property of `globals.css`'s `:root` block, the five map bands, and the three type
    families.
  - `og-card.tsx` takes its palette and font family names from it. The old palette carried a comment naming a
    non-existent token, `color-brand-atlas`.
  - `name-print.tsx` takes its fallback colour from it.
  - `MAP_CLASS_COUNT` is now `MAP_BANDS.length`, still 5.
- **Tests.**
  - `sections.test.ts`: 7 tests. Registry uniqueness, contract coverage, words in both languages, intent parsing
    and ordering, no anchor literal outside the registry, and CSS ids all registered.
  - `design-tokens.test.ts`: 5 tests. `:root` equals the token set; each band is styled exactly once on the map and
    once on the bars; no hex colour in the app's TypeScript outside the module; the share card's font names and
    `layout.tsx`'s `next/font` imports match the families.
  - `result-view.test.ts`: one new test, because no test rendered `?intent=meaning`. It was added before the
    refactor, so the baseline below covers all four intents.
  - No existing assertion changed.
- **Docs:** this record, the task file, `docs/CODEMAP.md` and `STATUS.md`.

## Verified

Against a local PostgreSQL 16.13 with PostGIS 3.4.2, through `TEST_DATABASE_URL`:

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed: "Already up to date" |
| `pnpm check:ids` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| `pnpm format:check` | Passed |
| `pnpm test` | Passed: 727, up from 714 on `main` at `83d38c2` (run first in this session). The 13 new are all in `apps/web`, which went from 215 to 228 |
| `pnpm test:integration` | Passed: 281 |
| `pnpm test:golden` | Passed: 364 |
| `pnpm build` | Passed, with the known Next.js Edge Runtime warning from `next/dist/esm/server/app-render/dynamic-rendering.js` |

**Nothing rendered changed (AC-03).** A scratch Vitest setup file, not committed, wrapped `react-dom/server`'s
`renderToStaticMarkup` and `renderToString` and recorded every string the web tests rendered. A scratch test also
rendered the share card for three fixed sets of facts and hashed the PNG bytes.

| Run | Result |
|---|---|
| Twice on `main` + the new intent test | Byte-identical: capture is deterministic. |
| On this change | Byte-identical to `main`: **105 rendered pages** (all four intent orders among them) and **3 share-card PNGs**. |

**Each drift fails a test (AC-04).** Every drift below was introduced alone, its test run, and the file restored
byte for byte. All nine failed as they should:

1. a token's value changed in the CSS only;
2. a token added to the CSS only;
3. a sixth map band styled in the CSS only;
4. a hex colour written in a view;
5. a type family renamed in one place;
6. an anchor renamed in the CSS only;
7. an anchor written as a literal in a view;
8. two chapters given one intent;
9. a contract section left out of the registry.

## Not verified

- **The pages in a browser.** Equivalence was shown on rendered markup and on the share card's PNG bytes, not on
  pixels. The stylesheet did not change at all.
- **CI on this branch** had not reported when this record was written.
- **The change on production.** It is not deployed.
