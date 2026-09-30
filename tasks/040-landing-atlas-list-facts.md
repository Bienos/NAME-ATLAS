# TASK-040 — Landing atlas, part 1: statistics about each whole published list, in three plates

- **Status:** IMPLEMENTED AND VERIFIED (2026-09-30), not yet merged. The verification actually run is in `docs/progress/2026-09-30-landing-atlas-list-facts.md`; `pnpm db:migrate`, `test:integration` and `test:golden` were not run here (no PostGIS), and CI runs them.
- **Requested by:** the project owner, in the session that produced the "Atlas nazwisk" mock-up.
  - The request: "the main landing page is going to be all about like putting your surname in … but like on the main website, I will also like have some sort of like designed … interesting facts, like a general information about like the current state of the … surnames … so something general in terms of like the overall number … Think about it first … and then apply these changes."
  - After reviewing an 11-plate mock-up: "go ahead" (2026-09-30).
- **Milestone:** none in `PLAN.md`. `docs/canonical/21` §32 and §115 list popular-surname data pages as P0/P1 candidates, and `STATUS.md` records that work runs ahead of `PLAN.md`'s order.
- **Depends on:**
  - the PESEL registry descriptors and parsers (`packages/sources`, TASK-004);
  - the completeness gate (TASK-009), the derived-statistic confidence rule and `evaluateSurface`;
  - the landing page as redesigned in #11.
- **Blocks:** the later atlas plates (§6).

---

## 1. Goal

Put the first three plates of the "Atlas nazwisk" on the landing page, below the search and the most common surnames. Each plate states one surprising, true statistic about a **whole published list**, with its own graphic:

- **Plate I, Suwak.** The typical surname and the typical person's surname: 5 bearers against 738 on the male list.
- **Plate II, Sala.** How many people must enter a room before two share a surname: 82.
- **Plate III, Tłum.** How many different surnames a crowd of 1 000 carries: about 921.

## 2. Outcome

- `pnpm truth:list-facts` turns the two official national files into `packages/truth/src/generated/list-facts.ts`, which is committed. It refuses unless:
  - the files match the registry's SHA-256 and size;
  - the completeness gate passes;
  - the confidence rule says VERIFIED;
  - the FREE surface is allowed.
- The landing page, with no query, renders the three plates from `listFacts()`. It shows the male and female lists side by side (one at a time on phones, behind a switch) and never sums them. Every figure has a source line and the snapshot date.

## 3. Authority

- `ARCHITECTURE.md`:
  - §5, "No UI derives `Claim`s";
  - §6, the frontend never derives a fact;
  - §10, invariants 1, 3, 4, 5, 10 and 11.
- `AGENTS.md` §10, the standing invariants.
- ADR-0001 §2 (no dataset-global snapshot, and changing it needs an ADR). ADR-0012 (the source is linked). **ADR-0015** (this task's data path).
- `docs/contracts/surname-result.md`: the count wording rules ("Never 'of Poles', 'in Poland'"; the two sexes are two entries and nothing sums them).
- `docs/sources/pesel.md`: living persons, current surname, surnames with one bearer omitted by the publisher, and absence is not zero.
- TASK-035 §0: why production cannot hold the universe these figures need.

## 4. Decisions this task records

1. **Data path.** ADR-0015: list-scope statistics are derived offline by `packages/truth` into a committed, SHA-pinned, schema-validated module. The web app only renders it.
2. **No named surname in part 1.**
   - The plates show list-scope figures and unnamed model examples: pairs, groups, "the list's most common surname".
   - A named example is a surname claim. It waits for the claim chain or a surname projection (TASK-035 §0).
3. **The model is stated wherever a probability appears.** People are drawn at random, without replacement, from the people counted on one published list. The birthday figure (23 people, 365 equally likely days) is a fixed model constant, labelled as such, and not PESEL data.
4. **Seeded examples are illustrations, not facts.**
   - The example rooms and the example crowd are drawn with recorded seeds in the generator, not in the page.
   - The page labels them "w tym losowaniu" (in this draw).
5. **Precision.**
   - Values are stored rounded to 9 decimals, never to display precision. Every threshold decision (`n_half`, `reach_half`) is made on the unrounded value. Rounding for display is presentation.
   - Probabilities near one half are shown to two decimals, so that 49,72% and 50,56% are not both "50%".
   - Counts are exact.

## 5. In scope

1. `packages/contracts/src/list-facts.ts` (the schema and its tests) and `docs/contracts/list-facts.md`.
2. `packages/truth/src/list-facts/`:
   - the pure derivation functions (summary, collision, crowd) with unit and property tests;
   - the method versions in `src/version.ts`;
   - `listFacts()`, which validates the committed module.
3. `packages/truth/bin/build-list-facts.ts`, `pnpm truth:list-facts`, and the generated `packages/truth/src/generated/list-facts.ts`.
   - The generator checks the bytes the way `fetch-pesel` does, so `packages/sources` exports `localFileName` and `verifyResourceBytes`.
   - It formats its output with prettier's API, so `@name-atlas/truth` declares `prettier` (the root's exact version, already in the lockfile) as a devDependency.
