# NAME ATLAS — RUNTIME ORCHESTRATION

**Document:** 15. Runtime Orchestration  
**Version:** 1.0.0 — Executable Workflow Baseline  
**Date:** 2026-09-17  
**Market:** Poland first, global-ready  
**Status:** Candidate implementation specification  
**Depends on:** `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md`, `11_NAME_ATLAS_CANONICAL_DATA_MODEL.md`, `12_NAME_ATLAS_SOURCE_CONNECTOR_ARCHITECTURE.md`, `13_NAME_ATLAS_SURNAME_RESOLUTION_ENGINE.md`, `14_NAME_ATLAS_EVIDENCE_AND_CLAIM_ENGINE.md`  
**Next:** `16_NAME_ATLAS_API_AND_FRONTEND_DATA_CONTRACT.md`

---

# 0. PURPOSE, AUTHORITY AND EXECUTION PHILOSOPHY

This document converts Documents 10–14 from architecture contracts into an executable production workflow.

The runtime is responsible for answering:

> **When a user searches a surname, exactly which work happens, which work can be reused, which work runs synchronously or asynchronously, which modules may fail independently, when a partial result may be published, and what conditions must be satisfied before Name Atlas exposes free or premium output.**

The runtime does not redefine:

- canonical entities;
- source rights;
- surname-resolution semantics;
- evidence semantics;
- Claim taxonomy;
- ConfidenceStatus;
- DiscoveryIndex truth rules.

Those are inputs.

The runtime orchestrates them.

The core execution principle is:

```text
INPUT
↓
RESOLUTION
↓
CACHE / FRESHNESS DECISION
↓
RESEARCH PLAN
↓
BOUNDED SOURCE EXECUTION
↓
EVIDENCE
↓
CLAIMS
↓
CONFIDENCE
↓
RIGHTS + QA
↓
COVERAGE
↓
DISCOVERY INDEX
↓
PROJECTION
```

Never:

```text
INPUT
↓
AUTONOMOUS AI AGENT
↓
RESULT
```

Name Atlas uses:

> **deterministic orchestration + bounded specialist modules + bounded LLM nodes.**

---

# 1. EXECUTIVE RUNTIME ARCHITECTURE

## 1.1 Recommended MVP runtime stack

The recommended P0 stack is:

```text
Frontend
Next.js / TypeScript

Application + domain runtime
TypeScript modular monolith

Canonical storage
PostgreSQL + PostGIS

Queue + short-lived cache
Redis

Background job execution
BullMQ workers

Raw source artifacts
Object storage

Observability
OpenTelemetry + chosen telemetry backend

LLM provider layer
provider-neutral adapter

External data
connector architecture from Document 12
```

## 1.2 Why TypeScript end-to-end for runtime

Documents 10–14 do not require TypeScript specifically, but the MVP benefits from one main runtime language across:

- application API;
- orchestration;
- BullMQ workers;
- shared Zod/JSON Schema or equivalent contracts;
- frontend contract generation;
- resolver libraries;
- connector SDK.

Python can still be used later for specialist OCR/data-science tasks, but introducing a second primary application runtime before it is required increases deployment and schema-contract overhead.

## 1.3 Canonical state vs transport state

Critical decision:

```text
PostgreSQL = workflow source of truth

Redis/BullMQ = job transport + ephemeral operational state

Redis cache = acceleration only
```

BullMQ documentation describes strong queue semantics, retries, horizontal workers, priorities, rate limiting, flows and crash recovery. It also explicitly recommends idempotent jobs because retry/redelivery can occur.

Therefore:

> **BullMQ job completion is not the canonical record of research completion. `ResearchRun` and `ResearchModuleRun` in PostgreSQL are.**

## 1.4 Temporal

Temporal is **not** recommended for P0.

Temporal provides durable workflow execution capable of resuming after failures over very long periods. That is attractive later, especially for:

- long-running family research;
- human review pauses lasting days;
- archive correspondence;
- multi-step paid research;
- cross-service orchestration.

For surname MVP, BullMQ + PostgreSQL is operationally simpler.

Temporal becomes an upgrade candidate only after specific complexity triggers in Section 114.

## 1.5 Observability

Use OpenTelemetry for backend tracing and metrics.

As of 2026-09-17, OpenTelemetry JavaScript reports traces and metrics as stable. Logs remain less mature in the JavaScript SDK, so structured application logs can use a conventional logger while still propagating OTel trace IDs.

---

# 2. HIGH-LEVEL EXECUTION MODEL

```text
                         USER SEARCH
                             │
                             ▼
                    INPUT VALIDATION
                             │
                             ▼
                    SURNAME RESOLUTION
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                UNRESOLVED        RESOLVED
                    │                 │
                    ▼                 ▼
             CLARIFICATION       PROFILE STATE
                                      │
                            ┌─────────┼─────────┐
                            ▼         ▼         ▼
                         FRESH     STALE     MISSING
                            │         │         │
                            │         └────┬────┘
                            │              ▼
                            │        RESEARCH RUN
                            │              │
                            │       RESEARCH PLANNER
                            │              │
                            │    ┌─────────┼──────────┐
                            │    ▼         ▼          ▼
                            │ CURRENT    PLACES    HISTORY
                            │    │         │          │
                            │    └─────────┼──────────┘
                            │              ▼
                            │          EVIDENCE
                            │              ▼
                            │            CLAIMS
                            │              ▼
                            │          CONFIDENCE
                            │              ▼
                            │        RIGHTS + QA
                            │              ▼
                            │           COVERAGE
                            │              ▼
                            │       DISCOVERY INDEX
                            │              │
                            └──────────────┤
                                           ▼
                                  PROFILE PROJECTION
                                           │
                               ┌───────────┴───────────┐
                               ▼                       ▼
                         FREE EXPERIENCE       PREMIUM ELIGIBILITY
                                                       │
                                          ┌────────────┴───────────┐
                                          ▼                        ▼
                                      NOT ELIGIBLE            ELIGIBLE
                                                                   │
                                                                   ▼
                                                            PREMIUM RUN
                                                                   │
                                                                   ▼
                                                                REPORT
```

---

# 3. RUNTIME BOUNDED COMPONENTS

## 3.1 Search Entry

**Input:** raw surname + market/locale/context.  
**Output:** validated search command.  
**Mode:** synchronous.  
**Failure:** invalid input.  
**Owner:** application module.

## 3.2 Surname Resolver

**Input:** validated surname.  
**Output:** `SurnameResolution`.  
**Mode:** synchronous/local.  
**Blocking:** yes.  
**Failure:** unresolved/ambiguous is a valid outcome, not technical failure.

## 3.3 Profile State Resolver

Determines whether a reusable profile exists and whether it is sufficiently fresh for the requested product surface.

**Input:**

- surname ID;
- market;
- requested run type;
- current source-state versions;
- rights-policy state.

**Output:**

```text
FRESH
STALE_SERVABLE
STALE_BLOCKING
MISSING
DIRTY
```

## 3.4 Research Planner

Produces deterministic `ResearchPlan`.

It chooses modules, source budget, time budget and dependency graph.

No open-ended LLM planning.

## 3.5 Connector Manager

Executes source modules according to Document 12.

## 3.6 Place Resolver

Resolves place IDs/context using locally ingested and approved provider data.

## 3.7 Evidence Engine

Produces EvidenceItems and dependencies.

## 3.8 Claim Engine

Builds/updates typed Claims.

## 3.9 Confidence Engine

Runs claim-type-specific policies.

## 3.10 Rights Gate

Computes or validates `SurfaceEligibilityAssessment`.

## 3.11 QA Gate

Runs deterministic and, where justified, model-supported QA.

## 3.12 Coverage Engine

Builds `CoverageAssessment`.

## 3.13 Discovery Index Builder

Builds canonical deeper-research inventory.

## 3.14 Projection Builder

Builds `SurnameProfileProjection` and free/premium-ready structured projections.

## 3.15 Report Generator

Consumes approved canonical objects only.

It does not independently search external providers.

---

# 4. MODEL CHANGE PROPOSALS REQUIRED BY RUNTIME

Runtime execution requires several operational objects that Documents 10–14 intentionally did not fully model.

## MODEL CHANGE PROPOSAL 15-A — `ResearchPlan`

Add a versioned operational object.

Recommended fields:

```text
research_plan_id
research_run_id
plan_version
country_pack
requested_product
required_modules[]
optional_modules[]
skipped_modules[]
source_budget
time_budget_class
cost_budget_class
reason_codes[]
created_at
```

For P0 this may be stored as JSONB on `ResearchRun` plus schema version rather than a separate normalized table.

**Recommendation:** P0 JSONB value object.

---

## MODEL CHANGE PROPOSAL 15-B — `ResearchModuleRun`

Add a persistent module execution object.

Reason:

`ResearchRun` alone cannot safely represent:

- parallel source modules;
- retries;
- partial completion;
- per-module timings;
- failure semantics;
- checkpointing.

Recommended fields:

```text
research_module_run_id
research_run_id
module_id
module_version
module_type

dependency_module_ids[]
blocking_class

status
attempt_count
max_attempts

idempotency_key
input_fingerprint
output_fingerprint

started_at
completed_at

error_code
error_details_internal

cost_summary
telemetry_summary
```

Canonical statuses:

```text
PENDING
QUEUED
RUNNING
SUCCEEDED
NO_RESULT
PARTIAL
SKIPPED
FAILED_RETRYABLE
FAILED_FINAL
BLOCKED_RIGHTS
REVIEW_REQUIRED
CANCELLED
SUPERSEDED
```

**Recommendation:** P0 table.

---

## MODEL CHANGE PROPOSAL 15-C — Runtime outbox

Add:

```text
runtime_outbox
```

for reliable DB → BullMQ job publication.

Reason:

Creating a ResearchRun in PostgreSQL and enqueueing a BullMQ job in Redis are two writes to two systems. Without an outbox, process failure can leave:

- a DB run with no job;
- a job referencing missing/incomplete DB state.

Pattern:

```text
BEGIN DB TRANSACTION

insert ResearchRun
insert ResearchModuleRun / trigger intent
insert runtime_outbox event

COMMIT

outbox dispatcher
↓
BullMQ
↓
mark outbox delivered
```

**Recommendation:** P0 for critical workflow-start and invalidation jobs.

---

## MODEL CHANGE PROPOSAL 15-D — `ProjectionBuild`

Optional runtime audit for:

```text
SurnameProfileProjection
DiscoveryIndex
FreeResultProjection
ReportVersion
```

