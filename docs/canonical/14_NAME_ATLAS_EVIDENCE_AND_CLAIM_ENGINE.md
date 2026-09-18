# NAME ATLAS — EVIDENCE & CLAIM ENGINE

**Document:** 14. Evidence & Claim Engine  
**Version:** 1.0.0 — Truth-Layer Baseline  
**Date:** 2026-09-17  
**Market:** Poland first, global-ready  
**Status:** Candidate implementation specification  
**Depends on:** `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md`, `11_NAME_ATLAS_CANONICAL_DATA_MODEL.md`, `12_NAME_ATLAS_SOURCE_CONNECTOR_ARCHITECTURE.md`, `13_NAME_ATLAS_SURNAME_RESOLUTION_ENGINE.md`  
**Supplementary research:** `NAME_ATLAS_DATA_TRUTH_LAYER.md`, `NAME_ATLAS_GENEALOGY_SOURCE_ARCHITECTURE.md`, `NAME_ATLAS_09_PROMPT_LIBRARY.md`  
**Next:** `15_NAME_ATLAS_RUNTIME_ORCHESTRATION.md`

---

# 0. PURPOSE, AUTHORITY AND NON-GOALS

This document specifies the central trust layer of Name Atlas.

It answers one question:

> **When does data retrieved from an external source become evidence, when does evidence justify a claim, how is uncertainty represented, and what must happen before that claim is allowed to appear in a free result, paid report, SEO page or later family-research workflow?**

This layer is the boundary between:

```text
retrieval
```

and:

```text
knowledge that Name Atlas is willing to assert
```

The Evidence & Claim Engine consumes:

- approved `Source`;
- versioned `RightsProfile`;
- `SourceRecord`;
- resolver output from Prompt 13;
- source-native values;
- structured/derived calculations;
- OCR/transcription output where applicable;
- research-run context.

It produces:

- `EvidenceItem`;
- `EvidenceDependency`;
- `Claim`;
- `ClaimEvidence`;
- `ConfidenceAssessment`;
- conflict structures;
- surface eligibility;
- `Citation`;
- coverage inputs;
- review tasks;
- auditable provenance.

It does **not**:

- discover external sources by itself;
- decide surname identity from string similarity;
- scrape blocked sources;
- create family relationships from surname occurrences;
- write final consumer narrative as its primary output;
- make unsourced historical claims;
- use model memory as evidence;
- transform “no result returned” into “does not exist”.

The architectural rule is:

```text
SOURCE
↓
SOURCE RECORD
↓
RESOLUTION
↓
EVIDENCE
↓
CLAIM
↓
CONFIDENCE
↓
RIGHTS / QA
↓
PRESENTATION
```

Never:

```text
SURNAME
↓
LLM
↓
STORY
```

---

# 1. EXECUTIVE EVIDENCE ARCHITECTURE

## 1.1 Central thesis

Name Atlas should persist **knowledge propositions and their evidence lineage**, not only generated prose.

The core truth chain is:

```text
Source
  │
  ▼
SourceRecord
  │
  ▼
EvidenceItem
  │
  ├── supports ────────┐
  ├── contradicts ─────┤
  ├── qualifies ───────┤
  └── contextualises ──┤
                        ▼
                      Claim
                        │
                        ▼
              ConfidenceAssessment
                        │
                        ▼
             SurfaceEligibility
                        │
              ┌─────────┼──────────┐
              ▼         ▼          ▼
            FREE      PREMIUM      SEO
```

## 1.2 Object definitions

### `Source`

Provider/dataset/publication/collection-level source identity.

Example:

```text
PESEL surname dataset
Polona
an onomastic dictionary
```

### `SourceRecord`

Concrete retrievable object or row from that source.

Examples:

```text
PESEL row for one surname
one digitised directory
one article/page
one archive index entry
one dictionary headword
```

### `EvidenceItem`

The smallest normalized, auditable information unit used by reasoning.

Examples:

```text
source reports count = 1,234
page 482 contains the exact surname string
dictionary explicitly derives surname from root X
```

### `Claim`

A typed, locale-neutral proposition Name Atlas may evaluate and potentially publish.

Example:

```text
CURRENT_POPULATION(
  surname = S,
  count = 1234,
  snapshot = 2026-01-20,
  dataset_scope = PL
)
```

### `ClaimEvidence`

The typed relationship between a Claim and EvidenceItem.

### `ConfidenceAssessment`

A versioned assessment of how strongly the evidence supports the claim within its exact scope.

### `Citation`

A stable reference projection from source/evidence metadata for display.

### Evidence Graph

The domain structure created by entities, evidence, claims and typed links.

“Graph” does **not** imply a graph database. PostgreSQL remains the canonical MVP storage.

---

# 2. ENGINE BOUNDARIES

## 2.1 Source Connector Layer — Prompt 12

Responsible for:

- external retrieval;
- raw payload preservation;
- SourceRecord;
- rights metadata;
- source authority context;
- source failures;
- provider provenance.

It does not create user-facing knowledge conclusions.

## 2.2 Surname Resolution Engine — Prompt 13

Responsible for:

- surname identity;
- accepted NameForms;
- SearchCandidates;
- transliteration/fuzzy/OCR candidate provenance;
- resolution ambiguity.

It explicitly does **not** establish that a generated form is a historical fact.

## 2.3 Evidence Engine

Responsible for:

- extracting atomic evidence;
- linking evidence to resolved/candidate entities;
- separating raw, derived and interpretive evidence;
- preserving extraction method and locator;
- deduplicating evidence streams;
- identifying source independence.

## 2.4 Claim Engine

Responsible for:

- candidate proposition generation;
- typed Claim validation;
- evidence linkage;
- contradiction detection;
- claim deduplication/versioning.

## 2.5 Confidence Engine

Responsible for:

- claim-type-specific confidence policy;
- six-state output;
- human-review triggers;
- preserving conflicts.

## 2.6 Presentation layer

Consumes only approved claims/projections.

It does not reinterpret raw evidence.

---

# 3. EVIDENCE ITEM DEFINITION

Canonical definition:

> **EvidenceItem is the smallest auditable source-backed or explicitly derived information object that can support, contradict, qualify or contextualise a Claim.**

Evidence is not equivalent to a source.

A 700-page directory is a `SourceRecord`.

A specific entry on page 482 is evidence.

A PESEL CSV is raw/source data.

One row saying a surname occurs `N` times is evidence.

A scholarly book is a source.

The explicit sentence or structured interpretation discussing a surname is evidence.

---

# 4. EVIDENCE TYPE TAXONOMY

Recommended `EvidenceType.v1`:

```text
OFFICIAL_DATASET_VALUE
PRIMARY_ARCHIVAL_RECORD
ARCHIVAL_INDEX
SCHOLARLY_ONOMASTIC_STATEMENT
SCHOLARLY_HISTORICAL_STATEMENT
INSTITUTIONAL_METADATA
DIGITAL_LIBRARY_METADATA
OCR_EXTRACT
TRANSCRIPTION
DERIVED_STATISTIC
GEOGRAPHIC_ASSERTION
LINGUISTIC_ANALYSIS
ALGORITHMIC_SIMILARITY
USER_PROVIDED_FACT
PARTNER_RECORD
HUMAN_RESEARCH_NOTE
SYSTEM_COVERAGE_FACT
OTHER
```

## 4.1 `OFFICIAL_DATASET_VALUE`

Examples:

- surname count;
- regional count;
- official administrative value.

Typical role:

```text
direct evidence for narrowly scoped statistical facts
```

## 4.2 `PRIMARY_ARCHIVAL_RECORD`

Original or faithful digital representation of a historical record.

Typical role:

```text
strong evidence for what the record says
```

Not automatically proof that the record concerns the user's family.

## 4.3 `ARCHIVAL_INDEX`

Structured index/transcription pointing to an underlying record.

Useful for discovery and sometimes strong factual evidence, but the original can remain preferable for high-risk genealogy.

## 4.4 `SCHOLARLY_ONOMASTIC_STATEMENT`

Domain-specialist source discussing:

- etymology;
- root;
- morphology;
- formation;
- historical forms;
- language/geographic hypotheses.

## 4.5 `SCHOLARLY_HISTORICAL_STATEMENT`

Secondary expert analysis relevant to historical context.

## 4.6 `OCR_EXTRACT`

Machine-extracted text.

It proves:

```text
the OCR system returned this reading
```

not automatically:

```text
the document certainly contains this spelling
```

## 4.7 `DERIVED_STATISTIC`

Value deterministically calculated from upstream evidence.

Examples:

- rank;
- 1-in-X;
- percentile;
- concentration index.

## 4.8 `ALGORITHMIC_SIMILARITY`

Resolver/search signal.

Critical rule:

```text
ALGORITHMIC_SIMILARITY
cannot by itself establish
HISTORICAL_FORM_ATTESTED
```

It can support search/research routing.

## 4.9 `USER_PROVIDED_FACT`

Family/user input.

Useful later to constrain research.

It is evidence of:

```text
what the user reported
```

not automatically independent documentary evidence of the historical fact.

---

# 5. EVIDENCE ITEM SCHEMA

Prompt 11's `EvidenceItem` remains canonical, with several additions.

## MODEL CHANGE PROPOSAL 14-A — Evidence directness and source independence

Add:

```text
directness
independence_group_id
evidence_scope
extraction_confidence
```

### Recommended schema

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `evidence_item_id` | UUIDv7 | yes | Stable ID |
| `evidence_type` | EvidenceType | yes | Type |
| `source_record_id` | UUID/null | conditional | Source lineage |
| `subject_entity_id` | UUID/null | no | Entity directly concerned |
| `evidence_scope` | EvidenceScope | yes | SURNAME / PERSON / FAMILY / PLACE / SOURCE |
| `structured_value` | JSONB | yes | Canonical payload |
| `raw_excerpt` | text/null | no | Exact short source value/text where rights allow |
| `supporting_locator` | text/null | no | Page/field/bbox/row/record |
| `directness` | EvidenceDirectness | yes | DIRECT / DERIVED / INDIRECT / CONTEXTUAL / LEAD_ONLY |
| `verification_status` | EvidenceVerificationStatus | yes | VERIFIED / REVIEWED / MACHINE_EXTRACTED / SUSPECT / REJECTED |
| `source_authority_class` | AuthorityClass/null | no | Snapshot/reference to source authority |
| `independence_group_id` | UUID/null | no | Common upstream origin |
| `extraction_method` | ExtractionMethod | yes | DATASET / PARSER / OCR / LLM / HUMAN / CALCULATION |
| `extraction_version` | text | yes | Reproducibility |
| `extraction_confidence` | enum/null | no | For OCR/parser extraction only, not claim confidence |
| `rights_profile_id` | UUID | yes | Rights in force |
| `created_by_run_id` | UUID | yes | Research run |
| `created_at` | timestamptz | yes | Audit |

