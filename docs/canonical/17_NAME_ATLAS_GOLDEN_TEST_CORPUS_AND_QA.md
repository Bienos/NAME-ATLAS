# NAME ATLAS — GOLDEN TEST CORPUS & QA

**Document:** 17. Golden Test Corpus & QA  
**Version:** 1.0.0 — Launch Quality Baseline  
**Date:** 2026-09-17  
**Market:** Poland first, global-ready  
**Status:** Candidate implementation specification  
**Depends on:** `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md`, `11_NAME_ATLAS_CANONICAL_DATA_MODEL.md`, `12_NAME_ATLAS_SOURCE_CONNECTOR_ARCHITECTURE.md`, `13_NAME_ATLAS_SURNAME_RESOLUTION_ENGINE.md`, `14_NAME_ATLAS_EVIDENCE_AND_CLAIM_ENGINE.md`, `15_NAME_ATLAS_RUNTIME_ORCHESTRATION.md`, `16_NAME_ATLAS_API_AND_FRONTEND_DATA_CONTRACT.md`  
**Next:** `18_NAME_ATLAS_ANALYTICS_AND_EXPERIMENTATION.md`

---

# 0. PURPOSE, AUTHORITY AND QA PHILOSOPHY

This document defines how Name Atlas proves that the architecture described in Documents 10–16 behaves correctly before launch and continues to behave correctly after source, resolver, prompt and policy changes.

The QA system is not designed primarily to prove that Name Atlas handles easy surname lookups.

It is designed to prove that the product knows when **not** to claim something.

The critical expected outcomes include:

```text
AMBIGUOUS
SUGGESTION_REQUIRED
UNRESOLVED
POSSIBLE
UNCONFIRMED
CONFLICTING
INSUFFICIENT_DATA
SOURCE_UNAVAILABLE
RIGHTS_BLOCKED
PREMIUM_NOT_ELIGIBLE
REVIEW_REQUIRED
```

A high-quality Name Atlas result can be:

> **We do not currently have enough evidence.**

That is preferable to a plausible hallucination.

The primary launch safety risks are:

```text
FALSE SURNAME MERGE
UNSUPPORTED FACTUAL CLAIM
FALSE VERIFIED
FAMILY / PERSON OVERREACH
RIGHTS VIOLATION
SOURCE FAILURE → FALSE ABSENCE
DISCOVERY INDEX / PAYWALL MISMATCH
UNAUTHORIZED PREMIUM EXPOSURE
```

---

# 1. EXECUTIVE QA ARCHITECTURE

```text
                       SYSTEM SPEC 10–16
                              │
                              ▼
                        GOLDEN RULES
                              │
                              ▼
                        GOLDEN CORPUS
                              │
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                    ▼
     SOURCE FIXTURES     RESOLUTION CASES     PRODUCT STATES
          │                   │                    │
          ▼                   ▼                    ▼
    CONNECTOR TESTS      RESOLVER TESTS       API/UI TESTS
          │                   │                    │
          └────────────┬──────┴────────────┬───────┘
                       ▼                   ▼
                  EVIDENCE TESTS       RUNTIME TESTS
                       │                   │
                       ▼                   ▼
                    CLAIM QA             E2E
                       │                   │
                       └──────────┬────────┘
                                  ▼
                         LLM EVALUATION
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                    AUTOMATED          HUMAN EXPERT
                       QA                REVIEW
                         └────────┬────────┘
                                  ▼
                             RELEASE GATE
                                  │
                                  ▼
                         PRODUCTION CANARY
                                  │
                                  ▼
                        FAILURE HARVESTING
                                  │
                                  └─────► GOLDEN CORPUS
```

---

# 2. QA LAYERS

## Layer 1 — Schema QA

Tests:

- JSON Schema/Zod validity;
- DB constraints;
- Claim payload schemas;
- API response schemas;
- enum handling.

Blocking:

**Yes.**

A schema-invalid canonical object must never reach production.

---

## Layer 2 — Connector QA

Tests:

- source contract;
- parsing;
- raw preservation;
- rights;
- retries;
- schema drift;
- no-result vs failure.

Blocking:

**Yes for production connector activation.**

---

## Layer 3 — Resolution QA

Tests:

- Unicode;
- exact forms;
- gender forms;
- diacritics;
- typos;
- fuzzy;
- cross-script;
- OCR;
- false merge protection.

Blocking:

**Yes.**

False automatic surname identity is a P0 defect.

---

## Layer 4 — Evidence QA

Tests:

- correct SourceRecord linkage;
- directness;
- raw/normalized values;
- locators;
- independence groups;
- SearchCandidate boundary.

Blocking:

**Yes for affected Claim publication.**

---

## Layer 5 — Claim QA

Tests:

- ClaimType;
- scope;
- evidence requirements;
- structured payload;
- deduplication;
- unsupported inference.

Blocking:

**Yes.**

---

## Layer 6 — Confidence QA

Tests:

- VERIFIED eligibility;
- conflict handling;
- insufficient evidence;
- adjacent confidence-state boundaries.

Blocking:

**Yes for publication.**

---

## Layer 7 — Runtime QA

Tests:

- cache;
- partial results;
- retries;
- idempotency;
- run coalescing;
- worker recovery;
- outbox;
- invalidation.

Blocking:

**Yes for launch-critical workflow.**

---

## Layer 8 — API Contract QA

Tests:

- endpoint schemas;
- error codes;
- 200/202 behavior;
- ETag;
- SSE;
- entitlement;
- premium payload security.

Blocking:

**Yes.**

---

## Layer 9 — Frontend State QA

Tests:

- all public states render;
- unavailable vs processing;
- no fake chapters;
- accessibility;
- report recovery.

Blocking:

P0 for primary flows.

---

## Layer 10 — LLM QA

Tests:

- grounding;
- unsupported claims;
- citation fidelity;
- confidence wording;
- structural validity.

Blocking:

For LLM-generated content that reaches users.

The deterministic product core must still work if LLM QA fails.

---

## Layer 11 — Rights / Privacy QA

Tests:

- commercial-use gates;
- image rights;
- free/premium/SEO surface eligibility;
- private/public cache separation.

Blocking:

**Absolute P0.**

---

## Layer 12 — Product Truthfulness QA

Tests:

- DiscoveryIndex;
- paywall counts;
- free vs premium scope;
- map semantics;
- historical wording;
- no family overreach.

Blocking:

**Absolute P0.**

---

# 3. QA TECHNOLOGY STACK — P0

Recommended stack for the TypeScript architecture selected in Document 15.

## 3.1 Vitest

Use for:

- unit tests;
- domain policy tests;
- resolver tests;
- Claim/Confidence tests;
- contract fixtures;
- module integration tests;
- mocked clock;
- mocked source failures.

Why:

- TypeScript-native;
- compatible with the current application stack;
- mocking support;
- coverage support;
- fast execution.

Official documentation:

`https://vitest.dev/`

---

## 3.2 Testcontainers for Node.js

Use for integration tests requiring real:

```text
PostgreSQL/PostGIS
Redis
```

rather than replacing database semantics with mocks.

Especially important for:

- unique constraints;
- idempotency;
- `ON CONFLICT`;
- transaction behavior;
- outbox;
- advisory locking;
- queue integration.

Official documentation:

`https://node.testcontainers.org/`

---

## 3.3 Playwright

Use for:

- browser E2E;
- SSR;
- navigation;
- SSE behavior;
- checkout/report states;
- multi-tab behavior;
- browser differences.

Run against:

```text
Chromium
Firefox
WebKit
```

with targeted mobile projects.

Official documentation:

`https://playwright.dev/docs/intro`

---

## 3.4 Storybook

Use API-contract fixtures to render every important frontend state.

Use:

- render tests;
- interaction tests;
- a11y addon;
- Vitest integration.

Official docs support interaction tests through stories and automated execution via the Vitest addon.

References:

`https://storybook.js.org/docs/writing-tests/interaction-testing`

`https://storybook.js.org/docs/writing-tests/accessibility-testing`

---

## 3.5 fast-check

Use property-based testing for the resolver and input boundary.

High-value areas:

- Unicode normalization;
- repeated normalization idempotence;
- punctuation;
- combining marks;
- arbitrary strings;
- generated typos;
- no-crash guarantees;
- canonical-key invariants.

Official documentation describes fast-check as property-based testing for JavaScript/TypeScript with random generation and shrinking.

Reference:

`https://fast-check.dev/`

---

## 3.6 k6

Use for:

- API load;
- viral surname scenarios;
- cache-hit ratios;
- run coalescing;
- SSE connection load;
- queue/backpressure.

Official k6 supports local/cloud execution, HTTP workloads, VUs, checks and thresholds.

Reference:

`https://grafana.com/docs/k6/latest/`

---

## 3.7 Pact

**Not P0.**

Reason:

Frontend and backend share the same contract package and generated schemas.

For the current architecture:

```text
shared Zod schemas
+
JSON Schema / OpenAPI
+
producer validation
+
consumer fixtures
+
E2E
```

are simpler.

Re-evaluate consumer-driven contracts only if independent services/teams/native clients create genuine organizational contract drift.

---

# 4. GOLDEN CORPUS PRINCIPLE

Every high-risk golden case must contain both:

```text
EXPECTED
```

and:

```text
FORBIDDEN
```

Example:

```yaml
case_id: RES-DIAC-001
input:
  surname: "Luczak"

expected:
  outcome:
    one_of:
      - RESOLVED
      - SUGGESTION_REQUIRED
  candidate_behavior:
    "Łuczak": MAY_APPEAR

forbidden:
  - SILENT_DIACRITIC_IDENTITY_MERGE_WITHOUT_ACCEPTED_RELATION
  - HISTORICAL_VARIANT_CREATED_FROM_FOLD_ONLY
```

This is substantially stronger than:

```text
expected top result = Łuczak
```

because it protects semantics.

---

# 5. GOLDEN CASE SCHEMA

Recommended YAML format:

```yaml
case_id: RES-TYPO-001
case_version: 1

domain: RESOLUTION
category: TYPO
market: PL

input:
  raw_surname: "Cichwoski"
  locale: pl-PL
  country: PL
  context: {}

fixtures:
  source_fixture_ids: []
  canonical_fixture_id: surname-set-v1

expected:
  resolution:
    outcome: SUGGESTION_REQUIRED
    decision_mode: USER_CONFIRM
    candidate_must_include:
      - display_name: Cichowski
    auto_resolved: false

forbidden:
  - AUTO_MERGE
  - HISTORICAL_VARIANT_ASSERTION

blocking_level: P0

review:
  required_role: ENGINEERING
  reviewed_at: null
```

---

# 6. GOLDEN CASE REQUIRED METADATA

Every case:

```text
case_id
case_version

domain
category
market

input

fixture versions

expected semantic assertions
forbidden assertions

blocking level

created_at
created_by
reviewed_at
reviewed_by

linked_requirements[]
linked_issues[]
notes
```

Never overwrite historical expected behavior silently.

---

# 7. CASE TYPES

## 7.1 Real source-backed

Use when testing:

- PESEL extraction;
- real source scope;
- real historical record;
- source-specific rights.

Expected values come from frozen fixtures, not model memory.

## 7.2 Synthetic surname cases

Use when testing:

- false merge;
- suffix collision;
- candidate generation;
- ambiguous transliteration;
- short strings.

Synthetic cases avoid accidentally asserting false historical relationships about real surnames.

## 7.3 Mutated real strings

Use when testing:

- typos;
- transpositions;
- missing diacritics;
- OCR corruption.

## 7.4 Failure simulations

Use for:

- timeout;
- 429;
- source unavailable;
- rights blocked;
- schema drift.

---

# 8. P0 CORPUS SIZE

Recommended initial repository:

| Corpus | Initial cases |
|---|---:|
| Surname entity seed set | 36 |
| Resolution cases | 160 |
| Connector/source fixtures | 75 |
| Evidence + Claim cases | 125 |
| Confidence-specific cases | 48 |
| Runtime workflow scenarios | 28 |
| API contract states | 24 |
| Frontend golden states | 24 |
| LLM evaluation cases | 60 |
| Full E2E flows | 18 |

These overlap in underlying fixture data.

This is **not** 598 independent surname research projects.

Many tests reuse the same 36 canonical seed entities and source fixtures.

---

# 9. P0 SURNAME ENTITY SEED SET — 36

Purpose:

Provide stable canonical entities against which generated resolution/evidence cases are tested.

The corpus should contain a mixture of real modern surnames and synthetic entities.

No historical/origin claims are implied merely by inclusion.

## 9.1 Real modern anchor forms

Use current approved PESEL fixture to establish existence before freezing the corpus.

Proposed candidates:

```text
Nowak
Kowalski
Kowalska
Wiśniewski
Wiśniewska
Wójcik
Kamiński
Kamińska
Lewandowski
Lewandowska
Zieliński
Zielińska
Szymański
Szymańska
Dąbrowski
Dąbrowska
Król
Łuczak
Luczak
Cichowski
Cichowska
Żuk
Mazur
Kaczmarek
Schmidt
Müller
```

Important:

- the fixture, not this document, determines whether both diacritic/non-diacritic forms are independent current entities;
- gender pair acceptance is fixture policy, not assumed solely from suffix.

## 9.2 Compound/particle fixtures

Use real or approved synthetic:

```text
Kowalska-Nowak
Skarbek-Malczewski
de Testa               # synthetic if needed
van der Test            # synthetic
```

## 9.3 Cross-script synthetic fixtures

Use clearly synthetic canonical entities to avoid asserting real-world equivalence:

```text
TEST-CYRL-A
TEST-CYRL-B
```

with source/display strings stored in Latin/Cyrillic fixture fields.

## 9.4 Short-name synthetic fixtures

```text
AX
AY
```

These stress edit-distance collisions without real-person implications.

---

# 10. RESOLUTION CORPUS — 160 CASES

Recommended breakdown:

| Category | Count |
|---|---:|
| Exact canonical | 15 |
| Exact accepted NameForm | 10 |
| Case/NFC normalization | 10 |
| Polish diacritic retrieval | 15 |
| Accepted gender form | 10 |
| False gender derivation negatives | 10 |
| Compound/hyphenated | 8 |
| Prefix/particle | 6 |
| Ordinary typo | 12 |
| Adjacent transposition | 8 |
| Short surname collision | 8 |
| Similar-but-unrelated | 12 |
| Multiple plausible candidates | 8 |
| Generated transliteration | 8 |
| Historical DE/PL candidate | 6 |
| OCR candidate | 8 |
| Mixed-script/confusable | 4 |
| Unknown/unresolved | 2 |

Total: **160**.

At least:

```text
40%
```

should be negative/ambiguous/must-not-auto-resolve cases.

---

# 11. RESOLUTION ASSERTIONS

Each case tests:

```text
ResolutionOutcome
ResolutionMatchType
DecisionMode

resolved_surname_id
resolved_name_form_id

auto_resolved
user_confirmation_required
human_review_required

candidate inclusion
candidate exclusion
candidate tier ordering

generated candidate provenance
```

Do not evaluate only top-1 string.

---

# 12. RESOLUTION METRICS

Measure:

```text
Exact resolution precision
Accepted NameForm precision
Top-1 candidate accuracy
Top-3 candidate recall

False auto-resolve rate
False merge rate
Ambiguous auto-resolve rate

Unresolved rate

Diacritic candidate recall
Gender-form precision
Cross-script recall
OCR candidate recall
```

## Launch priority

```text
FALSE MERGE RATE
FALSE AUTO-RESOLVE RATE
```

are more important than maximizing fuzzy recall.

---

# 13. RESOLUTION P0 HARD FAILS

Any golden-case occurrence blocks release:

```text
FUZZY_CANDIDATE → AUTO
```

```text
PHONETIC_ONLY → AUTO
```

```text
OCR_CANDIDATE → ACCEPTED HISTORICAL FORM
```

```text
AMBIGUOUS → SILENT AUTO-RESOLUTION
```

```text
EXACT ENTITY displaced by more frequent fuzzy entity
```

```text
MIXED-SCRIPT CONFUSABLE silently normalized into another identity
```

```text
SEARCH_CANDIDATE persisted as attested historical form without evidence
```

---

# 14. PROPERTY-BASED RESOLUTION TESTS

Use fast-check.

Properties:

## P1 — normalization idempotence

```text
normalize(normalize(x)) == normalize(x)
```

for valid supported strings.

## P2 — NFC equivalence

Canonically equivalent Unicode representations produce same identity key.

## P3 — display preservation

Diacritic search folding never mutates stored display input.

## P4 — no crash

For arbitrary Unicode input under allowed operational length:

```text
resolver returns typed outcome
```

never unhandled exception.

## P5 — exact precedence

If exact canonical entity exists:

```text
lower-tier fuzzy candidate cannot become selected result
```

## P6 — candidate provenance

Every generated candidate has method/version provenance.

---

# 15. CONNECTOR FIXTURE STANDARD

Every source connector implements common fixtures:

```text
VALID_RECORD
VALID_EMPTY_RESPONSE
RATE_LIMIT
TIMEOUT
PROVIDER_5XX
AUTH_ERROR
SCHEMA_CHANGED
MISSING_REQUIRED_FIELD
UNKNOWN_ENUM
INVALID_DATE
INVALID_COORDINATE
RIGHTS_OPEN
RIGHTS_RESTRICTED
RIGHTS_UNKNOWN
DUPLICATE_EXACT
POSSIBLE_DUPLICATE
WITHDRAWN_RECORD
UNICODE_RECORD
```

Archive/OCR additionally:

```text
OCR_EXACT
OCR_LOW_CONFIDENCE
OCR_FALSE_POSITIVE
PAGE_LOCATOR
HYPHENATED_LINEBREAK
COLUMN_MERGE
```

---

# 16. CONNECTOR CONTRACT ASSERTIONS

For every connector:

- raw provider value preserved;
- SourceRecord created deterministically;
- rights attached;
- version recorded;
- `NO_RESULT` differs from failure;
- schema drift fails closed;
- source IDs preserved;
- duplicate handling deterministic;
- retry classification correct.

---

# 17. PESEL FIXTURES

Minimum fixture cases:

```text
PESEL-NORMAL-001
PESEL-GENDER-SPLIT-001
PESEL-ABSENT-001
PESEL-SUPPRESSED-001
PESEL-NEW-SNAPSHOT-001
PESEL-SCHEMA-CHANGE-001
PESEL-DUPLICATE-ROW-001
PESEL-INVALID-COUNT-001
PESEL-UNICODE-001
```

Assertions:

```text
SUPPRESSED ≠ ZERO
```

```text
new snapshot does not overwrite old snapshot
```

```text
rank uses snapshot universe
```

```text
regional distribution is not fabricated
```

---

# 18. PLACE FIXTURES

TERYT/GUS/place layer:

```text
PLACE-EXACT-001
PLACE-SAME-NAME-001
PLACE-AMBIGUOUS-001
PLACE-MISSING-001
PLACE-HIERARCHY-001
PLACE-HISTORIC-CURRENT-001
PLACE-REGION-ONLY-001
```

Hard rule:

```text
region-only evidence
→ no fake exact point
```

---

# 19. POLONA FIXTURES

Minimum:

```text
POLONA-METADATA-001
POLONA-OCR-EXACT-001
POLONA-OCR-TYPO-001
POLONA-PAGE-LOCATOR-001
POLONA-PUBLIC-DOMAIN-001
POLONA-IMAGE-RESTRICTED-001
POLONA-METADATA-ONLY-001
POLONA-DUPLICATE-EUROPEANA-001
POLONA-TIMEOUT-001
POLONA-NO-RESULT-001
```

Assertions:

```text
OCR hit does not become variant automatically
```

```text
metadata rights do not imply image rights
```

```text
Europeana mirror does not create independent occurrence
```

---

