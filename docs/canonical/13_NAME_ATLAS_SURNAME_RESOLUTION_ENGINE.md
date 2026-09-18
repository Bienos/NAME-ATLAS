# NAME ATLAS — SURNAME RESOLUTION ENGINE

**Document:** 13. Surname Resolution Engine  
**Version:** 1.0.0 — Resolution Baseline  
**Date:** 2026-09-17  
**Market:** Poland first, global-ready  
**Status:** Candidate implementation specification  
**Depends on:** `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md`, `11_NAME_ATLAS_CANONICAL_DATA_MODEL.md`, `12_NAME_ATLAS_SOURCE_CONNECTOR_ARCHITECTURE.md`  
**Next:** `14_NAME_ATLAS_EVIDENCE_AND_CLAIM_ENGINE.md`

---

# 0. PURPOSE, AUTHORITY AND NON-GOALS

This document specifies how Name Atlas converts a user-entered or source-derived surname string into:

- a canonical `Surname` entity when identity is sufficiently established;
- a known `NameForm` when a form is already attached to a canonical surname;
- a bounded set of search candidates when identity is uncertain;
- an explicit unresolved/ambiguous state when the available information does not justify a decision.

It is downstream from the canonical model and source connector specifications.

The resolver is deliberately conservative because a false surname merge propagates into:

- population data;
- rarity;
- maps;
- etymology;
- historical variants;
- archive search;
- premium inventory;
- family research.

A false positive at this layer can contaminate the entire Name Atlas evidence graph.

The resolver therefore optimizes for:

> **precision of identity first, then staged retrieval recall.**

It does **not** decide that a generated or similar form is historically true.

The hard epistemic boundary remains:

```text
ORIGINAL FORM
≠
SOURCE-ATTESTED FORM
≠
NORMALISED / DERIVED FORM
≠
SEARCH CANDIDATE
```

and:

```text
SEARCH SIMILARITY
≠
SURNAME IDENTITY
≠
HISTORICAL VARIANT
```

---

# 1. EXECUTIVE RESOLUTION ARCHITECTURE

## 1.1 Core concepts

### `Surname`

A canonical knowledge entity representing the surname unit used by Name Atlas to connect population, onomastic and historical research.

A `Surname` is **not** an etymological conclusion. One canonical spelling may still have multiple competing origin hypotheses.

### `NameForm`

A persistent, typed form associated with a surname or retained as an evidence-governed form.

Examples:

- canonical modern display;
- accepted modern variant;
- gender form;
- source-attested historical form;
- accepted transliteration;
- evidenced migration adaptation.

### `SearchCandidate`

A resolver/runtime object generated only to improve retrieval or ask the user for clarification.

It is not historical evidence.

It is not automatically persisted as a `NameForm`.

### `SurnameResolution`

The reproducible resolver output for one input/context.

It contains:

- preserved input;
- normalization products;
- exact/known matches;
- candidate ranking;
- final outcome;
- whether user confirmation or human review is required;
- resolver versions.

### `HistoricalVariant`

An evidence-governed historical assertion, downstream of the resolver.

The resolver may propose:

```text
possible relation:
"Cichowsky" → "Cichowski"
```

but only the Evidence Engine may establish:

```text
HistoricalVariant
```

after examining source/date/place/provenance.

## 1.2 Main pipeline

```text
RAW USER / SOURCE FORM
          │
          ▼
INPUT VALIDATION
          │
          ▼
UNICODE + SECURITY LAYER
          │
          ▼
EXACT CANONICAL LOOKUP
          │
          ▼
EXACT ACCEPTED NAME FORMS
          │
          ▼
LANGUAGE / SCRIPT PACK
          │
          ▼
SAFE DETERMINISTIC DERIVATIONS
          │
          ▼
SEARCH CANDIDATE GENERATION
          │
          ├── diacritic fold
          ├── gender-form candidate
          ├── transliteration
          ├── orthographic pack
          ├── fuzzy retrieval
          ├── phonetic retrieval
          └── OCR expansion
          │
          ▼
CANDIDATE TIERING
          │
          ▼
WITHIN-TIER RANKING
          │
          ▼
CONTEXTUAL FILTER / RERANK
          │
          ▼
RESOLUTION POLICY
          │
     ┌────┼──────────────┐
     ▼    ▼              ▼
 AUTO   SUGGEST       UNRESOLVED
     │    │              │
     └────┼──────────────┘
          ▼
SurnameResolution
          │
          ▼
QUERY EXPANSION
          │
          ▼
EVIDENCE ENGINE
```

## 1.3 Core design decision

Name Atlas does **not** use one universal numeric similarity score.

Instead it uses a **lexicographic tier model**:

```text
T0 EXACT CANONICAL
T1 ACCEPTED NAME FORM
T2 SAFE DETERMINISTIC RELATION
T3 CONTEXTUAL / TRANSLITERATION CANDIDATE
T4 FUZZY TYPO CANDIDATE
T5 PHONETIC / OCR BROAD-RECALL CANDIDATE
```

A candidate in T4 or T5 cannot outrank a valid T0/T1 match because of a high floating-point similarity score.

Within a tier, candidates may be ranked by interpretable features.

This prevents a common entity-resolution failure:

> a fuzzy algorithm numerically “likes” the wrong string more than the system trusts an evidence-backed known form.

---

# 2. RESOLUTION ENGINE BOUNDARY

The architecture contains three separate responsibilities.

## 2.1 Connector Layer

Prompt 12 produces:

- source record;
- raw surname strings;
- provider-normalised fields;
- script/language hints;
- dates;
- places;
- source authority;
- provenance;
- rights.

Example:

```text
Polona OCR/source record:
"Cichowsky"
```

The connector must not decide that this is a historical variant of `Cichowski`.

## 2.2 Resolution Engine

The resolver asks:

> Which canonical surname entity or surname candidates should this string be searched against?

Possible resolver output:

```text
input = Cichowsky

candidate A:
Cichowski
relation = ORTHOGRAPHIC_CANDIDATE
decision = SEARCH_ONLY

candidate B:
...
```

## 2.3 Evidence Engine

Prompt 14 asks:

> Is the proposed relation supported by evidence strongly enough to create a historical assertion?

It evaluates:

- exact source form;
- date;
- place;
- source authority;
- independent attestations;
- linguistic support;
- contradictions.

Only that layer may create a user-facing `HistoricalVariant`.

## 2.4 Example

```text
SOURCE RECORD
"Cichowsky", document dated 1892

        ↓

RESOLUTION ENGINE
possible relation to Cichowski
method = de_pl_orthographic_candidate
search_only = true

        ↓

EVIDENCE ENGINE
checks source/date/place/other attestations

        ↓

either:
HistoricalVariant / possible variant Claim

or:
reject relation / keep occurrence separate
```

---

# 3. INPUT MODEL

Recommended runtime input:

```json
{
  "raw_input": "Cichowski",
  "input_origin": "USER",
  "locale": "pl-PL",
  "country_context": "PL",
  "user_language": "pl",
  "optional_place_context": null,
  "optional_time_context": null,
  "source_record_id": null,
  "search_profile": "INTERACTIVE_SURNAME"
}
```

## 3.1 `input_origin`

```text
USER
OFFICIAL_DATASET
ARCHIVE_METADATA
OCR
SCHOLARLY_SOURCE
PARTNER_SOURCE
INTERNAL_REVIEW
```

Input origin affects allowed derivations and auto-resolution policy.

## 3.2 `search_profile`

```text
INTERACTIVE_SURNAME
CURRENT_DATA_LOOKUP
HISTORICAL_ARCHIVE
OCR_ARCHIVE
ONOMASTIC_RESEARCH
FAMILY_RESEARCH_LATER
```

The same string should not generate the same breadth of candidates in every context.

Example:

```text
interactive user typo search
```

should be narrow.

```text
OCR archive retrieval
```

can be much broader but every additional form remains search-only.

---

# 4. INPUT VALIDATION

Validation determines whether a query can enter the resolver and what operations are safe.

## 4.1 Recommended validation outcomes

```text
VALID
EMPTY
EXCEEDS_OPERATIONAL_LIMIT
MALFORMED_CONTROL_CHARACTERS
POSSIBLE_MULTIPLE_QUERY_VALUES
POSSIBLE_FULL_PERSON_NAME
UNSUPPORTED_SCRIPT_FOR_ENRICHMENT
MIXED_SCRIPT_REVIEW
REVIEW_REQUIRED
```

Do **not** reject a surname merely because it is short, unusual or absent from current datasets.

## 4.2 Short surnames

`TOO_SHORT` should not mean invalid.

A one-, two- or three-character surname may be legitimate.

Instead:

```text
length < configured threshold
→ exact/known-form search allowed
→ broad fuzzy search restricted
```

Use capability state:

```text
FUZZY_DISABLED_SHORT_INPUT
```

rather than rejecting the query.

## 4.3 Spaces

Spaces do not automatically mean multiple names.

Valid surnames can contain:

- particles;
- multiple lexical components;
- compounds without hyphens.

Therefore:

```text
"van der X"
```

must remain a surname-capable input.

## 4.4 Operational abuse limit

Set a generous technical maximum, for example 256 Unicode code points, solely to prevent pathological payloads.

This is not a linguistic claim that longer surnames are impossible.

Make the limit configuration, not domain truth.

## 4.5 Controls and invisible characters

Preserve `raw_input`, but detect:

- bidi controls;
- zero-width characters;
- non-printing control characters;
- suspicious mixed-script confusables.

Do not silently use them as identity characters in the primary key.

