# TASK-041 — The search answers for every surname, from published figures built at deploy time

- **Status:** IN PROGRESS (2026-09-30).
- **Requested by:** the project owner, 2026-09-30. Asked what the main page should showcase, they chose "both in that order": first make the search work for every surname, then simplify the landing page.
- **Milestone:** none in `PLAN.md`. Production's search answers for 7 surnames (TASK-035 parked), so this is a working answer for everyone else.
- **Depends on:**
  - the PESEL registry, parsers and `fetch-pesel` (`packages/sources`);
  - the completeness gate, the confidence rules and `evaluateSurface`;
  - `buildRankTable`/`rankInTable`, `oneInX`, `shareOf` and the distribution helpers (`packages/truth`);
  - the resolver's `validateSurnameInput`, `canonicalKey` and `polishDiacriticFold`;
  - ADR-0015's pattern.
- **Blocks:** the landing simplification (next task), which shows real results for its example surnames.

---

## 1. Goal

Anyone who types their surname gets an answer, whatever the database holds. The answer gives:

- how many men and how many women carry it (the two national lists);
- its rank and "about 1 in X" on each list;
- the voivodeships where people carrying it are registered for permanent residence, when the regional files have cells for it.

## 2. Decisions this task records

1. **ADR-0016** (Proposed; accepted by merging): published figures are built at deploy time and never committed. Rank, "1 in X" and shares are derived per request by `packages/truth`.
2. **Which source answers.** The claim chain answers when its rarity section is READY. Otherwise published figures answer if they hold the surname. The seven database surnames have population claims only, so published figures answer for them too. Each response says which source answered.
3. **Contract `surname-result` 2.0.**
   - `surname.id` and `place_id` become nullable.
   - When `place_id` is null, `terc_code` is required.
   - A required `provenance` is added: `basis` `CLAIM_CHAIN` or `PUBLISHED_FIGURES`, plus the artefact's resources when it is published figures.
   - A refinement ties it together: PUBLISHED_FIGURES ⇔ `surname.id` null ⇔ artefact present.
   - The web app is the only known consumer of the API. 1.6 is not served after this change.
4. **Visibility.** Published-figures answers are shown inline on `/?surname=` and returned by `/api/v1/surname-results`. They are never indexed and never in the sitemap, and they have no canonical route or share card (ADR-0016 §2.6). Suggestions come from prefix shards and carry names only.
5. **Absence is not zero.**
   - A surname with no regional cell gets distribution UNAVAILABLE (`NO_APPLICABLE_EVIDENCE`).
   - A surname on one list only gets one observation and one rarity entry.
   - Meaning stays `NO_SOURCED_MEANING`, as it is today.

## 3. In scope

1. **`packages/contracts`:** `surname-result.ts` 2.0 with tests; `published-figures.ts`, the manifest schema, with tests. **Docs:** `docs/contracts/surname-result.md` (version history and rules) and `docs/contracts/published-figures.md`; `surname-prefix.md` names the service and "code-point order".
2. **`packages/truth/src/published-figures/`:**
   - the build (four files → manifest, key shards, prefix shards; deterministic; typed refusals);
   - the reader interface;
   - `publishedFiguresResponse` (pure, reusing `query.ts`'s projectors);
   - a method version;
   - tests on synthetic lists, plus the fixture refusal.
3. **`packages/truth/bin/build-published-figures.ts`:** `--data-dir`, `--out`, `PUBLISHED_FIGURES=auto|required`, and a fetch into a cache directory when required.
4. **`querySurnameResult`:** the published-figures answer on UNKNOWN, and when the claim chain's rarity section is not READY. A reader error while the manifest is PRESENT gives UNAVAILABLE, never "not found".
5. **`packages/resolver`:** a pure `prefixFromShard` reusing the existing validation, key and fold.
6. **`apps/web`:**
   - a store that reads the shards (`readFile`, zod on the manifest, fail-soft to ABSENT);
   - `page.tsx` passes the reader and skips `currentPathFor` when `surname.id` is null;
   - `/api/v1/surname-results` passes the reader;
   - `/api/v1/surname-prefix` answers from prefix shards when PRESENT;
   - `/api/health/published-figures`, which reads the manifest only;
   - `result-view.tsx` keys regions by `terc_code`;
   - `compare-view.tsx` is null-safe;
   - `next.config.ts` traces the generated files;
   - the `build` script chains the generator;
   - `.gitignore` gets `apps/web/generated/`.
7. **Docs:** ADR-0016, a note in `ARCHITECTURE.md` §10, this task file, `STATUS.md`, `docs/CODEMAP.md` and a `docs/progress/` record.

## 4. Out of scope

- Canonical routes, slug index, share cards and sitemap for published-figures surnames.
- A fallback when the database is down.
- Fuzzy "did you mean" for surnames that are nowhere.
- Meaning.
- Indexing.
- The landing redesign (next task).
- Trends.
- Committing data.

## 5. Acceptance criteria

- **AC-01:** Contract 2.0 accepts a CLAIM_CHAIN response with ids and a PUBLISHED_FIGURES response without them. It rejects every mixed case, and a null `place_id` without `terc_code`.
- **AC-02:** The build refuses the committed fixture excerpts (completeness gate), a checksum mismatch, a duplicate key, and an unmapped voivodeship. On synthetic complete lists it writes byte-identical output twice.
- **AC-03:** `publishedFiguresResponse` equals the helpers' rank, "1 in X", shares and coverage. A one-list surname gets one entry per section, and a surname without cells gets UNAVAILABLE.
- **AC-04:** `querySurnameResult` with a stub reader behaves as follows:
  - UNKNOWN + hit gives RESOLVED with PUBLISHED_FIGURES;
  - a miss gives UNRESOLVED as today;
  - a reader error while PRESENT gives UNAVAILABLE;
  - a complete claim-chain answer never calls the reader.
- **AC-05:** `pnpm truth:published-figures` on the official files writes 598 476 keys. Two runs are byte-identical. Figures for sample surnames match an independent recomputation from the raw CSVs. All of this is recorded.
- **AC-06:** A built app with the generated files answers `/?surname=` and the API for surnames outside the database. Suggestions return names only, with no count, and the page is `noindex`. Without the files, the app behaves exactly as before.
- **AC-07:** `pnpm check:ids`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` and `pnpm build` pass.

## 6. Definition of done

- Every acceptance criterion is shown by a command or test that was run.
- The progress record lists the real results.
- Going live: set `PUBLISHED_FIGURES=required` on Vercel, merge, deploy `main`, and verify on production with surnames outside the database.

**STOP.** The landing redesign is the next task.
