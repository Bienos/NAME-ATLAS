# ADR-0015 — statistics about a whole published list are derived offline into a committed, SHA-pinned artefact

- **Status:** Proposed. It is accepted when the project owner merges TASK-040's pull request.
- **Date:** 2026-09-30
- **Deciders:** the project owner approved building the landing atlas on `main` on 2026-09-30 ("go ahead"). This ADR is the data path TASK-040 proposes for it.
- **Relates to:** ADR-0001 §2 (no dataset-global snapshot), ADR-0011 (hosting), ADR-0012 (evidence at the foot, linked to the source), TASK-035 §0 option 3 (a projection "needs an ADR first")
- **Amends:** `ARCHITECTURE.md` §10 invariants 1 and 11, for list-scope statistics only (§2.6 below)
- **Code:** `packages/truth/src/list-facts/`, `packages/truth/bin/build-list-facts.ts`, `packages/truth/src/generated/list-facts.ts`, `packages/contracts/src/list-facts.ts`, `docs/contracts/list-facts.md`

## 1. Context

The owner asked for a landing page that, next to the search, tells the reader about surnames in general: how many, how they are spread, what is surprising. Every such figure describes a **whole published list**, not one surname:

- the typical surname on the male list has 5 bearers;
- 82 people drawn from the list have an even chance that two share a surname;
- 1 000 people drawn from the list carry about 921 different surnames.

The repository has no home for these figures:

1. **The claim model is surname-scoped.** `claims.subject_entity_id` is NOT NULL and points at a knowledge entity (`packages/db/migrations/0004_truth_layer.ts`). `ClaimType`, `EntityType` and `EvidenceScope` have no dataset or list member. ADR-0001 §2 says there is no dataset-global snapshot, and that changing this needs a new ADR.
2. **Production cannot hold the universe these figures need.** TASK-035 is parked: the derived register is about 16 GB against the free plan's 500 MB, and the owner will not move to a paid plan. A median, a top-N share or a collision probability needs the complete list; the completeness gate refuses a partial one, with no bypass.
3. **The presentation layer may not compute them.** `AGENTS.md` §10 and `ARCHITECTURE.md` §5–§6 and §10: presentation never derives facts, rank, rarity or confidence.

## 2. Decision

1. **A list fact is a derived statistic whose subject is one published list:** one resource version of one PESEL national file (`national_male` or `national_female`). It is not a surname claim and carries no surname string.
2. **It is derived offline by `packages/truth`.** `pnpm truth:list-facts` reads the official files from `data/`, and refuses unless:
   - their SHA-256 and byte size match the registry (`packages/sources/src/registry.ts`);
   - `assessUniverseCompleteness` returns COMPLETE;
   - `assessDerivedStatistic` returns VERIFIED;
   - `evaluateSurface(…, "FREE")` allows the source.

   Each statistic has a method version in `packages/truth/src/version.ts`. The pure functions are unit-tested.
3. **The result is a committed, generated module** (`packages/truth/src/generated/list-facts.ts`), validated by `listFactsArtefactSchema` (`packages/contracts`, `docs/contracts/list-facts.md`) when it is written, and again the first time each process reads it (`listFacts()` memoises the parsed result). The large source files are not committed (`data/` stays git-ignored), as with `apps/web/src/lib/voivodeship-geometry.ts`. Regenerating from the same bytes gives the same file.
4. **The artefact carries its own lineage and assessment.** For each list:
   - the resource id, the SHA-256 and row count of the bytes it was computed from, the snapshot date and the source page URL;
   - the completeness verdict, the confidence status with its method and version, and the FREE-surface decision;
   - a method version on every block.
5. **The web app renders it and derives nothing.** The landing page calls `listFacts()` server-side, fails soft (no section, never a broken page) and formats the stored values. Positions and scales are presentation geometry.
6. **Amendment of `ARCHITECTURE.md` §10:**
   - Invariant 1 (lineage) and invariant 11 (projections render validated claims) are satisfied for list-scope statistics by the artefact's embedded lineage and assessment instead of claim rows.
   - Every other invariant applies unchanged:
     - the two lists are two universes, never summed or merged (the schema keeps them under separate keys);
     - absence is not zero;
     - every figure is shown with its scope and date;
     - no fact is computed in the presentation layer.
7. **What stays out.**
   - Surname-scoped facts: a named surname's count, rank or map stays in the claim chain, even when it would make a plate livelier.
   - Regional (voivodeship) statistics, a display floor for small counts, and any trend across snapshots. Each needs its own decision first.

## 3. Why not the alternatives

- **Claims in the database.** They would need a migration for a list entity type, new claim types and a dataset scope. Their evidence would point at `distribution_values` rows that production does not hold, because the universe cannot be loaded there (TASK-035 §0). They would also have to be derived locally and replayed, as the seven-surname slice was, and they would still describe bytes the database never saw.
- **Computing in the page or at build time in `apps/web`.** That is the presentation layer deriving facts, which the invariants forbid.
- **A compact projection of every surname's published figures** (TASK-035 §0 option 3). That is a different thing: surname-scoped and about 300–400 MB (estimated). This ADR does not decide it.
- **Waiting for TASK-035.** It is parked with no date, and the landing page would stay without the figures the owner asked for.

## 4. Consequences

- **What gets checked, and where.**
  - Each new list statistic is a pure function in `packages/truth` with a method version, a unit test and a field in the contract.
  - CI cannot regenerate the artefact, because it has no CSVs. It checks what can be checked without them:
    - the committed module parses against the schema;
    - its lineage equals the registry;
    - its internal consistency holds;
    - the derivation refuses the committed fixture excerpts.
  - The generator's byte-for-byte reproducibility is checked by whoever regenerates it and recorded in the task's progress record.
- **A new resource version means a new artefact.** It is regenerated from the new files, and the page shows the new snapshot date. It is not a trend: comparing two artefacts is a separate decision.
- **Removing the artefact removes the atlas section and nothing else.**