# 20. RIGHTS CORPUS

Cases:

```text
RIGHTS-FULLY-OPEN
RIGHTS-ATTRIBUTION
RIGHTS-METADATA-OPEN-IMAGE-BLOCKED
RIGHTS-COMMERCIAL-UNKNOWN
RIGHTS-NONCOMMERCIAL
RIGHTS-AUTOMATION-PROHIBITED
RIGHTS-PARTNERSHIP-REQUIRED
RIGHTS-EXPIRED
RIGHTS-CHANGED-AFTER-CLAIM
```

Assert eligibility independently for:

```text
INTERNAL_RESEARCH
FREE_UI
PAID_REPORT
SEO
SHARE
IMAGE_REPRODUCTION
```

---

# 21. RIGHTS P0 HARD FAILS

```text
commercial_use UNKNOWN
+
paid report contains evidence
→ FAIL
```

```text
image_rights PROHIBITED
+
report embeds image
→ FAIL
```

```text
automated_access PROHIBITED
+
connector executes automatically
→ FAIL
```

```text
rights change blocks item
+
cached premium projection still exposes it
→ FAIL
```

---

# 22. EVIDENCE / CLAIM CORPUS — 125 CASES

Recommended breakdown:

| Category | Count |
|---|---:|
| Official direct facts | 10 |
| Derived statistics | 10 |
| Direct historical occurrences | 12 |
| OCR uncertain occurrences | 10 |
| Historical variant supported | 8 |
| Historical variant false-positive traps | 12 |
| Single specialist interpretation | 8 |
| Independent corroboration | 6 |
| Duplicated/copied sources | 8 |
| Conflicting interpretations | 10 |
| Geography scope | 8 |
| Negative-evidence scenarios | 8 |
| Rights-blocked evidence | 6 |
| Earliest-found semantics | 5 |
| Family/person overreach | 4 |

Total: **125**.

---

# 23. EVIDENCE ITEM ASSERTIONS

Every evidence case may test:

```text
EvidenceType
EvidenceDirectness
verification_status

SourceRecord link
raw_value
normalized_value
locator

rights_profile_id
independence_group_id

extraction_method
extraction_version
```

---

# 24. SEARCH CANDIDATE BOUNDARY

Golden invariant:

```text
SearchCandidate
≠
EvidenceItem
```

Tests:

- fuzzy candidate appears;
- historical source search uses candidate;
- result found;
- candidate itself is not evidence;
- source hit can become evidence;
- historical form relation still requires Claim policy.

---

# 25. CLAIM CORPUS

For each major ClaimType, minimum cases:

```text
VALID
INSUFFICIENT
CONTRADICTED
SCOPE_MISMATCH
RIGHTS_BLOCKED
```

P0 ClaimTypes:

```text
CURRENT_POPULATION
CURRENT_RANK
RARITY_CONTEXT
CURRENT_DISTRIBUTION

LINGUISTIC_ORIGIN
GEOGRAPHIC_ORIGIN
ROOT_MEANING

HISTORICAL_OCCURRENCE
HISTORICAL_FORM_ATTESTED
HISTORICAL_FORM_RELATION
EARLIEST_FOUND_OCCURRENCE
HISTORICAL_PLACE_ASSOCIATION

MIGRATION_PATTERN
ARCHIVE_REFERENCE_EXISTS
```

---

# 26. CLAIM VALIDATION HARD FAILS

```text
Claim has no support EvidenceItem
→ FAIL
```

except explicit system/data-gap class.

```text
Claim Evidence ID missing
→ FAIL
```

```text
SURNAME_LEVEL evidence
→ FAMILY_LEVEL FACT
→ FAIL
```

```text
SearchCandidate used as SUPPORTS
→ FAIL
```

```text
structured payload violates ClaimType schema
→ FAIL
```

```text
historical occurrence place unresolved but rendered as exact locality
→ FAIL
```

---

# 27. CONFIDENCE GOLD SET — 48 CASES

Eight cases for each:

```text
VERIFIED
LIKELY
POSSIBLE
UNCONFIRMED
CONFLICTING
INSUFFICIENT_DATA
```

Design adjacent-boundary pairs.

Example:

```text
single specialist source explicitly states interpretation
vs
same source + independent historical corroboration
```

Use expert-reviewed expectations.

---

# 28. FALSE VERIFIED CORPUS

Mandatory cases:

1. one fuzzy match;
2. one uncertain OCR hit;
3. suffix-based linguistic guess;
4. current concentration used as origin;
5. one community page;
6. copied sources;
7. unresolved place;
8. incomplete archive search;
9. generated transliteration;
10. model-only inference.

None may become `VERIFIED`.

---

# 29. SOURCE INDEPENDENCE TESTS

Fixture:

```text
Primary object P
├── Polona
├── FBC
├── Europeana
└── secondary website copy
```

Expected:

```text
independence groups = 1
```

unless genuinely independent upstream records exist.

Do not calculate confidence from URL count.

---

# 30. CONFLICT CORPUS

Types:

```text
VALUE_CONFLICT
TEMPORAL_DIFFERENCE_NOT_CONFLICT
SOURCE_SCOPE_CONFLICT
INTERPRETATION_CONFLICT
ENTITY_RESOLUTION_CONFLICT
GEOGRAPHIC_CONFLICT
TRANSCRIPTION_CONFLICT
```

Expected behavior differs.

Example:

```text
2025 population N1
2026 population N2
```

is normally a temporal snapshot difference, not `CONFLICTING`.

---

# 31. CONFLICT PRESERVATION HARD RULE

If two credible specialist interpretations disagree materially:

```text
both Claims remain
+
ClaimGroup / conflict relation exists
+
presentation exposes disagreement
```

Forbidden:

```text
LLM selects cleaner story without policy/evidence
```

---

# 32. EARLIEST-FOUND CORPUS

Test:

```text
one corpus searched
three corpora searched
one source unavailable
broad candidate tier not searched
older result later discovered
```

Expected semantics:

```text
EARLIEST_FOUND_OCCURRENCE
```

always linked to research scope.

Forbidden phrases:

```text
first bearer
first person
surname originated in YEAR
first ever
```

---

# 33. NEGATIVE EVIDENCE CORPUS

Cases:

| Scenario | Expected |
|---|---|
| successful exhaustive source returns zero | scoped no-result may be meaningful |
| source timeout | SOURCE_UNAVAILABLE |
| source blocked by rights | RIGHTS_BLOCKED |
| source not queried | NOT_RESEARCHED |
| source has no relevant coverage | NOT_SUPPORTED / coverage gap |
| incomplete query expansion | NO_EVIDENCE_FOUND only within stated query scope |
| suppressed official value | SUPPRESSED, not zero |

---

# 34. GEOGRAPHIC TRUTH CORPUS

Distinct map semantics:

```text
CURRENT_DISTRIBUTION
DATED_DISTRIBUTION
HISTORICAL_OCCURRENCES
HISTORICAL_DISTRIBUTION
MIGRATION_HYPOTHESIS
```

Test that each has:

- correct label;
- time scope;
- source type;
- coverage caveat.

---

# 35. ARCHIVE OCCURRENCE MAP TRAP

Fixture:

```text
Kraków: 37 indexed hits
Poznań: 21 indexed hits
```

Allowed:

> More indexed occurrences were found in Kraków in this searched corpus.

Forbidden:

> The surname population was highest in Kraków.

unless representative population evidence exists.

---

# 36. FAMILY OVERREACH CORPUS

Input evidence:

```text
surname X appears in parish Y in 1880
```

Allowed:

```text
surname occurrence in parish Y
```

Forbidden:

```text
your family lived in Y
your ancestors came from Y
```

---

# 37. PERSON OVERREACH CORPUS

Input:

```text
historic person has same surname
```

Forbidden:

```text
this is your ancestor
this person is related to you
```

No exception in surname-only workflow.

---

# 38. HERALDRY CORPUS

Fixture:

```text
historical heraldic source
+
family bearing surname X
+
coat of arms Y
```

Allowed:

> A family bearing surname X appears in source Y in a heraldic context.

Mandatory qualifier:

> This does not establish that every bearer of surname X belongs to that family.

Forbidden:

```text
your coat of arms is Y
you are descended from nobility
```

---

# 39. MIGRATION CORPUS

Input:

```text
surname occurrence clusters shift across periods
```

Allowed:

```text
POSSIBLE / LIKELY surname-level migration pattern
```

Forbidden:

```text
your ancestors migrated along this route
```

---

# 40. COVERAGE / LOW-DATA CORPUS

Cases:

```text
COUNT_ONLY
COUNT_PLUS_RARITY
COUNT_PLUS_ORIGIN_NO_HISTORY
HISTORY_NO_ETYMOLOGY
NO_CURRENT_MAP
HISTORY_SOURCE_DOWN
NO_PREMIUM_INVENTORY
RIGHTS_BLOCKED_PREMIUM
```

Expected:

- shorter honest profile;
- unavailable chapters omitted/qualified;
- premium disabled where value threshold fails.

---

# 41. DISCOVERY INDEX CORPUS

Test object categories:

```text
historical variants
historical places
historical occurrences
archive references
migration clues
sources
```

Every count checks:

```text
deduplicated
validated
confidence-eligible
surface-rights eligible
category-correct
```

---

# 42. DISCOVERY INDEX HARD FAILS

```text
10 OCR generated candidates
→ DiscoveryIndex variants = 10
→ FAIL
```

```text
same archive record via 3 aggregators
→ archive references = 3
→ FAIL unless semantically distinct references
```

```text
rights-blocked evidence counted in paid inventory
→ FAIL
```

---

# 43. PAYWALL TRUTHFULNESS

For every dynamic marketing claim:

```text
UI value
==
DiscoveryIndex / Offer eligibility value
```

Example:

```text
"8 historical variants"
```

requires:

```text
eligible historical_variants = 8
```

No client approximation.

---

# 44. PREMIUM ELIGIBILITY CORPUS

Cases:

```text
RICH_ELIGIBLE
STANDARD_ELIGIBLE
LIMITED_NOT_ELIGIBLE
MINIMAL_NOT_ELIGIBLE
RIGHTS_BLOCKED
RESEARCH_STILL_RUNNING
UNCONFIRMED_ONLY
ONE_CATEGORY_ONLY
```

Expected output:

```text
eligible
state/reason
```

No “always show paywall” behavior.

---

# 45. RUNTIME WORKFLOW CORPUS — 28

Recommended scenarios:

```text
RUN-001 CACHE_HIT_RICH
RUN-002 CACHE_HIT_LOW_DATA
RUN-003 CACHE_HIT_STALE_SERVABLE
RUN-004 CACHE_STALE_BLOCKING
RUN-005 CACHE_MISS_COMMON_PL
RUN-006 CACHE_MISS_RARE_PL

RUN-007 SURNAME_SUGGESTION_REQUIRED
RUN-008 SURNAME_AMBIGUOUS
RUN-009 SURNAME_UNRESOLVED

RUN-010 PESEL_SUPPRESSED
RUN-011 PESEL_UNAVAILABLE
RUN-012 CURRENT_MAP_UNAVAILABLE

RUN-013 HISTORY_RICH
RUN-014 HISTORY_ZERO_VALID_RESULT
RUN-015 POLONA_TIMEOUT
RUN-016 POLONA_SCHEMA_CHANGED

RUN-017 ONOMASTICS_UNAVAILABLE
RUN-018 CONFLICTING_ORIGIN
RUN-019 RIGHTS_BLOCKED_PREMIUM
RUN-020 LLM_UNAVAILABLE

RUN-021 QA_BLOCKED_CLAIM
RUN-022 HUMAN_REVIEW_REQUIRED

RUN-023 DUPLICATE_CONCURRENT_SEARCH
RUN-024 WORKER_REDELIVERY
RUN-025 WORKER_CRASH_AFTER_WRITE
RUN-026 OUTBOX_QUEUE_DOWN

RUN-027 SOURCE_VERSION_REFRESH
RUN-028 RIGHTS_CHANGE_INVALIDATION
```

---

# 46. CACHE TESTS

Profile state:

```text
FRESH
STALE_SERVABLE
STALE_BLOCKING
DIRTY
MISSING
```

Assertions:

- stale source date preserved;
- stale data never relabeled as newer;
- rights invalidation cannot be stale-served if surface is blocked;
- fresh cache avoids unnecessary ResearchRun.

---

# 47. STALE-WHILE-REVALIDATE

Scenario:

```text
old current snapshot valid for display
new source snapshot available
```

Expected:

```text
old dated profile returned
+
refresh scheduled
+
new profile_version later
```

No blank page while refresh runs.

---

# 48. RUN COALESCING

Load/integration scenario:

```text
100 simultaneous searches
same canonical surname
same plan/source state
```

Expected:

```text
one active shared canonical ResearchRun
```

with session responses pointing to the same run or equivalent shared state.

Assertions:

- no 100x Polona requests;
- no duplicate Claims;
- all sessions converge to same profile version.

---

# 49. IDEMPOTENCY

Repeat operations:

```text
same ResearchModuleRun job
same SourceRecord ingest
same Evidence extraction
same Claim builder
same DiscoveryIndex rebuild
same checkout Idempotency-Key
```

Expected:

```text
semantic state unchanged
```

No duplicates.

---

# 50. WORKER CRASH

Crash point:

```text
Claim committed
before BullMQ ACK
```

Retry must:

1. load module state;
2. detect successful canonical output;
3. avoid duplicate Claim;
4. mark/ack safely.

---

# 51. OUTBOX

Scenario:

```text
ResearchRun committed
Redis unavailable
```

Expected:

```text
outbox record pending
```

After Redis recovery:

```text
dispatcher publishes
module executes
```

No orphaned ResearchRun.

---

# 52. RETRY MATRIX TESTS

## 429

Expected:

- bounded retry;
- provider retry/backoff observed;
- no retry storm.

## 500

Bounded retry.

## timeout

Bounded retry/circuit accounting.

## `SCHEMA_CHANGED`

No blind retry.

## `RIGHTS_BLOCKED`

No retry.

## invalid LLM JSON

bounded repair retry.

---

# 53. CIRCUIT BREAKER

Simulate repeated provider failures.

Expected:

```text
CLOSED
→ OPEN
```

While OPEN:

- new ResearchPlans see provider unavailable;
- no provider hammering;
- safe partial result.

Probe:

```text
HALF_OPEN
```

after policy delay.

---

# 54. PARTIAL RESULT TESTS

Fixture:

```text
PESEL = SUCCESS
cached origin = SUCCESS
Polona = TIMEOUT
```

Expected:

```text
run = PARTIAL_READY / READY depending plan terminal policy
readiness = FREE_READY
history dimension = SOURCE_UNAVAILABLE
```

Forbidden:

```text
No historical records exist
```

---

# 55. LLM EVALUATION CORPUS — 60

Recommended:

| Task | Cases |
|---|---:|
| Onomastic evidence extraction | 15 |
| Origin synthesis | 12 |
| Conflict explanation | 8 |
| Free narrative | 10 |
| Premium narrative | 10 |
| QA / fact checker | 5 |

Every case includes:

```text
evidence bundle
allowed propositions
required propositions
forbidden propositions
expected confidence wording
required citation IDs
```

---

# 56. LLM EVAL DIMENSIONS

Do not collapse into one score.

Evaluate:

```text
JSON/schema validity
Evidence-ID validity
Groundedness
Required fact coverage
Unsupported claim count
Scope fidelity
Uncertainty preservation
Citation fidelity
Entity fidelity
Date fidelity
Place fidelity
Forbidden wording
```

---

# 57. UNSUPPORTED CLAIM RATE

Definition:

```text
number of factual propositions not supported by supplied Claims/Evidence
/
all factual propositions
```

For production generated narrative:

> unsupported factual claims are launch blockers, not a style issue.

---

# 58. LLM SPARSE-EVIDENCE TEST

Input:

```text
CURRENT_POPULATION only
```

Ask free-summary generator.

Allowed:

- population;
- dataset scope/date;
- rarity if supplied.

Forbidden:

- surname meaning;
- geographic origin;
- migration;
- historical variant;
- famous ancestor;
- heraldry.

---

# 59. SOURCE INVENTION

Evidence bundle:

```text
Source A
Source B
```

Model output:

```text
According to Source C…
```

Expected:

```text
QA FAIL
```

---

# 60. DATE INVENTION

Evidence:

```text
19th century
```

Output:

```text
1843
```

without source date.

Expected:

```text
QA FAIL
```

---

# 61. PLACE INVENTION

Evidence:

```text
region-level association
```

Output:

```text
exact village
```

Expected:

```text
QA FAIL
```

---

# 62. CONFIDENCE INFLATION

Canonical Claim:

```text
POSSIBLE
```

Forbidden prose:

```text
was
definitely
certainly
clearly originated
```

unless language remains scoped to a directly verified subfact.

---

# 63. CONFLICT ERASURE

Input:

```text
Origin Claim A = LIKELY
Origin Claim B = POSSIBLE
ClaimGroup = ALTERNATIVES
```

Output must preserve B.

It cannot write:

```text
The surname originated from A.
```

without acknowledging alternative evidence.

---

# 64. LLM JUDGE POLICY

An LLM-as-judge may assist with:

- wording quality;
- semantic comparison;
- broad groundedness triage.

It may **not** be the sole judge for:

- citation existence;
- Claim IDs;
- rights;
- source lineage;
- family relationship;
- historical accuracy.

Deterministic validators and human gold remain authoritative.

---

# 65. PROMPT REGRESSION

Every approved prompt change runs old vs candidate across fixed eval corpus.

Block rollout if candidate increases:

```text
unsupported_claim_count
confidence_inflation
citation_error
family_overreach
forbidden wording
schema failure
```

A prettier response does not compensate for worse grounding.

---

# 66. API CONTRACT CORPUS — 24 STATES

```text
API-001 SEARCH_EXACT_CACHE_HIT
API-002 SEARCH_EXACT_RESEARCH_STARTED
API-003 SEARCH_SUGGESTION
API-004 SEARCH_MULTIPLE_CANDIDATES
API-005 SEARCH_UNRESOLVED
API-006 SEARCH_INVALID

API-007 PROFILE_FREE_READY
API-008 PROFILE_ENRICHING
API-009 PROFILE_LOW_DATA
API-010 PROFILE_NO_MAP
API-011 PROFILE_SOURCE_UNAVAILABLE
API-012 PROFILE_CONFLICTING_ORIGIN
API-013 PROFILE_PREMIUM_ELIGIBLE
API-014 PROFILE_PREMIUM_INELIGIBLE
API-015 PROFILE_RIGHTS_BLOCKED

API-016 RESEARCH_RUN_ACTIVE
API-017 RESEARCH_RUN_PARTIAL_READY
API-018 SSE_REPLAY
API-019 SSE_REFRESH_REQUIRED
API-020 ETAG_304

API-021 REPORT_GENERATING
API-022 REPORT_READY
API-023 REPORT_NO_ENTITLEMENT
API-024 REPORT_FAILED
```

---

# 67. API SCHEMA QA

For every fixture:

- Zod parse passes;
- generated JSON Schema validates;
- OpenAPI example validates;
- frontend imported type accepts fixture.

Backend integration tests should parse the actual response through the **same public schema** before sending in test environment.

---

# 68. API BACKWARD COMPATIBILITY

CI evaluates changes for:

```text
field removal
required-field addition
type change
enum semantic change
endpoint removal
status code behavior change
```

Additive optional property is usually non-breaking.

Enum expansion requires explicit frontend compatibility review because exhaustive TypeScript switches can break semantically even when JSON remains valid.

---

# 69. SEARCH API TESTS

Test:

```text
POST exact cache hit → 200
POST exact uncached → 202
POST suggestion → 200
POST unresolved → 200
PUT resolution confirmation → deterministic result
```

Do not use top-level errors for expected ambiguity.

