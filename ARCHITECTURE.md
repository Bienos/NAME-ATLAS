# ARCHITECTURE.md — Name Atlas system map

Compact map of the system: topology, ownership, boundaries, invariants.
This file **references** the canonical specification rather than copying it.

Canonical authority: `docs/canonical/11` (data model), `12` (connectors), `13` (resolver), `14` (evidence/claims), `15` (runtime), `16` (API/frontend contract), `17` (QA), `19` (privacy/security), `23` (roadmap/infrastructure).
Binding decisions: `docs/adr/0001-stack.md`, `docs/adr/0002-db-access.md`.

## 1. P0 topology

```text
Browser
  │
  ▼
Next.js App Router (apps/web)
  ├── Server Components / SSR public surname pages
  └── thin same-origin BFF Route Handlers  (/api/*)
        │
        ▼
TypeScript modular monolith — domain services (packages/*)
        │
        ▼
PostgreSQL + PostGIS + pg_trgm   ← canonical system of record
```

Deferred until an asynchronous historical research milestone actually requires them (see ADR-0001):

```text
apps/worker (BullMQ)  ·  Redis/Valkey  ·  object storage  ·  OpenTelemetry (progressive)
```

`apps/admin` is a separate internal Next.js application (`docs/canonical/22`), minimal at P0.

Asynchronous transport for the browser is REST + SSE, with conditional-GET polling as fallback. No GraphQL, no WebSockets at P0 (`docs/canonical/16` §1–2).

## 2. Module ownership

Bounded contexts of the monolith (`docs/canonical/11` §2, `docs/canonical/23` §8). One owner per concern:

| Context | Owns | Core objects |
|---|---|---|
| Identity | what surname/form a query refers to | `Surname`, `NameForm`, `NameFormRelation`, `SurnameResolution` |
| Geography | what a place is and was, and when | `Place`, `PlaceName`, `PlaceGeometry`, `AdministrativeMembership` |
| Distribution | counts within an explicit dataset/time scope | `DistributionSnapshot`, `DistributionValue` |
| Sources & Rights | provenance and permitted use | `Source`, `SourceRecord`, `DigitalAsset`, `RightsProfile` |
| Evidence & Claims | what the system may assert | `EvidenceItem`, `Claim`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation` |
| Onomastics | structured interpretations | `SurnameClassification`, `MeaningInterpretation`, `OriginHypothesis` |
| History | attested forms and occurrences over time | `HistoricalVariant`, `HistoricalOccurrence`, `MigrationPattern` |
| Research Runtime | how a result was produced | `ResearchRun`, `ResearchModuleRun`, runtime outbox |
| Product Projection | what may be rendered | `CoverageAssessment`, `DiscoveryIndex`, `SurnameProfileProjection` |
| Report | versioned editorial artifact | `Report`, `ReportVersion`, `ReportSection`, `ReportClaimReference` |
| Commercial | what may be bought/accessed | `Offer`, `Order`, `Entitlement` |

Hard ownership rules:

- No connector writes `Claim`s directly.
- No UI derives `Claim`s.
- Commerce never generates research facts.
- SEO never retrieves facts.
- Analytics never changes domain truth.
- Admin commands call domain services, never repositories directly.
- Product Projection may suppress, order and summarise canonical objects; it may never create new research facts.

## 3. Major data flow

```text
Source
  ↓                      (connector layer — docs/canonical/12)
SourceRecord             immutable, raw payload preserved, hashed
  ↓                      (evidence engine — docs/canonical/14)
EvidenceItem
  ↓                      (claim engine)
Claim  ──┬── ClaimEvidence (SUPPORTS / CONTRADICTS / CONTEXT)
         ↓               (confidence engine)
ConfidenceAssessment     epistemic only
         ↓               (rights gate + privacy + entitlement)
SurfaceEligibility
         ↓
SurnameProfileProjection → free UI · premium report · SEO
```

User request path (`docs/canonical/15` §2):

```text
input → validation → resolution → profile state (fresh/stale/missing)
      → research run → evidence → claims → confidence → rights/QA
      → coverage → discovery index → projection → response
```

## 4. Trust / evidence boundary

- The claim chain in §3 is the only path by which a statement may reach a user.
- `Claim.structured_value` is locale-neutral JSONB validated against a versioned schema per `ClaimType`. Prose is generated downstream and is never truth.
- `ConfidenceAssessment` is versioned and reproducible: it records `evidence_set_hash`, `assessment_method`, `assessment_version`. Assessments are never overwritten in place.
- Confidence statuses: `VERIFIED`, `LIKELY`, `POSSIBLE`, `UNCONFIRMED`, `CONFLICTING`, `INSUFFICIENT_DATA`. There is no percentage field.
- Source authority lives on `Source`; evidence verification lives on `EvidenceItem`; claim confidence lives on `ConfidenceAssessment`. These are three separate things and must not be collapsed.
- An LLM may structure or synthesise evidence. It never assigns final confidence.

## 5. Rights boundary

Rights are a **surface** dimension, orthogonal to truth (`docs/canonical/14` §80, §99.10; ADR-0001).

```text
Claim ─────────────► ConfidenceAssessment        (epistemic: how well evidence supports it)

