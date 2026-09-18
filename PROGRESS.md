# PROGRESS.md — observed state

Facts only. What exists, what was verified, what is blocked. No diary, no intentions.

**Last updated:** 2026-09-18 — control-plane session

## Current state

| | |
|---|---|
| Repository control plane | **created** |
| Specification corpus | present and unmodified — `docs/canonical/10–23`, `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/`, `prompts/` |
| Application foundation | **not implemented** |
| Application source code | **none exists** |
| Package manifests / dependencies / lockfile | **none exist** |
| Database migrations | **none exist** |
| CI | **not configured** |
| Next approved task | **TASK-001** — `tasks/001-project-foundation.md` |

## What exists

Control plane, created this session:

```text
AGENTS.md              CLAUDE.md
PRODUCT.md             ARCHITECTURE.md        PLAN.md             PROGRESS.md
docs/SOURCE_MAP.md     docs/CODEMAP.md        docs/DECISIONS_NEEDED.md
docs/adr/0001-stack.md docs/adr/0002-db-access.md
docs/contracts/README.md
tasks/001-project-foundation.md
```

Nothing else in the repository was created by this session. The corpus was placed as delivered.

## Decisions accepted

| ADR | Decision |
|---|---|
| ADR-0001 | P0 stack: Next.js + TypeScript/Node.js modular monolith + PostgreSQL/PostGIS/`pg_trgm`. Redis/Valkey and BullMQ deferred to M3; object storage when required; OpenTelemetry progressively; Python only later for specialist OCR/data-science. Supersedes the FastAPI/Python recommendation in `docs/canonical/10` §6.2 for P0. Also records: confidence is epistemic and decoupled from rights; `DistributionSnapshot` remains surname-scoped. |
| ADR-0002 | Data access: Kysely over `pg` (node-postgres), hand-written SQL migrations run by Kysely's migrator, database types generated from the migrated schema and verified in CI. Prisma, Drizzle, raw `pg` and the ORMs were evaluated and rejected, with reasons recorded. |

## Verification run this session

| Check | Result |
|---|---|
| `docs/canonical/` unchanged | verified — SHA-256 of the directory listing identical before and after |
| Application code created | none — verified by inspecting the complete diff |
| Package manifests, dependencies, migrations created | none — verified by inspecting the complete diff |
| `git diff --check` | clean |

No build, test, lint or typecheck command was run, because no application project exists to run them against.

## Blockers

| ID | Blocker | Blocks |
|---|---|---|
| D-005 | The local/CI/Testcontainers PostgreSQL image must provide both `postgis` and `pg_trgm`; a PostGIS-bundled image is required. Expected to be resolved inside TASK-001. | TASK-001 |
| D-001 | Exact production PESEL resource ID(s), file structure, resource reference date vs portal updated date, checksum, rights metadata and rarity denominator are not pinned. | TASK-004 |
| D-002 | Onomastics rights/source strategy unresolved (IJP PAN partnership vs claim-by-claim lawful sources). | meaning/etymology capability, M2+ |
| D-003 | Polona per-surface rights (metadata / OCR / image) unresolved. | M3 |
| D-004 | No lawful current regional surname dataset established. | current-geography capability; not on the paid-MVP critical path |

Detail for each is in `docs/DECISIONS_NEEDED.md`. Only D-005 touches TASK-001, and it is expected to be resolved within that task.

## Next action

Start a fresh session and implement `tasks/001-project-foundation.md`, following `AGENTS.md`. Do not continue into TASK-002.
