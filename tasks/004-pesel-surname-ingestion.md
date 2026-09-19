# TASK-004 — Canonical PESEL Surname Dataset Ingestion

- **Status:** NOT STARTED — specification only. §14 U-1, U-2 and U-3 were **answered by the project owner on 2026-09-19** and are no longer blocking. **One blocker remains:** §14 U-8 / `docs/DECISIONS_NEEDED.md` D-006 resolves a contradiction between two canonical documents and must be recorded there or as an ADR before the migration is written.
- **Milestone:** M1 (`PLAN.md`: "Tasks: TASK-004 PESEL ingestion + Source/Rights · TASK-005 `CURRENT_POPULATION` truth chain")
- **Canonical epics:** DAT-001 (Source & Rights Registry) + SRC-001 (PESEL Ingestion) — `docs/canonical/23` §48, master roadmap rows 5 and 7. `PLAN.md` bundles both into this one task; that bundling is `PLAN.md`'s, and this file follows it.
- **Depends on:** TASK-001 (foundation), TASK-002 (the pinned, verified source), TASK-003 (identity tables and the canonical key function)
- **Blocks:** TASK-005 (the truth chain turns an imported `SourceRecord` into `EvidenceItem` → `Claim` → `ConfidenceAssessment` → `Citation`)
- **Model guidance:** fresh implementation session, after §14 is answered

---

## 1. Goal

Make the pinned, verified official PESEL national surname resources ingestible into the Name Atlas canonical data layer — deterministically, idempotently, with full provenance, failing closed — and stop exactly there.

The chain this task builds, and nothing beyond it:

```text
official PESEL resource bytes (checksum-pinned)
→ Source + RightsProfile          (the registry: who published it, on what terms)
→ SourceRecord                    (this exact resource version, immutable)
→ Surname + NameForm              (identity, on TASK-003's tables)
→ DistributionSnapshot            (surname-scoped, dated, method-scoped)
→ DistributionValue               (national, place_id = null)
```

It produces **no `EvidenceItem`, no `Claim`, no confidence, no citation, no rank, no rarity, no share, no trend**. Those are derived values and reproducible claims (`ARCHITECTURE.md` §10 invariants 1 and 10) and belong to TASK-005.

## 2. User / system outcome

After this task, an engineer can run one command against a file already on disk and get a deterministic, auditable result:

- the file's bytes are verified against an expected SHA-256 before anything is parsed;
- its rows become canonical surname identities and surname-scoped, dated distribution rows;
- the import is recorded with its source, its rights, its URL, its resource metadata payload and its retrieval time;
- running it again with the same bytes changes nothing and says so;
- running it with drifted bytes changes nothing and says why.

No user-facing surface changes. Nothing is published. This is the internal step that makes M1's vertical slice possible, not the slice itself.

## 3. Canonical authority

Read these; do not copy them into code as restated prose.

| Topic | Authority |
|---|---|
| `Source`, `SourceRecord`, `RightsProfile` field specifications | `docs/canonical/11` §9.1, §9.2, §9.4 |
| `DistributionSnapshot`, `DistributionValue`, stored-vs-derived, the `NO DATA ≠ 0` rule | `docs/canonical/11` §6.1, §6.2 |
| `KnowledgeEntity`, `Surname`, `NameForm` | `docs/canonical/11` §4.1–§4.3 |
| Connector classification (`BULK_DATASET`), connector contract, connector boundary | `docs/canonical/12` §3.1, §4.1–§4.3 |
| Source registry fields and statuses | `docs/canonical/12` §5.1, §5.2 |
| Rights registry, precedence, decision matrix, hard gate | `docs/canonical/12` §6.1–§6.4 |
| PESEL connector: ingestion strategy, snapshot semantics, raw fields to preserve, suppression, regional capability, refresh | `docs/canonical/12` §9.1–§9.9 |
| Migration staging (Group A remainder + Group B first half) | `docs/canonical/23` §9.1, §9.2 |
| System invariants | `ARCHITECTURE.md` §10 (1, 3, 4, 5, 6, 7, 8, 12, 13 all bind here) |
| Trust/rights boundaries | `ARCHITECTURE.md` §4, §5 |
| Product promises and non-goals | `PRODUCT.md` §3, §7, §8 |
| The verified source record | `docs/sources/pesel.md`; `fixtures/pesel/source-manifest.json`; `docs/sources/acquisition/2026-09-18/` |
| Stack and database access | `docs/adr/0001-stack.md`, `docs/adr/0002-db-access.md` |
| Open decisions | `docs/DECISIONS_NEEDED.md` (D-001 resolved; D-004 open and untouched by this task) |

## 4. Preconditions

All verified in the repository, not assumed:

1. **The source is pinned.** Dataset `1681` ("Nazwiska występujące w rejestrze PESEL", Ministerstwo Cyfryzacji, institution `333`). National production pair: male resource `1148808`, female resource `1148811`, both `data_date = 2026-01-20`. SHA-256, byte size, row count, download endpoint, resource-metadata endpoint and portal timestamps are in `fixtures/pesel/source-manifest.json`, corroborated along two independent acquisition paths (`docs/sources/pesel.md`).
2. **The format is understood and validated fail-closed.** `packages/sources` (`@name-atlas/sources`) exports `decodePeselBytes` (strict UTF-8, rejects a BOM and invalid bytes) and `parsePeselFile` (exact header `Nazwisko aktualne,Liczba`, 2 columns, CRLF throughout with a trailing terminator, count ≥ `PESEL_MIN_VALID_COUNT` = 2), plus `PeselSchemaError`. It has no database access and no domain knowledge. This task extends that package; `docs/CODEMAP.md` already names it as TASK-004's home.
3. **Identity tables exist and are empty of production data.** `knowledge_entities`, `surnames` (`canonical_key` UNIQUE), `name_forms`, and the `resolvable_name_forms` eligibility view — migration `0002_identity_core` (TASK-003).
4. **One canonical key function exists.** `@name-atlas/resolver` exports `canonicalKey` (`canonical_key_v1`), `NORMALIZATION_VERSION`, `detectScripts` and `resolveSurname`. The importer must use these, never a second algorithm.
5. **No `sources`, `rights_profiles`, `source_records`, `distribution_snapshots` or `distribution_values` table exists.** This task creates them.
6. **No object storage exists.** `ops/` is not created; `docs/canonical/23` §6.3's EU object storage is not provisioned. Raw source files are deliberately not committed (`AGENTS.md` §6). The deviation this forces is **accepted and specified** in §14 U-3.
7. **Acquisition is manual and out of process.** `dane.gov.pl` and `api.dane.gov.pl` were network-egress-blocked in every session that has worked this repository. The importer takes bytes that are already on disk. It does not download.

