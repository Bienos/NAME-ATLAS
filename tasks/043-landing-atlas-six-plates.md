# TASK-043 — The landing atlas becomes six plates about the two published lists

- **Status:** IMPLEMENTED AND VERIFIED (2026-09-30). The verification actually run is in `docs/progress/2026-09-30-landing-atlas-six-plates.md`. `pnpm db:migrate`, `test:integration` and `test:golden` were not run (no PostGIS here), and GitHub Actions starts no job (`STATUS.md`).
- **Requested by:** the project owner, 2026-09-30.
  - "I think that landing page is over compalicated tbh", then "think again about what we could showcase on main page".
  - Shown every design built so far, they chose the second, the six-plate atlas mock-up: "go wtih 2 push live".
- **Milestone:** none in `PLAN.md`, like TASK-040.
- **Depends on:** TASK-040: the list-facts artefact (ADR-0015), its generator and the landing wiring.
- **Replaces:** TASK-040's plates I–III on the landing page. Their data stays in the artefact, and nothing renders them.

---

## 1. Goal

Below the search, the landing page shows the section "Atlas nazwisk": six plates, each making one point about the two published PESEL national lists.

| Plate | Point | Headline (male list; the female list has its own figures) |
|---|---|---|
| I Gwiazdozbiór | every surname is one dot | "Każde nazwisko to jeden punkt." |
| II Połowa | how concentrated the list is | "Połowa mężczyzn nosi jedno z 4210 nazwisk." |
| III Rzadkość | rare surnames are most surnames | "106 813 nazwisk nosi dokładnie dwóch mężczyzn." |
| IV Końcówki | a spelling, shared by many | "Co czwarty mężczyzna nosi nazwisko na -ski." |
| V Alfabet | people by first letter | "Najwięcej mężczyzn ma nazwisko na K." |
| VI Dwie listy | the two lists compared as sets | "229 788 nazwisk jest na obu listach." |

- A switch shows the plates for the male or the female list. The two lists are never summed.
- A coda says that a trend needs a second edition of the register.
- The visual source is the mock-up the owner chose (the "Polska w nazwiskach" draft), adapted as §2 states.

## 2. Decisions this task records

1. **ADR-0018** (Proposed; accepted by merging).
   - A plate names a surname only when a fixed list-scope rule selects it, and only at 20 people or more.
   - The two lists' sets of surnames may be compared, as counts of surnames.
2. **Title.** The section keeps the title "Atlas nazwisk". The mock-up's "Polska w nazwiskach" reads as a claim about Poland, which the wording rules forbid.
3. **No random draw.** The mock-up's "Losuj rzadkie nazwisko" button is dropped: a surname carried by exactly two people points at one family. Plate III says instead that the publisher omits surnames with one bearer.
4. **Every figure on the page is a stored value.**
   - The page formats values; it adds, subtracts and divides nothing.
   - Where a sentence needs a combined figure (e.g. "fewer than 10 bearers"), the generator stores it.
5. **Named surnames are shown as published, as text.**
   - The page shows the source string (`NOWAK`, `ŻMUDA-TRZEBIATOWSKA`), as the search result does.
   - They are not links. Production's search answers only the seven surnames its database holds, and linking waits until the database holds the full register (the Oracle Cloud database work, #35).
6. **Wording.**
   - "Ó" is "the rarest letter of the Polish alphabet that starts a surname": the lists also hold surnames that begin with letters outside the Polish alphabet.
   - An ending is a spelling, never an origin ("Liczymy zapis końcówki, nie pochodzenie nazwiska").
   - Letters with no surname are stated as absent, not as a count of zero people.
   - The mock-up's "Mazur" example is dropped (TASK-040 U-2); plate VI uses the ADR-0018 selections.
7. **Plate I is drawn in the browser.**
   - A small client island paints one dot per surname on a canvas from the list's stored `dots` (each distinct count with how many surnames have it).
   - Positions and sizes are presentation geometry.
   - With reduced motion it draws once. Its figures are server-rendered beside it.

## 3. The artefact: `list_facts@2`

`list_facts@1`'s sections stay as they are. Each list gains the sections below, each with a method version. Every array has a fixed order, and both lists use the same parameters.