## 5.1 `EvidenceDirectness`

```text
DIRECT
DERIVED
INDIRECT
CONTEXTUAL
LEAD_ONLY
```

### DIRECT

Source explicitly states or records the proposition component.

### DERIVED

Deterministic computation from other EvidenceItems.

### INDIRECT

Supports a proposition through reasoning rather than explicit statement.

### CONTEXTUAL

Helps interpret scope/time/place but is not direct support.

### LEAD_ONLY

Useful to search further but cannot satisfy a claim's minimum evidence requirement.

---

# 6. RAW, DERIVED AND INTERPRETIVE EVIDENCE

## 6.1 Direct source evidence

Example:

```text
PESEL row
surname = X
count = 1,234
```

Evidence:

```text
OFFICIAL_DATASET_VALUE
DIRECT
```

## 6.2 Derived evidence

Example:

```text
count = 1,234
compatible denominator = 37,000,000

1-in-X = calculated value
```

Evidence:

```text
DERIVED_STATISTIC
DERIVED
```

Must preserve dependency lineage.

## 6.3 Interpretive evidence

Example:

```text
A surname suffix is consistent with a documented linguistic formation pattern.
```

This can support an interpretation but is not source-native fact.

## 6.4 Rule

Every consumer-facing statistic must be distinguishable as:

```text
SOURCE_NATIVE
or
NAME_ATLAS_DERIVED
```

---

# 7. EVIDENCE DEPENDENCIES

Prompt 11 marked `EvidenceDependency` as potentially P1.

## MODEL CHANGE PROPOSAL 14-B — Promote EvidenceDependency to P0

Reason:

MVP already uses derived values:

- rank;
- 1-in-X;
- rarity percentile;
- concentration metrics.

Without explicit dependencies, those evidence objects are less auditable.

Recommended table:

```text
evidence_dependencies
```

Fields:

```text
derived_evidence_item_id
upstream_evidence_item_id
dependency_role
created_at
```

Example:

```text
E_RARITY
├── depends_on E_COUNT
└── depends_on E_DENOMINATOR
```

---

# 8. SOURCE AUTHORITY MODEL

Do not create a universal source score.

Prompt 12 `AuthorityClass` is retained:

```text
OFFICIAL_PRIMARY
PRIMARY_ARCHIVAL
AUTHORITATIVE_INDEX
SCHOLARLY_SPECIALIST
INSTITUTIONAL_AGGREGATOR
OPEN_GAZETTEER
COMMUNITY_STRUCTURED
COMMUNITY_UNVERIFIED
COMMERCIAL_DATABASE
UNKNOWN
```

Authority must be interpreted relative to `ClaimType`.

## 8.1 PESEL

Strong for:

```text
CURRENT_POPULATION
CURRENT_RANK inputs
```

Irrelevant for:

```text
ETYMOLOGY
HISTORICAL_ORIGIN
```

## 8.2 Polona primary document

Strong for:

```text
the exact string appears in this document
document date
document title
```

Does not automatically prove:

```text
the form is etymologically related to canonical surname
```

## 8.3 Specialist onomastic work

Strong for:

```text
LINGUISTIC_ORIGIN
ROOT_INTERPRETATION
FORMATION_MECHANISM
```

Not necessarily strong for:

```text
CURRENT_POPULATION
```

## 8.4 Wikidata

Good for:

- identifiers;
- labels;
- cross-links;
- leads.

It is not automatically primary historical evidence.

---

# 9. SOURCE INDEPENDENCE

Ten URLs do not necessarily mean ten sources.

Copied data creates false corroboration.

## MODEL CHANGE PROPOSAL 14-C — `EvidenceIndependenceGroup`

Add:

```text
EvidenceIndependenceGroup
```

Fields:

```text
independence_group_id
group_type
upstream_source_record_id
fingerprint
assessment_method
review_status
created_at
```

Possible `group_type`:

```text
SAME_UNDERLYING_RECORD
SYNDICATED_COPY
COMMON_DATASET
COMMON_PUBLICATION
POSSIBLE_COMMON_ORIGIN
INDEPENDENT
UNKNOWN
```

## 9.1 Example

```text
local library object
   ├─ FBC metadata
   └─ Europeana metadata
```

Those are not two independent historical occurrences if both refer to the same original digital object.

## 9.2 Confidence consequence

Corroboration should count evidence streams by independence, not URL count.

---

# 10. PRIMARY / SECONDARY / TERTIARY EVIDENCE

Use as descriptive source characteristics, not universal quality ranking.

```text
PRIMARY
SECONDARY
TERTIARY
```

## 10.1 Important principle

A primary source is strongest for what it directly records.

A specialist secondary source can be much more suitable for a claim such as:

```text
what is the probable linguistic origin of this surname?
```

than one archival document containing the spelling.

Claim suitability therefore depends on:

```text
authority
+
directness
+
scope
+
independence
+
resolution quality
```

not one hierarchy number.

---

# 11. CLAIM DEFINITION

Canonical definition:

> **Claim is a typed, locale-neutral proposition about a canonical subject whose support, contradiction, scope, lifecycle and confidence are explicit.**

Claim is not prose.

Example:

```json
{
  "claim_type": "CURRENT_POPULATION",
  "subject_entity_id": "surname_uuid",
  "epistemic_type": "FACT",
  "scope": "SURNAME_LEVEL",
  "structured_value": {
    "count": 1234,
    "country_code": "PL",
    "snapshot_date": "2026-01-20",
    "dataset_scope": "living persons represented in published PESEL surname resource"
  }
}
```

Consumer prose is a downstream rendering.

---

# 12. CLAIM REPRESENTATION DECISION

Compare three approaches.

## A. Generic RDF-style triple only

```text
subject
predicate
object
```

Advantages:

- flexible;
- graph-friendly.

Problems:

- typed validation becomes weak;
- complex payloads become awkward;
- application developers must reinterpret predicates constantly.

## B. One table per claim type

Advantages:

- strongly typed.

Problems:

- schema explosion;
- difficult versioning;
- high migration overhead.

## C. Typed Claim + validated payload — RECOMMENDED

```text
claim_type
subject
optional object_entity
structured_value JSONB
claim_schema_version
```

Each ClaimType has a versioned JSON Schema/Pydantic model.

This retains strong validation while keeping the model manageable.

---

# 13. CLAIM TAXONOMY V1

Prompt 11 taxonomy is retained and refined.

## 13.1 Current surname claims

```text
CURRENT_POPULATION
CURRENT_RANK
RARITY_CONTEXT
CURRENT_DISTRIBUTION
REGIONAL_CONCENTRATION
```

## 13.2 Onomastic claims

```text
SURNAME_CLASSIFICATION
LEXICAL_ROOT
ROOT_MEANING
FORMATION_MECHANISM
LINGUISTIC_ORIGIN
```

## 13.3 Geographic-origin claims

```text
GEOGRAPHIC_ORIGIN
TOPONYMIC_ASSOCIATION
HISTORICAL_REGION_ASSOCIATION
```

## 13.4 Historical claims

```text
HISTORICAL_FORM_ATTESTED
HISTORICAL_FORM_RELATION
HISTORICAL_OCCURRENCE
EARLIEST_FOUND_OCCURRENCE
HISTORICAL_PLACE_ASSOCIATION
HISTORICAL_DISTRIBUTION
```

## 13.5 Movement/diaspora

```text
DIASPORA_OCCURRENCE
SURNAME_DISTRIBUTION_SHIFT
MIGRATION_PATTERN
```

## 13.6 Archive/discovery

```text
ARCHIVE_REFERENCE_EXISTS
ARCHIVE_COLLECTION_RELEVANT
```

## 13.7 Meta/system claims

Avoid overusing Claims for product metadata.

Recommended:

```text
DATA_LIMITATION
```

may be represented in Coverage/DataGap objects rather than normal evidence Claims unless it is useful to cite/communicate explicitly.

`SOURCE_CONFLICT` should generally be a conflict/group state, not a normal ClaimType.

---

# 14. STRUCTURED CLAIM PAYLOADS

## 14.1 Current population

```json
{
  "count": 1234,
  "distribution_snapshot_id": "...",
  "country_code": "PL",
  "snapshot_date": "2026-01-20",
  "source_population_scope": "published PESEL surname dataset"
}
```

## 14.2 Current rank

```json
{
  "rank": 8021,
  "ranking_universe": "published surname forms",
  "snapshot_id": "...",
  "ties_method": "dense_rank",
  "algorithm_version": "rank@1"
}
```

## 14.3 Rarity context

```json
{
  "metric_type": "ONE_IN_X",
  "value": 29984,
  "denominator_evidence_id": "...",
  "count_evidence_id": "...",
  "algorithm_version": "rarity@1"
}
```

## 14.4 Historical occurrence

```json
{
  "historical_occurrence_id": "...",
  "name_form_raw": "...",
  "resolved_surname_id": "...",
  "source_record_id": "...",
  "place_id": "...",
  "date": {
    "precision": "YEAR",
    "value": 1887
  },
  "occurrence_verification": "SOURCE_ATTESTED"
}
```

## 14.5 Historical form relation

```json
{
  "observed_form": "...",
  "canonical_surname_id": "...",
  "relation_type": "ATTESTED_VARIANT_OF",
  "context": {
    "place_id": "...",
    "time_scope": "..."
  }
}
```

## 14.6 Linguistic origin

```json
{
  "language_code": "pl",
  "origin_kind": "LINGUISTIC",
  "formation_type": null,
  "root": null
}
```

## 14.7 Geographic origin