---

# 5. UNICODE NORMALISATION

## 5.1 Verified standard basis

As of 2026-09-17, Unicode 18.0 defines NFC, NFD, NFKC and NFKD in Unicode Standard Annex #15.

Name Atlas should use Unicode normalization as infrastructure, not as linguistic inference.

## 5.2 Canonical decision

### Raw input

Preserve byte/logical input exactly where allowed:

```text
raw_input
```

### Display form

Entity display values are source/curation controlled.

Persist display in **NFC**.

```text
display_form = NFC(source-approved form)
```

Do not use NFKC as the stored display representation.

### Canonical identity key

Recommended `canonical_key_v1`:

```text
NFC
↓
full Unicode default case folding
↓
canonical separator mapping
↓
trim
↓
collapse repeated ordinary spaces
↓
preserve diacritics
↓
preserve particles
↓
preserve token order
```

Example conceptually:

```text
"ŁUCZAK"
→
"łuczak"
```

not:

```text
"luczak"
```

### Compatibility search key

Generate separately:

```text
compat_search_key
```

using NFKC/case-fold style compatibility handling if useful.

This is a retrieval key only.

It is not canonical identity.

## 5.3 Why NFC for canonical identity

NFC:

- collapses canonically equivalent Unicode sequences;
- preserves compatibility distinctions;
- provides a stable representation suitable for stored natural-language forms.

NFKC deliberately performs compatibility decomposition/composition.

That can be valuable for search but is too aggressive to define surname identity globally.

## 5.4 Punctuation canonicalisation

For identity lookup, map a controlled set of typographic equivalents:

### Dash-like separators

Examples of presentation hyphen/dash code points may map to canonical `-` in search/key representation.

### Apostrophe-like separators

Common apostrophe/right-single-quote variants may map to one search separator.

Preserve original display.

Do not remove punctuation entirely.

```text
O'X
```

must not become the canonical display:

```text
OX
```

## 5.5 Case handling

Use Unicode **full case folding** for caseless keys, not locale-specific lowercasing as the only mechanism.

Why:

- lowercasing is presentation/language behavior;
- case folding is designed for caseless comparison.

Language packs may add secondary locale-aware search keys later where required.

## 5.6 Mixed scripts and confusables

Unicode UTS #39 defines mixed-script and confusable detection.

Use that for:

- input security;
- review;
- candidate explanation.

Do not use confusable skeleton equality as surname identity evidence.

Example:

```text
Latin a
vs
Cyrillic а
```

can look identical.

A mixed Latin/Cyrillic string should normally:

```text
flag MIXED_SCRIPT_REVIEW
```

rather than silently normalize one script into the other.

## 5.7 Versioning

Persist:

```text
unicode_standard_version
unicode_normalization_version
casefold_version
security_profile_version
```

or a resolver build that deterministically implies them.

Prefer one shared resolver library/runtime rather than different services using different language-runtime Unicode tables.

---

# 6. POLISH DIACRITICS

## 6.1 Search fold

Poland MVP should implement an explicit versioned Polish fold table for secondary retrieval:

```text
ą → a
ć → c
ę → e
ł → l
ń → n
ó → o
ś → s
ź → z
ż → z
```

Uppercase equivalents apply after case folding.

## 6.2 Why explicit mapping

Not all Polish letters behave as decomposable base-letter + combining-mark sequences.

In particular, a generic “NFD then delete combining marks” implementation is not a complete Polish folding strategy.

The resolver should own a deterministic table.

## 6.3 PostgreSQL `unaccent`

PostgreSQL provides a configurable `unaccent` dictionary/rules system.

Name Atlas may use it for database retrieval support, but it should **not** be the sole definition of canonical surname normalization.

Reason:

- resolver behavior must be versioned across environments;
- rules may differ by deployment;
- canonical identity should remain an application/domain contract.

## 6.4 Policy

```text
Łuczak
```

and:

```text
Luczak
```

share a diacritic-fold search key.

They do not automatically become the same historical form.

### If `Luczak` is an accepted NameForm linked to `Łuczak`

Auto-resolution may be allowed according to its relation policy.

### If only the diacritic-fold key matches

Return:

```text
SUGGEST_ONLY
```

unless a stronger rule/source exists.

---

# 7. POLISH GENDERED SURNAME FORMS

## MODEL CHANGE PROPOSAL 13-A

Document 11 should be extended with:

### `NameFormType`

Add:

```text
GENDER_FORM
```

### `NameFormRelationType`

Add:

```text
GENDER_FORM_OF
```

### Why

Modern Polish grammatical gender pairing is neither:

- a historical variant;
- a transliteration;
- a migration adaptation;
- generic orthographic similarity.

It deserves an explicit relation.

## 7.1 Canonical modelling

For confidently paired adjectival surname forms:

```text
Surname
  ├─ Kowalski
  └─ Kowalska
```

should normally be one canonical `Surname` entity with multiple `NameForm`s.

However the relation must be linguistically safe.

## 7.2 P0 Polish patterns

The PL pack may generate candidates for tightly controlled families such as:

```text
-ski ↔ -ska
-cki ↔ -cka
-dzki ↔ -dzka
```

but these are **candidate-generation rules**, not global transformations.

## 7.3 Auto-resolution requirements

A gender-form input may auto-resolve only when:

1. an accepted `GENDER_FORM_OF` relation already exists; or
2. both forms are independently present in trusted modern data and the PL morphological rule maps them uniquely; or
3. a curated/scholarly source establishes the pairing.

If only the suffix rule generated the counterpart:

```text
SUGGEST_ONLY
```

## 7.4 Invariant surnames

Do not attempt gender transformation for surnames that do not belong to an approved inflection class.

Foreign surnames in Poland may be invariant.

## 7.5 Family plural forms

Forms such as:

```text
Kowalscy
```

are grammatical collective/plural forms.

For MVP:

- generate them only where needed for search;
- classify as `GRAMMATICAL_SEARCH_FORM`;
- do not persist them as canonical modern NameForms unless a product need/source requires it.

---

# 8. DOUBLE / HYPHENATED SURNAMES

## 8.1 Canonical entity

A compound surname should have its own canonical `Surname`.

Example:

```text
Kowalska-Nowak
```

is not automatically the same entity as:

```text
Kowalska
```

or:

```text
Nowak
```

## 8.2 Search behavior

For an exact compound input:

1. search exact compound;
2. search accepted typographic hyphen variants;
3. optionally expose component surnames as secondary suggestions;
4. never auto-substitute a component for the compound.

## 8.3 Component parsing

The resolver may return:

```json
{
  "compound_detected": true,
  "components": ["Kowalska", "Nowak"]
}
```

for search planning.

This does not prove genealogical or historical continuity of either component.

## MODEL CHANGE PROPOSAL 13-B — P1

If compound analytics/search becomes material, add:

```text
SurnameComponentRelation
compound_surname_id
component_surname_id
position
relation_status
source/evidence
```

Do not block P0 on this table.

---

# 9. PREFIXES AND PARTICLES

Global surname systems contain particles such as:

```text
von
van
van der
de
del
di
O'
Mac
al-
```

## 9.1 Canonical rule

Preserve particles in:

- raw form;
- display form;
- canonical key.

Do not globally strip them.

## 9.2 Search expansion

A language pack may generate:

```text
WITH_PARTICLE
WITHOUT_PARTICLE
ATTACHED_PARTICLE
SEPARATED_PARTICLE
```

as search candidates.

These candidates must record:

```text
method = PARTICLE_VARIANT
language_pack
search_only = true
```

unless an accepted NameForm relation exists.

## 9.3 Token order

Never reorder particles/tokens generically.

---

# 10. SCRIPT DETECTION

## 10.1 MVP support

P0:

```text
Latn
```

P1:

```text
Cyrl
```

Architecture-ready:

```text
Hebr
Grek
others
```

## 10.2 Detection fields

```text
detected_scripts[]
primary_script
mixed_script
script_confusable_flag
```

Use Unicode Script / Script_Extensions data through a pinned Unicode/ICU implementation.

## 10.3 Common/Inherited characters

Punctuation and combining marks with Common/Inherited script should not by themselves cause a mixed-script classification.

## 10.4 Mixed-script policy

```text
Latin + punctuation
→ normal

Latin + Cyrillic lookalike characters
→ review/security flag
```

Do not reject automatically; historical/OCR text can genuinely contain mixed scripts.

---

# 11. TRANSLITERATION

## 11.1 Principle

Transliteration is a **search relationship** until evidence supports a stronger relation.

```text
ORIGINAL SCRIPT
↓
one or more transliteration candidates
```

## 11.2 ICU

ICU provides script transforms including Cyrillic ↔ Latin and supports language-specific transforms/fallback where available.

Recommended implementation:

- use ICU or a pinned ICU-backed library;
- persist transform ID/version;
- prefer language-specific transform when source language is known;
- use generic `Cyrillic-Latin` only as broader retrieval fallback.

## 11.3 Candidate record

```json
{
  "method": "TRANSLITERATION",
  "source_script": "Cyrl",
  "target_script": "Latn",
  "transform_id": "ru-Latn",
  "transform_version": "...",
  "search_only": true
}
```

## 11.4 Multiple transliterations

One Cyrillic surname may legitimately yield multiple Latin candidates because:

- national standards differ;
- historical administrative systems differ;
- immigration clerks used ad hoc spellings;
- family adaptations differ.

Therefore:

```text
transliteration ≠ one deterministic historical spelling
```

## 11.5 ISO/official standards