## 5. What the canonical documents actually establish about this source

Recorded here so the implementer does not re-derive it, and so that what is *not* established is visible. Each row is either **VERIFIED** (with its repository source) or **UNRESOLVED** (with the question it leaves open). No row is a guess.

| # | Question | State |
|---|---|---|
| 1 | Approved dataset | **VERIFIED** — dane.gov.pl dataset `1681`, national resources `1148808` (male) / `1148811` (female), `data_date = 2026-01-20`. `docs/canonical/12` §2.1 marks the dataset VERIFIED and §8.1 lists it as CORE launch infrastructure; `docs/sources/pesel.md` pins the exact resources. |
| 2 | Authoritative source | **VERIFIED** — `api.dane.gov.pl`. CSV endpoint, direct media URL and resource-metadata endpoint recorded verbatim per resource in `fixtures/pesel/source-manifest.json`. |
| 3 | Downloadable representation | **VERIFIED** — the resources are natively **XLSX**; the CSV Name Atlas pins is a portal-generated conversion served from the official `csv_download_url`. Both representations are official; they are not the same bytes. This task ingests the **CSV**, pinned by checksum, because that is the representation TASK-002 verified byte-for-byte and `packages/sources` validates. |
| 4 | Licensing / reuse | **VERIFIED at dataset level, UNRESOLVED at resource level — posture answered in §14 U-2 (2026-09-19); the underlying resource-level licence question is carried as D-007** — dataset `license_name = "CC0 1.0"`, read from the portal's own dataset metadata. Resource-level metadata carries **no licence, rights or terms attribute at all** across all four 2026 resources (checked; recorded in `fixtures/pesel/source-manifest.json` `licence_provenance` and in D-004). Resource inheritance of CC0 is therefore an assumption this project has not verified. See §14 U-2. |
| 5 | Date / period semantics | **VERIFIED** — four distinct concepts, never inferred from one another: `data_date` `2026-01-20` (the PESEL reference date — what the data describes); `created`/`modified`/`verified` `2026-01-28T13:47:34Z` (male) / `13:48:39Z` (female) (portal metadata timestamps, eight days later); `retrieved_at` `2026-09-18` (when the bytes were fetched). Update frequency: yearly. |
| 6 | Fields present in the source | **VERIFIED** — exactly two columns: `Nazwisko aktualne` (non-empty string, preserved verbatim including a real trailing space, standalone combining marks, embedded `/`, `'`, `-`, `.`, `()`, and non-Latin scripts) and `Liczba` (positive integer, observed 2–99,738, no separators, no decimals). |
| 7 | Sex / gender dimension | **PRESENT, SEMANTICS STILL UNRESOLVED — handling answered in §14 U-1 (2026-09-19); the fact itself is still open and blocks TASK-005** — two separate resources, titled *Nazwiska męskie* / *Nazwiska żeńskie*, described as "Wykaz nazwisk męskich/żeńskich osób żyjących (wg pola nazwisko aktualne)". Whether this partitions by the **bearer's sex** or by the **grammatical gender of the surname form** is not stated by the publisher. `docs/canonical/12` §9.4 instructs preserving "sex/category if resource separates it" — so preserve it verbatim as a source-provided field and do not interpret it. See §14 U-1. |
| 8 | Geography dimension | **VERIFIED — national only.** Resource `regions` is `[{name: "Polska"}]`. Regional voivodeship resources (`1148786`, `1148790`) exist and are checksum-recorded, but are gated by D-004 and are **out of scope**. Per `docs/canonical/12` §9.8 the connector must declare `regional_distribution = false`. |
| 9 | Unit of `Liczba` | **UNRESOLVED** — the dataset notes say "liczba wystąpień" (number of occurrences) of a current-surname value among living persons in PESEL. That one occurrence equals one living person is strongly implied but **not explicitly stated** by the publisher. This does **not** block this task, which stores the raw count and a verbatim universe description and makes no claim. It **does** block TASK-005's `CURRENT_POPULATION` claim. See §14 U-4. |
| 10 | Encoding / delimiter / schema | **VERIFIED** — UTF-8, no BOM; comma delimiter; no quoting anywhere (no field contains a comma or a quote); CRLF throughout with a trailing CRLF after the last row; header byte-identical in both files; descending by `Liczba`. Already enforced fail-closed by `packages/sources`. |
| 11 | Suppression | **VERIFIED from the bytes** — no row with `Liczba ≤ 1` exists in either file, corroborating the publisher's stated rule that single occurrences are excluded. A surname absent from a resource is the `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` state (`docs/canonical/12` §9.5), never a confirmed zero. |
| 12 | How provenance must be represented | **VERIFIED** — `Source` → `RightsProfile` → `SourceRecord` per `docs/canonical/11` §9.1/§9.2/§9.4 and `docs/canonical/12` §5/§6; raw fields to preserve are enumerated in `docs/canonical/12` §9.4. |
| 13 | How TASK-003 identities are referenced | **VERIFIED** — `surnames.canonical_key` and `name_forms.search_key` are produced by `@name-atlas/resolver`'s `canonicalKey`, and `name_forms.normalization_version` by its `NORMALIZATION_VERSION`. A form is resolvable only if it satisfies the `resolvable_name_forms` view's rule (`surname_id NOT NULL`, `form_type IN ('CANONICAL','MODERN_VARIANT')`, `attestation_status IN ('ATTESTED','DERIVED')`). |

