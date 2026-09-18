# NAME ATLAS — REVIEW + IMPLEMENTATION PLAN
**Date:** 2026-09-18  
**Target:** Claude Code  
**Status:** reviewed before first production implementation

# 1. Verdict

The package is structurally strong and the 27 canonical/library source files in the new starter archive match the original Name Atlas archive byte-for-byte.

Do not start the current `START_HERE_CLAUDE.md` unchanged.

Before coding, make the corrections below.

# 2. What already works

The package correctly establishes:

- `docs/canonical/10–23` as the engineering authority;
- older UX/data/research files as supporting library material;
- one bounded build rather than "build the whole app";
- real-data-only PESEL rules;
- no fabricated fields/counts/licensing;
- Unicode-safe surname identity;
- suppression != zero;
- immutable provenance;
- SourceRecord → EvidenceItem → Claim → Confidence → Citation;
- fail-closed schema drift;
- idempotent imports;
- Testcontainers/PostgreSQL integration testing;
- explicit scope exclusions;
- STOP after the assigned build.

The TypeScript P0 direction also matches the later runtime/roadmap decision:
Next.js + TypeScript modular monolith + PostgreSQL/PostGIS, with Redis/BullMQ delayed until historical async research.

# 3. Corrections required before implementation

## FIX-01 — Add the repository control plane

Create:

```text
AGENTS.md
CLAUDE.md
PRODUCT.md
ARCHITECTURE.md
PLAN.md
PROGRESS.md

docs/
  SOURCE_MAP.md
  CODEMAP.md
  DECISIONS_NEEDED.md
  adr/
    0001-stack.md
    0002-db-access.md

tasks/
```

Reason: project state must live in the repo, not in a growing Claude conversation.

`CLAUDE.md` should import:

```text
@AGENTS.md
```

rather than duplicate it.

## FIX-02 — Do not execute the current BUILD-001 as one Claude implementation session

Current BUILD-001 includes too many independent engineering units:

- monorepo foundation;
- QA infrastructure;
- DB migrations;
- canonical identity tables;
- rights registry;
- PESEL source discovery;
- real fixture;
- full importer;
- resolver;
- evidence;
- claims;
- confidence;
- citation;
- CLI demo;
- CI.

The canonical roadmap itself lists these as separate ordered engineering epics.

Split them into bounded tasks and use one fresh Claude session per task.

## FIX-03 — Decouple epistemic confidence from rights

Current BUILD-001 says `VERIFIED` requires:

```text
relevant rights/surface validity
```

This should be removed from the confidence calculation.

Canonical rule:

```text
truth/confidence != rights/surface eligibility
```

A claim can be epistemically VERIFIED while a particular surface is blocked for rights reasons.

Correct model:

```text
Claim
→ ConfidenceAssessment

and separately

Claim / Evidence
→ RightsProfile
→ SurfaceEligibility
```

For the first internal developer demo, rights must still be stored/evaluated, but rights must not change factual confidence.

## FIX-04 — Clarify `DistributionSnapshot`

Do not accidentally implement one dataset-global `DistributionSnapshot` if following Document 11.

Document 11 models `DistributionSnapshot` as surname-scoped:

```text
distribution_snapshot.surname_id
```

For national PESEL data, each surname snapshot can have a national aggregate `DistributionValue` with `place_id = null`.

The imported PESEL resource/version is shared provenance, but the canonical surname distribution snapshot remains surname-scoped unless an explicit architecture change is approved.

## FIX-05 — Record the stack supersession in ADR-0001

There is a historical stack evolution:

```text
Document 10:
FastAPI/Python recommendation

later Document 15 + Document 23:
TypeScript modular monolith
```

P0 decision:

```text
Next.js
TypeScript / Node.js
PostgreSQL + PostGIS
pg_trgm
Redis/Valkey later
BullMQ later
object storage later as required
OpenTelemetry progressively
Python only for later specialist OCR/data-science if justified
```

Record once in `docs/adr/0001-stack.md`.

## FIX-06 — Lock the exact PESEL resource before product implementation

The canonical source is the official dane.gov.pl dataset:

```text
Nazwiska występujące w rejestrze PESEL
dataset 1681
```

The corpus establishes important semantics:

- living persons;
- current-surname field;
- single-occurrence surnames omitted;
- deceased persons excluded;
- annual snapshots;
- national, not current regional geography.

However the implementation must still pin:

- exact resource ID(s);
- exact file(s);
- male/female resource structure;
- resource reference date;
- portal/dataset updated date;
- checksum;
- headers/types;
- reuse/attribution metadata.

Do this in a source spike before the full importer.

## FIX-07 — Choose the TypeScript DB/query layer explicitly

The canonical documents do not fix Prisma/Drizzle/Kysely/etc.

Make a small ADR before DB implementation.

Selection criteria:

- PostgreSQL-first;
- PostGIS/extension friendly;
- explicit SQL migrations;
- good Testcontainers support;
- type-safe;
- no impedance mismatch with JSONB, partial indexes and later geo fields.

Do not let each Claude session independently choose or reconsider this.

## FIX-08 — Reduce library noise

The package contains two byte-identical paywall files:

```text
NAME_ATLAS_PAYWALL_SYSTEM (1).md
NAME_ATLAS_PAYWALL_SYSTEM(1).md
```

Keep one.

`NAME_ATLAS_MASTER_COMBINED_2026-09-17.md` is very large and duplicates much of the library.

Prefer:

```text
docs/archive/
```

or keep it outside the normal Claude search path.

# 4. Recommended repository shape

```text
name-atlas/
├── AGENTS.md
├── CLAUDE.md
├── PRODUCT.md
├── ARCHITECTURE.md
├── PLAN.md
├── PROGRESS.md
├── README.md
│
├── docs/
│   ├── canonical/
│   ├── library/
│   ├── archive/
│   ├── adr/
│   ├── contracts/
│   ├── builds/
│   ├── SOURCE_MAP.md
│   ├── CODEMAP.md
│   └── DECISIONS_NEEDED.md
│
├── tasks/
│
├── apps/
│   ├── web/
│   ├── admin/
│   └── worker/
│
├── packages/
│   ├── domain/
│   ├── contracts/
│   ├── db/
│   ├── resolver/
│   ├── sources/
│   ├── evidence/
│   ├── claims/
│   ├── confidence/
│   ├── testing/
│   └── ...
│
├── fixtures/
│   └── pesel/
│
└── tests/
    ├── golden/
    ├── integration/
    └── e2e/
```

# 5. Implementation plan

## SESSION 0 — CONTROL PLANE
**Model:** Claude Opus  
**Code:** none

Create:

- AGENTS.md
- CLAUDE.md
- PRODUCT.md
- ARCHITECTURE.md
- PLAN.md
- PROGRESS.md
- SOURCE_MAP.md
- CODEMAP.md
- DECISIONS_NEEDED.md
- ADR-0001 stack
- ADR-0002 DB access/query layer
- `tasks/001-project-foundation.md`

Acceptance:

- one owner for each kind of truth;
- source documents read-only;
- conflicts recorded rather than silently resolved;
- no application source code.

STOP.

---

## TASK-001 — PROJECT FOUNDATION
**Model:** Claude Sonnet  
**Fresh session**

Implement only:

- pnpm workspace;
- strict TypeScript;
- `apps/web`;
- minimal `apps/admin`;
- minimal `apps/worker`;
- initial shared packages;
- lint/format;
- Vitest;
- fast-check;
- Testcontainers harness;
- PostgreSQL development/test environment;
- PostGIS + pg_trgm extensions;
- migration mechanism;
- GitHub Actions;
- env template;
- minimal health/build checks;
- CODEMAP + PROGRESS update.

Do not implement surname features.

Acceptance:

```text
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm build
```

all pass from a clean checkout.

STOP / commit / review.

---

## TASK-002 — PESEL SOURCE SPIKE
**Model:** Claude Sonnet or Opus if source ambiguity appears  
**Fresh session**

Goal: eliminate source uncertainty.

Do:

- identify exact dane.gov.pl resource IDs/files;
- download official snapshot;
- record resource date and dataset update date separately;
- calculate checksum;
- document headers/types/encoding;
- confirm male/female structure;
- document suppression;
- document population scope;
- store rights/attribution facts;
- check in only a small lawful real fixture;
- parser/schema validator;
- drift tests.

No Claim/UI yet.

Acceptance:

```text
real fixture
+
known schema
+
known source semantics
+
known provenance
+
known rights state
```

STOP / commit / review.

---

## TASK-003 — RESOLVER EXACT CORE
**Fresh session**

Implement:

- raw input preservation;
- validation;
- Unicode NFC;
- casefold key;
- Polish diacritic identity preservation;
- controlled whitespace/separators;
- exact canonical match;
- exact approved NameForm match;
- outcomes:
  - RESOLVED
  - UNRESOLVED
  - INVALID_INPUT
- no auto-create for unknown names.

Required blocker tests include:

```text
Łuczak != Luczak automatically
NFC idempotent
raw input preserved
blank invalid
unknown creates no surname
```

No fuzzy/phonetic/OCR/transliteration yet.

STOP / commit / review.

---

## TASK-004 — PESEL INGESTION + SOURCE/RIGHTS
**Fresh session**

Implement only the canonical tables needed for:

```text
KnowledgeEntity
Surname
NameForm
Source
RightsProfile
SourceRecord
DistributionSnapshot
DistributionValue
```

Then implement:

```text
official PESEL resource
→ immutable import
→ SourceRecord
→ surname-scoped DistributionSnapshot
→ national DistributionValue
```

Requirements:

- idempotent;
- schema drift fails closed;
- raw source payload preserved;
- source date preserved;
- suppression is not zero;
- no current regional map assumptions.

STOP / commit / review.

---

## TASK-005 — TRUTH CHAIN / CURRENT POPULATION
**Fresh session**

Add:

```text
EvidenceItem
Claim
ClaimEvidence
ConfidenceAssessment
Citation
```

Implement only:

```text
CURRENT_POPULATION
```

Flow:

```text
input
→ resolver
→ PESEL
→ SourceRecord
→ Evidence
→ Claim
→ Confidence
→ Citation
```

Important:

```text
confidence = epistemic quality
rights = separate surface eligibility dimension
```

Developer command:

```bash
pnpm demo:surname -- "Cichowski"
```

Required scenarios:

- exact known;
- unknown;
- invalid;
- suppressed/rare case where fixture supports it.

STOP / commit.

---

## REVIEW-001 — INDEPENDENT FIRST-SLICE REVIEW
**Fresh Claude context**

Do not edit initially.

Review only for:

- acceptance failures;
- Unicode identity bugs;
- false auto-merges;
- PESEL scope/date errors;
- provenance breaks;
- confidence/rights coupling;
- suppression → zero errors;
- schema drift risk;
- missing edge-case tests;
- out-of-scope changes.

Fix via bounded remediation task if needed.

When green:

```text
M0 + minimal M1 proof complete
```

---

## TASK-006 — COMPLETE CURRENT-SURNAME INTELLIGENCE

Add in small sub-tasks:

- approved Polish gender-form relationships;
- safe diacritic candidate behaviour;
- pg_trgm candidate generation;
- edit/transposition rerank;
- no unsafe auto-merge;
- CURRENT_RANK;
- RARITY_CONTEXT;
- deterministic derivation metadata.

Do not add phonetics/Cyrillic/OCR.

---

## TASK-007 — SEARCH / PROFILE API

Build shared contracts and internal/public subset:

```text
search
resolution
current population
rank
rarity
confidence
citations
low-data/error states
```

Use validated presentation objects.

Frontend must not derive facts from raw evidence.

---

## TASK-008 — FIRST FREE CONSUMER RESULT UI

Build one real user journey:

```text
homepage/search
→ surname resolution
→ current result
→ confidence/source/date
→ low-data state
```

Use the existing Name Atlas visual/UX system.

This is the first meaningful consumer-facing vertical slice.

---

## TASK-009 — INTERNAL ALPHA TOOLING

Add only minimum:

- read-only research/source inspector;
- source record → evidence → claim trace;
- rights state;
- confidence diagnostics;
- request IDs;
- structured logs;
- basic observability.

Then run milestone integration review.

**Release gate:** INTERNAL ALPHA.

---

## TASK-010 — HISTORICAL SOURCE SPIKE

Start with Polona.

Prove:

```text
surname query
→ source record
→ stable locator
→ historical occurrence candidate
```

Also begin minimum Place foundation only as required.

No broad genealogy engine.

---

