# 2026-09-30 — TASK-043: the landing atlas becomes six plates about the two published lists

The project owner chose the second of the landing designs shown to them, the six-plate atlas mock-up ("go wtih 2 push live"). After stopping the search work (TASK-041, "stop search i working on adding orcale data base"), they confirmed that this should go ahead: "Yes, keep building it".

## Changed

- **ADR-0018** (Proposed; accepted by merging): a plate may name a surname only when a fixed list-scope rule selects it, and only at 20 people or more. The two lists' sets of surnames may be compared, as counts of surnames. It amends ADR-0015 §2.7 and two rules of `docs/contracts/list-facts.md` for exactly these cases. One line in `ARCHITECTURE.md` §10.
- **`packages/contracts`:** `list_facts@2`. Every `list_facts@1` section and refinement is kept.
  - New per-list sections: `dots`, `concentration`, `bands` (with `under_10`), `endings`, `initials`, `hyphenated` and `named_top`.
  - New artefact-level section: `overlap`, with `on_both_top` and `one_list_top`.
  - Refinements:
    - the dots, bands and overlap sums must add up;
    - no ending may be a suffix of another;
    - the 35 letters appear once each, in a fixed order;
    - every named selection has a count of at least `NAMED_SURNAME_FLOOR` (20);
    - both lists use the same parameters.
  - Also updated: `docs/contracts/list-facts.md` (shape, amendments, version history).
- **`packages/truth`:**
  - New derivations, each with a unit-test file on synthetic lists: `rows`, `dots`, `concentration`, `bands`, `endings`, `initials`, `hyphenated`, `selections` and `overlap`.
  - Method versions `list_*@1` and pipeline `list_facts_pipeline@2`.
  - Ties go to code-point order of the key. The concentration threshold is decided in integers.
  - The regenerated artefact is `src/generated/list-facts.ts`.
- **`apps/web`:** plates I–III of TASK-040 are replaced by six plates (Gwiazdozbiór, Połowa, Rzadkość, Końcówki, Alfabet, Dwie listy) and a coda, in Polish and English.
  - `list-atlas-sky.tsx` is new: one canvas per list, one dot per surname, painted in slices when it nears the screen.
  - `list-atlas-layout.ts` and its test are removed.
  - The copy, styles, fixture and tests are rewritten.
- **Wording, as the task decided:**
  - the section is titled "Atlas nazwisk";
  - there is no random draw of a rare surname;
  - "Ó" is "the rarest letter of the Polish alphabet that starts a surname";
  - an ending is a spelling, not an origin;
  - letters with no surname say "brak", never 0;
  - named surnames are the published string, as plain text, never links, because production's search answers only the seven surnames its database holds.
- `docs/CODEMAP.md`, `STATUS.md` and this record.

## Verified

### Commands

All of these were run on the final tree: `origin/main` @ `1e9fa81` plus this change.