## 6. In scope

1. **Migration `0003_source_rights_distribution`** creating exactly `rights_profiles`, `sources`, `source_records`, `distribution_snapshots`, `distribution_values`, plus the enums those tables need. (`rights_profiles` and `sources` complete Migration Group A; the other three are the first half of Group B — `docs/canonical/23` §9.1, §9.2.)
2. **A source registry entry**, as configuration/data rather than scattered constants (`docs/canonical/12` §5): the PESEL `Source` (`source_key = pl_pesel_surnames`) and its `RightsProfile`, seeded idempotently, every field traceable to `fixtures/pesel/source-manifest.json` or to a canonical document.
3. **A `BULK_DATASET` PESEL importer** (`docs/canonical/12` §3.1, §9.2) over bytes already on disk: verify checksum → decode → parse fail-closed → upsert `SourceRecord` → resolve-or-create identity → write one `DistributionSnapshot` per (surname, resource) and one national `DistributionValue` per snapshot — atomically per resource. **What one `SourceRecord` represents — the resource version or the CSV row — is not settled by the canonical corpus and is §14 U-8 / D-006. Settle it before writing the migration.**
4. **Identity population** through the TASK-003 resolver: one `Surname` and one `NameForm` per distinct canonical key, created only from an exact attested source string, with explicit, non-guessing handling of every non-`EXACT` resolver outcome (§7 AC-11, AC-12).
5. **The sex/category dimension preserved verbatim** on the snapshot, uninterpreted (§5 row 7).
6. **Idempotent re-ingestion** and immutable supersession of a changed resource version.
7. **A CLI entry point** for running an import against a real file, in the style of `packages/db/bin/migrate.ts`.
8. **A reconciliation report** returned by the importer and printed by the CLI: rows read, rows imported, surnames created vs. reused, rows quarantined by reason, values written.
9. **Unit tests** (pure mapping and registry, no database) and **integration tests** against real PostgreSQL.
10. `docs/CODEMAP.md` and `PROGRESS.md` updated with observed facts.

## 7. Acceptance criteria

Each is a behaviour an automated test must demonstrate by running, not by inspection.

**Source format and parsing**

- **AC-01 — Ingestion from the approved source format.** The importer ingests the CSV representation of resources `1148808` and `1148811` through `packages/sources`' existing validator, unchanged. It does not re-implement decoding or parsing, and does not accept XLSX.
- **AC-02 — Deterministic parsing.** The same bytes always produce the same rows in the same order, and the same canonical keys. No clock, locale, environment variable or random value affects any stored field other than the system-generated UUIDv7 primary keys and `created_at`/`retrieved_at`.
- **AC-03 — Encoding correctness.** Bytes are decoded strictly as UTF-8. Invalid UTF-8 or an unexpected BOM aborts the import before anything is written.
- **AC-04 — Polish diacritics are identity-bearing.** `Łuczak` and `Luczak` produce two different `canonical_key`s and therefore two different `Surname` rows. Nothing folds, strips or merges a diacritic anywhere in the import path (`ARCHITECTURE.md` §10 invariant 8).
- **AC-05 — Preservation of original source values.** `surnames.canonical_display` and `name_forms.form` hold the source string exactly, NFC-normalised and otherwise untouched — including a trailing space, a standalone combining mark with no precomposed form, an embedded `/`, and a non-Latin script. `distribution_values.count` holds the source's own `Liczba` integer.

**Source identity, provenance and rights**

- **AC-06 — Source dataset identity, version and date.** The `SourceRecord` carries the resource's `external_record_id`, its official `source_url`, its resource-metadata object as `raw_payload`, the verified SHA-256 as `content_hash`, and `retrieved_at`. The `DistributionSnapshot` carries `as_of_date = 2026-01-20` (the PESEL reference date) and `dataset_version` identifying the resource version — never the portal timestamp, and never `retrieved_at`.
- **AC-07 — Provenance is complete before any distribution row exists.** A `DistributionSnapshot` cannot be written without a `source_id` and a `source_record_id` that already exist. Enforced by NOT NULL foreign keys, not by convention.
- **AC-08 — Rights gate.** The importer refuses to run when the effective `RightsProfile` has `automated_access = PROHIBITED` or `review_status = BLOCKED`, and writes nothing (`docs/canonical/12` §6.4, `ARCHITECTURE.md` §10 invariant 13). `RightsProfile` fields are seeded from recorded evidence only; anything not evidenced is `UNKNOWN`, never an optimistic default. **The exact seed values are fixed by §14 U-2 — seed that table field for field.** A test must assert that the seeded profile has `commercial_use = UNKNOWN` and `review_status = LEGAL_REVIEW_REQUIRED`, and that neither value stops the import.
- **AC-09 — Attribution and terms are recorded, not inferred.** `attribution_required`, `attribution_text`, `rights_url` and `terms_version` are seeded exactly as §14 U-2 specifies, traceable to `fixtures/pesel/source-manifest.json`. The dataset-level-only provenance of the CC0 statement, and the fact that resource-level metadata carries no licence attribute at all, are both recorded in `notes` (§14 U-2). No field is upgraded from `UNKNOWN` on optimism.

**Identity and resolution**

