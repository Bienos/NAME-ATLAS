# CODEMAP.md — repository areas

Where things live. Minimal by design: **no application code exists yet.**

Updated by whichever task changes the repository structure (`AGENTS.md` §8).

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
| `tasks/` | Task specifications — `001-project-foundation.md` | active |
| `prompts/` | Session prompts as delivered | reference |
| `00_READ_THIS_FIRST.md`, `PACKAGE_MANIFEST.md`, `FIRST_PROMPT_TO_COPY.md`, `NAME_ATLAS_IMPLEMENTATION_PLAN_REVIEWED_2026-09-18.md` | Package orientation and review | reference |

## Planned — does not exist yet

Nothing below has been created. The shape comes from `docs/canonical/23` §7; the task that creates each area is named so nobody builds ahead of schedule.

| Path | Purpose | Created by |
|---|---|---|
| `apps/web` | Next.js public application + thin same-origin BFF | TASK-001 (skeleton) |
| `apps/admin` | Internal admin/research console | TASK-001 (minimal skeleton) |
| `apps/worker` | Background worker process | TASK-001 (buildable skeleton only; no queue until M3) |
| `packages/contracts` | Shared schemas → JSON Schema → OpenAPI → client types | TASK-001 (skeleton), filled at M2 |
| `packages/domain` | Shared domain types and primitives (incl. UUIDv7) | TASK-001 (skeleton) |
| `packages/db` | Connection, migrations, generated schema types | TASK-001 (mechanism only, no domain tables) |
| `packages/testing` | Test harness, Testcontainers helpers, fixtures, frozen clock | TASK-001 |
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
| `tests/golden`, `tests/integration`, `tests/e2e`, `tests/load` | Test corpora and suites | TASK-001 (structure), filled per task |
| `ops/` | Deployment blueprint and scripts | TASK-001 (minimal) / M0 |
| `.github/workflows/` | CI | TASK-001 |
| `.env.example` | Environment variable names only, never values | TASK-001 |

A package appearing before the task that owns it is scope creep. See `AGENTS.md` §6.
