# TASK-038 — Source Catalogue Registry Seed

- **Status:** IMPLEMENTED AND VERIFIED (2026-09-30). Verification actually run: `docs/progress/2026-09-30-source-catalogue-registry.md`.
- **Requested by:** the project owner, 2026-09-30: "bring all sources to db". They chose to register every researched source, as a repo seed only, and to download data where that is OK.
- **Milestone:** none in `PLAN.md`. An owner-requested extension of DAT-001 (Source & Rights Registry). It changes no derivation, claim or page.
- **Depends on:** migration `0003` (`sources`, `rights_profiles`).
- **Blocks:** nothing. A future connector task for any catalogued source starts from the row this task registers.

---

## 1. Goal

Register every source named in the repository's source research in the canonical `Source` registry, each with a default `RightsProfile`, using a deterministic, idempotent repo seed. Import **no data** from any of them.

## 2. Outcome

`pnpm seed:sources` against any database built from this repository's migrations gives one `sources` row and one `rights_profiles` row per catalogued source. Every value is traceable to a named repository document. Running it again changes nothing and says so.

## 3. Authority

- `docs/canonical/11` §9.1 `Source` and §9.4 `RightsProfile`: field meanings and enums.
- `docs/canonical/12` §2.1 (verified facts, snapshot 2026-09-17), §5, §6 and §7 (MVP source status matrix): the only **verified** rights evidence.
- Research and discovery lists, none of them a rights review:
  - `docs/library/NAME_ATLAS_GENEALOGY_SOURCE_ARCHITECTURE(1).md` ("GSA") §2, the master source database, and §8, the reliability rubric;
  - `docs/library/NAME_ATLAS_DATA_TRUTH_LAYER(1).md` ("DTL") §6–9;
  - `docs/sources/candidate-sources.md`;
  - `docs/sources/INVENTORY.md`.
- ADR-0008 and `packages/sources/src/onomastics.ts`: meaning works own their registry rows.
- D-021: Polona's source default is open.

## 4. The catalogue — 96 entries