- **AC-10 — One shared normalisation.** Every `canonical_key` and `search_key` written equals `@name-atlas/resolver`'s `canonicalKey` for the same string, asserted directly against that function. `name_forms.normalization_version` equals its `NORMALIZATION_VERSION`.
- **AC-11 — Deterministic resolution through the TASK-003 resolver.** For each distinct source string the importer resolves against existing identity first. `EXACT` or `KNOWN_VARIANT` reuses the resolved `Surname`. `UNKNOWN` creates one `Surname` plus one `NameForm` (`form_type = CANONICAL`, `attestation_status = ATTESTED`) — the honest record that this exact spelling was attested by an official source.
- **AC-12 — Explicit handling of unresolved rows.** `MULTIPLE_EXACT`, `REVIEW_REQUIRED`, any validation-stage outcome, and any resolver `LOOKUP_FAILED` are **never** resolved by guessing and never silently dropped. Each is quarantined with its reason and counted in the reconciliation report. The import's overall disposition for quarantined rows is §14 U-5.
- **AC-13 — No generated identity.** No surname is created from anything other than an exact source string. No gender counterpart, transliteration, fold, fuzzy or phonetic candidate is generated or linked anywhere in this task (`ARCHITECTURE.md` §10 invariant 9).

**Distribution rows**

- **AC-14 — Surname-scoped snapshots.** Every `DistributionSnapshot` has a non-null `surname_id`. There is no dataset-global snapshot (`ARCHITECTURE.md` §10 invariant 3).
- **AC-15 — National values only.** Every `DistributionValue` has `place_id = null` and belongs to a snapshot whose `geography_level = NATIONAL`. `surname_share`, `population_rate`, `rank` and `derivation_version` are null — this task stores, it does not derive (`docs/canonical/11` §6.2 "Stored vs derived").
- **AC-16 — Suppression and absence are not zero.** Only rows present in the file produce a `DistributionValue`. No zero-count row exists anywhere, and no value below the source's confirmed minimum of 2 exists. Nothing infers a count for a surname missing from a resource (`ARCHITECTURE.md` §10 invariant 4).
- **AC-17 — The sex/category dimension is preserved and uninterpreted.** The partition is recorded exactly as §14 U-1 specifies: `universe_description` holds the publisher's verbatim Polish text, `methodology_key` names the resource without asserting a basis, `coverage_notes` states that the publisher does not disambiguate the partition, and the two partitions carry **different `comparability_group` values** so that `docs/canonical/11` §6.1's comparability rule mechanically forbids summing or comparing them. A test asserts the two groups differ and that no code path sums the two resources' counts (§5 row 7).

**Repeatability and failure**

- **AC-18 — Idempotent re-ingestion.** Re-importing identical bytes inserts nothing, updates nothing, reports `alreadyImported`, and leaves the row counts of all eight affected tables exactly equal before and after (`ARCHITECTURE.md` §10 invariant 7).
- **AC-19 — Duplicate handling.** A surname string appearing in both resources produces **one** `Surname` (guaranteed by the `canonical_key` UNIQUE constraint) and **two separate snapshots**. Two source rows differing only in case produce one `Surname`. A source file containing the same canonical key twice is a schema violation and fails the import closed.
- **AC-20 — Malformed row handling.** Any row violating the confirmed schema aborts the whole import through `PeselSchemaError`; there is no partial import and no "skip the bad row" path. A checksum mismatch aborts before parsing begins.
- **AC-21 — Transaction and failure behaviour.** One transaction per resource. Either the `SourceRecord`, every identity row, every snapshot and every value land, or none do — asserted by forcing a failure mid-import and observing all eight tables unchanged.
- **AC-22 — Immutable payloads and supersession.** An existing `SourceRecord` is never rewritten. Different bytes for the same resource create a **new** `SourceRecord` whose `supersedes_source_record_id` points at the previous one, which is marked `UPDATED` (`ARCHITECTURE.md` §10 invariant 6; `docs/canonical/12` §9.3). **Whether the two records share an `external_record_id` depends on U-8/D-006, which also decides whether `docs/canonical/11`'s `UNIQUE source_records(source_id, external_record_id)` index can be satisfied literally.** Write this criterion's concrete form only after that is recorded.
- **AC-23 — Row and count reconciliation.** The importer returns and the CLI prints: rows read, rows imported, surnames created, surnames reused, rows quarantined by reason, snapshots written, values written. `rows read = rows imported + rows quarantined` is asserted, and `rows imported` equals the number of `DistributionValue` rows the run created.
- **AC-24 — Auditability.** From any `DistributionValue` a single query reaches its snapshot, its `SourceRecord` (with checksum, URL and retrieval time), its `Source` and its `RightsProfile`. An integration test performs that traversal rather than asserting the columns exist.
- **AC-25 — No fabricated data.** Every stored value is either copied from the source bytes, derived by a named versioned function from them, read from the recorded resource metadata, or `null`. No count, date, denominator, licence term, rank or identifier is invented. `universe_size` is null (§14 U-6).
- **AC-26 — Reproducible verification.** Every command in §12 runs from a clean checkout and is reported with its actual output. The end-to-end proof is that after importing the committed fixture, `resolveSurname` returns `EXACT` for a real fixture surname — the ingested identity is usable by the TASK-003 resolver unchanged, with no adapter.

## 8. Out of scope

Their absence is a success condition. Anything here appearing in the diff is a defect.

