# NAME ATLAS — IMPLEMENTATION ROADMAP

**Document:** 23. Implementation Roadmap  
**Version:** 1.0.0 — Build Execution Baseline  
**Date:** 2026-09-17  
**Initial market:** Poland  
**Target:** safe paid surname-report MVP  
**Status:** implementation-ready  
**Canonical inputs:** Documents 10–21 plus Prompt 22 internal-admin requirements supplied in project context  
**Stack preserved from architecture:** TypeScript modular monolith, Next.js, PostgreSQL/PostGIS, Redis-compatible queue store, BullMQ, object storage, OpenTelemetry  
**Principle:** build vertical slices, not isolated architecture layers

> **Important source-status note:** at the time this roadmap was built, canonical Markdown files `10`–`21` were present and reviewed directly. The requirements for Document 22 — Internal Admin / Research Console — were available as the approved prompt specification, but a generated `22_NAME_ATLAS_INTERNAL_ADMIN_RESEARCH_CONSOLE.md` file was not present. This roadmap therefore treats the P0 requirements from Prompt 22 as sufficient implementation input and deliberately avoids making advanced admin-console features part of the paid-MVP critical path.

---

# 0. EXECUTIVE ANSWER

The correct implementation sequence is:

```text
FOUNDATION + RISK SPIKES
↓
VERTICAL SLICE 1
REAL SURNAME → RESOLVER → PESEL → CURRENT CLAIMS → FREE RESULT
↓
VERTICAL SLICE 2
SOURCE RECORD → EVIDENCE → CLAIM → CONFIDENCE → PUBLIC PROFILE
↓
VERTICAL SLICE 3
POLONA → ASYNC RUNTIME → HISTORICAL OCCURRENCE → PARTIAL RESULT
↓
VERTICAL SLICE 4
COVERAGE → DISCOVERY INDEX → PREMIUM ELIGIBILITY → REPORT
↓
VERTICAL SLICE 5
ORDER → STRIPE → VERIFIED WEBHOOK → ENTITLEMENT → DELIVERY
↓
PAID LIMITED BETA
↓
PUBLIC PAID MVP
↓
VERTICAL SLICE 6
SEO ELIGIBILITY → SEO PROJECTION → FIRST 250 PAGES
↓
POST-LAUNCH HARDENING / DATA EXPANSION
↓
ONLY THEN: FAMILY ORIGIN
```

The single most important execution rule is:

> **Do not build the monetisation system until representative surnames prove that real premium inventory exists.**

The second most important rule is:

> **Do not wait for the complete premium system before putting a real surname through a real source, Evidence, Claim, API and UI.**

---

# 1. PAID MVP — EXACT SCOPE

The paid MVP is a **surname-level product**.

It is ready when a user can:

```text
enter a surname
↓
resolve it safely
↓
receive lawful current data
↓
receive evidence-backed free insights
↓
see historical evidence if available
↓
see honest limitations where unavailable
↓
receive a truthful DiscoveryIndex
↓
receive a premium offer only if eligible
↓
pay once
↓
obtain durable report access
↓
read an immutable premium report
↓
recover access by email
↓
request support/refund when necessary
```

## 1.1 Required P0 consumer capabilities

### Search / identity

- Polish surname input.
- Exact canonical resolution.
- Accepted NameForm resolution.
- Polish gender forms where approved.
- Diacritic search candidate.
- Safe typo/fuzzy suggestions.
- Ambiguous and unresolved states.
- No fuzzy auto-merge.

### Current data

- Official/current Polish surname count from selected PESEL dataset.
- Snapshot/source date.
- Derived rank if valid.
- Derived rarity / `1-in-X` where mathematically valid.
- Suppressed value distinct from zero.
- Current regional map only if a lawful, genuinely current dataset becomes available.

### Truth layer

- Source.
- RightsProfile.
- SourceRecord.
- EvidenceItem.
- Claim.
- ClaimEvidence.
- ConfidenceAssessment.
- Citation.
- Coverage/DataGap.
- Surface eligibility.
- Provenance from user-facing fact back to source.

### Historical data

At least one production historical source, initially:

```text
Polona
```

or a verified replacement if Polona integration becomes operationally blocked.

Minimum historical premium value:

- source-backed occurrence;
- date/time scope;
- place where resolvable;
- source locator;
- evidence status;
- no OCR candidate presented as historical fact without validation.

### Free profile

Adaptive chapters from actual Claims:

```text
TODAY
WHERE        if valid
MEANING      if valid
ORIGIN       if valid
HISTORY      when historical evidence exists
EVIDENCE
```

### Premium preparation

- CoverageAssessment.
- DiscoveryIndex.
- PremiumEligibility.
- actual premium preview.
- no offer for low-data surname.

### Premium report

- structured Report.
- immutable ReportVersion.
- Claim/citation-backed blocks.
- limitations.
- PurchasePromiseSnapshot comparison.
- no family-specific inference.

### Commerce

- one product: `FULL_SURNAME_REPORT`;
- PLN;
- one-time purchase;
- guest checkout;
- Stripe-hosted Checkout;
- verified webhook;
- Order;
- PaymentAttempt;
- CustomerIdentity;
- Entitlement;
- purchase receipt;
- report-ready email;
- secure magic-link access;
- refund workflow;
- provider reconciliation.

### Operations

- read-only research inspector early;
- review queue before paid operations;
- rights inspection;
- commerce support basics;
- audit.

### Analytics

- consent-aware explicit events;
- search/free-value funnel;
- premium funnel;
- purchase/report events;
- no raw surname in generic analytics.

### Security / privacy

- public vs private separation;
- no family data P0;
- ASVS L2 target;
- secure report access;
- secrets;
- encrypted storage/backups;
- consent;
- DSAR/deletion basics;
- incident response.

### SEO

For the paid product launch, public URL architecture must already be correct.

Actual large-scale indexation can follow the paid MVP.

P0 SEO launch:

```text
250 qualified Polish surname pages
```

after production profile stability.

---

# 2. MVP NON-GOALS

These are explicitly **not** paid-MVP dependencies.

1. Family Origin.
2. Person-level record matching.
3. Candidate ancestors.
4. Family tree.
5. FamilyBranch.
6. DNA.
7. Ethnicity inference.
8. Religion inference.
9. Heraldic lineage verification.
10. Full migration reconstruction.
11. Multi-country production ingestion.
12. Cyrillic full production resolver.
13. advanced historical German/Polish orthography engine.
14. full OCR/HWR platform.
15. graph database.
16. Temporal.
17. Kafka.
18. Kubernetes.
19. microservices.
20. multi-PSP routing.
21. Merchant of Record.
22. subscriptions.
23. credits.
24. gifts.
25. physical books.
26. genealogist marketplace.
27. mobile native apps.
28. full historical map animation.
29. surname comparison permutations.
30. global programmatic SEO.
31. session replay.
32. ML propensity models.
33. custom fraud engine.
34. generic admin database editor.
35. large-scale editorial CMS.

If one of these starts appearing on the critical path, the roadmap has drifted.

---

# 3. IMPLEMENTATION PRINCIPLE

Do not build:

```text
ALL DATABASE TABLES
↓
ALL CONNECTORS
↓
ALL BACKEND
↓
ALL FRONTEND
↓
ALL QA
```

Build:

```text
ONE REAL INPUT
↓
ONE REAL SOURCE
↓
ONE REAL CANONICAL RECORD
↓
ONE EVIDENCE ITEM
↓
ONE CLAIM
↓
ONE API RESPONSE
↓
ONE UI STATE
↓
ONE GOLDEN TEST
```

Then expand.

Every milestone must produce something demonstrable.

---

# 4. TEAM ASSUMPTIONS

This roadmap works for two realistic team shapes.

## 4.1 Lean build

```text
1 strong TypeScript/full-stack engineer
1 founder/product owner
AI coding assistance
part-time onomastics/genealogy review
part-time legal/tax specialist
```

This is the default sequencing model.

The critical path is intentionally single-threadable.

## 4.2 Small product team

```text
2–3 engineers
1 product/design owner
1 data/research specialist
external legal/tax
```

Parallelisation is defined later.

---

# 5. EFFORT CLASSES

No calendar promise is implied.

```text
XS — contained change / single component / migration / test pack
S  — bounded feature touching few modules
M  — multi-module subsystem or meaningful vertical increment
L  — major vertical slice / several integration boundaries
XL — broad cross-system capability; must be split before implementation where possible
```

Risk is independent.

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Example:

```text
RightsProfile commercial-use gate
Effort: S
Risk: CRITICAL
```

---

# 6. INFRASTRUCTURE RECOMMENDATION

## 6.1 P0 deployment

Use:

```text
GitHub
↓
Render Frankfurt
  ├── web: Next.js
  ├── admin: Next.js internal app
  ├── worker: BullMQ Node worker
  ├── cron/reconciliation jobs
  ├── PostgreSQL
  └── Render Key Value / Valkey
↓
AWS S3 eu-central-1
  └── private objects/reports/raw approved assets
```

External managed systems:

```text
Stripe
Resend
PostHog EU
approved LLM API
approved source APIs/datasets
```

## 6.2 Why Render P0

The architecture requires:

- persistent Node processes;
- BullMQ workers;
- Redis-compatible queue storage;
- PostgreSQL/PostGIS;
- private networking;
- scheduled jobs.

Render currently supports:

- full Next.js web services;
- continuously running background workers;
- BullMQ with its Key Value service;
- Frankfurt region;
- PostgreSQL extensions including `postgis` and `pg_trgm`;
- paid Postgres PITR;
- versioned infrastructure through `render.yaml` Blueprints.

This keeps the first infrastructure plane coherent.

Do **not** split P0 into:

```text
Vercel web
+
another API host
+
another worker host
+
another Redis host
```

unless a concrete limitation appears.

## 6.3 Object storage

Use AWS S3 in an EU region for:

- private report artifacts;
- source raw assets where rights permit;
- backup exports.

P0 can keep JSON-sized raw source responses in Postgres JSONB when small and appropriate.

Large files go to object storage.

## 6.4 Infrastructure as code

Use:

```text
render.yaml
```

for Render resources/environments.

Do not start with a large Terraform estate.

Add Terraform/Pulumi only when resources outside Render become complex enough to justify it.

## 6.5 Environments

```text
local
CI
staging
production
```

Separate:

- database;
- queue;
- secrets;
- PostHog project/environment;
- Stripe test/live keys;
- email routing.

---

# 7. REPOSITORY STRATEGY

Use a single monorepo.

Recommended:

```text
/name-atlas
  /apps
    /web
    /admin
    /worker

  /packages
    /domain
    /contracts
    /db
    /resolver
    /sources
    /places
    /evidence
    /claims
    /confidence
    /coverage
    /runtime
    /profiles
    /reports
    /commerce
    /seo
    /analytics
    /auth
    /observability
    /ui
    /testing

  /prompts
  /fixtures
  /tests
    /golden
    /integration
    /e2e
    /load

  /ops
    /render
    /scripts

  render.yaml
  README.md
```

Use:

```text
pnpm workspaces
```

A build orchestrator such as Turborepo is optional, not a prerequisite.

---

# 8. CODE-LEVEL MODULE BOUNDARIES

The modular monolith has explicit domain boundaries.

```text
surname
resolver
sources
rights
places

evidence
claims
confidence
coverage

runtime
profiles
reports

commerce
seo
analytics
auth

admin
```

Rules:

- no connector writes Claims directly;
- no UI derives Claims;
- commerce never generates research facts;
- SEO never retrieves facts;
- analytics never changes domain truth;
- admin commands call domain services, not repositories directly.

---

# 9. DATABASE IMPLEMENTATION STRATEGY

Document 11 defines the full P0 canonical schema.

Roadmap implementation should create it in **staged migrations**, not all at once before proof.

This is an implementation-sequencing decision, not a semantic model change.

## 9.1 Migration Group A — Identity / source

For first slice:

```text
knowledge_entities
surnames
name_forms
name_form_relations
entity_external_ids

sources
rights_profiles

research_runs
```

## 9.2 Migration Group B — Current data / truth

```text
source_records

distribution_snapshots
distribution_values

evidence_items
claims
claim_evidence
confidence_assessments
citations
```

## 9.3 Migration Group C — Runtime

```text
research_module_runs
runtime_outbox
```

plus runtime indexes/uniqueness.

## 9.4 Migration Group D — Place/history

```text
places
place_names
administrative_memberships
place_geometries if needed

historical_occurrences
historical_variants
```

## 9.5 Migration Group E — product intelligence

```text
meaning_interpretations
origin_hypotheses

coverage_assessments
coverage_dimensions

discovery_indexes
discovery_index_entries
```

## 9.6 Migration Group F — report/commerce

Add:

```text
reports
report_versions

offers
customer_identities
orders
payment_attempts
payment_webhook_events
purchase_promise_snapshots
entitlements
refunds
magic_link_tokens
```

## 9.7 Migration Group G — analytics/admin/SEO

```text
consent_records
experiment_assignments if needed

seo_eligibility_assessments
seo_profile_projections
slug_aliases

audit_events
human_review_tasks
review_decisions
bulk_operations if needed
```

---

# 10. FIRST DATABASE INDEXES

P0 early:

```text
UNIQUE surname canonical identity key
UNIQUE / lookup name_form key

pg_trgm on searchable surname keys

UNIQUE source + external_record_id
source_record fingerprint

evidence fingerprint

claim subject/type/version indexes
claim_evidence claim_id / evidence_id

confidence claim_id

active ResearchRun coalescing key

research_module_run idempotency key
runtime_outbox pending index
```

Commerce later:

```text
Order idempotency key
provider_event unique
active Entitlement lookup
email lookup HMAC
magic token hash unique
```

SEO:

```text
(locale, canonical_slug) unique
slug alias lookup
indexability/publication indexes
```

---

# 11. UUID STRATEGY

Use UUIDv7 from the first migration.

Do not retrofit IDs later.

Public slugs/order references remain separate.

---

# 12. POSTGIS TIMING

Enable PostGIS early in the database because the architecture will use it.

Do not spend the first slice building spatial logic.

First real use:

```text
place geometry / historical place
```

or a genuinely approved map layer.

Current regional surname map remains conditional.

---

# 13. FOUNDATION SPIKES

Before building broad product infrastructure, run five focused spikes.

## SPIKE-01 — PESEL reality

Goal:

```text
download/query approved current surname source
→ parse
→ find 100 representative surnames
→ characterize suppression/scope
```

Outputs:

- exact production dataset selected;
- snapshot date;
- column semantics;
- suppression behavior;
- fixture sample;
- rights record.

Exit:

> we can deterministically answer current national count for real Polish surnames.

## SPIKE-02 — Unicode resolver

Test:

- `Łuczak`;
- `Luczak`;
- gender forms;
- compounds;
- typos;
- short collisions.

Exit:

> exact identity is preserved and fuzzy suggestions cannot auto-merge.

## SPIKE-03 — historical source

Use Polona.

Goal:

```text
surname query
→ source record
→ locator
→ historical occurrence candidate
```

Exit:

> at least one lawful historical record can travel from source to canonical SourceRecord.

## SPIKE-04 — truth round-trip

Hardcoded/fixture SourceRecord:

```text
→ Evidence
→ Claim
→ Confidence
→ public DTO
```

Exit:

> provenance works before UI sophistication.

## SPIKE-05 — premium viability sample

Run representative sample once current + historical pipeline exists.

Goal:

```text
100 representative surname profiles
→ Coverage
→ DiscoveryIndex candidate inventory
```

Answer:

> how frequently does a real premium report contain meaningfully deeper material?

No payment work before this question has an acceptable answer.

---

# 14. EXTERNAL WORK STARTS IMMEDIATELY

These lanes begin in parallel with engineering foundation.

## Data partnerships

Start immediately:

```text
IJP PAN
PTG
```

Reason:

long lead time.

They are not allowed to block first current/historical MVP proof.

## Legal

Start:

- source-rights review;
- privacy/CMP approach;
- Terms architecture;
- consumer digital-content/service classification;
- VAT/tax/KSeF review.

## Payments account

Create Stripe test/business onboarding early enough that account approval is not discovered as a last-minute blocker.

## Email domain

Set up transactional subdomain and DNS before paid beta.

---

# 15. CRITICAL PATH

The paid-MVP critical path is:

```text
FND
↓
CANONICAL IDENTITY
↓
RESOLVER
↓
PESEL
↓
SOURCE RECORD
↓
EVIDENCE
↓
CLAIM
↓
CONFIDENCE
↓
FREE PROFILE
↓
POLONA
↓
ASYNC RUNTIME
↓
HISTORICAL CLAIM
↓
COVERAGE
↓
DISCOVERY INDEX
↓
PREMIUM ELIGIBILITY
↓
PREMIUM REPORT
↓
PRIVACY / LEGAL / SECURITY GATE
↓
ORDER / STRIPE / WEBHOOK
↓
ENTITLEMENT
↓
EMAIL / MAGIC LINK
↓
REFUND / RECONCILIATION
↓
PAID MVP
```

SEO is a near-launch parallel lane but **indexation is not on the paid-MVP critical path**.

Advanced Admin is also not on the critical path, but minimal inspection/review tooling is.

---

# 16. DEPENDENCY DAG

```text
                            FND-001
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
          DB-001            QA-001            OBS-001
             │                 │
             ▼                 │
          RES-001 ◄────────────┘
             │
             ▼
          DAT-001
             │
             ▼
          SRC-001 PESEL
             │
             ▼
          TRU-001 Evidence
             │
             ▼
          TRU-002 Claim/Confidence
             │
        ┌────┴─────────────┐
        ▼                  ▼
     API-001            ADM-001
        │
        ▼
     WEB-001
        │
        ▼
     FREE ALPHA
        │
        ├──────────────► SRC-002 Places
        │
        ▼
     SRC-003 Polona
        │
        ▼
     RUN-001 Research runtime
        │
        ▼
     RUN-002 Queue/Outbox
        │
        ▼
     TRU-003 History
        │
        ▼
     WEB-002 Partial/SSE
        │
        ▼
     COV-001 Coverage
        │
        ▼
     PRE-001 DiscoveryIndex
        │
        ▼
     PRE-002 PremiumEligibility
        │
        ▼
     RPT-001 Premium Report
        │
        ├──────────────► ADM-002 Review/Rights Ops
        ├──────────────► ANA-001 Analytics
        ├──────────────► PRV-001 Privacy/Security
        │
        ▼
     COM-001 Order/Promise
        │
        ▼
     COM-002 Stripe/Entitlement
        │
        ▼
     COM-003 Delivery/Refund/Reconciliation
        │
        ▼
     PAID LIMITED BETA
        │
        ▼
     LAUNCH HARDENING
        │
        ▼
     PUBLIC PAID MVP
        │
        ▼
     SEO-001 / SEO-002 / SEO-003
        │
        ▼
     SEO COHORT 250
```

---

# 17. MILESTONE MAP

```text
M0 — Foundation & Viability
M1 — Current Surname
M2 — Evidence-backed Free Profile
M3 — Historical Discovery
M4 — Premium Viability
M5 — Paid Report Without Real Money
M6 — Commerce / Paid Limited Beta
M7 — Public Paid MVP Hardening
M8 — Organic SEO Cohort
M9 — Post-launch Optimisation
```

---

# 18. M0 — FOUNDATION & VIABILITY

## Objective

Create the smallest production-shaped platform capable of proving real data and identity assumptions.

## Why now

Failure here invalidates everything downstream.

## Dependencies

None.

## Epics

```text
FND-001 Monorepo / CI
INF-001 Core infrastructure
DB-001 Canonical schema foundation
QA-001 Golden test foundation
OBS-001 Observability foundation
DAT-001 Source/Rights registry
```

## Exact deliverables

- monorepo;
- TypeScript strict mode;
- shared contract package;
- PostgreSQL local/CI;
- UUIDv7 helper;
- migration pipeline;
- Render staging blueprint skeleton;
- GitHub Actions;
- Vitest;
- fast-check;
- Testcontainers;
- fixture directories;
- request IDs;
- structured logging;
- Source and RightsProfile tables;
- PESEL spike;
- resolver spike.

## Acceptance

```text
CI can:
  start Postgres
  run migrations
  run tests
  build apps/packages
```

Real PESEL fixture is parsed.

Resolver core Unicode tests exist.

## Parallel

- legal/source outreach;
- visual design foundation;
- user research.

## Must wait

- paid UI;
- LLM narrative;
- SEO publication.

## Risk

**HIGH**, because source reality can invalidate assumptions.

## Exit gate

### DP1-A

- PESEL production source selected.
- rights recorded.
- exact count can be parsed.
- Unicode identity approach passes blocker tests.

---

# 19. M1 — VERTICAL SLICE 1: CURRENT SURNAME

## Objective

A real user input reaches a real current data result.

```text
INPUT
↓
RESOLVER
↓
PESEL
↓
CURRENT DATA
↓
JSON RESULT
```

## Epics

```text
RES-001
SRC-001
TRU-001 partial
TRU-002 current Claims
API-001 partial
```

## Resolver exact scope