```json
{
  "candidate_place_ids": ["..."],
  "region_id": "...",
  "origin_kind": "TOPONYMIC",
  "limitations": []
}
```

## 14.8 Migration pattern

```json
{
  "from_place_id": "...",
  "to_place_id": "...",
  "period": {
    "from": 1850,
    "to": 1910
  },
  "basis": "SURNAME_OCCURRENCE_DISTRIBUTION",
  "causal_claim_allowed": false
}
```

---

# 15. EPISTEMIC TYPE

Canonical:

```text
FACT
INTERPRETATION
HYPOTHESIS
UNKNOWN
```

## 15.1 FACT

Directly observed or deterministically derived within exact stated scope.

Examples:

- dataset row count;
- document contains exact surname form;
- archive catalogue gives date range.

## 15.2 INTERPRETATION

Reasoned synthesis based on evidence.

Example:

> surname most likely derives from a documented lexical root.

## 15.3 HYPOTHESIS

Plausible explanation that remains materially unproven.

Example:

> possible toponymic relationship with locality X.

## 15.4 UNKNOWN

Used when responsible conclusion cannot be established.

In many cases a DataGap object is preferable to storing a separate UNKNOWN claim.

---

# 16. CLAIM SCOPE

Retain:

```text
SURNAME_LEVEL
FAMILY_LEVEL
PERSON_LEVEL
```

Add where useful for non-genealogical claims:

```text
PLACE_LEVEL
SOURCE_LEVEL
```

## 16.1 Hard rule

```text
SURNAME_LEVEL evidence
cannot satisfy
FAMILY_LEVEL or PERSON_LEVEL factual claim
```

Example:

```text
historical occurrence of Cichowski in Warsaw
```

cannot support:

```text
the user's Cichowski family lived in Warsaw
```

without family/person linkage.

---

# 17. CLAIM SUBJECT MODEL

For MVP:

```text
subject_entity_id
object_entity_id optional
```

with entity type derivable through canonical entity table/type.

Avoid arbitrary polymorphic JSON references.

For relationship-style claims:

```text
subject = Surname
object = Place
claim_type = TOPONYMIC_ASSOCIATION
```

For value-style claims:

```text
subject = Surname
structured_value = population payload
```

---

# 18. CLAIM EVIDENCE RELATIONSHIPS

Prompt 11 defines:

```text
SUPPORTS
CONTRADICTS
CONTEXT
```

## MODEL CHANGE PROPOSAL 14-D

Expand to:

```text
SUPPORTS
CONTRADICTS
QUALIFIES
CONTEXTUALISES
LEAD_ONLY
```

### SUPPORTS

Evidence materially supports the proposition.

### CONTRADICTS

Evidence materially conflicts with the proposition.

### QUALIFIES

Evidence restricts the scope or wording.

Example:

```text
dataset suppresses one-person surnames
```

qualifies absence interpretation.

### CONTEXTUALISES

Useful contextual evidence without being necessary support.

### LEAD_ONLY

Research clue that cannot satisfy confidence eligibility.

## 18.1 Publishing rule

At least one non-`LEAD_ONLY` support path is required for a publishable substantive Claim.

---

# 19. CLAIM PROVENANCE

Each Claim must be reconstructable.

Retain:

```text
created_by_run_id
method_version
created_at
```

Add/ensure availability through ResearchRun:

```text
resolver_manifest
connector_versions
source_record_versions
extractor_version
prompt_id
prompt_version
model_id/version
confidence_policy_version
rights_profile_versions
```

The system must answer:

> Why does Name Atlas currently believe this?

---

# 20. CLAIM LIFECYCLE

Prompt 11 currently has:

```text
ACTIVE
SUPERSEDED
RETRACTED
REJECTED
```

The Prompt 14 workflow also needs draft/review semantics.

## MODEL CHANGE PROPOSAL 14-E — Separate lifecycle from approval workflow

### `ClaimLifecycleStatus`

```text
CURRENT
SUPERSEDED
RETRACTED
REJECTED
```

### `ClaimApprovalStatus`

```text
DRAFT
EVALUATING
REVIEW_REQUIRED
APPROVED
REJECTED
```

Reason:

```text
APPROVED + POSSIBLE
```

is valid.

Approval means:

> allowed to exist/publish under its uncertainty label.

It does not mean:

> verified fact.

---

# 21. EVIDENCE EXTRACTION

## 21.1 Deterministic extraction

Use for:

- PESEL counts;
- source-native dates;
- structured place IDs;
- archive object IDs;
- region counts.

Pipeline:

```text
SourceRecord field
→ schema parser
→ EvidenceItem
```

## 21.2 Structured parsers

Use for:

- Europeana metadata;
- Wikidata IDs;
- TERYT;
- partner APIs;
- catalogue metadata.

## 21.3 OCR extraction

Use for document text.

Evidence status begins as:

```text
MACHINE_EXTRACTED
```

until validation policy upgrades it.

## 21.4 LLM-assisted extraction

Allowed for complex text where deterministic parsers are insufficient, especially:

- scholarly etymological prose;
- comparison of interpretations;
- historical prose extraction.

Requirements:

- supplied SourceRecord;
- source text or excerpt;
- stable locator;
- structured output;
- extraction prompt/model version.

---

# 22. LLM EVIDENCE EXTRACTION POLICY

LLM may:

- locate a relevant statement;
- classify what the source says;
- structure a root/origin interpretation;
- extract limitations;
- compare source positions.

LLM may not:

- use model memory as source;
- add a source that was not retrieved;
- fill missing date/place;
- upgrade source certainty;
- turn search similarity into evidence;
- infer family lineage.

## 22.1 Hard invariant

```text
LLM-extracted source evidence
requires
SourceRecord + supporting locator
```

If locator cannot be established:

```text
LEAD_ONLY
or
REVIEW_REQUIRED
```

not source-backed publishable fact.

---

# 23. EVIDENCE NORMALISATION

All transformed values preserve:

```text
raw_value
normalized_value
normalization_method
normalization_version
```

Examples:

```text
"1 234"
→ integer 1234
```

```text
historical date text
→ structured date interval
```

```text
place string
→ place candidate/resolved Place ID
```

The source-native value remains accessible.

---

# 24. HISTORICAL OCCURRENCE EVIDENCE

Historical occurrence is a key MVP/P1 evidence object.

Minimum data:

```text
exact source form
source_record_id
locator
date/period
place if available
record/document type
extraction method
OCR/manual status
resolver relation
rights
```

## 24.1 Two separate propositions

### Proposition A

```text
SOURCE CONTAINS FORM "X"
```

This can often be FACT.

### Proposition B

```text
FORM "X" IS HISTORICAL VARIANT OF SURNAME "Y"
```

This requires relationship evidence.

Do not merge these propositions.

---

# 25. HISTORICAL VARIANT CLAIM PIPELINE

```text
SourceRecord
↓
exact observed spelling
↓
resolver candidate relation
↓
EvidenceItem: occurrence
↓
Candidate Claim: HISTORICAL_FORM_RELATION
↓
independent/scholarly/context evidence
↓
ConfidenceAssessment
↓
approved HistoricalVariant projection
```

## Hard rules

```text
FUZZY_CANDIDATE alone
→ cannot create HISTORICAL_FORM_RELATION as FACT
```

```text
OCR correction alone
→ cannot create HISTORICAL_FORM_ATTESTED
```

```text
accepted scholarly variant relation
+ exact source occurrence
→ can materially strengthen the claim
```

---

# 26. ETYMOLOGY CLAIM PIPELINE

Preferred input:

```text
scholarly specialist source(s)
```

Pipeline:

```text
SourceRecord
↓
relevant passage / structured entry
↓
EvidenceItem
↓
root / formation / language proposition
↓
candidate Claim(s)
↓
competing-source grouping
↓
confidence
```

## 26.1 Linguistic pattern evidence

Resolver/morphological rules can generate:

```text
LINGUISTIC_ANALYSIS
INDIRECT
```

They cannot independently produce a factual etymology.

## 26.2 Missing licensed specialist evidence

Correct outcome:

```text
INSUFFICIENT_DATA
```

not model-generated “likely meaning” from spelling alone.

---

# 27. GEOGRAPHIC ORIGIN PIPELINE

This distinction is mandatory:

```text
CURRENT CONCENTRATION
≠
HISTORICAL ORIGIN
```

## 27.1 `CURRENT_DISTRIBUTION`

Can be FACT if a lawful, appropriately dated dataset supports it.

## 27.2 `HISTORICAL_PLACE_ASSOCIATION`

Can be FACT about occurrences:

> surname appears in records around X during period Y.

## 27.3 `GEOGRAPHIC_ORIGIN`

Usually:

```text
INTERPRETATION
or
HYPOTHESIS
```

Evidence can include:

- specialist onomastics;
- historical forms;
- historical occurrences;
- place-name relationship;
- time depth.

Modern concentration is contextual evidence, not proof by itself.

---

# 28. HISTORICAL MAP SEMANTICS

The supplementary Data & Truth research makes a critical distinction that is adopted here.

## 28.1 Population distribution map

Requires:

- representative population dataset;
- known denominator/coverage;
- known time;
- comparable geography.

Claim type:

```text
HISTORICAL_DISTRIBUTION
```

## 28.2 Archive occurrence map

Shows:

```text
records found in searched sources
```

Claim:

```text
HISTORICAL_OCCURRENCE
```

aggregated by place/time.

It must **not** be described as surname population density.

## 28.3 Inferred migration map

Derived from temporal/geographic evidence.

Claim:

```text
MIGRATION_PATTERN
HYPOTHESIS
```

## 28.4 Modern distribution

Current/dated statistical source.

These four map types must never share one generic semantic label.

---

# 29. CURRENT POPULATION CLAIMS

Canonical deterministic path:

```text
PESEL SourceRecord
↓
EvidenceItem:
OFFICIAL_DATASET_VALUE
↓
Claim:
CURRENT_POPULATION
FACT
↓
Confidence:
VERIFIED
```

provided:

- extraction is reproducible;
- exact surname resolution is valid;
- source scope is preserved;
- no material conflict exists.

## 29.1 Wording qualification

Dataset caveats such as:

- living-person scope;
- snapshot date;
- publication thresholds/suppression;