A standards-based transliteration may be stored as a deterministic technical candidate, but standard transliteration does not prove it is the spelling historically used by a family or document.

---

# 12. GERMAN / POLISH ORTHOGRAPHIC CONTEXT

Polish history requires context-aware candidate generation across Polish/German administrative records.

Possible transformation motifs include:

```text
w ↔ v
cz ↔ tsch
sz ↔ sch
j ↔ i
selected c / z / tz contexts
```

These are **not** global substitution rules.

## 12.1 Pack architecture

```text
DE_PL_HISTORICAL_PACK
```

contains:

- bounded rewrite patterns;
- position constraints;
- date/place applicability;
- source-type applicability;
- cost/penalty;
- version.

Example:

```json
{
  "rule_id": "depl-cz-tsch-001",
  "pattern": "...",
  "context": {
    "place_regime": ["Prussian"],
    "period": "configured"
  },
  "output_type": "SEARCH_CANDIDATE"
}
```

The example demonstrates the structure, not a claim about a particular surname.

## 12.2 No chaining explosion

Do not blindly apply:

```text
w→v
then cz→tsch
then sz→sch
then ...
```

to every generated form.

Use:

- maximum transform depth;
- rule families;
- candidate budget;
- deduplication.

---

# 13. MIGRATION ADAPTATIONS

Migration-related spelling adaptations require their own semantics.

## 13.1 Persistent relation

Existing model:

```text
MIGRATION_ADAPTATION_OF
```

is retained.

## 13.2 Candidate types

Possible mechanisms:

- diacritic loss;
- anglicisation;
- Germanisation;
- phonetic respelling;
- suffix simplification;
- clerk spelling;
- deliberate family name change.

## 13.3 Resolution policy

### Evidence-backed accepted adaptation

May be a persistent `NameForm` and used in Tier 1.

### Rule-generated adaptation

Remains:

```text
SearchCandidate
search_only = true
```

### Same-family claim

Even an accepted surname adaptation does not establish that a particular historical person belongs to the user's family.

---

# 14. HISTORICAL FORMS

## 14.1 Source-attested form

A source-attested form has:

```text
exact source spelling
SourceRecord
locator
date/period
place if available
provenance
attestation status
```

This is materially different from a generated candidate.

## 14.2 Resolution role

The resolver may:

- connect source form to an existing NameForm;
- return one or more possible canonical surname candidates;
- leave it unresolved.

It may **not** by itself create the user-facing historical-variant assertion.

## 14.3 Evidence transition

```text
source-attested raw form
↓
resolver candidate relationship
↓
Evidence Engine
↓
HistoricalVariant / possible variant / reject
```

---

# 15. OCR NORMALISATION

OCR requires its own search profile.

## 15.1 Three layers

```text
OCR_RAW
↓
OCR_NORMALISED
↓
OCR_SEARCH_CANDIDATES
```

### `OCR_RAW`

Exact provider OCR.

### `OCR_NORMALISED`

Safe typographic cleanup:

- whitespace;
- hyphenation metadata where deterministically recoverable;
- Unicode normalization.

### `OCR_SEARCH_CANDIDATE`

Broader retrieval representation.

## 15.2 Common OCR confusions

Examples can include:

```text
rn ↔ m
l ↔ I
c ↔ e
missing diacritics
line-end hyphenation
ligature segmentation
Fraktur confusion
Cyrillic glyph confusion
column merge
```

These must be profile/version specific.

## 15.3 Hard rule

```text
OCR correction
```

never directly creates:

```text
NameForm(type = HISTORICAL_ATTESTED)
```

The attested value is the actual source/OCR/document form.

A corrected interpretation remains analysis until evidence/review supports it.

## 15.4 OCR candidate cap

OCR expansion is potentially explosive.

Use:

- local token context;
- candidate cap;
- source language/script;
- historical period/place;
- known surname inventory.

---

# 16. EXACT MATCH LAYER

Exact resolution is deterministic.

Priority:

## E0 — exact canonical display/key

```text
EXACT_CANONICAL
```

## E1 — exact accepted NameForm

```text
EXACT_KNOWN_FORM
```

## E2 — exact typographic/Unicode-equivalent key

```text
EXACT_NORMALIZED
```

No fuzzy algorithm should run before these checks complete.

## 16.1 Exact comparison key

Use:

```text
canonical_key_v1
```

not raw string byte equality alone.

NFC-equivalent strings must resolve identically.

---

# 17. KNOWN FORM MATCHING

The existing `NameForm` taxonomy from Document 11 is mostly retained.

Recommended final P0/P1 taxonomy:

```text
CANONICAL
MODERN_VARIANT
GENDER_FORM                 # proposed
HISTORICAL_ATTESTED
TRANSLITERATION
MIGRATION_ADAPTATION
LINGUISTIC_NORMALISATION
SEARCH_CANDIDATE            # retained only for explicitly persisted research candidates
```

## 17.1 Important refinement

Ephemeral generated search candidates should **not** normally be stored as `NameForm(SEARCH_CANDIDATE)`.

See Model Change Proposal 13-C below.

## 17.2 Resolution strengths

| Form type | Default resolver behavior |
|---|---|
| CANONICAL | AUTO |
| MODERN_VARIANT | AUTO if accepted relation |
| GENDER_FORM | AUTO if accepted relation; otherwise suggest |
| HISTORICAL_ATTESTED | Source/research context; often suggest/search, not necessarily interactive auto |
| TRANSLITERATION | AUTO only if accepted relation is explicit and unique; otherwise suggest |
| MIGRATION_ADAPTATION | Usually suggest/search |
| LINGUISTIC_NORMALISATION | Search/research support |
| SEARCH_CANDIDATE | Never auto by type alone |

---

# 18. SEARCH CANDIDATE MODEL

## MODEL CHANGE PROPOSAL 13-C

Introduce a resolver value object:

```text
SearchCandidate
```

separate from persistent `NameForm`.

### Why

Generated candidates can be:

- numerous;
- context-specific;
- algorithm-version-specific;
- low-confidence;
- transient.

Persisting every trigram, OCR or phonetic candidate as a canonical `NameForm` would pollute the knowledge model and make later evidence boundaries harder to enforce.

## 18.1 Proposed object

```json
{
  "candidate_id": "uuidv7",
  "research_run_id": "...",
  "input_form": "Cichwoski",
  "generated_form": "Cichowski",
  "candidate_surname_id": "...",
  "method": "FUZZY",
  "method_version": "resolver-fuzzy@1.0.0",
  "tier": "T4_FUZZY",
  "features": {},
  "context": {},
  "search_only": true,
  "persist_policy": "RUN_AUDIT",
  "created_at": "..."
}
```

## 18.2 Persistence

P0:

- keep candidates inside `SurnameResolution` / ResearchRun audit JSON;
- do not create a database row per generated string.

P1:

- materialize frequently reused/curated candidates if needed.

---

# 19. CANDIDATE GENERATION ORDER

Recommended staged retrieval:

```text
0. Exact canonical key
1. Exact accepted NameForms
2. Safe typographic equivalents
3. Accepted gender relation
4. Diacritic-fold candidate
5. Language-pack morphological candidate
6. Accepted transliteration/adaptation forms
7. Generated transliteration candidates
8. pg_trgm candidate retrieval
9. Edit-distance reranking
10. Phonetic candidates
11. OCR-specific expansion
```

Rules:

- stop early for interactive lookup when a unique T0/T1 resolution is found;
- broad stages may still be used later for historical archive query expansion;
- do not generate every layer for every query.

---

# 20. FUZZY MATCHING

## 20.1 P0 recommendation

Use:

```text
PostgreSQL pg_trgm
```

for candidate retrieval, followed by:

```text
Damerau-Levenshtein-style edit analysis
```

in resolver code for typo-sensitive reranking.

### Why `pg_trgm`

PostgreSQL documents `pg_trgm` as supporting trigram text similarity and indexed search through GiST/GIN operator classes.

It performs well for:

- misspellings;
- longer surnames;
- candidate retrieval over large text sets.

### Why edit distance second

Trigram similarity answers:

> Which strings share character fragments?

Edit distance answers:

> How many edits/transpositions separate these strings?

For interactive typos such as transposed adjacent characters, Damerau-style distance is more informative than plain Levenshtein.

## 20.2 PostgreSQL `fuzzystrmatch`

PostgreSQL provides:

- Levenshtein;
- Soundex;
- Daitch-Mokotoff Soundex;
- Metaphone;
- Double Metaphone.

However P0 should not depend on all of them.

## 20.3 Jaro-Winkler

Do not make Jaro-Winkler the primary MVP matcher.

Potential issue:

- it strongly rewards matching prefixes;
- many surnames share common morphological prefixes/suffixes;
- it can create attractive but misleading scores.

It may be evaluated later as a feature, not identity logic.

## 20.4 Character n-grams

`pg_trgm` already gives a practical trigram implementation for MVP.

Do not implement a second bespoke n-gram service without measured need.

## 20.5 Language-specific edit costs

P1 can add weighted edits, for example:

```text
diacritic deletion = lower retrieval cost
historically plausible digraph change = context-dependent cost
```

These weights must live in language packs and remain candidate-ranking features.

---

# 21. FUZZY LENGTH POLICY

Broad fuzzy search must depend on string length.

Initial conservative policy to tune on the corpus:

| Length | Broad fuzzy behavior |
|---:|---|
| 1–3 | exact/known forms only by default |
| 4–5 | very narrow; roughly one edit class |
| 6–8 | bounded typo search |
| 9+ | bounded typo search with trigram shortlist |

