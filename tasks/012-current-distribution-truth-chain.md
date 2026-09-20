# TASK-012 — `CURRENT_DISTRIBUTION` truth chain (registered-domicile, voivodeship)

- **Status:** IMPLEMENTED 2026-09-20. All eight acceptance criteria met; see `PROGRESS.md`. §3's
  threshold was implemented at the recommended 0.50 and is recorded as **D-015** for the project
  owner's confirmation; it is a one-constant change. Two refinements were made during
  implementation, both recorded in `PROGRESS.md`: a third read state `COVERAGE_UNKNOWN` for a
  complete regional resource whose national counterpart is not complete, and AC-3's share-sum
  tolerance widened to the per-entry rounding the shares actually carry (up to 1e-9 per entry;
  observed maximum 3e-9 over 310 claims).
- **Created:** 2026-09-20, after TASK-011 stored the regional values it needs.
- **Milestone:** M2, the last claim of the current-surname vertical.
- **Depends on:** TASK-011 (regional storage, the 16 voivodeship places), TASK-009 (the
  completeness gate and `evidence_dependencies`), TASK-014 (the derived-statistic confidence rule
  and the `DENOMINATOR` role), D-004 (the adoption and its binding framing).
- **Canonical basis:** `docs/canonical/11` §8 (`CURRENT_DISTRIBUTION | Surname | place/count/rate |
  FACT | Approved regional dataset | VERIFIED`), `docs/canonical/14` §27.1 (FACT when a lawful,
  appropriately dated dataset supports it) and §30 (derived statistics with lineage),
  `docs/canonical/16` §28 (the geography chapter; `state = UNAVAILABLE` when no approved current
  regional source exists, and "do not return fabricated empty map features").

## 1. Goal

For a resolved surname and each **complete** regional resource version, derive and publish the
distribution of its bearers across the 16 voivodeships of permanent registered residence — as
counts, as shares of the set that can actually be placed, and with the coverage of that set stated
on every claim.

## 2. The design question, and how it is settled

A regional figure could be published three ways. The data decides it.

**Option A — bare counts only.** Honest and denominator-free, but it answers "how many in
Mazowieckie" and not "where is this surname concentrated", which is the question a user asks. It
also invites the reader to divide by the national count themselves, which is the one division the
data does not support.

