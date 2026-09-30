# ADR-0016 — every surname's published figures are built at deploy time, and the search answers from them when the claim chain cannot

- **Status:** Proposed. It is accepted when the project owner merges TASK-041's pull request.
- **Date:** 2026-09-30
- **Deciders:** the project owner chose to "make the search work for every surname" first, then simplify the landing page (2026-09-30, "both in that order"). This ADR is the data path TASK-041 proposes for it.
- **Relates to:** ADR-0015 (list-scope statistics as a committed artefact), ADR-0010 (persisted slugs), ADR-0011 (hosting), TASK-035 §0 option 3 (a projection "needs an ADR first")
- **Amends:**
  - `ARCHITECTURE.md` §10 invariants 1, 10 and 11, for published figures only;
  - ADR-0015 §2.7, which kept surname-scoped figures in the claim chain.
- **Code:** `packages/truth/src/published-figures/`, `packages/truth/bin/build-published-figures.ts`, `packages/contracts/src/surname-result.ts` (2.0), `docs/contracts/published-figures.md`

## 1. Context

- **The search only works for 7 surnames.** Production's database holds a seven-surname slice, so every other surname a visitor types answers "not found". TASK-035 is parked: the derived register is about 16 GB and the free plan stops at 500 MB.
- **The figures a visitor wants are small.** For every surname they are its count on each national list, its rank and "1 in X" on that list, and its voivodeship distribution where the regional files have cells. Built from the four SHA-pinned files, they measured about 24 MB raw and 6 MB gzipped, for 598 476 surnames. A trial build took 26 s.
- **Bulk data is not committed** (`docs/sources/INVENTORY.md` §3), so the ADR-0015 pattern of a committed module does not fit this size.

## 2. Decision

1. **Published figures.** For every surname on the two national lists, published figures are:
   - its published count on each list, and its published cells in the two regional files;
   - the list's rank table (count → surnames with a larger count) and total, from which rank and "1 in X" follow.

   They carry no surname-level claim row and no database id.
2. **Built at deploy time, never committed.** `packages/truth/bin/build-published-figures.ts`:
   - downloads the four registered files (`fetch-pesel`), or reads them from `data/`;
   - refuses unless every file matches the registry's SHA-256 and size;
   - runs the completeness gate on every file;
   - runs the confidence rules (`assessCurrentPopulation`, `assessDerivedStatistic`) and requires VERIFIED;
   - requires `evaluateSurface(…, "FREE")` to allow the source.

   It then writes sharded files into the web app's build output, under `apps/web/generated/`, which git ignores. It runs as part of `apps/web`'s build.
   - `PUBLISHED_FIGURES=required` makes any failure fail the deploy. It is set on Vercel.
   - The default `auto` writes an ABSENT manifest when the files are missing, so CI and local builds without the files behave as before.
   - A checksum mismatch fails in both modes.
3. **Keys are `canonical_key_v2`.** Shards are keyed by the resolver's `canonicalKey`, never by the Polish fold, so `Łuczak` and `Luczak` stay two surnames (invariant 8). The manifest records the key version, and a reader refuses shards built with another one.
4. **Derived values are computed per request by `packages/truth`, never in the page.** Rank (`rankInTable`), "1 in X" (`oneInX`), shares and coverage (`shareOfCovered`, `coverageRatio`, `coverageState`) are the same pure, versioned functions the claim chain uses. Their inputs are the manifest's rank tables and totals and the surname's published counts.
5. **Which source answers.**
   - The claim chain answers a surname when it is complete for it, meaning its rarity section is READY.
   - Otherwise, if the published figures hold the surname, they answer.
   - A response says which source answered (`provenance.basis`: `CLAIM_CHAIN` or `PUBLISHED_FIGURES`, with the artefact's resources and SHA-256s).
   - A published-figures response has no database id (`surname.id` and `place_id` are null). That is why `surname-result` goes to 2.0.
6. **Visibility.**
   - Published-figures answers are shown on the search page (`/?surname=`) and through the public API.
   - They are never indexed and never enter the sitemap.
   - They get no canonical `/pl/nazwisko/…` route or share card until a stable identity exists for them. A slug cannot be reversed from the text, and collision suffixes need an id (ADR-0010).
   - Type-ahead suggestions come from the published figures' prefix shards. They carry names only, never a count.
7. **Amendment of `ARCHITECTURE.md` §10.**
   - Invariants 1, 10 and 11 are satisfied for published figures by the manifest's lineage (resources, SHA-256s, row counts, completeness, confidence, rights) and by versioned derivations in `packages/truth`, instead of claim rows.
   - Every other invariant applies unchanged:
     - the two lists are never summed;
     - absence is not zero: a surname with no regional cell gets an UNAVAILABLE distribution, never zeros;
     - every figure is shown with its scope and date;
     - identity is exact.

## 3. Why not the alternatives

- **Loading the claim chain into production.** TASK-035 measured it at about 16 GB against a 500 MB plan.
- **A compact table in the production database.** It would fit (about 250 MB estimated), but it needs a migration, a load path this environment cannot run, and database writes for 2 million rows. A deploy-time artefact needs none of these.
- **Committing the shards.** About 24 MB of bulk data in git, against `docs/sources/INVENTORY.md` §3.
- **Computing in the page.** The presentation layer may not derive facts.
- **A key-derived UUID for `surname.id`.** It would later disagree with the database's UUIDv7 ids (invariant 12) and would pretend to an identity that does not exist.

## 4. Consequences

- **Deploys depend on dane.gov.pl being reachable**, when `PUBLISHED_FIGURES=required` and the build cache is cold. A replaced upstream file fails the deploy until the registry is updated, which is the intended behaviour.
- **The contract changes.** `surname-result` 2.0 has nullable `surname.id` and `place_id`, and a required `provenance`. The web app is the only known consumer of the public API.
- **Surnames without a canonical route.** Published-figures surnames have no canonical route or share card yet. A later task gives them a stable identity.
- **When TASK-035 lands.** If it is unparked, the claim chain becomes complete for every surname and answers first. The published figures then only back suggestions, until a task retires them.
