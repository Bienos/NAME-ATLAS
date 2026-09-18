# NAME ATLAS — CANONICAL DATA MODEL

**Document:** 11. Canonical Data Model  
**Version:** 1.0.0 — Candidate Data Baseline  
**Date:** 2026-09-17  
**Market:** Poland-first, global-ready  
**Depends on:** `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md`  
**Purpose:** Canonical domain model, persistence model and data contracts for the surname-level MVP  
**Status:** Candidate for approval before Source Connector Architecture

---

# 0. AUTHORITY, SCOPE AND DESIGN RULES

This document converts the object inventory and trust architecture from Document 10 into a production-oriented domain and PostgreSQL/PostGIS model. It is deliberately more technical than the product/architecture documents, but it does **not** define source-specific connectors, fuzzy-matching algorithms, runtime queues, API endpoints or payment webhooks. Those remain Documents 12–17.

Where an older project document conflicts with `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md`, Document 10 wins. Where this document refines an earlier conceptual object into a cleaner persistence design without changing its product meaning, the refinement below becomes canonical for implementation.

The model follows eight non-negotiable rules:

1. **Prose is downstream.** Generated copy is not the knowledge base.
2. **Raw data is never destroyed by normalisation.** Original spellings, source fields, dates and OCR survive alongside normalised forms.
3. **Search candidates are not historical facts.** A fuzzy/transliterated/phonetic candidate cannot become a historical variant without evidence.
4. **Surname-level, family-level and person-level evidence are separate scopes.** The database must make cross-scope overclaiming difficult.
5. **Time is first-class.** Historical names, administrative memberships, occurrences and distributions carry temporal context.
6. **Provenance is first-class.** Important claims are traceable to evidence and source records.
7. **Rights are first-class.** Commercial/use rights are queryable data, not comments in documentation.
8. **Unknown remains unknown.** Missing, unavailable, blocked, not retrieved and zero are different states.

---

# 1. EXECUTIVE DATA MODEL SUMMARY

## 1.1 Central thesis

Name Atlas should use **PostgreSQL as the system of record, with PostGIS for geography and graph-like relational edges for evidence**, rather than adopting a dedicated graph database for MVP.

The canonical knowledge path is:

```text
SOURCE
  ↓
SOURCE RECORD
  ↓
EVIDENCE ITEM
  ↓
CLAIM
  ↓
CONFIDENCE ASSESSMENT
  ↓
COVERAGE / DISCOVERY
  ↓
PROFILE / REPORT / UI / SEO
```

The surname itself sits beside this trust chain:

```text
SURNAME
  ├── NAME FORM
  ├── DISTRIBUTION SNAPSHOT
  ├── ORIGIN HYPOTHESIS
  ├── MEANING INTERPRETATION
  ├── HISTORICAL VARIANT
  ├── HISTORICAL OCCURRENCE
  └── MIGRATION PATTERN
           │
           └───────────── all important propositions become CLAIMS
```

## 1.2 Source data vs derived data vs interpretation vs presentation

| Layer | Examples | Authoritative role |
|---|---|---|
| **Source data** | PESEL row, Polona item/page, TERYT place ID, dictionary entry | Preserved representation of external evidence |
| **Normalised domain data** | Canonical surname, resolved place, name form, historical occurrence | Structured internal representation |
| **Derived data** | National rank, 1-in-X, regional share, deduplicated counts | Deterministic or documented computation |
| **Interpretation** | Toponymic origin hypothesis, meaning interpretation, possible migration pattern | Evidence-led reasoning; never raw fact |
| **Trust layer** | Claim, ClaimEvidence, ConfidenceAssessment, RightsProfile | Governs what can be asserted and where |
| **Presentation** | SurnameProfile projection, DiscoveryIndex presentation, ReportSection, SEO copy | Consumer-facing derivative; never source of truth |

## 1.3 MVP canonical objects

The P0/P1 surname-level model consists of:

```text
KnowledgeEntity
Surname
NameForm
NameFormRelation
SurnameResolution

Place
PlaceName
PlaceGeometry
AdministrativeMembership

DistributionSnapshot
DistributionValue

SurnameClassification
MeaningInterpretation
OriginHypothesis
HistoricalVariant
HistoricalOccurrence
MigrationPattern

Source
SourceRecord
DigitalAsset
RightsProfile
EvidenceItem
Claim
ClaimEvidence
ConfidenceAssessment
Citation

ResearchRun
CoverageAssessment
CoverageDimension
DiscoveryIndex
DiscoveryIndexEntry
SurnameProfileProjection

Report
ReportVersion
ReportSection
ReportClaimReference
Offer
Entitlement
```

## 1.4 Important refinement: `HistoricalPlace` is a projection, not a second place truth

Earlier documents describe a `HistoricalPlace` object. The canonical persistence model should **not** create a second independent place identity beside `Place`.

Instead:

```text
Place
+
PlaceName(valid time)
+
AdministrativeMembership(valid time)
+
PlaceGeometry(valid time, precision)
=
HistoricalPlace projection for a requested period
```

This prevents the system from accidentally treating “Warsaw in 1900” and “Warsaw today” as unrelated entities while still preserving different names, polities, jurisdictions and boundaries.

A `HistoricalPlace` DTO/view may still exist in API/report code, but it is assembled from these canonical tables.

## 1.5 Important refinement: `SurnameProfile` is not primary truth

`SurnameProfile` should be a **versioned computed projection/cache**, assembled from validated claims and domain objects. It should not be the database record from which claims are later inferred.

Canonical direction:

```text
canonical entities + claims + evidence + confidence
                  ↓
       SurnameProfileProjection
                  ↓
           UI / SEO / report
```

---

# 2. DOMAIN BOUNDARIES

Name Atlas should use bounded contexts to stop product concerns from leaking into research truth.

| Context | Purpose | Core objects | Owns truth for | Depends on |
|---|---|---|---|---|
| **Identity** | Canonical surname identity and name forms | Surname, NameForm, NameFormRelation, SurnameResolution | What surname/form a query refers to | Source evidence, resolution rules |
| **Geography** | Current and historical place identity | Place, PlaceName, PlaceGeometry, AdministrativeMembership | What a place is/was and when | External gazetteers/TERYT |
| **Distribution** | Dataset-scoped surname population/distribution | DistributionSnapshot, DistributionValue | Count/distribution within explicit dataset/time scope | Identity, Geography, Source |
| **Onomastics** | Meaning, structure and origin interpretations | SurnameClassification, MeaningInterpretation, OriginHypothesis | Structured interpretations | Identity, Evidence |
| **History** | Attested forms and occurrences over time | HistoricalVariant, HistoricalOccurrence, MigrationPattern | Historical surname-level observations/hypotheses | Identity, Geography, Source/Evidence |
| **Sources & Rights** | External provenance and permitted use | Source, SourceRecord, DigitalAsset, RightsProfile | Where data came from and how it may be used | None |
| **Evidence & Claims** | Epistemic control layer | EvidenceItem, Claim, ClaimEvidence, ConfidenceAssessment, Citation | What Name Atlas may assert | All research contexts |
| **Research Runtime** | Auditable production of outputs | ResearchRun, run inputs/outputs | How a result was produced | Source, models/prompts, QA |
| **Product Projection** | Data availability and consumer inventory | CoverageAssessment, DiscoveryIndex, SurnameProfileProjection | What product modules may render | Claims/evidence/domain objects |
| **Report** | Versioned editorial artifact | Report, ReportVersion, ReportSection, ReportClaimReference | What was shown to a user at a point in time | Product Projection, Claims |
| **Commercial** | Access configuration | Offer, Entitlement | What can be purchased/accessed | Product eligibility, payment layer later |
| **Family Research — later** | Private person/branch research | Person, FamilyPerson, FamilyBranch, CandidateRecord, EvidenceLink, AncestorRelationship | Family/person-level research | Existing source/evidence model |

The most important ownership rule is:

> **Product Projection may suppress, order and summarise canonical research objects, but it may not create new research facts.**

---

# 3. CANONICAL OBJECT INVENTORY

## 3.1 Infrastructure object — `KnowledgeEntity`

A lightweight internal entity registry is recommended for any object that can become the subject/object of a Claim.

**Why it exists:** it gives `Claim.subject_entity_id` a real foreign key without building polymorphic `subject_type + subject_id` references that PostgreSQL cannot enforce.

Typical registered entities:

- Surname;
- NameForm;
- Place;
- OriginHypothesis;
- MeaningInterpretation;
- HistoricalVariant;
- HistoricalOccurrence;
- MigrationPattern;
- later Person / FamilyPerson / CandidateRecord.

It is not user-facing and is not a graph database. It is a referential-integrity layer.

## 3.2 Object status matrix

| Object | Definition | Scope | Source of truth | MVP |
|---|---|---|---|---|
| `KnowledgeEntity` | Claimable entity registry | any | system | **P0** |
| `Surname` | Canonical linguistic/historical surname entity | surname | canonical DB | **P0** |
| `NameForm` | Exact spelling/script/form associated with or considered for a surname | surname | evidence/system | **P0** |
| `NameFormRelation` | Typed relation between forms | surname | evidence/analysis | **P0** |
| `SurnameResolution` | Query-time decision mapping raw input to entity/candidates | query | runtime | **P0 object; optional persistence** |
| `Place` | Global canonical geographic entity | shared | canonical DB | **P0** |
| `PlaceName` | Language/script/time-specific name for a Place | shared | evidence | **P0** |
| `PlaceGeometry` | Time/precision-aware point or polygon for Place | shared | source | **P1/P0 if maps** |
| `AdministrativeMembership` | Place belongs to administrative/political unit during period | shared | evidence | **P0 historical support** |
| `DistributionSnapshot` | Dataset/time/method scoped surname-distribution observation | surname | source/derived | **P0** |
| `DistributionValue` | One geographic value within snapshot | surname | source/derived | **P0 conditional** |
| `SurnameClassification` | Structured formation/type interpretation | surname | interpretation | **P1** |
| `MeaningInterpretation` | Meaning/root interpretation | surname | interpretation | **P0 conditional** |
| `OriginHypothesis` | Competing linguistic/geographic/toponymic origin hypothesis | surname | interpretation | **P0 conditional** |
| `HistoricalVariant` | Evidence-governed relationship between surname and NameForm | surname | evidence/interpretation | **P0** |
| `HistoricalOccurrence` | Attested surname/form occurrence in source/time/place | surname | evidence | **P0** |
| `MigrationPattern` | Surname-level distribution movement hypothesis | surname | interpretation | **P1/later** |
| `Source` | Dataset/publication/provider/collection identity | shared | source registry | **P0** |
| `SourceRecord` | Concrete retrieved item/row/page/record | shared | ingestion | **P0** |
| `DigitalAsset` | Scan/image/PDF/audio/etc. linked to SourceRecord with own rights | shared | source | **P1; important for archives** |
| `RightsProfile` | Machine-queryable rights state | shared | legal/source review | **P0** |
| `EvidenceItem` | Atomic evidence used by claims | any | source/derivation | **P0** |
| `Claim` | Locale-neutral proposition about an entity | any | evidence engine | **P0** |
| `ClaimEvidence` | Supports/contradicts/context edge | any | evidence engine | **P0** |
| `ConfidenceAssessment` | Versioned qualitative assessment of a Claim | any | confidence engine | **P0** |
| `Citation` | Stable provenance/locator object for presentation/audit | any | source/evidence | **P0** |
| `ResearchRun` | Immutable audit record for one research execution | internal | runtime | **P0** |
| `CoverageAssessment` | Run/profile-level availability summary | surname | product engine | **P0** |
| `CoverageDimension` | One coverage dimension + reason/blocker | surname | product engine | **P0** |
| `DiscoveryIndex` | Validated inventory eligible for preview/paywall | surname | product engine | **P0 before premium** |
| `DiscoveryIndexEntry` | One typed inventory category/count | surname | product engine | **P0** |
| `SurnameProfileProjection` | Computed/cached consumer-ready structured profile | surname | derived | **P0 projection** |
| `Report` | Logical purchased/generated report identity | surname | report system | **P0 paid** |
| `ReportVersion` | Immutable snapshot of a report generation | surname | report system | **P0 paid** |
| `ReportSection` | Presentation chapter referencing canonical claims | surname | report system | **P0 paid** |
| `ReportClaimReference` | Report section → Claim mapping | surname | report system | **P0 paid** |
| `Offer` | Configurable purchasable product definition | commerce | commercial config | **P0 paid** |
| `Entitlement` | Access grant to report/product | user/session | commerce | **P0 paid** |

### Objects intentionally not made canonical tables in MVP

- **`HistoricalPlace`** — projection from Place + temporal names/admin/geometry.
- **`ArchiveReference`** — projection/count over eligible archival `SourceRecord` objects and related occurrences; no duplicate truth table required.
- **`DataGapAssessment`** — represented by `CoverageDimension` states/reasons and run outputs; a dedicated table can be added if later workflow requires it.
- **`TimelineEvent`** — presentation object assembled from occurrences/variants/claims, not primary truth.

---

# 4. ENTITY-BY-ENTITY FIELD SPECIFICATION

The following tables describe the canonical logical fields. Physical SQL choices appear later.