---

# 70. PROFILE CONTRACT TESTS

Test:

- suppressed count;
- no map;
- processing history;
- conflicting origin;
- citations;
- premium false;
- premium eligible;
- chapter omission.

No unavailable chapter may contain invented placeholder content.

---

# 71. SSE CORPUS

Cases:

```text
connect
named event
event ID
profile.updated
dimension.updated
research.failed
disconnect
automatic reconnect
Last-Event-ID
replay available
replay expired
state.refresh_required
```

Final authority after event:

```text
refetch REST resource
```

not event-patched client truth.

---

# 72. SSE DEPLOYMENT TEST

Test through actual staging:

```text
browser
→ CDN/proxy
→ Next.js BFF
→ stream
```

Verify no unwanted buffering.

Local EventSource success is insufficient.

---

# 73. POLLING FALLBACK

Disable SSE.

Frontend:

```text
GET ResearchRun
If-None-Match
```

Unchanged:

```text
304
```

Changed:

```text
200 updated state
```

Final profile must match SSE path.

---

# 74. HTTP CACHE TESTS

Assertions:

```text
public profile ETag changes only when representation changes
```

```text
If-None-Match correct → 304
```

```text
premium report not publicly cacheable
```

```text
checkout = no-store
```

```text
family/private future projection never receives public cache header
```

---

# 75. PREMIUM SECURITY TESTS

Attempt:

1. inspect free profile response;
2. modify frontend state to premium;
3. remove blur CSS;
4. manually request report ID;
5. enumerate nearby report IDs;
6. replay stale entitlement token;
7. use another user's session;
8. direct-call report endpoint;
9. CDN cache probe.

Expected:

> full premium body remains inaccessible without server authorization.

---

# 76. ENTITLEMENT HARD RULE

Choose canonical unauthorized behavior for P0:

```http
403 Forbidden
```

for known authenticated/session report resource lacking entitlement.

For resources whose existence itself should be concealed later, security policy may intentionally return 404.

P0 tests should use one explicit rule, not inconsistent behavior.

---

# 77. FRONTEND GOLDEN STATES — 24

Storybook/API fixtures:

```text
UI-001 Search Idle
UI-002 Search Submitting
UI-003 Typo Suggestion
UI-004 Multiple Candidates
UI-005 Unresolved

UI-006 Free Core Loading
UI-007 Free Core Ready
UI-008 Enriching History
UI-009 Population Suppressed
UI-010 No Current Map
UI-011 History Source Down
UI-012 Low Data

UI-013 Origin Verified/strong fact where valid
UI-014 Origin Likely
UI-015 Origin Possible
UI-016 Origin Conflicting
UI-017 Insufficient Origin Data

UI-018 Discovery Processing
UI-019 Premium Eligible
UI-020 Premium Ineligible

UI-021 Report Researching
UI-022 Report Generating
UI-023 Report Ready
UI-024 Report Failed
```

---

# 78. STORYBOOK POLICY

Stories must use real shared DTO fixture files.

Bad:

```text
designer invents "historical_count: 12"
```

Good:

```text
fixture PROFILE_PREMIUM_ELIGIBLE.json
```

shared between:

- backend contract tests;
- Storybook;
- Playwright where useful.

---

# 79. FRONTEND INTERACTION TESTS

Storybook interaction tests:

- select resolver suggestion;
- expand citation;
- switch origin hypothesis;
- retry recoverable state;
- open premium preview;
- report state changes.

Use Storybook play functions / Vitest integration.

---

# 80. ACCESSIBILITY QA

Automated:

- Storybook a11y;
- Playwright + axe where selected;
- semantic headings;
- labels;
- focus.

Manual:

- keyboard;
- screen reader flow;
- map fallback;
- dynamic SSE announcements.

No status may depend solely on:

```text
red / amber / green
```

Confidence must have text semantics.

---

# 81. MOBILE QA

Viewport states:

```text
small iPhone-class width
large mobile
tablet
desktop
```

Critical flows:

- surname resolution options;
- chapter navigation;
- map fallback;
- evidence expansion;
- paywall;
- report.

No hover-only access.

---

# 82. BROWSER QA

P0:

```text
Chromium current
Firefox current
WebKit current
iOS Safari current supported range
Android Chrome current supported range
```

Playwright can cover Chromium/Firefox/WebKit in automation.

Supplement with targeted real-device Safari/mobile smoke testing before release.

---

# 83. SSR / SEO QA

Test server-rendered HTML contains:

- surname identity;
- meaningful approved free content;
- canonical URL;
- correct indexability.

Forbidden:

```text
empty spinner-only HTML
```

Crawler request must not create deep ResearchRun.

---

# 84. SEO THIN CONTENT

Case:

```text
profile has only minimal population data
```

SEO qualification policy decides:

```text
NOINDEX
```

or limited page.

Do not use LLM to create artificial text volume.

---

# 85. SLUG QA

Test:

```text
diacritics
case
old slug redirect
compound surname
collision
```

API ID remains stable.

---

# 86. REPORT IMMUTABILITY

Generate ReportVersion V1.

Add new evidence.

Expected:

```text
V1 unchanged
```

New generation:

```text
V2
```

No silent mutation.

---

# 87. REPORT AUTHORIZATION

Playwright/API tests:

- owner entitlement;
- no entitlement;
- expired magic session;
- different session;
- direct route;
- refresh.

No premium content flash during auth check.

---

# 88. REPORT FAILURE RECOVERY

Purchase/entitlement exists.

Report worker fails.

Expected:

- entitlement remains;
- report state FAILED/RETRYING according to implementation;
- user not reprompted for payment;
- rerun idempotent.

---

# 89. SOURCE VERSION REGRESSION

When PESEL snapshot changes:

Expected invalidation:

```text
CURRENT_POPULATION
CURRENT_RANK
RARITY_CONTEXT
current profile
SEO current values
```

Expected **no unnecessary invalidation**:

```text
historical Polona occurrences
```

unless another dependency changed.

---

# 90. RESOLVER VERSION REGRESSION

New resolver:

- run all 160 resolver cases;
- compare changed outcomes;
- require explicit review of every auto-resolution change.

Any new entity merge requires dedicated approval.

---

# 91. CONFIDENCE POLICY REGRESSION

New confidence policy:

Run all Confidence + Evidence corpus.

Review transitions:

```text
POSSIBLE → LIKELY
LIKELY → VERIFIED
CONFLICTING → non-conflicting
INSUFFICIENT_DATA → positive
```

Upward changes deserve more scrutiny than downward changes.

---

# 92. RIGHTS CHANGE REGRESSION

Simulate:

```text
commercial_use ALLOWED → PROHIBITED
```

Expected:

- new SurfaceEligibility;
- premium projection invalidated;
- SEO/share invalidated where relevant;
- image removed;
- Claim may remain internally if lawful.

---

# 93. DATABASE INTEGRATION

Use Testcontainers for real PostgreSQL/PostGIS and Redis.

Must test:

```text
unique constraints
transactions
outbox
ON CONFLICT
run coalescing
advisory lock behavior if used
claim/evidence FK integrity
report immutability constraints
```

Do not mock database semantics for these tests.

---

# 94. DATA MIGRATION TESTS

Every material migration runs against representative prior-schema fixture DB.

Verify:

- Claims survive;
- provenance survives;
- ResearchRuns survive;
- ReportVersion remains readable;
- rights IDs remain valid;
- canonical redirects remain valid.

---

# 95. LOAD TESTING

Use k6.

Test separately:

## Public profile read

Mostly cache hits.

## Search mutation

Resolved cache hits vs cache misses.

## ResearchRun status polling.

## Popular surname spike.

## SSE connection scale.

## Report read.

Do not load-test real third-party providers aggressively.

Connector external calls should be stubbed or use controlled test environments for load.

---

# 96. VIRAL SURNAME LOAD SCENARIO

Example workload model:

```text
one surname receives majority of traffic
```

Assertions:

- profile cache serves majority;
- one active deep shared run;
- source API call volume bounded;
- DB lock/coalescer stable;
- SSE subscribers do not create research jobs.

---

# 97. MIXED WORKLOAD

Illustrative test class:

```text
mostly cached public reads
some search resolutions
small percentage cache misses
small historical enrichment queue
```

Do not freeze percentages until real analytics exist.

The load model in test config is explicitly marked synthetic.

---

# 98. PERFORMANCE METRICS

Collect:

```text
API p50/p95/p99
time to FREE_READY
profile cache hit rate
run coalescing ratio
DB latency
queue wait
SSE connected clients
worker throughput
```

Do not set arbitrary final SLOs before baseline benchmark.

---

# 99. COST REGRESSION

For the same frozen workflow fixture, record:

```text
connector call count
LLM call count
input/output tokens
OCR pages
pages fetched
jobs executed
```

Flag unexplained increases.

Example:

```text
candidate prompt version doubles LLM calls
```

should fail review even if prose quality improves slightly.

---

# 100. PRIVACY QA

P0 assertions:

- public surname projection not user-specific;
- no user email in public profile;
- generic analytics does not include future family input;
- premium report not cached publicly;
- logs redact tokens;
- error response contains no partner payload.

---

# 101. SECURITY QA

P0 checklist:

```text
IDOR
broken entitlement
CSRF
XSS
CORS
rate-limit bypass
SSE access
cache poisoning
magic-link leakage
oversized payload
Unicode control abuse
slug injection
```

Security testing does not replace separate security review in Prompt 19.

---

# 102. INPUT FUZZING

Use property-based/fuzz tests for:

```text
Unicode controls
zero-width characters
mixed scripts
emoji
combining marks
very long strings
HTML
SQL-looking text
slashes
apostrophes
hyphens
RTL controls
invalid byte/transport cases where applicable
```

Expected:

- typed validation outcome;
- no crash;
- no injection;
- no unsafe log rendering.

---

# 103. CONTENT INJECTION

Fixture generated narrative:

```text
<script>alert(1)</script>
```

Expected:

- treated as text/structured content;
- never executed.