4. `apps/web`:
   - the atlas section with plates I–III;
   - its list switch (a small client island);
   - its messages in Polish and English;
   - its styles and tests;
   - the landing page wiring, which fails soft.
5. ADR-0015 and a one-line amendment note in `ARCHITECTURE.md` §10.
6. `PRODUCT.md` §5: one scope line, as in the U-1 precedent of `tasks/drafts/family-surnames-stateless.md`.
7. This task file, `docs/CODEMAP.md`, `STATUS.md` and a `docs/progress/` record.

## 6. Out of scope

- **The other eight plates of the mock-up.** Each needs a decision first:
  - **IV Słownik** (ordinary words that are surnames) and **V Lustro** (the male and female lists compared by rank): they print named surnames and word lists, which needs U-1 and U-2.
  - **VI–VIII** (every person as a dot, the balance, the map) and **IX–X** (per-voivodeship leaders and signature surnames): they use the regional files, named surnames and per-voivodeship ranks, which needs U-1, U-2 and U-3.
  - **XI Skorowidz** (look up any surname): it needs the full register behind the resolver, which is TASK-035 or a surname projection (U-4).
- Loading anything into the hosted database, or any migration.
- A trend across snapshots. Only 2026-01-20 is ingested, and TASK-025 refuses comparisons across dates.
- Any change to `docs/canonical/`.

### Unresolved decisions for the later plates

- **U-1 — a display floor for small counts.** No rule exists. The regional minimum is 2 (`docs/sources/pesel-regional.md`).
  - **Recommended:** a projection-level suppression rule. Named surnames and regional cells with fewer than 20 people are not printed, and suppressed cells are never labelled as a value.
- **U-2 — surnames that are also nationality or other sensitive words** (e.g. Niemiec, Turek, Polak). No rule exists; `PRODUCT.md` forbids inferring ethnicity.
  - **Recommended:** never juxtapose them with nationality or origin framing, and keep them out of word-list plates.
- **U-3 — a per-voivodeship leader.** It needs a method (ties, regional coverage per list) and wording ("najczęstsze wśród zameldowanych na pobyt stały w …"). The wording rules forbid an unqualified "in {region}".
- **U-4 — a lookup of any surname inside the atlas.** Production holds seven surnames. The lookup must go through the resolver and the claim chain, not a client-side list.

## 7. Acceptance criteria

- **AC-01:** `listFactsArtefactSchema` rejects:
  - a list under the wrong key;
  - mismatched snapshot dates;
  - a missing assessment;
  - out-of-range fractions.

  Tests in `packages/contracts`.
- **AC-02:** Each pure derivation function is tested on synthetic lists with hand-computed answers:
  - summary: medians, thresholds and quantiles;
  - collision: exact without-replacement probability, `n_half` and the 1-in-X for a pair;
  - crowd: expected distinct count, share without a namesake and `reach_half`.
- **AC-03:** Derivation over the committed fixture excerpts (`fixtures/pesel`) fails closed at the completeness gate.
- **AC-04:** The committed module parses. For each list, its lineage (resource id, SHA-256, row count, snapshot date) equals the registry, and it passes internal consistency:
  - the curve increases;
  - `n_half` agrees with the curve;
  - thresholds are monotone;
  - expected distinct counts increase and never exceed n or the number of surnames.
- **AC-05:** `pnpm truth:list-facts` run twice on the official files writes byte-identical output. Its values agree with an independent recomputation from the raw CSVs to the stored 9 decimals, or to a relative 1e-12 where the recomputation itself is floating point. Both are recorded in the progress record.
- **AC-06:** With no query, the landing page renders plates I–III from `listFacts()`. Each fact card names both lists with their own figures. No rendered figure is a sum or union of the two lists (tested).
- **AC-07:** No surname string appears in the artefact or in the atlas markup. A copy guard over the atlas markup finds none of: "pochodzi", "mieszka", "urodzon", "Polaków", "w Polsce", "comes from", "lives in", "of Poles", "originat" (tested).
- **AC-08:** If `listFacts()` throws, the landing page renders without the atlas section (tested).
- **AC-09:** Every motion rule sits inside `@media (prefers-reduced-motion: no-preference)`, uses the motion tokens, and is only reveal, connect or travel. With reduced motion, every figure is present in its final state.
- **AC-10:** The page has no horizontal overflow at 360, 390 and 1280 px, and every interactive target is at least 44 px. SVG graphics have `role="img"` with a label, or are `aria-hidden` with the fact card carrying their content. Checked in a built app with Playwright; screenshots are in the progress record.
- **AC-11:** `pnpm check:ids`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` and `pnpm build` pass.

## 8. Verification

```bash
pnpm truth:list-facts && cp packages/truth/src/generated/list-facts.ts /tmp/lf1.ts \
  && pnpm truth:list-facts && cmp /tmp/lf1.ts packages/truth/src/generated/list-facts.ts
pnpm check:ids && pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm build
```

`pnpm db:migrate`, `pnpm test:integration` and `pnpm test:golden` need a PostGIS database. The progress record says whether they ran.

## 9. Definition of done

Every acceptance criterion is shown by a command or test that was run, and the progress record lists the real results. `STATUS.md` and `docs/CODEMAP.md` are rewritten. The pull request is open against `main`. **STOP.** The later plates are separate tasks.