These are **initial operational rules**, not linguistic truths.

Final thresholds must be tuned on the golden corpus.

## 21.1 Candidate cap

Interactive resolver:

```text
DB shortlist: max 25
reranked internal: max 10
user-visible suggestions: usually max 3–5
```

Historical background search may use larger budgets.

---

# 22. PHONETIC MATCHING

## 22.1 Standard Soundex

Do not use ordinary English-oriented Soundex as the primary Poland/Central-Europe phonetic strategy.

## 22.2 Daitch–Mokotoff Soundex

Recommended P1 candidate feature.

Current PostgreSQL 18 `fuzzystrmatch` documentation explicitly includes Daitch-Mokotoff Soundex and describes it as more useful for non-English names than original Soundex.

It can produce multiple codes.

Policy:

```text
D-M overlap
→ candidate feature
→ never auto identity
```

## 22.3 Beider–Morse

Evaluate for P2 / specialist packs.

Apache Commons Codec currently provides a Beider-Morse implementation optimized for family names and includes language guessing / language-specific phonetic rules.

Advantages:

- surname-focused;
- multilingual;
- multiple phonetic interpretations.

Risks:

- candidate explosion;
- language inference may be wrong;
- greater implementation/explanation complexity.

Therefore:

```text
P0 = no
P1 = evaluate offline
P2 = production if corpus proves value
```

## 22.4 Cologne phonetics

Potential DE language-pack feature.

Not a universal resolver.

## 22.5 Phonetic storage

Store generated phonetic values with:

```text
algorithm
algorithm_version
input_form
language_pack
```

Never display code equality as confidence.

---

# 23. SEARCH INDEX ARCHITECTURE

No Elasticsearch/OpenSearch for MVP.

PostgreSQL is sufficient.

## 23.1 P0 indexes

### Canonical identity

```sql
UNIQUE (canonical_key, canonical_key_version)
```

### Name forms

B-tree on:

```text
name_forms.search_key
name_forms.unicode_nfc
```

### Trigram

Prefer a trigram index on the resolver search representation.

For top-K nearest matches, PostgreSQL documentation notes GiST supports distance ordering efficiently.

Candidate:

```sql
CREATE INDEX ... USING GIST (search_key gist_trgm_ops);
```

Evaluate GIN for batch/filter-heavy workload later.

### Script

B-tree:

```text
script
```

if script filtering becomes material.

## 23.2 Why own search keys

`pg_trgm` ignores non-word characters when extracting trigrams.

Name Atlas therefore should not delegate all surname token semantics to `pg_trgm`.

Particles, hyphens and apostrophes must be represented in explicit resolver features/keys.

## 23.3 Phonetic index P1

If PostgreSQL 18 is the standardized runtime, Daitch-Mokotoff arrays can be indexed appropriately.

If the production DB version differs, compute phonetic keys in the shared resolver library instead of coupling the architecture to a single extension feature.

---

# 24. CANDIDATE FEATURE MODEL

Every candidate must explain why it exists.

Recommended structure:

```json
{
  "candidate_surname_id": "...",
  "tier": "T4_FUZZY",
  "features": {
    "exact_canonical": false,
    "exact_known_form": false,
    "accepted_relation": false,
    "diacritic_fold_match": true,
    "gender_rule_match": false,
    "transliteration_match": false,
    "trigram_similarity": 0.91,
    "edit_distance": 1,
    "transposition_detected": false,
    "phonetic_overlap": false,
    "same_primary_script": true,
    "language_pack_compatible": true,
    "place_context_compatible": null,
    "time_context_compatible": null,
    "source_attested_relation": false
  },
  "explanation_codes": [
    "DIACRITIC_FOLD_MATCH",
    "TRIGRAM_HIGH",
    "EDIT_DISTANCE_1"
  ]
}
```

Similarity values are diagnostic features.

They are not historical confidence.

---

# 25. INTERNAL RANKING MODEL

## 25.1 Lexicographic first, score second

Rank by:

```text
1. tier
2. hard contradictions
3. accepted evidence relation
4. context compatibility
5. string features
6. source authority
7. stable tie breakers
```

Not:

```text
single black-box score
```

## 25.2 Suggested tiers

```text
T0_EXACT_CANONICAL
T1_ACCEPTED_FORM
T2_SAFE_DERIVED
T3_CONTEXTUAL
T4_FUZZY
T5_BROAD_RECALL
```

## 25.3 Within-tier score

A versioned rule-based score may combine:

- edit distance;
- trigram;
- language pack;
- script;
- context;
- source authority;
- candidate frequency/density.

Call it:

```text
retrieval_rank_score
```

not:

```text
confidence
probability
identity_probability
```

## 25.4 Hard contradiction

Examples:

- candidate requires impossible script mapping for the selected rule;
- exact unrelated-form relation already exists;
- source context contradicts claimed language pack;
- compound structure differs materially.

A hard contradiction can remove a candidate regardless of fuzzy score.

---

# 26. CONTEXTUAL RESOLUTION

Context may rerank candidates, never manufacture facts.

Inputs:

```text
country_context
language_hint
place_context
time_context
source_id
source_type
script
```

Example concept:

```text
German-administered historical source
+ period/place context
```

may make DE/PL orthographic candidate rules more useful.

It does not make the proposed relationship historically verified.

## 26.1 Context hierarchy

Prefer:

1. explicit source metadata;
2. explicit user context;
3. resolved place/time;
4. provider language;
5. inferred language last.

---

# 27. SOURCE AUTHORITY IN RESOLUTION

Document 12 supplies `AuthorityClass`.

Use it to decide how much a source form can influence candidate identity.

## 27.1 Examples

### `OFFICIAL_PRIMARY`

Exact current surname form can strongly support modern entity existence.

### `PRIMARY_ARCHIVAL`

Strong evidence that the spelling occurs in that source.

It does not alone prove equivalence to another surname.

### `SCHOLARLY_SPECIALIST`

Can strongly support a form relationship if the source explicitly discusses it.

### `COMMUNITY_STRUCTURED`

Useful candidate evidence; lower authority for automatic form identity.

### OCR

OCR is a machine extraction layer, not source authority about the spelling.

## 27.2 No universal source score

Do not reduce authority to one number.

A source can be:

- authoritative for current population;
- irrelevant for etymology;
- incomplete for variants.

---

# 28. SURNAME ENTITY CREATION

Do not create a permanent `Surname` for every user string.

## 28.1 Create `ACTIVE` entity when

At least one applies:

- exact form exists in an approved official/current surname dataset;
- specialist onomastic source establishes a headword;
- established partner/open dataset supplies a canonical surname entity;
- reviewed historical evidence justifies canonical entity creation.

## 28.2 Historical-only source form

A single historical occurrence should normally first create:

```text
SourceRecord
OccurrenceCandidate
```

not automatically a permanent active surname entity.

After review/corroboration it may create a surname entity.

## 28.3 User enters unknown surname

Do not persist as canonical Surname immediately.

Store in ResearchRun:

```text
UNRESOLVED
```

and offer candidates/context collection.

## 28.4 One OCR occurrence

Never sufficient by itself for canonical entity creation.

## 28.5 Possible typo

No entity creation.

## MODEL CHANGE PROPOSAL 13-D

Add to `SurnameStatus`:

```text
PROVISIONAL
```

Use when a real surname entity must exist before full review but identity is not yet ready for normal publication.

Do **not** add `UNRESOLVED` to `SurnameStatus`; unresolved is a query outcome, not an entity lifecycle state.

---

# 29. ENTITY MERGE POLICY

Merges are high-risk because they affect downstream evidence.

## 29.1 Merge requirements

Require:

- explicit merge reason;
- survivor surname ID;
- merged surname ID;
- resolver/evidence context;
- reviewer for non-trivial merges;
- timestamp;
- affected-object count;
- redirect.

## 29.2 Merge event

Recommended new audit object:

```text
SurnameMergeEvent
```

```json
{
  "merge_event_id": "...",
  "survivor_id": "...",
  "merged_id": "...",
  "reason_code": "...",
  "evidence_refs": [],
  "resolver_version": "...",
  "reviewer": "...",
  "created_at": "..."
}
```

## 29.3 No destructive delete

The merged ID remains resolvable as:

```text
MERGED → survivor_id
```

Reports/research runs remain reproducible against the version used at generation time.

---

# 30. ENTITY SPLIT / UNMERGE POLICY

Every merge must be reversible.

## 30.1 Split triggers

- new evidence shows forms are unrelated;
- language/script identity was incorrectly assumed;
- compound surname was collapsed into component surname;
- migration adaptation was overgeneralized;
- curator error.

## 30.2 Split process

Do not simply change one foreign key.

Required:

1. create/recover target entity;
2. reassign NameForms with provenance;
3. identify affected Claims/Evidence;
4. invalidate derived profiles;
5. rerun Coverage/DiscoveryIndex;
6. mark affected report versions as based on older resolution;
7. preserve merge/unmerge audit.

---

# 31. RESOLUTION STATUS MODEL

Document 11 currently uses one `resolution_status` field that mixes outcome and match mechanism.

## MODEL CHANGE PROPOSAL 13-E

Split it into three dimensions.

### `ResolutionOutcome`

```text
RESOLVED
SUGGESTION_REQUIRED
MULTIPLE_CANDIDATES
UNRESOLVED
REVIEW_REQUIRED
INVALID_INPUT
```

### `ResolutionMatchType`