Implement Document 13 P0 in this order:

1. raw preservation;
2. validation;
3. NFC;
4. casefold key;
5. controlled separators;
6. script/mixed-script signals;
7. exact canonical;
8. exact NameForm;
9. accepted gender relation;
10. diacritic search candidate;
11. compound preservation;
12. `pg_trgm`;
13. edit/transposition rerank;
14. tier policy;
15. ResolutionOutcome;
16. DecisionMode;
17. candidate provenance.

Do not implement phonetics/Cyrillic/OCR.

## PESEL scope

Build ingestion, not request-time upstream dependency.

```text
official dataset
↓
raw ingest
↓
schema validation
↓
snapshot
↓
canonical surname matching
```

Current query should be local DB.

## First Claims

```text
CURRENT_POPULATION
CURRENT_RANK
RARITY_CONTEXT
```

## Acceptance

Input:

```text
Kowalski
```

returns:

- canonical surname ID;
- source-backed population;
- snapshot date;
- rank/rarity when valid;
- Citation;
- Confidence.

Test:

```text
suppressed != zero
```

## UI

Not required yet beyond internal JSON/demo.

## Exit gate

```text
5–10 representative real surnames
+
resolver blocker suite
+
PESEL current Claims
```

work end to end.

---

# 20. M2 — VERTICAL SLICE 2: TRUTH LAYER + FREE PRODUCT

## Objective

Replace “data endpoint” with actual Name Atlas truth architecture and consumer page.

```text
SourceRecord
↓
Evidence
↓
Claim
↓
Confidence
↓
Public Profile
↓
API
↓
Consumer UI
```

## Deliverables

### Truth

- EvidenceItem factory;
- EvidenceDirectness;
- ClaimEvidence;
- Claim schemas;
- Confidence states/reasons;
- rights surface gate;
- Citation builder;
- source failure vs no-result;
- Claim validators;
- surname/family scope guard.

### API

Initial:

```http
POST /api/v1/surname-searches
PUT /api/v1/surname-searches/{search_id}/resolution
GET /api/v1/surnames/{surname_id}/profile
```

### Consumer

```text
Search
Resolution suggestion
Population
Rarity
Source / date
Limitations
```

### Admin v0

Developer/read-only inspector:

```text
Surname
NameForms
SourceRecord
Evidence
Claim
Confidence
```

No mutation yet.

## QA

Implement first Prompt 17 tests at least through:

```text
claimWithoutEvidence_fails
surnameOccurrence_cannotCreateFamilyClaim
commercialUnknown_blocksPaidSurface
```

## Storybook

Start once:

- result cards;
- resolution states;
- low-data states;

exist.

## Playwright

First flow:

```text
search → exact result
```

and:

```text
typo suggestion → confirmation
```

## Release state

### INTERNAL ALPHA

Golden surnames only.

## Exit gate — DP1

The system can demonstrate:

> a real Polish surname goes from user input to approved, traceable current Claims and a useful consumer result.

No LLM required.

---

# 21. M3 — VERTICAL SLICE 3: HISTORICAL DISCOVERY

## Objective

Prove the first truly asynchronous historical workflow.

```text
FREE READY
+
HISTORICAL RESEARCH PROCESSING
↓
Polona
↓
Historical Evidence
↓
Historical Claim
↓
Profile enrichment
```

## Dependencies

M2.

## Epics

```text
SRC-002 Place foundation
SRC-003 Polona
RUN-001 Runtime
RUN-002 Queue/Outbox
TRU-003 Historical Claim
WEB-002 Async/partial UI
ADM-002 partial review tooling
```

## Place work

Implement enough:

```text
Place
PlaceName
admin membership
resolver
```

to represent historical occurrence location safely.

Do not build full global historical gazetteer.

## Polona

P0 scope:

- bounded surname search;
- metadata;
- locator;
- searchable OCR/reference if lawful and available;
- source status;
- no bulk harvesting.

## Runtime

This is the point to implement:

```text
ResearchPlan
ResearchModuleRun
ReadinessState
planner
partial state
```

Avoid generic DAG engine beyond needed modules.

## Queue

Now introduce:

```text
Render Key Value / Redis-compatible
BullMQ
worker
transactional outbox
```

## Early development sequence

During initial implementation:

```text
REST polling
```

is acceptable.

Before closed/public beta:

```text
SSE + polling fallback
```

must satisfy Prompt 16.

## Historical Claim

First:

```text
HISTORICAL_OCCURRENCE
```

No historical variant relation just because text differs.

## Consumer UX

```text
FREE_READY
History: PROCESSING
↓
History updates when approved evidence arrives
```

Source timeout:

```text
SOURCE_UNAVAILABLE
```

not:

```text
No history exists.
```

## Admin

Add:

- ResearchRun inspector;
- module status;
- raw vs normalized evidence;
- review-required flag.

## QA

- Polona fixtures.
- source timeout vs no-result.
- OCR candidate safety.
- worker redelivery.
- optional source failure.
- run coalescing.

## Release state

### CLOSED FREE BETA

Small real-user cohort.

Still:

```text
NOINDEX
NO PAYMENT
```

## Exit gate — DP2

Users can understand:

- what is current fact;
- what is historical evidence;
- when system is still researching;
- uncertainty.

Operationally:

- history can fail without free result failing;
- jobs are idempotent;
- repeated same-surname requests coalesce.

---

# 22. M4 — VERTICAL SLICE 4: PREMIUM VIABILITY

## Objective

Prove that a premium product exists **before** building payment.

```text
Evidence
↓
Coverage
↓
DiscoveryIndex
↓
PremiumEligibility
↓
Premium Preview
↓
Premium Report
```

## Epics

```text
COV-001
PRE-001
PRE-002
RPT-001
ADM-002 full P0 review
```

## Coverage

Implement dimensions needed for real profiles:

```text
current population
rarity
current geography
onomastics
historical evidence
archive references
```

Unavailable dimensions remain explicit.

## DiscoveryIndex

P0 categories based on what actually exists.

Do not count:

- SearchCandidates;
- raw OCR alternatives;
- mirrors as independent discoveries;
- rights-blocked paid content.

## PremiumEligibility

Versioned conservative policy.

No commercial product until:

```text
DiscoveryIndex
+
paid rights
+
truthfulness QA
```

pass.

## Premium preview

Render real inventory, not placeholders.

Test:

```text
rich surname → eligible
low-data surname → no offer
rights-blocked → no paid inventory
```

## Report

Build report with an **internal test entitlement** before Stripe.

This is essential.

Report consumes:

```text
approved Claim bundle
```

not source calls.

ReportVersion immutable.

## Premium viability study

Run representative corpus.

Answer:

- what share of common surnames qualify?
- medium?
- rare?
- what premium categories appear?
- are reports materially deeper than free result?

Do **not** invent a target threshold before the data exists.

## Go / No-Go — DP3

### GO

Premium report repeatedly contains credible historical depth.

### NO-GO

Most reports are:

```text
free profile
+
longer narrative
```

without additional evidence.

If NO-GO:

```text
improve data/source coverage
```

before commerce.

---

# 23. ONOMASTICS DECISION GATE

Meaning/origin quality is a parallel dependency.

## Path A — IJP or other specialist rights secured

Implement licensed source and specialist onomastic Claims.

## Path B — rights not secured

Launch can still proceed if:

- current data strong;
- historical evidence strong;
- premium viability passes without pretending onomastics coverage.

Use:

```text
INSUFFICIENT_DATA
```

where appropriate.

Do not block the entire surname product waiting indefinitely for a perfect etymology partnership.

Do not use LLM knowledge as replacement.

---

# 24. CURRENT MAP DECISION GATE

If current regional surname geography is not lawfully available:

```text
current map chapter = unavailable
```

Do not block MVP.

Possible historical occurrence map can be added later, explicitly labeled as such.

---

# 25. M5 — PAID REPORT WITHOUT REAL MONEY

## Objective

Prove entitlement/report delivery architecture independently of Stripe.

Use staging-only internal command:

```text
Create Test Entitlement
```

## Build

- Report access middleware;
- CustomerIdentity skeleton;
- Entitlement;
- MagicLinkToken;
- secure session;
- private report route;
- report recovery;
- report artifact storage if needed.

## Test

```text
internal entitlement
→ report
→ access link
→ secure session
→ authorized report
```

and:

```text
no entitlement
→ denied
```

## Why before Stripe

If the report cannot be reliably delivered, payments should not be enabled.

## Exit

Complete premium experience can be tested without money.

---

# 26. M6 — VERTICAL SLICE 5: COMMERCE / PAID LIMITED BETA

## Objective

Connect verified money to an already-working report.

## Dependencies

- DP3 premium viability GO;
- M5 access works;
- consumer-law/tax/privacy review sufficiently complete.

## Epics

```text
PRV-001
ANA-001
COM-001
COM-002
COM-003
ADM-003 commerce support
```

## Before code freeze: legal/tax gates

Required:

```text
privacy/CMP decision
Terms / Privacy
consumer digital-content/service classification
withdrawal flow
VAT/accounting position
KSeF/invoice position
```

Implementation can begin with configurable placeholders, but production Stripe enablement cannot.

## COM-001

Build:

```text
Offer
CustomerIdentity
Order
PurchasePromiseSnapshot
PaymentAttempt
```

Checkout can run in Stripe test mode.

## COM-002

Build:

```text
Stripe Checkout
verified webhook
PaymentWebhookEvent
Order PAID transition
Entitlement
```

## COM-003

Build:

```text
Resend
receipt
report-ready
magic-link recovery
Refund
reconciliation job
```

## Analytics

Now add canonical server events:

```text
checkout_session_created
purchase_completed
report_ready
refund_completed
```

## Security

Complete paid requirements:

- report IDOR;
- CSRF;
- webhook signature;
- webhook replay;
- magic tokens;
- private storage;
- admin auth;
- backups restore;
- secrets scan;
- ASVS L2 mapping.

## Admin

Commerce support:

- find Order;
- Payment status;
- Entitlement;
- report;
- resend access;
- requeue report;
- refund;
- audit.

## Release state

### PAID LIMITED BETA

Enable:

```text
premium_offer_enabled
payments_enabled
```

for limited cohort / selected eligible surnames.

## Exit gate — DP4

Must prove:

```text
payment success
→ one Order paid
→ one Entitlement
→ report
→ receipt
→ report-ready email
→ recovery
```

including failures.

No SQL repair should be required for normal support scenarios.

---

# 27. M7 — PUBLIC PAID MVP HARDENING

## Objective

Turn limited paid beta into supportable public product.

## Required work

### Reliability