For P0, existing `built_from_run_id` plus fingerprints are sufficient.

**Recommendation:** defer dedicated table.

---

# 5. RESEARCH RUN MODEL

Prompt 11's `ResearchRun` remains canonical.

Runtime interpretation:

```text
ResearchRun
= one auditable execution attempting to improve or generate a knowledge/profile state
```

Recommended operational fields:

```text
research_run_id
surname_id
resolution_id

run_type
workflow_id
workflow_version
research_plan_version

requested_surface
priority_class

status
readiness_state

parent_run_id
supersedes_run_id
coalescing_key

country_pack
market

resolver_manifest
source_state_hash
rights_state_hash
prompt_registry_version
confidence_policy_version

started_at
first_publishable_at
completed_at

failure_summary
cost_summary
coverage_assessment_id
discovery_index_id
```

---

# 6. RESEARCH RUN TYPES

## 6.1 `FAST_LOOKUP`

Trigger:

- interactive surname search;
- no adequate projection cache.

Goal:

- fastest truthful core result.

Typical modules:

- resolver;
- PESEL/current data;
- deterministic rank/rarity;
- cached approved onomastics if available;
- profile projection.

Historical source search is not required to block first value.

Priority:

```text
INTERACTIVE_FREE
```

---

## 6.2 `STANDARD_SURNAME_RESEARCH`

Trigger:

- first search of uncached surname;
- deeper free result needed;
- user reaches historical section.

Adds:

- historical occurrence search;
- source-backed historical forms;
- basic deeper coverage.

May run asynchronously after first free readiness.

---

## 6.3 `PREMIUM_PRECOMPUTE`

Trigger:

- deeper historical inventory appears promising;
- user reaches Discovery Index area;
- popular surname background enrichment;
- product decides economically to precompute.

Goal:

- determine truthful premium inventory before sale.

Important:

> It does **not** mean the premium report has been purchased.

---

## 6.4 `PREMIUM_SURNAME_RESEARCH`

Trigger:

- purchase;
- or already precomputed research needs completion.

Goal:

- complete all modules promised by the purchased report.

Priority:

```text
PAID_ACTIVE
```

---

## 6.5 `REFRESH_EXISTING_PROFILE`

Trigger:

- PESEL new snapshot;
- source update;
- stale profile;
- rights change;
- confidence-policy change.

Runs only affected modules where possible.

---

## 6.6 `BACKGROUND_ENRICHMENT`

Trigger:

- popular surname;
- SEO candidate;
- low-priority historical expansion.

Must yield capacity to interactive/paid workloads.

---

## 6.7 `SEO_PRECOMPUTE`

Only for public, qualified surname entities.

Consumes approved claims only.

No user-specific data.

---

## 6.8 `MANUAL_REVIEW_RERUN`

Triggered by researcher/admin after resolving ambiguity.

Reruns only downstream affected stages.

---

# 7. RESEARCH RUN STATUS MODEL

Separate technical execution from product coverage.

Recommended `ResearchRunStatus`:

```text
CREATED
RESOLVING
PLANNING
RUNNING
PARTIAL_READY
BUILDING_KNOWLEDGE
QA
READY
REVIEW_REQUIRED
FAILED
CANCELLED
SUPERSEDED
```

## 7.1 `READY`

Means:

> workflow reached its defined terminal state and all required gates passed.

It does **not** mean:

> every possible source contains data.

A limited-coverage surname can have a READY run.

## 7.2 `PARTIAL_READY`

Means:

- a safe product projection exists;
- optional/deeper modules remain running or unavailable.

---

# 8. READINESS IS SEPARATE FROM RUN STATUS

Recommended `ReadinessState`:

```text
NONE
FREE_READY
PREMIUM_PREVIEW_READY
PREMIUM_REPORT_READY
```

Example:

```text
run_status = RUNNING
readiness = FREE_READY
```

This allows the product to show useful data while deeper research continues.

---

# 9. MAIN LOOKUP FLOW — EXACT EXECUTION

## Step 1 — Validate input

Synchronous.

Failure:

```text
INPUT_INVALID
```

No ResearchRun needed for clearly invalid input unless analytics/audit requires it.

---

## Step 2 — Resolve surname

Synchronous/local.

Output:

```text
SurnameResolution
```

Possible branches:

### Resolved

Continue.

### Suggestion required

Return candidate contract to UI.

Do not start expensive deep research until user confirms unless policy explicitly permits low-cost prefetch.

### Multiple candidates

Wait for user selection.

### Unresolved

Return low-data/clarification path.

---

## Step 3 — Resolve profile state

Lookup:

- current canonical Claims;
- latest valid `SurnameProfileProjection`;
- source-state hash;
- rights state;
- dirty flags.

Possible:

```text
FRESH
STALE_SERVABLE
STALE_BLOCKING
MISSING
```

---

## Step 4 — Fresh cache path

If projection is fresh for requested surface:

```text
return projection
```

Optionally schedule non-blocking background enrichment.

No ResearchRun is required unless enrichment is actually scheduled.

---

## Step 5 — Stale-servable path

Return current version with explicit source dates.

In parallel create:

```text
REFRESH_EXISTING_PROFILE
```

This is stale-while-revalidate.

Never hide source date.

---

## Step 6 — Missing/blocking-stale path

Create `ResearchRun` and outbox trigger in one PostgreSQL transaction.

---

## Step 7 — Build deterministic ResearchPlan

Inputs:

```text
SurnameResolution
country pack
requested surface
existing Claims
coverage gaps
source states
rights states
budget policy
feature flags
```

---

## Step 8 — Run P0 fast modules

Usually:

```text
current population
rank/rarity
basic approved place/current data
```

---

## Step 9 — Build deterministic Evidence/Claims

No LLM needed for core current facts.

---

## Step 10 — Run free publish gate

If minimum free readiness exists:

```text
ReadinessState = FREE_READY
run_status = PARTIAL_READY or RUNNING
```

Projection becomes available immediately.

---

## Step 11 — Continue optional/deep modules

Historical retrieval and onomastics can continue.

---

## Step 12 — Rebuild Evidence/Claims/Confidence for new modules

Incrementally.

Do not rebuild unrelated current facts on every historical result.

---

## Step 13 — Coverage + Discovery Index

Once enough research modules have reached terminal states:

- compute/update Coverage;
- compute DiscoveryIndex.

---

## Step 14 — premium truth gate

Only after:

- DiscoveryIndex built;
- surface rights pass;
- Paywall Truthfulness QA passes.

---

## Step 15 — terminal run state

Run becomes:

```text
READY
REVIEW_REQUIRED
FAILED
```

depending on required module outcomes.

---

# 10. FAST PATH VS DEEP PATH

## 10.1 Fast path

Target responsibilities:

```text
input
resolver
cache
current count
rank
rarity
core source date
approved cached interpretation if available
free projection
```

The fast path should not wait for Polona or LLM synthesis if the core result can safely publish.

## 10.2 Deep path

Potential modules:

```text
historical search
historical occurrence extraction
variant evidence
historical places
archive inventory
onomastic synthesis
conflict analysis
premium inventory
```

Run in background when not needed for first value.

## 10.3 User experience consequence

The user can receive:

```text
Population / rarity READY
History RESEARCHING
```

provided the UI shows truthful runtime state rather than fake loading.

---

# 11. USER-PERCEIVED LATENCY POLICY

Do not use a fake loader timer.

## Under ~400 ms

Return directly.

No loading spectacle.

## ~400 ms–2 s

Show subtle actual status:

```text
Checking surname data…
```

## ~2–10 s

Show real module states, for example:

```text
Current surname data      ✓
Name resolution           ✓
Historical sources        …
```

Only display modules actually running.

## Longer

Return `FREE_READY` partial projection where possible and continue asynchronously.

For optional work, never hold the entire page simply to create a more theatrical reveal.

---

# 12. SYNCHRONOUS VS ASYNCHRONOUS MATRIX

| Module | Sync | Async | Cacheable | Blocks free result? |
|---|---:|---:|---:|---:|
| Input validation | Yes | No | No need | Yes |
| Unicode normalization | Yes | No | Yes | Yes |
| Surname resolution | Yes | No | Yes | Yes |
| Profile-state lookup | Yes | No | Yes | Yes |
| PESEL local lookup | Yes | No | Yes/pre-ingested | Normally yes for PL core |
| Rank / 1-in-X | Yes | No | Yes | Normally yes |
| TERYT/local place refs | Yes when needed | Yes enrichment | Yes | No for basic count |
| GUS live geocoder | Conditional | Yes | Yes | No |
| Polona search | No by default | Yes | Yes where rights allow | No |
| Europeana/FBC search | No | Yes | Yes | No |
| Historical evidence extraction | No | Yes | Yes | No |
| Deterministic Claim build | Yes after evidence | Async module context | Persisted | Blocks relevant dimension |
| Confidence assessment | Yes/module | Async orchestration | Persisted | Blocks publication of Claim |
| Rights gate | Yes | Recompute async | Persisted | Yes per surface |
| Free projection | Yes | Can rebuild async | Yes | — |
| DiscoveryIndex | No for first reveal | Yes | Yes | Blocks premium preview |
| LLM onomastic synthesis | No | Yes | Yes by evidence hash | No basic free result |
| Premium report generation | No | Yes | Yes/versioned | Blocks report delivery |

---

# 13. ORCHESTRATION DAG

Core DAG:

```text
ResolveSurname
      │
      ▼
ResolveProfileState
      │
      ▼
BuildResearchPlan
      │
      ├──────────────────────┐
      ▼                      ▼
CurrentData              PlaceReference
      │                      │
      └──────────┬───────────┘
                 ▼
      BuildCurrentEvidence
                 │
                 ▼
      BuildCurrentClaims
                 │
                 ▼
         Confidence/Rights
                 │
                 ▼
          FreeReadinessQA
                 │
                 ▼
           FREE_READY
                 │
     ┌───────────┼──────────────────────┐
     ▼           ▼                      ▼
Historical    Onomastics             Enrichment
Search        if available           Sources
     │           │                      │
     ▼           ▼                      ▼
Evidence      Evidence               Evidence
     └───────────┼──────────────────────┘
                 ▼
             Claims
                 ▼
          Conflict Engine
                 ▼
            Confidence
                 ▼
          Surface Rights
                 ▼
                QA
                 ▼
             Coverage
                 ▼
         DiscoveryIndex
                 ▼
       PremiumEligibility
```

Optional modules can terminate independently.