**Option B — counts plus a share of the *covered set*** (the surname's own regional sum).
**Chosen.** Shares then sum to 100% across the regions present, the denominator comes from the same
rows as the numerators, and no cross-surname assumption is needed. The cost is that the denominator
differs per surname, so a share is a statement about placed bearers only — which is why §3 makes
the coverage figure part of the claim rather than a footnote.

**Option C — a share of the national count.** Rejected. The 16 voivodeships account for only 78.3%
(male) and 80.2% (female) of the national totals, and **the shortfall is systematically biased**:
coverage runs from 78.0% for surnames with 10–99 bearers to 89.3% above 10,000 (TASK-008). Per
surname it is far worse. Observed in the ingested data:

| Surname | National (male) | Regional sum | Covered |
|---|---:|---:|---:|
| `NOWAK` | 98,387 | 86,969 | 88.4% |
| `MELNYK` | 6,442 | 210 | **3.3%** |

A share of the national count would report `MELNYK` as almost absent from every region of a country
where it has 6,442 registered bearers. That is not a rounding problem; it is a false statement
about a real surname, and it would fall hardest on recent-migration surnames.

## 3. Low coverage is a product-safety property, not a caveat

`MELNYK` at 3.3% must not be rendered as a distribution map that looks like a population. So:

- Every claim carries `covered_count`, `national_count` (from the same sex's national resource
  version, when one is complete), `coverage_ratio`, and `coverage_basis` naming what the ratio is.
- The read contract exposes a **state**, not just numbers: `READY` when coverage is at or above the
  threshold, `LOW_COVERAGE` when it is below. `LOW_COVERAGE` still returns the entries — the data is
  real — but a surface must present it as "of the N bearers with a registered voivodeship", never as
  the surname's distribution. A test asserts the state flips at the threshold.
- **The one open decision: the threshold.** Recommended **0.50** — a distribution built on fewer
  than half the bearers is not a distribution of the surname. 0.50 keeps `NOWAK` (0.884) `READY`
  and makes `MELNYK` (0.033) `LOW_COVERAGE`. The project owner may set it anywhere; the value lives
  in one named constant with its rationale, and nothing else changes.

## 4. In scope

1. **Migration `0011_current_distribution`** — `ALTER TYPE claim_type ADD VALUE
   'CURRENT_DISTRIBUTION'`. `DENOMINATOR` already exists (TASK-014). Per the constraint D-011
   recorded, no row using the new value is written in the same transaction.
2. **A regional candidate loader.** `packages/truth/src/universe.ts` currently loads national values
   (`place_id IS NULL`). Add a regional sibling in the same module — `loadRegionalCandidates` —
   which groups a surname's values by resource version and carries each cell's `place_id`,
   `source_geography_key` and count. The **same** `assessUniverseCompleteness` gates it against the
   registry's `official_sha256` / `official_row_count` for `1148786` / `1148790`: a distribution
   over a partial import is as wrong as a rank over one, and there is no bypass.
3. **Evidence, three items per claim**, following TASK-014's shape:
   - `OFFICIAL_DATASET_FIELD` — the observed per-region counts for this surname in this resource,
     `subject_entity_id` the surname, locator the source record.
   - `DERIVED_STATISTIC` — the covered total, `derivation_method = "covered_set_sum@1"`.
   - `AUTHORITATIVE_INDEX` — the resource version as the universe, reused when it exists.
   Lineage on the derived distribution item: `COUNT` → the observation, `DENOMINATOR` → the covered
   total, `UNIVERSE` → the resource version.
4. **One claim per (surname, resource version)**, key `CURRENT_DISTRIBUTION|{surname}|{source_record}`.
   Not one per region: the shares are only meaningful jointly, and 16 confidence assessments and 16
   citations for one observation would be noise. `object_entity_id` stays null; each entry inside the
   payload carries its own `place_id`, satisfying §8's "place/count/rate" at the entry grain.
   Payload: the ordered entries (`place_id`, `terc_code`, `source_geography_key`, `count`,
   `share_of_covered` to 9 places), `covered_count`, `national_count`, `coverage_ratio`,
   `coverage_basis`, `regions_present`, `method_version = "current_distribution@1"`,
   `snapshot_date`, `comparability_group`, `source_population_scope`, and the registered-residence
   restriction verbatim.
5. **Confidence** — `assessDerivedStatistic`, unchanged. `VERIFIED` when the universe is complete,
   the upstream observation is verified and the computation is reproducible. Low coverage does **not**
   lower confidence: the figures are exactly what the source says. It is a scope property, and
   conflating the two would be the mistake `ARCHITECTURE.md` §10 invariant 2 exists to prevent.
6. **Read contract, schema `1.2`** (additive): a `distribution` section, one entry per resource
   version, each with `state`, `regions` (a `PlaceStatDTO[]`), `covered_count`, `national_count`,
   `coverage_ratio`, `comparability_group`, `confidence`, `citation`.
   **`docs/canonical/16` §28 references `PlaceStatDTO` but never defines it** — record that in
   `docs/contracts/surname-result.md` and define it here as `{place_id, terc_code, display_name,
   count, share_of_covered}`. No `MapLayerDTO`: no map exists to layer, and §28 forbids fabricated
   empty features.
7. **Accepted renderings**, recorded in the contract:
   - EN, `READY`: `Among the {covered} people with the surname {surname} ({sex}) who had a registered
     voivodeship on {date}, {share}% were registered in {region}.`
   - PL, `READY`: `Wśród {covered} osób o nazwisku {surname} ({sex}) mających zameldowanie na pobyt
     stały w dniu {date}, {share}% było zameldowanych w województwie {region}.`
   - `LOW_COVERAGE` adds, before any figure: EN `Only {coverage}% of bearers had a registered
     voivodeship, so this is not the surname's distribution.` / PL `Tylko {coverage}% nosicieli
     miało zameldowanie na pobyt stały, więc nie jest to rozkład nazwiska.`
   - **Never** "lives in", "comes from", "originates in", or an unqualified "in {region}".
8. `pnpm demo:surname-distribution`, tests, `PROGRESS.md`, `docs/CODEMAP.md`, `docs/contracts/`.

## 5. Out of scope

- Any map, geometry, centroid or `MapLayerDTO`. No place has a centroid and canonical forbids
  inventing one.
- Powiat or finer geography; the 2025 regional pair; any non-PESEL source.
- `GEOGRAPHIC_ORIGIN` and `HISTORICAL_PLACE_ASSOCIATION`. §27.3 is explicit: modern concentration is
  contextual evidence, not proof of origin, and it is usually INTERPRETATION or HYPOTHESIS. This
  task produces neither.
- Cross-sex or cross-resource combination of any kind.
- Explaining the residual. Its arithmetic is stated; its cause stays `UNRESOLVED` pending the
  publisher (the same enquiry as D-007's licence question).

## 6. Acceptance criteria

- **AC-1** Over the committed regional fixtures the derivation refuses `INCOMPLETE_UNIVERSE` and
  writes nothing; a permissive `rightsOverride` still refuses.
- **AC-2** Over the complete resource, every entry's `count` equals the stored
  `distribution_values.count` for that (surname, place), and `share_of_covered` equals
  `count / covered_count` to 9 places — each asserted against a SQL recomputation.
- **AC-3** `covered_count` equals `SUM(count)` over that surname's regional values, and the shares
  sum to 1 within 1e-9. `national_count` equals the same surname's count in the same sex's national
  resource, and `coverage_ratio = covered_count / national_count`.
- **AC-4** `NOWAK` male: 16 regions, covered 86,969, national 98,387, coverage 0.884, state `READY`,
  largest region `WIELKOPOLSKIE` with 16,077. `MELNYK` male: 14 regions, covered 210, national
  6,442, coverage 0.033, state **`LOW_COVERAGE`**.
- **AC-5** Lineage: three `evidence_dependencies` rows per claim, roles `COUNT`, `DENOMINATOR`,
  `UNIVERSE`. Idempotent: deriving twice yields one claim per resource version.
- **AC-6** No entry exists for a region the source did not list for that surname — absence is not a
  zero, and `MELNYK`'s 14 regions prove the case is real rather than hypothetical.
- **AC-7** The DTO validates against schema `1.2`; every entry carries `terc_code`; no payload or
  DTO field expresses a share of the national count; the restriction text appears on every claim.
- **AC-8** `0001`–`0011` apply from empty and re-run clean; generated types byte-identical after
  regeneration; the national population, rank and rarity chains are unchanged (assert `NOWAK`'s
  1 of 408,182 and 1 in 215 after deriving distributions).

## 7. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration
DATABASE_URL=… pnpm db:migrate && pnpm db:generate-types && git status --short packages/db/src/generated/db.ts
pnpm demo:surname-distribution "NOWAK" && pnpm demo:surname-distribution "MELNYK"
pnpm demo:surname "NOWAK" && pnpm demo:surname-rank "NOWAK" && pnpm demo:surname-rarity "NOWAK"
pnpm build
```

## 8. Do not

- Do not divide a regional count by a national count anywhere, in any field, under any name.
- Do not sum across sexes or resource versions; do not total the regions into a national figure.
- Do not write a zero row or a zero entry for an unlisted region.
- Do not let low coverage lower confidence, and do not let a complete-universe failure pass.
- Do not say "lives in", "from" or "originates in" — not in a payload, a DTO, a test name or a
  comment. It is registered residence.