must be represented via `QUALIFIES` evidence or SourceRecord scope metadata.

---

# 30. DERIVED STATISTICS

Derived statistics are FACTs about a deterministic calculation, not source-native facts.

Examples:

- rank;
- 1-in-X;
- percentile.

Required lineage:

```text
DERIVED_STATISTIC EvidenceItem
↓
EvidenceDependency
├── count evidence
├── denominator/universe evidence
└── methodology/version
```

Claim payload contains:

```text
algorithm_version
input evidence IDs
universe
```

---

# 31. EARLIEST OCCURRENCE SEMANTICS

Do not create:

```text
FIRST_EVER_OCCURRENCE
```

for ordinary Name Atlas research.

Use:

```text
EARLIEST_FOUND_OCCURRENCE
```

Meaning:

> earliest eligible occurrence found within the declared research scope.

Required inputs:

```text
occurrence
research_run_id
sources queried
source failures
query expansions used
coverage limitations
```

## MODEL CHANGE PROPOSAL 14-F — Research Coverage Manifest

Add `ResearchCoverageManifest` or equivalent per ResearchRun.

Fields:

```text
source_id
query_profile
query_candidates_used
query_time/place scope
status
records_returned
source_unavailable
rights_blocked
not_supported
completed_at
```

This object is required for defensible negative/earliest-found claims.

---

# 32. NEGATIVE EVIDENCE

Most “nothing found” outcomes are not evidence of absence.

Use:

```text
NO_EVIDENCE_FOUND
```

plus research scope.

Possible causes:

```text
valid zero results
source does not cover place/time
source unavailable
query incomplete
OCR incomplete
rights blocked
source not queried
```

## 32.1 Negative evidence allowed

Only when:

1. source coverage is sufficiently defined;
2. query is appropriate;
3. resolver/query expansion is adequate;
4. source was successfully searched;
5. absence has clear semantic meaning.

Example:

```text
official dataset publishes all values except explicitly documented suppression
```

may support carefully scoped absence/suppression claims.

---

# 33. EVIDENCE OF ABSENCE

Strong evidence of absence is rare.

Eligibility should require:

```text
defined exhaustive universe
+
successful complete query
+
known suppression rules
+
known observation window
+
no source failure
```

If any major criterion fails:

```text
INSUFFICIENT_DATA
```

or:

```text
NO_EVIDENCE_FOUND within scope
```

---

# 34. CONFLICT DETECTION

Conflict is a first-class research outcome.

The engine compares Claims/Evidence concerning the same semantic dimension.

Conflict examples:

- two population counts from different snapshot dates;
- two scholarly etymologies;
- two dates for an occurrence;
- two place resolutions;
- source and transcription disagree.

Not every difference is a true conflict.

Example:

```text
PESEL 2025 count
vs
PESEL 2026 count
```

may be temporal change, not contradiction.

---

# 35. CONFLICT TAXONOMY

```text
VALUE_CONFLICT
SOURCE_SCOPE_CONFLICT
TEMPORAL_CONFLICT
ENTITY_RESOLUTION_CONFLICT
INTERPRETATION_CONFLICT
GEOGRAPHIC_CONFLICT
METHODOLOGY_CONFLICT
TRANSCRIPTION_CONFLICT
RIGHTS_CONFLICT
```

## 35.1 `VALUE_CONFLICT`

Same scoped proposition, incompatible values.

## 35.2 `SOURCE_SCOPE_CONFLICT`

Values look inconsistent but sources measure different universes.

## 35.3 `TEMPORAL_CONFLICT`

Difference explained or potentially explained by date.

## 35.4 `INTERPRETATION_CONFLICT`

Credible scholarly interpretations disagree.

## 35.5 `ENTITY_RESOLUTION_CONFLICT`

Evidence may refer to different surname/person/place entities.

---

# 36. CONFLICT HANDLING POLICY

There is no universal “best source wins” rule.

Claim-type policies decide.

Possible actions:

```text
PREFER_LATEST_SAME_METHODOLOGY
PREFER_DIRECT_RECORD
PREFER_SPECIALIST_FOR_ONOMASTICS
PRESERVE_MULTIPLE
REQUIRE_HUMAN_REVIEW
RESOLVE_AS_SCOPE_DIFFERENCE
```

## 36.1 Population

Prefer most recent authoritative snapshot when user asks for current count, but retain older values historically.

## 36.2 Etymology

Preserve credible competing interpretations.

Do not average them.

## 36.3 Historical record transcription

Original image may outweigh a secondary transcription if readable and properly interpreted.

---

# 37. COMPETING CLAIM GROUPS

## MODEL CHANGE PROPOSAL 14-G — `ClaimGroup`

Add:

```text
ClaimGroup
```

Purpose:

- competing hypotheses;
- conflict sets;
- alternative origin interpretations.

Fields:

```text
claim_group_id
group_type
subject_entity_id
claim_dimension
created_by_run_id
created_at
```

Types:

```text
COMPETING_HYPOTHESES
CONFLICT_SET
ALTERNATIVE_INTERPRETATIONS
```

Members:

```text
claim_group_members
claim_id
role
display_order optional
```

This is superior to embedding alternative claims inside one giant Claim payload.

---

# 38. CONFIDENCE ENGINE

Canonical statuses remain:

```text
VERIFIED
LIKELY
POSSIBLE
UNCONFIRMED
CONFLICTING
INSUFFICIENT_DATA
```

No numeric percentages.

Confidence answers:

> **How strongly is this exact Claim supported within its exact scope?**

It does not answer:

- how reputable the provider is in general;
- how similar two strings are;
- probability of family identity;
- percent chance the story is true.

---

# 39. VERIFIED

Definition:

> Direct authoritative or appropriately primary evidence supports the exact proposition within its stated scope, extraction/resolution is sufficiently reliable, and no material unresolved contradiction exists.

Examples:

### Current count

Direct official dataset row.

### Historical occurrence

Exact readable source or sufficiently verified transcription/index establishing that the spelling occurs in that record.

## 39.1 Interpretations

Most etymological/origin interpretations should not use `VERIFIED` to mean:

> objectively proven origin.

If an authoritative dictionary explicitly states an interpretation, Name Atlas can verify:

```text
the source states interpretation X
```

but the synthesized origin Claim may still be `LIKELY`.

---

# 40. LIKELY

Definition:

> Strong, relevant evidence converges on the proposition, with no unresolved material contradiction, but interpretation or incomplete coverage prevents VERIFIED.

Typical patterns:

- specialist source + independent historical support;
- multiple independent scholarly sources;
- source-attested variant plus contextual linguistic corroboration.

---

# 41. POSSIBLE

Definition:

> Evidence makes the proposition plausible and useful to present as a hypothesis, but meaningful alternatives or missing corroboration remain.

---

# 42. UNCONFIRMED

Definition:

> A specific lead/assertion exists but current evidence is too weak, noisy, unresolved or low-quality to endorse it as a plausible product conclusion.

Examples:

- one uncertain OCR hit;
- community claim with no primary source;
- ambiguous place relation.

Difference from POSSIBLE:

```text
POSSIBLE
= evidence supports plausibility

UNCONFIRMED
= lead exists, but support quality/identity is not yet sufficient
```

---

# 43. CONFLICTING

Definition:

> Two or more credible, materially relevant evidence streams or Claims disagree and the conflict cannot currently be resolved responsibly.

This is not a failure.

It is a high-quality product outcome.

---

# 44. INSUFFICIENT_DATA

Definition:

> No responsible conclusion can be formed from currently approved evidence.

Use this instead of attractive inference.

---

# 45. CONFIDENCE POLICY ARCHITECTURE

Do not build one formula such as:

```text
source tier + source count = status
```

Use claim-type policy.

Inputs can include:

```text
epistemic_type
required evidence types
directness
verification status
resolution status
source suitability
source independence
contradictions
scope match
coverage completeness
human review requirement
```

Output:

```text
ConfidenceAssessment
```

---

# 46. CONFIDENCE REASONING OBJECT

Extend Prompt 11 `ConfidenceAssessment`.

## MODEL CHANGE PROPOSAL 14-H

Add structured reason fields:

```text
reason_codes[]
scope_match
independent_support_group_count
material_contradiction_count
coverage_limitations[]
```

Retain internal `rationale`.

Example:

```json
{
  "status": "LIKELY",
  "reason_codes": [
    "SPECIALIST_SOURCE_DIRECT",
    "INDEPENDENT_HISTORICAL_CORROBORATION",
    "NO_MATERIAL_CONTRADICTION"
  ],
  "independent_support_group_count": 2,
  "material_contradiction_count": 0,
  "scope_match": "EXACT",
  "human_review_required": false
}
```

These fields are diagnostics, not probabilities.

---

# 47. CLAIM-TYPE EVIDENCE POLICY MATRIX

| Claim type | Minimum publishable support | VERIFIED possible? | Typical confidence | Human review |
|---|---|---:|---|---|
| CURRENT_POPULATION | approved official dataset + exact surname resolution | Yes | VERIFIED | No |
| CURRENT_RANK | deterministic derived evidence + snapshot | Yes | VERIFIED | No |
| RARITY_CONTEXT | valid count + compatible denominator + method | Yes | VERIFIED | No |
| CURRENT_DISTRIBUTION | approved dated regional dataset | Yes | VERIFIED | No |
| HISTORICAL_OCCURRENCE | source record + locator + acceptable extraction | Yes | VERIFIED/UNCONFIRMED | OCR ambiguity |
| EARLIEST_FOUND_OCCURRENCE | validated occurrences + ResearchCoverageManifest | Yes as “found” | VERIFIED with scope | Sometimes |
| HISTORICAL_FORM_ATTESTED | exact source form + resolver identity sufficiently established | Yes | VERIFIED/UNCONFIRMED | ambiguous relation |
| HISTORICAL_FORM_RELATION | attestation + linguistic/context evidence | Sometimes | LIKELY/POSSIBLE | Often |
| ROOT_MEANING | specialist evidence | Rarely at synthesis level | LIKELY/POSSIBLE/CONFLICTING | conflicts |
| LINGUISTIC_ORIGIN | specialist evidence | Usually no | LIKELY/POSSIBLE/CONFLICTING | conflicts/high-value |
| GEOGRAPHIC_ORIGIN | specialist + historical/geographic support | Usually no | LIKELY/POSSIBLE/CONFLICTING | sometimes |
| TOPONYMIC_ASSOCIATION | linguistic + place evidence | Rarely | LIKELY/POSSIBLE | often |
| HISTORICAL_PLACE_ASSOCIATION | direct occurrences | Yes for occurrence association | VERIFIED/LIKELY | ambiguous place |
| HISTORICAL_DISTRIBUTION | representative historical dataset | Yes within dataset | VERIFIED | No/rare |
| MIGRATION_PATTERN | temporal-geographic evidence | Rarely | POSSIBLE/LIKELY | sometimes |
| ARCHIVE_REFERENCE_EXISTS | successful source query + SourceRecord | Yes within source | VERIFIED | No |
| FAMILY_RELATIONSHIP | **not surname MVP** | later | later | often |