---

# 14. MODULE DEPENDENCY CLASSES

Each module declares:

```text
REQUIRED_FOR_RUN
REQUIRED_FOR_FREE
REQUIRED_FOR_PREMIUM_PREVIEW
REQUIRED_FOR_PURCHASED_REPORT
OPTIONAL_ENRICHMENT
```

Examples:

### Resolver

```text
REQUIRED_FOR_RUN
REQUIRED_FOR_FREE
```

### PESEL current data for normal PL surname

```text
REQUIRED_FOR_FREE
```

unless surname is outside dataset scope and a valid alternative free experience exists.

### Polona

```text
OPTIONAL_ENRICHMENT
```

for basic free result.

Can become:

```text
REQUIRED_FOR_PURCHASED_REPORT
```

only if the report offer explicitly promises historical-source coverage dependent on it.

---

# 15. RESEARCH PLANNER

`ResearchPlanner` is deterministic policy code.

## 15.1 Input

```json
{
  "surname_id": "...",
  "resolution": {},
  "country_pack": "PL",
  "requested_run_type": "STANDARD_SURNAME_RESEARCH",
  "existing_coverage": {},
  "source_health": {},
  "rights_state": {},
  "freshness_state": {},
  "feature_flags": {},
  "budget_policy": {}
}
```

## 15.2 Output

```json
{
  "plan_version": "pl-surname-standard@1.0.0",
  "required_modules": [
    "current-pl"
  ],
  "optional_modules": [
    "polona-history"
  ],
  "skipped_modules": [
    {
      "module": "current-regional-map",
      "reason": "NO_APPROVED_SOURCE"
    }
  ],
  "time_budget_class": "INTERACTIVE_DEEP",
  "cost_budget_class": "LOW",
  "source_budget": {}
}
```

---

# 16. MODULE ELIGIBILITY CONTRACT

Each module exposes:

```text
module_id
module_version
enabled
required_inputs
required_source_capabilities
required_rights
required_prior_modules
blocking_class
cache_policy
timeout_policy
retry_policy
cost_class
```

Eligibility outcome:

```text
RUN
USE_CACHE
SKIP_NOT_NEEDED
SKIP_NO_SOURCE
SKIP_RIGHTS_BLOCKED
SKIP_FEATURE_DISABLED
SKIP_BUDGET
```

---

# 17. SOURCE EXECUTION PLAN

ResearchPlanner never says:

```text
search everything
```

It emits bounded source tasks.

Example:

```yaml
- source: PESEL
  mode: LOCAL_SNAPSHOT
  required: true
  query_tier: Q0
  max_records: 1

- source: POLONA
  mode: ASYNC_SEARCH
  required: false
  query_tiers: [Q0, Q1]
  candidate_budget: 8
  page_budget: 50

- source: EUROPEANA
  mode: SKIP
  reason: OPTIONAL_NOT_NEEDED
```

Values above are policy examples, not permanent limits.

---

# 18. SOURCE PRIORITY CLASSES

```text
P0_REQUIRED
P1_HIGH_VALUE
P2_ENRICHMENT
OPTIONAL
MANUAL
```

Example PL:

```text
PESEL            P0_REQUIRED
TERYT/local      P0/P1 depending module
Polona           P1_HIGH_VALUE historical
GeoNames         P2 enrichment
Europeana        P2 enrichment
IJP PAN          P1 if licensed
PTG              later/partner
```

---

# 19. SOURCE BUDGET

ResearchPlan contains bounded budgets such as:

```text
max_live_source_modules
max_queries_per_source
max_query_candidates
max_records_fetched
max_pages_enriched
max_ocr_pages
max_paid_provider_calls
```

The exact numbers are environment/policy config.

Never encode them as product truth.

---

# 20. TIME BUDGET CLASSES

Recommended:

```text
INTERACTIVE_FAST
INTERACTIVE_DEEP
BACKGROUND
PREMIUM
MANUAL_ASSISTED
```

## 20.1 Interactive fast

Only local/pre-ingested/cache operations plus extremely predictable calls if unavoidable.

## 20.2 Interactive deep

Can wait for a small bounded set of network modules but should still prefer partial readiness.

## 20.3 Background

Longer historical enrichment.

## 20.4 Premium

Higher budget, but still finite and monitored.

---

# 21. COST BUDGET

Recommended classes:

```text
NEAR_ZERO
LOW
MEDIUM
HIGH
HUMAN
```

Actual run accounting records:

```text
external_api_calls
paid_api_units
llm_input_tokens
llm_output_tokens
ocr_pages
bytes_processed
worker_cpu_time optional
human_review_minutes later
```

The supplementary Data & Truth research correctly emphasizes that caching repeated surnames is fundamental and that open-data surname lookup itself can be inexpensive. Runtime design therefore aggressively reuses surname-level research rather than regenerating it per user.

---

# 22. CONNECTOR CONCURRENCY

Use both:

- BullMQ worker concurrency;
- source-level rate-limit policies from Connector Registry.

A global `historical-search` worker pool does not imply unlimited calls to each provider.

Per-source policies can include:

```text
max_concurrency
max_requests_per_second
daily_quota
backoff_on_429
circuit_state
```

BullMQ supports queue/global rate limiting; provider-specific quotas remain application configuration.

---

# 23. QUEUE ARCHITECTURE — P0

Recommended queues:

```text
research-interactive
research-premium
source-maintenance
report-generation
background-enrichment
human-review-trigger
runtime-outbox-dispatch
```

Avoid one queue per tiny function.

## 23.1 Why not one queue per source?

It increases operational surface unnecessarily.

Source-level throttling belongs to connector/rate-limit policy.

If one provider later needs dedicated isolation because of throughput or API constraints, split then.

---

# 24. BULLMQ ROLE

BullMQ provides:

- worker processing;
- retries;
- priority;
- delayed jobs;
- rate limiting;
- parent/child flows;
- job deduplication;
- concurrency.

Do not use BullMQ as:

- canonical workflow history;
- evidence storage;
- Claim storage;
- immutable report state.

## 24.1 Delivery assumption

Design all workers for:

```text
at-least-once-safe execution
```

even though BullMQ aims for stronger normal-case delivery semantics.

Idempotence is mandatory.

---

# 25. JOB CONTRACT

```json
{
  "job_id": "research-module-...",
  "job_type": "RUN_RESEARCH_MODULE",
  "research_run_id": "...",
  "research_module_run_id": "...",
  "module_id": "polona-history",
  "payload_version": "1",
  "idempotency_key": "...",
  "attempt": 0,
  "priority": 30
}
```

Canonical DB row contains attempt/status history.

Queue payload should carry IDs and minimal parameters, not the whole research state.

---

# 26. IDEMPOTENCY

## 26.1 Run creation

Use a request-level idempotency key where appropriate.

For public anonymous surname lookup, duplicate sessions do not necessarily need identical ResearchRun IDs, because run coalescing can point them to a shared active run.

## 26.2 Module execution

Canonical module key:

```text
hash(
  surname_id
  + module_id
  + module_version
  + relevant input fingerprints
  + source snapshot/version
  + research context
)
```

DB unique constraint prevents duplicate semantic output.

## 26.3 Evidence

EvidenceItem uses canonical fingerprint/source locator rules from Prompt 14.

## 26.4 Claims

Claim fingerprint prevents duplicate propositions.

## 26.5 Report

Report generation key:

```text
report_id + report_input_fingerprint + renderer_version
```

---

# 27. JOB DEDUPLICATION

BullMQ supports explicit deduplication IDs and custom job IDs.

Use queue deduplication as an optimization.

Do **not** rely on it as the only correctness mechanism because:

- completed/removed jobs can later be re-added;
- queue state is not canonical.

Canonical correctness remains in PostgreSQL constraints/idempotency.

---

# 28. TRANSACTIONAL OUTBOX

P0 recommendation:

Use a minimal outbox for critical DB → queue events.

Examples:

```text
RESEARCH_RUN_CREATED
MODULE_READY_TO_EXECUTE
PROFILE_INVALIDATED
REPORT_GENERATION_REQUESTED
```

Outbox dispatcher can itself run as a small BullMQ/interval worker.

Exactly-once event processing is unnecessary; idempotent consumers are required.

---

# 29. RETRY STRATEGY

## 29.1 Transport/network retry

Retry:

- timeout;
- connection reset;
- transient 5xx;
- provider 429 according to Retry-After.

Use exponential backoff + jitter.

## 29.2 Connector semantic failure

Do not retry automatically:

```text
RIGHTS_BLOCKED
AUTH_REQUIRED_CONFIGURATION
SCHEMA_CHANGED
UNSUPPORTED_SOURCE
```

## 29.3 LLM retry

Retry for:

- transient provider failure;
- malformed JSON;
- repairable schema failure.

Do not retry because evidence legitimately leads to `INSUFFICIENT_DATA`.

## 29.4 DB failure

Retry transaction only when safe and bounded.

Never keep external calls inside a retrying database transaction.

---

# 30. TIMEOUT POLICY

Timeouts are module configuration.

They are not one global number.

Each source/module defines:

```text
interactive_timeout
background_timeout
hard_execution_limit
```

When an optional source times out:

```text
ResearchModuleRun.status = FAILED_FINAL or PARTIAL
ResearchCoverageManifest.source_status = SOURCE_UNAVAILABLE
```

Then orchestrator continues.

---

# 31. CIRCUIT BREAKER

Connector health state:

```text
CLOSED
OPEN
HALF_OPEN
```

If repeated source failures exceed policy:

- stop scheduling ordinary jobs;
- planner sees `SOURCE_UNAVAILABLE`;
- probe via low-volume health checks;
- do not hammer provider on every user request.

---

# 32. PARTIAL RESULT MODEL

Each product dimension has runtime state:

```text
NOT_STARTED
PROCESSING
READY
PARTIAL
NO_DATA
SOURCE_UNAVAILABLE
RIGHTS_BLOCKED
NOT_SUPPORTED
REVIEW_REQUIRED
```

Example:

```json
{
  "population": "READY",
  "rarity": "READY",
  "modern_geography": "NOT_SUPPORTED",
  "origin": "READY",
  "history": "PROCESSING",
  "archives": "SOURCE_UNAVAILABLE"
}
```

This object is operational.

`CoverageAssessment` remains the canonical quality/availability assessment after knowledge validation.

---

# 33. FREE RESULT READINESS

Do not make all modules blocking.

Recommended free gate:

```text
surname resolved
AND
at least one validated core identity/current-data dimension
AND
all Claims included in the initial projection passed Confidence/Rights/QA
AND
projection contains no unsupported promised module
```

For a normal Polish surname found in PESEL, desirable free readiness is:

```text
CURRENT_POPULATION
+
RARITY_CONTEXT
+
source date
```

Origin/meaning can join if already validated but should not delay a truthful hard-data result.

For a surname absent/suppressed in PESEL, a separate low-data gate applies.

---

# 34. FIRST PUBLICATION GATE

Pseudo-policy:

```python
def can_publish_free(run):
    if not run.resolution.is_resolved:
        return False

    claims = free_projection_candidate_claims(run)

    if not claims:
        return False

    if any(not claim.qa_passed for claim in claims):
        return False

    if any(not claim.free_surface_allowed for claim in claims):
        return False

    return has_meaningful_free_value(claims)
```

`has_meaningful_free_value` is explicit product policy, not LLM judgment.

---

# 35. PREMIUM ELIGIBILITY

Premium offer is only enabled when:

```text
DiscoveryIndex exists
AND
DiscoveryIndex built from validated/deduplicated objects
AND
minimum product-value policy passes
AND
all advertised inventory is premium-surface eligible
AND
Paywall Truthfulness QA passes
```

No DiscoveryIndex:

```text
no dynamic "we found X" premium claim
```

---

# 36. PREMIUM ELIGIBILITY POLICY OBJECT

Recommended config:

```json
{
  "policy_id": "full-name-atlas-pl@1",
  "required": {
    "min_eligible_sections": 2
  },
  "quality_rules": {
    "exclude_unconfirmed_only_sections": true
  }
}
```

The numeric example is illustrative.

Do not freeze thresholds before Golden Surname evaluation.

The policy must support:

- quality;
- diversity of research;
- rights;
- meaningful value;

not only counts.

---

# 37. PREMIUM PRECOMPUTE VS POST-PURCHASE RUN

## 37.1 Precompute

Use when:

- surname is popular;
- historical source cost is low;
- cache reuse probability is high;
- data are public/surname-level.

Goal:

```text
know truthful premium inventory before paywall
```

## 37.2 Post-purchase

Use for:

- higher-cost enrichment;
- report narrative/layout;
- optional deeper source expansion within promised scope.

Hard rule:

> The report may become richer after purchase, but the product must not sell a chapter whose existence depends on an unknown future discovery.

---

# 38. DISCOVERY INDEX RUNTIME

Rebuild only from approved state.

Dependencies:

```text
validated historical objects
approved Claims
ConfidenceAssessments
SurfaceEligibility
dedup/independence
CoverageAssessment
```

Triggers:

- new approved variant;
- new historical place;
- archive reference added/removed;
- Claim retracted;
- rights changed;
- dedup changed;
- ConfidenceStatus changes enough to affect eligibility.

---

# 39. COVERAGE ENGINE

Dimensions:

```text
population
rarity
modern_geography
etymology
linguistic_origin
geographic_origin
historical_variants
historical_occurrences
historical_places
archives
migration
```

Operational input may include:

```text
READY
NO_DATA
SOURCE_UNAVAILABLE
RIGHTS_BLOCKED
NOT_RESEARCHED
```

Final CoverageAssessment may be:

```text
STRONG
PARTIAL
NONE
BLOCKED_RIGHTS
SOURCE_UNAVAILABLE
NOT_RESEARCHED
```

Do not confuse:

```text
no Claim
```

with:

```text
no underlying data exists
```

---

# 40. CACHE ARCHITECTURE

## 40.1 Resolver cache

Key by:

```text
normalized input
market/context subset
resolver manifest
```

## 40.2 Source cache

Per Prompt 12, respecting source cache rights.

## 40.3 Evidence/Claim persistence

These are canonical DB data, not ordinary TTL cache.

## 40.4 SurnameProfileProjection cache

Redis/application cache.

Carries:

```text
profile_schema_version
built_from_run_id
knowledge_state_hash
rights_state_hash
built_at
```

## 40.5 Coverage cache

Can be included in profile projection and/or cached separately.

## 40.6 DiscoveryIndex cache

Canonical index exists in DB; read projection can be cached.

## 40.7 Narrative cache

Key:

```text
hash(
  approved_claim_bundle
  + prompt_version
  + model_version
  + locale
)
```

Invalidate when evidence/claims change, not because an arbitrary 30-day TTL expires.

This aligns with existing Data & Truth research.

## 40.8 Report cache

`ReportVersion` is immutable artifact metadata; rendered files may be stored in object storage.

---

# 41. PROFILE FRESHNESS

Do not build one giant cache key containing every source version.

Recommended:

Persist dependency state alongside profile:

```text
knowledge_state_hash
current_statistics_snapshot_id
onomastics_bundle_version
historical_bundle_version
rights_state_hash
projection_schema_version
```

`ProfileStateResolver` compares only dependencies relevant to the requested surface.

---

# 42. STALE-WHILE-REVALIDATE

Recommended for existing public surname profiles.

Example:

```text
2026 PESEL profile exists
2027 snapshot becomes available
```

Until refresh completes:

- old profile can remain visible if labelled with source date;
- background refresh runs;
- do not call 2026 value “2027/current” implicitly.

If rights invalidate display:

```text
STALE_BLOCKING
```

not stale-servable.

---

# 43. NEGATIVE CACHE

Negative source search cache stores:

```text
source_id
query candidate set/version
place/time scope
searched_at
result = zero
source status
```

Use short/context-sensitive freshness.

It is an optimization only.

It does not become evidence of absence.

---

# 44. INVALIDATION GRAPH

```text
Source / SourceVersion
        │
        ▼
SourceRecord
        │
        ▼
EvidenceItem
        │
        ▼
Claim
        │
        ▼
ConfidenceAssessment
        │
        ▼
SurfaceEligibility
        │
        ▼
CoverageAssessment
        │
        ▼
DiscoveryIndex
        │
        ▼
SurnameProfileProjection
        │
        ├── Narrative cache
        ├── SEO projection
        ├── Share projection
        └── Report input/version
```

Runtime should invalidate the smallest affected downstream set.

---

# 45. INTERNAL EVENT MODEL

Recommended domain/runtime events:

```text
SOURCE_VERSION_CHANGED
SOURCE_RECORD_CHANGED
SURNAME_RESOLUTION_CHANGED
EVIDENCE_CHANGED
CLAIM_APPROVED
CLAIM_INVALIDATED
CONFIDENCE_CHANGED
RIGHTS_CHANGED
COVERAGE_CHANGED
DISCOVERY_INDEX_CHANGED
PROFILE_INVALIDATED
REPORT_INPUT_CHANGED
```

Do not adopt event sourcing.

Events trigger background work; canonical current state remains relational tables.

---

# 46. EVENT-DRIVEN VS DIRECT CALLS

Recommended hybrid:

## Direct calls

Within one synchronous domain transaction/request:

```text
resolution
local current lookup
deterministic fact construction
projection read
```

## Queue jobs

For:

```text
network source retrieval
historical search
LLM work
report generation
bulk refresh
```

## Domain events/outbox

For:

```text
invalidation
rebuild scheduling
source-version fan-out
rights-change fan-out
```

---

# 47. LLM ROUTING

Allowed runtime task classes:

```text
ONOMASTIC_EVIDENCE_EXTRACTION
ONOMASTIC_SYNTHESIS
CONFLICT_EXPLANATION
FREE_NARRATIVE
PREMIUM_NARRATIVE
OPTIONAL_QA
```

Never route LLM for:

- surname canonical identity;
- PESEL count;
- rank;
- rarity calculation;
- rights decision;
- citation construction;
- deterministic Coverage count;
- payment state.

---

# 48. MODEL ROUTER

Use provider-neutral abstraction:

```text
ModelTask
risk_class
required_structured_output
max_context
cost_class
latency_class
```

Possible classes:

```text
LOW_RISK_STRUCTURING
HIGH_RISK_RESEARCH_SYNTHESIS
COPY_GENERATION
QA
```

Runtime configuration chooses provider/model.

Do not couple architecture to a model name.

---

# 49. LLM INPUT CONTRACT

Every invocation contains:

```text
task ID
task version
approved evidence/claim bundle
source limitations
forbidden inferences
output schema
locale
```

Never:

```text
Tell me the history of [surname]
```

as a production research prompt.

---

# 50. LLM OUTPUT VALIDATION

```text
LLM response
↓
JSON schema
↓
Evidence ID existence
↓
entity ID validation
↓
Claim type/scope validation
↓
unsupported proper noun/date/place check
↓
Evidence/Claim QA
```

Invalid optional narrative:

```text
drop / fallback
```

rather than block current facts.

---

# 51. LLM RETRY

Retry on:

```text
transient provider error
malformed structured response
recoverable schema violation
```

Policy:

```text
max bounded attempts
repair prompt once where appropriate
fallback or omit optional module
```

Do not loop until model invents an answer.

---

# 52. MODEL FALLBACK

If all LLM providers unavailable:

Still available:

- resolver;
- PESEL/current facts;
- rank/rarity;
- direct historical source Claims already extracted;
- citations;
- Coverage;
- DiscoveryIndex from existing validated objects.

Unavailable/degraded:

- new natural-language synthesis;
- complex new onomastic extraction.

Correct state:

```text
LLM_UNAVAILABLE / optional module degraded
```

---

# 53. PROMPT VERSIONING

Each invocation logs:

```text
prompt_id
prompt_version
model_route
model_identifier
output_schema_version
input_bundle_hash
```

Only approved prompt versions may execute in production.

Prompt 09 governance applies.

---

# 54. QA GATES

## P0 deterministic QA

- schema;
- evidence linkage;
- Claim scope;
- Confidence policy;
- rights;
- family/person overreach;
- DiscoveryIndex consistency.

## Optional model-supported QA

- narrative hallucination scan;
- conflict wording;
- copy consistency.

No LLM QA can override a deterministic rights block.

---

# 55. HARD PUBLISH POLICY

```python
def publication_decision(bundle, surface):
    if bundle.has_schema_failure:
        return BLOCK

    if bundle.has_unsupported_fact:
        return BLOCK

    if bundle.has_scope_overreach:
        return BLOCK

    if not bundle.surface_eligibility.allows(surface):
        return BLOCK

    if bundle.optional_module_failures_only:
        return PARTIAL_OK

    return ALLOW
```

---

# 56. PARTIAL QA

Example:

```text
PESEL       OK
Origin      cached approved
Polona      SOURCE_UNAVAILABLE
```

