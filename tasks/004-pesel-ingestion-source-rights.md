# TASK-004 — PESEL ingestion + Source/Rights

> **Not the scope authority, and not done.** This is a second, earlier draft for TASK-004 that
> appeared in the working tree without being committed. The scope authority for TASK-004 is
> `tasks/004-pesel-surname-ingestion.md` (`AGENTS.md` §3). This file is committed only so the
> repository has no untracked state; it is kept for comparison and should be deleted or merged
> into that file by whoever owns the decision.

- **Status:** NOT STARTED — no TASK-004 code, migration or test exists. Verified against `PROGRESS.md` and the working tree on 2026-09-19. This file previously carried a `DONE — implemented and verified` line; that statement was false and was corrected rather than committed as written (`AGENTS.md` §9).
- **Milestone:** M1 (`PLAN.md`: "Tasks: TASK-004 PESEL ingestion + Source/Rights · TASK-005 `CURRENT_POPULATION` truth chain")
- **Depends on:** TASK-001 (foundation), TASK-002 (the pinned, verified source), TASK-003 (identity tables — ingestion writes `Surname`/`NameForm` rows onto them)
- **Blocks:** TASK-005 (the truth chain turns an imported `SourceRecord` into `EvidenceItem` → `Claim` → `ConfidenceAssessment` → `Citation`)
- **Canonical authority:** `docs/canonical/11` §4.1–§4.3, §6, §9.1–§9.4; `docs/canonical/12` §3.1, §4, §5, §6; `ARCHITECTURE.md` §10 invariants 1, 3, 4, 5, 6, 7, 10, 13
- **Reviewed plan:** `NAME_ATLAS_IMPLEMENTATION_PLAN_REVIEWED_2026-09-18.md` §"TASK-004 — PESEL INGESTION + SOURCE/RIGHTS"

## 1. Goal

Turn the pinned, verified PESEL national surname resources into canonical Name Atlas records, along exactly this chain and no further:

```text
official PESEL resource
→ immutable import (checksum-pinned)
→ Source + RightsProfile + SourceRecord
→ Surname + NameForm (identity, from TASK-003's tables)
→ surname-scoped DistributionSnapshot
→ national DistributionValue (place_id = null)
```

The import must be idempotent, fail closed on schema drift, preserve the raw source payload and the source's own dates, treat absence as absence rather than zero, and assume nothing regional.

It produces **no claim, no rarity, no rank, no share, no trend**. Those are derived values and belong to TASK-005 as reproducible claims (`ARCHITECTURE.md` §10 invariant 10).

## 2. Current baseline

Established by direct inspection, not assumed:

- **The source is pinned and verified** (TASK-002): dataset 1681, national male resource `1148808` and female `1148811`, both `data_date = 2026-01-20`, portal timestamps `2026-01-28`, SHA-256 and byte sizes recorded in `fixtures/pesel/source-manifest.json`, corroborated along two independent acquisition paths. Licence CC0 1.0 at dataset level.
- **`packages/sources` already parses the format fail-closed** (TASK-002): `decodePeselBytes` (strict UTF-8, rejects BOM) and `parsePeselFile` (exact header, 2 columns, CRLF, trailing terminator, count ≥ 2). It has no database access and no domain knowledge. This task adds both to the same package — `docs/CODEMAP.md` already names it as TASK-004's home.
- **Identity tables exist** (TASK-003): `knowledge_entities`, `surnames` (`canonical_key` UNIQUE), `name_forms`, view `resolvable_name_forms`. Migration `0002_identity_core`. All three tables are currently empty of production data.
- **`@name-atlas/resolver` exposes the canonical key function** (`canonicalKey`, `canonical_key_v1`) and script detection. The importer must derive `canonical_key`/`search_key` with that same function, never a second algorithm.
- **No `Source`, `RightsProfile`, `SourceRecord`, `DistributionSnapshot` or `DistributionValue` table exists.** This task creates them.
- **No object storage exists.** Raw source files are deliberately not committed (`AGENTS.md` §6; only checksums, metadata and small fixtures are versioned). The bytes are identified by checksum and URL, not stored in the database.

## 3. In scope