## 4.1 `KnowledgeEntity`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `entity_id` | UUIDv7 | yes | no | System | Globally unique internal ID |
| `entity_type` | EntityType | yes | no | System | SURNAME, NAME_FORM, PLACE, ORIGIN_HYPOTHESIS, etc. |
| `scope` | EvidenceScope | yes | no | System | SURNAME_LEVEL, FAMILY_LEVEL, PERSON_LEVEL, SHARED |
| `privacy_class` | PrivacyClass | yes | no | System | PUBLIC, INTERNAL, USER_PRIVATE, SENSITIVE_FAMILY |
| `lifecycle_status` | EntityStatus | yes | no | System | ACTIVE, MERGED, SUPERSEDED, RETRACTED |
| `created_at` | timestamptz | yes | no | System | Creation timestamp |
| `updated_at` | timestamptz | yes | no | System | Last structural update |

**Rule:** domain tables that are claimable use `entity_id` as their PK/FK to `knowledge_entities`.

## 4.2 `Surname`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `surname_id` | UUIDv7 / FK Entity | yes | no | System | Canonical surname entity ID |
| `canonical_display` | text | yes | no | Canonical | Preferred display form; never silently transliterated |
| `canonical_key` | text | yes | no | Derived deterministic | Search/entity key; implementation defined by Resolution Engine |
| `canonical_key_version` | text | yes | no | System | Version of key-generation rules |
| `primary_script` | ISO 15924 code | yes | no | Source/system | e.g. Latn, Cyrl |
| `primary_locale` | BCP-47/null | no | yes | Interpretation | Primary display locale if useful; not origin claim |
| `entity_status` | SurnameStatus | yes | no | System | ACTIVE, AMBIGUOUS, MERGED, DEPRECATED |
| `merged_into_surname_id` | UUID/null | no | yes | System | Canonical merge target |
| `created_at` | timestamptz | yes | no | System | — |
| `updated_at` | timestamptz | yes | no | System | — |

**Do not store as surname columns:** meaning, origin country, rarity, first occurrence, coat of arms, “oldest ancestor”. Those are claims/derived objects.

## 4.3 `NameForm`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `name_form_id` | UUIDv7 / FK Entity | yes | no | System | Form identity |
| `surname_id` | UUID | conditional | yes | Canonical | Owning surname only when association accepted at required level |
| `form` | text | yes | no | Raw/canonical | Exact preserved spelling |
| `unicode_nfc` | text | yes | no | Deterministic | NFC-normalised value |
| `search_key` | text | yes | no | Deterministic | Search representation |
| `normalization_version` | text | yes | no | System | Version used to derive search representation |
| `script` | ISO 15924 | yes | no | Deterministic/source | Script |
| `language_code` | BCP-47/ISO 639/null | no | yes | Source/interpretation | Language association when supported |
| `form_type` | NameFormType | yes | no | System/evidence | CANONICAL, MODERN_VARIANT, HISTORICAL_ATTESTED, TRANSLITERATION, MIGRATION_ADAPTATION, LINGUISTIC_NORMALISATION, SEARCH_CANDIDATE |
| `attestation_status` | AttestationStatus | yes | no | Evidence | ATTESTED, DERIVED, GENERATED_CANDIDATE, DISPUTED |
| `valid_from_*` / `valid_to_*` | TemporalExtent fields | no | yes | Source | Known/approximate period |
| `geographic_scope_place_id` | UUID/null | no | yes | Source | Place context if the form is geography-specific |
| `created_by_run_id` | UUID/null | no | yes | System | Run that generated/ingested form |
| `created_at` | timestamptz | yes | no | System | — |

**Hard rule:** `SEARCH_CANDIDATE` + `GENERATED_CANDIDATE` cannot be surfaced as a historical variant without a separate evidence-backed relation/assertion.

## 4.4 `NameFormRelation`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `relation_id` | UUIDv7 | yes | no | System | — |
| `from_name_form_id` | UUID | yes | no | System | Source form |
| `to_name_form_id` | UUID | yes | no | System | Related form |
| `relation_type` | NameFormRelationType | yes | no | Evidence/analysis | ATTESTED_AS, POSSIBLE_VARIANT_OF, TRANSLITERATION_OF, MIGRATION_ADAPTATION_OF, SEARCH_SIMILAR_TO, UNRELATED_SIMILAR_FORM |
| `claim_id` | UUID/null | no | yes | Evidence engine | Claim governing interpretive relationship |
| `user_facing` | boolean | yes | no | System | Whether relationship may appear to users |
| `created_at` | timestamptz | yes | no | System | — |

`SEARCH_SIMILAR_TO` is retrieval metadata, not historical truth.

## 4.5 `SurnameResolution`

This is primarily a runtime value object. Persistence is optional but recommended inside ResearchRun audit data.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `resolution_id` | UUIDv7 | yes | no | System | — |
| `research_run_id` | UUID | yes | no | System | Parent run |
| `raw_input` | text | yes | no | User | Preserved query input |
| `unicode_nfc` | text | yes | no | Deterministic | NFC normalisation |
| `resolution_status` | ResolutionStatus | yes | no | Resolver | EXACT, KNOWN_VARIANT, MULTIPLE_EXACT, POSSIBLE_VARIANT, FUZZY_MATCH, UNKNOWN, REVIEW_REQUIRED |
| `resolved_surname_id` | UUID/null | no | yes | Resolver | Selected canonical surname |
| `candidate_surname_ids` | UUID[] / relation | no | yes | Resolver | Candidate entities |
| `resolution_method_version` | text | yes | no | System | — |
| `user_confirmation_required` | boolean | yes | no | Resolver | — |
| `created_at` | timestamptz | yes | no | System | — |

Raw surname input should not be copied into generic analytics merely because it exists in the product DB.

---

# 5. GEOGRAPHY MODEL

## 5.1 `Place`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `place_id` | UUIDv7 / FK Entity | yes | no | System | Canonical place identity |
| `place_type` | PlaceType | yes | no | Source/system | COUNTRY, REGION, PROVINCE_STATE, COUNTY_DISTRICT, MUNICIPALITY, CITY, VILLAGE, PARISH, HISTORICAL_TERRITORY, OTHER |
| `current_display_name` | text | yes | no | Canonical | Current/default display name |
| `current_country_code` | ISO 3166-1/null | no | yes | Source | Modern country where meaningful |
| `centroid` | geography(Point,4326)/null | no | yes | Source/derived | Approximate/current centroid; not historical boundary |
| `spatial_precision` | SpatialPrecision | yes | no | Source/system | EXACT_POINT, LOCALITY, MUNICIPALITY, REGION, COUNTRY, APPROXIMATE, UNKNOWN |
| `entity_status` | PlaceStatus | yes | no | System | ACTIVE, HISTORICAL_ONLY, MERGED, DISPUTED |
| `created_at` | timestamptz | yes | no | System | — |
| `updated_at` | timestamptz | yes | no | System | — |

A place must not receive a precise coordinate if evidence supports only a region.

## 5.2 `PlaceName`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `place_name_id` | UUIDv7 | yes | no | System | — |
| `place_id` | UUID | yes | no | Canonical | — |
| `name` | text | yes | no | Source | Preserved name |
| `normalized_name` | text | yes | no | Deterministic | Search form |
| `language_code` | text/null | no | yes | Source | — |
| `script` | text | yes | no | Source/deterministic | — |
| `name_type` | PlaceNameType | yes | no | Source/system | CURRENT, HISTORICAL, OFFICIAL, EXONYM, ENDONYM, PARISH_FORM, TRANSCRIPTION, OTHER |
| `temporal_*` | TemporalExtent fields | no | yes | Source | Period in which name applied |
| `source_record_id` | UUID/null | no | yes | Provenance | Attesting record |
| `is_preferred_for_period` | boolean | yes | no | System | — |

## 5.3 `PlaceGeometry`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `place_geometry_id` | UUIDv7 | yes | no | System | — |
| `place_id` | UUID | yes | no | Canonical | — |
| `geometry` | geometry(Geometry,4326) | yes | no | Source | Point/polygon/multipolygon |
| `geometry_role` | GeometryRole | yes | no | System | CENTROID, BOUNDARY, APPROXIMATE_AREA |
| `spatial_precision` | SpatialPrecision | yes | no | Source | — |
| `temporal_*` | TemporalExtent fields | no | yes | Source | Applicable period |
| `source_record_id` | UUID/null | no | yes | Provenance | — |
| `confidence_note` | text/null | no | yes | Source/review | For approximate historical geometry |

## 5.4 `AdministrativeMembership`

Represents: **Place A belonged to Place/Admin Unit B during period T.**

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `membership_id` | UUIDv7 | yes | no | System | — |
| `child_place_id` | UUID | yes | no | Canonical | Place being located |
| `parent_place_id` | UUID | yes | no | Canonical | Administrative/political parent |
| `membership_type` | AdminMembershipType | yes | no | Source | ADMINISTRATIVE, POLITICAL, ECCLESIASTICAL, OTHER |
| `temporal_*` | TemporalExtent fields | no | yes | Source | Valid period |
| `source_record_id` | UUID/null | no | yes | Provenance | — |
| `verification_status` | VerificationStatus | yes | no | Evidence | — |

**HistoricalPlace projection:** a requested historical place object combines Place + the PlaceName, geometry and memberships valid for the requested period.

---

# 6. DISTRIBUTION MODEL

## 6.1 `DistributionSnapshot`

A snapshot describes a surname distribution **within one defined dataset/methodology/time scope**. It does not imply comparability with another snapshot.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `distribution_snapshot_id` | UUIDv7 | yes | no | System | — |
| `surname_id` | UUID | yes | no | Canonical | — |
| `source_id` | UUID | yes | no | Source | Dataset/source |
| `source_record_id` | UUID/null | no | yes | Source | Resource/version row if useful |
| `as_of_date` | date/null | no | yes | Source | Dataset snapshot date |
| `dataset_version` | text/null | no | yes | Source | Publisher/resource version |
| `geography_level` | GeographyLevel | yes | no | Source | NATIONAL, REGION, DISTRICT, MUNICIPALITY, LOCALITY, MIXED |
| `universe_description` | text | yes | no | Source | What population/database the dataset covers |
| `universe_size` | bigint/null | no | yes | Source | Denominator only if methodologically valid |
| `surname_total_count` | bigint/null | no | yes | Source/derived | Count within snapshot universe |
| `methodology_key` | text | yes | no | System/source | Stable method identifier |
| `comparability_group` | text/null | no | yes | Methodology | Only snapshots in same group may be compared quantitatively without extra justification |
| `coverage_notes` | text/null | no | yes | Source | Known limitations |
| `created_at` | timestamptz | yes | no | System | — |

## 6.2 `DistributionValue`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `distribution_value_id` | UUIDv7 | yes | no | System | — |
| `distribution_snapshot_id` | UUID | yes | no | Canonical | — |
| `place_id` | UUID/null | no | yes | Geography | Null only for national aggregate if snapshot header is national |
| `source_geography_key` | text/null | no | yes | Source | Raw region/admin identifier |
| `count` | bigint/null | no | yes | Source | Raw surname occurrences/persons in that geographic unit |
| `population_denominator` | bigint/null | no | yes | Source | Population denominator when compatible |
| `surname_share` | numeric/null | no | yes | Derived | Unit count / surname total |
| `population_rate` | numeric/null | no | yes | Derived | Count / compatible population denominator |
| `rank` | integer/null | no | yes | Derived/source | Rank only within defined universe |
| `derivation_version` | text/null | no | yes | System | Required for derived fields |

### Stored vs derived

**Store:** raw count, denominator, source scope, snapshot date, place mapping, source identifiers.  
**Derive:** 1-in-X, percentile, normalized concentration and many ranks unless source publishes them directly. Derived metrics become reproducible Claims with method/version; they are not arbitrary columns on `Surname`.

### Critical rule

`NO DATA` is not `count = 0`. A zero may be stored only where the dataset's coverage supports a true zero conclusion.

---

# 7. ONOMASTICS MODEL

## 7.1 `SurnameClassification`

Represents an evidence-led classification such as toponymic, patronymic, occupational, descriptive or multiple/uncertain.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `classification_id` | UUIDv7 / FK Entity | yes | no | System | — |
| `surname_id` | UUID | yes | no | Canonical | — |
| `classification_type` | SurnameFormationType | yes | no | Interpretation | TOPONYMIC, PATRONYMIC, OCCUPATIONAL, DESCRIPTIVE, ETHNONYMIC, HABITATIONAL, OTHER, UNKNOWN |
| `primary_claim_id` | UUID | yes | no | Evidence engine | Claim asserting the classification |
| `created_by_run_id` | UUID | yes | no | Runtime | — |
| `status` | AnalysisStatus | yes | no | System | ACTIVE, SUPERSEDED, REJECTED |

Multiple active classifications are allowed if evidence is conflicting or the surname plausibly has independent origins.