```text
EXACT_CANONICAL
EXACT_KNOWN_FORM
EXACT_NORMALIZED
GENDER_FORM
DIACRITIC_CANDIDATE
TRANSLITERATION_MATCH
ORTHOGRAPHIC_CANDIDATE
MIGRATION_ADAPTATION
FUZZY_CANDIDATE
PHONETIC_CANDIDATE
OCR_CANDIDATE
NONE
```

### `DecisionMode`

```text
AUTO
USER_CONFIRM
SEARCH_ONLY
HUMAN_REVIEW
NONE
```

## 31.1 Compatibility

The old Document 11 status can remain as a derived compatibility field during migration.

This split makes downstream policy much clearer.

---

# 32. USER-FACING BEHAVIOUR CONTRACT

The UI consumes resolver decisions; it does not reinterpret them.

## 32.1 Exact

Input:

```text
Cichowski
```

Output concept:

```text
RESOLVED
AUTO
EXACT_CANONICAL
```

No confirmation screen needed.

## 32.2 Typo

Input:

```text
Cichwoski
```

Output:

```text
SUGGESTION_REQUIRED
USER_CONFIRM
FUZZY_CANDIDATE
```

UI:

> Czy chodziło Ci o Cichowski?

Do not silently replace input.

## 32.3 Missing diacritic

Input:

```text
Luczak
```

If `Luczak` itself is a valid exact surname entity:

- exact entity must win;
- `Łuczak` may appear as another candidate if relevant.

If no exact entity exists and `Łuczak` is a unique diacritic-fold candidate:

```text
SUGGESTION_REQUIRED
```

unless an accepted NameForm relation establishes auto-resolution.

## 32.4 Multiple matches

Return structured alternatives.

Never choose based only on popularity.

## 32.5 Unknown

Return:

```text
UNRESOLVED
```

with:

- spelling suggestion if any;
- transliteration option;
- country/context option;
- no invented etymology.

This matches the existing Name Atlas low-data architecture.

---

# 33. AUTO-CORRECT POLICY

Use the term:

```text
AUTO_RESOLVE
```

rather than invisible autocorrect.

## 33.1 Auto allowed

- Unicode canonical-equivalent normalization;
- casing;
- controlled typographic apostrophe/hyphen equivalence;
- exact canonical key;
- exact accepted NameForm;
- accepted gender-form relation;
- explicitly accepted transliteration relation when unique.

## 33.2 Suggest only

- diacritic-fold match without accepted relation;
- typo/fuzzy;
- generated gender counterpart;
- transliteration generated at query time;
- historical orthographic rule;
- migration adaptation hypothesis.

## 33.3 Search only

- phonetic;
- OCR expansion;
- aggressive historical rewrite;
- broad particle removal.

## 33.4 Never

Auto-resolve when:

- two strong canonical candidates exist;
- mixed-script identity is suspicious;
- relation is only phonetic;
- relation is only fuzzy;
- exact current surname exists but resolver prefers a more popular approximate surname.

---

# 34. QUERY EXPANSION

After a surname is resolved, historical/search connectors may receive expanded forms.

## Tier Q0 — canonical

```text
canonical display / canonical key
```

## Tier Q1 — accepted

```text
accepted modern variants
accepted gender forms
evidence-backed historical variants
accepted transliterations
```

## Tier Q2 — high-value research candidates

```text
diacritic folds
contextual historical orthography
language-specific transliterations
migration candidates
```

## Tier Q3 — broad recall

```text
fuzzy
phonetic
OCR
```

Every result carries:

```text
query_candidate_id
expansion_tier
generation_method
```

Prompt 14 can therefore distinguish:

```text
hit from exact known historical form
```

from:

```text
hit found only after broad phonetic expansion
```

---

# 35. QUERY CANDIDATE PROVENANCE

Every generated form must have:

```text
candidate_id
research_run_id
raw/input form
generated form
generation_method
algorithm/rule version
language pack
source context
place/time context
parent candidate if any
transform depth
search profile
search_only
created_at
```

## 35.1 Transform depth

P0:

```text
max transform depth = 1
```

for most interactive generated forms.

Historical/OCR profile may allow tightly controlled depth 2.

Never allow unbounded rewrite chains.

---

# 36. RESOLUTION VERSIONING

A `SurnameResolution` must be reproducible.

Persist:

```text
resolver_version
canonical_key_version
unicode_data_version
normalization_version
language_pack_versions
transliteration_version
fuzzy_feature_version
phonetic_version
ranking_version
policy_version
```

These may be represented by one immutable resolver manifest ID plus human-readable component versions.

## 36.1 Why

If PL gender rules or trigram thresholds change, an old paid report must still explain which resolver produced its source searches.

---

# 37. CACHE STRATEGY

## 37.1 Normalization cache

Key:

```text
raw Unicode string + normalization manifest
```

Long-lived.

## 37.2 Exact resolution cache

Key:

```text
canonical key + resolver manifest
```

Invalidate when:

- surname/name-form graph changes;
- merge/split occurs.

## 37.3 Candidate generation cache

Key includes:

```text
input
resolver version
country/language pack
search profile
```

## 37.4 Contextual ranking cache

Must include relevant:

- place;
- time;
- source type.

Do not reuse ranking across materially different historical contexts.

---

# 38. INTERNAL RESOLUTION CONTRACT

Recommended internal function:

```text
resolveSurname(input, context)
```

## 38.1 Response

```json
{
  "resolution_id": "uuid",
  "raw_input": "Cichwoski",
  "unicode_nfc": "Cichwoski",
  "canonical_input_key": "cichwoski",
  "detected_scripts": ["Latn"],
  "outcome": "SUGGESTION_REQUIRED",
  "match_type": "FUZZY_CANDIDATE",
  "decision_mode": "USER_CONFIRM",
  "resolved_surname_id": null,
  "resolved_name_form_id": null,
  "auto_resolved": false,
  "candidates": [
    {
      "surname_id": "uuid",
      "name_form_id": "uuid",
      "display": "Cichowski",
      "tier": "T4_FUZZY",
      "retrieval_rank_score": 742,
      "features": {
        "trigram_similarity": 0.9,
        "edit_distance": 1,
        "transposition_detected": true,
        "same_script": true
      },
      "explanation_codes": [
        "TRIGRAM_HIGH",
        "ADJACENT_TRANSPOSITION"
      ],
      "search_only": true
    }
  ],
  "resolver_manifest": "surname-resolver@1.0.0",
  "user_confirmation_required": true,
  "human_review_required": false
}
```

Numeric values above are illustrative schema examples, not recommended universal thresholds.

---

# 39. RELATIONSHIP TAXONOMY

Keep persistent evidence/curated relations separate from transient candidate methods.

## 39.1 Persistent `NameFormRelationType`

Recommended:

```text
ATTESTED_AS
GENDER_FORM_OF                    # proposed
ORTHOGRAPHIC_VARIANT_OF
POSSIBLE_VARIANT_OF
TRANSLITERATION_OF
MIGRATION_ADAPTATION_OF
LINGUISTIC_NORMALISATION_OF
SEARCH_SIMILAR_TO
UNRELATED_SIMILAR_FORM
```

## 39.2 Persistent user-facing eligibility

| Relation | User-facing historical relation? | Auto-resolve? |
|---|---:|---:|
| ATTESTED_AS | Evidence Engine decides | Usually yes for accepted identity |
| GENDER_FORM_OF | Yes as modern grammatical relation | Yes if accepted |
| ORTHOGRAPHIC_VARIANT_OF | Yes when claim/evidence supports | If accepted and unambiguous |
| POSSIBLE_VARIANT_OF | Only labelled possible | No |
| TRANSLITERATION_OF | Yes, labelled | Only accepted unique relation |
| MIGRATION_ADAPTATION_OF | Yes when evidence supports | Usually no |
| LINGUISTIC_NORMALISATION_OF | Research/explanation | Context dependent |
| SEARCH_SIMILAR_TO | No | No |
| UNRELATED_SIMILAR_FORM | No | Prevent merge |

## 39.3 Transient `CandidateMethod`

```text
DIACRITIC_FOLD
GENDER_DERIVATION
PARTICLE_VARIANT
TRANSLITERATION_GENERATED
DE_PL_ORTHOGRAPHIC_RULE
TRIGRAM
EDIT_DISTANCE
PHONETIC_DM
PHONETIC_BM
OCR_SUBSTITUTION
COMPOUND_COMPONENT
```

Do not persist these as historical form relationships by default.

---

# 40. FALSE-POSITIVE DEFENCE

False merge is the highest-risk resolver error.

## 40.1 Shared suffix

Two names ending in:

```text
-ski
```

are not related merely because the suffix matches.

Guardrail:

- suffix similarity alone receives minimal candidate weight;
- require stem similarity/other features.

## 40.2 Short surnames

Edit distance 1 on a three-letter surname can change most of the string.

Guardrail:

- no broad auto/fuzzy resolution;
- exact/known forms first;
- stricter candidate budget.

## 40.3 Phonetic collisions

Many distinct names share phonetic codes.

Guardrail:

```text
phonetic-only = T5 / SEARCH_ONLY
```

## 40.4 Diacritic collisions

Multiple Polish forms can fold to the same ASCII representation.

Guardrail:

- preserve exact entities;
- folded key can return multiple candidates;
- do not prefer the most frequent automatically.

## 40.5 Gender overgeneralisation

Guardrail:

- approved suffix classes only;
- no global final-letter substitution.

## 40.6 Historical transformation overreach

Guardrail:

- contextual language pack;
- no global replacement;
- max transform depth.

## 40.7 OCR hallucination

Guardrail:

- OCR candidate remains linked to raw source text;
- no historical variant promotion in resolver.

## 40.8 Shared root

Etymologically related surnames are not necessarily the same surname.

Guardrail:

```text
linguistic_relatedness
≠
entity identity
```

---

# 41. FALSE-NEGATIVE DEFENCE

Recall matters because archives contain noisy forms.

Use staged retrieval.

## Stage A — precision

- exact;
- known forms;
- accepted gender forms.

## Stage B — safe recall

- diacritic fold;
- accepted transliterations;
- contextual language rules.

## Stage C — broad recall

- fuzzy;
- Daitch-Mokotoff;
- OCR rules.

## 41.1 Historical source search

Broader stages may run without changing the interactive user's selected canonical surname.

Example:

```text
User resolved exactly to Surname A
```

Then background historical retrieval can search Tiers Q1–Q3 while preserving candidate provenance.

---

# 42. COMMON VS RARE SURNAME STRATEGY

Rarity may affect **candidate budget**, not truth.

## 42.1 Common surname

For common surnames:

- more exact forms may exist;
- fuzzy candidates can be numerous;
- require stronger string/context match before broad search;
- cap candidates aggressively.

## 42.2 Rare surname

For rare surnames:

- broader retrieval can improve recall;
- context may be more discriminating.

But:

```text
rare + similar
```

does not prove identity.

## 42.3 Better signal than rarity alone

Use candidate density:

```text
how many plausible surname entities does this query produce?
```

A dense neighborhood should tighten thresholds regardless of surname frequency.

---

# 43. LANGUAGE / REGION PLUGIN ARCHITECTURE

Core resolver remains language-neutral.

```text
UniversalResolver
      │
      ├── PL Pack
      ├── DE Pack
      ├── UA Pack
      ├── RU Pack
      ├── BY Pack
      └── later Jewish/Eastern-European packs
```

## 43.1 Universal core owns

- Unicode;
- exact keys;
- candidate tiering;
- trigram retrieval;
- generic edit features;
- versioning;
- cache;
- audit;
- resolution policy.

## 43.2 Language pack owns

- morphology;
- diacritic folding;
- particles;
- orthographic history candidates;
- language-specific transliteration configuration;
- phonetic applicability;
- rule costs;
- examples/tests.

This prevents Polish rules from contaminating global search.

---

# 44. POLAND MVP RESOLUTION PACK

Recommended `pl@1.0.0`.

## 44.1 P0

- Latin script;
- Polish diacritics;
- casing;
- canonical hyphen/apostrophe handling;
- accepted modern NameForms;
- controlled gender pairs:
  - `-ski/-ska`;
  - `-cki/-cka`;
  - `-dzki/-dzka`;
- compound/hyphen preservation;
- exact official PESEL form;
- typo suggestion via trigram/edit.

## 44.2 P1

- DE/PL historical candidates;
- Cyrillic-aware source forms;
- Russian/Ukrainian/Belarusian transliteration profiles;
- migration adaptations;
- Daitch-Mokotoff feature;
- more adjectival surname classes after linguistic QA.

## 44.3 No mass suffix generation

Never generate every theoretical Polish inflection for every surname.

Rules activate only when the input/form structure satisfies the pack.

---

# 45. OCR-AWARE SEARCH PACK

Separate:

```text
ocr-historical-pl@1.x
```

from interactive resolver.

## 45.1 Inputs

- provider OCR;
- source language;
- script;
- year/period;
- font/document type if known;
- local token context.

## 45.2 Candidate path

```text
Cichowski
↓
OCR search profile
↓
bounded alternatives
↓
archive retrieval
```

Generated OCR forms remain `SearchCandidate`.

They do not become persisted NameForms merely because an archive hit occurs.

The exact source form/evidence must still be examined.

---

# 46. PERFORMANCE AND CANDIDATE BUDGETS

Assume:

- Poland MVP: manageable surname/name-form inventory;
- global future: millions of forms;
- historical expansion: potentially large.

## 46.1 Early exit

Interactive query:

```text
unique T0 exact
→ return immediately
```

Do not run fuzzy/phonetic work unnecessarily.

## 46.2 Candidate budgets

Recommended configurable initial limits:

```text
trigram DB shortlist: 25
edit-reranked shortlist: 10
phonetic additions: 10 max
interactive suggestions: 3–5
OCR per-query expansion: source/profile specific
```

Tune against evaluation.

## 46.3 Dedup

Candidate generated by:

```text
diacritic + trigram + phonetic
```

is one candidate with three features, not three candidates.

## 46.4 Time budget

Keep resolver itself low-latency by using only local DB/indexed rules.

External source retrieval belongs outside the resolver's interactive critical path.

---

# 47. HUMAN REVIEW TRIGGERS

Return `REVIEW_REQUIRED` when:

- two accepted canonical candidates conflict;
- a merge changes substantial existing claims/reports;
- cross-script relation has no accepted transliteration relation;
- scholarly source relation conflicts with current entity graph;
- rare historical form has multiple plausible canonical entities;
- compound surname parsing materially affects identity;
- resolver suggests entity merge from only fuzzy/phonetic evidence;
- premium historical interpretation depends on unresolved relation.

## 47.1 Review reason codes

```text
MULTIPLE_STRONG_CANDIDATES
CROSS_SCRIPT_AMBIGUITY
CONFLICTING_ACCEPTED_FORMS
ENTITY_MERGE_HIGH_IMPACT
HISTORICAL_FORM_AMBIGUOUS
COMPOUND_IDENTITY_AMBIGUOUS
SOURCE_CONFLICT
SECURITY_MIXED_SCRIPT
OTHER
```

---

# 48. ADMIN / RESEARCH VIEW REQUIREMENTS

Future internal console must expose:

```text
Raw input
NFC form
canonical key
compatibility/search keys
script detection
mixed-script warning
exact matches
known form matches
candidate tiers
all ranking features
language-pack rules fired
transliteration methods
phonetic keys
source authority
place/time context
candidate provenance
accepted vs search-only relations
merge history
resolver manifest
review decision
```

Researcher must be able to answer:

> Why did the resolver think these forms might be related?

without reading code.

---

# 49. TEST CORPUS

## 49.1 First implementation corpus — 150 cases

Recommended structure:

| Category | Cases |
|---|---:|
| Exact Polish | 15 |
| Case / Unicode / punctuation | 10 |
| Diacritics removed | 15 |
| Polish gender forms | 15 |
| Gender false-positive negatives | 10 |
| Hyphenated / compound / particles | 10 |
| Typo / transposition | 15 |
| Similar-but-unrelated | 15 |
| German/Polish candidate forms | 10 |
| Cyrillic / transliteration | 10 |
| OCR noise | 10 |
| Very short surname | 5 |
| Historical-only / unknown | 5 |
| Foreign surname in PL | 5 |

Total: **150**.

## 49.2 Mature MVP corpus

Expand toward:

```text
300–500+
```

after real failure cases appear.

The prompt's 100–200 range is appropriate for the first serious resolver evaluation; 150 is a practical initial target.

## 49.3 Positive vs negative

Do not build a corpus containing mostly obvious positives.

At least a meaningful dedicated set must test:

```text
DO NOT MERGE
DO NOT AUTO-RESOLVE
```

because false merges are the expensive errors.

---

# 50. TEST EXAMPLES

Examples below test resolver behavior, not etymological/historical claims.

## 50.1 Exact

```text
input: Kowalski
expected:
exact canonical if corpus entity exists
```

## 50.2 Accepted gender relation

```text
input: Kowalska

if accepted relation exists:
RESOLVED
match = GENDER_FORM
```

## 50.3 Generated gender candidate only

```text
input: synthetic feminine-pattern case

if relation is only rule-derived:
SUGGESTION_REQUIRED
```

## 50.4 Diacritic fold

```text
input: Luczak

if exact Luczak entity exists:
exact entity wins

Łuczak may be additional suggestion.
```

## 50.5 Typo

```text
input: Cichwoski

possible:
Cichowski
match = FUZZY_CANDIDATE
USER_CONFIRM
```

No historical relation is asserted.

## 50.6 OCR

```text
source OCR: Kowalskl
candidate: Kowalski

SEARCH_ONLY
```

## 50.7 Similar unrelated negative

Synthetic pair with:

- edit distance 1;
- same phonetic code;
- explicit `UNRELATED_SIMILAR_FORM`.

Expected:

```text
never auto merge
```

## 50.8 Mixed-script spoof-like input

Latin string containing one Cyrillic confusable character.

Expected:

```text
MIXED_SCRIPT_REVIEW
no silent normalization into Latin identity
```

---

# 51. EVALUATION METRICS

Do not report only “accuracy”.

## 51.1 Deterministic

```text
Exact canonical precision
Exact accepted-form precision
Unicode normalization consistency
```

## 51.2 Candidate retrieval

```text
Top-1 candidate accuracy
Top-3 recall
candidate set size
unresolved rate
```

## 51.3 Safety

```text
False auto-resolve rate
False merge rate
False historical-variant promotion rate
ambiguous-auto-resolution rate
```

## 51.4 Specialized

```text
Cross-script recall
Diacritic candidate recall
Gender-form precision
OCR candidate recall
Phonetic incremental recall
```

## 51.5 UX/operations

```text
User clarification rate
User correction acceptance rate
Review-required rate
Latency p50/p95
candidate generation count
```

## 51.6 Highest-priority metric

```text
FALSE MERGE RATE
```

This should be treated as the critical resolver safety metric.

---

# 52. GOLDEN GUARANTEES

These are hard regression invariants.