Claim / Evidence ──► RightsProfile ──► SurfaceEligibility   (legal: where it may appear)
```

- A claim may be epistemically `VERIFIED` while a given surface (free, premium, SEO, share) is blocked for rights reasons.
- A rights restriction **never** lowers a confidence status, and a permissive licence never raises one.
- Rights gates are evaluated at surface time, per surface: internal / free / premium / SEO / share.
- Hard gates: `commercial_use = UNKNOWN` blocks paid surfaces; `automated_access = PROHIBITED` blocks automated production connectors; `review_status = EXPIRED` blocks paid-surface eligibility until re-review. Metadata rights and image rights are modelled and evaluated independently.
- Public availability of a source does not authorise scraping, extraction, caching or redistribution.

## 6. Frontend presentation-object boundary

- The frontend consumes **validated presentation objects** (DTOs / profile projections) only. It never receives raw evidence and never derives a fact, rank, rarity or confidence itself.
- Contracts are defined once in `packages/contracts` (runtime schemas → JSON Schema → OpenAPI → client types). Contract semantics are canonical (`docs/canonical/16`); generator choice is implementation detail.
- The BFF (`apps/web` route handlers) may do: session/cookie handling, CSRF, entitlement context, request correlation, error mapping, headers, SSE proxying, rate limiting.
- The BFF may **not** do: surname resolution, claim interpretation, confidence calculation, premium eligibility, source selection, or any duplication of canonical business logic.
- Every meaningful UI state (ready, partial, low-data, unresolved, ambiguous, error) is an explicit contract state, not an inference from missing fields.

## 7. Public / private data boundary

The main privacy boundary (`docs/canonical/19` §4):

| Public surname research | Private family research |
|---|---|
| surname entity, aggregate counts, sourced etymology, historical occurrences, places, public citations | family member names, dates, places, relationships, candidate persons, private hypotheses, user notes |
| shareable where rights allow, cacheable, potentially SEO-eligible | private by default, no SEO, no public cache, no default share, workspace-scoped |

Hard rule: **the public surname cache must never contain a user ↔ family association.**

Additional standing rules: anonymous free search requires no email; raw surname text is not sent to generic product analytics by default; unknown living/deceased status is treated as living; paid reports are server-authorised private resources and a report ID is not access control.

## 8. Runtime boundary

- **PostgreSQL is the workflow source of truth.** `ResearchRun` / `ResearchModuleRun` rows are the canonical record of research state.
- A queue job completing is **not** the canonical record of research completion.
- Redis/Valkey and BullMQ, when introduced, are job transport, coordination and ephemeral cache only. Cache is acceleration, never truth.
- Jobs must be idempotent; redelivery is expected.
- Readiness (what the user can be shown) is separate from run status (what the machine is doing).
- Temporal, Kafka, Kubernetes, microservices and a graph database are explicit non-goals at P0.

## 9. Deployment boundary

- One monorepo, `pnpm` workspaces. A build orchestrator is optional, not a prerequisite.
- P0 target is a single coherent hosting plane in the EU (Frankfurt/eu-central) covering web, admin, worker, PostgreSQL with PostGIS + `pg_trgm`, scheduled jobs and private networking; object storage in an EU region for private artifacts (`docs/canonical/23` §6).
- Do not split P0 across several hosts (web here, API there, worker elsewhere) without a concrete limitation forcing it.
- Infrastructure as code starts as a single blueprint file. No large IaC estate at P0.
- Environments — `local`, `CI`, `staging`, `production` — have separate databases, queues, secrets, analytics projects, payment keys and email routing.
- No production secret is ever committed. `.env.example` documents variables by name only.

## 10. Invariants

Violating any of these is a defect regardless of what a task or ticket says:

1. `Source → SourceRecord → EvidenceItem → Claim → ConfidenceAssessment → Citation`. No shortcuts, no fact without lineage.
2. Confidence is epistemic. Rights are a surface dimension. Neither modifies the other.
3. `DistributionSnapshot` is **surname-scoped** (`distribution_snapshot.surname_id`). National PESEL data is expressed as a surname-scoped snapshot with a national `DistributionValue` carrying `place_id = null`. There is no dataset-global snapshot.
4. Absence or suppression is not zero. A zero is stored only where the dataset's coverage supports a true-zero conclusion.
5. A count is never shown without its dataset scope and date. National count, current regional distribution, older regional distribution and historical occurrence map are four different things and are never collapsed.
6. Source payloads are immutable once imported. New dataset versions create new snapshots; they never overwrite old rows.
7. Imports are idempotent and fail closed on schema drift.
8. Canonical surname identity is Unicode NFC. Polish diacritics are identity-preserving: `Łuczak` and `Luczak` are never merged automatically.
9. Fuzzy, phonetic or OCR candidates never outrank an exact canonical or accepted-form match, and never auto-create or auto-merge a `Surname`.
10. Derived values (rank, 1-in-X, share) are reproducible claims carrying method and version — never bare columns on `Surname`.
11. Projections and reports render validated claims; they never create facts.
    - ADR-0015 amends 1 and 11 for statistics about a whole published list: they are derived offline by `packages/truth` into a committed, SHA-pinned artefact that carries their lineage, method versions and assessment, and the page renders them. Every other invariant applies unchanged.
    - ADR-0018 lets that artefact name a surname that a fixed list-scope rule selects, at 20 people or more, and compare the two lists' sets of surnames as counts of surnames, never of people.
    - ADR-0019 lets it compare the editions of one published list within a declared series (2020–2026), as list-scope figures: never across the two lists, and never with a cause.
12. UUIDv7 primary keys from the first migration. Public slugs and order references are separate identifiers.
13. Every production source has an approved `RightsProfile` before it reaches a production surface.
