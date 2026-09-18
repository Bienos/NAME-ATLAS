# ADR-0001 — P0 runtime stack

- **Status:** Accepted
- **Date:** 2026-09-18
- **Deciders:** project owner + control-plane session
- **Supersedes:** the FastAPI/Python application-runtime recommendation in `docs/canonical/10` §6.2, for P0.

## Context

The canonical corpus was written over time and contains a stack evolution. `docs/canonical/10` (MVP build architecture) recommends a FastAPI/Python application runtime. The later `docs/canonical/15` (runtime orchestration) and `docs/canonical/23` (implementation roadmap) both specify a TypeScript modular monolith with Next.js.

Leaving this unresolved would let each implementation session pick a runtime, which is exactly the failure mode this control plane exists to prevent.

## Decision

The P0 runtime stack is:

| Concern | Choice | Timing |
|---|---|---|
| Frontend | Next.js (App Router) | P0 |
| Language | TypeScript / Node.js | P0 |
| Application + domain runtime | TypeScript modular monolith | P0 |
| Canonical storage | PostgreSQL | P0 |
| Geography | PostGIS (extension enabled early) | P0 — enable; spatial logic later |
| Fuzzy text retrieval | `pg_trgm` | P0 — enable; candidate generation at M2 |
| Public transport | REST + JSON + schema-generated contracts, SSE for research updates | P0 |
| Queue / ephemeral cache | Redis/Valkey | **Only when asynchronous historical research requires it (M3)** |
| Background jobs | BullMQ | **Only when asynchronous historical research requires it (M3)** |
| Object storage | EU-region private bucket | **Only when required** (large raw assets, report artifacts) |
| Observability | OpenTelemetry | **Progressively**; structured logs + request IDs from the first backend |
| Python | specialist OCR / data-science workloads only, later, if justified | Not P0 |

Supporting decisions that follow from this and are not re-opened per task:

- PostgreSQL is the workflow source of truth. A queue job completing is not the canonical record of research completion; `ResearchRun`/`ResearchModuleRun` rows are.
- UUIDv7 primary keys from the first migration.
- Single monorepo with `pnpm` workspaces; a build orchestrator is optional.
- No GraphQL, no WebSockets, no Temporal, no Kafka, no Kubernetes, no microservices, no graph database at P0.

## Two consequences recorded here to stop them being re-litigated

### 1. Confidence and rights are separate dimensions

Earlier build instructions made a `VERIFIED` confidence status depend on "relevant rights/surface validity". That coupling is removed.

```text
Claim ─────────────► ConfidenceAssessment          epistemic quality only

Claim / Evidence ──► RightsProfile ──► SurfaceEligibility   legal/product surface
```

A claim may be epistemically `VERIFIED` while a surface (free, premium, SEO, share) is blocked for rights reasons. A rights restriction never lowers confidence; a permissive licence never raises it. Rights are still stored and evaluated from the first internal slice — they simply do not enter the confidence calculation. Canonical basis: `docs/canonical/14` §80 and §99.10.

### 2. `DistributionSnapshot` is surname-scoped

`DistributionSnapshot` carries `surname_id` (`docs/canonical/11` §6.1). There is no dataset-global snapshot object.

National PESEL data is modelled as:

```text
Surname
  └─ DistributionSnapshot (surname-scoped, geography_level = NATIONAL, as_of_date, dataset_version)
       └─ DistributionValue (place_id = null, count = national count)
```

The imported resource/version is shared provenance carried by `Source` / `SourceRecord`. Changing this requires a new ADR.

## Alternatives considered

- **FastAPI/Python application runtime** (`docs/canonical/10` §6.2). Rejected for P0: it splits the contract/schema toolchain across two runtimes and adds deployment overhead before anything requires it. Python remains available later for OCR and data-science workloads, where it is genuinely stronger.
- **Redis/BullMQ from day one.** Rejected: nothing before M3 is asynchronous. Adding a queue to cache one PESEL lookup buys operational cost and no capability.
- **Temporal for orchestration.** Rejected for P0 per `docs/canonical/15` §1.4; revisit only against the complexity triggers named there.

## Consequences

- One language across API, orchestration, workers, contracts and frontend; contracts are defined once and generated outward.
- `docs/canonical/10` §6.2 remains historically accurate but is not implementable as written. Readers are directed here.
- M0–M2 run without Redis, BullMQ, object storage or a worker process doing real work. `apps/worker` exists at TASK-001 only as a buildable skeleton.
- Introducing Redis/BullMQ at M3 is an expected, planned change, not a stack revision, and needs no new ADR.
- Introducing Python for a specialist workload later requires a new ADR stating the workload and the deployment impact.

## Do not revisit unless

- a concrete P0 requirement cannot be met by Node.js/TypeScript (not a preference — a demonstrated limitation); or
- an asynchronous requirement appears *before* M3, in which case only the Redis/BullMQ timing is revisited, not the language; or
- the rights or distribution semantics above are changed by an explicit, approved architecture decision recorded in a superseding ADR.