## 7.2 `MeaningInterpretation`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `meaning_id` | UUIDv7 / FK Entity | yes | no | System | — |
| `surname_id` | UUID | yes | no | Canonical | — |
| `root_form` | text/null | no | yes | Source/interpretation | Proposed lexical root |
| `root_language` | text/null | no | yes | Source/interpretation | Language of root |
| `concept_key` | text/null | no | yes | System | Locale-neutral concept if available |
| `literal_gloss` | text/null | no | yes | Source | Short source-led gloss, not final marketing prose |
| `formation_type` | SurnameFormationType/null | no | yes | Interpretation | — |
| `primary_claim_id` | UUID | yes | no | Evidence engine | Governing Claim |
| `related_origin_hypothesis_id` | UUID/null | no | yes | Canonical | Optional link |
| `created_by_run_id` | UUID | yes | no | Runtime | — |
| `status` | AnalysisStatus | yes | no | System | — |

The model explicitly separates “the root means X” from “the surname derives from this root”. They are different Claims.

## 7.3 `OriginHypothesis`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `origin_hypothesis_id` | UUIDv7 / FK Entity | yes | no | System | — |
| `surname_id` | UUID | yes | no | Canonical | — |
| `hypothesis_kind` | OriginKind | yes | no | Interpretation | LINGUISTIC, GEOGRAPHIC, TOPONYMIC, PATRONYMIC, MIXED, OTHER |
| `language_code` | text/null | no | yes | Interpretation | Candidate linguistic origin |
| `candidate_place_id` | UUID/null | no | yes | Interpretation | Exact place only if evidence supports that precision |
| `candidate_region_place_id` | UUID/null | no | yes | Interpretation | Region-level alternative |
| `classification_id` | UUID/null | no | yes | Canonical | Related formation classification |
| `primary_claim_id` | UUID | yes | no | Evidence engine | Hypothesis Claim |
| `created_by_run_id` | UUID | yes | no | Runtime | — |
| `hypothesis_status` | AnalysisStatus | yes | no | System | ACTIVE, SUPERSEDED, REJECTED |

No `rank = 1` field is canonical. Ordering is a presentation/research-run result based on current ConfidenceAssessment and evidence, not immutable truth.

---

# 8. HISTORICAL SURNAME MODEL

## 8.1 `HistoricalVariant`

`HistoricalVariant` is **not another spelling field**. It is an evidence-governed assertion that a `NameForm` is historically related to a Surname.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `historical_variant_id` | UUIDv7 / FK Entity | yes | no | System | — |
| `surname_id` | UUID | yes | no | Canonical | — |
| `name_form_id` | UUID | yes | no | Canonical | Variant form |
| `variant_relation_type` | VariantRelationType | yes | no | Evidence/analysis | DOCUMENTED_HISTORICAL, ORTHOGRAPHIC, TRANSLITERATION, MIGRATION_ADAPTATION, POSSIBLE_RELATED_FORM |
| `attestation_status` | AttestationStatus | yes | no | Evidence | ATTESTED, DERIVED, DISPUTED |
| `primary_claim_id` | UUID | yes | no | Evidence engine | Governing relation Claim |
| `first_occurrence_id` | UUID/null | no | yes | Derived | Earliest occurrence currently found, source-relative |
| `last_occurrence_id` | UUID/null | no | yes | Derived | Latest historical occurrence if useful |
| `status` | AnalysisStatus | yes | no | System | ACTIVE, SUPERSEDED, REJECTED |

A pure `SEARCH_CANDIDATE` cannot populate this table unless a research step creates a separate evidence-backed Claim.

## 8.2 `HistoricalOccurrence`

Represents **a surname or name form observed in a specific source context**. It does not represent the user's ancestor.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `historical_occurrence_id` | UUIDv7 / FK Entity | yes | no | System | — |
| `surname_id` | UUID | yes | no | Canonical | Canonical surname family of forms |
| `name_form_id` | UUID | yes | no | Canonical | Exact observed form |
| `source_record_id` | UUID | yes | no | Source | Record/page/item in which form appears |
| `place_id` | UUID/null | no | yes | Resolved | Place only if evidence supports mapping |
| `raw_place_text` | text/null | no | yes | Source | Preserved historical place text |
| `temporal_*` | TemporalExtent fields | no | yes | Source | Date/period of occurrence |
| `raw_matched_text` | text | yes | no | Source | Exact surname string/snippet matched |
| `match_offset_or_locator` | text/null | no | yes | Source | Page, line, bounding box, field, etc. |
| `extraction_method` | ExtractionMethod | yes | no | System | STRUCTURED_FIELD, OCR, MANUAL, TRANSCRIPTION, OTHER |
| `ocr_confidence` | numeric/null | no | yes | Source/tool | Only if OCR provider supplies meaningful confidence |
| `verification_status` | OccurrenceVerificationStatus | yes | no | QA | VERIFIED, REVIEWED, MACHINE_CANDIDATE, OCR_SUSPECT, REJECTED |
| `dedupe_key` | text | yes | no | System | Stable duplicate-detection key |
| `created_by_run_id` | UUID | yes | no | Runtime | — |

### Deduplication identity

A practical occurrence identity is based on:

```text
source_record + locator + observed name form + event/date context
```

not simply surname + year + place. The same publication may be indexed by multiple aggregators; cross-source duplication must be handled through source-record equivalence/provenance rather than counting it as multiple historical facts.

## 8.3 `MigrationPattern`

Surname-level only in MVP architecture.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `migration_pattern_id` | UUIDv7 / FK Entity | yes | no | System | — |
| `surname_id` | UUID | yes | no | Canonical | — |
| `from_place_id` | UUID/null | no | yes | Interpretation | Do not force exact origin |
| `to_place_id` | UUID/null | no | yes | Interpretation | — |
| `temporal_*` | TemporalExtent fields | no | yes | Interpretation | Relevant period |
| `basis_type` | MigrationBasis | yes | no | Interpretation | DISTRIBUTION_CHANGE, DIASPORA_OCCURRENCES, SOURCE_SEQUENCE, OTHER |
| `primary_claim_id` | UUID | yes | no | Evidence engine | — |
| `causal_claim_allowed` | boolean | yes | no | QA | Normally false for distribution-only evidence |
| `status` | AnalysisStatus | yes | no | System | — |

Family/person migration later becomes a separate `MigrationEvent` object.

---

# 9. SOURCE, RIGHTS AND EVIDENCE MODEL

## 9.1 `Source`

A Source is the stable identity of a dataset, archive, collection, publication, provider or scholarly work from which SourceRecords can be retrieved.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `source_id` | UUIDv7 | yes | no | System | — |
| `parent_source_id` | UUID/null | no | yes | System | Allows provider → dataset/collection hierarchy |
| `source_key` | text | yes | no | System | Stable internal key, e.g. `pl_pesel_surnames` |
| `name` | text | yes | no | Source registry | — |
| `publisher` | text/null | no | yes | Source | — |
| `source_type` | SourceType | yes | no | Registry | OFFICIAL_DATASET, ARCHIVE, DIGITAL_LIBRARY, ACADEMIC, DICTIONARY, PUBLICATION, COMMERCIAL_DATABASE, COMMUNITY_INDEX, OTHER |
| `granularity` | SourceGranularity | yes | no | Registry | SURNAME, PERSON, PLACE, DOCUMENT, MIXED |
| `geographic_scope` | text[]/JSONB | yes | no | Registry | Country/region scope; detailed geography may use Places later |
| `temporal_from` | integer/date null | no | yes | Registry | Coverage lower bound |
| `temporal_to` | integer/date null | no | yes | Registry | Coverage upper bound |
| `methodology_notes` | text/null | no | yes | Registry | — |
| `authority_tier` | SourceReliabilityTier | yes | no | Evaluation | A_PRIMARY_OFFICIAL, B_AUTHORITATIVE_INDEX, C_SCHOLARLY_SECONDARY, D_TERTIARY_LEAD |
| `default_rights_profile_id` | UUID | yes | no | Legal review | Effective default rights |
| `production_status` | SourceProductionStatus | yes | no | Registry | APPROVED, PARTNERSHIP_REQUIRED, LEGAL_REVIEW_REQUIRED, BLOCKED, DEPRECATED |
| `homepage_or_reference_url` | text/null | no | yes | Registry | — |
| `created_at` / `updated_at` | timestamptz | yes | no | System | — |

**Authority tier and rights status are independent.** A highly authoritative source can still be legally unusable for automated commercial ingestion.

## 9.2 `SourceRecord`

Concrete retrieved object: row, API object, catalogue record, page, book item, OCR page, dictionary entry, archive index entry, etc.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `source_record_id` | UUIDv7 | yes | no | System | — |
| `source_id` | UUID | yes | no | Source | Parent source |
| `external_record_id` | text/null | no | yes | Source | Native source identifier |
| `external_parent_id` | text/null | no | yes | Source | Parent item/collection ID if useful |
| `record_type` | SourceRecordType | yes | no | Source/connector | DATA_ROW, DOCUMENT, PAGE, INDEX_ENTRY, ARTICLE, BOOK_ITEM, API_OBJECT, OTHER |
| `source_url` | text/null | no | yes | Source | Stable record URL when available |
| `raw_payload` | JSONB/null | no | yes | Source | Original structured response; size-limited |
| `raw_text_ref` | text/null | no | yes | Storage | Object-storage/external reference for larger extracted text |
| `content_hash` | text | yes | no | System | Detect changes/duplicates |
| `retrieved_at` | timestamptz | yes | no | System | — |
| `source_modified_at` | timestamptz/null | no | yes | Source | — |
| `rights_profile_id` | UUID/null | no | yes | Rights | Item override; null means use Source default |
| `record_status` | SourceRecordStatus | yes | no | System | ACTIVE, UPDATED, WITHDRAWN, INACCESSIBLE |
| `supersedes_source_record_id` | UUID/null | no | yes | Versioning | Prior revision when source item changes |

Large scans/PDFs should not be stored as JSONB blobs.

## 9.3 `DigitalAsset`

Needed because metadata rights and scan/image rights can differ.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `digital_asset_id` | UUIDv7 | yes | no | System | — |
| `source_record_id` | UUID | yes | no | Source | Parent source item |
| `asset_type` | DigitalAssetType | yes | no | Source | IMAGE, PDF, IIIF_CANVAS, OCR_TEXT, AUDIO, OTHER |
| `external_url` | text/null | no | yes | Source | — |
| `storage_key` | text/null | no | yes | Internal | Only where local caching permitted |
| `mime_type` | text/null | no | yes | Source | — |
| `checksum` | text/null | no | yes | System | — |
| `rights_profile_id` | UUID | yes | no | Rights | Asset-specific rights |
| `created_at` | timestamptz | yes | no | System | — |

## 9.4 `RightsProfile`

RightsProfile is versioned and immutable once applied to a research output; changed terms create a new profile.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `rights_profile_id` | UUIDv7 | yes | no | System | — |
| `terms_version` | text/null | no | yes | Legal/source | Publisher terms/licence version |
| `terms_hash` | text/null | no | yes | System | Snapshot hash where terms text is retained lawfully |
| `checked_at` | timestamptz | yes | no | Review | Last review date |
| `metadata_rights` | RightsPermission | yes | no | Review | ALLOWED, CONDITIONAL, PROHIBITED, UNKNOWN |
| `image_rights` | RightsPermission | yes | no | Review | — |
| `transcription_rights` | RightsPermission | yes | no | Review | — |
| `database_rights` | RightsPermission | yes | no | Review | — |
| `automated_access` | RightsPermission | yes | no | Review | — |
| `commercial_use` | RightsPermission | yes | no | Review | — |
| `redistribution` | RightsPermission | yes | no | Review | — |
| `local_cache` | CachePermission | yes | no | Review | ALLOWED, LIMITED, PROHIBITED, UNKNOWN |
| `attribution_required` | boolean | yes | no | Review | — |
| `attribution_text` | text/null | no | yes | Review | Canonical required attribution |
| `source_owner` | text/null | no | yes | Review | — |
| `rights_url` | text/null | no | yes | Review | — |
| `contact_required` | boolean | yes | no | Review | — |
| `review_status` | RightsReviewStatus | yes | no | Review | APPROVED, CONDITIONAL, LEGAL_REVIEW_REQUIRED, BLOCKED, EXPIRED |
| `valid_from` | date/null | no | yes | Review | — |
| `valid_to` | date/null | no | yes | Review | Optional expiry/recheck boundary |
| `notes` | text/null | no | yes | Review | — |

### Hard rights rules

```text
commercial_use = UNKNOWN
→ source/evidence may not silently enter a paid report

automated_access = PROHIBITED
→ no automated production connector

metadata_rights = ALLOWED + image_rights = PROHIBITED
→ metadata/evidence may be usable; scan cannot be reproduced

review_status = EXPIRED
→ connector may retrieve only according to explicit fallback policy; paid-surface eligibility is blocked until review
```

## 9.5 `EvidenceItem`