Can publish:

```text
population
rarity
origin
```

Can state:

```text
historical search temporarily unavailable / not completed
```

Cannot state:

```text
no history found
```

---

# 57. HUMAN REVIEW BRANCH

```text
automatic module
↓
REVIEW_REQUIRED
↓
ResearchModuleRun = REVIEW_REQUIRED
↓
HumanReviewTask created
↓
run may remain FREE_READY
↓
reviewer decision
↓
affected evidence/claims rebuilt
↓
run/projection advanced
```

Ordinary safe facts remain publishable.

---

# 58. HUMAN REVIEW TASK

```text
review_task_id
research_run_id
research_module_run_id
reason_code

affected_claim_ids[]
affected_evidence_ids[]

priority
status
assigned_to

decision
decision_reason
reviewer_id

created_at
completed_at
```

---

# 59. WHEN REVIEW BLOCKS

Block only affected output unless the issue contaminates the whole entity.

Examples:

### Block one origin chapter

Conflicting unresolved specialist interpretation.

### Block entire paid report

If premium value rests primarily on ambiguous historical entity resolution.

### Do not block population

Because unrelated historical module needs review.

---

# 60. OBSERVABILITY

Per run:

```text
request-to-first-ready duration
total run duration
queue wait duration
module latency
source latency
cache hit/miss
connector errors
source results
EvidenceItems created
Claims created
QA failures
rights blocks
LLM calls
tokens
estimated/actual variable cost
partial result flag
```

---

# 61. OPENTELEMETRY

Use OTel spans across:

```text
HTTP request
ResearchRun
ResearchModuleRun
connector request
LLM request
evidence build
claim build
projection build
```

Suggested trace attributes:

```text
research.run_id
research.module_id
surname.internal_id
source.id
workflow.version
cache.hit
module.status
```

Do not attach raw family/person data to generic telemetry.

---

# 62. LOGGING

Use structured application logging.

Minimum:

```text
timestamp
severity
trace_id
research_run_id
module_run_id
module
event_code
error_code
```

Do not log:

- access tokens;
- source secrets;
- full private partner payloads;
- family private details.

---

# 63. RUNTIME METRICS

```text
surname_search_count
profile_cache_hit_rate
research_run_created_rate
research_run_free_ready_rate
research_run_failure_rate
partial_result_rate
source_failure_rate
source_rate_limit_rate
surname_unresolved_rate
qa_block_rate
rights_block_rate
human_review_rate
llm_failure_rate
research_cost_per_cache_miss
premium_eligibility_rate
report_generation_success_rate
```

---

# 64. ALERTS

Launch alerts:

```text
PESEL/profile lookup failure spike
historical source error spike
source schema change
queue backlog
outbox backlog
QA block spike
rights-review expiry
LLM invalid-output spike
variable cost spike
report failure spike
DB connection saturation
Redis unavailable
```

---

# 65. FAILURE TAXONOMY

```text
INPUT_INVALID
SURNAME_UNRESOLVED
SURNAME_AMBIGUOUS

SOURCE_UNAVAILABLE
SOURCE_RATE_LIMITED
SOURCE_SCHEMA_CHANGED
SOURCE_AUTH_FAILED
RIGHTS_BLOCKED

EVIDENCE_EXTRACTION_FAILED
CLAIM_VALIDATION_FAILED
CONFIDENCE_ASSESSMENT_FAILED

LLM_UNAVAILABLE
LLM_OUTPUT_INVALID

QA_FAILED
REVIEW_REQUIRED

QUEUE_UNAVAILABLE
DATABASE_TRANSIENT_FAILURE
REPORT_GENERATION_FAILED
INTERNAL_ERROR
```

---

# 66. FAILURE SEVERITY

```text
INFO
DEGRADED
MODULE_FAILED
RUN_FAILED
BLOCKING_REVIEW
```

Examples:

```text
Polona timeout
= MODULE_FAILED / DEGRADED
```

```text
database unavailable before any canonical write
= RUN_FAILED
```

```text
rights unclear on only premium historical image
= affected surface blocked
```

---

# 67. FAILURE RECOVERY MATRIX

| Failure | Retry? | Fallback | Partial publish? |
|---|---:|---|---:|
| Source timeout | Yes bounded | cached/skip | Yes |
| 429 | Yes after provider delay | skip if optional | Yes |
| Source schema changed | No automatic | disable connector | Yes if optional |
| Rights blocked | No | omit surface | Yes |
| LLM transient | Yes bounded | cached/deterministic | Yes |
| LLM invalid JSON | Repair once/bounded | omit narrative | Yes |
| Claim validation fails | No blind retry | investigate/rebuild evidence | Exclude claim |
| QA family overreach | No | remove output/review | Other safe modules yes |
| Redis queue unavailable | retry via outbox | synchronous core path where safe | Core cache path yes |
| DB unavailable | infrastructure retry | none | No new research writes |
| Worker crash | BullMQ retry | idempotent resume | Existing free projection yes |

---

# 68. USER SESSION ABANDONMENT

If anonymous user leaves:

## Continue

- already-near-complete low-cost surname-level shared research;
- run likely reusable by future users;
- source sync.

## Cancel/deprioritize

- expensive optional enrichment with low reuse probability;
- uncached high-cost LLM narrative;
- no purchased entitlement.

Paid report work should continue independently of browser session.

---

# 69. CONCURRENT RUN DEDUPLICATION

For shared surname research, use run coalescing.

If 100 users search the same surname while one standard run is active:

```text
one canonical active shared ResearchRun
+
100 session subscriptions/references
```

not 100 archive searches.

---

# 70. RUN COALESCING KEY

Recommended:

```text
surname_id
country_pack
run_type_family
research_plan_version
relevant source-state generation
```

Do not include:

- user/session ID for public surname research.

Do include private context for family research later.

Use:

- PostgreSQL unique active-run constraint/advisory lock;
- BullMQ deduplication as secondary optimization.

PostgreSQL advisory locks can provide application-defined mutual exclusion, but durable uniqueness should still be represented in data constraints/state where practical.

---

# 71. PRECOMPUTATION

Candidates:

- high-frequency Polish surnames;
- SEO-qualified surnames;
- recently searched surnames;
- surnames with expensive but reusable historical research.

Precompute:

```text
approved core Claims
Coverage
DiscoveryIndex
SurnameProfileProjection
optional cached narrative
```

Do not precompute private family outputs.

---

# 72. LAZY ENRICHMENT

Recommended.

Flow:

```text
search
↓
free core result
↓
user enters history section / Discovery Index path
↓
if historical enrichment not cached:
enqueue standard deep module
```

This reduces cost for users who bounce after rarity/count.

Requirement:

UI must show actual module state, not fabricated “searching archives” if no job exists.

---

# 73. FREE RESULT PROJECTION

Internal runtime object:

```json
{
  "projection_type": "FREE_RESULT",
  "projection_version": "1",
  "surname_id": "...",
  "research_run_id": "...",
  "readiness": "FREE_READY",
  "dimensions": {},
  "chapters": [],
  "limitations": [],
  "updated_at": "..."
}
```

Prompt 16 will define frontend/public transport schema.

---

# 74. PREMIUM PREVIEW PROJECTION

Built from:

```text
DiscoveryIndex
CoverageAssessment
eligible sample Claims/Evidence
Offer config
```

Contains:

- available chapters;
- validated counts;
- source categories;
- coverage language;
- sample evidence if rights allow.

It must not create new research facts.

---

# 75. REPORT GENERATION

Report generator consumes:

```text
ReportInputBundle
├── approved Claim versions
├── ConfidenceAssessments
├── Citations
├── Coverage
├── DiscoveryIndex
├── eligible evidence assets
└── report template/config
```

It does not call:

```text
Polona / Europeana / IJP
```

directly.

If more research is required, orchestrator runs a research module first.

---

# 76. REPORT IMMUTABILITY

`ReportVersion` captures:

```text
report_version_id
report_id
generated_at
research_run_id
claim_version_ids
confidence_assessment_ids
citation_ids
template_version
narrative_prompt_version
renderer_version
source_state_hash
```

The historical purchased artifact is reproducible.

---

# 77. REPORT REGENERATION

When new evidence appears:

```text
current surname profile improves
```

Do not silently rewrite an old `ReportVersion`.

Possible:

- new report version;
- “updated research available”;
- regeneration policy later.

---

# 78. SEO RUNTIME

Crawler/API request must not trigger deep research.

SEO publication pipeline:

```text
approved canonical surname
↓
qualified Coverage
↓
precomputed profile
↓
SEO QA
↓
render/cache
```

If a surname is not qualified:

```text
noindex / no page
```

rather than on-demand AI generation.

---

# 79. SHARE RUNTIME

Share assets consume only Claims marked:

```text
PUBLIC_FREE
SHARE eligible
```

No premium counts beyond allowed public preview policy.

No family/private data.

---

# 80. RIGHTS RUNTIME

Every projection invokes/checks:

```text
SurfaceEligibilityAssessment
```

before inclusion.

Surfaces:

```text
FREE_UI
PAID_REPORT
SEO
SHARE
IMAGE_REPRODUCTION
```

Rights gate is never an experiment flag.

---

# 81. PRIVACY NAMESPACES

Future architecture must enforce:

```text
PUBLIC_SURNAME_RESEARCH
PRIVATE_FAMILY_RESEARCH
```

Public surname runs are cacheable/shared.

Private family runs:

- workspace/user scoped;
- no shared cache;
- no SEO;
- no generic analytics payload;
- stricter logging.

---

# 82. RESEARCH PLAN VERSIONING

Store:

```text
plan_id
plan_version
```

Example:

```text
pl-fast-surname@1.0.0
pl-standard-surname@1.1.0
pl-premium-surname@1.0.0
```

If source selection changes later, old run remains reproducible.

---

# 83. MODULE VERSIONING

Every module declares:

```text
module_id
module_version
input_schema_version
output_schema_version
```

Examples:

```text
resolve-surname@1.0.0
current-pl@1.0.0
polona-search@1.0.0
evidence-builder@1.0.0
claim-builder@1.0.0
confidence-policy@1.0.0
discovery-index@1.0.0
```

---

# 84. WORKFLOW VERSIONING

Whole workflow version:

```text
basic-surname-lookup@1.0.0
standard-surname-research@1.0.0
premium-surname-report@1.0.0
```

Version change:

- candidate;
- golden workflow tests;
- staging;
- limited rollout;
- approval;
- production default.