---

# 48. DUPLICATE EVIDENCE

Evidence deduplication operates before confidence aggregation.

A single source object appearing through:

```text
Polona
Europeana
FBC
```

is one underlying evidence stream when identity is established.

Use:

```text
source-record canonicalization
+
underlying record fingerprint
+
EvidenceIndependenceGroup
```

Do not reward syndication.

---

# 49. EVIDENCE AGGREGATION

Never destroy individual evidence lineage.

Aggregation objects/projections can summarize:

```text
occurrence counts by place
occurrence counts by period
independent source count
evidence-type distribution
```

But each aggregated value links back to individual EvidenceItems.

Example:

```text
17 eligible historical occurrences
```

must be expandable/auditable to 17 canonical occurrences or the aggregation set.

---

# 50. SOURCE QUALITY VS CLAIM CONFIDENCE

Example A:

```text
excellent primary archive
+
uncertain surname resolution
=
low/uncertain claim confidence
```

The archive can be authentic while the relation to the target surname is unresolved.

Example B:

```text
community index
→ points to original primary record
```

The primary record should become a separate SourceRecord/EvidenceItem rather than inheriting the community site's lower authority.

---

# 51. RIGHTS GATE

Truth and rights are different dimensions.

A Claim may be well supported yet not eligible for a specific surface.

Example:

```text
metadata allowed
image reproduction prohibited
```

Result:

- claim can potentially appear;
- citation can appear;
- scan image cannot.

## MODEL CHANGE PROPOSAL 14-I — `SurfaceEligibilityAssessment`

Add a derived/versioned assessment:

```text
claim_id/evidence_item_id
surface
eligibility
reason_codes
rights_profile_id
quality_policy_version
assessed_at
```

Surfaces:

```text
INTERNAL_RESEARCH
FREE_UI
PAID_REPORT
SEO
SHARE
IMAGE_REPRODUCTION
FAMILY_RESEARCH
```

Eligibility:

```text
ALLOWED
ALLOWED_WITH_ATTRIBUTION
BLOCKED_RIGHTS
BLOCKED_QUALITY
BLOCKED_PRIVACY
REVIEW_REQUIRED
```

---

# 52. RIGHTS CHANGES

When RightsProfile changes:

```text
new RightsProfile version
↓
find SourceRecords using old profile
↓
find EvidenceItems
↓
find Claims
↓
recompute SurfaceEligibilityAssessment
↓
invalidate affected projections/reports/pages if needed
```

Historical purchased reports should preserve which rights determination applied at generation time, while ongoing access/publication policy may require remediation depending on legal terms.

---

# 53. CITATION ENGINE

Citation is generated from Source/SourceRecord/Evidence.

Recommended fields remain:

```text
citation_id
source_id
source_record_id
title
publisher
publication_date
url_or_reference
supporting_locator
accessed_at
rights_profile_id
attribution_text
```

Historical records may additionally project:

```text
archive
collection/fonds
series/unit
object ID
page/image/canvas
```

Citation formatting is downstream.

---

# 54. USER-FACING SOURCE CONTRACT

For any meaningful interpretive insight, the presentation layer should be able to request:

```json
{
  "claim_id": "...",
  "confidence": "LIKELY",
  "epistemic_type": "INTERPRETATION",
  "why": {
    "supporting_evidence_count": 3,
    "independent_source_groups": 2,
    "conflicts": 1
  },
  "citations": [],
  "limitations": []
}
```

UI may simplify this.

It must not invent additional evidential certainty.

---

# 55. CLAIM WORDING POLICY

Wording derives from:

```text
ClaimType
+
EpistemicType
+
ConfidenceStatus
+
Scope
+
limitations
```

## FACT + VERIFIED

> According to the [dated dataset], X people are recorded with this surname.

## INTERPRETATION + LIKELY

> The strongest documented interpretation suggests…

## HYPOTHESIS + POSSIBLE

> One possible explanation connects the surname with…

## UNCONFIRMED

> We found a possible lead, but the evidence is not strong enough to treat it as established.

## CONFLICTING

> Sources disagree on this point.

## INSUFFICIENT_DATA

> We do not currently have enough reliable evidence to establish this.

---

# 56. FORBIDDEN SURNAME-LEVEL WORDING

Without family/person evidence, do not generate:

```text
your ancestors came from X
your family migrated from A to B
your ancestor was person Y
your coat of arms is X
your family was noble
everyone with this surname is related
```

Also avoid:

```text
the first person with this surname
```

unless an actually exhaustive proof standard is met, which normal MVP research will not meet.

Use:

```text
earliest occurrence found in the sources searched
```

---

# 57. CLAIM GENERATION ARCHITECTURE

```text
EvidenceItems
↓
Candidate Claim Generator
↓
Claim Schema Validator
↓
ClaimEvidence Linker
↓
Conflict Detector
↓
Confidence Engine
↓
Surface Eligibility
↓
QA Gate
↓
Approved Claim
```

---

# 58. DETERMINISTIC CLAIM GENERATION

P0 should generate these without LLM:

```text
CURRENT_POPULATION
CURRENT_RANK
RARITY_CONTEXT
CURRENT_DISTRIBUTION when source exists
HISTORICAL_OCCURRENCE
ARCHIVE_REFERENCE_EXISTS
source/date/place metadata
```

Benefits:

- reproducible;
- cheap;
- testable;
- low hallucination risk.

---

# 59. LLM-SUPPORTED CLAIM GENERATION

LLM is suitable for:

- extracting structured onomastic interpretations from retrieved scholarly text;
- synthesizing multiple documented origin interpretations;
- describing conflicts;
- summarizing historical patterns;
- producing candidate INTERPRETATION/HYPOTHESIS Claims.

It receives only an approved evidence bundle.

It is not allowed to retrieve from model memory.

---

# 60. LLM STRUCTURED OUTPUT

Example:

```json
{
  "candidate_claims": [
    {
      "claim_type": "LINGUISTIC_ORIGIN",
      "epistemic_type": "INTERPRETATION",
      "scope": "SURNAME_LEVEL",
      "structured_value": {
        "language_code": "..."
      },
      "supporting_evidence_ids": ["..."],
      "contradicting_evidence_ids": [],
      "limitations": []
    }
  ]
}
```

The LLM does **not** emit final ConfidenceStatus.

---

# 61. LLM HALLUCINATION DEFENCE

Hard validator rules:

```text
referenced EvidenceItem does not exist
→ FAIL
```

```text
proper noun/date/place introduced without evidence payload
→ FAIL/REVIEW
```

```text
historical form absent from evidence
→ FAIL
```

```text
claim scope exceeds evidence scope
→ FAIL
```

```text
LLM cites its own memory/source not in bundle
→ FAIL
```

```text
family/person proposition in surname workflow
→ FAIL
```

---

# 62. CLAIM VALIDATOR

Every candidate Claim must pass:

1. ClaimType exists.
2. Payload validates against ClaimType schema/version.
3. Subject exists.
4. Object entity, if present, exists.
5. Scope allowed for ClaimType.
6. EpistemicType allowed.
7. All evidence IDs exist.
8. At least one eligible support item exists unless ClaimType is explicit UNKNOWN/system limitation.
9. SearchCandidate is not used as direct evidence.
10. Rights state known enough for requested processing.
11. Temporal/place fields align.
12. No forbidden surname→family inference.
13. Claim fingerprint generated.
14. Conflict check scheduled/completed.

---

# 63. GENEALOGY LOGIC GUARD

The supplementary Truth Layer's central rule is adopted:

```text
SurnameOccurrence
≠
PersonCandidate
≠
ConfirmedPerson
≠
AncestorRelationship
```

A surname-level occurrence can never directly support `AncestorRelationship`.

Later genealogy should follow the same principle edge by edge:

> the first ambiguous evidence edge is where automatic proof stops and review/insufficient-data begins.

This concept will become a major design principle in future Family Research specifications.

---

# 64. HISTORICAL PLACE GUARD

A place name is not enough.

Evidence-linked place Claims should carry:

```text
resolved_place_id
raw_place_string
time_context
place_resolution_version
```

where relevant.

If two historical places share a name:

```text
REVIEW_REQUIRED
```

or retain candidates.

---

# 65. TEMPORAL GUARD

Every temporally sensitive Claim must declare precision.

Examples:

```text
EXACT_DATE
YEAR
CIRCA_YEAR
RANGE
BEFORE
AFTER
UNKNOWN
```

A 2014 distribution dataset cannot create:

```text
CURRENT_DISTRIBUTION as-of 2026
```

It can create:

```text
HISTORICAL / DATED DISTRIBUTION snapshot 2014
```

---

# 66. SOURCE SCOPE GUARD

SourceRecord must expose scope/limitations relevant to Claim validation.

Example PESEL dimensions:

- living persons represented in source;
- current surname field;
- snapshot date;
- publication/suppression behavior.

Claim wording cannot exceed this scope.

---

# 67. CLAIM VERSIONING / SUPERSESSION

Prompt 11's `supersedes_claim_id` is retained.

A new claim version is created when:

- value changes;
- structured semantics change;
- evidence set materially changes;
- scope changes;
- methodology changes.

Do not silently mutate published semantic history.

## 67.1 Same proposition, new evidence only

If proposition remains identical but supporting evidence expands, two patterns are possible:

### P0 recommended

Keep Claim semantic identity and generate:

- new Claim version if evidence change affects confidence/provenance meaning;
- new ConfidenceAssessment regardless.

### Later optimisation

Separate immutable proposition identity from evidence-set revision.

Do not complicate P0 unless needed.

---

# 68. CLAIM INVALIDATION

Invalidation events:

```text
SOURCE_RECORD_CORRECTED
SOURCE_WITHDRAWN
RIGHTS_CHANGED
RESOLVER_MERGE
RESOLVER_SPLIT
MAPPER_VERSION_MATERIAL_CHANGE
EVIDENCE_REJECTED
NEW_MATERIAL_CONTRADICTION
CLAIM_POLICY_CHANGE
```

Affected Claims become:

```text
EVALUATING / REVIEW_REQUIRED
```

until reprocessed.

Derived:

- SurnameProfile;
- Coverage;
- DiscoveryIndex;
- SEO;
- cached narrative;

must be dirtied.

---

# 69. EVIDENCE GRAPH

Conceptual structure:

```text
Surname
│
├── Claim A: Current Population
│     └── Evidence E1: PESEL row
│
├── Claim B: Linguistic Origin A
│     ├── Evidence E2: specialist source
│     └── Evidence E3: historical form
│
└── Claim C: Linguistic Origin B
      ├── Evidence E4: second specialist source
      └── CONTRADICTS Claim B dimension
```

This structure supports:

- transparency;
- conflicts;
- recalculation;
- report generation;
- future genealogy.

---

# 70. PROVENANCE STANDARD ALIGNMENT

Name Atlas does not need to implement RDF/PROV-O in the MVP database.

However its lineage should be **conceptually compatible** with W3C PROV.

Useful mapping:

```text
SourceRecord / EvidenceItem / Claim
≈ PROV Entity

ResearchRun / extraction / calculation
≈ PROV Activity

human reviewer / connector / model
≈ PROV Agent
```

Relations conceptually align with:

```text
wasDerivedFrom
wasGeneratedBy
wasAssociatedWith
```

The W3C PROV model is useful as an interoperability/reference model, not a reason to introduce an RDF stack.

Official reference:

https://www.w3.org/TR/prov-o/

---

# 71. GENEALOGY EVIDENCE STANDARDS ALIGNMENT

The Board for Certification of Genealogists' Genealogical Proof Standard emphasizes:

1. reasonably exhaustive research;
2. complete and accurate source citations;
3. analysis and correlation;
4. resolution of conflicting evidence;
5. a soundly written conclusion.

Name Atlas surname-level MVP should not claim to implement full professional genealogical proof for surname history.

But the architecture should borrow the useful principles:

```text
traceable citations
multiple-source analysis
conflict preservation
scope-aware conclusions
explicit research limitations
```

Later person/family proof workflows can map more directly to genealogy standards.

Reference:

https://www.bcgcertification.org/ethics-standards

---

# 72. CLAIM CACHE / MATERIALISATION

Canonical Claims are persisted.

Derived product projections are cacheable/materialized:

```text
SurnameProfileProjection
CoverageAssessment
DiscoveryIndex
FreeResultProjection
ReportProjection
```

Claims regenerate/reassess when dirty.

## 72.1 Dirty triggers

```text
new evidence
evidence rejected
source corrected
confidence policy changed
rights changed
surname entity merge/split
```

---

# 73. RESEARCH RUN LINKAGE

Every generated EvidenceItem/Claim links to a `ResearchRun`.

ResearchRun manifest includes:

```text
input
resolved surname ID
resolver manifest
connector versions
source versions
source statuses
query candidates
extractor versions
prompt/model versions
confidence policy
rights versions
QA outcome
```

This is required for auditability.

---

# 74. HUMAN REVIEW WORKFLOW

Canonical review state:

```text
NOT_REQUIRED
OPTIONAL
REQUIRED
IN_REVIEW
APPROVED
REJECTED
```

## 74.1 Review triggers

- conflicting specialist etymologies;
- ambiguous historical form relationship;
- low-quality OCR driving premium value;
- resolver ambiguity;
- unclear rights;
- high-impact claim affecting many downstream reports;
- heraldic/nobility implication;
- later person identity/relationship ambiguity.

## 74.2 Reviewer actions

Reviewer can:

- accept/reject EvidenceItem extraction;
- correct locator;
- relink entity;
- mark independence group;
- link support/contradiction;
- approve/reject Claim;
- choose ConfidenceStatus with reason;
- add limitation;
- trigger new source research.

All actions are immutable audit events.

---

# 75. EVIDENCE QA

Hard gates:

```text
Claim references missing EvidenceItem
→ FAIL
```

```text
EvidenceItem references nonexistent SourceRecord
→ FAIL
```

```text
source-backed EvidenceItem without locator where locator should exist
→ REVIEW/FAIL
```

```text
SearchCandidate treated as evidence
→ FAIL
```

```text
rejected/suspect evidence used as sole FACT support
→ FAIL
```

```text
commercially blocked evidence used on paid surface
→ FAIL
```

```text
source failure represented as no records
→ FAIL
```

---

# 76. CLAIM QA

Validate:

- type;
- schema;
- subject;
- scope;
- epistemic type;
- support;
- contradictions;
- temporal context;
- geographic context;
- rights;
- claim fingerprint;
- wording eligibility.

---

# 77. CONFIDENCE QA

Examples:

```text
INTERPRETATION
+
single weak indirect source
+
VERIFIED
→ FAIL
```

```text
two credible incompatible scholarly interpretations
+
LIKELY without resolved rationale
→ REVIEW; likely CONFLICTING
```

```text
official dataset count
+
exact resolution
+
no contradiction
+
POSSIBLE
→ likely configuration error
```

Confidence QA checks policy consistency, not whether certainty “feels right”.

---

# 78. DISCOVERY INDEX INTEGRATION

Only validated canonical objects/Claims feed DiscoveryIndex.

Examples:

```text
historical_variants_count
```

must exclude:

- SearchCandidates;
- OCR-only generated variants;
- rejected relations;
- duplicates.

`archive_references_count` counts eligible distinct references, not ancestors.

`migration_clues_count` counts eligible surname-level hypotheses, not confirmed family movements.

---

# 79. COVERAGE ENGINE INTEGRATION

Coverage is derived by dimension using:

- approved Claims;
- ConfidenceAssessments;
- rights;
- source states;
- validated object counts.

Example:

```text
etymology evidence exists
commercial rights unknown
```

may produce:

```text
internal availability = PARTIAL/STRONG
free/premium eligibility = BLOCKED_RIGHTS
```

Truth availability and commercial availability remain separate.

---

# 80. EVIDENCE SURFACE ELIGIBILITY

Surface policy example:

| Evidence/Claim state | Internal | Free | Premium | SEO | Share |
|---|---:|---:|---:|---:|---:|
| Open VERIFIED fact | Yes | Yes | Yes | if qualified | Yes |
| Open LIKELY interpretation | Yes | Yes with label | Yes | if qualified | selected |
| POSSIBLE hypothesis | Yes | selected | Yes with label | cautious | usually no |
| CONFLICTING | Yes | Yes if useful | Yes | possible | no |
| Rights unknown | Yes if lawful internal use | Review | **No** | No | No |
| Image restricted, metadata allowed | Metadata yes | Metadata yes | Metadata yes | metadata | no image |
| Rejected | Audit only | No | No | No | No |

---

# 81. CLAIM VISIBILITY

Recommended projection status:

```text
INTERNAL_ONLY
PUBLIC_FREE
PUBLIC_PREMIUM
SEO_ELIGIBLE
FAMILY_ONLY
SUPPRESSED
```

This is not stored as truth/confidence.

It is a policy projection from:

```text
claim quality
+
rights
+
privacy
+
product entitlement
```

---

# 82. DATA GAP MODEL

Canonical reasons:

```text
NO_APPROVED_SOURCE
NOT_RESEARCHED
SOURCE_UNAVAILABLE
SOURCE_NOT_SUPPORTED
RIGHTS_BLOCKED
INSUFFICIENT_EVIDENCE
CONFLICT_UNRESOLVED
RESOLUTION_AMBIGUOUS
SEARCH_SCOPE_LIMITED
```

A missing product chapter consumes DataGap/Coverage.

It should not trigger invented narrative.

---

# 83. SOURCE FAILURE BEHAVIOUR

Example:

```text
Polona timeout
```

produces:

```text
ResearchCoverageManifest:
source = Polona
status = SOURCE_UNAVAILABLE
```

It does **not** produce:

```text
No historical occurrences exist.
```

Similarly:

```text
IJP partnership unavailable
```

produces:

```text
NO_APPROVED_SOURCE / RIGHTS_BLOCKED
```

not an LLM-generated replacement etymology.

---

# 84. RESEARCH COMPLETENESS

For Claims sensitive to search coverage, persist:

```text
research_run_id
sources_considered
sources_successful
sources_unavailable
sources_rights_blocked
query_expansion_tiers
time/place constraints
known coverage limitations
```

Do not call research “complete” merely because the workflow terminated.

---

# 85. CLAIM DEDUPLICATION

Prompt 11 has `claim_key`.

Define it from canonical semantics.

Possible fingerprint input:

```text
claim_schema_version
subject_entity_id
claim_type
scope
canonical structured_value
object_entity_id
time scope
place scope
```

Do **not** include:

- confidence;
- citations;
- generated prose;
- evidence IDs.

Those can change while proposition identity remains the same.

---

# 86. CLAIM FINGERPRINT AND VERSIONING

```text
same proposition
+
new evidence
```

should normally not create duplicate consumer Claims.

It should create:

- new evidence links;
- new ConfidenceAssessment;
- new claim version only if canonical versioning policy requires immutable published snapshots.

For audit, published Report points to exact Claim version/assessment used.

---

# 87. EVIDENCE DEDUPLICATION

Use Prompt 12:

- source canonicalization;
- external IDs;
- hashes;
- aggregator/provider lineage.

Then Evidence Engine uses:

```text
underlying record identity
+
locator
+
structured value
```

to deduplicate evidence units conservatively.

---

# 88. PERFORMANCE / INDEXING

Expected growth:

```text
SourceRecords: very large
EvidenceItems: large
Claims: significantly smaller
```