- payment reconciliation;
- report retry;
- queue monitoring;
- source circuit behavior;
- run coalescing load;
- stale data behavior.

### Security/privacy

- incident tabletop;
- restore test;
- processor register;
- DSAR/deletion path;
- admin role review;
- audit.

### QA

Full P0:

- resolver corpus;
- source fixtures;
- evidence/claim corpus;
- API states;
- E2E;
- payment;
- entitlement;
- security;
- consumer-law tests.

### Analytics

Baseline dashboards:

- Search/Discovery;
- Premium;
- Trust/QA;
- Coverage.

No price experiment yet.

### Support

- customer contact;
- refund process;
- factual complaint escalation;
- failed report workflow.

## Release state

### PUBLIC PAID MVP

SEO surname pages may still be mostly `NOINDEX`.

---

# 28. M8 — VERTICAL SLICE 6: SEO / ORGANIC

## Recommendation on timing

Implement SEO foundations before public paid launch:

- correct route;
- canonical metadata infrastructure;
- projection schema;
- noindex.

**Turn on indexation after the paid public product has demonstrated operational stability.**

Reason:

Organic acquisition can increase support/load rapidly.

Do not invite crawler/user scale before:

- reports;
- support;
- payment;
- profile quality;

are stable.

## Epics

```text
SEO-001 Eligibility / Projection
SEO-002 Routing / Slugs / Metadata
SEO-003 Sitemap / Linking / Search Console
SEO-004 First 250 cohort
```

## First cohort

Use Prompt 21:

```text
36 golden staging
↓
250 production INDEX pages
```

## Exit gate — DP5

- no crawler starts research;
- sitemap valid;
- pages unique;
- current dates correct;
- no rights/private leaks;
- organic visitors reach Meaningful Discovery.

Then scale:

```text
1,000
5,000
10,000+
```

by quality.

---

# 29. INTERNAL ADMIN BUILD PLAN

Admin is split into **Debug Admin** and **Operations Admin**.

## 29.1 Debug Admin — early

Starts in M2.

Read-only screens:

```text
Surname
NameForms
SourceRecord
EvidenceItem
Claim
Confidence
ResearchRun
```

Purpose:

- stop debugging truth through SQL;
- inspect provenance;
- accelerate engineering.

Can initially be:

```text
staff-only Next.js admin app
```

with limited features.

## 29.2 Review Admin — M3/M4

Add:

```text
HumanReviewTask
ReviewDecision
Evidence reject/supersede
Claim review
Rights inspection
module retry
```

## 29.3 Operations Admin — before paid

Add:

```text
commerce support
refund
entitlement
email delivery
SEO suppression
rights emergency block
audit
```

## Deployment

Use separate:

```text
apps/admin
admin.nameatlas.com
```

same monorepo, same internal application API.

SSO/MFA before production PII/commerce access.

---

# 30. QA BUILD PLAN

QA is a continuous lane.

## M0

- Vitest.
- fast-check.
- Testcontainers.
- GoldenCase schema.
- frozen clock.
- fixture connector abstraction.

## M1

Resolver core cases:

1. canonical diacritics;
2. search-only fold;
3. exact over fuzzy;
4. fuzzy never auto;
5. gender relation;
6. SearchCandidate boundary;
7. PESEL suppressed != zero.

## M2

Truth:

- Claim needs Evidence;
- family overreach blocked;
- commercial unknown blocks paid surface;
- profile contract fixtures.

## M3

Runtime:

- source timeout;
- OCR candidate;
- worker redelivery;
- run coalescing;
- partial result.

## M4

Premium:

- DiscoveryIndex excludes search candidates;
- paywall counts equal DiscoveryIndex;
- low-data no offer.

## M5/M6

- premium auth;
- Stripe webhook;
- Entitlement;
- magic link;
- refund;
- report failure.

## M7

Full P0 golden corpus and load.

## M8

SEO corpus.

---

# 31. SECURITY / PRIVACY BUILD PLAN

## Foundation

Immediately:

```text
secret scanning
environment isolation
parameterized DB
request IDs
secure headers
```

## Before public free beta

- rate limits;
- source secret isolation;
- privacy notice draft;
- no raw surname analytics;
- staging noindex.

## Before analytics

- consent architecture;
- PostHog EU;
- autocapture off;
- replay off.

## Before paid beta

- CustomerIdentity security;
- report authorization;
- magic link;
- CSRF;
- CSP;
- Stripe webhook;
- private object storage;
- admin MFA/SSO;
- audit;
- backup/restore.

## Before paid public

- ASVS L2 mapping;
- tabletop;
- DSAR/deletion;
- security regression suite.

---

# 32. DATA / LICENSING PARALLEL TRACK

This runs from M0 through launch.

## Track A — current data

Lock:

```text
PESEL production dataset
scope
suppression
freshness
```

## Track B — current geography

Research/license.

If unavailable:

```text
not blocking
```

## Track C — Polish onomastics

IJP outreach immediately.

Fallback lawful sources.

## Track D — history

Polona first.

PTG partnership work parallel for future.

## Track E — rights operations

Every source before activation:

```text
Source
RightsProfile
terms version
attribution
surface eligibility
```

---

# 33. ANALYTICS BUILD PLAN

Do not instrument everything at M0.

## M2

Build adapter + basic events:

```text
surname_search_submitted
surname_resolution_completed
free_profile_ready
free_profile_viewed
free_section_viewed
```

Only after consent implementation in relevant production context.

## M4

Add:

```text
discovery_index_ready
premium_eligibility_evaluated
premium_offer_viewed
```

## M6

Add:

```text
checkout_started
checkout_session_created
purchase_completed
report_ready
report_opened
refund_completed
```

## Post baseline

Experiments.

No price test immediately.

---

# 34. OBSERVABILITY BUILD PLAN

## From first backend

```text
structured logs
request_id
error code
```

## M2

Add trace context through:

```text
search
resolver
PESEL
Claim pipeline
```

## M3

OpenTelemetry:

```text
ResearchRun
module
source call
queue
```

## M6

Add commerce spans:

```text
checkout
webhook
entitlement
report
email
```

Do not export personal source payloads.

---

# 35. CACHE / REDIS TIMING

Before M3:

```text
PostgreSQL projection
```

is sufficient.

At M3:

Redis-compatible store becomes justified for:

- BullMQ;
- run coordination;
- transient operational cache.

Do not add Redis on day one merely to cache one PESEL lookup.

---

# 36. LLM TIMING

Do not integrate an LLM before M2 truth pipeline.

First legitimate use:

```text
approved Claims
↓
structured synthesis / narrative
```

If the free profile works well without it:

delay LLM until M3/M4.

## LLM P0

- provider adapter;
- prompt registry;
- strict schemas;
- mock provider;
- bounded retry;
- deterministic fallback.

## Never

```text
surname string
→ model
→ etymology fact
```

---

# 37. SOURCE CONNECTOR ABSTRACTION TIMING

Do not spend M0 building an enterprise connector framework.

Sequence:

```text
minimal Connector contract
↓
PESEL
↓
identify friction
↓
Polona
↓
harden shared interface
```

The second connector is the test of the abstraction.

---

# 38. API BUILD ORDER

## M1 internal

Direct application service / temporary JSON route acceptable.

## M2 canonical P0

```http
POST /api/v1/surname-searches
PUT  /api/v1/surname-searches/{search_id}/resolution
GET  /api/v1/surnames/{surname_id}/profile
```

## M3

```http
GET /api/v1/research-runs/{research_run_id}
GET /api/v1/research-runs/{research_run_id}/events
```

## M6

```http
POST /api/v1/checkout-sessions
GET  /api/v1/reports/{report_id}
GET  /api/v1/commerce/orders/{public_order_reference}/status
POST /api/v1/report-access-links
```

OpenAPI generated from shared schemas before external contracts proliferate.

---

# 39. FRONTEND BUILD ORDER

## M1

Developer view only.

## M2

First consumer:

```text
search
resolver clarification
population
rarity
source
```

## M3

Add:

```text
processing history
history ready
source unavailable
low data
```

## M4

Add:

```text
adaptive meaning/origin if valid
DiscoveryIndex
premium offer/ineligible
```

## M5

Add premium report/access.

## M6

Checkout/status/recovery.

## M8

SEO SSR polish.

---

# 40. DESIGN SYSTEM BUILD ORDER

Only build needed components:

```text
SearchInput
SurnameHeader
StatusNotice
Stat
ConfidenceBadge
Citation
Chapter
SourceCard
Loading/Partial State
DiscoveryPreview
OfferCard
ReportBlock
```

Map component only once valid map data exists.

---

# 41. FREE BETA RELEASE SEQUENCE

Recommended:

```text
INTERNAL ALPHA
↓
CLOSED FREE BETA
↓
PUBLIC FREE BETA — NOINDEX
↓
PAID LIMITED BETA
↓
PUBLIC PAID MVP
↓
SEO 250
```

## Why SEO after paid public

SEO is an acquisition multiplier.

Operational product must be able to absorb traffic first.

SEO infrastructure can be built earlier and kept `NOINDEX`.

---

# 42. INTERNAL ALPHA CHECKLIST

- resolver core;
- PESEL;
- Evidence/Claim/Confidence;
- basic page;
- golden tests;
- read-only inspector;
- request IDs.

---

# 43. CLOSED FREE BETA CHECKLIST

Add:

- Polona;
- async;
- partial failures;
- ambiguity;
- low-data;
- review tooling;
- feedback capture;
- privacy basics.

No payment.

No SEO indexation.

---

# 44. PUBLIC FREE BETA CHECKLIST

Add:

- production domain;
- security headers;
- rate limiting;
- source monitoring;
- consent/analytics if enabled;
- public Terms/Privacy where required;
- support contact;
- staging/prod separation;
- backup.

Still:

```text
premium disabled
SEO surname pages NOINDEX
```

if product is not ready for broad acquisition.

---

# 45. PAID LIMITED BETA CHECKLIST

- DP3 premium GO;
- real premium report;
- legal/tax sign-off;
- Stripe live;
- Entitlement;
- Resend;
- recovery;
- refund;
- reconciliation;
- commerce admin;
- security tests;
- restore tested.

Limit:

```text
selected eligible surnames/users
```

with feature flag.

---

# 46. PUBLIC PAID MVP CHECKLIST

- all Prompt 17 P0 blockers pass;
- consumer/free states complete;
- paid support runbook;
- incident response;
- privacy deletion;
- stable report fulfillment;
- analytics/reconciliation;
- no critical admin SQL dependency.

---

# 47. MASTER IMPLEMENTATION ROADMAP