Existing in-flight runs continue on their pinned workflow unless migration is explicitly safe.

---

# 85. RUNTIME CONFIGURATION

Configurable without deploy where safe:

```text
connector enabled/disabled
source priority
module timeout
module retry policy
candidate budget
cost budget
model route
premium eligibility policy
feature flags
queue concurrency
```

Stored/versioned configuration changes should be auditable.

---

# 86. FEATURE FLAGS

Useful for:

- new connector;
- new country pack;
- new historical search;
- LLM module;
- new report renderer.

Cannot bypass:

- rights;
- Claim QA;
- scope safety;
- privacy.

---

# 87. COUNTRY PACK RUNTIME

Universal orchestrator loads a country pack.

Example:

```yaml
country_pack: PL
resolver_pack: pl@1
current_sources:
  - pesel
place_stack:
  - teryt
  - gus
historical_sources:
  - polona
  - europeana_optional
onomastics:
  - ijp_if_licensed
```

Later:

```text
NL
UK
US
DE
```

without rewriting orchestration core.

---

# 88. COUNTRY PACK CONTRACT

```text
country_pack_id
version
supported_scripts
resolver_pack_ids
current_surname_sources
place_sources
historical_sources
onomastic_sources
rights_constraints
default_source_priorities
coverage_expectations
locales
```

---

# 89. BACKPRESSURE

Priority order:

```text
PAID_ACTIVE
INTERACTIVE_FREE
REPORT_DELIVERY
REFRESH_EXISTING_PUBLIC
BACKGROUND_ENRICHMENT
SEO_PRECOMPUTE
BULK_BACKFILL
```

Reserve minimum capacity for maintenance/source sync so low-priority work is not permanently starved.

---

# 90. COST PROTECTION

Per run:

```text
max_paid_api_units
max_llm_tokens/cost
max_ocr_pages
max_source_queries
max_report_attempts
```

If optional budget exceeded:

```text
stop optional enrichment
record BUDGET_EXHAUSTED
publish safe partial state
```

Paid product must ensure promised work fits its configured budget.

---

# 91. RUNAWAY QUERY DEFENCE

Prompt 13 candidate tiers are enforced.

Never:

```text
50 fuzzy forms
×
10 archives
×
100 result pages
```

without staged narrowing.

---

# 92. QUERY EXPANSION ORCHESTRATION

Use:

```text
Q0 canonical
Q1 accepted forms
Q2 high-value candidates
Q3 fuzzy/phonetic/OCR
```

Default search escalation:

```text
Q0/Q1
↓
evaluate result sufficiency
↓
Q2 if justified
↓
evaluate
↓
Q3 only for historical profile that permits broad recall
```

Every hit records tier/provenance.

---

# 93. SEARCH STOP CONDITIONS

Stop a module when:

- required product evidence obtained;
- configured result cap reached;
- source pagination exhausted;
- source/time budget exhausted;
- cost budget exhausted;
- source becomes unavailable;
- broader tiers would not be justified;
- human review required before safe expansion.

---

# 94. DIMINISHING RETURNS

Do not invent a universal formula initially.

Collect runtime metrics:

```text
new independent evidence per source query
new eligible historical occurrence per page
new report section unlocked
new time period/place coverage
```

Later create a calibrated stop policy.

P0 uses explicit budgets/caps.

---

# 95. RESEARCH COMPLETENESS LABEL

Operational terminal labels:

```text
CORE_RESEARCH_COMPLETE
STANDARD_RESEARCH_COMPLETE
PREMIUM_RESEARCH_COMPLETE
PARTIAL_SOURCE_FAILURE
PARTIAL_RIGHTS_LIMITATION
PARTIAL_REVIEW_REQUIRED
```

Never user-facing:

```text
all history researched
```

unless genuinely justified.

---

# 96. CHECKPOINTING

PostgreSQL module state is the checkpoint.

Major milestones:

```text
SOURCE_RETRIEVAL_DONE
EVIDENCE_BUILT
CLAIMS_BUILT
QA_PASSED
PROJECTION_BUILT
REPORT_INPUT_FROZEN
```

After crash, orchestrator inspects canonical state and schedules only missing/idempotent work.

No need for large serialized workflow snapshots in Redis.

---

# 97. WORKER CRASH RECOVERY

BullMQ workers can fail/retry.

Worker algorithm:

```text
1. load ResearchModuleRun from DB
2. verify idempotency/state
3. if already SUCCEEDED: return
4. atomically mark RUNNING / acquire lease if needed
5. perform bounded external work
6. persist canonical output
7. atomically mark module terminal
8. emit outbox event to advance run
```

If crash occurs after canonical output but before queue acknowledgement:

next execution detects existing successful output and exits idempotently.

---

# 98. DEAD LETTER HANDLING

After bounded retries:

```text
ResearchModuleRun = FAILED_FINAL
```

BullMQ failed-job retention and/or explicit DLQ queue stores operational payload.

Admin can:

```text
inspect
fix
replay
```

Canonical failure is in PostgreSQL.

---

# 99. MANUAL REPROCESS

Admin commands:

```text
rerun module
rerun source query
rebuild evidence
rebuild Claims
reassess confidence
recompute rights
rebuild coverage
rebuild DiscoveryIndex
rebuild projection
regenerate report version
```

Every command records reason and actor.

---

# 100. SOURCE VERSION CHANGE — EXAMPLE

```text
PESEL 2027 arrives
↓
source-maintenance job validates/imports
↓
new DistributionSnapshot activated
↓
SOURCE_VERSION_CHANGED event
↓
identify Claims depending on prior current snapshot
↓
schedule current-pl refresh
↓
rebuild population/rank/rarity
↓
confidence unchanged or reassessed
↓
Coverage / Projection / SEO refresh
```

Do not rerun:

```text
Polona historical search
```

just because current population changed.

---

# 101. RESOLVER VERSION CHANGE

Potential impact:

- input mappings;
- historical occurrence candidate relations;
- variant Claims.

Process:

```text
resolver version approved
↓
compare resolver golden results
↓
identify affected surname/name-form graph
↓
mark dependent evidence/Claims dirty
↓
targeted reruns
```

Do not rerun every surname blindly.

---

# 102. RIGHTS CHANGE

```text
RightsProfile new version
↓
find dependent SourceRecords/Evidence
↓
recompute SurfaceEligibility
↓
block/unblock projections
↓
invalidate affected report/SEO/share surfaces
```

Source retrieval may not need rerun.

---

# 103. CONFIDENCE POLICY CHANGE

```text
confidence-policy@2
↓
select affected ClaimTypes
↓
reassess existing Evidence bundles
↓
Coverage/DiscoveryIndex update
↓
Narrative/projection invalidation
```

No connector query needed if underlying evidence remains valid.

---

# 104. PROMPT CHANGE

```text
prompt candidate
↓
golden eval
↓
approved version
↓
limited runtime rollout
↓
compare structured outputs / QA
↓
default
```

Narrative-only prompt change does not invalidate factual Claims.

Evidence-extraction prompt change may.

---

# 105. EXPERIMENTATION BOUNDARY

Experiments may alter:

- UI ordering;
- paywall presentation;
- Offer price;
- narrative style;
- model route where output semantics remain governed.

Experiments cannot alter:

- evidence qualification;
- rights;
- ConfidenceStatus definitions;
- family overreach rules;
- DiscoveryIndex truth.

---

# 106. TESTING STRATEGY

## 106.1 Unit

Each module.

## 106.2 Workflow integration

Full run with controlled fixtures.

## 106.3 Failure injection

Provider timeout/429/schema drift.

## 106.4 Cache

Fresh/stale/dirty.

## 106.5 Idempotency

Repeated job delivery.

## 106.6 Coalescing

Many users same surname.

## 106.7 Partial result

Optional module failure.

## 106.8 Version compatibility

Old run remains readable after workflow update.

## 106.9 Outbox

Crash between DB write and queue publication.

---

# 107. CHAOS / FAILURE SCENARIOS

## PESEL local table unavailable

Expected:

- current-data module fails;
- if valid cached projection exists, serve labelled cache;
- otherwise free result may need alternative/low-data path.

## Polona timeout

Expected:

```text
history = SOURCE_UNAVAILABLE
free core remains valid
```

## LLM unavailable

Expected:

- deterministic Claims still publish;
- narrative falls back or remains unavailable.

## Invalid LLM JSON

Expected:

- bounded repair retry;
- no publish from invalid output.

## Rights change mid-run

Expected:

- final SurfaceEligibility uses current/pinned policy according to defined legal policy;
- blocked asset omitted.

## Worker crash after Claim insert

Expected:

- retry sees Claim fingerprint/module output and does not duplicate it.

## Duplicate queue message

Expected:

- same result.

## Queue backlog

Expected:

- free cache hits unaffected;
- priority queues protect paid/interactive.

---

# 108. GOLDEN WORKFLOW SCENARIOS

At minimum:

```text
CACHE_HIT_RICH
CACHE_HIT_STALE
CACHE_MISS_COMMON_PL
CACHE_MISS_RARE_PL
UNRESOLVED_SURNAME
AMBIGUOUS_SURNAME
PESEL_SUPPRESSED_OR_NO_RESULT
MAP_UNAVAILABLE
HISTORY_RICH
HISTORY_ZERO_VALID_RESULT
POLONA_UNAVAILABLE
ONOMASTICS_UNAVAILABLE
CONFLICTING_ORIGIN
RIGHTS_BLOCKED_PREMIUM
LLM_UNAVAILABLE
QA_BLOCKED_CLAIM
DUPLICATE_CONCURRENT_SEARCH
WORKER_REDELIVERY
SOURCE_VERSION_REFRESH
```

---

# 109. PERFORMANCE TARGET MODEL

Do not freeze an SLA before benchmark.

Measure:

```text
search request → SurnameResolution
search request → first useful Claim
search request → FREE_READY
run start → STANDARD complete
purchase → report ready
```

Report:

```text
p50
p95
p99
```

Initial architectural expectation:

- local resolver/current-data path should be interactive;
- network historical work should not block basic result;
- premium research may be asynchronous.

---

# 110. CAPACITY MODEL

Main scale variables:

```text
searches per minute
unique surname cache misses
active standard runs
active historical source queries
EvidenceItems created/day
report generations/day
LLM requests/day
```

Horizontally scalable:

- API instances;
- BullMQ workers;
- report renderers.

Vertically/carefully scale:

- PostgreSQL;
- Redis;
- source quotas.

---