An EvidenceItem is the smallest normalized evidence object that can support/contradict/contextualize a Claim.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `evidence_item_id` | UUIDv7 | yes | no | System | — |
| `evidence_type` | EvidenceType | yes | no | System | OFFICIAL_DATASET_FIELD, PRIMARY_RECORD, AUTHORITATIVE_INDEX, SCHOLARLY_SOURCE, SECONDARY_HISTORICAL_SOURCE, DERIVED_STATISTIC, ALGORITHMIC_SIMILARITY, USER_PROVIDED, OTHER |
| `source_record_id` | UUID/null | no | yes | Provenance | Null allowed for purely derived/system evidence only if lineage is otherwise preserved |
| `subject_entity_id` | UUID/null | no | yes | Canonical | Entity evidence directly concerns |
| `structured_value` | JSONB | yes | no | Source/derived | Locale-neutral evidence payload |
| `raw_excerpt` | text/null | no | yes | Source | Short exact supporting excerpt where rights allow; not a replacement for source |
| `supporting_locator` | text/null | no | yes | Source | Page/field/bbox/record locator |
| `verification_status` | EvidenceVerificationStatus | yes | no | QA | VERIFIED, REVIEWED, MACHINE_EXTRACTED, SUSPECT, REJECTED |
| `derivation_method` | text/null | no | yes | System | Required for derived evidence |
| `derivation_version` | text/null | no | yes | System | — |
| `created_by_run_id` | UUID | yes | no | Runtime | — |
| `created_at` | timestamptz | yes | no | System | — |

Source reliability is **not** stored as claim confidence. Source authority comes from `Source`; evidence verification comes from `EvidenceItem`; claim confidence comes later.

## 9.6 Optional `EvidenceDependency`

Useful when a derived EvidenceItem depends on multiple upstream EvidenceItems.

```text
DERIVED_STATISTIC E17
    depends_on → E04 (surname count)
    depends_on → E05 (population denominator)
```

This can be P1 if ClaimEvidence links are sufficient for the first vertical slice.

---

# 10. CLAIM AND CONFIDENCE MODEL

## 10.1 `Claim`

Claim is the canonical, locale-neutral proposition layer. Final Polish/English prose is generated later.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `claim_id` | UUIDv7 | yes | no | System | — |
| `claim_key` | text | yes | no | System | Stable semantic identity for dedupe/versioning |
| `claim_type` | ClaimType | yes | no | System | Typed proposition |
| `epistemic_type` | EpistemicType | yes | no | Evidence engine | FACT, INTERPRETATION, HYPOTHESIS, UNKNOWN |
| `scope` | EvidenceScope | yes | no | System | SURNAME_LEVEL, FAMILY_LEVEL, PERSON_LEVEL |
| `subject_entity_id` | UUID | yes | no | Canonical | FK to KnowledgeEntity |
| `object_entity_id` | UUID/null | no | yes | Canonical | Optional second entity, e.g. surname → place |
| `structured_value` | JSONB | yes | no | Evidence engine | Canonical locale-neutral payload; must validate by ClaimType schema |
| `statement_key` | text/null | no | yes | Presentation contract | Optional translation/template key, not prose truth |
| `claim_status` | ClaimLifecycleStatus | yes | no | System | ACTIVE, SUPERSEDED, RETRACTED, REJECTED |
| `supersedes_claim_id` | UUID/null | no | yes | Versioning | Prior claim version |
| `created_by_run_id` | UUID | yes | no | Runtime | — |
| `method_version` | text | yes | no | Runtime/evidence | Deterministic/LLM method version |
| `created_at` | timestamptz | yes | no | System | — |

### Claim value schemas

`structured_value` is JSONB because Claim types genuinely have heterogeneous payloads, but each `ClaimType` must have a versioned JSON Schema/Pydantic discriminator. Example:

```json
{
  "claim_type": "CURRENT_POPULATION",
  "value": {
    "count": 2481,
    "dataset_scope": "PL",
    "as_of_date": "2026-01-20",
    "distribution_snapshot_id": "..."
  }
}
```

This is controlled heterogeneity, not a giant untyped JSON blob.

## 10.2 `ClaimEvidence`

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `claim_id` | UUID | yes | no | System | — |
| `evidence_item_id` | UUID | yes | no | System | — |
| `relationship` | ClaimEvidenceRelationship | yes | no | Evidence engine | SUPPORTS, CONTRADICTS, CONTEXT |
| `reason_code` | text/null | no | yes | Evidence engine | Machine-readable reason where helpful |
| `notes` | text/null | no | yes | Review | — |
| `created_at` | timestamptz | yes | no | System | — |

No hidden numeric “weight” is required in MVP. If later models need calibrated scoring, store model features separately rather than pretending weights are probabilities.

## 10.3 `ConfidenceAssessment`

Assessments are versioned; do not overwrite a historical assessment when evidence changes.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `confidence_assessment_id` | UUIDv7 | yes | no | System | — |
| `claim_id` | UUID | yes | no | Canonical | — |
| `status` | ConfidenceStatus | yes | no | Confidence engine | VERIFIED, LIKELY, POSSIBLE, UNCONFIRMED, CONFLICTING, INSUFFICIENT_DATA |
| `rationale` | text | yes | no | Engine/reviewer | Internal explanation, not final consumer copy |
| `evidence_set_hash` | text | yes | no | System | Makes assessment reproducible against evidence set |
| `assessment_method` | text | yes | no | System | Rule/prompt/model identifier |
| `assessment_version` | text | yes | no | System | — |
| `human_review_required` | boolean | yes | no | Engine | — |
| `review_status` | ReviewStatus | yes | no | Workflow | AUTO, PENDING, HUMAN_APPROVED, HUMAN_REJECTED |
| `assessed_at` | timestamptz | yes | no | System | — |

No percentage field exists in MVP.

## 10.4 `Citation`

Citation is a stable, normalized reference, not merely a formatted string.

| Field | Type | Req. | Nullable | Origin | Description |
|---|---|---:|---:|---|---|
| `citation_id` | UUIDv7 | yes | no | System | — |
| `source_id` | UUID | yes | no | Source | — |
| `source_record_id` | UUID/null | no | yes | Source | Specific item if relevant |
| `title` | text | yes | no | Source | — |
| `publisher` | text/null | no | yes | Source | — |
| `publication_date` | text/date/null | no | yes | Source | Preserve source precision |
| `url_or_reference` | text | yes | no | Source | — |
| `supporting_locator` | text/null | no | yes | Source | Page/field/record/bbox |
| `accessed_at` | timestamptz/null | no | yes | Runtime | — |
| `rights_profile_id` | UUID | yes | no | Rights | Rights used for this citation/surface decision |

Formatting into PL/EN citation style is downstream.

---

# 11. CLAIM TAXONOMY

The canonical Claim taxonomy should be explicit enough for QA and product gating but not explode into hundreds of micro-types.

| ClaimType | Typical subject | Structured value | Epistemic type | Expected evidence | Typical confidence |
|---|---|---|---|---|---|
| `CURRENT_POPULATION` | Surname | count + snapshot | FACT | Official/current distribution evidence | VERIFIED |
| `CURRENT_RANK` | Surname | rank + universe | FACT / derived | Distribution snapshot | VERIFIED if deterministic |
| `RARITY_CONTEXT` | Surname | 1-in-X / percentile + method | FACT / derived | Count + denominator/universe | VERIFIED if method valid |
| `CURRENT_DISTRIBUTION` | Surname | place/count/rate | FACT | Approved regional dataset | VERIFIED |
| `REGIONAL_CONCENTRATION` | Surname | place + concentration metric | FACT / derived | Distribution values | VERIFIED if deterministic |
| `SURNAME_EXISTENCE_IN_SOURCE` | NameForm/Surname | source/date/place | FACT | HistoricalOccurrence | VERIFIED/UNCONFIRMED |
| `SURNAME_MEANING` | Surname | meaning/root | INTERPRETATION | Scholarly onomastic evidence | LIKELY/POSSIBLE/CONFLICTING |
| `LINGUISTIC_ORIGIN` | Surname | language/family | INTERPRETATION | Scholarly + form evidence | LIKELY/POSSIBLE |
| `GEOGRAPHIC_ORIGIN` | Surname | region/place hypothesis | HYPOTHESIS/INTERPRETATION | Onomastic + historical/place evidence | LIKELY/POSSIBLE/CONFLICTING |
| `SURNAME_FORMATION_TYPE` | Surname | type | INTERPRETATION | Specialist sources | LIKELY/POSSIBLE |
| `ROOT_INTERPRETATION` | Surname | root + gloss | INTERPRETATION | Scholarly source | LIKELY/POSSIBLE |
| `HISTORICAL_VARIANT_RELATION` | HistoricalVariant | form relation | FACT or INTERPRETATION | Direct attestation / linguistic evidence | VERIFIED/LIKELY/POSSIBLE |
| `HISTORICAL_OCCURRENCE` | HistoricalOccurrence | source/time/place | FACT | SourceRecord | VERIFIED/UNCONFIRMED |
| `EARLIEST_FOUND_OCCURRENCE` | Surname | occurrence + searched corpus scope | FACT/derived | Set of searched occurrences | VERIFIED with scope |
| `HISTORICAL_PLACE_ASSOCIATION` | Surname | place + period | FACT/INTERPRETATION | Occurrences | VERIFIED/LIKELY |
| `HISTORICAL_DISTRIBUTION` | Surname | snapshot/distribution | FACT/derived | Historical dataset/corpus | VERIFIED with limits |
| `DIASPORA_OCCURRENCE` | Surname | country/place/time | FACT | Distribution/occurrence source | VERIFIED |
| `MIGRATION_PATTERN` | MigrationPattern | from/to/period/basis | HYPOTHESIS | Comparable distributions/occurrences | POSSIBLE/LIKELY |
| `ARCHIVE_AVAILABILITY` | Surname | collection/source/count | FACT | Source registry/search output | VERIFIED within searched scope |
| `SOURCE_CONFLICT` | Surname/Claim set | competing claim IDs | INTERPRETATION | Strong contradictory claims | CONFLICTING |
| `DATA_LIMITATION` | Surname/Profile | missing/blocked dimension | FACT about system coverage | Coverage/source state | VERIFIED |

### Scope constraint

Every ClaimType has an allow-list of scopes. `CURRENT_POPULATION` is `SURNAME_LEVEL`. An `ANCESTOR_RELATIONSHIP` ClaimType will not exist in surname MVP and cannot be emitted by surname workflows.

---

# 12. FACT / INTERPRETATION / HYPOTHESIS MODEL

`EpistemicType` and `ConfidenceStatus` are intentionally independent.

## 12.1 `EpistemicType`

```text
FACT
INTERPRETATION
HYPOTHESIS
UNKNOWN
```

- **FACT** — proposition directly observed or deterministically derived within stated source/method scope.
- **INTERPRETATION** — reasoned explanation of facts.
- **HYPOTHESIS** — plausible model requiring more evidence.
- **UNKNOWN** — system is explicitly representing that a conclusion cannot be established.

## 12.2 `ConfidenceStatus`

```text
VERIFIED
LIKELY
POSSIBLE
UNCONFIRMED
CONFLICTING
INSUFFICIENT_DATA
```

## 12.3 Valid combinations

| EpistemicType | Common valid statuses | Notes |
|---|---|---|
| FACT | VERIFIED, UNCONFIRMED, CONFLICTING, INSUFFICIENT_DATA | `LIKELY`/`POSSIBLE` should normally mean it is not yet a FACT |
| INTERPRETATION | LIKELY, POSSIBLE, CONFLICTING, INSUFFICIENT_DATA | VERIFIED only if product semantics explicitly mean “verified that source states X”, not “interpretation is objectively proven” |
| HYPOTHESIS | LIKELY, POSSIBLE, UNCONFIRMED, CONFLICTING, INSUFFICIENT_DATA | LIKELY is allowed when multiple independent signals converge |
| UNKNOWN | INSUFFICIENT_DATA | Use a limitation/gap object rather than decorative uncertainty |

### Example

```text
Claim: surname likely derives from a locality name
EpistemicType: INTERPRETATION
ConfidenceStatus: LIKELY
```

is valid.

```text
Claim: current dataset contains 2,481 bearers
EpistemicType: FACT
ConfidenceStatus: VERIFIED
```

is valid if directly supported.

---

# 13. SOURCE / RECORD / EVIDENCE / CITATION DISTINCTION

These four objects must never be collapsed.

## 13.1 Source

> “Polona / Biblioteka Narodowa — digital library”

Stable provider/collection/dataset identity.

## 13.2 SourceRecord

> “Warsaw directory, 1931, specific digitized item/page record”

Concrete source object retrieved by connector.

## 13.3 EvidenceItem

> “The string `[SURNAME_FORM]` appears at page/field X, associated with place text Y.”

Atomic evidence extracted/normalised from the SourceRecord.

## 13.4 Claim

> “This surname form appears in a Warsaw directory from 1931.”

The proposition Name Atlas can show after scope/QA.

## 13.5 Citation

> User-facing reference to the directory/item/page and source institution.

### End-to-end example

```text
Source
  Polona / BN
     ↓
SourceRecord
  Directory 1931, item ID 123
     ↓
EvidenceItem
  matched text = "[SURNAME_FORM]"
  locator = page 482
     ↓
Claim
  HISTORICAL_OCCURRENCE
  FACT
     ↓
ConfidenceAssessment
  VERIFIED (if source/match reviewed enough)
     ↓
Citation
  BN · Directory 1931 · p. 482 · source URL
```

For PESEL:

```text
Source = official surname dataset
SourceRecord = resource row/object for [SURNAME]
EvidenceItem = {count: X, snapshot_date: Y}
Claim = CURRENT_POPULATION
Confidence = VERIFIED
```

---

# 14. RAW VS NORMALISED DATA

The model uses a **preserve + derive** pattern rather than a universal `raw_value/normalized_value` table.

## 14.1 Required preservation areas

### Names