| Command | Result |
|---|---|
| `pnpm check:ids` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm test` | exit 0. apps/web 26 files, 280 tests; contracts 90; truth 309; sources 509; resolver 102; logging 24; seo 18; admin 14; queue 9; db 8; domain 7; testing 3; worker 2 |
| `pnpm build` | exit 0: web "Compiled successfully", admin "Compiled successfully" |

### The artefact

- **Byte-identical regeneration:** `pnpm truth:list-facts` was run twice, each time writing sha256 `c1835039695e4c4b74524764cff721536934036d3f4d76b448142cf574b9bb96`, and `cmp` found no difference. A third run on the final tree, with `--dir` set to the four official CSVs, wrote the same bytes: `git diff` is empty.
- **`list_facts@1` sections unchanged:** the v1 sections (partition, source, assessment, summary, collision, crowd, birthday reference) are deep-equal to the TASK-040 artefact.
- **The builder's recount** reads the raw CSVs with Python's `csv` module and has its own `canonical_key_v2`. It gave 56 PASS, 0 FAIL. With two values edited in a copy of the artefact, it reported 2 FAIL.
- **The independent reviewer's recount** did not use the builder's script. It gave 263 PASS, 0 FAIL on every `list_facts@2` field for both lists and the overlap. Five negative controls gave 6 FAIL. The values it confirmed:
  - **Size:** male 408 182 surnames and 21 197 537 people; female 420 082 and 21 560 302.
  - **Concentration (surnames at q 0.1, 0.5, 0.9):** male 89 / 4 210 / 71 749; female 89 / 4 191 / 70 975.
  - **Surnames with exactly two bearers:** 106 813 and 118 775.
  - **Fewer than 10 bearers:** 268 237 and 280 893.
  - **Endings:** -ski is 0.249776566 of men; -ska is 26.1% of women.
  - **First letters:** Ą, Ę and Ń start no surname on either list. K is the top letter, with 3 045 620 men. The rarest Polish letter is Ó: 9 surnames and 32 men, 8 and 23 women.
  - **Hyphenated:** 10 604 surnames with 34 346 men, top ŻMUDA-TRZEBIATOWSKI (224); 28 420 surnames with 75 518 women, top ŻMUDA-TRZEBIATOWSKA (228).
  - **Top three:** NOWAK, KOWALSKI, WIŚNIEWSKI / NOWAK, KOWALSKA, WIŚNIEWSKA.
  - **Overlap:** 178 394 surnames on the male list only, 229 788 on both, 190 294 on the female list only.
  - **Cross-list selections:** on both lists, NOWAK (98 387 men, 99 738 women); male list only, POZNAŃSKI (2 012); female list only, WIŚNIEWSKA (54 177).
- **One mock-up figure was wrong:** "75 799" surnames at 90% of men. The artefact's 71 749 is the value both recounts confirm.

### The page

- **Numbers:** the reviewer rendered the atlas with `renderToStaticMarkup` and read the built app with curl. Every number shown on the six plates, the coda and the head, for both lists in Polish and English, is the right stored value in the right place: 51 PASS, 0 FAIL.
- **Browser check:** Playwright on `next start` of the final build (Chromium, deviceScaleFactor 2):

| Case | Switching lists | Canvases | Other |
|---|---|---|---|
| 390 px, reduced motion, CPU 4× slower | handler 5 ms, next frame 69 ms | both painted | no horizontal overflow, no console error |
| 390 px, motion, CPU 4× slower | handler 4 ms, next frame 98 ms | both painted | no horizontal overflow, no console error |
| 1280 px, motion, normal CPU | handler 2 ms, next frame 39 ms | both painted | no long task after the switch; no horizontal overflow, no console error |

  - Before the fix below, the reviewer measured 1 129–1 301 ms per switch at 4× CPU.
  - At 4× CPU, painting still produces tasks of 50–81 ms. At normal speed there is none.
- **Earlier builder checks:** in 12 combinations of width (360, 390, 1280), list and motion, the builder found no overflow, and every interactive target in the atlas is at least 44 × 44 px.
  - The keyboard moves the radio switch.
  - Without JavaScript the switch still works through CSS.
- Screenshots were taken but are not committed.

### Review findings, and what was done

- **M1 — switching lists blocked the main thread**, because one canvas redrew about 400 000 dots. **Fixed:**
  - each list now has its own canvas in its own variant, so the switch is CSS only;
  - each canvas paints once, in slices, when it comes near the screen;
  - with reduced motion it is painted off screen and shown in one step.
- **L1 — wrong verb in plate III's female headline** ("118 775 nazwisk nosi dokładnie dwie kobiety"). **Fixed** with fixed verbs: "nosi dokładnie dwóch mężczyzn" and "noszą dokładnie dwie kobiety".
- **L2 — the "prints only stored values" test was too loose.** It allowed numbers from `dots`, `collision` and `crowd`, which no plate prints. **Fixed:** those sections are left out of the allowed set.
- **L3 — without `:has()`, the canvas followed the radio while the text stayed male.** **Fixed** by M1's change: the canvas is switched by the same CSS as the text.
- **L4 — plate V's counts were 10.5 px.** **Fixed:** they are 0.75 rem.
- **Nits, fixed:**
  - The lede now says plates I–V show the chosen list and plate VI compares both.
  - "Nazwiska dwuczłonowe" is now "Nazwiska z łącznikiem" (EN "hyphenated"), because the rule counts keys that contain a hyphen.
- **Nit, not changed:** without JavaScript, plate I's canvas stays blank inside its rings. The figures beside it are server-rendered.

## Not verified

- `pnpm db:migrate`, `pnpm test:integration` and `pnpm test:golden`: they need PostGIS, which is not available here.
- **CI:** GitHub Actions starts no job (`STATUS.md`), so there is no CI result.
- **The deployment:** production after the merge is not recorded here.