# 111. MVP INFRASTRUCTURE

Recommended simplest production topology:

```text
┌─────────────────────┐
│ Next.js Frontend    │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ TypeScript App/API  │
│ Modular Monolith    │
└──────┬───────┬──────┘
       │       │
       ▼       ▼
 PostgreSQL   Redis
 + PostGIS    BullMQ/cache
       │       │
       │       ▼
       │    Workers
       │       │
       │       ├── research
       │       ├── connectors
       │       ├── LLM
       │       └── report
       │
       ▼
Object Storage
raw artifacts/reports

All components
      ↓
OpenTelemetry
```

Deployment can initially be:

- one API service;
- one or several worker processes;
- managed PostgreSQL;
- managed Redis;
- S3-compatible object storage.

No Kubernetes requirement.

---

# 112. MODULAR MONOLITH DECISION

Prompt 10's recommendation is confirmed.

Why:

- canonical domain has strong cross-module invariants;
- one team likely owns the first product;
- transaction boundaries matter;
- operational simplicity;
- source integrations are not independent products;
- premature microservices make schema/version evolution harder.

Module boundaries should still be explicit:

```text
identity
sources
places
evidence
claims
research-runtime
profiles
reports
commerce
```

Later split only measured bottlenecks.

---

# 113. TRANSACTION BOUNDARIES

Do not hold DB transaction while calling:

- external source;
- LLM;
- object storage network upload.

Pattern:

```text
read canonical state
↓
external work
↓
short DB transaction to commit validated output
↓
outbox event
```

For Claim/Evidence persistence requiring atomicity:

```text
EvidenceItem
ClaimEvidence
Claim/assessment update
outbox trigger
```

can share a short transaction where semantics require it.

---

# 114. OUTBOX / RELIABLE EVENTS

Recommended P0 minimal outbox.

Why:

PostgreSQL and Redis cannot share one normal transaction.

Outbox closes the most important dual-write gap.

Dispatcher:

```text
SELECT pending outbox
FOR UPDATE SKIP LOCKED
↓
enqueue BullMQ job/event
↓
mark delivered
```

PostgreSQL supports `SKIP LOCKED`, making this practical for multiple dispatchers.

Consumers remain idempotent.

---

# 115. CONSISTENCY MODEL

## Strong / transactionally consistent

- Claim ↔ Evidence links;
- Confidence assessment publication state;
- DiscoveryIndex inventory snapshot used for paywall;
- ReportVersion input freeze;
- payment/entitlement later.

## Eventual consistency acceptable

- profile cache;
- SEO regeneration;
- analytics;
- background enrichment;
- share-card regeneration;
- non-critical narrative cache.

---

# 116. DATA RACES

Use DB uniqueness/upsert:

```text
SourceRecord fingerprint
Evidence fingerprint
Claim key
active shared ResearchRun key
ReportVersion input fingerprint
```

Do not rely on:

```text
if not exists then insert
```

without constraint.

PostgreSQL `INSERT ... ON CONFLICT` / unique constraints should protect canonical writes.

---

# 117. ORCHESTRATOR TECHNOLOGY COMPARISON

## Custom DB-backed orchestration + BullMQ

**Pros**

- fits existing TypeScript stack;
- simple operational model;
- good background jobs/retries/priorities;
- Redis already useful for cache;
- easy horizontal workers;
- explicit DB state keeps audit clean.

**Cons**

- application owns workflow state transitions;
- long human-paused workflows become increasingly custom.

**Verdict:** **P0 recommendation**.

---

## Celery/RQ-style Python workers

**Pros**

- mature Python ecosystem;
- useful if OCR/NLP stack becomes Python-heavy.

**Cons**

- introduces second primary application runtime now;
- duplicate domain schemas/contracts;
- no strong current reason for P0.

**Verdict:** use only for future specialist worker if needed.

---

## Temporal

**Pros**

- durable workflow execution;
- excellent crash/retry/timer semantics;
- very good for days/months-long workflows and human-in-loop.

**Cons**

- another infrastructure/control plane;
- workflow determinism concepts;
- unnecessary operational complexity for initial surname lookup.

**Verdict:** **P2 upgrade candidate**, not P0.

---

## Prefect/Dagster-style data orchestrators

Good for batch/data engineering.

Less natural as primary low-latency consumer request orchestrator.

**Verdict:** optional for offline ingestion/data jobs later, not core request runtime.

---

## Cloud workflow service

Vendor-specific equivalent can work, but does not materially improve P0 enough to make cloud vendor a domain constraint.

---

# 118. RECOMMENDED MVP ORCHESTRATION STACK

Concrete choice:

```text
TypeScript
+
PostgreSQL/PostGIS
+
Redis
+
BullMQ
+
OpenTelemetry
+
S3-compatible object storage
```

## Components

### API runtime

Node.js/TypeScript application.

Framework is secondary; choose one consistent with engineering preference.

### Worker runtime

Same codebase/packages, separate worker process/deployment.

### BullMQ

Queues + retries + priority + rate limiting + dedup.

### PostgreSQL

ResearchRun/ResearchModuleRun, evidence, claims, outbox, canonical state.

### Redis

BullMQ backend + non-authoritative cache.

For queue durability, configure Redis/managed Redis with an appropriate persistence/HA policy rather than treating a disposable cache node as the job backend. Redis supports RDB, AOF or combined persistence modes; managed deployment choice should reflect recovery requirements.

### Scheduler

BullMQ Job Schedulers / application scheduler for:

- source health checks;
- source metadata refresh;
- outbox dispatcher wakeups if not continuous;
- profile refresh batches.

### Locking

Prefer:

- DB uniqueness;
- transactional state transitions.

Use advisory locks narrowly for run coalescing or administrative operations where appropriate.

---

# 119. TEMPORAL UPGRADE TRIGGERS

Re-evaluate Temporal if several of these become true:

1. Family research workflows routinely last hours/days.
2. Human-review tasks pause workflows for days/weeks.
3. Hundreds of workflow branches become difficult to reason about.
4. Retry/checkpoint logic dominates application code.
5. Multi-service orchestration becomes necessary.
6. Archive requests/correspondence become workflow steps.
7. Paid Deep Research requires durable timers/reminders.
8. Workflow migrations/versioning become difficult.
9. Business-critical workflows cannot tolerate custom recovery complexity.

Temporal's current official documentation emphasizes crash-proof execution and resuming workflows after outages over long durations, which maps much better to later Family/Deep Research than to P0 surname lookup.

---

# 120. P0 WORKFLOW — EXACT

```text
SEARCH REQUEST
↓
ValidateInput
↓
ResolveSurname
↓
ResolveProfileState
     │
     ├── FRESH
     │      ↓
     │   Return profile
     │
     └── MISSING / refresh required
            ↓
        Create/coalesce ResearchRun
            ↓
        BuildResearchPlan
            ↓
        RunCurrentPL
            ├── PESEL local lookup
            ├── rank
            └── rarity
            ↓
        BuildCurrentEvidence
            ↓
        BuildCurrentClaims
            ↓
        Confidence
            ↓
        Rights + QA
            ↓
        BuildFreeProjection
            ↓
        FREE_READY
            ↓
        enqueue optional history
            ↓
        PolonaSearch
            ↓
        HistoricalOccurrenceEvidence
            ↓
        HistoricalClaims
            ↓
        Confidence + Rights + QA
            ↓
        Coverage
            ↓
        DiscoveryIndex
            ↓
        PremiumEligibility
            ↓
        Rebuild profile projection
            ↓
        READY
```

## P0 exclusions

- Europeana fan-out;
- IJP live integration unless licensed;
- OCR owned pipeline;
- migration analysis;
- person matching;
- autonomous agent planning.

---

# 121. P1 WORKFLOW

Add:

- GeoNames/Getty historical places;
- Europeana;
- FBC;
- licensed IJP onomastics;
- broader historical-form evidence;
- asynchronous origin synthesis;
- premium precompute;
- human review;
- richer report-generation workflow;
- source-independent conflict groups.

---

# 122. LLM AGENT VS WORKFLOW

Canonical decision:

```text
deterministic DAG
+
bounded LLM activities
```

Not:

```text
agent chooses arbitrary tools/sources until it feels done
```

Why:

- rights constraints;
- bounded costs;
- reproducibility;
- source quotas;
- auditability;
- product consistency;
- reliable partial failures;
- prompt/version evaluation.

Later an AI research assistant can propose research steps, but orchestrator policy decides whether they may execute.

---

# 123. DECISION REGISTER

## Workflow model

**Decision:** DB-backed ResearchRun + ResearchModuleRun state with BullMQ execution.  
**Alternative:** Temporal from day one.  
**Why:** lower MVP complexity.  
**Risk:** custom workflow logic grows later.  
**Follow-up:** Temporal triggers.

## Sync vs async

**Decision:** local identity/current facts sync; historical/network/LLM async.  
**Why:** first value should not depend on slow sources.

## Queue

**Decision:** BullMQ/Redis.  
**Alternative:** cloud queue/Temporal/Celery.  
**Why:** TypeScript fit and sufficient feature set.

## Canonical workflow state

**Decision:** PostgreSQL.  
**Why:** queue delivery is not canonical truth.

## Outbox

**Decision:** minimal transactional outbox P0 for critical events.  
**Risk:** extra worker/table.  
**Why:** closes Postgres/Redis dual-write gap.

## Cache

**Decision:** version/dependency based, not arbitrary TTL for canonical research.

## Run coalescing

**Decision:** shared public surname runs coalesce by canonical research key.

## Partial results

**Decision:** first-class; optional source failure does not fail safe result.

## Source planning

**Decision:** deterministic country/product planner with budgets.

## LLM routing

**Decision:** bounded, schema-driven nodes only.

## Human review

**Decision:** module-level branch; blocks only affected scope unless contamination is global.

## Checkpointing

**Decision:** PostgreSQL module state is checkpoint.

## Event model

**Decision:** direct core path + outbox/domain events for background/invalidation; no event sourcing.

## Idempotency

**Decision:** DB constraints/fingerprints primary; BullMQ dedup secondary.

## Premium timing

**Decision:** validate DiscoveryIndex before sale; expensive final rendering can happen post-purchase.

## SEO

**Decision:** precomputed approved profiles only; crawler request never initiates deep research.

---

# 124. MODEL CHANGE PROPOSALS SUMMARY

## 15-A — ResearchPlan

P0 as versioned JSON/value object.

## 15-B — ResearchModuleRun

P0 table.

## 15-C — Runtime transactional outbox