```text
NameForm.form                 = exact source/user form
NameForm.unicode_nfc          = deterministic Unicode normalisation
NameForm.search_key           = retrieval representation
normalization_version         = rules used
```

### Places

```text
HistoricalOccurrence.raw_place_text
PlaceName.name
PlaceName.normalized_name
```

### Dates

Store the source's raw date text when ambiguity matters and a structured TemporalExtent separately.

### OCR

Preserve:

```text
raw matched text
source record/page
locator/bbox if available
OCR confidence if provider gives it
normalised/matched NameForm
```

### Source identifiers

Never replace an external identifier with an internal ID. Store both.

## 14.2 Where the pattern is unnecessary

Do not create raw/normalised pairs for stable system fields such as:

- internal UUID;
- enum states;
- created timestamps;
- rights decisions;
- report section sequence.

---

# 15. TEMPORAL MODELLING

History cannot be forced into exact SQL dates when the source only supports “c. 1880” or “19th century”.

## 15.1 Canonical `TemporalExtent` value object

Use a shared code-level value object flattened into the tables that need temporal querying.

Recommended logical fields:

```text
raw_temporal_text      nullable
exact_date_from        nullable
exact_date_to          nullable
year_from              nullable
year_to                nullable
precision              DAY | MONTH | YEAR | DECADE | CENTURY | UNKNOWN
qualifier              EXACT | CIRCA | BETWEEN | BEFORE | AFTER | UNKNOWN
calendar_system        GREGORIAN | JULIAN | OTHER | UNKNOWN
```

### Examples

**12 May 1884**

```text
exact_date_from = 1884-05-12
exact_date_to   = 1884-05-12
precision       = DAY
qualifier       = EXACT
```

**1884**

```text
year_from = 1884
year_to   = 1884
precision = YEAR
qualifier = EXACT
```

**c. 1880**

```text
year_from = 1880
precision = YEAR
qualifier = CIRCA
```

Do **not** silently turn `c. 1880` into a fabricated `1875–1885` range unless a separate research method explicitly creates such a search window.

**before 1800**

```text
year_to   = 1800
precision = YEAR
qualifier = BEFORE
```

## 15.2 Valid time vs observed time vs retrieved time

Keep separate concepts:

- **valid/source time** — when historical fact/name/membership applies;
- **dataset snapshot date** — when distribution represents population;
- **source publication/date** — when document/source was created;
- **retrieved_at** — when Name Atlas fetched it;
- **assessed_at** — when a Claim/confidence was evaluated.

They are not interchangeable.

---

# 16. GEOSPATIAL MODEL DECISION

## Decision: PostgreSQL + PostGIS from MVP foundation

PostGIS is justified because geography is a core product dimension and later requirements include:

- place identity;
- regional aggregation;
- historic/current boundaries;
- map rendering;
- proximity and clustering;
- place disambiguation;
- time-aware geometry references.

A separate GIS database is unnecessary.

## Precision rule

The data model must support:

```text
EXACT_POINT
LOCALITY
MUNICIPALITY
REGION
COUNTRY
APPROXIMATE_AREA
UNKNOWN
```

A region-level origin hypothesis should link to a region Place or approximate polygon, never a fabricated pin at the region's centroid presented as “the origin”.

---

# 17. VARIANT MODEL

Similar spelling is not evidence of historical identity.

## 17.1 Canonical relation types

```text
ATTESTED_AS
POSSIBLE_VARIANT_OF
TRANSLITERATION_OF
MIGRATION_ADAPTATION_OF
ORTHOGRAPHIC_VARIANT_OF
SEARCH_SIMILAR_TO
UNRELATED_SIMILAR_FORM
```

## 17.2 User-facing policy

| Relation | Can surface as historical variant? |
|---|---|
| ATTESTED_AS | Yes |
| ORTHOGRAPHIC_VARIANT_OF | Yes when evidence/Claim supports |
| TRANSLITERATION_OF | Yes, labelled transliteration |
| MIGRATION_ADAPTATION_OF | Yes when evidence supports |
| POSSIBLE_VARIANT_OF | Only as possible/uncertain |
| SEARCH_SIMILAR_TO | **No** — retrieval only |
| UNRELATED_SIMILAR_FORM | No |

`NameFormRelation` and `HistoricalVariant` coexist because:

- NameFormRelation represents the general relation graph between forms;
- HistoricalVariant represents the product/research assertion that a specific form is historically relevant to a specific Surname, with a governing Claim.

---

# 18. HISTORICAL OCCURRENCE MODEL — SPECIAL RULES

## 18.1 Occurrence is not a person

A historical occurrence may have contextual person names in the source, but surname MVP stores only what is required to establish surname occurrence unless person-level licensing/product logic is activated later.

## 18.2 OCR occurrences

An OCR hit starts as:

```text
verification_status = MACHINE_CANDIDATE or OCR_SUSPECT
```

It becomes `VERIFIED/REVIEWED` only after evidence rules support it.

## 18.3 Duplicate copied sources

If the same historical item is mirrored in FBC, Europeana and a regional library, it must not automatically count as three independent pieces of evidence.

Required mechanisms:

- Source parent/provider hierarchy;
- external identifiers;
- content hash;
- canonical source-record equivalence/dedupe key;
- ClaimEvidence deduplication rules.

Independence of sources is an Evidence Engine concern, but the data model must preserve enough provenance to calculate it.

---

# 19. RIGHTS MODEL — SOURCE VS ITEM VS ASSET

The model supports three practical levels:

```text
Source default rights
        ↓ override
SourceRecord rights
        ↓ override
DigitalAsset rights
```

Example:

```text
Europeana metadata
commercial metadata reuse = allowed

linked digitized image
image reuse = item-specific / restricted
```

This means the product may legally display bibliographic metadata and a citation while suppressing the actual scan.

No UI component should decide this itself. Surface eligibility comes from the rights/evidence layer.

---

# 20. DEDUPLICATION AND CANONICAL IDENTITY

## 20.1 Surname dedupe

A surname entity merge requires more than equal case-folded text.

Canonical identity may consider:

- exact Unicode-normalized spelling;
- script;
- locale/naming system;
- known modern equivalence;
- approved merge/review result.

Transliterations normally remain NameForms linked to a Surname rather than separate Surnames when evidence supports equivalence.

## 20.2 NameForm dedupe

Natural uniqueness candidate:

```text
surname_id + exact form + script + form_type + relevant geography/time context
```

Search candidates may not have `surname_id` until resolved.

## 20.3 Place dedupe

Use external IDs and temporal/admin context. Same text name does not mean same place.

Store generic external IDs through a shared `EntityExternalId` table:

```text
entity_id
provider_key
external_id
external_url
valid_from / valid_to optional
```

This supports TERYT, Wikidata, GeoNames, Getty TGN, OSM and future IDs without dozens of provider columns.

## 20.4 SourceRecord dedupe

Prefer:

```text
source_id + external_record_id
```

when stable. Otherwise use content hash + canonical bibliographic metadata. Cross-provider mirrors need an equivalence layer or canonical-content fingerprint.

## 20.5 Claim dedupe

`claim_key` should encode:

```text
claim_type + subject + object (if any) + normalized structured value + scope + method/schema version
```

Do not dedupe two claims merely because final English sentences look similar.

## 20.6 Evidence dedupe

Evidence identity is based on source record + locator/field + structured evidence payload, not prose summary.

---

# 21. VERSIONING STRATEGY

Name Atlas should be auditable and able to explain why a result changed.

## 21.1 Source records

Do not destructively update external content when a meaningful source revision occurs.

```text
SourceRecord v1
   ↓ superseded by
SourceRecord v2
```

Store content hashes and retrieval timestamps.

## 21.2 Rights

RightsProfile is immutable once used in a published/purchased output. Changed terms create a new profile. `Source.default_rights_profile_id` points to the current approved profile, while historical reports preserve which rights decision applied at generation time.

## 21.3 Claims

Claims are append/supersede, not overwrite:

```text
ACTIVE
SUPERSEDED
RETRACTED
REJECTED
```

A changed evidence interpretation creates a new Claim or new revision linked by `supersedes_claim_id`.

## 21.4 Confidence

ConfidenceAssessment is append-only/versioned. Latest approved assessment is selected through a view/query.

## 21.5 Research runs

ResearchRun is immutable after completion except operational metadata/error annotations.

## 21.6 Reports

Purchased/generated report versions are immutable artifacts. Regeneration creates a new ReportVersion while retaining previous output for audit/support.

---

# 22. RESEARCH RUN AND LINEAGE

## 22.1 `ResearchRun`

| Field | Type | Req. | Nullable | Description |
|---|---|---:|---:|---|
| `research_run_id` | UUIDv7 | yes | no | Unique execution |
| `run_type` | ResearchRunType | yes | no | BASIC_SURNAME, PREMIUM_SURNAME, REPROCESS, QA, later FAMILY |
| `surname_id` | UUID/null | no | yes | Resolved target |
| `raw_input` | JSONB | yes | no | Minimal run input; privacy-classified |
| `input_schema_version` | text | yes | no | — |
| `workflow_version` | text | yes | no | Orchestrator graph version |
| `connector_manifest` | JSONB | yes | no | Source/connector versions actually called |
| `prompt_manifest` | JSONB | yes | no | Prompt IDs/versions actually used |
| `model_manifest` | JSONB | yes | no | Model/version identifiers |
| `normalization_version` | text | yes | no | — |
| `rights_snapshot_hash` | text/null | no | yes | Effective rights configuration snapshot |
| `run_status` | ResearchRunStatus | yes | no | PENDING, RUNNING, PARTIAL, COMPLETE, FAILED, REVIEW_REQUIRED |
| `qa_status` | QAStatus | yes | no | NOT_RUN, PASS, FAIL, REVIEW_REQUIRED |
| `started_at` | timestamptz | yes | no | — |
| `completed_at` | timestamptz/null | no | yes | — |
| `error_summary` | JSONB/null | no | yes | Structured failure summary |

### What not to persist blindly

Do not dump hidden model reasoning or uncontrolled chain-of-thought. Persist structured inputs, outputs, prompt/model versions, evidence, Claims and QA decisions sufficient for reproducibility.

## 22.2 Run links

Use junctions such as:

```text
research_run_sources
research_run_claims
research_run_evidence
```

or derive through created_by_run IDs where sufficient. A dedicated manifest is still useful for connectors that returned no findings, because absence/retrieval failure matters to coverage.

---

# 23. COVERAGE ASSESSMENT MODEL

Availability and confidence are different dimensions.

## 23.1 `CoverageAssessment`

Header:

| Field | Type | Description |
|---|---|---|
| `coverage_assessment_id` | UUIDv7 | — |
| `surname_id` | UUID | — |
| `research_run_id` | UUID | Assessment basis |
| `coverage_tier` | CoverageTier | RICH, STANDARD, LIMITED, MINIMAL |
| `free_profile_eligible` | boolean | Can meaningful free result render? |
| `premium_report_eligible` | boolean | Does paid report meet threshold? |
| `family_origin_eligible` | boolean | Usually false/not evaluated in surname MVP |
| `assessment_version` | text | Rules version |
| `assessed_at` | timestamptz | — |

## 23.2 `CoverageDimension`

One row per dimension.

| Field | Type | Description |
|---|---|---|
| `coverage_dimension_id` | UUIDv7 | — |
| `coverage_assessment_id` | UUID | — |
| `dimension` | CoverageDimensionType | POPULATION, MODERN_GEOGRAPHY, ETYMOLOGY, ORIGIN, VARIANTS, HISTORICAL_OCCURRENCES, HISTORICAL_PLACES, HISTORICAL_DISTRIBUTION, MIGRATION, ARCHIVES, SOURCES |
| `availability_status` | CoverageAvailability | STRONG, PARTIAL, NONE, BLOCKED_RIGHTS, SOURCE_UNAVAILABLE, NOT_RETRIEVED, NOT_APPLICABLE |
| `confidence_summary` | ConfidenceStatus/null | Optional highest/representative confidence; not availability |
| `validated_item_count` | integer | Deduplicated eligible item count |
| `reason_code` | text/null | Machine-readable reason |
| `notes` | text/null | Internal summary |

### Coverage tier recommendation

`RICH/STANDARD/LIMITED/MINIMAL` is derived from meaningful dimensions and quality, **not a raw count of filled fields**.

Example:

```text
population              STRONG
modern_geography        BLOCKED_RIGHTS
etymology               STRONG
origin                   PARTIAL
variants                 STRONG
historical_occurrences   PARTIAL
archives                 PARTIAL
migration                NONE

→ STANDARD, not RICH
```

---

# 24. DISCOVERY INDEX MODEL

## 24.1 Purpose

DiscoveryIndex is the **only canonical inventory from which premium preview/paywall counts may be drawn**.

It is generated from validated, deduplicated, rights-eligible objects for a specific ResearchRun/coverage state.

## 24.2 `DiscoveryIndex`

| Field | Type | Description |
|---|---|---|
| `discovery_index_id` | UUIDv7 | — |
| `surname_id` | UUID | — |
| `research_run_id` | UUID | Basis |
| `coverage_assessment_id` | UUID | — |
| `generation_version` | text | Rules version |
| `premium_eligible` | boolean | — |
| `generated_at` | timestamptz | — |