- **`dots`**: every distinct count on the list, ascending, with the number of surnames that have it. The surnames add up to `summary.surnames`, and count × surnames adds up to `summary.people`.
- **`concentration`**:
  - for q ∈ {0.1, 0.5, 0.9}, the smallest number of the most common surnames whose people are at least q of the list, and those people;
  - `beyond_half`: the surnames outside the q = 0.5 set.
- **`bands`**: for 2, 3–9, 10–99, 100–999, 1000–9999 and 10 000+ bearers, the surnames and the people.
  - They add up to the list's surnames and people (schema refinement).
  - Also stored: `under_10`, the surnames with fewer than 10 bearers.
- **`endings`**: per list, a fixed disjoint set of endings, with surnames, people and share of people for each.
  - Male list: `-ski -ak -ek -cki -ik -czyk -uk -ewicz -owicz`.
  - Female list: `-ska -ak -ek -cka -ik -czyk -uk -ewicz -owicz`.
  - An ending is matched on the key's last letters. The schema refuses two endings where one is a suffix of the other.
- **`initials`**:
  - for each letter of the Polish alphabet plus Q, V and X: the surnames and people whose key starts with it, or `absent: true`;
  - also stored: `top` (the letter with the most people), `rarest_polish` (the Polish letter with the fewest people among the letters present), and `outside` (surnames and people whose first letter is none of these).
- **`hyphenated`**: the surnames containing a hyphen and their people; `top`, the ADR-0018 `HYPHENATED_TOP` selection (key, published string, count), or `null` below the floor.
- **`named_top`**: the ADR-0018 `TOP_3` selection.

At artefact level:

- **`overlap`**:
  - `male_only`, `both` and `female_only`, compared by `canonical_key_v2`, which the schema checks add up to each list's surnames;
  - `on_both_top`: the ADR-0018 selection, with its count on each list;
  - `one_list_top`: per list, the ADR-0018 selection.

## 4. In scope

1. `packages/contracts/src/list-facts.ts` → `list_facts@2`, with tests; `docs/contracts/list-facts.md` (version history, the ADR-0018 amendments).
2. `packages/truth/src/list-facts/`: the new pure derivations with tests on synthetic lists; method versions; the generator; the regenerated artefact.
3. `apps/web`:
   - the six plates and the coda, replacing TASK-040's plates I–III and their now-unused code and styles;
   - the plate I canvas island;
   - the list switch;
   - messages in Polish and English;
   - tests.
4. ADR-0018, a one-line note in `ARCHITECTURE.md` §10, this task file, `STATUS.md`, `docs/CODEMAP.md` and a `docs/progress/` record.

## 5. Out of scope

- Regional figures on the landing (a map) and per-voivodeship leaders (TASK-040 U-3).
- Any trend. Only 2026-01-20 is ingested.
- The hero and the search, which stay as they are.
- Removing TASK-040's derivations from the artefact.

## 6. Acceptance criteria

- **AC-01:** The v2 schema accepts the artefact and rejects each of the following:
  - bands, dots or overlap parts that do not add up;
  - overlapping endings;
  - a named selection below the floor;
  - different parameters on the two lists.
- **AC-02:** Each new derivation is tested on synthetic lists with hand-computed answers, including ties and the floor.
- **AC-03:** `pnpm truth:list-facts` run twice writes byte-identical output. Every plate figure agrees with an independent recomputation from the raw CSVs, and the progress record shows both.
- **AC-04:** The landing renders the six plates for both lists from `listFacts()`.
  - No rendered figure is a sum across the two lists.
  - The page computes no figure.
  - TASK-040's AC-07 copy guard passes over the new markup.
  - All three are tested.
- **AC-05:** Every surname string in the markup is one of the artefact's selections, at or above the floor, and none is a link (tested).
- **AC-06:** If `listFacts()` throws, the landing renders without the atlas (tested).
- **AC-07:** The page has no horizontal overflow at 360, 390 and 1280 px, and every interactive target is at least 44 px. With reduced motion every figure is present in its final state. Checked with Playwright on a built app; screenshots are in the progress record.
- **AC-08:** `pnpm check:ids`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` and `pnpm build` pass.

## 7. Definition of done

- Every acceptance criterion is shown by a command or test that was run.
- The progress record lists the real results.
- Merge. `main` deploys to production. Verify the landing live with curl.

**STOP.** Nothing further.
