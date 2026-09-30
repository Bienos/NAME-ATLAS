# 2026-09-30 — TASK-044: the landing atlas's last panel shows how the two lists changed, 2020–2026

The project owner asked for the last panel to use more data, and chose "Real trend 2019–2026" from three options. The registry held only the 2026 editions. dane.gov.pl publishes the dataset's earlier editions, which were read to build this panel.

## Changed

- **ADR-0019** (Proposed; accepted by merging):
  - editions of one published list may be compared within a declared series;
  - 2019 is left out, because its universe description differs;
  - the female file dated 2022-01-27 is refused as a byte-identical duplicate of 2021-02-02;
  - no causes are given;
  - no surname is named for its growth;
  - named surnames link to the search.

  One line in `ARCHITECTURE.md` §10.
- **`packages/sources`:**
  - eleven national descriptors (male 2020–2025, female 2020, 2021, 2023, 2024 and 2025), each SHA-pinned;
  - a `series` key on every national descriptor;
  - `PESEL_NATIONAL_SERIES`;
  - `PESEL_REFUSED_RESOURCES` (38772);
  - `pnpm fetch:pesel --series`.

  `retrieved_at` is each file's download time. `findPeselResource` does not return the earlier editions, so no surname claim is built from them.
- **`packages/contracts`:** `list_facts@3`, which adds to each list:
  - `editions`: each edition's lineage, surnames, people and floor, plus the gaps with their reason;
  - `change`: first against last, the surnames on only one of them, the first-edition counts of `TOP_3`, and whether the top ten are unchanged.

  Refinements refuse:
  - editions out of order;
  - a gap without a reason;
  - deltas that are not last − first;
  - mixed series;
  - a shared SHA-256;
  - different publication floors.

  `docs/contracts/list-facts.md` is updated, including its rule 9: a named surname may link to `/?surname=`.
- **`packages/truth`:**
  - `editions.ts` and `change.ts`, with tests;
  - `list_editions@1`, `list_change@1` and `list_facts_pipeline@3`;
  - the generator gates every edition as it gates 2026, and refuses `SERIES_MISMATCHED`, `DUPLICATE_EDITION` and `FLOOR_MISMATCHED`;
  - the regenerated artefact.
- **`apps/web`:**
  - Plate VII · Zmiany w czasie replaces the one-edition coda, per list:
    - a headline worded by the sign of the stored change;
    - a column chart, where a gap is a low dashed outline marked "brak";
    - a table of editions, with the gap row giving its reason;
    - the surnames on only one edition, with "not on the list is not zero";
    - the top three first → last;
    - whether the top ten are the same;
    - why 2019 is left out, and "what changed, not why".
  - Named surnames on plates I, VI and VII link to `/?surname=` (`&lang=en` on the English page).
  - Polish and English copy, fixture and tests.
- `STATUS.md`, `docs/CODEMAP.md`, this task file and this record.

## Verified

### Commands

All run on the final tree, `main` @ `b156bd8` plus this change:

| Command | Result |
|---|---|
| `pnpm check:ids` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm test` | exit 0. web 295; truth 341; contracts 106; sources 525; resolver 102; logging 24; seo 18; admin 14; queue 9; db 8; domain 7; testing 3; worker 2 |
| `pnpm build` | exit 0: web and admin "Compiled successfully" |

### Sources

- **Downloads:** each edition was downloaded from its CSV endpoint. The 2020 male file, downloaded twice, gave the same SHA-256 (`a6af514f…805d`).
- **The 2022 female file:** 38772 and 35279 have the same SHA-256 (`9af26480…62e0`), the same size (4 141 803 bytes) and the same rows (311 240).
  - The builder checked this on the real bytes once, and so did the numbers reviewer.
  - The generator does not download 38772. It refuses it by its recorded SHA-256, and refuses any edition byte-identical to another (`DUPLICATE_EDITION`). The builder checked that refusal once by feeding the real 38772 file in as an edition; the committed test uses synthetic bytes.
- **Publication floor:** every edition from 2019 to 2026 has a smallest count of 2. The generator and the schema now refuse a series whose editions differ.
- **Universe:** the 2019 editions describe their universe as "lista nazwisk … w rejestrze PESEL". Every edition from 2020 on says "osób żyjących (wg pola nazwisko aktualne)".
- **The numbers reviewer, 229 PASS on the sources:** every descriptor's SHA-256, size and row count equals the bytes. Titles, descriptions, `modified`, URLs and `data_date` match the portal. 44646 uses the stated 2023-01-30 rather than the portal's 2023-01-31.

### The artefact

- **Regeneration:** `pnpm truth:list-facts --dir <data>` was run twice on the final tree and wrote byte-identical files, sha256 `4cb8f7396786933ad19cfd59c08a05c8f6fc9143e4e28b1e5494220eaffa7c00`. The builder's two earlier runs wrote the same hash.
- **Earlier sections:** every `list_facts@2` field is unchanged from `b156bd8`'s artefact (32 PASS).
- **The builder's recount:** it uses only Python's `csv` module and its own key, and gave 17 of 17 PASS per list.
- **The reviewer's recount:** it did not read the builder's script, and gave 104 PASS on `editions` and 36 PASS on `change`.

| | Male | Female |
|---|---|---|
| Editions | 2020-01-22, 2021-02-01, 2022-01-27, 2023-01-30, 2024-01-19, 2025-01-22, 2026-01-20 | 2020-01-22, 2021-02-02, 2023-01-30, 2024-01-19, 2025-01-22, 2026-01-20; gap 2022-01-27 (38772 duplicates 35279) |
| Surnames, first → last | 283 221 → 408 182 (+124 961) | 299 612 → 420 082 (+120 470) |
| People, first → last | 19 879 045 → 21 197 537 (+1 318 492) | 20 220 345 → 21 560 302 (+1 339 957) |
| On the 2026 list, not the 2020 one | 129 524 surnames, 434 589 people | 129 203, 468 988 |
| On the 2020 list, not the 2026 one | 4 563 surnames, 11 325 people on 2020 | 8 733, 19 098 |
| Top 3, 2020 → 2026 | NOWAK 101 036 → 98 387, KOWALSKI 68 406 → 66 589, WIŚNIEWSKI 54 343 → 53 079 | NOWAK 102 944 → 99 738, KOWALSKA 69 581 → 67 308, WIŚNIEWSKA 55 553 → 54 177 |
| Top ten the same, in the same order | yes | yes |

### The page

- **Numbers on the page:** 138 PASS. The numbers reviewer read `/` and `/?lang=en` from a built app, and every number on Plate VII, for both lists in Polish and English, is the right stored value. None is a male + female sum. Planted wrong values were each reported as FAIL. That check ran on the build before the review fixes below, which changed wording and layout but no figure; after them, the web tests that check every rendered number against the committed artefact pass.
- **Links:** Playwright on `next start` of the final build ran 24 combinations: Polish and English, 320, 360, 390, 414, 1024 and 1280 px, both lists, reduced motion.
  - 240 visible surname links were checked, and no link's centre is covered by another link.
  - The one exception is the plate VI hyphenated name at 1024 and 1280 px. It wraps at its hyphen, so its box's centre falls in the 4 px between its two lines. A separate check found that each of its two line boxes hits the link, and a click opens `/?surname=ŻMUDA-TRZEBIATOWSKI`, or `…SKA` on the female list.
  - Touch taps on NOWAK, KOWALSKI and WIŚNIEWSKI on plate I at 320, 390 and 414 px each opened that surname.
  - No horizontal overflow and no console error. Every standalone name row is at least 44 px.
- Screenshots of Plate VII at 390 and 1280 px, both lists, were taken but are not committed.

### Review findings, and what was done

- **HIGH — a tap could open another surname.** Inline surname links were padded to 44 px, so a link covered the line above; at 390 px, tapping NOWAK opened WIŚNIEWSKI. **Fixed:**
  - inline names have no padding (WCAG 2.5.8's inline exception);
  - plate I's three names are rows of at least 44 px;
  - the stylesheet test asserts both.
- **MEDIUM — the 2022 gap was drawn as tall as the tallest column.** **Fixed:** it is now a low dashed outline on the baseline, with "brak" under its year.
- **LOW — nothing was shown when the top ten differ.** **Fixed:** the page now says they are not the same (`lfP7Top10Changed*`), tested with the fixture's female list.
- **LOW — the same floor was assumed, not enforced.** **Fixed** with a schema refinement and a generator refusal (`FLOOR_MISMATCHED`), both tested.
- **LOW — 38772's bytes are not re-read on regeneration.** **Recorded above:** checked once on the real bytes by two agents; the generator refuses it by its recorded SHA-256.
- **LOW — "r." and the arrow could break onto their own line.** **Fixed** with no-break spaces.
- **LOW — the blue columns were not explained.** **Fixed:** the lede says they are the two editions compared.
- **LOW — the cause-word guard missed words.** **Fixed:** added cudzoziem, obywatel, ukrai, przybył, ubył, narodow, foreign, citizen, immigr and nationalit.
- **TRIVIAL — the English foot's wording.** **Fixed.**
- **Source metadata — `retrieved_at` was a placeholder time.** **Fixed:** each descriptor now carries its file's actual download time.

### Production before this change

Found while this change was reviewed:

- `b156bd8` (TASK-043) was deployed to production at 17:31 and 17:42 UTC.
- At 17:44, a production deployment of the older `1e9fa81` (`dpl_7TRC2cdHNf2NUognTgRV7N6sFQNg`) put TASK-040's three plates back.
- `curl` at 18:02, 18:25 and 18:58 found "Suwak", "Sala" and "Tłum".
- At 19:03 production was deployed from `b156bd8` again (`dpl_3Zf5iXwoTTmDfMRj6MR3RuYiPTc5`), and `curl` at 19:06 and 19:09 found the six plates.
- Vercel names the account `bienos` for all of them. Why `1e9fa81` was redeployed is not recorded.

## Not verified

- `pnpm db:migrate`, `pnpm test:integration` and `pnpm test:golden` need PostGIS, which is not available here.
- **CI:** GitHub Actions starts no job, so there is no CI result.
- **The deployment of this change:** production after the merge is not recorded here.