1. Migration `0003_source_rights_distribution` creating exactly: `rights_profiles`, `sources`, `source_records`, `distribution_snapshots`, `distribution_values` — and the enums they need.
2. A **source registry** (`docs/canonical/12` §5: "configuration/data, not scattered code constants") seeding the PESEL `Source` and its `RightsProfile` idempotently.
3. A **PESEL bulk importer** implementing the `BULK_DATASET` pattern (`docs/canonical/12` §3.1): verify checksum → parse fail-closed → upsert `SourceRecord` → upsert identity → write snapshots and national values, all in one transaction per resource.
4. Identity population: one `Surname` + `NameForm` per distinct canonical key, created only from an exact attested source string.
5. `DistributionSnapshot` per (surname, resource) with the sex partition carried in `universe_description`/`methodology_key`, and one national `DistributionValue` (`place_id = null`) per snapshot.
6. Idempotence: re-importing the same bytes changes nothing and reports so.
7. A CLI entry point for running an import against a real file.
8. Unit tests (pure mapping) and integration tests against real PostgreSQL.

## 4. Out of scope

Their absence is a success condition.

- `EvidenceItem`, `Claim`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation` — TASK-005.
- `CURRENT_POPULATION` or any other claim type; rarity, `1-in-X`, rank, share, percentile, trend.
- `DigitalAsset` — no asset exists for a CSV resource; the table is created by whichever task first ingests a scan.
- Regional/voivodeship ingestion, any `Place`, `PlaceName`, `AdministrativeMembership`, any map. D-004's adoption gate is untouched.
- Network download. The importer takes bytes that are already present; acquisition stays manual and out of process (`dane.gov.pl` is egress-blocked, and the project owner supplies files).
- Earlier annual snapshots (2019–2025) — comparability across years is unproven (`docs/sources/acquisition/2026-09-18/README.md` finding 1).
- Merging male and female surname forms; generating a gender counterpart; any fuzzy, phonetic or transliteration logic.
- `name_form_relations`, `entity_external_ids`, `research_runs`.
- Any API endpoint, consumer UI, admin UI.

## 5. Contract decisions made by this task

Recorded here because they are the places where the canonical model left a choice.

### 5.1 `SourceRecord` granularity is the resource **version**, not the CSV row

One `SourceRecord` per imported resource file, not 408,182 of them. `docs/canonical/12` §3.1's `BULK_DATASET` pattern is version-scoped ("DOWNLOAD VERSION → checksum → … → atomic snapshot activation"), `SourceRecord.content_hash` exists to "detect changes/duplicates" — which is exactly the file checksum TASK-002 pinned — and `raw_payload` is explicitly size-limited. `record_type = API_OBJECT`: the payload stored is literally the `api.dane.gov.pl` resource object, and the CSV is its `csv_download_url` representation.

### 5.2 The importer creates `Surname` **and** `NameForm`

`TASK-003` §"Blocks" states PESEL ingestion "populates `NameForm` rows on top of this task's tables". Per distinct canonical key the importer creates one `Surname` (canonical identity) and one `NameForm` with `form_type = CANONICAL`, `attestation_status = ATTESTED` — the honest record that this exact spelling was attested by an official source, which is what makes the resolver's T1 tier meaningful for real data. Both are created only from an exact source string; nothing is generated, inferred or merged.

### 5.3 The same string in both files is one `Surname`, two snapshots

`surnames.canonical_key` is UNIQUE, so `NOWAK` from the male resource and `NOWAK` from the female resource resolve to one canonical surname. This is **not** merging male and female surname *forms* — `KOWALSKI` and `KOWALSKA` remain entirely separate identities, as they are separate strings. The counts never merge: each resource produces its own surname-scoped `DistributionSnapshot` whose `universe_description` and `methodology_key` name the sex partition.

### 5.4 `universe_size` is null

The PESEL living-population denominator is not verified. It is left null rather than invented — this is the open rarity-denominator question recorded in `docs/sources/pesel.md`, and `docs/canonical/11` §6.1 says the denominator is stored "only if methodologically valid".

### 5.5 No male + female total is computed

Summing the two partitions for a surname would be a derived value, and derived values are reproducible claims with a method and version (`ARCHITECTURE.md` §10 invariant 10), not a column. TASK-005 decides whether and how.

## 6. Required behaviour

1. **Checksum gate.** The importer is given an expected SHA-256 and verifies the bytes before parsing. A mismatch aborts with a typed error and writes nothing — a changed file is a finding, not something to import.
2. **Fail closed on schema drift.** Decoding and parsing reuse TASK-002's validator unchanged. Any drift aborts the whole import; no partial state.
3. **Atomic.** One transaction per resource. Either the `SourceRecord`, every identity row, every snapshot and every value land, or none do.
4. **Idempotent.** Re-importing identical bytes inserts nothing new and reports `alreadyImported`. Row counts before and after are equal.
5. **Immutable payloads.** An existing `SourceRecord` is never rewritten. Different bytes for the same external resource id create a **new** `SourceRecord` whose `supersedes_source_record_id` points at the previous one, which is marked `UPDATED`.
6. **Absence is absence.** Only rows present in the file produce a `DistributionValue`. No zero is written for a surname missing from a resource, and nothing infers one.
7. **Raw source preserved.** `SourceRecord.raw_payload` holds the resource's own metadata object; `content_hash` holds the verified checksum; `source_url` holds the official endpoint. `DistributionSnapshot.as_of_date` holds the source's `data_date`, distinct from the portal timestamps and from `retrieved_at`.
8. **One shared normalisation.** `canonical_key` and `search_key` come from `@name-atlas/resolver`'s `canonicalKey`. The surname's `canonical_display` and the name form's `form` preserve the source string exactly (NFC only).
9. **Rights before production.** The importer refuses to run when the source's effective `RightsProfile` has `automated_access = PROHIBITED` or `review_status = BLOCKED` (`docs/canonical/12` §6.4 hard gate).

## 7. Acceptance tests

Unit (no database):

1. The source registry's PESEL entry carries the verified facts from `fixtures/pesel/source-manifest.json` and nothing invented.
2. Mapping a parsed row yields `canonical_key` identical to `@name-atlas/resolver`'s `canonicalKey` for the same string.
3. Mapping preserves the source string exactly in the display/form fields, including a trailing space and a standalone combining mark.
4. Two source rows whose strings differ only by case map to the same canonical key; `Łuczak`/`Luczak` map to different keys.
5. A checksum mismatch raises a typed error before any parsing happens.
6. The rights hard gate rejects `automated_access = PROHIBITED` and `review_status = BLOCKED`.

Integration (real PostgreSQL):

7. Importing the male fixture creates one `Source`, one `RightsProfile`, one `SourceRecord`, and one `Surname` + `NameForm` + `DistributionSnapshot` + `DistributionValue` per fixture row.
8. The `SourceRecord` carries the manifest's checksum, the official URL, the resource metadata payload, and `retrieved_at`; the snapshot carries `as_of_date = 2026-01-20`, distinct from the portal timestamp.
9. `DistributionValue.place_id` is null, `count` equals the source `Liczba`, and every derived field (`surname_share`, `population_rate`, `rank`) is null.
10. Re-importing the identical file is a no-op: `alreadyImported`, and all five tables' row counts are unchanged.
11. Importing the female fixture after the male one reuses surnames that already exist (no duplicate `Surname`) and adds a second, separate snapshot for them.
12. A surname present in one partition and absent from the other has exactly one snapshot — no zero-count row exists anywhere.
13. Importing bytes that fail the schema validator leaves every table untouched (transaction rolled back).
14. Importing changed bytes for the same resource id creates a second `SourceRecord` superseding the first, and does not mutate the first.
15. After import, `@name-atlas/resolver` resolves a real fixture surname to `EXACT`, proving the ingested identity is usable by the resolver unchanged.
16. `suppression`: no `DistributionValue` with `count` below the source's confirmed minimum exists, and none with `count = 0`.

## 8. Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm db:migrate
pnpm db:generate-types      # must produce no diff
pnpm test:integration
pnpm build
```

## 9. Definition of done

- Every item in §7 implemented and passing by actually running it.
- Migration creates exactly the five tables in §3 item 1 — nothing from §4.
- `docs/CODEMAP.md` and `PROGRESS.md` updated with observed facts.
- `docs/canonical/` untouched.
- **STOP.** Do not begin TASK-005. Do not write `tasks/005-*.md`.