Source title/archival text can contain markup-like characters and receives the same treatment.

---

# 104. HUMAN REVIEW GOLD SET

Automated QA is insufficient for all semantic boundaries.

P0 expert-review subset:

```text
20 onomastic cases
20 historical/genealogy cases
10 rights cases
10 conflict/confidence cases
```

Some cases can overlap.

---

# 105. ONOMASTICS EXPERT REVIEW

Review:

- morphology;
- gender forms;
- etymology wording;
- competing interpretations;
- toponymic overreach;
- DE/PL candidate logic.

The expert approves **test expectations**, not generated marketing copy alone.

---

# 106. GENEALOGIST REVIEW

Review:

- historical occurrences;
- archive locator use;
- earliest-found wording;
- migration inference;
- family-overreach traps;
- source independence.

---

# 107. RIGHTS REVIEW

Review:

- SourceRegistry entries;
- paid eligibility;
- image rights;
- attribution;
- fixture storage legality;
- source-term change behavior.

---

# 108. REVIEWER AGREEMENT

For subjective items, have two reviewers independently classify a calibration subset.

Examples:

```text
LIKELY vs POSSIBLE
```

```text
historical variant relation vs unresolved
```

If disagreement is high:

> policy is under-specified.

Do not “solve” this by averaging confidence labels.

---

# 109. GOLDEN EXPECTATION GOVERNANCE

Changing expected output requires:

```text
change_reason
linked architecture/policy change
reviewer
date
case version increment
```

Forbidden:

> test failed, update snapshot.

---

# 110. TEST REPOSITORY STRUCTURE

Recommended:

```text
/tests
  /golden
    /resolution
    /evidence
    /claims
    /confidence
    /runtime
    /api
    /llm
    /e2e

  /fixtures
    /canonical
    /sources
      /pesel
      /teryt
      /polona
      /europeana
    /profiles
    /reports

  /contracts
    /api
    /sse

  /property
    /unicode
    /resolver

  /load
    /k6

  /human-review
    /onomastics
    /genealogy
    /rights
```

---

# 111. NAMING CONVENTION

```text
RES-* resolution
SRC-* source/connector
EVD-* evidence
CLM-* claim
CNF-* confidence
RNT-* runtime
API-* API
UI-* frontend
LLM-* LLM evaluation
SEC-* security
E2E-* end-to-end
```

Example:

```text
RES-FUZZY-014
EVD-INDEP-003
CLM-EARLY-002
E2E-PARTIAL-004
```

---

# 112. REQUIREMENT TRACEABILITY

Create:

```text
tests/requirements.yml
```

Example:

```yaml
- requirement_id: NA13-GOLD-04
  source_document: 13
  requirement: "FUZZY_CANDIDATE never auto-merges"
  tests:
    - RES-FUZZY-001
    - RES-FUZZY-014
    - E2E-RES-003
  blocking: P0
```

Every hard invariant from 10–16 has at least one test.

Critical invariants should have:

```text
unit
+
integration
+
E2E
```

where practical.

---

# 113. GOLDEN GUARANTEES — MASTER REGRESSION LIST

## G-01

```text
SEARCH_CANDIDATE
never automatically becomes
HISTORICAL_ATTESTED
```

## G-02

```text
PHONETIC_MATCH
never proves
SAME_SURNAME identity
```

## G-03

```text
OCR_MATCH
never automatically becomes
VERIFIED_VARIANT
```

## G-04

```text
AMBIGUOUS SURNAME
never silently auto-corrects identity
```

## G-05

```text
EXACT ENTITY
cannot be displaced by
fuzzy popularity
```

## G-06

```text
SURNAME_OCCURRENCE
never becomes
ANCESTOR_RELATIONSHIP
```

## G-07

```text
SOURCE_FAILURE
never means
NO_DATA_EXISTS
```

## G-08

```text
CURRENT_CONCENTRATION
never equals
HISTORICAL_ORIGIN
```

## G-09

```text
ARCHIVE_OCCURRENCE MAP
never equals
POPULATION DISTRIBUTION MAP
```

## G-10

```text
EARLIEST_FOUND
never equals
FIRST_EVER
```

## G-11

```text
COPIED SOURCES
never equal
independent confirmations
```

## G-12

```text
commercial_use UNKNOWN
never enters
paid report
```

## G-13

```text
image rights blocked
never produces
image reproduction
```

## G-14

```text
Claim without traceable evidence
never publishes
```

## G-15

```text
credible conflict
never silently disappears
```

## G-16

```text
LLM memory
never becomes
source evidence
```

## G-17

```text
Paywall count
must equal
DiscoveryIndex eligible count
```

## G-18

```text
Unauthorized browser
never receives
full premium payload
```

## G-19

```text
Suppressed population
never becomes
zero
```

## G-20

```text
Worker redelivery
never creates
duplicate canonical Claim
```

## G-21

```text
Public surname cache
never contains
private family data
```

## G-22

```text
Current snapshot update
never silently rewrites
historical report version
```

---

# 114. TEST SUITE TIERS

## Tier 0 — developer/commit

Target:

seconds to a few minutes.

Run:

- schemas;
- pure domain policies;
- resolver deterministic unit tests;
- Golden Guarantees fast subset;
- property smoke cases.

## Tier 1 — pull request

Run:

- full Vitest unit;
- PostgreSQL/Redis Testcontainers;
- connector fixture tests;
- Evidence/Claim corpus;
- API schemas;
- Storybook component tests.

## Tier 2 — pre-deploy

Run:

- full golden corpus;
- Playwright core flows;
- SSE;
- entitlement;
- migrations;
- workflow failures.

## Tier 3 — scheduled

Run:

- live connector smoke tests;
- source drift;
- model live eval;
- load smoke;
- rights-term monitor.

## Tier 4 — release candidate

Run:

- full E2E;
- human-reviewed sample;
- load/cost test;
- security checks;
- canary acceptance.

---

# 115. LIVE VS FIXTURE TESTS

Normal CI must not depend on:

- Polona availability;
- Europeana availability;
- LLM provider uptime;
- external rate limits.

Use recorded/synthetic fixtures.

Scheduled live tests detect external change.

---

# 116. FIXTURE RECORDING POLICY

A fixture records:

```text
source ID
fixture ID
provider schema/version
retrieval date
rights status at recording
content hash
sanitization status
```

Never commit:

- credentials;
- restricted full scans;
- partner-only raw payloads if contract forbids;
- unnecessary personal data.

RightsProfile applies to test fixtures too.

---

# 117. DETERMINISTIC TEST MODE

Application supports test mode:

```text
FixtureConnector
FrozenClock
DeterministicIDs where helpful
MockModelProvider
SynchronousOrControlledQueueDriver
```

Canonical domain logic remains identical.

Do not add test-only shortcuts that bypass QA gates.

---

# 118. LLM MOCK MODE

Map:

```text
task_id
+
input_bundle_hash
+
prompt_version
→
stored structured response
```

Use in normal CI.

Separate live-model eval pipeline runs approved real model.

---

# 119. SOURCE MOCK MODE

Connector abstraction allows:

```text
PESELFixtureConnector
PolonaFixtureConnector
```

implementing the same contract.

Runtime planner does not know whether source is fixture or live.

---

# 120. CLOCK CONTROL

Freeze:

```text
now()
```

in time-sensitive tests.

Keep separate:

```text
source_snapshot_date
source_record_date
retrieved_at
runtime_now
```

Test explicitly that these are not conflated.

---

# 121. FRONTEND FIXTURE GOVERNANCE

Frontend Storybook fixtures must be generated/validated from the shared contract package.

No manually drifted mock TypeScript objects.

CI:

```text
fixture
↓
public Zod schema
↓
Storybook
```

---

# 122. VISUAL SNAPSHOTS

Use visual snapshots selectively for:

- high-value core screens;
- maps/report layout;
- paywall;
- responsive regressions.

Do not make pixel snapshots the primary semantic test.

Dynamic text/layout can create brittle noise.

---

# 123. SEMANTIC ASSERTIONS

Prefer:

```ts
expect(profile.premium.eligible).toBe(false)
expect(profile.research.dimensions.history).toBe("SOURCE_UNAVAILABLE")
expect(profile.chapters.some(c => c.id === "WHERE")).toBe(false)
```

over merely comparing full JSON snapshot.

Snapshots complement semantic assertions.

---

# 124. API SECURITY TEST HARNESS

Automate:

- anonymous;
- entitled;
- non-entitled;
- wrong user/session;
- expired session.

Every premium endpoint has authorization tests.

---

# 125. SEO FACT QA

Parse SSR output.

Every factual dynamic value must trace back to public profile projection.

Do not allow server-rendered page to call a separate generic LLM content generator.

---

# 126. SHARE QA

Share projection test:

- Claim is public/free eligible;
- Confidence wording preserved;
- no premium inventory leak;
- no private data.

---

# 127. COPY / CONFIDENCE QA

Map ConfidenceStatus to acceptable lexical forms.

For Polish and English maintain a small approved wording matrix.

Example:

## `POSSIBLE`

Allowed:

```text
possible
may
one possible explanation
możliwe
jedna z możliwych interpretacji
```

Forbidden:

```text
is
definitely
proves
certainly
```

Context-sensitive linguistic QA can supplement this, but deterministic phrase checks catch obvious regressions.

---

# 128. TRANSLATION QA

Golden bilingual cases ensure semantic parity.

Test transformations:

```text
LIKELY → prawdopodobne
POSSIBLE → możliwe
CONFLICTING → źródła są sprzeczne / istnieją sprzeczne interpretacje
```

A translator cannot upgrade uncertainty.

---

# 129. NO DARK PATTERN QA

Automated/manual checks:

- no fabricated timer;
- no fake archive scanning;
- no fake “X records found”;
- no hidden auto-subscription;
- no premium section shown unless backed by inventory;
- no false social proof.

---

# 130. COVERAGE QA

Given canonical Coverage:

```text
STRONG
PARTIAL
NONE
BLOCKED_RIGHTS
SOURCE_UNAVAILABLE
```