Recommended PostgreSQL indexes:

```text
evidence_items(source_record_id)
evidence_items(subject_entity_id)
evidence_items(evidence_type)
evidence_items(created_by_run_id)

claim_evidence(claim_id)
claim_evidence(evidence_item_id)
claim_evidence(relationship)

claims(subject_entity_id, claim_type)
claims(claim_key)
claims(claim_status)
claims(created_by_run_id)

confidence_assessments(claim_id, assessed_at DESC)
confidence_assessments(status)

surface_eligibility(claim_id, surface)

research_coverage_manifest(research_run_id, source_id)
```

No graph DB required.

---

# 89. AUDITABILITY REQUIREMENT

For any user-facing statement the system must be able to answer:

```text
What proposition was asserted?
Which Claim version?
Which ConfidenceAssessment?
Which EvidenceItems?
Which SourceRecords?
Which raw/provider source?
Which resolver version?
Which extraction method?
Which source rights applied?
Which sources were unavailable?
Which model/prompt, if any, was used?
Was a human involved?
What later superseded the claim?
```

If a pipeline cannot answer this, it cannot be the canonical truth pipeline.

---

# 90. TEST CORPUS

Create a dedicated Evidence Engine corpus separate from the surname resolver corpus.

Recommended first set:

```text
120 cases
```

Categories:

| Category | Cases |
|---|---:|
| Direct official facts | 10 |
| Derived statistics | 10 |
| Direct historical occurrences | 10 |
| OCR ambiguous occurrences | 10 |
| Historical variant positive | 8 |
| Historical variant false-positive traps | 10 |
| Single specialist interpretation | 8 |
| Corroborated specialist interpretation | 6 |
| Conflicting etymologies | 8 |
| Geography current-vs-historical scope | 8 |
| Duplicate/syndicated sources | 8 |
| Source unavailable / partial | 6 |
| Rights-blocked evidence | 6 |
| Earliest-found semantics | 5 |
| Family/person overreach traps | 4 |
| Heraldry traps | 3 |

Total target approximately 120; exact counts may be adjusted as fixtures are built.

---

# 91. ADVERSARIAL GOLDEN CASES

Examples:

## A — copied sources

Three websites reproduce one dictionary entry.

Expected:

```text
independent evidence groups = 1
```

## B — archive source + fuzzy surname relation

Original document is authentic, but resolver returns only broad fuzzy match.

Expected:

```text
occurrence of raw string may be FACT
relation to target surname remains UNCONFIRMED/POSSIBLE
```

## C — 2014 regional data labelled current

Expected:

```text
temporal guard FAIL
```

## D — source timeout

Expected:

```text
SOURCE_UNAVAILABLE
not NO_RESULT
```

## E — heraldic reference

Source says one historical family bearing surname X used coat of arms Y.

Expected surname-level Claim:

```text
heraldic-source occurrence
```

Forbidden:

```text
user's coat of arms = Y
```

---

# 92. EVALUATION METRICS

## 92.1 Evidence

```text
Evidence extraction precision
Evidence locator precision
Evidence verification error rate
Evidence dedup accuracy
Independence-group accuracy
```

## 92.2 Claims

```text
Unsupported Claim Rate
Claim schema validity
Claim dedup accuracy
Claim supersession accuracy
Scope violation rate
```

## 92.3 Confidence

```text
False VERIFIED Rate
Conflict Detection Recall
Conflict Preservation Rate
Insufficient-Data correctness
```

## 92.4 Rights

```text
Rights Violation Rate
Surface Eligibility Error Rate
```

## 92.5 Genealogy safety

```text
Family Overreach Rate
Person Overreach Rate
Heraldry Overreach Rate
```

Critical launch metrics:

```text
Unsupported Claim Rate
False VERIFIED Rate
Rights Violation Rate
Family/Person Overreach Rate
```

The target for policy-invariant violations should be effectively zero in the golden corpus.

---

# 93. GOLDEN GUARANTEES

## Guarantee 1

```text
SearchCandidate
cannot directly satisfy
Claim support requirement
```

## Guarantee 2

```text
OCR candidate
cannot become
VERIFIED historical form
without independent validation/evidence policy
```

## Guarantee 3

```text
SurnameOccurrence
cannot support
AncestorRelationship
```

## Guarantee 4

```text
Source failure
cannot become
absence Claim
```

## Guarantee 5

```text
Copied URLs
do not equal
independent corroboration
```

## Guarantee 6

```text
commercial_use = UNKNOWN
cannot feed
paid output
```

## Guarantee 7

```text
Claim without traceable Evidence
cannot publish
```

except explicit system/coverage metadata classes.

## Guarantee 8

```text
current concentration
cannot automatically support
historical origin as FACT
```

## Guarantee 9

```text
earliest found
cannot be rendered as
first ever
```

## Guarantee 10

```text
Evidence conflict
cannot be silently discarded
to produce cleaner narrative
```

---

# 94. IMPLEMENTATION ORDER

## Stage 0 — schema alignment

1. adopt `EvidenceDirectness`;
2. promote `EvidenceDependency`;
3. add independence grouping;
4. extend ClaimEvidence relationships;
5. separate Claim approval/lifecycle;
6. add ResearchCoverageManifest;
7. add ClaimGroup;
8. define SurfaceEligibilityAssessment.

## Stage 1 — deterministic truth path

9. EvidenceItem factory;
10. SourceRecord → Evidence mapping;
11. Claim schemas;
12. ClaimEvidence;
13. CURRENT_POPULATION;
14. CURRENT_RANK;
15. RARITY_CONTEXT;
16. deterministic ConfidencePolicy.

## Stage 2 — historical occurrence

17. Polona/source occurrence EvidenceItem;
18. historical occurrence Claim;
19. OCR verification states;
20. Citation generation.

## Stage 3 — conflict/independence

21. evidence dedup;
22. independence groups;
23. conflict detector;
24. competing Claim groups.

## Stage 4 — rights / publication

25. SurfaceEligibilityAssessment;
26. rights invalidation;
27. claim QA gates.

## Stage 5 — historical form relationship

28. resolver candidate → evidence pipeline;
29. HistoricalVariant Claim policy;
30. ambiguity/human review.

## Stage 6 — onomastics

31. specialist source extractor;
32. LLM structured extraction;
33. competing interpretation synthesis;
34. onomastic ConfidencePolicies.

## Stage 7 — product integration

35. Coverage inputs;
36. DiscoveryIndex eligibility;
37. presentation evidence contract.

---

# 95. FIRST PRODUCTION VERTICAL SLICE

Implement two claim paths.

## Slice A — current population

```text
PESEL SourceRecord
↓
EvidenceItem:
OFFICIAL_DATASET_VALUE
DIRECT
VERIFIED extraction
↓
Claim:
CURRENT_POPULATION
FACT
SURNAME_LEVEL
↓
ConfidenceAssessment:
VERIFIED
↓
SurfaceEligibility:
FREE + PREMIUM + SEO
↓
Citation
```

This proves the deterministic truth path.

## Slice B — historical occurrence

```text
Polona SourceRecord
↓
exact source surname form
↓
resolver
↓
EvidenceItem:
PRIMARY/INSTITUTIONAL/OCR occurrence
↓
Claim:
HISTORICAL_OCCURRENCE
FACT
↓
ConfidenceAssessment
↓
Citation
```

This proves historical provenance and ambiguity handling.

Do **not** begin Prompt 14 implementation with complex etymology.

---

# 96. SECOND VERTICAL SLICE

After lawful specialist onomastic access exists:

```text
specialist source
↓
LLM/deterministic extraction
↓
EvidenceItem(s)
↓
LINGUISTIC_ORIGIN / ROOT / FORMATION Claims
↓
competing ClaimGroup
↓
ConfidenceAssessment
↓
consumer synthesis
```

---

# 97. WHAT NOT TO BUILD YET

Do not build:

1. universal Bayesian evidence probability;
2. user-facing probability percentages;
3. autonomous research agent that can assert facts from model memory;
4. graph database migration;
5. person identity confidence engine;
6. automated multi-generation proof;
7. automatic heraldic entitlement;
8. global genealogy proof engine;
9. neural contradiction detection as critical dependency;
10. generic “source trust score”;
11. automatic resolution of all conflicting scholarly interpretations.

---

# 98. LLM ROLE SUMMARY

LLM may:

```text
STRUCTURE retrieved evidence
SUMMARISE evidence
COMPARE evidence
PROPOSE evidence-linked interpretations
EXPLAIN conflicts
```

LLM may not:

```text
CREATE source facts from memory
CREATE historical records
CREATE unsupported dates/places
CREATE historical variants without source evidence
CREATE family relations from surname data
ASSIGN VERIFIED because text sounds convincing
```

The final confidence decision belongs to the policy/review layer.

---

# 99. DECISION REGISTER

## 99.1 Evidence granularity

**Decision:** smallest auditable proposition-supporting unit.  
**Alternative:** store entire SourceRecord as evidence.  
**Why:** enables precise claim lineage.  
**Risk:** more rows.  
**Follow-up:** extraction factories.

## 99.2 Directness

**Decision:** explicit `EvidenceDirectness`.  
**Alternative:** infer from EvidenceType.  
**Why:** same evidence type may play different roles.  
**Risk:** classification complexity.

## 99.3 Source independence

**Decision:** explicit independence grouping.  
**Alternative:** count source URLs.  
**Why:** copied sources create false corroboration.  
**Risk:** some independence remains unknown.

## 99.4 Claim representation

**Decision:** typed Claim + versioned structured payload.  
**Alternative:** generic triples / table-per-claim.  
**Why:** balance validation and extensibility.

## 99.5 ClaimEvidence

**Decision:** SUPPORTS / CONTRADICTS / QUALIFIES / CONTEXTUALISES / LEAD_ONLY.  
**Alternative:** binary support only.  
**Why:** historical reasoning needs qualifiers/context.

## 99.6 Confidence

**Decision:** six qualitative states, claim-type policy.  
**Alternative:** universal numeric score.  
**Why:** evidence is heterogeneous and uncalibrated.

## 99.7 Conflict

**Decision:** preserve competing Claims through ClaimGroup.  
**Alternative:** force one canonical answer.  
**Why:** scholarship can genuinely disagree.