| Group | Entries | Evidence |
|---|---:|---|
| Classified by `docs/canonical/12` §7 | 21 | The 22 §7 rows, minus PESEL (the importer's) and Polona (D-021), with "PTG Skanoteka/Metryki" split into its two services |
| GSA §2 master database | 44 | Its 68 entries, minus the 23 covered above and "Regional digital libraries" (a category) |
| DTL §6–9 | 17 | Sources absent from the lists above, minus "US Census historical" (reached "through archives/partners"). Near-duplicates such as "IPN databases", "Netherlands archives", "BN Data" and "FamilySearch Poland" are already covered. |
| `candidate-sources.md` | 11 | Items 3, 3a, 13, 14 (Austro-Hungarian lists only), 15, 17, 19, 20, 21 (Gemeindelexikon; Meyers is already a GSA entry), 24 and 27 |
| `INVENTORY.md` | 3 | Morfeusz, INSEE, Statbel. TERYT, GeoNames and the US Census files are covered above. |

Not catalogued, with the reason:

- **PESEL** (`pl_pesel_surnames`): owned by the PESEL importer. The validator reserves the key.
- **Polona**: its source default is D-021 item 4. A catalogue row would decide it.
- **Meaning works** (candidate items 4–10, and every work under `sources/onomastics/`): ADR-0008 Path B brings them in through the onomastics importer. That importer's `ensureWork` reuses any existing row with the work's key without reading its rights. So a catalogue row would silently become the work's rights profile.
- **Onomastica** (candidate item 6): dropped as a meaning source by D-022.
- **Items marked "to confirm" or "to find"** (candidate items 14 Prussian lists, 25, 26): their existence is not established.
- **Categories and guides** (candidate items 16, 23, 30–32; "Regional digital libraries"): these are not single sources.
- **Services, not sources of record**: the DTL §10 name-intelligence APIs (NamSor, NameAPI, Nationalize / Genderize), which the research calls auxiliary (DTL §1 item 14), and the DTL §11 commercial geocoders.

## 5. Recorded mapping rules

These rules turn the evidence into enum values. They are this task's decisions, recorded so a reviewer can check every row against them.

1. **No approval is claimed.** No legal review has been performed on any catalogued source, so no `production_status` or `review_status` is `APPROVED`.
2. **`production_status` from the §7 label.**
   - NOW, NOW/P1, P1, RIGHTS-FILTERED, P1 RIGHTS-FILTERED and P1 / LEGAL REVIEW → `LEGAL_REVIEW_REQUIRED`.
   - PARTNER P0, PARTNER P1, PARTNER, LATER PARTNER and LEGAL REVIEW / PARTNER → `PARTNERSHIP_REQUIRED`.
   - BLOCKED → `BLOCKED`.
   - Research-only entries → `LEGAL_REVIEW_REQUIRED`, as the owner chose. The exceptions are PRADZIAD and SEZAM: the research calls them legacy systems migrated into Szukaj w Archiwach, so they are `DEPRECATED`.
3. **`review_status`** is `BLOCKED` exactly when `production_status` is `BLOCKED`. Otherwise it is `LEGAL_REVIEW_REQUIRED`.
4. **Rights dimensions, classified entries.** Set only from `docs/canonical/12` §2.1 and §7 wording:
   - "prohibited", "blocked", or "not allowed without written permission or agreement" → `PROHIBITED`. This is the default profile, with no agreement in place; an agreement would be a new profile.
   - Allowed subject to conditions Name Atlas can meet itself (a free API key, a quota, per-item rights, licence tracking, an official review route) → `CONDITIONAL`.
   - An open licence covering the data (CC0, CC BY, ODC-By), or an explicit statement that use is allowed → `ALLOWED`.
   - Otherwise `UNKNOWN`.
   - `local_cache` follows §7's "Local cache" column. "Yes" → `ALLOWED`. Item-, policy- or licence-dependent → `LIMITED`. "No", or "No" without an agreement or contract → `PROHIBITED`.
5. **Rights dimensions, research-only entries.** Every dimension is `UNKNOWN`, even where the research quotes a licence, because none of it is a rights review. The research's verdict is quoted in `methodology_notes`.
6. **Booleans fail closed.**
   - `attribution_required` is `false` only where the evidence is a CC0 dedication covering the source's data.
   - `contact_required` is `false` only where the evidence shows open use without contact.
   - Everywhere else, both are `true`.
   - `attribution_text` is always `null`: no exact wording is recorded.
7. **`checked_at`** records when the evidence was last examined, not a review date. It is `2026-09-17T00:00:00Z` for classified entries and `2026-09-30T00:00:00Z` for research-only entries. Both are fixed constants.
8. **`authority_tier`** applies the GSA §8 rubric:
   - A: primary or official records and registers;
   - B: indexes, catalogues, aggregators and record platforms;
   - C: scholarly, dictionary and heraldic works, and curated vocabularies;
   - D: crowd-edited or community data.

   The tier is recorded as a provisional evaluation, not a statement by the source.
9. **URLs** are used only where the evidence documents contain them, with tracking and session parameters removed. Truncated URLs become `null`. Nothing comes from memory.
10. **`temporal_from` / `temporal_to`** are `null`. A range the research states goes in `methodology_notes`.
11. **`parent_source_id`** is `null`. The research gives no hierarchy precise enough to encode.
12. **Existing rows are never modified.** The seed is idempotent by `source_key`, and a `RightsProfile` is immutable once applied (`docs/canonical/11` §9.4).

## 6. In scope

1. `packages/sources/src/catalogue/`, re-exported from `@name-atlas/sources`. It holds the data, validation, and `seedSourceCatalogue()` with its report.
2. `packages/sources/bin/seed-source-catalogue.ts`, plus the scripts `seed-sources` (package) and `seed:sources` (root).
3. Unit tests for every rule in §5, and for catalogue integrity against the evidence documents.
4. An integration test against a real PostgreSQL.
5. `docs/CODEMAP.md`, `STATUS.md` and a `docs/progress/` record.

## 7. Acceptance criteria

- AC-01 96 entries: 21 classified; then 44, 17, 11 and 3 research-only.
- AC-02 Unique snake_case keys. None is PESEL's, and none equals a `work.source_key` under `sources/onomastics/`. No Polona entry.
- AC-03 Every entry obeys §5 rules 1–11.
- AC-04 Every URL occurs verbatim in the evidence documents.
- AC-05 A first seed on a migrated, empty database inserts 96 `sources` and 96 `rights_profiles` rows, one profile per source.
- AC-06 A second seed inserts nothing, reports 96 existing keys and changes no row.
- AC-07 A pre-existing row under a catalogue key is left unchanged and reported as existing.
- AC-08 Every stored row equals its catalogue entry, field by field.
- AC-09 The seed writes no row in any other table.
- AC-10 An invalid catalogue is refused before any write.
- AC-11 Every `BLOCKED` source is stored with `automated_access = 'PROHIBITED'`, so the importer's `rightsRefusal` refuses it.

## 8. Out of scope

- **Downloading or ingesting any source's data.** That means no connector, no `SourceRecord`, and no raw file committed. Each source's ingestion is its own task: it needs a rights review and, for most sources, tables or claim types that do not exist yet.
- Loading the hosted database. `STATUS.md` records the free plan's limit.
- Any migration, enum value, or change to the PESEL or onomastics registry paths or to any rights gate.
- Any `APPROVED` status, legal conclusion, or change to `docs/canonical/`.

## 9. Verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids
pnpm test
pnpm db:migrate && pnpm seed:sources && pnpm seed:sources   # the second run inserts nothing
pnpm db:generate-types && git diff --exit-code -- packages/db/src/generated
pnpm test:integration
pnpm test:golden
pnpm build
```

## 10. Definition of done

Every AC is demonstrated by a test that was run. The diff contains nothing from §8. `docs/canonical/` is untouched. **STOP**: do not start any connector task.