- `EvidenceItem`, `Claim`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation`, and any `ClaimType` including `CURRENT_POPULATION` — TASK-005.
- Any derived value: rank, `1-in-X`, rarity, percentile, share, population rate, trend, male+female total.
- Confidence scoring of any kind. This task writes no confidence field because it writes no claim.
- Regional or voivodeship ingestion; `Place`, `PlaceName`, `PlaceGeometry`, `AdministrativeMembership`; any map or migration visualisation. D-004's adoption gate is untouched.
- Downloading anything. Acquisition stays manual and outside the process.
- Earlier annual snapshots (2019–2025). Cross-year comparability is unproven, and two of the archived years are byte-identical to each other (`docs/sources/acquisition/2026-09-18/README.md` finding 1).
- Any other source: TERYT, GUS geocoder, GeoNames, Wikidata, Polona, archives, FamilySearch, IJP PAN, US Census, INSEE, Belgium.
- Fuzzy, trigram, `pg_trgm`, phonetic, OCR, transliteration or diacritic-fold matching; generated gender forms; automatic historical variant detection.
- LLM enrichment of any kind. Surname meaning, etymology, origin hypotheses, heraldry, genealogy, historical records.
- `DigitalAsset` — no asset exists for a CSV resource; the table belongs to whichever task first ingests a scan.
- `name_form_relations`, `entity_external_ids`, `research_runs`, `research_module_runs`, `runtime_outbox`.
- Any API endpoint, consumer UI, admin UI, SEO, analytics, paywall, payments, Redis, BullMQ.
- Any unrelated refactor or dependency upgrade.

## 9. Data integrity invariants

Testable statements that must hold after any sequence of imports. These restate the binding invariants for this slice; the authority is `ARCHITECTURE.md` §10.

1. Every `distribution_snapshots.surname_id` is non-null and references an existing surname. **No dataset-global snapshot exists.**
2. Every `distribution_values.place_id` is null in this task's data, and its snapshot's `geography_level = 'NATIONAL'`.
3. No `distribution_values.count` is `0`, `1`, negative or null.
4. `distribution_values.surname_share`, `population_rate`, `rank` and `derivation_version` are null for every row this task writes.
5. `surnames.canonical_key` is unique; `canonicalKey(canonical_display) = canonical_key` for every row.
6. Every `name_forms.search_key` equals `canonicalKey(form)`, and every `normalization_version` equals the resolver's `NORMALIZATION_VERSION`.
7. Every `source_records.content_hash` is a 64-character lowercase hex SHA-256. **The uniqueness key over `source_records` is whatever U-8/D-006 records — it is not settled here.** `docs/canonical/11` (index specification) mandates `UNIQUE source_records(source_id, external_record_id) WHERE external_record_id IS NOT NULL`; an earlier draft of this file asserted `(source_id, external_record_id, content_hash)` instead, which is a deviation from that index and must not be adopted silently.
8. A `source_record` is never updated after insert except to set `record_status = 'UPDATED'` when superseded, and `supersedes_source_record_id` forms no cycle.
9. `distribution_snapshots.as_of_date` is the source's `data_date` and is never equal to the record's `retrieved_at` date by construction.
10. Exactly one `DistributionValue` exists per `DistributionSnapshot` in this task's data (the national aggregate).
11. No two snapshots exist for the same `(surname_id, source_record_id)`.
12. All primary keys are UUIDv7 (`ARCHITECTURE.md` §10 invariant 12).
13. Every `Source` referenced by a `SourceRecord` has a `default_rights_profile_id` that exists.

## 10. Failure behaviour

Every failure mode below must be a typed, named outcome — never an exception that escapes untyped, never a silent skip, and never a partial write.

| Condition | Behaviour |
|---|---|
| File missing or unreadable | Typed error before any database connection is opened. Nothing written. |
| SHA-256 mismatch against the expected checksum | Typed error **before parsing**. Nothing written. A changed file is a finding to report, not something to import. |
| Invalid UTF-8 or unexpected BOM | `PeselSchemaError` from `decodePeselBytes`. Nothing written. |
| Any schema drift (header, column count, line endings, missing trailing terminator, non-numeric or out-of-range count, empty surname) | `PeselSchemaError` aborts the entire import. No partial state. |
| Duplicate canonical key within one file | Typed error; import aborts. This is schema drift, not data to reconcile. |
| Rights gate fails (`automated_access = PROHIBITED` or `review_status = BLOCKED`) | Typed refusal before any read of the file. Nothing written. |
| Resolver returns `MULTIPLE_EXACT` / `REVIEW_REQUIRED` / a validation outcome | Row quarantined with its reason and counted. Never resolved by guessing. Run disposition per §14 U-5. |
| Resolver returns `LOOKUP_FAILED` | Treated as an infrastructure failure, not as an unknown surname. The import aborts; it is never recorded as a quarantined row. |
| Database error mid-import | Transaction rolls back; a typed failure result is returned. All eight tables unchanged. |
| Same bytes already imported | Not a failure. `alreadyImported`, nothing written, reconciliation report still produced. |
| Different bytes for an already-imported resource id | Not a failure. New `SourceRecord` supersedes the old one (AC-22). |

## 11. Test requirements

Tests must prove behaviour by running. A test that asserts a column exists is not a test of an invariant.

**Unit — pure, no database**

1. The registry's `Source` and `RightsProfile` entries carry only values traceable to `fixtures/pesel/source-manifest.json` or a canonical document; any field without evidence is `UNKNOWN`/`null`.
2. Mapping a parsed row yields a `canonical_key` identical to `canonicalKey` for the same string (asserted against the resolver's own function, not a copied expectation).
3. Mapping preserves the source string exactly: trailing space, standalone combining mark, embedded `/`, apostrophe, hyphen, non-Latin script.
4. Case-only variants map to one canonical key; `Łuczak`/`Luczak` map to two.
5. A checksum mismatch raises its typed error before any parsing occurs (proved by passing bytes that would also fail parsing, and asserting the checksum error).
6. The rights hard gate rejects `automated_access = PROHIBITED` and `review_status = BLOCKED`.
7. The reconciliation arithmetic holds: `rows read = rows imported + rows quarantined`.

**Integration — real PostgreSQL, via the existing `packages/testing` harness**

8. Importing the male fixture creates one `Source`, one `RightsProfile`, one `SourceRecord`, and one `Surname` + `NameForm` + `DistributionSnapshot` + `DistributionValue` per fixture row.
9. The `SourceRecord` carries the expected checksum, official URL, resource-metadata payload and `retrieved_at`; the snapshot carries `as_of_date = 2026-01-20`, distinct from the portal timestamp and from `retrieved_at`.
10. `DistributionValue.place_id` is null, `count` equals the source `Liczba`, and every derived field is null.
11. Re-importing the identical file is a no-op: `alreadyImported`, all eight tables' row counts unchanged.
12. Importing the female fixture after the male one reuses existing surnames (no duplicate `Surname`) and adds a second, separate snapshot for them.
13. A surname present in one partition and absent from the other has exactly one snapshot — and no zero-count row exists anywhere.
14. Importing bytes that fail the schema validator leaves all eight tables untouched.
15. Importing changed bytes for the same resource id creates a second `SourceRecord` superseding the first and does not mutate the first.
16. Forcing a mid-import database failure leaves all eight tables untouched.
17. After import, `resolveSurname` returns `EXACT` for a real fixture surname and `KNOWN_VARIANT` is not required to reach it — the ingested identity is directly resolvable (AC-26).
18. A row whose surname string the resolver cannot resolve unambiguously is quarantined, is counted, and creates no `Surname` (construct the ambiguity synthetically; see §12 fixture rules).
19. The audit traversal from a `DistributionValue` to its `RightsProfile` returns the expected row in one query (AC-24).
20. Every invariant in §9 is asserted as a query against the database after a full two-resource import.

**Property-based (`fast-check`, kept small per `docs/canonical/17` §14)**

21. For arbitrary valid `(surname, count)` row sets, mapping is deterministic and the count is preserved exactly.
22. Mapping never produces a `canonical_key` that differs from `canonicalKey(surname)`.

## 12. Fixture strategy

The distinction between genuine source-derived data and synthetic construction must be visible in the code, not only in a comment.

**Genuine, source-derived (already committed, TASK-002):** `fixtures/pesel/national-male-2026-01-20.csv` (22 rows) and `national-female-2026-01-20.csv` (23 rows). Every row is byte-identical to a real line of the official resource; the selection method is documented in `docs/sources/pesel.md`. These are the primary ingestion fixtures.

Rules that bind:

1. **A fixture's checksum is not the resource's checksum.** The committed fixtures are 22- and 23-row excerpts, not the official files. Tests must compute the fixture's own SHA-256 and pass it explicitly as the expected checksum, and the test code must say in one line that this is an excerpt's checksum. The official resource checksums in `fixtures/pesel/source-manifest.json` must never be presented as matching a fixture.
2. **Synthetic fixtures are named as such.** Anything constructed for this task — a drift case, a duplicate-key file, an ambiguity case, a changed-bytes case — lives under an explicitly synthetic name (for example `fixtures/pesel/synthetic/`) or is built inline in the test, and carries a comment stating it is synthetic and is not PESEL evidence.
3. **Counts in synthetic fixtures are never presented as real.** A synthetic row's `Liczba` is a mechanical value, never a plausible-looking real-world figure attributed to a real surname.
4. **No new genuine fixture is added.** If a test needs a real row that the committed fixtures do not contain, that is a finding to record — the full resources are not in the repository and must not be added (`AGENTS.md` §6).
5. **Resource metadata used as `raw_payload` in tests** comes from the committed capture under `docs/sources/acquisition/2026-09-18/metadata/`, which is a verbatim record of the publisher's own response. Its own status claims carry no authority (see that directory's README).

## 13. Constraints

- Preserve all currently passing behaviour. 95 unit tests and 28 integration tests pass today; none may regress.
- Follow existing package and module ownership. The importer belongs in `packages/sources`; the schema in `packages/db/migrations`. Do not create a second surname model, a second normalisation function, or a parallel source registry.
- Reuse `packages/sources`' existing validator unchanged. Do not re-implement decoding or parsing.
- No new dependency without a one-line justification in the change description (`AGENTS.md` §6). This task is not expected to need one.
- No dependency upgrade.
- Smallest complete implementation that satisfies §7. No abstraction for a second source, a second country, or a future connector — `docs/canonical/12`'s connector `Protocol` is a contract to satisfy later, not scaffolding to build now.
- `docs/canonical/`, `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/` and `prompts/` are read-only (`AGENTS.md` §2).
- Raw source files are never committed. Only checksums, metadata and the existing small fixtures are versioned.
- Do not silently merge surnames. Do not invent source semantics. Where a canonical document does not support a requirement, record it as unresolved rather than choosing.

## 14. Unresolved decisions — answer before implementation

Discovered from repository evidence during this task's preflight. **U-1, U-2 and U-3 were answered by the project owner on 2026-09-19 — their answers are recorded in full below and are binding on the implementer.** U-4 to U-7 need a recorded choice from the implementing session. **U-8 is still open and still blocks the migration**; it needs a recorded choice **in `docs/DECISIONS_NEEDED.md` or an ADR**, because it resolves a contradiction between two canonical documents (`AGENTS.md` §2).

**U-1 — What does the male/female split actually partition? — ANSWERED 2026-09-19 (project owner). Underlying fact remains open.**

**Decision: do not decide it. Carry the publisher's own words and make summation structurally impossible.** The implementer must:

- set `universe_description` to the publisher's own text, verbatim and untranslated — male: `Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 20.01.2026`; female: the same with `żeńskich`. (The captured metadata wraps this in a single `<p>` element; strip only that wrapper and record that you did. Do not paraphrase, translate, gloss or summarise the Polish.)
- set `methodology_key` to a key that names the resource without interpreting it — `pesel_current_surname_national_2026_male_resource` / `…_female_resource`. **Forbidden:** any key asserting a basis, e.g. `by_bearer_sex`, `by_grammatical_gender`, `male_persons`.
- set `comparability_group` to a **different value per partition** (`pesel_2026_national_male` / `pesel_2026_national_female`). `docs/canonical/11` §6.1 defines this field as the gate on quantitative comparison — separate groups mean the two partitions may not be summed or compared without explicit extra justification, which is exactly the protection this open question needs. This is the enforcement mechanism for AC-17, not a comment.
- set `coverage_notes` to state plainly that the publisher does not disambiguate whether the partition is by the bearer's sex or by the grammatical gender of the surname form, and that the two resources are therefore not summable.

**What this answer does not do:** it does not establish what the split means. That fact is still unknown and still requires the publisher. **It remains a precondition of TASK-005**, alongside U-4 — no `CURRENT_POPULATION` claim may be phrased in terms of "men"/"women" or "people" on this evidence until both are answered. TASK-004 is unblocked because TASK-004 makes no claim.

**U-2 — Resource-level licence and the `RightsProfile`. — ANSWERED 2026-09-19 (project owner). Legal review still not performed; paid surfaces stay gated.**

**Decision: seed the profile from recorded evidence only, and leave the commercial gate closed.** Every field below is required and NOT NULL (`docs/canonical/11` §9.4); these are the values to seed, and each is traceable to evidence or is honestly `UNKNOWN`:

| Field | Value | Basis |
|---|---|---|
| `terms_version` | `CC0 1.0` | dataset-level `license_name`, read from the portal's own dataset metadata |
| `terms_hash` | `null` | terms text not retained |
| `checked_at` | `2026-09-19` | this decision — a recorded rights posture, **not** a legal review |
| `metadata_rights` | `ALLOWED` | resource metadata is published openly by the portal |
| `image_rights` | `UNKNOWN` | no image exists for a CSV resource; nothing evidenced |
| `transcription_rights` | `UNKNOWN` | not applicable; nothing evidenced |
| `database_rights` | `ALLOWED` | CC0 1.0 expressly waives sui generis database rights |
| `automated_access` | `ALLOWED` | the publisher operates a public, documented JSON:API (`api.dane.gov.pl/1.4/…`) as the declared access route, with per-resource machine download endpoints recorded in `fixtures/pesel/source-manifest.json`. **Residual:** the portal's own terms of use have not been read. TASK-004 performs no automated retrieval, so nothing in this task relies on this value. |
| `commercial_use` | **`UNKNOWN`** | dataset-level CC0 would permit it, but **resource-level inheritance of the dataset licence is unverified** — resource metadata carries no licence attribute at all. `UNKNOWN` is the honest state. |
| `redistribution` | **`UNKNOWN`** | same gap, same reasoning |
| `local_cache` | `ALLOWED` | required for any local ingestion; consistent with an open-data portal and dataset-level CC0 |
| `attribution_required` | `false` | CC0 1.0 requires none |
| `attribution_text` | `Dane pochodzą z rejestru PESEL, Ministerstwo Cyfryzacji, dane.gov.pl (CC0 1.0)` | courtesy credit, recorded although not required |
| `source_owner` | `Ministerstwo Cyfryzacji` | verified, institution `333` |
| `rights_url` | the dataset URL in `fixtures/pesel/source-manifest.json` (`official_dataset_url`) — the only page where the licence is actually stated | verified |
| `contact_required` | `false` | nothing evidences a contact requirement |
| `review_status` | **`LEGAL_REVIEW_REQUIRED`** | nobody has performed a legal review. `APPROVED` would be a false statement of fact. |
| `valid_from` | `2026-09-19` | |
| `valid_to` | `null` | no expiry evidenced |
| `notes` | must record: licence is stated at **dataset** level only; resource-level metadata carries no licence, rights or terms attribute across all four 2026 resources; resource inheritance of CC0 is an unverified assumption; this profile is a recorded posture by the project owner, not a legal review | |

**Why this unblocks TASK-004 and still protects the business.** The only hard gate that stops ingestion is `automated_access == PROHIBITED` (`docs/canonical/12` §6.4) — not met, so the importer runs. `review_status = LEGAL_REVIEW_REQUIRED` is not `BLOCKED`, so AC-08's refusal does not fire. Meanwhile `commercial_use = UNKNOWN` makes `evidence.paid_surface_eligible = false` automatically, by the same §6.4 gate, so nothing on this source can reach a paid report until somebody confirms the resource licence. That confirmation is a real open decision and is now recorded as **D-007** in `docs/DECISIONS_NEEDED.md`; it blocks M5/M6, not TASK-004.

**U-3 — Raw source bytes are not stored anywhere. — ANSWERED 2026-09-19 (project owner). Deviation accepted and recorded.**

**Decision: accept the deviation from `docs/canonical/12` §9.2 ("store raw file + metadata") for this task, and do not fake it.** Concretely:

- `SourceRecord.raw_text_ref` is `null`, with the reason recorded in the record's own notes and in `PROGRESS.md` — not left silently empty.
- The bytes are identified by `content_hash` (the verified SHA-256), `source_url` (the official endpoint) and `raw_payload` (the publisher's own resource-metadata object). That triple is what makes the import reproducible without object storage.
- **Condition of this answer:** the project owner retains the acquired bytes outside the repository (the 2026-09-18 acquisition archive, checksums recorded in `docs/sources/acquisition/2026-09-18/SHA256SUMS.txt`). The deviation is only survivable because the bytes exist somewhere and are checksum-pinned. If they are lost, the import becomes unreproducible and that is a finding to raise, not to work around.
- Raw object storage remains an **M0-infrastructure obligation carried forward**, not something TASK-004 invents. Do not create `ops/`, do not provision storage, and do not commit raw files (`AGENTS.md` §6).

**U-4 — The unit of `Liczba`.** Not explicitly stated by the publisher (§5 row 9). Does not block this task, which stores the raw integer and a verbatim universe description. **Must be resolved before TASK-005** phrases any statement about "how many living people". Record it as carried forward, do not close it here.

**U-5 — Disposition of a run containing quarantined rows.** Options: (a) abort the whole import if any row quarantines, (b) import the resolvable rows and report the quarantine, (c) make it a flag. The canonical documents do not decide this. **Recommended:** (a) for the production resources, since a quarantine in a two-column official file almost certainly means a misunderstanding of the source rather than a bad row — and "fail closed" is the standing posture (`ARCHITECTURE.md` §10 invariant 7). Record whichever is chosen in the task's own §7.

**U-6 — `universe_size` denominator.** Left null. The PESEL living-population denominator is not verified, and `docs/canonical/11` §6.1 stores it "only if methodologically valid". This is the open rarity-denominator question already recorded in `docs/sources/pesel.md` and D-001. Do not invent one.

**U-7 — Resolver-inside-transaction mechanics.** `resolveSurname` runs its queries inside a PostgreSQL `READ ONLY` transaction. Calling it from within a read-write import transaction needs a decision: resolve in a separate read pass before the write transaction (simpler, with a time-of-check/time-of-use gap that the `canonical_key` UNIQUE constraint closes safely), or perform the lookup inside the import transaction using `canonicalKey` plus a direct `SELECT`. Either is acceptable; **it must not be resolved by relaxing the resolver's read-only guarantee.** Record the choice.

**U-8 — What one `SourceRecord` represents, and the `source_records` UNIQUE index. (recorded decision required in `docs/DECISIONS_NEEDED.md` D-006 or an ADR; blocks the migration, AC-06, AC-22 and §9 invariant 7)**
Two canonical documents disagree. `docs/canonical/12` §3.1/§9.2 describes a **resource-version**-scoped `BULK_DATASET` import (`DOWNLOAD VERSION → checksum → … → atomic snapshot activation`), and `docs/canonical/11` §9.2 calls `raw_payload` "size-limited" — both arguing against one record per CSV row. But `docs/canonical/11` §37.2's own worked example is **row**-scoped (`external_record_id: row/resource identifier`, `raw_payload: {surname, count}`), and `docs/canonical/11`'s index specification mandates `UNIQUE source_records(source_id, external_record_id) WHERE external_record_id IS NOT NULL` — which a resource-version reading collides with the moment a resource is reissued, since supersession (AC-22) then needs two rows sharing that key. The three options, their costs and a recommendation are written up in `docs/DECISIONS_NEEDED.md` **D-006**. **Do not resolve this by choosing one shape in the migration file** — `AGENTS.md` §2 requires a contradiction between canonical documents to be recorded, not silently settled. Record the choice in D-006, then write AC-06, AC-22 and §9 invariant 7 in their concrete form.

## 15. Preflight

Before editing, read-only and targeted — no repository-wide exploration:

1. This task file, `PROGRESS.md`, and the §14 answers.
2. `docs/sources/pesel.md` and `fixtures/pesel/source-manifest.json` — the verified source facts.
3. The canonical sections named in §3, by line range. Do not read the canonical corpus in bulk.
4. `packages/sources/src/` — the existing validator's exact API.
5. `packages/resolver/src/` — `canonicalKey`, `NORMALIZATION_VERSION`, `resolveSurname`'s outcome type.
6. `packages/db/migrations/0002_identity_core.ts` and `packages/db/src/generated/db.ts` — existing schema and conventions.
7. `packages/testing/src/postgres-container.ts` — the harness, including its `TEST_DATABASE_URL` fallback.
8. `tests/integration/src/resolver.test.ts` — the established integration-test shape.
9. `git status` and the current diff.

Then state a short plan naming the exact files to change, and implement.

## 16. Verification

Run from a clean checkout and report actual output. Never claim a command passed without having run it.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Then against a real PostgreSQL:

```bash
pnpm db:migrate            # applies 0001, 0002 and the new 0003
pnpm db:generate-types     # must produce no diff against the committed generated types
pnpm test:integration
pnpm build
```

Container registries have been network-egress-blocked in every session so far. If `pnpm test:integration` cannot pull the pinned `postgis/postgis` image, use the `TEST_DATABASE_URL` fallback in `packages/testing` against a locally installed PostgreSQL 16 + PostGIS, and **state plainly that the pinned image itself was not exercised** — as TASK-003 did. Do not skip the check.

## 17. Diff review

Before declaring the task complete, inspect the entire diff file by file and confirm:

1. Nothing from §8 is present — no claim, no evidence, no confidence, no derived value, no place, no second source.
2. No fuzzy, phonetic, transliteration, diacritic-fold or gender-generation logic was introduced anywhere.
3. No second normalisation function and no second surname model exist.
4. `pnpm-lock.yaml` changed only if a workspace member was added; no dependency was upgraded.
5. No raw source file was committed; no synthetic fixture is presented as source evidence.
6. `docs/canonical/` and the other read-only directories are untouched (`git status --porcelain` on those paths is empty).
7. No debug code, stray file or accidental formatting churn.

## 18. Documentation / handoff

- `docs/CODEMAP.md` — update only if the stable module structure changed (it will: new migration, new importer module, new CLI entry point).
- `PROGRESS.md` — facts only: TASK-004 status, files and modules introduced, migration applied, verification actually run with PASS/FAIL, the §14 answers as recorded decisions, and any unresolved blocker still open. No session diary.
- `docs/DECISIONS_NEEDED.md` — U-1, U-2 and U-3 are answered (§14) and need no entry. **D-006 (U-8) must be resolved and recorded there or as an ADR before the migration is written.** D-007 (resource-level PESEL licence confirmation) stays open and is not this task's to close. Add a new entry only if a further genuine project-level blocker is discovered.
- Carry U-4 forward explicitly as a precondition of TASK-005.

## 19. Definition of done

- Every acceptance criterion in §7 is demonstrated by a test that was run, with its actual output reported.
- Migration `0003` creates exactly the five tables in §6 item 1 — nothing from §8.
- Every invariant in §9 is asserted against a real database after a full two-resource import.
- Every failure mode in §10 has a test.
- `pnpm db:generate-types` produces no diff after commit.
- The complete diff has been reviewed per §17 and contains no unrelated work.
- `docs/CODEMAP.md` and `PROGRESS.md` record observed facts; `docs/canonical/` is untouched.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin TASK-005. Do not write `tasks/005-*.md`.