## Guarantee 1

```text
SearchCandidate
never automatically becomes
HistoricalVariant
```

## Guarantee 2

```text
PHONETIC_MATCH
never means
SAME_SURNAME_FACT
```

## Guarantee 3

```text
OCR_CANDIDATE
never means
VERIFIED_NAME_FORM
```

## Guarantee 4

```text
FUZZY_CANDIDATE
never auto-merges entities
```

## Guarantee 5

```text
AMBIGUOUS INPUT
never silently changes identity
```

## Guarantee 6

```text
EXACT VALID ENTITY
cannot be displaced by a more popular fuzzy candidate
```

## Guarantee 7

```text
MERGE
is auditable and reversible
```

## Guarantee 8

```text
display form
is never replaced by diacritic-folded representation
```

## Guarantee 9

```text
generated transliteration
remains search-only
unless accepted relation exists
```

## Guarantee 10

```text
historical source spelling
remains preserved exactly
```

---

# 53. IMPLEMENTATION ORDER

## Stage 0 — schema alignment

1. adopt Model Change Proposals 13-A/C/E;
2. add resolver enums/manifests;
3. define `SearchCandidate` runtime schema.

## Stage 1 — Unicode core

4. raw preservation;
5. NFC;
6. full casefold key;
7. separator handling;
8. script detection;
9. mixed-script security flag.

## Stage 2 — exact resolution

10. canonical-key B-tree;
11. exact Surname;
12. exact NameForm;
13. merge redirects.

## Stage 3 — PL safe retrieval

14. PL diacritic fold;
15. accepted gender forms;
16. hyphen/compound preservation;
17. PL resolver tests.

## Stage 4 — fuzzy suggestions

18. `pg_trgm`;
19. top-K retrieval;
20. edit/transposition reranking;
21. suggestion policy.

## Stage 5 — query expansion

22. Q0/Q1 accepted forms;
23. candidate provenance;
24. connector query-expansion contract.

## Stage 6 — P1 multilingual

25. Cyrillic detection;
26. ICU transliteration;
27. DE/PL historical pack.

## Stage 7 — broad recall

28. Daitch-Mokotoff;
29. OCR pack;
30. contextual ranking.

## Stage 8 — review tooling

31. merge/split audit;
32. human review queue;
33. failure-derived regression cases.

---

# 54. FIRST PRODUCTION VERTICAL SLICE

P0 scope:

```text
USER INPUT
↓
validation
↓
NFC
↓
casefold/canonical key
↓
exact Surname
↓
exact accepted NameForms
↓
PL diacritic candidate
↓
accepted Polish gender form
↓
limited pg_trgm typo retrieval
↓
edit/transposition rerank
↓
SurnameResolution
```

## P0 includes

- Latin script;
- Polish current surnames;
- known NameForms;
- conservative typo suggestions;
- ambiguity;
- versioning;
- candidate provenance.

## P0 excludes

- automatic Cyrillic identity;
- phonetic auto-resolution;
- OCR search pack;
- historical DE/PL rewrite engine;
- full migration adaptations.

This P0 is sufficient to test PESEL + Polona vertical slice without making the resolver the largest project before launch.

---

# 55. WHAT NOT TO BUILD YET

1. Neural surname embeddings.
2. LLM as primary resolver.
3. Vector database for surname identity.
4. Elasticsearch/OpenSearch cluster.
5. User-facing identity probabilities.
6. Automated entity merge from fuzzy score.
7. Global rules for every naming culture.
8. Full Hebrew/Yiddish morphological resolver.
9. Deep person/given-name linkage.
10. Unbounded historical rewrite graph.
11. Learned ML ranker before a labelled corpus exists.
12. One generic transliteration applied as truth.
13. One generic phonetic algorithm for all languages.

---

# 56. LLM ROLE

LLM is not in the primary resolution path.

## Allowed

- researcher explanation of an ambiguous candidate;
- suggestion of possible linguistic hypotheses for human investigation;
- summarising why deterministic features conflict;
- proposing new rule candidates for offline evaluation;
- reviewing unusual edge cases with supplied evidence.

## Forbidden as identity evidence

```text
"GPT thinks these names look related"
```

must never create:

- merge;
- accepted NameForm;
- historical variant;
- auto-resolution.

New LLM-suggested rules must pass:

```text
human review
→ test corpus
→ versioned language pack
```

before production.

---

# 57. DECISION REGISTER

## 57.1 Unicode normalization

**Decision:** NFC for stored/display forms and canonical identity base; NFKC-style compatibility handling only as search support.  
**Alternative:** NFKC everywhere.  
**Why:** preserve name distinctions while still supporting broad retrieval.  
**Risk:** more keys/features.  
**Follow-up:** freeze exact shared normalization implementation.

## 57.2 Canonical key

**Decision:** NFC + full Unicode case fold + controlled separator normalization; preserve diacritics/particles.  
**Alternative:** ASCII-folded canonical key.  
**Why:** ASCII folding causes identity collisions.  
**Risk:** exact lookup misses user inputs without diacritics.  
**Mitigation:** separate diacritic key.

## 57.3 Diacritics

**Decision:** explicit versioned PL fold for retrieval only.  
**Alternative:** generic accent stripping.  
**Why:** generic combining-mark removal is insufficient for all Polish letters.  
**Risk:** collisions.  
**Mitigation:** suggestion policy.

## 57.4 Gender forms

**Decision:** explicit `GENDER_FORM` / `GENDER_FORM_OF`; accepted relation may auto-resolve.  
**Alternative:** suffix rewrite on every query.  
**Why:** safer and auditable.  
**Risk:** lower recall until relation graph grows.

## 57.5 Compound surname

**Decision:** compound is its own surname identity; components are secondary candidates only.  
**Alternative:** split automatically.  
**Why:** splitting changes identity.  
**Risk:** fewer component hits.  
**Follow-up:** optional component relation P1.

## 57.6 Transliteration

**Decision:** ICU-backed, versioned, language-specific where known; generated output is search-only.  
**Alternative:** one generic transliterator.  
**Why:** migration/historical systems have multiple valid romanisations.  
**Risk:** multiple candidates.

## 57.7 Fuzzy retrieval

**Decision:** PostgreSQL `pg_trgm` shortlist + edit/transposition rerank.  
**Alternative:** Jaro-Winkler-only or search cluster.  
**Why:** strong PostgreSQL fit and explainable features.  
**Risk:** thresholds require corpus calibration.

## 57.8 Phonetics

**Decision:** no phonetic P0; Daitch-Mokotoff P1 candidate feature; Beider-Morse evaluate later.  
**Alternative:** Soundex from day one.  
**Why:** avoid low-precision candidate inflation.  
**Risk:** lower historical recall in P0.

## 57.9 Ranking

**Decision:** hard candidate tiers then within-tier explainable score.  
**Alternative:** one 0–1 similarity score.  
**Why:** prevents fuzzy signal from outranking accepted identity.  
**Risk:** more policy code.

## 57.10 Auto-resolution

**Decision:** only deterministic/accepted relations.  
**Alternative:** threshold-based fuzzy autocorrect.  
**Why:** surname identity errors contaminate downstream research.  
**Risk:** more user clarification.

## 57.11 Surname entity creation

**Decision:** evidence/source-backed only; unknown user strings stay unresolved.  
**Alternative:** create entity per search.  
**Why:** protects canonical graph quality.  
**Risk:** temporary unresolved queries.

## 57.12 Search candidates

**Decision:** ephemeral `SearchCandidate` object by default.  
**Alternative:** persist all as NameForms.  
**Why:** avoids graph pollution and candidate explosion.  
**Risk:** resolver audit must preserve candidate JSON.

## 57.13 Merge

**Decision:** human-reviewable, audit event, reversible.  
**Alternative:** direct FK update.  
**Why:** high downstream impact.  
**Risk:** admin complexity.

---

# 58. MODEL CHANGE PROPOSALS SUMMARY

## 13-A — Gender form

Add:

```text
NameFormType.GENDER_FORM
NameFormRelationType.GENDER_FORM_OF
```

**Recommendation:** accept for P0.

## 13-B — Compound surname relation

Add a dedicated component relation if product/search needs it.

**Recommendation:** defer to P1.

## 13-C — SearchCandidate value object

Generated search candidates become runtime/audit objects instead of normal persistent NameForms.

**Recommendation:** accept for P0.

Keep `NameFormType.SEARCH_CANDIDATE` only for explicitly persisted/curated research candidates if needed.

## 13-D — Provisional surname

Add:

```text
SurnameStatus.PROVISIONAL
```

**Recommendation:** P1 unless historical-only entity creation is required before launch.

## 13-E — Split resolution dimensions

Replace mixed single status semantics with:

```text
ResolutionOutcome
ResolutionMatchType
DecisionMode
```

**Recommendation:** accept before implementation.

---

# 59. OUTPUT CONTRACT TO PROMPT 14

The resolver passes the Evidence & Claim Engine:

```json
{
  "resolution": {
    "resolved_surname_id": "...",
    "resolved_name_form_id": "...",
    "raw_input": "...",
    "outcome": "RESOLVED",
    "match_type": "EXACT_KNOWN_FORM",
    "decision_mode": "AUTO",
    "resolver_manifest": "surname-resolver@1.0.0"
  },
  "accepted_forms": [],
  "source_attested_forms": [],
  "search_candidates_used": [
    {
      "candidate_id": "...",
      "generated_form": "...",
      "method": "...",
      "tier": "...",
      "source_record_id": null,
      "search_only": true
    }
  ],
  "context": {
    "country": "PL",
    "place_id": null,
    "time": null
  },
  "review": {
    "required": false,
    "status": null
  }
}
```