| Seq | Milestone | Epic | Dependency | Effort | Risk | Output | Blocks Paid MVP |
|---:|---|---|---|---|---|---|---|
| 1 | M0 | FND-001 Monorepo & CI | — | S | LOW | build/test skeleton | YES |
| 2 | M0 | INF-001 Render/S3 environments | FND-001 | M | MEDIUM | local/staging infra | YES |
| 3 | M0 | DB-001 Canonical P0 schema A/B | FND-001 | M | HIGH | identity/source/truth tables | YES |
| 4 | M0 | QA-001 Golden/Test foundation | FND-001 | M | HIGH | Vitest/fast-check/Testcontainers | YES |
| 5 | M0 | DAT-001 Source + Rights registry | DB-001 | S | CRITICAL | fail-closed sources | YES |
| 6 | M1 | RES-001 Resolver v1 | DB-001, QA-001 | L | CRITICAL | safe PL identity | YES |
| 7 | M1 | SRC-001 PESEL ingest | DAT-001 | M | CRITICAL | current counts | YES |
| 8 | M1 | TRU-001 Evidence core | DB-001, SRC-001 | M | CRITICAL | SourceRecord→Evidence | YES |
| 9 | M1 | TRU-002 Current Claims/Confidence | TRU-001 | M | CRITICAL | count/rank/rarity Claims | YES |
| 10 | M2 | API-001 Search/Profile contracts | RES-001, TRU-002 | M | HIGH | first canonical API | YES |
| 11 | M2 | WEB-001 Free Profile v1 | API-001 | M | HIGH | user search→result | YES |
| 12 | M2 | ADM-001 Read-only inspector | TRU-002 | S | MEDIUM | internal truth debugger | YES |
| 13 | M2 | OBS-001 Logging/Tracing baseline | API-001 | S | MEDIUM | request/run visibility | YES |
| 14 | M3 | SRC-002 TERYT/GUS place foundation | DAT-001 | M | MEDIUM | canonical places | YES for history |
| 15 | M3 | SRC-003 Polona connector | DAT-001 | L | HIGH | historical SourceRecords | YES |
| 16 | M3 | RUN-001 Research runtime | API-001 | L | HIGH | Run/Plan/Module states | YES |
| 17 | M3 | RUN-002 BullMQ/Outbox | RUN-001, INF-001 | L | CRITICAL | reliable async | YES |
| 18 | M3 | TRU-003 Historical Claims | SRC-003, TRU-001 | M | CRITICAL | historical occurrence truth | YES |
| 19 | M3 | WEB-002 Partial/SSE states | RUN-001, TRU-003 | M | HIGH | FREE_READY + enriching | YES |
| 20 | M4 | COV-001 Coverage/DataGap | TRU-002, TRU-003 | M | HIGH | adaptive depth | YES |
| 21 | M4 | PRE-001 DiscoveryIndex | COV-001 | M | CRITICAL | truthful inventory | YES |
| 22 | M4 | PRE-002 PremiumEligibility | PRE-001 | S/M | CRITICAL | paywall gate | YES |
| 23 | M4/M5 | RPT-001 Premium Report | PRE-001 | L | CRITICAL | immutable paid artifact | YES |
| 24 | M4 | ADM-002 Review/Rights ops | TRU-003, RUN-001 | M | HIGH | human review | YES |
| 25 | M5/M6 | ANA-001 Consent-aware analytics | WEB-001, PRV rules | M | HIGH | baseline funnel | YES before broad launch |
| 26 | M5/M6 | PRV-001 Privacy/Security paid readiness | INF/API | L | CRITICAL | paid security/legal controls | YES |
| 27 | M6 | COM-001 Customer/Offer/Order/Promise | PRE-002, RPT-001 | M | CRITICAL | commerce domain | YES |
| 28 | M6 | COM-002 Stripe/Webhook/Entitlement | COM-001 | L | CRITICAL | money→access | YES |
| 29 | M6 | COM-003 Delivery/Refund/Reconciliation | COM-002 | L | CRITICAL | supportable purchase | YES |
| 30 | M8 | SEO-001 Eligibility/Projection/Routing | WEB stable, COV | L | HIGH | controlled organic layer | NO for payment; YES for SEO launch |

---

# 48. FIRST 30 EPICS — DETAILED

## FND-001 — Monorepo & Engineering Foundation

**Why:** all later work depends on stable shared packages.

**Deliverables**

- apps/web;
- apps/admin;
- apps/worker;
- packages/contracts/domain/testing;
- TypeScript strict;
- pnpm;
- formatting/lint;
- build scripts;
- GitHub Actions.

**Acceptance**

```text
pnpm test
pnpm build
```

pass from clean checkout.

**Effort:** S  
**Risk:** LOW  
**Blocks paid MVP:** YES

---

## INF-001 — Production-shaped Infrastructure

**Dependencies:** FND-001

**Deliverables**

- Render staging project/environment;
- Frankfurt web;
- Frankfurt Postgres;
- Key Value;
- worker service skeleton;
- S3 private bucket;
- secret configuration;
- `render.yaml`.

**Acceptance**

- web connects privately to DB;
- worker can reach Key Value;
- PostGIS/pg_trgm enable;
- no production secret in repository.

**Effort:** M  
**Risk:** MEDIUM  
**Blocks:** YES

---

## DB-001 — Canonical P0 Schema

Implement staged Groups A/B.

**Acceptance**

- migration up/down/forward process;
- UUIDv7;
- uniqueness;
- Testcontainers migration test.

**Effort:** M  
**Risk:** HIGH

---

## QA-001 — Test Foundation

- GoldenCase schema;
- fixture connector;
- frozen clock;
- fast-check;
- DB integration harness.

**Acceptance**

first 7 critical resolver/data tests run in CI.

**Effort:** M  
**Risk:** HIGH

---

## DAT-001 — Source & Rights Registry

- Source;
- RightsProfile;
- production status;
- attribution;
- terms version.

**Acceptance**

connector cannot activate with material rights unknown.

**Effort:** S  
**Risk:** CRITICAL

---

## RES-001 — Polish Resolver v1

Document 13 P0 minus later script/phonetic features.

**Acceptance**

- 160 resolver corpus target by release;
- early blocker subset during implementation;
- zero forbidden auto-merge on hard cases.

**Effort:** L  
**Risk:** CRITICAL

---

## SRC-001 — PESEL Ingestion

- immutable ingest;
- schema check;
- snapshot;
- mapping;
- local lookup.

**Acceptance**

representative surnames produce source-backed current values.

**Effort:** M  
**Risk:** CRITICAL

---

## TRU-001 — Evidence Core

- EvidenceItem;
- directness;
- source lineage;
- rights;
- fingerprints;
- Citation.

**Acceptance**

Evidence can trace to immutable SourceRecord.

**Effort:** M  
**Risk:** CRITICAL

---

## TRU-002 — Current Claims / Confidence

- count;
- rank;
- rarity;
- ConfidenceAssessment;
- reason codes.

**Acceptance**

no current fact bypasses Claim.

**Effort:** M  
**Risk:** CRITICAL

---

## API-001 — Search / Resolution / Profile API

- shared Zod contracts;
- errors;
- request IDs;
- OpenAPI generation;
- ETag baseline.

**Effort:** M  
**Risk:** HIGH

---

## WEB-001 — Free Profile v1

- search;
- resolver states;
- count;
- rarity;
- sources;
- low-data;
- accessible UI.

**Effort:** M  
**Risk:** HIGH

---

## ADM-001 — Read-only Research Inspector

- surname;
- forms;
- source record;
- Evidence;
- Claims;
- run.

No mutation.

**Effort:** S  
**Risk:** MEDIUM

---

## OBS-001 — Structured Observability

- structured logs;
- request_id;
- basic OTel;
- external-source errors redacted.

**Effort:** S  
**Risk:** MEDIUM

---

## SRC-002 — Place Foundation

- TERYT/GUS reference;
- Place;
- PlaceName;
- admin hierarchy.

**Effort:** M  
**Risk:** MEDIUM

---

## SRC-003 — Polona Connector

- bounded query;
- SourceRecord;
- metadata;
- locator;
- rights state;
- source failures.

**Effort:** L  
**Risk:** HIGH

---

## RUN-001 — Research Runtime

- ResearchPlan;
- ResearchRun;
- ResearchModuleRun;
- profile state;
- planner;
- partial readiness.

**Effort:** L  
**Risk:** HIGH

---

## RUN-002 — BullMQ / Outbox

- Key Value;
- worker;
- queue classes;
- outbox;
- retries;
- idempotency;
- crash recovery.

**Effort:** L  
**Risk:** CRITICAL

---

## TRU-003 — Historical Occurrence Claims

- HistoricalOccurrence;
- occurrence Claim;
- temporal/place guards;
- OCR safety.

**Effort:** M  
**Risk:** CRITICAL

---

## WEB-002 — Async / Partial Product States

- history processing;
- source unavailable;
- profile updated;
- SSE;
- polling fallback.

**Effort:** M  
**Risk:** HIGH

---

## COV-001 — Coverage / Data Gaps

- dimensions;
- DataGap reasons;
- adaptive chapters.

**Effort:** M  
**Risk:** HIGH

---

## PRE-001 — DiscoveryIndex

- categories;
- dedupe;
- counts;
- surface/right gating.

**Effort:** M  
**Risk:** CRITICAL

---

## PRE-002 — PremiumEligibility

- versioned policy;
- eligible/ineligible reasons;
- truthful Offer boundary.

**Effort:** S/M  
**Risk:** CRITICAL

---

## RPT-001 — Premium Report

- Report;
- ReportVersion;
- report blocks;
- claim bundle freeze;
- QA;
- test entitlement.

**Effort:** L  
**Risk:** CRITICAL

---

## ADM-002 — Human Review / Rights Ops

- HumanReviewTask;
- ReviewDecision;
- source/evidence/claim review;
- rights impact view;
- retry module.

**Effort:** M  
**Risk:** HIGH

---

## ANA-001 — Analytics / Consent

- consent state;
- adapter;
- explicit events;
- PostHog EU;
- no raw surname;
- core dashboards.

**Effort:** M  
**Risk:** HIGH

---

## PRV-001 — Paid Privacy / Security Readiness

- report authorization;
- magic security foundation;
- CSP/CSRF;
- admin MFA/SSO;
- backups;
- DSAR;
- incident;
- ASVS mapping.

**Effort:** L  
**Risk:** CRITICAL

---

## COM-001 — Offer / Customer / Order / Promise

- Offer;
- CustomerIdentity;
- Order;
- PaymentAttempt;
- PurchasePromiseSnapshot.

**Effort:** M  
**Risk:** CRITICAL

---

## COM-002 — Stripe / Webhook / Entitlement