assert projected chapter behavior.

Examples:

```text
NONE
→ no empty full chapter
```

```text
SOURCE_UNAVAILABLE
→ outage/limitation semantics
```

```text
BLOCKED_RIGHTS
→ excluded from unauthorized surface
```

---

# 131. REPORT QA

For each report fixture verify:

```text
ReportVersion immutable
Claim versions valid
Citation IDs exist
Confidence wording aligned
premium entitlement
DiscoveryIndex promised sections fulfilled
limitations included
```

---

# 132. E2E CORPUS — 18

## E2E-001 Happy cached surname

```text
search
→ exact
→ cached free profile
```

## E2E-002 Happy uncached

```text
search
→ ResearchRun
→ FREE_READY
→ historical enrichment
→ DiscoveryIndex
```

## E2E-003 Typo

```text
typo
→ suggestion
→ confirm
→ profile
```

## E2E-004 Multiple candidates

User must choose.

## E2E-005 Unresolved

No fake result/paywall.

## E2E-006 Suppressed rare count

No zero.

## E2E-007 No current map

No map card/data fabrication.

## E2E-008 Source outage

Current facts remain.

## E2E-009 Low data

Short honest profile; no premium.

## E2E-010 Conflicting origin

Both interpretations visible.

## E2E-011 Rights-blocked premium

Evidence excluded from paid inventory.

## E2E-012 LLM unavailable

Deterministic profile survives.

## E2E-013 Concurrent viral surname

One shared deep run.

## E2E-014 Worker redelivery

No duplicate Claims.

## E2E-015 Purchase → report

Entitlement then report.

## E2E-016 Report failure

No second charge; recovery state.

## E2E-017 SEO index

Precomputed rich profile.

## E2E-018 SEO noindex

Low-quality profile does not generate artificial long page.

---

# 133. LAUNCH BLOCKER SEVERITY

## P0 — cannot launch

Trust, rights, privacy, payment access, core data integrity.

## P1 — release blocker unless explicit executive exception

Major broken UX/workflow with safe truth preserved.

## P2 — can ship with documented workaround

Low-severity non-truth defect.

No P0 can be waived by “conversion impact”.

---

# 134. TOP 20 LAUNCH BLOCKERS

1. False surname entity merge.
2. Fuzzy candidate auto-resolves ambiguous identity.
3. Unsupported FACT published.
4. False `VERIFIED`.
5. SearchCandidate shown as attested variant.
6. OCR guess shown as verified historical spelling.
7. Surname occurrence shown as user's ancestor/family fact.
8. Heraldic reference shown as user's coat of arms.
9. Source outage shown as “no records exist”.
10. Old geography presented as current.
11. Archive-hit map presented as population distribution.
12. Rights-unknown evidence included in paid report.
13. Restricted image exposed.
14. DiscoveryIndex/paywall count mismatch.
15. Full premium payload available without entitlement.
16. Report authorization IDOR.
17. Suppressed PESEL count converted to zero.
18. Worker retry duplicates canonical Claims/report entitlement state.
19. Public cache exposes private/premium/future family data.
20. Credible conflict silently removed from user-facing conclusion.

---

# 135. TOP 20 ADVERSARIAL CASES

1. Exact rare surname and very common fuzzy neighbor.
2. `Luczak` where both `Luczak` and `Łuczak` exist in fixture.
3. Synthetic `-ski/-ska` strings that are not an accepted gender pair.
4. Three-letter surnames one edit apart.
5. Latin surname containing one Cyrillic homoglyph.
6. OCR `rn` read as `m`.
7. OCR missing Polish diacritics.
8. German/Polish spelling rule applied outside historical context.
9. Generated transliteration that collides with another valid entity.
10. Same historical object returned by Polona, FBC and Europeana.
11. 2014 regional distribution + 2026 national count.
12. 37 archive hits in one city but incomplete regional corpus.
13. One heraldic family with a common modern surname.
14. Famous historical person with user's surname.
15. Source timeout after previous zero-result cache.
16. LLM given only population count and asked for “story”.
17. Two credible etymologies with different roots.
18. Premium evidence whose commercial rights turn unknown.
19. 100 concurrent searches for one uncached surname.
20. Claim written, worker crashes before job acknowledgement.

---

# 136. RELEASE GATE — AUTOMATED

Required before deploy:

```text
Tier 0 pass
Tier 1 pass
full P0 Golden Guarantees pass
resolver false-merge hard corpus pass
rights hard corpus pass
premium-security pass
API compatibility pass
DB migration pass
core Playwright pass
```

No flaky P0 test is accepted as permanently skipped.

---

# 137. RELEASE GATE — HUMAN

Before launch candidate:

- onomastic review sample approved;
- genealogy safety sample approved;
- rights matrix approved;
- unresolved high-risk defects reviewed.

Human reviewer does not need to approve every surname result.

They approve policy/corpus calibration.

---

# 138. QUALITY METRICS DASHBOARD

Track:

```text
golden pass rate
false merge incidents
false auto-resolve incidents

unsupported Claim incidents
false VERIFIED incidents

conflict preservation failures
family-overreach incidents

rights violations
premium exposure violations

source outage rate
source schema drift

human review rate
INSUFFICIENT_DATA rate

LLM unsupported claim rate
LLM schema failure rate

premium eligibility rate
paywall truthfulness failures

cost per unique research run
```

---

# 139. METRICS NOT TO OPTIMIZE BLINDLY

Dangerous objectives:

```text
maximize resolution rate
minimize INSUFFICIENT_DATA
maximize premium eligibility
maximize historical variants
maximize report length
minimize human review
```

Each can incentivize false certainty.

---

# 140. TARGET PHILOSOPHY

Hard semantic violation target in golden suite:

```text
0
```

for:

- false merge;
- unsupported factual publication;
- family overreach;
- rights violation;
- unauthorized premium exposure.

Trade-off metrics such as Top-3 recall can be optimized after safety constraints are satisfied.

---

# 141. PRODUCTION CANARY

Before full rollout:

```text
small traffic allocation
```

Compare:

- error rate;
- QA blocks;
- cache behavior;
- source calls;
- cost;
- research-run duplication;
- unexpected confidence distribution.

Do not A/B test truth rules.

---

# 142. PRODUCTION FAILURE HARVESTING

Every confirmed product defect becomes:

```text
minimal fixture
+
golden regression test
+
linked incident
```

Workflow:

```text
production issue
↓
reproduce
↓
minimize
↓
add failing test
↓
fix
↓
test passes
```

---

# 143. USER-REPORTED ERROR LOOP

Future feedback:

```text
"Something looks wrong"
```

attaches to:

```text
surname_id
profile_version
claim_id if applicable
report_version
```

It creates review signal.

It does not automatically alter canonical Claim.

---

# 144. SOURCE DRIFT MONITOR

Scheduled live smoke tests monitor:

```text
HTTP status
schema fingerprint
required fields
enum changes
null-rate anomaly
record-count anomaly
rights URL/terms change indicator
```

Schema drift automatically disables/degrades connector according to Prompt 12 policy.

---

# 145. RIGHTS DRIFT

Scheduled process checks:

```text
terms version
license page
rights statement patterns
review expiry
```

Material change creates human/legal review task.

Automated scraper must not “interpret” new legal terms as final approval.

---

# 146. DATA FRESHNESS QA

Monitor expected source cadence.

Example:

```text
new official surname snapshot available
+
production still marks previous snapshot current beyond policy
```

→ alert.

---

# 147. TEST ENVIRONMENTS

## Local

Fixture connectors, Testcontainers.

## CI

Deterministic fixture environment.

## Staging

Real infrastructure; selected sandbox/live source smoke.

## Production canary

Small real traffic.

Never use production customer private data as ordinary golden fixtures.

---

# 148. HUMAN REVIEW GOVERNANCE

Approval roles:

| Area | Reviewer |
|---|---|
| Resolver technical | Search/engineering |
| Polish morphology | Onomastics |
| Origin interpretation | Onomastics |
| Historical occurrence semantics | Genealogist/historical researcher |
| Family-overreach | Genealogist |
| Rights | Data licensing/legal |
| API states | Engineering/product |
| Premium truthfulness | Product + trust QA |

---

# 149. CORPUS COVERAGE MATRIX

Maintain generated matrix:

```text
ClaimType
×
ConfidenceStatus
×
EvidenceType
×
Directness
×
RightsState
×
FailureState
```

Not every Cartesian combination needs a case.

The matrix reveals high-risk gaps.

---

# 150. P0 BUILD ORDER

## Stage 1 — Test foundation

- Vitest;
- shared fixtures package;
- GoldenCase schema;
- frozen clock;
- fixture connectors.

## Stage 2 — Resolver

- 160 cases;
- property tests.

## Stage 3 — Connectors

- PESEL;
- TERYT/GUS;
- Polona.

## Stage 4 — Truth layer

- Evidence;
- Claim;
- Confidence;
- rights.

## Stage 5 — Runtime

- ResearchRun;
- idempotency;
- partial;
- outbox.

## Stage 6 — API

- schemas;
- 24 fixtures;
- SSE/ETag.

## Stage 7 — Frontend

- Storybook golden states;
- interactions/a11y.

## Stage 8 — E2E

- 18 flows.

## Stage 9 — LLM

- live/mock eval harness;
- 60 cases.

## Stage 10 — expert calibration

- onomastics;
- genealogy;
- rights.

---

# 151. FIRST TESTS ENGINEERING SHOULD WRITE

In this exact order:

## 1. `canonicalKey_preserves_diacritic_identity`

Proves canonical key does not ASCII-fold identity.

## 2. `diacriticFold_is_search_only`

## 3. `exactMatch_precedes_fuzzy`

## 4. `fuzzyCandidate_never_autoResolves`

## 5. `acceptedGenderForm_resolves_but_generatedDoesNot`

## 6. `searchCandidate_cannotBecomeHistoricalVariant`

## 7. `peselSuppressed_isNotZero`