## 24.3 `DiscoveryIndexEntry`

| Field | Type | Description |
|---|---|---|
| `discovery_index_entry_id` | UUIDv7 | — |
| `discovery_index_id` | UUID | — |
| `category` | DiscoveryCategory | HISTORICAL_VARIANTS, HISTORICAL_PLACES, HISTORICAL_OCCURRENCES, ARCHIVE_REFERENCES, HISTORICAL_LAYERS, MIGRATION_CLUES, SOURCES, ORIGIN_ALTERNATIVES |
| `validated_count` | integer | Deduplicated count |
| `eligible_count` | integer | Count allowed on target premium surface |
| `count_semantics` | text/enum | What exactly one unit means |
| `confidence_distribution` | JSONB | Small structured summary by ConfidenceStatus |
| `availability_status` | CoverageAvailability | — |
| `preview_allowed` | boolean | — |

### Count semantics

Examples:

- `HISTORICAL_VARIANTS = 8` means **8 deduplicated validated surname-level variant assertions/forms**, not 8 ancestors.
- `HISTORICAL_PLACES = 4` means **4 deduplicated places with eligible surname-level historical association**, not ancestral villages.
- `ARCHIVE_REFERENCES = 11` means **11 distinct eligible SourceRecords/archival references containing relevant surname evidence**, not 11 family records.
- `MIGRATION_CLUES = 3` means **3 distinct surname-level patterns/hypotheses passing minimum evidence threshold**, not 3 confirmed family migrations.

---

# 25. SURNAME PROFILE MODEL

## Decision: `SurnameProfile` is an API/product projection with optional cached snapshot, not a primary entity table

### Why

A profile is simply a convenient assembly of:

```text
Surname
+ active Claims
+ latest approved ConfidenceAssessments
+ canonical domain objects
+ CoverageAssessment
+ DiscoveryIndex
+ citations/limitations
```

Making it the primary table would duplicate truth and create synchronization bugs.

## 25.1 Logical `SurnameProfileProjection`

```json
{
  "surname_id": "...",
  "profile_version": "...",
  "built_from_run_id": "...",
  "identity": {},
  "current": {},
  "meaning": {},
  "origins": [],
  "variants": [],
  "occurrences": [],
  "places": [],
  "coverage": {},
  "discovery_index": {},
  "claim_ids": [],
  "citation_ids": [],
  "limitations": []
}
```

## 25.2 Persistence recommendation

- Build on demand from canonical tables for correctness.
- Cache JSON projection in Redis/application cache initially if performance requires.
- Optionally persist `surname_profile_snapshots` only when needed for SEO snapshotting, report reproducibility or expensive repeated assembly.
- A cached profile carries `built_from_run_id`, `profile_schema_version`, and `source_state_hash`; stale cache never becomes truth.

---

# 26. REPORT DATA MODEL

Reports are versioned presentation artifacts referencing canonical Claims.

## 26.1 `Report`

| Field | Type | Description |
|---|---|---|
| `report_id` | UUIDv7 | Logical report identity |
| `surname_id` | UUID | Subject surname |
| `report_type` | ReportType | NAME_ATLAS, later FAMILY_ORIGIN, DEEP_RESEARCH |
| `owner_ref` | UUID/text/null | Anonymous purchase/user account abstraction; details in payment/auth specs |
| `status` | ReportStatus | DRAFT, READY, SUPERSEDED, WITHDRAWN |
| `created_at` | timestamptz | — |

## 26.2 `ReportVersion`

| Field | Type | Description |
|---|---|---|
| `report_version_id` | UUIDv7 | Immutable version |
| `report_id` | UUID | — |
| `version_number` | integer | Monotonic |
| `research_run_id` | UUID | Evidence basis |
| `coverage_assessment_id` | UUID | — |
| `discovery_index_id` | UUID | — |
| `report_schema_version` | text | — |
| `rendered_payload` | JSONB | Structured presentation snapshot |
| `rendered_artifact_ref` | text/null | PDF/object storage reference if created |
| `generated_at` | timestamptz | — |

Generated prose may exist in `rendered_payload`; it is a frozen artifact, not canonical truth.

## 26.3 `ReportSection`

| Field | Type | Description |
|---|---|---|
| `report_section_id` | UUIDv7 | — |
| `report_version_id` | UUID | — |
| `section_type` | ReportSectionType | ORIGIN, DISTRIBUTION, VARIANTS, PLACES, TIMELINE, MIGRATION, ARCHIVES, SOURCES, LIMITATIONS |
| `sequence_number` | integer | — |
| `title_payload` | JSONB | Localisable presentation data |
| `body_payload` | JSONB | Structured blocks / generated copy snapshot |
| `section_confidence_summary` | JSONB | Presentation summary only |

## 26.4 `ReportClaimReference`

```text
report_section_id
claim_id
presentation_role = HERO | SUPPORT | FOOTNOTE | LIMITATION
sequence
```

This is the critical link ensuring a report can always identify which Claims support each section.

---

# 27. COMMERCIAL OBJECTS — HIGH LEVEL

Full payments architecture belongs later. The canonical data model needs only product/access primitives.

## 27.1 `Offer`

| Field | Type | Description |
|---|---|---|
| `offer_id` | UUIDv7 | — |
| `offer_key` | text | e.g. FULL_NAME_ATLAS |
| `market` | text | PL, etc. |
| `currency` | char(3) | ISO 4217 |
| `amount_minor` | integer | Configurable, not hard-coded in UI |
| `billing_model` | BillingModel | ONE_TIME initially |
| `eligibility_rule_version` | text | — |
| `active_from` / `active_to` | timestamptz/null | — |
| `experiment_variant` | text/null | Price/offer test assignment config |
| `status` | OfferStatus | ACTIVE, PAUSED, RETIRED |

## 27.2 `Entitlement`

| Field | Type | Description |
|---|---|---|
| `entitlement_id` | UUIDv7 | — |
| `offer_id` | UUID | Purchased/granted offer |
| `report_id` | UUID/null | Report access target |
| `subject_ref` | UUID/text | User/session/magic-link owner abstraction |
| `entitlement_status` | EntitlementStatus | ACTIVE, REVOKED, REFUNDED, EXPIRED |
| `granted_at` | timestamptz | — |
| `revoked_at` | timestamptz/null | — |

Order/payment references are added in the dedicated commercial architecture.

---

# 28. FAMILY-LEVEL FUTURE EXTENSION

The surname model is intentionally designed so family research can attach to the same Source/Evidence/Claim system without contaminating public surname data.

Future objects:

## `Person`

Generic historical/public person entity. May be public or restricted depending context.

## `FamilyPerson`

Private user-supplied/researched person. `privacy_class = SENSITIVE_FAMILY`. Never indexable.

## `FamilyBranch`

Private grouping of FamilyPersons plus relationship hypotheses.

## `CandidateRecord`

A SourceRecord/structured record that may correspond to a FamilyPerson. Candidate is not ancestor.

## `EvidenceLink`

Evidence-backed relationship such as SAME_PERSON, PARENT_CHILD, SPOUSE, PLACE_CONNECTION.

## `MigrationEvent`

Person/family-level event; distinct from `MigrationPattern`.

## `AncestorRelationship`

Relationship Claim that may become VERIFIED only after person-level linkage evidence and required review.

### Architectural continuity

The existing model already provides:

```text
KnowledgeEntity
Source
SourceRecord
EvidenceItem
Claim
ClaimEvidence
ConfidenceAssessment
Place / PlaceName / AdminMembership
ResearchRun
RightsProfile
```

Family research extends these rather than replacing them.

---

# 29. POSTGRESQL PHYSICAL MODEL

## 29.1 Decision: PostgreSQL relational core + PostGIS, no dedicated graph DB in MVP

Reasons:

1. Most access patterns are relational and auditable.
2. Claim/evidence edges are straightforward many-to-many tables.
3. PostGIS handles core spatial requirements.
4. PostgreSQL JSONB handles genuinely heterogeneous source/claim payloads.
5. Recursive queries can support moderate graph traversal.
6. A graph database introduces operational complexity before evidence volume justifies it.

A future read-optimized graph projection may be added if family/person relationship traversal becomes dominant. PostgreSQL remains canonical unless measured workload proves otherwise.

## 29.2 Recommended tables

### Infrastructure / identity

```text
knowledge_entities
surnames
name_forms
name_form_relations
entity_external_ids
surname_resolution_results        optional/audit
```

### Geography

```text
places
place_names
place_geometries
administrative_memberships
```

### Distribution

```text
distribution_snapshots
distribution_values
```

### Onomastics/history

```text
surname_classifications
meaning_interpretations
origin_hypotheses
historical_variants
historical_occurrences
migration_patterns                P1/later
```

### Sources / rights / evidence

```text
sources
rights_profiles
source_records
digital_assets
evidence_items
evidence_dependencies             P1
claims
claim_evidence
confidence_assessments
citations
```

### Runtime/product projection

```text
research_runs
research_run_source_manifest
coverage_assessments
coverage_dimensions
discovery_indexes
discovery_index_entries
surname_profile_snapshots         optional cache
```

### Report / commercial

```text
reports
report_versions
report_sections
report_claim_references
offers
entitlements
```

## 29.3 P0 tables for first vertical slice

The first end-to-end pipeline does **not** need every table above.

Create first:

```text
knowledge_entities
surnames
name_forms
name_form_relations
entity_external_ids

places
place_names
administrative_memberships

distribution_snapshots
distribution_values

sources
rights_profiles
source_records
evidence_items
claims
claim_evidence
confidence_assessments
citations

historical_variants
historical_occurrences
origin_hypotheses
meaning_interpretations

research_runs
coverage_assessments
coverage_dimensions
discovery_indexes
discovery_index_entries
```

Add report/payment tables after the surname JSON vertical slice passes regression tests.

---

# 30. NORMALISED COLUMNS VS JSONB

## 30.1 Use normal relational columns for

- primary/foreign keys;
- status enums;
- surname canonical fields;
- place identity;
- script/language codes;
- temporal query fields;
- source identifiers;
- rights permissions;
- Claim type/scope/epistemic status;
- confidence status;
- counts/denominators;
- report/order relationships;
- anything filtered/joined frequently.

## 30.2 Use junction tables for

- Claim ↔ Evidence;
- entity external IDs;
- administrative memberships;
- report section ↔ Claim;
- run ↔ source connector manifest when normalized details needed;
- later person relationships.

## 30.3 Use JSONB for genuine heterogeneous payloads

Good uses:

- raw API/source payload snapshots;
- typed Claim `structured_value` validated by ClaimType schema;
- ResearchRun manifests;
- small confidence distributions in DiscoveryIndex entries;
- frozen report rendering payload;
- structured error summaries.

Bad uses:

- whole `SurnameProfile` as the only database truth;
- arbitrary source rights;
- place memberships;
- claims/evidence lists as arrays instead of relations;
- all historical occurrences embedded inside one surname row.

---

# 31. INDEXING STRATEGY

Do not prematurely create dozens of indexes. P0 candidates:

## Identity

```text
UNIQUE surnames(canonical_key, canonical_key_version)
GIN/GiST or pg_trgm on name_forms.unicode_nfc/search_key
BTREE name_forms(surname_id, form_type)
```

Use `pg_trgm` for candidate retrieval; actual resolution semantics belong to Document 13.

## External IDs

```text
UNIQUE entity_external_ids(provider_key, external_id)
```

where provider IDs are globally unique inside provider scope.

## Geography

```text
BTREE place_names(normalized_name)
trigram index on place_names.normalized_name
GiST place_geometries.geometry
GiST/BTREE strategies for temporal overlap if range columns are later adopted
```

## Distribution

```text
BTREE distribution_snapshots(surname_id, as_of_date DESC)
BTREE distribution_values(distribution_snapshot_id, place_id)
```

## Source/evidence

```text
UNIQUE sources(source_key)
UNIQUE source_records(source_id, external_record_id) WHERE external_record_id IS NOT NULL
BTREE source_records(source_id, retrieved_at DESC)
BTREE evidence_items(source_record_id)
BTREE evidence_items(subject_entity_id)
BTREE claims(subject_entity_id, claim_type, claim_status)
BTREE claim_evidence(claim_id, relationship)
BTREE claim_evidence(evidence_item_id)
BTREE confidence_assessments(claim_id, assessed_at DESC)
```

## History

```text
BTREE historical_occurrences(surname_id)
BTREE historical_occurrences(name_form_id)
BTREE historical_occurrences(place_id)
BTREE historical_variants(surname_id, status)
```

## Product

```text
BTREE coverage_assessments(surname_id, assessed_at DESC)
BTREE discovery_indexes(surname_id, generated_at DESC)
BTREE research_runs(surname_id, started_at DESC)
```

---

# 32. ID STRATEGY

## Decision: app-generated UUIDv7 for internal durable IDs

### Why UUIDv7

- globally unique across future services/workers;
- roughly time ordered, improving index locality vs random UUIDv4;
- safe to generate before DB insert;
- avoids exposing sequential counts like BIGINT IDs;
- works for offline/import/background workflows;
- suitable for globally-ready expansion.

Do not rely on a database-specific `uuidv7()` function being present; generate in application/shared library unless the deployed PostgreSQL version is explicitly standardized.

## External identifiers