P0 table/pattern.

## 15-D — ProjectionBuild

Defer; use existing build fingerprints/run IDs for P0.

---

# 125. OUTPUT CONTRACT TO PROMPT 16

Prompt 16 can assume runtime emits:

```text
SurnameResolution

ResearchRun
ResearchModuleRun[]
ReadinessState
ModuleDimensionStatus[]

SurnameProfileProjection
CoverageAssessment
DiscoveryIndex

PremiumEligibility
ReportGenerationStatus

RuntimeError[]
DataGap[]
```

It must define:

- public/internal endpoints;
- request schemas;
- response schemas;
- polling vs streaming/SSE;
- idempotency headers;
- auth;
- caching headers;
- error transport;
- frontend state representation.

---

# 126. FINAL RUNTIME ARCHITECTURE

```text
                              USER
                               │
                               ▼
                         SEARCH / API
                               │
                               ▼
                      SURNAME RESOLUTION
                               │
                               ▼
                      PROFILE STATE CHECK
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
              FRESH                       NEEDS WORK
                │                             │
                │                       RUN COALESCER
                │                             │
                │                             ▼
                │                       ResearchRun
                │                             │
                │                       ResearchPlanner
                │                             │
                │          ┌──────────────────┼─────────────────┐
                │          ▼                  ▼                 ▼
                │      CURRENT PL           PLACES          HISTORY
                │          │                  │                 │
                │          └────────────┬─────┴─────────────────┘
                │                       ▼
                │                  Evidence Engine
                │                       │
                │                    Claims
                │                       │
                │                  Confidence
                │                       │
                │                 Rights + QA
                │                       │
                │                Free Readiness
                │                       │
                │                 ┌─────┴─────┐
                │                 ▼           ▼
                │            FREE_READY   continue deep
                │                             │
                │                             ▼
                │                     CoverageAssessment
                │                             │
                │                      DiscoveryIndex
                │                             │
                └──────────────┬──────────────┘
                               ▼
                    SurnameProfileProjection
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
             FREE RESULT             PREMIUM POLICY
                                             │
                                ┌────────────┴────────────┐
                                ▼                         ▼
                           NOT ELIGIBLE                ELIGIBLE
                                                           │
                                                           ▼
                                                    PREMIUM RESEARCH
                                                           │
                                                           ▼
                                                      REPORT INPUT
                                                           │
                                                           ▼
                                                     ReportVersion
```

Infrastructure:

```text
PostgreSQL/PostGIS
= canonical state

Redis/BullMQ
= queue + ephemeral cache

Object Storage
= raw artifacts + report files

OpenTelemetry
= traces + metrics

Outbox
= reliable DB→queue bridge
```

---

# 127. P0 RUNTIME

Implement:

1. TypeScript modular runtime.
2. ResearchRun.
3. ResearchPlan value object.
4. ResearchModuleRun.
5. ReadinessState.
6. Profile-state resolver.
7. Research planner.
8. BullMQ queues/workers.
9. Redis.
10. Transactional outbox.
11. Current-PL synchronous/local module.
12. Polona asynchronous module.
13. Evidence/Claim orchestration.
14. Confidence/Rights/QA gates.
15. Partial-result model.
16. Free readiness.
17. Coverage builder.
18. DiscoveryIndex builder.
19. PremiumEligibility policy.
20. run coalescing.
21. idempotent jobs.
22. bounded retries/timeouts.
23. source circuit state.
24. projection cache.
25. OpenTelemetry traces/metrics.
26. structured logging.
27. worker crash recovery.
28. source-version invalidation.

---

# 128. P1 RUNTIME

Add:

- broader connector fan-out;
- licensed onomastics;
- historical place enrichment;
- LLM research synthesis;
- human-review queue/UI integration;
- richer premium precompute;
- report version updates;
- background enrichment policy;
- sophisticated diminishing-return rules;
- global country packs.

---

# 129. DO NOT BUILD YET

1. Microservices.
2. Kubernetes as requirement.
3. Kafka.
4. Event-sourced domain.
5. Temporal before workload justifies it.
6. Open-ended autonomous agents.
7. LLM source planner.
8. Per-source microservice.
9. Multi-region active-active.
10. Neural research planner.
11. Dynamic arbitrary tool execution.
12. Separate search cluster for workflow state.
13. Sophisticated billing-based resource scheduler.

---

# 130. BIGGEST RELIABILITY RISKS

1. Postgres row created but job never queued.
2. Worker retry duplicates Evidence/Claims.
3. Optional source failure fails whole result.
4. Run status says ready before QA.
5. Cache serves rights-invalidated data.
6. Concurrent searches duplicate expensive research.
7. Source rate limits cascade into queue backlog.
8. LLM failure blocks deterministic result.
9. Historical search runs unbounded.
10. source-version refresh reruns too much.
11. stale negative cache treated as truth.
12. queue is treated as canonical state.

---

# 131. BIGGEST COST RISKS

1. Re-running research for identical surname.
2. Calling paid/global APIs for data already local.
3. LLM narrative on every page view.
4. Archive fan-out on users who never engage.
5. OCR too early.
6. Broad fuzzy candidate expansion.
7. report regeneration without input change.
8. duplicated concurrent runs.
9. long-tail sources queried by default.
10. high-cost model used for low-risk structuring.

---

# 132. BIGGEST LATENCY RISKS

1. Network historical sources in first blocking path.
2. LLM before first result.
3. live geocoding instead of local place indexes.
4. serialized independent connectors.
5. queue backlog without priority.
6. source timeout longer than interactive budget.
7. full research recomputed after small change.
8. waiting for premium inventory before showing basic free value.

---

# 133. DEFINITION OF RUNTIME READY

MVP runtime is ready when all are true:

### Core execution

- exact/resolved surname can run end-to-end;
- fresh cache hit returns without research;
- cache miss creates/coalesces ResearchRun;
- deterministic ResearchPlan is versioned;
- PESEL/current-data module works;
- first historical module works asynchronously.

### Truth

- Evidence/Claims/Confidence execute after source retrieval;
- QA can block unsupported Claims;
- rights can block one surface without destroying internal evidence;
- DiscoveryIndex only uses approved data.

### Failure

- optional source timeout yields partial result;
- source failure never means no data;
- LLM failure does not block deterministic current facts;
- worker redelivery does not duplicate Claims;
- duplicate concurrent surname searches are coalesced/deduplicated.

### Cache/invalidation

- stale profile can be served only when allowed and dated;
- source-version change invalidates only dependent current state;
- rights change updates surface eligibility;
- narrative cache keys depend on claim bundle/version.

### Operations

- ResearchRun/ModuleRun have trace IDs;
- queue backlog/failed modules are observable;
- cost is measured per run;
- outbox backlog is monitored;
- jobs are bounded by retries/time/source budgets.

### Product

- FREE_READY can occur before deep historical completion;
- premium preview requires validated DiscoveryIndex;
- low-data surnames safely terminate without fake premium;
- purchased report references immutable claim/report versions.

---

# 134. INPUTS REQUIRED BY PROMPT 16

Prompt 16 should consume:

## Search

```text
SurnameSearchRequest
SurnameResolution
```

## Runtime

```text
ResearchRun
ResearchRunStatus
ReadinessState
ResearchModuleRun[]
ModuleDimensionStatus[]
```

## Product

```text
SurnameProfileProjection
CoverageAssessment
DiscoveryIndex
PremiumEligibility
```

## Reports

```text
Report
ReportVersion
ReportGenerationStatus
```

## Errors

```text
RuntimeErrorCode
DataGap
PartialResult state
```

Prompt 16 must now decide how frontend learns about state changes.

Key decision to resolve there:

```text
initial synchronous response
+
polling or SSE for background progress
+
stable final profile endpoints
```

without leaking internal workflow complexity.

---

# 135. VERIFIED TECHNOLOGY REFERENCES — 2026-09-17

## BullMQ

Official documentation confirms BullMQ is a Redis-backed Node.js/TypeScript queue supporting:

- workers;
- horizontal scaling;
- priorities;
- delayed/scheduled jobs;
- retries;
- concurrency;
- parent/child flows;
- rate limiting;
- crash recovery.

It also explicitly recommends idempotent job design.

References:

https://docs.bullmq.io/

https://docs.bullmq.io/patterns/idempotent-jobs

https://docs.bullmq.io/guide/jobs/deduplication

https://docs.bullmq.io/guide/rate-limiting

## Temporal

Temporal's official docs describe durable workflow execution that resumes after crashes/network/infrastructure failures, including workflows lasting very long periods.

Reference:

https://docs.temporal.io/

This makes Temporal a strong later candidate for Family/Deep Research, but not necessary for surname MVP.

## OpenTelemetry JavaScript

OpenTelemetry JavaScript currently reports:

```text
Traces  Stable
Metrics Stable
Logs    Development
```

Reference:

https://opentelemetry.io/docs/languages/js/

## PostgreSQL locking

PostgreSQL supports:

- advisory locks for application-defined locking;
- `SKIP LOCKED` for skipping already locked rows, useful in queue/outbox worker patterns.

References:

https://www.postgresql.org/docs/current/explicit-locking.html

https://www.postgresql.org/about/featurematrix/detail/skip-locked-clause/

## Redis persistence

Redis supports:

- RDB;
- AOF;
- combined RDB+AOF;
- no persistence.

For BullMQ production use, configure Redis as durable operational infrastructure appropriate to recovery requirements rather than treating it as a disposable cache.

Reference:

https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

---

# 136. FINAL RECOMMENDATION

The correct Name Atlas MVP runtime is not a swarm of autonomous agents and not an enterprise microservice platform.

It is:

> **a versioned deterministic research workflow whose canonical state lives in PostgreSQL, whose bounded background work runs through idempotent BullMQ workers, whose source access is controlled by the connector/rights layer, whose LLM calls are optional structured activities over evidence, and whose user-facing readiness is independent from whether every optional research module has finished.**

The most important runtime property is:

```text
safe partial value
```

A user should be able to receive a correct current surname result even if:

- Polona is down;
- an onomastic source is unavailable;
- an LLM provider fails;
- no regional map exists.

At the same time:

```text
premium
```

must wait until:

```text
actual validated deeper inventory exists.
```

That gives Name Atlas the right operational shape:

```text
FAST WHERE FACTS ARE EASY
ASYNC WHERE RESEARCH IS SLOW
STRICT WHERE TRUTH MATTERS
REUSABLE WHERE SURNAME RESEARCH IS SHARED
```