## 99.8 Negative evidence

**Decision:** default to NO_EVIDENCE_FOUND with research scope; true absence requires strict criteria.  
**Alternative:** “not found = absent”.  
**Why:** archive/search coverage is incomplete.

## 99.9 Earliest occurrence

**Decision:** `EARLIEST_FOUND_OCCURRENCE`, never generic first-ever.  
**Alternative:** “first occurrence”.  
**Why:** search coverage is bounded.

## 99.10 Rights

**Decision:** truth assessment and surface eligibility separate.  
**Alternative:** block ingestion entirely when display rights differ.  
**Why:** metadata/claim/image permissions can differ.

## 99.11 LLM

**Decision:** evidence structuring/synthesis only; final confidence outside LLM.  
**Alternative:** prompt directly for answer/confidence.  
**Why:** auditability and hallucination defence.

## 99.12 Storage

**Decision:** PostgreSQL relational evidence graph.  
**Alternative:** Neo4j/RDF store.  
**Why:** relational P0 is enough and aligns with Prompt 11.

---

# 100. MODEL CHANGE PROPOSALS SUMMARY

## 14-A — EvidenceDirectness + independence fields

**Recommendation:** P0.

## 14-B — EvidenceDependency promoted to P0

**Recommendation:** P0 because derived rarity/rank need lineage.

## 14-C — EvidenceIndependenceGroup

**Recommendation:** P0/P1 boundary; schema P0, sophisticated inference P1.

## 14-D — ClaimEvidence relation expansion

Add:

```text
QUALIFIES
CONTEXTUALISES
LEAD_ONLY
```

**Recommendation:** P0.

## 14-E — Claim lifecycle vs approval split

**Recommendation:** P0.

## 14-F — ResearchCoverageManifest

**Recommendation:** P0 because negative/earliest-found semantics depend on it.

## 14-G — ClaimGroup for competing hypotheses

**Recommendation:** P1 before onomastic premium.

## 14-H — structured ConfidenceAssessment reason fields

**Recommendation:** P0.

## 14-I — SurfaceEligibilityAssessment

**Recommendation:** P0 before premium/SEO.

---

# 101. OUTPUT CONTRACT TO PROMPT 15

Prompt 15 — Runtime Orchestration — can consume:

```text
Approved Claims
EvidenceItems
EvidenceDependencies
ClaimEvidence
ConfidenceAssessments
ClaimGroups
Conflicts
Limitations/DataGaps
Citations
SurfaceEligibilityAssessments
ResearchCoverageManifest
HumanReview state
ResearchRun provenance
```

It must decide:

- which modules execute;
- in what order;
- which can run in parallel;
- source timeout/retry;
- cache strategy;
- partial results;
- LLM routing;
- recomputation;
- CoverageAssessment;
- DiscoveryIndex;
- free-result generation;
- premium-report generation.

---

# 102. FINAL ARCHITECTURE

```text
                      APPROVED SOURCE DATA
                              │
                              ▼
                         SourceRecord
                              │
                              ▼
                       SURNAME RESOLUTION
                              │
                              ▼
                       EVIDENCE EXTRACTOR
                              │
                              ▼
                         EvidenceItem
                              │
              ┌───────────────┼─────────────────┐
              ▼               ▼                 ▼
           SUPPORTS       CONTRADICTS        QUALIFIES
              │               │                 │
              └───────────────┼─────────────────┘
                              ▼
                       CLAIM CANDIDATE
                              │
                              ▼
                     CLAIM SCHEMA VALIDATOR
                              │
                              ▼
                   INDEPENDENCE / DEDUP CHECK
                              │
                              ▼
                       CONFLICT DETECTOR
                              │
                              ▼
                       CONFIDENCE ENGINE
                              │
                              ▼
                     SURFACE ELIGIBILITY
                              │
                              ▼
                          QA GATE
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             APPROVED CLAIM         REVIEW/REJECT
                    │
          ┌─────────┼────────────┐
          ▼         ▼            ▼
       COVERAGE  DISCOVERY     CITATIONS
          │         │
          └────┬────┘
               ▼
       UX / REPORT / SEO
```

---

# 103. P0 EVIDENCE ENGINE

Build now:

1. EvidenceItem factory.
2. EvidenceDirectness.
3. EvidenceDependency.
4. Claim typed schemas.
5. ClaimEvidence relationships.
6. Deterministic current-population Claims.
7. Deterministic derived rank/rarity Claims.
8. Historical occurrence Claims.
9. six-state ConfidenceAssessment.
10. structured confidence reason codes.
11. ResearchCoverageManifest.
12. source failure vs no-result semantics.
13. Citation generation.
14. claim/evidence dedup foundations.
15. rights surface gating.
16. scope/temporal/place guards.
17. unsupported-claim QA.
18. family/person-overreach QA.
19. versioning/invalidation hooks.
20. initial ~120-case evidence corpus.

---

# 104. P1 EVIDENCE ENGINE

Add:

1. stronger source-independence inference;
2. historical variant relation policy;
3. ClaimGroup competing hypotheses;
4. specialist onomastic extraction;
5. LLM evidence structuring;
6. conflict synthesis;
7. geographic-origin policy;
8. migration-pattern policy;
9. richer human review tools;
10. provider-specific historical evidence policies.

---

# 105. BIGGEST TRUST RISKS

1. Search similarity accidentally promoted to evidence.
2. OCR mistaken for exact historical spelling.
3. Copied sources treated as independent.
4. Current geography used as historical origin proof.
5. Historical occurrence presented as family history.
6. Source failure presented as absence.
7. Old geographic snapshot presented as current.
8. Rights-blocked material used commercially.
9. Conflict hidden to simplify narrative.
10. Derived statistic presented as provider-native.
11. “earliest found” presented as “first ever”.
12. LLM synthesis introducing unsupported details.

---

# 106. BIGGEST HALLUCINATION RISKS

1. Etymology generated from spelling resemblance.
2. Invented connecting narrative between two historical occurrences.
3. Invented place of origin.
4. Invented migration route.
5. Historical variant created from fuzzy candidate.
6. Exact date generated from approximate period.
7. Family connection inferred from surname + region.
8. Heraldic lineage inferred from surname reference.
9. Missing source citation replaced by model memory.
10. Source conflict “resolved” by rhetorical confidence.

---

# 107. BIGGEST EVIDENCE QUALITY RISKS

1. OCR errors.
2. Archive index errors.
3. Ambiguous surname resolution.
4. Place identity ambiguity.
5. Source copied from another source.
6. Unknown source methodology.
7. Incomplete source coverage.
8. Time-scope mismatch.
9. Geographic-scope mismatch.
10. Rights uncertainty.
11. Low-quality community genealogy.
12. Historical spelling instability.

---

# 108. DEFINITION OF EVIDENCE ENGINE READY

The MVP Evidence Engine is ready when:

- every publishable substantive Claim has traceable EvidenceItems;
- every source-backed EvidenceItem links to a SourceRecord;
- every SourceRecord links to Source and RightsProfile;
- SearchCandidates cannot satisfy factual support requirements;
- derived statistics preserve input evidence and method;
- current-population Claims are deterministic and reproducible;
- historical occurrences preserve exact source form and locator;
- source failure cannot be rendered as absence;
- source duplicates cannot inflate corroboration;
- ConfidenceAssessment uses the six canonical states;
- conflicting credible evidence is retained;
- paid/SEO surfaces enforce rights eligibility;
- Claim versions are auditable;
- surname-level evidence cannot generate family/person facts;
- earliest-found Claims carry research scope;
- unsupported Claims fail QA before publication;
- ResearchRun can reconstruct which source/resolver/extractor/prompt/policy versions produced the result.

---

# 109. INPUTS REQUIRED BY PROMPT 15

Prompt 15 should assume the following stable contracts exist:

## Identity

```text
Surname
NameForm
SurnameResolution
SearchCandidate audit
```

## Source

```text
Source
SourceRecord
RightsProfile
connector/source state
```

## Truth layer

```text
EvidenceItem
EvidenceDependency
Claim
ClaimEvidence
ConfidenceAssessment
Citation
ClaimGroup
ResearchCoverageManifest
SurfaceEligibilityAssessment
```

## Product inputs

```text
DataGap
Coverage dimension inputs
validated historical objects
```

Prompt 15 must now turn these components into an executable workflow:

```text
user input
→ resolver
→ cached/pre-ingested sources
→ live/deep source work where necessary
→ EvidenceItems
→ Claims
→ Confidence
→ Rights/QA
→ CoverageAssessment
→ DiscoveryIndex
→ free result
→ premium eligibility
→ report generation
```

with explicit:

- sync vs async;
- parallelization;
- timeout;
- retry;
- cache;
- invalidation;
- partial result;
- human review;
- LLM routing;
- cost control.

---

# 110. VERIFIED METHODOLOGICAL REFERENCES

## W3C PROV

The W3C PROV family provides a stable provenance model based around entities, activities and agents and relations such as derivation and generation.

Name Atlas should remain PostgreSQL-first, but its lineage model should remain conceptually compatible.

Official reference:

https://www.w3.org/TR/prov-o/

## Genealogical Proof Standard

The Board for Certification of Genealogists describes the Genealogical Proof Standard as requiring:

- reasonably exhaustive research;
- complete and accurate citations;
- analysis/correlation;
- conflict resolution;
- a soundly written conclusion.

Name Atlas does not claim full GPS proof for surname-level automated output. The architecture uses the same direction of travel: citations, analysis, conflict handling and explicit research limitations.

Official reference:

https://www.bcgcertification.org/ethics-standards

---

# 111. FINAL RECOMMENDATION

The Evidence & Claim Engine should become the most protected architectural boundary in Name Atlas.

The core invariant is:

> **A fact is not true in Name Atlas because an LLM wrote it, a page mentioned it, or several websites repeated it. A user-facing proposition exists because a typed Claim is connected to traceable EvidenceItems, those EvidenceItems resolve to identifiable SourceRecords, source scope and rights allow the use, conflicts are preserved, and a versioned ConfidenceAssessment determines how the proposition may be described.**

This is the layer that makes:

```text
surname website
```

become:

```text
evidence-backed research product
```

without requiring the consumer to understand the complexity underneath.
