# TASK-011 — Voivodeship `Place` foundation and PESEL regional ingestion (D-004, Preferred)

- **Status:** SPECIFIED 2026-09-20, not implemented. Implementation is its own session.
- **Created:** 2026-09-20, at the project owner's direction, resolving D-004 as **Preferred**:
  adopt the current official regional pair `1148786` / `1148790` as a *registered-domicile*
  regional distribution.
- **Milestone:** M2. This pulls the `Place` foundation forward from M3 (`docs/CODEMAP.md`), which
  the `CURRENT_DISTRIBUTION` preflight named as a sequencing decision for the project owner;
  "Preferred" is that decision. Only the voivodeship subset moves; everything else about places
  stays M3.
- **Depends on:** TASK-004 (source registry, importer pattern), TASK-008 (regional facts, the
  fixtures, and `fixtures/teryt/voivodeship-terc-correspondence.json`), TASK-010 (mixed-script
  rows — the regional files may contain the same two values).
- **Blocks:** TASK-012 (the `CURRENT_DISTRIBUTION` truth chain). This task stores; it derives
  nothing and asserts no claim.
- **Canonical basis:** `docs/canonical/11` §5.1 (`Place`), §5.2 (`PlaceName`), §6.1–§6.2
  (regional `DistributionSnapshot`/`DistributionValue`), §20.3 (`EntityExternalId`);
  `docs/canonical/12` §11 (TERYT as the Polish place-ID backbone).

## 1. Goal

Make regional counts *storable*: a `Place` for each of the 16 voivodeships carrying its TERYT TERC
code, and an importer that persists the two regional resources as `geography_level = 'REGION'`
snapshots whose values reference those places — checksum-pinned, idempotent, atomic per resource,
sex partitions kept apart, nothing summed, nothing derived.

## 2. The binding framing (D-004, verbatim in substance)

The regional dimension is *województwo zameldowania na pobyt stały* — voivodeship of **permanent
registered residence**, a legal registration record for the current-surname holder. It must never
be presented as surname origin, ancestry, birthplace, historical distribution, or — without
qualification — current physical residence. Every snapshot this task writes carries that scope in
`universe_description` verbatim from the publisher plus a `coverage_notes` entry stating the
residual TASK-008 measured: about **21.7 % of male and 19.8 % of female bearers appear in no
voivodeship row**, a gap per-cell suppression provably cannot explain and which is systematically
biased toward recent-migration surnames. A regional value is therefore a count of registered
domicile within the covered set, not a share of the national count.

Forbidden regardless: distributing a national total across regions by any proportion.

## 3. In scope

1. **Migration `0008_places_core`** — the smallest `Place` subset canonical §5.1 requires:
   `places` (`place_id` FK `knowledge_entities`; `place_type` enum with at least `REGION` and
   `COUNTRY`; `current_display_name`; `current_country_code`; `centroid geography(Point,4326)`
   nullable and **left null** — no coordinate may be invented; `spatial_precision` = `REGION`;
   `entity_status`), `place_names` (§5.2, the official TERC `NAZWA` as `OFFICIAL`, `pl`, `Latn`),
   and `entity_external_ids` (§20.3: `entity_id`, `provider_key`, `external_id`, `external_url`
   nullable, `UNIQUE (provider_key, external_id)`). `entity_type` gains `PLACE` by `ALTER TYPE …
   ADD VALUE` — and, per the constraint D-011 recorded, **no row carrying it may be inserted in
   the same migration transaction**.
