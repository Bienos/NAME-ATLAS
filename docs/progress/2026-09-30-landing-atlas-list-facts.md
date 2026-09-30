# 2026-09-30 — TASK-040: the landing atlas, plates I–III, from a committed list-facts artefact

**Base:** `origin/main` at `f629292` (Merge #27). The branch `claude/keen-cannon-1jc301` held a stale draft (`4036488`, built on `d6f1b6c`). It was retired by a tree-preserving merge (`9b266af`); a force-push was refused by the session's permission check.

The project owner asked for a landing page that also shows general facts about surnames, reviewed an 11-plate mock-up, and said "go ahead". This change builds the first three plates, the ones that need no open decision, and the data path they stand on (ADR-0015, proposed).

## Changed

- **Data path and decisions:**
  - ADR-0015 (Proposed): statistics about a whole published list are derived offline into a committed, SHA-pinned artefact.
  - `ARCHITECTURE.md` §10: a one-line note on the amendment.
  - `PRODUCT.md` §5: one scope line.
  - The task file `tasks/040-landing-atlas-list-facts.md`.
- **Contract:** `packages/contracts/src/list-facts.ts` (`listFactsArtefactSchema`, `list_facts@1`) and its tests; `docs/contracts/list-facts.md` (proposed with ADR-0015). The schema refuses:
  - a merged or swapped list;
  - the same resource under both keys;
  - different model parameters on the two lists;
  - out-of-order arrays;
  - a missing reach set;
  - a crowd with no figure for its own size.
- **Derivation:** `packages/truth/src/list-facts/` — the summary, the collision curve (exact, people drawn without replacement), crowd expectations (exact hypergeometric ratios, compensated `log1p` sums), and seeded examples. Each has a method version in `src/version.ts`.
- **Generator and artefact:** `packages/truth/bin/build-list-facts.ts` (`pnpm truth:list-facts`) and the generated `packages/truth/src/generated/list-facts.ts`. `listFacts()` validates the artefact once per process.
- **Supporting changes:**
  - `packages/sources` exports its byte check (`localFileName`, `verifyResourceBytes`).
  - `@name-atlas/truth` declares `prettier` 3.9.8 as a devDependency (the root's version); the lockfile gains 4 lines.
- **Web** (`apps/web`):
  - `src/lib/list-atlas.tsx`: plates I–III.
  - `list-atlas-geometry.ts` and `list-atlas-layout.ts`: presentation geometry, memoised per artefact.
  - `list-atlas-shell.tsx`: entrance motion only.
  - `list-atlas-load.ts`: fail-soft loading.
  - `list-atlas.fixture.ts`: the test fixture.
  - `lf*` messages in Polish and English, new formatting helpers in `messages.ts`, a `.lf-` block in `globals.css`, and the `page.tsx` wiring.
  - The list switch is native radio inputs styled with `:has()`. It works without JavaScript and moves no content when flipped.
- **Records:** `STATUS.md`, `docs/CODEMAP.md` and this record.

## Figures (male list / female list; people drawn at random from one list)

| Figure | Value |
|---|---|
| People, surnames on the list | 21 197 537, 408 182 / 21 560 302, 420 082 |
| Median bearers per surname; upper weighted median per person | 5; 738 / 5; 756 |
| Smallest n with at least even chance of a shared surname | 82 (50,56%; 81: 49,72%) / 82 (50,70%; 81: 49,86%) |
| Two random people share a surname | about 1 in 4 469 / 1 in 4 451 |
| Expected different surnames among 1 000 people | 921,14 / 920,88 |
| Share of a crowd of 1 000 with no namesake in it | 86,29% / 86,25% |
| People needed for an even chance to meet the 100 / 10 / 1 most common surnames | 7 / 28 / 149 on the male list; 7 / 28 / 150 on the female list |

## Verified

Run on the final tree, 2026-09-30:

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm check:ids` | exit 0, "every task, ADR, migration and decision number is used once" |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0, "All matched files use Prettier code style!" |
| `pnpm test` | exit 0 in every package, 0 failed: contracts 65, truth 264, sources 509, web 306, resolver 102, logging 24, seo 18, admin 14, queue 9, db 8, domain 7, testing 3, worker 2 |
| `pnpm build` | exit 0: web "✓ Compiled successfully in 5.2s", admin "✓ Compiled successfully in 3.6s" |
| `pnpm truth:list-facts`, twice, then `cmp` | both runs exit 0, "done in 1.2s"; output byte-identical to the committed file, sha256 `31aa450680602508f6ef4db14d73377d4f7ccdb01ea848d31ef24dc74c7b34ee` |
| `tsx packages/truth/bin/build-list-facts.ts --dir fixtures/pesel` | exit 1: "refused (UNIVERSE_INCOMPLETE): resource 1148808 is not the complete published list (CONTENT_HASH_MISMATCH) …", artefact unchanged (AC-03) |

**Independent recomputation (AC-05).** A Python script written from the contract, without reading the TypeScript, recomputed every stored value from the raw CSVs. It uses exact big-integer arithmetic for the curve, exact integers or 45-digit decimals for the crowd expectations, and a reimplementation of the seeded draws.
- `numbers.py`: "76 checks, 0 failing". A first run reported 4 failing because it read the previous, uncorrected artefact from a hard-coded folder; pointed at the final artefact, it reports 0.
- `numbers.py examples`: all 64 rooms, both showcase pairs and both example crowds reproduced exactly. The rooms' KS statistic against the curve is 0.124 (male) and 0.136 (female), under the 5% critical value of 0.17.

**Built app, checked with Playwright.** The app was started with no `DATABASE_URL`: the most-common-surnames section fails soft and the atlas renders.
- A review agent's audit, re-run after each fix round:
  - horizontal overflow 0 at 320, 360, 390 and 1280 px, at 100% and 200% text, in both languages and with both lists chosen;
  - no console errors;
  - no layout-shift entries, including slow hydration and `#lf-p2` / `#lf-p3` deep links;
  - 0 px movement when flipping lists (24 cases, scroll anchoring on and off);
  - no figure blank while visible;
  - no interactive target under 44 px;
  - no small text under 4.5:1;
  - forced colours keep every mark;
  - with reduced motion, no animation runs;
  - without JavaScript the switch works by click and arrow keys.
- On the final build: overflow 0 at 390 and 1280, no page errors, 6 plate elements present, and the rendered text contains none of "Polaków", "w Polsce" or "nosicieli".

## Not verified

- `pnpm db:migrate`, `pnpm test:integration` and `pnpm test:golden` were not run. They need a PostGIS database, which this environment does not have: there is no Docker daemon and no PostGIS extension. The change adds no migration and touches no database code. CI runs all three.
- The page is rendered on every request (`force-dynamic`, as before). The landing HTML is about 330 KB raw, of which the atlas markup is about 120 KB. No performance budget exists to check it against.
- Screen readers were not tested with real assistive technology. The accessibility tree was inspected through Playwright only.
- The rendered text contains "pochodzi z rejestru" twice. That is `main`'s existing landing footer ("Każda liczba pochodzi z rejestru PESEL…"), which is outside the atlas and was not changed; the atlas's own copy guard passes.