Always store separately:

```text
internal entity_id = UUIDv7
external provider ID = original string
provider_key = TERYT / WIKIDATA / GEONAMES / POLONA / etc.
```

Never use a third-party identifier as Name Atlas primary key.

---

# 33. ENUM / TAXONOMY REGISTRY

Taxonomies should be centrally versioned and exposed as code enums/reference data, not magic strings scattered through prompts and application code.

## 33.1 Core enums

### `EntityType`

```text
SURNAME
NAME_FORM
PLACE
SURNAME_CLASSIFICATION
MEANING_INTERPRETATION
ORIGIN_HYPOTHESIS
HISTORICAL_VARIANT
HISTORICAL_OCCURRENCE
MIGRATION_PATTERN
PERSON                 later
FAMILY_PERSON          later
CANDIDATE_RECORD       later
```

### `EvidenceScope`

```text
SHARED
SURNAME_LEVEL
FAMILY_LEVEL
PERSON_LEVEL
```

### `PrivacyClass`

```text
PUBLIC
INTERNAL
USER_PRIVATE
SENSITIVE_FAMILY
```

### `NameFormType`

```text
CANONICAL
MODERN_VARIANT
HISTORICAL_ATTESTED
TRANSLITERATION
MIGRATION_ADAPTATION
LINGUISTIC_NORMALISATION
SEARCH_CANDIDATE
```

### `NameFormRelationType`

```text
ATTESTED_AS
ORTHOGRAPHIC_VARIANT_OF
POSSIBLE_VARIANT_OF
TRANSLITERATION_OF
MIGRATION_ADAPTATION_OF
SEARCH_SIMILAR_TO
UNRELATED_SIMILAR_FORM
```

### `AttestationStatus`

```text
ATTESTED
DERIVED
GENERATED_CANDIDATE
DISPUTED
```

### `PlaceType`

```text
COUNTRY
REGION
PROVINCE_STATE
COUNTY_DISTRICT
MUNICIPALITY
CITY
VILLAGE
PARISH
HISTORICAL_TERRITORY
OTHER
```

### `SpatialPrecision`

```text
EXACT_POINT
LOCALITY
MUNICIPALITY
REGION
COUNTRY
APPROXIMATE_AREA
UNKNOWN
```

### `ClaimType`

Start with the taxonomy in §11; version the list as `ClaimType.v1`.

### `EpistemicType`

```text
FACT
INTERPRETATION
HYPOTHESIS
UNKNOWN
```

### `ConfidenceStatus`

```text
VERIFIED
LIKELY
POSSIBLE
UNCONFIRMED
CONFLICTING
INSUFFICIENT_DATA
```

### `EvidenceType`

```text
OFFICIAL_DATASET_FIELD
PRIMARY_RECORD
AUTHORITATIVE_INDEX
SCHOLARLY_SOURCE
SECONDARY_HISTORICAL_SOURCE
DERIVED_STATISTIC
ALGORITHMIC_SIMILARITY
USER_PROVIDED
OTHER
```

### `ClaimEvidenceRelationship`

```text
SUPPORTS
CONTRADICTS
CONTEXT
```

### `RightsPermission`

```text
ALLOWED
CONDITIONAL
PROHIBITED
UNKNOWN
```

### `CoverageAvailability`

```text
STRONG
PARTIAL
NONE
BLOCKED_RIGHTS
SOURCE_UNAVAILABLE
NOT_RETRIEVED
NOT_APPLICABLE
```

### `CoverageTier`

```text
RICH
STANDARD
LIMITED
MINIMAL
```

### `OccurrenceVerificationStatus`

```text
VERIFIED
REVIEWED
MACHINE_CANDIDATE
OCR_SUSPECT
REJECTED
```

### `ResearchRunStatus`

```text
PENDING
RUNNING
PARTIAL
COMPLETE
FAILED
REVIEW_REQUIRED
```

### `SourceProductionStatus`

```text
APPROVED
PARTNERSHIP_REQUIRED
LEGAL_REVIEW_REQUIRED
BLOCKED
DEPRECATED
```

---

# 34. PRIVACY CLASSIFICATION

## 34.1 MVP surname-level objects

| Object | Default privacy | Notes |
|---|---|---|
| Surname | PUBLIC | Public linguistic entity |
| NameForm | PUBLIC/INTERNAL | Search-only candidates may remain INTERNAL |
| Place / PlaceName | PUBLIC | Public geography |
| DistributionSnapshot | PUBLIC/INTERNAL | Depends on source/rights; tiny-count geography may require suppression |
| OriginHypothesis | PUBLIC after QA | Before QA INTERNAL |
| MeaningInterpretation | PUBLIC after QA | — |
| HistoricalVariant | PUBLIC after QA | — |
| HistoricalOccurrence | PUBLIC after rights/QA | Record/image may have separate rights |
| Source / Citation | PUBLIC metadata where allowed | Rights-specific |
| SourceRecord raw payload | INTERNAL | Do not expose raw connector payload blindly |
| RightsProfile | INTERNAL | Public-facing attribution derived from it |
| EvidenceItem | INTERNAL by default | Selected evidence can be presented through curated views |
| Claim | INTERNAL canonical / PUBLIC projection | Canonical structured Claim powers public copy |
| ConfidenceAssessment | INTERNAL canonical / PUBLIC status | Internal rationale may not be exposed verbatim |
| ResearchRun | INTERNAL | May contain user query/runtime data |
| CoverageAssessment | INTERNAL + public summary | — |
| DiscoveryIndex | INTERNAL canonical + public preview | — |
| Report | USER_PRIVATE by default | Surname facts may be public, purchase/access state is private |
| Entitlement | USER_PRIVATE | — |

## 34.2 Future family objects

```text
FamilyPerson
FamilyBranch
FamilyDate/Place annotations
PotentialMatch
UploadedRecord
PrivateNote
ResearchCase
AncestorRelationship
```

are `USER_PRIVATE` or `SENSITIVE_FAMILY`, **never public and never SEO-indexable**.

---

# 35. INDEXABILITY / SEO CLASSIFICATION

The database distinguishes “public fact” from “eligible for an indexable page”.

## 35.1 Can power public SEO after quality gate

- Surname;
- approved NameForms/variants;
- current population Claims;
- distribution Claims where rights/data allow;
- MeaningInterpretation;
- OriginHypothesis;
- historical occurrences/places after rights + QA;
- public Sources/Citations.

## 35.2 Never directly index

- ResearchRun;
- internal EvidenceItem payloads;
- RightsProfile internals;
- search candidates;
- rejected/uncertain resolver candidates as facts;
- entitlement/payment objects;
- user-specific purchased report access state;
- all FamilyPerson/FamilyBranch/private research data.

## 35.3 SEO eligibility is a product gate

A Surname entity can exist in the database without an indexable page. Indexability requires a later `SEOQualification` check based on:

- resolved entity;
- sufficient unique content;
- primary claims sourced;
- acceptable coverage;
- no critical rights conflict;
- not substantially duplicate/thin.

Do not add `is_indexed = true` as a permanent semantic attribute of Surname; it is a deploy/product-state decision.

---

# 36. DATA LIFECYCLE

## 36.1 Surname / Place

- Created when entity resolution creates/approves canonical identity.
- Updated when canonical display/external mappings change.
- Merged rather than hard-deleted if duplicate identity discovered.
- Historical IDs remain resolvable to merge target.

## 36.2 Source / Rights

- Source remains stable.
- New licence/terms create new RightsProfile.
- Expired/blocked rights immediately affect future surface eligibility.
- Existing reports retain the rights snapshot under which they were generated, subject to legal takedown obligations.

## 36.3 SourceRecord

- Ingested as immutable revision.
- Source changes create new revision/supersession.
- Inaccessible/withdrawn item is flagged; do not silently delete provenance needed for audit, subject to legal requirements.

## 36.4 Evidence / Claims

- Evidence corrected/rejected via status, not destructive silent edit.
- Claims superseded/retracted when new evidence changes conclusion.
- Confidence reassessed whenever material evidence set changes.

## 36.5 Distribution

A new PESEL or other official snapshot creates a new DistributionSnapshot. Do not overwrite the prior snapshot; historical comparison may later depend on it, but cross-snapshot comparability must still be methodologically validated.

## 36.6 Coverage / Discovery

Recomputed when:

- research run changes evidence;
- rights eligibility changes;
- Claim confidence changes;
- dedupe logic changes;
- premium threshold rules change.

## 36.7 Reports

- Logical Report remains.
- New research/regeneration creates new immutable ReportVersion.
- Refund does not delete research truth; it changes entitlement/commercial state.

---

# 37. EXAMPLE — ONE SURNAME THROUGH THE MODEL

The following is **synthetic** and uses `[SURNAME]` / invented IDs. It demonstrates structure only and does not assert facts about Cichowski or any other real surname.

## 37.1 Identity

```text
Surname
  surname_id: 0199...a1
  canonical_display: "[SURNAME]"
  canonical_key: "[normalized-key]"
  primary_script: Latn
```

Name forms:

```text
NF1  "[SURNAME]"       CANONICAL / ATTESTED
NF2  "[VARIANT_A]"     HISTORICAL_ATTESTED / ATTESTED
NF3  "[FUZZY_FORM]"    SEARCH_CANDIDATE / GENERATED_CANDIDATE
```

NF3 does not appear in HistoricalVariant.

## 37.2 Current source

```text
Source S1
  official surname dataset

SourceRecord SR1
  external_record_id: row/resource identifier
  raw_payload: {surname: "[SURNAME]", count: 2481}

Evidence E1
  type: OFFICIAL_DATASET_FIELD
  value: {count: 2481, snapshot: "[DATE]"}

Claim C1
  type: CURRENT_POPULATION
  epistemic: FACT
  subject: [SURNAME]
  value: {count: 2481, snapshot_id: DS1}

ClaimEvidence
  C1 SUPPORTS E1

Confidence CA1
  C1 → VERIFIED
```

All numbers are synthetic placeholders.

## 37.3 Historical source

```text
Source S2
  digital historical collection

SourceRecord SR2
  item/page [synthetic]

Evidence E2
  raw_match: "[VARIANT_A]"
  temporal: [YEAR]
  place text: "[PLACE]"

HistoricalOccurrence HO1
  surname: [SURNAME]
  name_form: NF2
  source_record: SR2
  place: P1
  temporal: [YEAR]

Claim C2
  HISTORICAL_OCCURRENCE
  FACT

HistoricalVariant HV1
  surname: [SURNAME]
  name_form: NF2
  primary_claim: C3 (variant relation)
```

## 37.4 Interpretation

```text
OriginHypothesis OH1
  kind: TOPONYMIC
  candidate_region: P2
  primary_claim: C4

Claim C4
  epistemic: INTERPRETATION
  confidence: LIKELY
  evidence: E3, E4, E5
```

Again, this is only a model example.

## 37.5 Coverage

```text
population              STRONG
modern_geography        NONE
etymology               PARTIAL
origin                   PARTIAL
variants                 STRONG
historical_occurrences   STRONG
historical_places        PARTIAL
archives                 PARTIAL
migration                NONE
```

CoverageTier:

```text
STANDARD
```

## 37.6 DiscoveryIndex

```text
historical_variants     1
historical_places       1
historical_occurrences  3
archive_references      2
migration_clues         0
```

Only non-zero, rights-eligible categories may enter premium preview.

## 37.7 SurnameProfileProjection

The profile references C1–C4, latest confidence assessments, coverage and citations. It does not copy the research into an independent truth blob.

---

# 38. ANTI-PATTERNS

Do **not** implement:

1. one giant `surname_profile JSONB` row as the whole database;
2. generated prose as canonical truth;
3. `surname.origin_country` as a single scalar field;
4. `surname.meaning` as unsourced text;
5. overwriting historical spelling with normalized spelling;
6. promoting a fuzzy/search candidate directly to HistoricalVariant;
7. attaching a Source URL directly to arbitrary UI copy without Evidence/Claim linkage;
8. confidence percentages without calibrated probabilistic model;
9. current map values without dataset/date/method/source;
10. treating no-data cells as zero;
11. treating a SourceRecord surname hit as a person/ancestor match;
12. mixing FamilyPerson records into public surname tables;
13. keeping source-use rights only in Notion/legal docs;
14. storing scan metadata and scan-reproduction rights as one boolean;
15. counting mirrored/copied historical records as independent evidence;
16. overwriting Claims when evidence changes;
17. storing all external provider IDs as ad-hoc columns on Place;
18. using a graph database before relational workload proves the need;
19. using JSONB for every relationship because schemas are still evolving;
20. persisting hidden LLM chain-of-thought as research audit data.

---

# 39. MIGRATION / IMPLEMENTATION PLAN

There is no production DB to migrate, so “migration” means staged schema creation.

## Stage A — Semantic foundation

Create:

1. enums/taxonomy registry;
2. UUIDv7 generation shared library;
3. `knowledge_entities`;
4. `surnames`;
5. `name_forms` + relations;
6. `places` + names + external IDs;
7. `sources` + `rights_profiles` + `source_records`;
8. `research_runs`.

Exit criterion: a query can resolve to canonical Surname and source records can be stored with rights/provenance.

## Stage B — Evidence foundation

Create:

1. `evidence_items`;
2. `claims`;
3. `claim_evidence`;
4. `confidence_assessments`;
5. `citations`;
6. schema validation for ClaimType structured payloads.

Exit criterion: every displayed factual/interpretive assertion can be traced to evidence.

## Stage C — Surname intelligence

Create:

1. distributions;
2. meaning/origin objects;
3. historical variants;
4. historical occurrences;
5. geographic/admin temporal extensions.

Exit criterion: first vertical slice can produce structured surname research.

## Stage D — Product projection

Create:

1. coverage;
2. DiscoveryIndex;
3. optional profile cache;
4. report tables after premium eligibility is proven.

Exit criterion: JSON result can truthfully decide what the free and premium experiences may contain.

## Dependencies for Documents 12–17

- **12 Source Connectors** consumes Source, SourceRecord, RightsProfile, DigitalAsset, ExternalId and raw/normalized preservation rules.
- **13 Surname Resolution** consumes Surname, NameForm, NameFormRelation, SurnameResolution and identity/dedupe rules.
- **14 Evidence Engine** consumes EvidenceItem, Claim, ClaimEvidence, ConfidenceAssessment, Citation and Claim taxonomy.
- **15 Runtime** consumes ResearchRun, manifests, object lifecycle and run lineage.
- **16 API Contract** consumes SurnameProfileProjection, CoverageAssessment, DiscoveryIndex, Report projection and privacy/indexability rules.
- **17 QA Corpus** tests all enums, claim rules, rights states, variants, occurrence dedupe, low-data and conflict cases.

---

# 40. DECISION REGISTER

## DM-001 — Relational vs graph database

**Decision:** PostgreSQL relational system of record.  
**Alternatives:** Neo4j/Neptune/Arango as canonical DB.  
**Why:** current graph is moderate, audit-heavy and relational; Postgres can represent edges and recursive traversal while remaining simpler.  
**Consequence:** graph-like relations use entity registry + junction tables. Add graph projection later only if measured workloads require it.

## DM-002 — PostGIS

**Decision:** enable PostGIS from foundation.  
**Alternatives:** lat/lon numeric fields only; external map service as truth.  
**Why:** maps, historical boundaries and place resolution are core product functions.  
**Consequence:** PlaceGeometry and spatial indexes are first-class.

## DM-003 — Claim persistence

**Decision:** Claims are persisted, versioned canonical knowledge objects.  
**Alternatives:** generate Claims transiently per report.  
**Why:** provenance, QA, conflicts, SEO consistency, report reproducibility and paywall truthfulness all depend on stable Claims.  
**Consequence:** generated prose never bypasses Claim layer.

## DM-004 — SurnameProfile persistence

**Decision:** Profile is computed projection/cache, not primary truth.  
**Alternatives:** one canonical profile row/blob.  
**Why:** avoids duplicated truth and stale independent narratives.  
**Consequence:** profile cache must carry run/schema/version hashes.

## DM-005 — HistoricalPlace

**Decision:** no independent canonical HistoricalPlace table.  
**Alternatives:** separate current Place and HistoricalPlace roots.  
**Why:** same locality can change name/admin/polity over time; identity should remain linked.  
**Consequence:** historical view is assembled from PlaceName, AdministrativeMembership, PlaceGeometry and temporal extent.

## DM-006 — JSONB boundary

**Decision:** relational for stable/queryable semantics; JSONB for heterogeneous typed payloads and snapshots.  
**Alternatives:** document-first database / JSONB everywhere.  
**Why:** core relationships need constraints and efficient joins.  
**Consequence:** every JSONB Claim payload has a schema discriminator/version.

## DM-007 — Internal IDs

**Decision:** application-generated UUIDv7.  
**Alternatives:** BIGINT, UUIDv4, ULID.  
**Why:** distributed generation + temporal locality + non-sequential exposure.  
**Consequence:** external IDs remain separate.

## DM-008 — Temporal modelling

**Decision:** reusable TemporalExtent value object flattened into relevant relational tables.  
**Alternatives:** exact dates only; free-text period only; universal temporal table.  
**Why:** genealogy/history requires uncertainty and year-level precision without false exactness.  
**Consequence:** query helpers and validation must be shared across services.

## DM-009 — Rights modelling

**Decision:** versioned RightsProfile with source default + record/asset override.  
**Alternatives:** one source-level licence string.  
**Why:** metadata, image, transcription, cache and commercial rights can differ per item.  
**Consequence:** paid-surface eligibility queries rights at evidence time and report time.

## DM-010 — Variant truth

**Decision:** NameForm, relation and HistoricalVariant are separate concepts.  
**Alternatives:** flat `variants[]` array.  
**Why:** candidate retrieval and source-attested history have different epistemic meaning.  
**Consequence:** search candidates are technically prevented from becoming historical facts without Claim/evidence transition.

---

# 41. FINAL CANONICAL MODEL

```text
                                      ┌──────────────────────┐
                                      │   KNOWLEDGE_ENTITY   │
                                      └──────────┬───────────┘
                                                 │
               ┌─────────────────────────────────┼──────────────────────────────┐
               │                                 │                              │
               ▼                                 ▼                              ▼
          ┌─────────┐                       ┌─────────┐                   ┌─────────────┐
          │ SURNAME │                       │  PLACE  │                   │ NAME FORM   │
          └────┬────┘                       └────┬────┘                   └──────┬──────┘
               │                                 │                              │
        ┌──────┼─────────────┐          ┌────────┼─────────┐                    │
        │      │             │          │        │         │                    │
        ▼      ▼             ▼          ▼        ▼         ▼                    ▼
 DISTRIBUTION ORIGIN      MEANING   PLACE NAME  ADMIN   GEOMETRY        HISTORICAL VARIANT
   SNAPSHOT   HYPOTHESIS  INTERP.                MEMBERSHIP
        │                                     (time-aware)
        │
        ▼
 DISTRIBUTION VALUE

 SURNAME ───────┬─────────────────────── HISTORICAL OCCURRENCE
                │                                  │
                │                                  ▼
                │                            SOURCE RECORD
                │                                  │
                │                                  ▼
                │                            EVIDENCE ITEM
                │                                  │
                └──────────────► CLAIM ◄───────────┘
                                    │
                         ┌──────────┼──────────┐
                         ▼          ▼          ▼
                    CLAIM_EVID. CONFIDENCE  CITATION
                         │
                         ▼
                       SOURCE ───────────────► RIGHTS PROFILE
                         │
                         └──────────────► DIGITAL ASSET ─► RIGHTS PROFILE

 CLAIMS + DOMAIN OBJECTS + RIGHTS
                │
                ▼
        COVERAGE ASSESSMENT
                │
                ▼
          DISCOVERY INDEX
                │
       ┌────────┴────────┐
       ▼                 ▼
 SURNAME PROFILE       REPORT VERSION
   PROJECTION               │
                            ▼
                      REPORT SECTION
                            │
                            ▼
                       CLAIM REFERENCES
```

---

# 42. MVP TABLES TO CREATE FIRST

Recommended first migration group, in dependency order:

1. `knowledge_entities`
2. `surnames`
3. `name_forms`
4. `name_form_relations`
5. `entity_external_ids`
6. `places`
7. `place_names`
8. `administrative_memberships`
9. `sources`
10. `rights_profiles`
11. `source_records`
12. `research_runs`
13. `distribution_snapshots`
14. `distribution_values`
15. `evidence_items`
16. `claims`
17. `claim_evidence`
18. `confidence_assessments`
19. `citations`
20. `historical_occurrences`
21. `historical_variants`
22. `meaning_interpretations`
23. `origin_hypotheses`
24. `coverage_assessments`
25. `coverage_dimensions`
26. `discovery_indexes`
27. `discovery_index_entries`

Add `place_geometries`, `digital_assets`, report/commercial tables as soon as the relevant first connector/map/report slice needs them; the schema definitions should still be prepared from the start.

---

# 43. OBJECTS TO DEFER

Do not make these MVP launch dependencies:

- full Person model;
- FamilyPerson;
- FamilyBranch;
- CandidateRecord matching engine;
- EvidenceLink for kinship;
- MigrationEvent;
- AncestorRelationship;
- DNA objects;
- full family-tree graph;
- heraldic lineage entitlement;
- graph-database projection;
- generalized event ontology for all genealogy events;
- complex probabilistic confidence scores.

Design extension points only.

---

# 44. BLOCKING QUESTIONS FOR DOCUMENT 12 — SOURCE CONNECTOR ARCHITECTURE

Document 12 must consume this model and resolve source-specific implementation questions rather than redefining the domain.

## 44.1 Connector identity and raw storage

For each source:

- what exactly is the `Source` vs `SourceRecord` boundary?
- what external IDs are stable?
- what raw payload may be stored?
- what content must stay external/object-store only?
- how are revisions detected?

## 44.2 Rights

For each connector:

- which RightsProfile fields are known?
- what is source default vs item override?
- may metadata be cached?
- may images be cached/reproduced?
- may transcriptions/OCR enter paid reports?
- what attribution is required?
- how often must terms be rechecked?

## 44.3 Geography

- which provider IDs map to `Place` / `EntityExternalId`?
- how are unresolved place names stored before canonical resolution?
- which historical geometries/admin memberships are trustworthy enough to ingest?

## 44.4 Distribution

For PESEL and any future regional source:

- exact snapshot/resource semantics;
- count unit (people/records/etc.);
- denominator compatibility;
- geography level;
- dataset version and update cadence;
- whether a zero is meaningful;
- `comparability_group` rules.

## 44.5 Historical text/OCR

For Polona/FBC/Europeana and later corpora:

- SourceRecord granularity: item/page/OCR segment;
- locator/bounding-box support;
- OCR confidence availability;
- content hashes and mirror dedupe;
- DigitalAsset rights;
- occurrence candidate creation rules.

## 44.6 Production states

Every connector must resolve to:

```text
APPROVED
PARTNERSHIP_REQUIRED
LEGAL_REVIEW_REQUIRED
BLOCKED
DEPRECATED
```

and only approved use cases may create surface-eligible evidence automatically.

---

# 45. FINAL RECOMMENDATION

The canonical Name Atlas data foundation should be understood as five stacked layers:

```text
1. ENTITY LAYER
   surname · forms · places · time

2. SOURCE LAYER
   sources · records · assets · rights

3. EVIDENCE LAYER
   evidence · claims · contradictions · confidence

4. PRODUCT KNOWLEDGE LAYER
   coverage · DiscoveryIndex · profile projection

5. PRESENTATION / ACCESS LAYER
   reports · offers · entitlements
```

The most important implementation invariant is:

> **No consumer-facing historical or origin statement exists because a model wrote it. It exists because a typed Claim links a canonical subject to traceable EvidenceItems from SourceRecords whose rights and scope permit that use, and the Claim has a current ConfidenceAssessment.**

That invariant is the data-model foundation for the rest of Name Atlas.

The next specification should therefore be:

# `12_NAME_ATLAS_SOURCE_CONNECTOR_ARCHITECTURE.md`

It must define how PESEL, TERYT, GUS, Wikidata, GeoNames, Getty TGN, Polona, FBC, Europeana and later partnership sources populate the exact canonical objects defined here without bypassing provenance or rights gates.

---

# APPENDIX A — SOURCE ALIGNMENT

This model was built from the existing Name Atlas architecture rather than from generic genealogy conventions alone. In particular, the source documents establish that:

- Name Atlas should be built around knowledge objects and Claims rather than pages;
- `Surname`, `NameForm`, `Place`, `DistributionSnapshot`, `OriginHypothesis`, `MeaningInterpretation`, `HistoricalOccurrence`, `MigrationPattern`, `Claim`, `EvidenceItem`, `Source` and `Report` are fundamental concepts;
- family-specific data is a separate private context;
- a potential record match is not an ancestor;
- source reliability and identity-match confidence are separate;
- historical name normalisation must preserve original forms and distinguish source-attested variants from generated search candidates;
- historical place resolution requires time-aware names and administrative memberships;
- RightsProfile belongs in the backend and commercial-use uncertainty must gate paid usage;
- production structured outputs must become formal JSON Schema/Pydantic/TypeScript models;
- ResearchRun lineage must log source/prompt/model/schema versions rather than relying on irreproducible prose.

Document 10 adds the implementation boundary that the Evidence/Claim/Rights/Coverage/DiscoveryIndex chain is the system separating research truth from UX and monetisation.

---

# APPENDIX B — SCHEMA IMPLEMENTATION NOTES FOR ENGINEERING

Before writing migrations, engineering should create a shared `/schemas` or equivalent package containing:

```text
ids / UUIDv7 helpers
enums
TemporalExtent
ClaimType payload schemas
EvidenceItem payload schemas
RightsProfile model
Surname / NameForm / Place DTOs
Coverage / DiscoveryIndex models
ResearchRun manifest models
```

Recommended approach:

- Pydantic (backend Python) or equivalent schema-first library for runtime validation;
- generated TypeScript types for frontend/shared tooling where possible;
- PostgreSQL migrations generated/reviewed from the approved canonical schema;
- JSON Schema export for LLM structured outputs;
- one schema version per externally consumed structured object;
- regression fixtures validating old payloads against compatible schema changes.

Prompt outputs must target these shared schemas. Prompts do not define independent data shapes in free text.