2. **Voivodeship seeding, from evidence only** — a data migration or a `packages/sources` seeder
   (implementer's choice, recorded) that reads `fixtures/teryt/voivodeship-terc-correspondence.json`
   and creates exactly 16 `REGION` places, each with `EntityExternalId(provider_key = 'TERYT',
   external_id = <two-digit WOJ>)` and one `OFFICIAL` `PlaceName`. Codes come from that file and
   nowhere else. GeoNames IDs are **not** attached here (out of scope, below).
3. **Regional schema and parser** — a three-column description and fail-closed validator beside
   the national one: header `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba`,
   the 16-value closed set for column 1, the same `Liczba ≥ 2` rule, the same encoding/terminator
   facts TASK-008 verified. Any value outside the 16 fails closed — it is a finding, not a row to
   skip.
4. **Regional importer** — on the TASK-004 pattern, registering `1148786` / `1148790` in
   `registry.ts` with their official SHA-256s and row counts from the manifest (646,052 /
   694,553), one `SourceRecord` per resource version, one **surname-scoped** snapshot per
   (surname, resource) with `geography_level = 'REGION'`, and one `DistributionValue` per row with
   `place_id` set to the voivodeship's place and `source_geography_key` holding the raw string.
   Resolution through `resolveSurname` with `RESOLVE_FLAGGED` (TASK-010). Regional rows for a
   surname absent from the national file are stored — absence nationally is not a reason to drop
   a regional fact — and reported (TASK-008 observed zero such surnames in either file, so the
   count is expected to be 0; a non-zero count is a finding).
5. **Reconciliation report** — per resource: rows read/imported/quarantined, places referenced (must
   be 16), surnames created/reused, and the sum of regional counts against the national resource
   of the same sex **as a reported figure only**, never an assertion of equality.
6. Tests, generated types, `PROGRESS.md`, `docs/CODEMAP.md`, `fixtures/pesel/source-manifest.json`
   key `regional_resources_not_ingested` renamed to reflect ingestion, D-004 record updated.

## 4. Out of scope

- **Any claim.** No `CURRENT_DISTRIBUTION`, no share, no rank within a region, no "most common
  in". That is TASK-012, and it may not begin until this task's reconciliation figures exist.
- Powiat, gmina or locality places; SIMC; GeoNames external IDs; centroids or geometry; any
  `administrative_memberships`. Voivodeships only, codes only.
- The 2025 regional pair. Recorded in `docs/sources/pesel-annual-series.md`; not this task.
- Explaining the residual. Its arithmetic is stated; its cause stays `UNRESOLVED` until the
  publisher answers (the same enquiry as D-007 and U-4).
- Any change to the national importer beyond sharing code it already exposes.

## 5. Acceptance criteria

- **AC-1** `0001`–`0008` apply to a fresh database and report no pending work on re-run;
  generated types byte-identical after regeneration.
- **AC-2** Exactly 16 `places` exist after seeding, each with one `TERYT` external id equal to the
  correspondence file's `terc_code`, and none with a centroid.
- **AC-3** The regional parser accepts both committed regional fixtures byte-for-byte and rejects a
  synthetic file whose geography value is not one of the 16, a header variant, and a `Liczba` of
  `1` or `0`, each with a typed reason.
- **AC-4** Importing the committed regional fixtures writes `REGION` snapshots whose every value
  has a non-null `place_id` and whose `source_geography_key` equals the source string; every
  derived column is null; the sex partitions produce different `comparability_group` values and are
  never summed.
- **AC-5** Importing the same bytes twice is `ALREADY_IMPORTED`; a changed file supersedes and never
  rewrites.
- **AC-6** Each snapshot's `coverage_notes` contains the residual statement and
  `universe_description` the publisher's wording verbatim.
- **AC-7** The full official resources import (the bytes are on disk): 646,052 and 694,553 rows,
  0 quarantined, 16 places referenced each, the reported regional sums against national totals
  reproducing TASK-008's recorded residual (about 21.7 % male, 19.8 % female) within rounding, and
  `regional sum ≤ national count` holding for every surname with zero exceptions, as TASK-008 found.
- **AC-8** `pnpm demo:surname` for a surname is unchanged — national claims do not see regional
  rows, because `CURRENT_POPULATION` selects national snapshots only. Assert it.

## 6. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration
DATABASE_URL=… pnpm db:migrate && pnpm db:generate-types && git status --short packages/db/src/generated/db.ts
pnpm --filter @name-atlas/sources run import-pesel-regional --resource 1148786 --file <csv> --metadata <json>
pnpm --filter @name-atlas/sources run import-pesel-regional --resource 1148790 --file <csv> --metadata <json>
pnpm demo:surname "NOWAK"   # unchanged output
pnpm build
```

## 7. Do not

- Do not type a TERC code, a coordinate or a place name from memory. Read the correspondence file.
- Do not sum male and female, regional and national, or regions into a national figure.
- Do not treat an absent (surname, voivodeship) cell as zero, and do not write a zero row.
- Do not present registered domicile as anything else, anywhere, including in test names.
- Do not start TASK-012.
