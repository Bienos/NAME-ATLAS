# CODEMAP.md — repository areas

Where things live. Updated by whichever task changes the repository structure (`AGENTS.md` §8).

**TASK-001 status:** implemented. The monorepo foundation exists — pnpm workspace, three apps, four packages, one integration-test package, CI, migration mechanism. No domain logic anywhere in it (verified in PROGRESS.md).

## Current — exists now

| Path | Contents | Status |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md` | Agent operating rules | stable |
| `PRODUCT.md`, `ARCHITECTURE.md`, `PLAN.md`, `PROGRESS.md` | Control plane | stable |
| `docs/canonical/` | Engineering specification, documents 10–23 | **read-only** |
| `docs/library/` | Design input and supporting research | read-only, on demand |
| `docs/archive/` | Large combined copy | read-only, not routinely read |
| `docs/reference/` | Method reference (PDF) | read-only |
| `docs/review/` | Duplicate of the reviewed implementation plan | read-only |
| `docs/adr/` | Accepted decisions — `0001-stack.md`, `0002-db-access.md` | active |
| `docs/contracts/` | API/data contract documents | active, empty of contracts |
| `docs/SOURCE_MAP.md` | Corpus classification and ownership | active |
| `docs/CODEMAP.md` | This file | active |
| `docs/DECISIONS_NEEDED.md` | Unresolved blocking decisions | active |
| `tasks/` | Task specifications — `001-project-foundation.md` (done) | active |
| `prompts/` | Session prompts as delivered | reference |
| `00_READ_THIS_FIRST.md`, `PACKAGE_MANIFEST.md`, `FIRST_PROMPT_TO_COPY.md`, `NAME_ATLAS_IMPLEMENTATION_PLAN_REVIEWED_2026-09-18.md` | Package orientation and review | reference |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `.nvmrc`, `.editorconfig`, `.gitignore`, `.env.example` | Root workspace/tooling configuration | stable (TASK-001) |
| `eslint.config.js`, `.prettierrc.json`, `.prettierignore` | Single lint/format configuration for the whole workspace (`AGENTS.md` §6) | stable (TASK-001) |
| `.github/workflows/ci.yml` | CI: install → typecheck → lint → format check → unit tests → migrate → verify generated types → integration tests → build | stable (TASK-001) |
| `apps/web` | Next.js public application. One page, one `/api/health` route handler (tested). No BFF logic yet — that arrives with the first real endpoint at M2. | stable (TASK-001 skeleton) |
| `apps/admin` | Minimal internal Next.js application. One page. No auth, no admin features. | stable (TASK-001 skeleton) |
| `apps/worker` | Node entry point (`runWorker()`). Logs a structured startup line with a correlation ID and exits. No queue, no Redis, no BullMQ (ADR-0001) — those arrive at M3. | stable (TASK-001 skeleton, buildable, no queue) |
| `packages/domain` | `uuidv7()`/`isUuidV7()` (via the `uuid` package) and `createCorrelationId()`. Nothing domain-specific yet — no `Surname`, no `Claim`. | stable (TASK-001 skeleton) |
| `packages/contracts` | Empty but buildable. One placeholder export/test. Filled at M2 (`docs/contracts/README.md`). | stable (TASK-001 skeleton) |
| `packages/db` | `pg` pool, Kysely instance, `Migrator`/`FileMigrationProvider` (ADR-0002), one bootstrap migration (`postgis` + `pg_trgm`), `kysely-codegen` wiring, generated `DB` type. **No canonical domain tables** — those are TASK-004/TASK-005. | stable (TASK-001 mechanism only) |
| `packages/testing` | Testcontainers Postgres harness pinned to `postgis/postgis:16-3.4@sha256:44126d87…` (resolves D-005), frozen-clock helper. | stable (TASK-001) |
| `tests/integration` | Testcontainers-backed test: starts the pinned image, runs the bootstrap migration, asserts `postgis`/`pg_trgm` are enabled and that no domain table exists. | stable (TASK-001) |

## Planned — does not exist yet

The shape comes from `docs/canonical/23` §7; the task that creates each area is named so nobody builds ahead of schedule.

| Path | Purpose | Created by |
|---|---|---|
| `packages/resolver` | Surname resolution engine | TASK-003 |
| `packages/sources` | Source connectors and rights registry | TASK-002 / TASK-004 |
| `packages/evidence`, `packages/claims`, `packages/confidence` | Trust chain | TASK-005 |
| `packages/places` | Place identity and resolution | M3 |
| `packages/runtime` | Research run orchestration | M3 |
| `packages/profiles`, `packages/coverage` | Projections, coverage, DiscoveryIndex | M2 / M4 |
| `packages/reports` | Report generation | M5 |
| `packages/commerce` | Offer/Order/Entitlement | M6 |
| `packages/seo`, `packages/analytics`, `packages/auth`, `packages/observability`, `packages/ui` | Supporting domains | later milestones |
| `fixtures/pesel/` | Small lawful real source fixture | TASK-002 |
| `tests/golden`, `tests/e2e`, `tests/load` | Test corpora and suites | filled per task (`tests/integration` already exists as of TASK-001) |
| `ops/` | Deployment blueprint and scripts | M0 infrastructure epic (INF-001), not TASK-001 — TASK-001 explicitly excludes provisioning any cloud resource |

Correction from the control-plane session's original plan: `ops/` was listed there as "TASK-001 (minimal)/M0". TASK-001's own out-of-scope list explicitly excludes "deployment to any hosting provider; provisioning any cloud resource", so `ops/` was correctly left uncreated by this task. It now belongs solely to the M0 infrastructure epic (INF-001, `docs/canonical/23` §48).

A package appearing before the task that owns it is scope creep. See `AGENTS.md` §6.