## TASK-011 — HISTORICAL CONNECTOR + ASYNC RUNTIME

Only now add where required:

- Redis/Valkey;
- BullMQ;
- worker;
- ResearchRun/ResearchModuleRun;
- outbox;
- retries/idempotency;
- partial states.

PostgreSQL remains source of truth.

---

## TASK-012 — HISTORICAL CLAIM + ASYNC CONSUMER UX

Add:

- HistoricalOccurrence;
- historical Claim/evidence;
- citations;
- async pending/partial/error states;
- limited historical UI;
- admin review where ambiguity requires it.

**Release gate:** CLOSED FREE BETA.

---

## TASK-013 — COVERAGE / DISCOVERY / PREMIUM ELIGIBILITY

Build:

```text
CoverageAssessment
→ DiscoveryIndex
→ PremiumEligibility
```

Run a representative surname corpus.

Do not build payment yet.

Decision question:

> Does a meaningful proportion of real surnames contain enough deeper evidence to justify a paid report?

---

## TASK-014 — PREMIUM REPORT WITHOUT REAL MONEY

Generate:

- report snapshot;
- claim references;
- citations;
- reproducible version;
- export/delivery preview;
- insufficient-data behaviour.

Test manually and with representative surnames.

No Stripe.

**Decision gate:** premium viability.

---

## TASK-015 — PRIVACY / SECURITY / ANALYTICS READINESS

Before payments:

- privacy/consent implementation;
- source-rights review;
- security headers;
- auth/admin access;
- audit events;
- retention;
- DSAR/support basics;
- PostHog consent-safe setup if approved;
- release checklist.

---

## TASK-016 — COMMERCE / PAID LIMITED BETA

Only after report viability is demonstrated:

- Offer;
- Customer/Order;
- Stripe checkout;
- signed webhook;
- entitlement;
- report delivery;
- email recovery;
- refund/reconciliation;
- operational admin.

**Release gate:** PAID LIMITED BETA.

---

## TASK-017 — PUBLIC PAID MVP HARDENING

- full critical E2E;
- security review;
- failure/retry/recovery tests;
- migration safety;
- backups/rollback;
- accessibility;
- performance;
- support/repair workflows;
- independent release review;
- staging;
- production verification.

**Release gate:** PUBLIC PAID MVP.

---

## TASK-018 — SEO FIRST QUALIFIED COHORT

Only after page/data quality is stable:

- SEO eligibility;
- canonical routing;
- alias handling;
- structured data;
- sitemap cohorts;
- noindex rules;
- first qualified surname pages;
- Search Console monitoring.

Do not publish thin/low-confidence pages merely to increase page count.

# 6. Parallel non-code track

Start from day one:

1. PESEL source/resource verification and annual refresh policy.
2. IJP PAN/onamastics licence/partnership outreach.
3. Polona rights rules by metadata/OCR/image surface.
4. Current regional surname data search/licensing.
5. Legal/privacy review for commercial report use.
6. Stripe/tax/accounting preparation only before the commerce milestone.

Important:

- IJP PAN rights are not required to prove the first current-count slice.
- current surname map must remain non-blocking until a lawful current source exists;
- payments must remain blocked until premium inventory is demonstrated.

# 7. Claude operating protocol

For every implementation task:

```text
fresh session
→ read current task
→ read PROGRESS.md
→ read only referenced ADR/contracts/canonical sections
→ targeted read-only preflight
→ concise implementation plan
→ smallest complete change
→ focused tests
→ acceptance verification
→ inspect complete git diff
→ remove unrelated changes
→ update PROGRESS.md
→ commit/PR
→ STOP
```

Default:

```text
one task
=
one bounded outcome
=
one reviewable PR
=
one fresh Claude context
```

# 8. Immediate next action

Do not run the existing BUILD-001 implementation yet.

First run a new planning-only Claude session that:

1. creates the repository control plane;
2. records ADR-0001 stack;
3. records ADR-0002 DB/query layer;
4. fixes the confidence/rights conflict;
5. clarifies surname-scoped DistributionSnapshot semantics;
6. converts the current BUILD-001 into TASK-001 through TASK-005;
7. creates only TASK-001 in full implementation detail;
8. stops without writing application code.

Then implement TASK-001 in a fresh Claude Sonnet session.