- Stripe Checkout;
- PaymentWebhookEvent;
- signature;
- amount/currency;
- Entitlement.

**Effort:** L  
**Risk:** CRITICAL

---

## COM-003 — Delivery / Refund / Reconciliation

- Resend;
- receipt;
- report-ready;
- MagicLink;
- refund;
- daily reconciliation;
- support actions.

**Effort:** L  
**Risk:** CRITICAL

---

## SEO-001 — SEO Eligibility / Projection / Routing

- SEOEligibilityAssessment;
- SEOProfileProjection;
- Unicode slugs;
- aliases;
- SSR;
- sitemap;
- noindex/index;
- first cohort tooling.

**Effort:** L  
**Risk:** HIGH  
**Blocks paid:** NO  
**Blocks organic launch:** YES

---

# 49. ADDITIONAL POST-30 EPICS

After paid MVP or in safe parallel:

```text
SEO-002 Directory / Internal Links
SEO-003 Search Console / Cohort Rollout
ADM-003 SEO + Commerce Ops hardening
QA-002 Load / k6
SEC-002 External penetration test remediation
DAT-002 Licensed onomastics connector
SRC-004 additional historical source
```

---

# 50. FIRST 25 GOLDEN TESTS → MILESTONES

| Test | Milestone |
|---|---|
| canonicalKey preserves diacritics | M0/M1 |
| diacritic fold search only | M1 |
| exact precedes fuzzy | M1 |
| fuzzy never auto | M1 |
| gender accepted/generated distinction | M1 |
| SearchCandidate not historical variant | M1/M3 |
| PESEL suppressed not zero | M1 |
| source timeout not no result | M3 |
| Polona OCR not verified variant | M3 |
| mirrors independence | M3/P1 |
| Claim without Evidence fails | M2 |
| occurrence cannot create family Claim | M2/M3 |
| current geography not origin | M2/M4 |
| earliest found has coverage | M3 |
| commercial unknown blocks paid | M2 |
| DiscoveryIndex excludes candidates | M4 |
| paywall = DiscoveryIndex | M4 |
| worker redelivery idempotent | M3 |
| concurrent surname coalescing | M3 |
| free profile survives history failure | M3 |
| premium payload needs Entitlement | M5/M6 |
| ETag 304 | M2/M3 |
| SSE reconnect | M3 |
| LLM unknown Evidence ID rejected | M4 if LLM |
| sparse narrative invents no origin | M4 if LLM |

---

# 51. ONE-ENGINEER BUILD ORDER

If only one engineer is available, do not parallelise core engineering.

Use this sequence.

```text
01 FND-001
02 QA-001 skeleton
03 DB-001 Group A
04 DAT-001
05 PESEL spike
06 RES-001 exact/core
07 DB-001 Group B
08 SRC-001 PESEL production ingest
09 TRU-001
10 TRU-002
11 API-001 current subset
12 WEB-001
13 ADM-001
14 OBS-001

→ INTERNAL ALPHA

15 SRC-002
16 Polona spike
17 SRC-003
18 RUN-001
19 RUN-002
20 TRU-003
21 WEB-002

→ CLOSED FREE BETA

22 COV-001
23 PRE-001
24 PRE-002
25 Premium viability corpus
26 RPT-001
27 ADM-002

→ PREMIUM GO/NO-GO

28 PRV-001
29 ANA-001
30 COM-001
31 COM-002
32 COM-003

→ PAID LIMITED BETA

33 launch hardening / full QA
34 PUBLIC PAID MVP

35 SEO-001
36 SEO first 250
```

External legal, tax and source partnership work happens in parallel from item 1.

---

# 52. THREE-ENGINEER PARALLEL PLAN

## Engineer A — Domain / Data / Runtime

Primary ownership:

```text
DB
resolver
connectors
Evidence/Claim
runtime
Coverage
DiscoveryIndex
```

## Engineer B — Product / API / Frontend / Reports

Primary:

```text
contracts
API
web
Storybook
async UX
premium report
SEO render
```

## Engineer C — Infra / QA / Admin / Commerce

Primary:

```text
CI
Render
tests
observability
admin
Stripe
email
security integrations
```

## Synchronisation points

### Sync A

After:

```text
Resolver + PESEL DTO
```

Engineer B builds first consumer page.

### Sync B

After:

```text
Evidence/Claim schemas
```

Admin and frontend consume stable projections.

### Sync C

After:

```text
ResearchRun module contract
```

worker/API/frontend partial state integrate.

### Sync D

After:

```text
DiscoveryIndex
```

report/paywall/commerce begin.

### Sync E

Before paid beta

All three converge on:

- E2E;
- payment failure;
- report fulfillment;
- security;
- support.

Do not split into permanent “backend” and “frontend” silos.

---

# 53. PARALLELISATION MATRIX

| Work | Can start with | Cannot finish before |
|---|---|---|
| Visual free-profile design | M0 | DTO shapes M1/M2 |
| IJP outreach | day zero | external response |
| PTG outreach | day zero | external agreement |
| Legal/privacy review | M0 | actual flows/schema |
| Tax review | M4 | Offer/product classification |
| Admin read-only UI | M1 | canonical IDs/tables |
| Storybook | WEB-001 | components/DTO |
| Analytics schema | M2 | real product events |
| Stripe test integration spike | M0/M1 | should not become product code before DP3 |
| SEO URL architecture | M2 | profile route |
| SEO projection | M4+ | stable public profile |
| SEO indexation | after paid/stable | SEO QA + production stability |
| Full admin ops | M3 | real review/commerce states |
| LLM narrative | M2+ | Claim pipeline |
| Family Origin | post-launch | privacy/person architecture |

---

# 54. GO / NO-GO DECISION POINTS

## DP1 — DATA VIABILITY

### Questions

- Does selected PESEL resource answer current population reliably?
- Are suppression semantics understood?
- Can surnames resolve safely?
- Can at least one historical source produce usable records?
- Are rights sufficient?

### GO

Proceed to full free product.

### NO-GO

Fix source/resolver before building monetisation.

---

# 55. DP2 — FREE PRODUCT VIABILITY

Questions:

- Do users understand result?
- Is free result meaningfully useful?
- Are confidence/limitations understandable?
- Does async historical enrichment work?

Failure here is product/truth issue, not paywall issue.

---

# 56. DP3 — PREMIUM INVENTORY VIABILITY

Questions:

- Does representative corpus produce real additional historical inventory?
- Is premium report materially deeper?
- Are paid surface rights valid?
- Does low-data policy correctly suppress offers?

No payment if answer is weak.

---

# 57. DP4 — COMMERCE READINESS

Questions:

- legal/tax sign-off?
- Stripe verified?
- report access secure?
- refund/recovery?
- reconciliation?
- support?
- paid report failure safe?

Only then enable live money.

---

# 58. DP5 — SEO READINESS

Questions:

- public template stable?
- enough unique content?
- crawler no research?
- 250 cohort QA?
- sitemap/canonical?
- Search Console?

---

# 59. DP6 — FAMILY ORIGIN READINESS

Post-MVP only.

Requires:

- stable surname product;
- privacy/DPIA;
- FamilyWorkspace;
- living-person rules;
- PersonCandidate model;
- sources;
- review workflow.

---

# 60. EXTERNAL DEPENDENCIES

| Dependency | Start | Blocks first slice? | Blocks paid MVP? | Contingency |
|---|---|---:|---:|---|
| PESEL source validation | M0 | YES | YES | none — core |
| IJP commercial agreement | M0 | NO | NO if fallback value sufficient | launch with limited onomastics |
| current regional map licence | M0 | NO | NO | omit map |
| PTG agreement | M0 | NO | NO | post-MVP |
| Polona production access/rights | M0/M2 | YES for chosen history slice | YES unless replacement | use alternate lawful history source |
| Stripe onboarding | M1 | NO | YES | build test commerce first |
| Resend/domain setup | M4 | NO | YES | SES/alternate |
| PostHog DPA/config | M2 | NO | broad analytics only | no analytics until ready |
| privacy counsel | M0 | NO for internal | YES | no paid/public tracking |
| consumer-law counsel | M3/M4 | NO for free | YES | no live payments |
| accountant/tax adviser | M3/M4 | NO for free | YES | no live payments |
| production domain | M2 | NO | YES public | temporary staging only |

---

# 61. ROADMAP CONFLICT / CHANGE PROPOSALS

No foundational architecture reversal is required.

## RC-23-01 — staged schema migrations

Document 11 listed all MVP tables as a recommended first migration group.

Roadmap changes **implementation timing only**:

```text
schema definitions remain canonical
actual migrations staged by vertical slice
```

Reason:

- avoids building unused tables before proof;
- does not change semantics.

**Accept.**

## RC-23-02 — Polling before SSE during development

Document 16 requires SSE + polling fallback for P0.

Roadmap allows polling first during internal implementation, but requires SSE before closed/public async UX is considered complete.

No final contract change.

**Accept.**

## RC-23-03 — BullMQ delayed until historical slice

Document 15 requires BullMQ P0.

Roadmap introduces it when async work begins, not at repository creation.

No final architecture change.

**Accept.**

## RC-23-04 — Admin Document 22

Full generated Doc 22 was unavailable at roadmap build time.

Use Prompt 22 P0 requirements as implementation baseline.

No advanced admin capability may be added to critical path without demonstrated operational need.

---

# 62. FIRST ENGINEERING DEMOS

## Demo 1

```text
CLI/test:
Kowalski
→ canonical surname
→ PESEL count
```

## Demo 2

```text
browser:
Kowalski
→ count
→ rarity
→ source/date
```

## Demo 3

```text
browser:
free result ready
→ history processing
→ Polona occurrence appears
```

## Demo 4

```text
rich surname
→ DiscoveryIndex
→ eligible premium preview
```

## Demo 5

```text
internal entitlement
→ premium report
→ magic-link access
```

## Demo 6

```text
Stripe test payment
→ webhook
→ Entitlement
→ report
```

Every demo proves architecture, not just UI.

---

# 63. FIRST PERFORMANCE BENCHMARKS

Benchmark after M3:

```text
cached profile
exact resolver
PESEL local lookup
uncached history run
100 concurrent requests for same surname
```

Measure:

```text
p50/p95
DB queries
ResearchRuns created
connector calls
queue wait
```

Do not invent launch SLO before measurement.

---

# 64. RUN COALESCING

Implement in M3 before broad beta.

Hard scenario:

```text
100 users search Kowalski
```

Expected:

```text
one compatible active shared historical run
```

not 100 Polona calls.

---

# 65. REFRESH / STALENESS

Before scheduled refresh system is considered complete:

- source snapshot date;
- FRESH;
- STALE_SERVABLE;
- STALE_BLOCKING;
- dirty;
- missing.

Do not implement generic refresh scheduler before first actual source update need.

---

# 66. SCHEDULED JOBS

P0 cron jobs:

```text
source freshness checks
commerce reconciliation
outbox recovery
rights review reminders
```

PESEL refresh when official new dataset is detected/approved.

No arbitrary daily re-ingestion.

---

# 67. FEATURE FLAGS / KILL SWITCHES

Introduce before risky public capabilities.

Minimum:

```text
premium_offer_enabled
payments_enabled
historical_enrichment_enabled
seo_publication_enabled
llm_narrative_enabled
```

Emergency:

```text
source_disabled:{source}
```

Do not wrap every component in a flag.

---

# 68. ROLLBACK STRATEGY

Need independent rollback paths:

```text
application deploy rollback
prompt/model version rollback
connector disable
LLM disable
SEO suppress
payment pause
```

DB migration rollback uses forward corrective migration where destructive rollback unsafe.

---

# 69. BACKUP / RECOVERY

Before paid beta:

- Render Postgres paid PITR enabled;
- logical backup/export run;
- S3 copy policy if adopted;
- actual restore test;
- private object storage recovery documented.

A backup that has never been restored is not a verified backup.

---

# 70. LEGAL / PRIVACY DOCUMENT TIMING

Do not draft final policies before architecture exists.

Do not wait until launch either.

Recommended:

```text
M0/M1:
processing/data map draft

M2/M3:
privacy/CMP implementation draft

M4:
consumer/tax final product facts

M5/M6:
final Terms/Privacy/checkout disclosures
```

---

# 71. ADMIN / OPERATIONS EXIT GATES

Before paid public:

Support must repair without raw SQL:

```text
resend access
requeue report
inspect paid status
issue approved refund
```

Research must inspect without raw SQL:

```text
SourceRecord
Evidence
Claim
run
```

Rights operator must block source/surface.

If SQL console is still required for ordinary customer recovery, paid operations are not ready.

---

# 72. P0 HUMAN REVIEW

Implement only where architecture intentionally generates REVIEW_REQUIRED.

Initial:

```text
historical ambiguous occurrence
rights
onomastic conflict when such source exists
```

Do not build a huge review platform before cases exist.

---

# 73. FREE PRODUCT USER RESEARCH

Run as soon as WEB-001 exists.

Questions:

- What did user think the result meant?
- Did they understand surname-level vs family-level?
- Was confidence understandable?
- Which insight delivered first real value?
- Was source information trustworthy or confusing?

Do not wait for checkout.

---

# 74. PREMIUM USER RESEARCH

Before real money:

Show representative real reports.

Ask:

- Is free vs paid difference obvious?
- Does DiscoveryIndex accurately set expectations?
- What would feel misleading?
- Is report deeper or merely longer?

Use findings to adjust product presentation, not truth thresholds.

---

# 75. DATA COVERAGE STUDY

Before DP3, sample across:

```text
common
medium
rare
foreign-in-Poland
compound
low-data
```

Measure:

- current count coverage;
- onomastics coverage;
- historical hit coverage;
- premium eligibility;
- rights blocks.

This is more important than polishing checkout.

---

# 76. UNIT ECONOMICS STUDY

Once report pipeline runs:

Estimate per premium report:

```text
payment fee
LLM usage
source/API cost
worker compute
email
storage
manual review incidence
```

No need for exact fully-loaded corporate accounting.

Question:

> Does the product remain economically sensible at candidate prices?

---

# 77. SEO VIABILITY STUDY

Before cohort 250:

Generate SEO projection for 36 golden surnames.

Measure:

- value families;
- unique Claim density;
- duplicate text;
- source coverage;
- render performance;
- title correctness.

No production index until this passes.

---

# 78. CRITICAL PATH TABLE

| Step | Must prove | Failure consequence |
|---|---|---|
| Resolver | correct entity | stop; everything downstream unsafe |
| PESEL | real current fact | stop current-data MVP |
| Evidence/Claim | provenance | stop publication |
| Free UI | user value | reconsider product flow |
| Historical source | premium-depth seed | choose alternate source/data work |
| Async runtime | partial reliable research | no scale/premium |
| DiscoveryIndex | truthful inventory | no paywall |
| Premium report | materially deeper output | no commerce |
| Legal/tax/privacy | lawful paid flow | no live payments |
| Stripe/Entitlement | money→access correctness | no paid beta |
| Support/reconciliation | operational repair | no public paid launch |
| SEO projection | quality at scale | no indexation scale |

---

# 79. MUST-FIX VS CAN-WAIT

## BLOCK LAUNCH

- false merge blocker;
- unsupported factual publication;
- paid-rights violation;
- report authorization bypass;
- browser-success Entitlement;
- payment/order mismatch unresolved;
- no refund/support path;
- no backup/restore;
- missing consumer/tax sign-off;
- DiscoveryIndex mismatch;
- family overreach;
- raw card data entering app.

## SHIP WITH LIMITATION

- no current map;
- limited meaning/origin;
- limited historical records;
- no PDF;
- no English SEO;
- manual support refund interface;
- one historical source.

## P1

- global search packs;
- Family Origin;
- richer admin;
- additional sources;
- updated reports;
- multi-currency.

---

# 80. TOP 20 EXECUTION RISKS

## 1. Architecture work continues instead of real PESEL implementation

**Mitigation:** M0 exits only after real PESEL spike.

## 2. Onomastics licence stalls product

**Mitigation:** IJP outreach immediately; launch path does not depend on unsupported rights.

## 3. Current map unavailable

**Mitigation:** adaptive UI; map non-blocking.

## 4. Resolver overengineering

**Mitigation:** Polish P0 only; defer phonetics/Cyrillic/OCR.

## 5. LLM added before truth layer

**Mitigation:** no LLM fact generation; first UI can be deterministic.

## 6. Admin built too late

**Mitigation:** read-only inspector in M2.

## 7. QA added after features

**Mitigation:** QA-001 M0 and golden tests per milestone.

## 8. Premium inventory is hypothetical

**Mitigation:** DP3 corpus before payments.

## 9. Stripe built before report

**Mitigation:** internal entitlement report milestone first.

## 10. SEO built before page quality

**Mitigation:** SEO infrastructure noindex; index after paid stability.

## 11. Legal review arrives too late

**Mitigation:** legal/tax lane M0; final product facts M4.

## 12. Cloud complexity

**Mitigation:** one main Render plane; no Kubernetes/multi-cloud.

## 13. No real-user learning

**Mitigation:** free beta before commerce.

## 14. Too many connectors

**Mitigation:** PESEL + TERYT/GUS + Polona first.

## 15. Runtime cost surprise

**Mitigation:** cost fields after first external/LLM call; DP3 unit economics.

## 16. Source schema drift

**Mitigation:** immutable fixtures, fail-closed connector, source health.

## 17. Horizontal engineering silos

**Mitigation:** demos and vertical milestones.

## 18. Family features distract

**Mitigation:** explicit non-goals and DP6.

## 19. False timeline pressure causes truth shortcut

**Mitigation:** launch gates defined by invariants, not date.

## 20. Launch without repair tooling

**Mitigation:** support/admin operations are paid-launch requirement.

---

# 81. P0 QUALITY GATES

Must remain effectively zero on hard golden suite:

```text
false identity merge
false auto-resolve
unsupported factual publication
false VERIFIED
family/person overreach
rights violation
unauthorized premium exposure
paywall truth mismatch
```

Do not trade these for conversion.

---

# 82. PRODUCT GATES WITHOUT FAKE TARGETS

Do not block launch on invented:

```text
5% conversion
40% retention
```

Instead require:

- users receive understandable value;
- low-data states are honest;
- premium depth exists;
- operational failure recovery works.

Conversion baseline comes after production.

---

# 83. POST-LAUNCH HARDENING

First priority after public paid MVP:

```text
production defects
↓
golden regressions
↓
coverage analysis
↓
latency/cost
↓
support/refund analysis
↓
first SEO cohort
↓
premium funnel baseline
```

Not:

```text
Family Origin immediately
```

---

# 84. POST-LAUNCH OBSERVATION

Wait until there is enough real volume to establish:

- search outcome distribution;
- Coverage distribution;
- paid report success;
- support/refund pattern;
- source/runtime failure baseline.

Do not invent one universal number of days/users.

Use operational confidence rather than calendar.

---

# 85. P1 ROADMAP — ORDER

Recommended P1 order after stability:

## P1-A — Coverage / quality

- licensed onomastics;
- second historical source;
- better historical places;
- better conflicts/review;
- richer premium report.

## P1-B — Growth

- SEO 1k/5k/10k;
- editorial hubs;
- first valid experiments;
- price test after baseline.

## P1-C — Operations

- advanced admin;
- report updates;
- self-service support.

## P1-D — Family Origin foundations

Only after DP6:

- FamilyWorkspace;
- LivingStatus;
- privacy/DPIA;
- person input;
- family research workflow.

---

# 86. COUNTRY EXPANSION ENTRY CRITERIA

A new country is not a translation task.

Require:

```text
resolver pack
current surname source
rights
place data
historical source
privacy/legal
commerce/tax
locale
SEO policy
golden corpus
```

No global launch until a country pack passes these.

---

# 87. FAMILY ORIGIN ENTRY CRITERIA

Must all be true:

- surname paid MVP stable;
- family-value user demand confirmed;
- FamilyWorkspace schema approved;
- third-party living-person policy;
- DPIA;
- Article 14 workflow if applicable;
- private storage;
- genealogist/review workflow;
- source access capable of person research.

---

# 88. DEEP RESEARCH ENTRY CRITERIA

Additionally:

```text
PersonCandidate
record linkage gold set
chronology validation
candidate rejection model
human review SOP
```

No “AI ancestor finder” shortcut.

---

# 89. BUILD VS BUY

## Buy / managed

```text
hosting
PostgreSQL operations
queue datastore
object storage
payments
email
analytics
LLM
SSO/admin identity
```

## Build

```text
surname resolver
source normalization
rights-aware connector behavior
Evidence graph
Claim engine
confidence policy
coverage
DiscoveryIndex
research orchestration
premium eligibility
surname report logic
```

Engineering time should concentrate on the moat.

---

# 90. ADR POLICY

Use lightweight ADRs only for real deviations.

Example:

```text
ADR-001 Render as P0 runtime
ADR-002 Unicode canonical slugs
ADR-003 Stripe hosted checkout
```

Do not create ADRs for every implementation detail.

---

# 91. TECH DEBT POLICY

Every intentional shortcut records:

```text
what
why
risk
revisit trigger
```

Examples:

```text
polling before SSE
manual invoice handling
one historical source
```

Do not call permanent truth shortcut “MVP debt.”

---

# 92. ROADMAP CHANGE CONTROL

If implementation discovers architecture conflict:

```text
finding
↓
reproduce/test
↓
ROADMAP / MODEL CHANGE proposal
↓
update golden tests
↓
update relevant canonical doc/ADR
↓
implement
```

Do not silently diverge.

---

# 93. FIRST 20 TASKS TO START TOMORROW

These are intentionally concrete.

## 01

Create the Git repository and `pnpm` monorepo.

```text
apps/web
apps/admin
apps/worker
packages/domain
packages/contracts
packages/db
packages/testing
```

## 02

Enable strict TypeScript, lint/format and root build/test scripts.

## 03

Create GitHub Actions pipeline:

```text
install
typecheck
lint
unit tests
build
```

## 04

Add Vitest and create first empty test project/package.

## 05

Add fast-check.

Write:

```text
canonicalKey_preserves_diacritic_identity
```

as the first red test.

## 06

Start local PostgreSQL with PostGIS and `pg_trgm` via Docker/Testcontainers.

## 07

Implement UUIDv7 utility and database conventions:

```text
created_at
updated_at
version
```

where applicable.

## 08

Create Migration Group A:

```text
knowledge_entities
surnames
name_forms
name_form_relations
entity_external_ids
sources
rights_profiles
research_runs
```

## 09

Seed first Source records:

```text
PESEL
TERYT
Polona
```

with initial `RightsProfile` states.

## 10

Download/identify the exact approved PESEL surname dataset and store its immutable local fixture/snapshot metadata.

## 11

Write PESEL parser/schema validator against a small real fixture.

## 12

Load 20–50 representative surname rows into development DB.

## 13

Implement resolver input preservation, NFC and casefold key.

## 14

Write:

```text
diacriticFold_is_search_only
exactMatch_precedes_fuzzy
```

tests.

## 15

Implement exact Surname lookup and exact NameForm lookup.

## 16

Implement accepted Polish gender-form relation and corresponding tests.

## 17

Implement SearchCandidate runtime value object before adding fuzzy search.

## 18

Implement `pg_trgm` shortlist + edit rerank with:

```text
fuzzyCandidate_never_autoResolves
```

hard assertion.

## 19

Create first SourceRecord from imported PESEL row and first EvidenceItem factory.

## 20

Create first:

```text
CURRENT_POPULATION
```

Claim + ConfidenceAssessment + Citation and print/return the full provenance chain for one real surname.

At this point stop and demo:

```text
surname input
→ canonical ID
→ real PESEL count
→ Evidence
→ Claim
→ source
```

before adding more features.

---

# 94. FIRST TASKS AFTER THAT DEMO

Next immediate sequence:

```text
CURRENT_RANK
RARITY_CONTEXT
search API
free UI
read-only admin inspector
```

Then historical source work.

---

# 95. PAID MVP LAUNCH CHECKLIST

## Data

- [ ] PESEL production source approved.
- [ ] suppression semantics tested.
- [ ] Polona/alternate history source approved.
- [ ] source dates displayed.
- [ ] no mandatory current map without valid source.
- [ ] onomastics limitations explicit.

## Resolver

- [ ] golden hard cases pass.
- [ ] exact precedence.
- [ ] no fuzzy auto-merge.
- [ ] ambiguity flow.
- [ ] SearchCandidate provenance.

## Truth

- [ ] Evidence lineage.
- [ ] Claim schemas.
- [ ] Confidence.
- [ ] rights gates.
- [ ] scope guards.
- [ ] source failure semantics.
- [ ] family overreach blocked.

## Runtime

- [ ] ResearchRun.
- [ ] partial readiness.
- [ ] BullMQ/outbox.
- [ ] idempotency.
- [ ] coalescing.
- [ ] retries/circuit.
- [ ] invalidation.

## API/UI

- [ ] exact.
- [ ] typo.
- [ ] ambiguity.
- [ ] unresolved.
- [ ] FREE_READY.
- [ ] history processing.
- [ ] source unavailable.
- [ ] low-data.
- [ ] conflicting.
- [ ] ETag.
- [ ] SSE + polling fallback.

## Premium

- [ ] Coverage.
- [ ] DiscoveryIndex.
- [ ] PremiumEligibility.
- [ ] low-data no sale.
- [ ] immutable ReportVersion.
- [ ] PromiseSnapshot QA.

## Privacy/security

- [ ] public/private split.
- [ ] consent/CMP.
- [ ] PostHog safe config.
- [ ] report IDOR.
- [ ] CSRF/CSP.
- [ ] admin SSO/MFA.
- [ ] secrets.
- [ ] private objects.
- [ ] backup restore.
- [ ] incident tabletop.
- [ ] DSAR/deletion.

## Commerce

- [ ] Offer backend.
- [ ] Order.
- [ ] PaymentAttempt.
- [ ] Stripe live config.
- [ ] verified webhook.
- [ ] amount/currency validation.
- [ ] Entitlement.
- [ ] magic-link session.
- [ ] receipt.
- [ ] report-ready email.
- [ ] bounce recovery.
- [ ] Refund.
- [ ] reconciliation.

## Legal/tax

- [ ] Terms.
- [ ] Privacy.
- [ ] cookie/consent.
- [ ] consumer classification.
- [ ] withdrawal flow.
- [ ] VAT/accounting.
- [ ] invoice/KSeF policy.
- [ ] processor register.
- [ ] source rights.

## Support/admin

- [ ] research inspector.
- [ ] ReviewTask.
- [ ] rights block.
- [ ] order lookup.
- [ ] resend access.
- [ ] requeue report.
- [ ] refund.
- [ ] audit.

## QA

- [ ] Prompt 17 P0 golden suite.
- [ ] E2E.
- [ ] payment tests.
- [ ] entitlement tests.
- [ ] load critical paths.
- [ ] security regression.

---

# 96. SEO LAUNCH CHECKLIST

After paid public stability:

- [ ] `SEOEligibilityAssessment`.
- [ ] `SEOProfileProjection`.
- [ ] Unicode slug.
- [ ] aliases.
- [ ] 404/301.
- [ ] SSR.
- [ ] crawler zero-research test.
- [ ] sitemap.
- [ ] Search Console.
- [ ] Bing.
- [ ] 36 golden staging.
- [ ] 250 cohort.
- [ ] 50 stratified manual reviews.
- [ ] publication kill switch.

---

# 97. WHAT TO BUILD LATER, NOT NOW

Do not start coding these while paid MVP is unfinished:

```text
FamilyWorkspace
PersonCandidate
record linkage
Cyrillic resolver
Daitch-Mokotoff
OCR platform
migration reconstruction
heraldry lineage
global country packs
subscriptions
gifts
multi-currency
MoR
second PSP
custom tax engine
mass English SEO
surname-region pages
AI personalization
```

---

# 98. IMPLEMENTATION ROADMAP — COMPACT VIEW

```text
M0 FOUNDATION
  repo / DB / QA / infra / PESEL spike
        ↓
M1 CURRENT SURNAME
  resolver / PESEL / current Claims
        ↓
M2 FREE TRUTHFUL PRODUCT
  Evidence / Claim / Confidence / API / UI / inspector
        ↓
INTERNAL ALPHA
        ↓
M3 HISTORICAL DISCOVERY
  Polona / places / runtime / queue / partial UX
        ↓
CLOSED FREE BETA
        ↓
M4 PREMIUM VIABILITY
  Coverage / DiscoveryIndex / eligibility / report
        ↓
DP3 GO / NO-GO
        ↓
M5 ACCESS WITHOUT MONEY
  test entitlement / report access / magic session
        ↓
M6 COMMERCE
  legal/privacy / Stripe / Order / Entitlement / email / refund
        ↓
PAID LIMITED BETA
        ↓
M7 HARDENING
  full QA / security / support / reconciliation
        ↓
PUBLIC PAID MVP
        ↓
M8 SEO
  eligibility / projection / sitemap / 250 pages
        ↓
M9 OPTIMISE
  coverage / quality / performance / conversion
        ↓
ONLY THEN
FAMILY ORIGIN
```

---

# 99. DEFINITION OF IMPLEMENTATION READY

The architecture has reached the point where the team should stop high-level system design and begin implementation when:

- Paid MVP scope is fixed.
- Non-goals are explicit.
- Critical path is explicit.
- PESEL is the first real data proof.
- Resolver P0 scope is bounded.
- Evidence/Claim architecture is on the first consumer path.
- Admin inspection starts before operational scale.
- QA starts before fuzzy search.
- Polona is the first historical async proof.
- BullMQ starts only when async research begins.
- DiscoveryIndex is built before paywall.
- Premium report works before Stripe.
- Payment uses verified webhook before Entitlement.
- SEO indexation waits for stable public value.
- current map is not a launch blocker.
- IJP is a parallel partnership, not an excuse for LLM invention.
- legal/tax/privacy reviews run in parallel rather than at the end.
- one-engineer and multi-engineer build orders are clear.
- external dependencies have fallback paths.
- paid launch gates are measurable.
- P1/family work is off the critical path.

---

# 100. FINAL IMPLEMENTATION PRINCIPLE

The project should now move from:

```text
"What should Name Atlas eventually be?"
```

to:

```text
"Can today's commit move one real surname farther through the canonical evidence pipeline?"
```

The first engineering success is not:

```text
a beautiful landing page
```

and it is not:

```text
an AI paragraph about a surname.
```

It is:

```text
REAL SURNAME INPUT
↓
CORRECT ENTITY
↓
REAL LAWFUL SOURCE
↓
TRACEABLE EVIDENCE
↓
VALID CLAIM
↓
VISIBLE USER VALUE
```

The next success is:

```text
REAL HISTORICAL SOURCE
↓
PARTIAL ASYNC RESEARCH
↓
TRUTHFUL PREMIUM INVENTORY
```

Only then:

```text
REAL PAYMENT
↓
VERIFIED ENTITLEMENT
↓
REPORT DELIVERED
```

And only after the paid product is stable:

```text
PROGRAMMATIC ORGANIC SCALE
```

Name Atlas's implementation strategy should therefore optimize for:

> **the earliest proof of a trustworthy vertical product, not the earliest count of implemented features.**

At this point, high-level architecture should stop being the main activity.

The next action is coding:

```text
01 monorepo
02 Postgres
03 first migration
04 PESEL fixture
05 canonical surname key
06 resolver test
...
20 first real CURRENT_POPULATION Claim
```

Then demo the vertical slice before continuing.