Prompt 14 decides:

- which source-derived forms become EvidenceItems;
- which relations support a Claim;
- whether a form relation is historical/modern;
- conflicts;
- confidence;
- user-facing wording.

The resolver must never pass:

```text
"historical_variant": true
```

merely because a string matched.

---

# 60. FINAL ARCHITECTURE

```text
                         USER / SOURCE FORM
                                │
                                ▼
                         INPUT VALIDATION
                                │
                                ▼
                  UNICODE NFC + SECURITY LAYER
                                │
                                ├── raw preserved
                                ├── casefold key
                                ├── script detection
                                └── mixed-script flag
                                │
                                ▼
                    EXACT CANONICAL LOOKUP
                                │
                      ┌─────────┴─────────┐
                      │                   │
                  EXACT HIT           NO HIT
                      │                   │
                      ▼                   ▼
              ACCEPTED NAMEFORMS   SAFE DERIVATIONS
                      │                   │
                      │          ┌────────┼─────────┐
                      │          ▼        ▼         ▼
                      │      DIACRITIC  GENDER  TRANSLIT
                      │          │        │         │
                      │          └────────┼─────────┘
                      │                   ▼
                      │            FUZZY RETRIEVAL
                      │                   │
                      │             PHONETIC/OCR
                      │              when profile
                      │                   │
                      └──────────┬────────┘
                                 ▼
                         CANDIDATE TIERS
                                 │
                                 ▼
                    WITHIN-TIER FEATURE RANK
                                 │
                                 ▼
                         CONTEXTUAL RERANK
                                 │
                                 ▼
                         RESOLUTION POLICY
                                 │
              ┌──────────────────┼─────────────────┐
              ▼                  ▼                 ▼
          AUTO RESOLVE       USER CONFIRM      UNRESOLVED
              │                  │                 │
              └──────────────────┼─────────────────┘
                                 ▼
                        SurnameResolution
                                 │
                  ┌──────────────┴──────────────┐
                  ▼                             ▼
             UI RESULT                  QUERY EXPANSION
                                                │
                                                ▼
                                         SOURCE SEARCH
                                                │
                                                ▼
                                      EVIDENCE ENGINE
```

---

# 61. P0 RESOLUTION ENGINE

Implement now:

1. input preservation;
2. validation;
3. NFC;
4. Unicode full casefold key;
5. controlled separators;
6. Latin script detection;
7. mixed-script flag;
8. exact canonical match;
9. exact accepted NameForm match;
10. PL diacritic fold candidate;
11. accepted PL gender-form relation;
12. compound/hyphen preservation;
13. `pg_trgm` shortlist;
14. edit/transposition rerank;
15. hard candidate tiers;
16. `ResolutionOutcome`;
17. `ResolutionMatchType`;
18. `DecisionMode`;
19. `SearchCandidate` provenance;
20. resolver manifest/versioning;
21. ambiguity/user-confirmation behavior;
22. 150-case initial evaluation corpus.

---

# 62. P1 RESOLUTION ENGINE

Add after first vertical slice:

1. Cyrillic script support;
2. ICU Cyrillic-Latin candidates;
3. Russian/Ukrainian/Belarusian language packs;
4. DE/PL historical orthography pack;
5. Daitch-Mokotoff feature;
6. OCR archive profile;
7. source/time/place contextual reranking;
8. merge/split review console;
9. provisional historical entities if needed;
10. larger regression corpus.

---

# 63. DO NOT BUILD YET

- neural embeddings;
- vector identity search;
- LLM resolver;
- automatic fuzzy merge;
- Beider-Morse in production before evaluation;
- all-language morphology;
- full person matching;
- Hebrew/Yiddish morphology;
- probabilistic identity percentages;
- search microservice;
- universal historical spelling transformer.

---

# 64. BIGGEST FALSE-POSITIVE RISKS

1. Diacritic fold collisions.
2. Fuzzy match on short surnames.
3. Gender suffix overgeneralisation.
4. Phonetic code collisions.
5. OCR typo treated as historical spelling.
6. German/Polish rewrite rules applied outside context.
7. Compound surname split.
8. Particle stripping.
9. Mixed-script homoglyphs.
10. Same root treated as same surname.
11. More-popular surname displacing valid rare exact entity.
12. Unreviewed migration adaptation promoted to accepted relation.

---

# 65. BIGGEST FALSE-NEGATIVE RISKS

1. Lost Polish diacritics.
2. Transpositions/ordinary typos.
3. Gender forms missing from relation graph.
4. Cyrillic historical records.
5. German administrative spellings.
6. Immigration-era Latin adaptations.
7. OCR errors.
8. Compound punctuation differences.
9. Apostrophe/hyphen Unicode variants.
10. Historical clerk spelling.
11. Incomplete source language metadata.

Mitigation is staged retrieval, not aggressive canonical merging.

---

# 66. DEFINITION OF RESOLUTION ENGINE READY

The MVP resolver is ready only when:

- raw surname strings are preserved;
- NFC output is deterministic;
- canonical keys are stable and versioned;
- exact canonical lookup works;
- accepted NameForms resolve correctly;
- Polish diacritic-insensitive retrieval works;
- PL gender relations are explicit rather than global suffix hacks;
- compounds/hyphens are not silently split;
- fuzzy candidates never auto-merge;
- generated search candidates are separate from historical variants;
- mixed-script confusables are detectable;
- resolution decisions are reproducible;
- ambiguity remains ambiguity;
- candidate provenance reaches Prompt 14;
- merge policy is non-destructive;
- golden guarantees pass;
- the negative/false-merge corpus has no resolver-policy violation.

A fuzzy Top-1 metric alone is not sufficient to declare readiness.

---

# 67. INPUTS REQUIRED BY PROMPT 14

Prompt 14 can now assume:

## Canonical

- `Surname`;
- accepted `NameForm`;
- persistent form relations.

## Query/run

- `SurnameResolution`;
- raw input;
- exact selected entity;
- accepted relation used;
- search candidates;
- query-expansion tier;
- candidate generation provenance;
- place/time/source context;
- resolver manifest.

## Source

From Prompt 12:

- `Source`;
- `SourceRecord`;
- source authority;
- rights;
- raw source surname spelling;
- OCR status;
- provenance.

Prompt 14 must design the transition:

```text
resolved/search form
+
source record
+
provenance
+
rights
↓
EvidenceItem
↓
ClaimEvidence
↓
Claim
↓
ConfidenceAssessment
```

without ever allowing resolver similarity to masquerade as evidence.

---

# 68. VERIFIED IMPLEMENTATION REFERENCES

Checked 2026-09-17.

## Unicode Normalization

Unicode Standard Annex #15 — Unicode Normalization Forms, current Unicode 18.0 edition:

https://www.unicode.org/reports/tr15/

Relevant architecture decision:

- NFC for canonical/display normalization;
- compatibility normalization separated from canonical identity.

## Unicode security / confusables

Unicode Technical Standard #39 — Unicode Security Mechanisms:

https://www.unicode.org/reports/tr39/

Relevant architecture decision:

- mixed-script/confusable detection is a safety signal;
- confusable equality is not name identity.

## ICU transforms

ICU User Guide — Transforms:

https://unicode-org.github.io/icu/userguide/transforms/general/

Relevant architecture decision:

- versioned script/language transliteration candidates;
- generated transliteration remains search-layer output.

## PostgreSQL `pg_trgm`

PostgreSQL documentation:

https://www.postgresql.org/docs/current/pgtrgm.html

Relevant architecture decision:

- indexed trigram candidate retrieval;
- GiST useful for nearest-candidate ordering.

## PostgreSQL `fuzzystrmatch`

PostgreSQL documentation:

https://www.postgresql.org/docs/current/fuzzystrmatch.html

Current PostgreSQL 18 documentation includes:

- Levenshtein;
- Soundex;
- Daitch-Mokotoff Soundex;
- Metaphone;
- Double Metaphone.

Daitch-Mokotoff is a P1 candidate-generation feature, not identity evidence.

## PostgreSQL `unaccent`

PostgreSQL documentation:

https://www.postgresql.org/docs/current/unaccent.html

Relevant architecture decision:

- useful retrieval support;
- Name Atlas still owns a versioned PL fold definition.

## Beider–Morse evaluation reference

Apache Commons Codec:

https://commons.apache.org/proper/commons-codec/apidocs/org/apache/commons/codec/language/bm/BeiderMorseEncoder.html

Relevant architecture decision:

- family-name-focused phonetic candidate method;
- evaluate offline before production.

---

# 69. FINAL RECOMMENDATION

The surname resolver should be thought of as a **controlled candidate router**, not a machine that declares surname history.

Its most important output is not:

```text
"these two names are the same"
```

but a structured answer such as:

```text
exact canonical identity
```

or:

```text
accepted modern relation
```

or:

```text
search candidate generated by method X
```

or:

```text
ambiguous — user/reviewer decision required
```

That distinction protects every downstream Name Atlas feature.

The strongest MVP implementation is therefore:

```text
Unicode correctness
+
exact identity
+
accepted NameForms
+
safe Polish morphology
+
bounded trigram/edit suggestions
+
candidate provenance
+
strict no-auto-merge policy
```

before adding broad historical phonetic and cross-script recall.

This provides enough resolution quality to power the first PESEL + Polona vertical slice while preserving the central Name Atlas rule:

> **retrieval may be broad; historical truth must remain evidence-backed.**