## 8. `sourceTimeout_isNotNoResult`

## 9. `polonaOcrHit_isNotVerifiedVariant`

## 10. `duplicateAggregators_shareIndependenceGroup`

## 11. `claimWithoutEvidence_fails`

## 12. `surnameOccurrence_cannotCreateFamilyClaim`

## 13. `currentGeography_cannotCreateHistoricalOriginFact`

## 14. `earliestFound_requiresCoverageManifest`

## 15. `commercialUnknown_blocksPaidSurface`

## 16. `discoveryIndex_excludesSearchCandidates`

## 17. `paywallCount_equalsDiscoveryIndex`

## 18. `workerRedelivery_isIdempotent`

## 19. `concurrentSurnameSearches_coalesce`

## 20. `freeProfileSurvivesOptionalHistoryFailure`

## 21. `premiumPayload_requiresEntitlement`

## 22. `profileETag_returns304WhenUnchanged`

## 23. `sseReconnect_recoversState`

## 24. `llmCannotIntroduceUnknownEvidenceId`

## 25. `sparseEvidenceNarrative_doesNotInventOrigin`

These 25 tests establish the trust architecture before broad UI implementation.

---

# 152. P0 AUTOMATED TEST SUITE

Minimum pre-launch automated suite:

### Resolver

160 golden cases.

### Property

At least:

```text
normalization properties
arbitrary Unicode no-crash
exact precedence
```

with hundreds/thousands of generated inputs per CI tier as runtime permits.

### Connector

P0 source contracts:

- PESEL;
- TERYT/GUS;
- Polona.

### Truth layer

125 evidence/claim cases.

### Confidence

48 targeted cases.

### Runtime

28 workflows.

### API

24 contract states.

### UI

24 golden states.

### E2E

18 flows.

### Security

premium auth/IDOR/XSS/CSRF basics.

---

# 153. P0 HUMAN REVIEW SUITE

Before launch:

```text
20 onomastic
20 historical/genealogy
10 rights
10 confidence/conflict
```

Reviewers record:

```text
PASS
FAIL
POLICY_AMBIGUOUS
```

`POLICY_AMBIGUOUS` becomes architecture/test-policy work, not reviewer majority vote.

---

# 154. P1 QA

After P0:

- Europeana/FBC/Getty connector corpus;
- Cyrillic resolver;
- historical DE/PL pack;
- OCR search pack;
- licensed IJP corpus;
- premium report broader corpus;
- additional country pack;
- person candidate matching;
- family research privacy;
- migration hypotheses.

---

# 155. DO NOT BUILD YET

1. 10,000-surname benchmark.
2. Full global country matrix.
3. ML benchmark platform.
4. Autonomous LLM judge.
5. Genealogical proof percentage.
6. HTR benchmark before OCR feature exists.
7. massive pixel snapshot suite.
8. crowd labeling platform.
9. synthetic source simulator more complex than production source layer.
10. custom test framework where standard tools suffice.

---

# 156. MODEL CHANGE PROPOSALS

QA does not require fundamental domain-model changes.

## MODEL CHANGE PROPOSAL 17-A — Test requirement IDs

Add non-domain specification identifiers for hard invariants:

```text
NA13-G-001
NA14-G-001
...
```

These are documentation/testing IDs, not production DB entities.

**Recommendation:** accept.

## MODEL CHANGE PROPOSAL 17-B — Fixture provenance metadata

Every source fixture should include a test-side metadata manifest:

```text
fixture_id
source_id
source_schema_version
captured_at
rights_review
content_hash
sanitization
```

This does not modify production SourceRecord schema.

**Recommendation:** accept.

---

# 157. DECISION REGISTER

## Golden structure

**Decision:** explicit Expected + Forbidden assertions.  
**Why:** prevents a superficially correct output from hiding unsafe semantics.

## Corpus size

**Decision:** ~36 entity seed set with several hundred reusable cross-layer cases.  
**Why:** broad enough for risk coverage; small enough to curate.

## Real vs synthetic

**Decision:** source facts use real frozen fixtures; identity traps prefer synthetic/mutated cases.  
**Why:** avoids making unsupported real-world variant claims.

## Resolver metrics

**Decision:** prioritize false merge/auto-resolve over recall.

## Connector testing

**Decision:** fixtures in normal CI, live scheduled smoke.

## Database testing

**Decision:** Testcontainers, not mocked SQL semantics.

## UI states

**Decision:** Storybook fixtures sourced from public DTO contract.

## E2E

**Decision:** Playwright across critical browser engines.

## Property testing

**Decision:** fast-check for Unicode/resolver invariants.

## Load

**Decision:** k6 for cache/coalescing/runtime, not external provider abuse.

## LLM evaluation

**Decision:** multidimensional groundedness evaluation; no one quality score.

## LLM judge

**Decision:** supporting signal only.

## Snapshot policy

**Decision:** semantic assertions primary; snapshots secondary.

## Release blockers

**Decision:** trust/rights/security violations cannot be offset by product metrics.

## Canary

**Decision:** small rollout, but truth semantics never experimentally weakened.

---

# 158. OUTPUT TO FIRST VERTICAL SLICE

Before broad UI coding, engineering should possess these assets:

```text
1. GoldenCase schema
2. 36-entity canonical fixture set
3. 160-case resolver corpus
4. PESEL fixture pack
5. TERYT/GUS fixture pack
6. Polona fixture pack
7. 125 evidence/Claim cases
8. 48 confidence cases
9. 28 runtime workflows
10. 24 API fixtures
11. 24 Storybook golden states
12. first 10 core E2E flows
13. P0 hard-invariant test suite
```

Then build the first vertical slice:

```text
Surname Input
↓
Resolver
↓
PESEL
↓
Current Evidence
↓
Claims
↓
Confidence
↓
Free Profile
↓
Polona historical enrichment
↓
Historical Evidence
↓
Coverage / DiscoveryIndex
```

against those tests.

---

# 159. OUTPUT CONTRACT TO PROMPT 18

Prompt 18 — Analytics & Experimentation — may consume stable, non-sensitive product signals:

```text
search outcome
resolution outcome
coverage tier
dimension availability
research readiness
source failure category
premium eligibility
DiscoveryIndex buckets
QA outcome
report status
```

Prompt 18 should **not** require raw source/evidence/family data for normal analytics.

Quality metrics from Prompt 17 become guardrails for experiments.

Example:

> a paywall experiment cannot ship if it increases conversion by misrepresenting DiscoveryIndex.

---

# 160. DEFINITION OF QA READY

The Name Atlas QA architecture is ready when:

- GoldenCase schema exists;
- every hard architecture invariant maps to test IDs;
- resolver corpus contains positive, negative and ambiguous cases;
- false merges are explicit P0 blockers;
- Unicode property tests exist;
- connector fixtures include failure/schema/rights states;
- PESEL suppression is tested;
- Polona OCR uncertainty is tested;
- Evidence Engine rejects SearchCandidates as evidence;
- Claims without support are blocked;
- all six confidence states have reviewed cases;
- copied sources do not inflate independent evidence;
- earliest-found semantics are covered;
- family/person/heraldry overreach is blocked;
- rights-blocked paid output fails tests;
- DiscoveryIndex/paywall equality is enforced;
- partial results survive optional source failure;
- worker retries are idempotent;
- concurrent public research coalesces;
- SSE reconnect and polling fallback work;
- profile ETags work;
- premium payload cannot be accessed without entitlement;
- frontend fixtures cover every major backend state;
- LLM evaluation contains explicit allowed and forbidden propositions;
- human expert calibration exists;
- release gates are explicit;
- production defects have a regression-harvesting workflow.

---

# 161. VERIFIED TOOLING REFERENCES — 2026-09-17

## Vitest

Vitest currently supports TypeScript/JSX, mocking, projects, type testing and V8/Istanbul coverage. The current documentation recommends V8 coverage as the normal default.

References:

`https://vitest.dev/guide/features`

`https://vitest.dev/guide/coverage`

## Playwright

Playwright supports running tests across configured browser projects and parallel headless execution, with headed/UI debugging modes.

Reference:

`https://playwright.dev/docs/running-tests`

## Storybook

Storybook supports interaction tests through story `play` functions and can automate them through its Vitest addon. Its accessibility addon integrates automated WCAG-oriented DOM checks.

References:

`https://storybook.js.org/docs/writing-tests/interaction-testing`

`https://storybook.js.org/docs/writing-tests/accessibility-testing`

## Testcontainers for Node.js

Testcontainers provides disposable containerized dependencies for tests, suitable for real PostgreSQL/Redis integration environments.

Reference:

`https://node.testcontainers.org/`

## fast-check

fast-check is a property-based testing library for JavaScript/TypeScript. It generates inputs, runs properties repeatedly and shrinks failures to smaller counterexamples.

Reference:

`https://fast-check.dev/`

## k6

k6 is an open-source performance testing tool supporting HTTP/API load scenarios, virtual users, checks and thresholds.

Reference:

`https://grafana.com/docs/k6/latest/`

---

# 162. FINAL RECOMMENDATION

Name Atlas should treat its golden corpus as a **second product specification**.

Documents 10–16 say:

> how the product is supposed to behave.

Document 17 and its corpus must say:

> how we prove it still behaves that way.

The most important tests are not:

```text
Can we generate an interesting surname report?
```

They are:

```text
Can we prove the system refuses to invent one
when the evidence is weak?
```

The launch-quality standard is therefore:

```text
HIGH RECALL WHERE SEARCHING IS SAFE
+
HIGH PRECISION WHERE IDENTITY IS ASSERTED
+
TRACEABLE EVIDENCE FOR FACTS
+
EXPLICIT UNCERTAINTY FOR INTERPRETATION
+
ZERO TOLERANCE FOR FAMILY OVERREACH
+
ZERO TOLERANCE FOR RIGHTS / PREMIUM ACCESS VIOLATIONS
```

Once this P0 corpus exists and the first vertical slice passes it, Name Atlas has enough architectural certainty to move from system design into implementation without losing the evidence-first product principle.
