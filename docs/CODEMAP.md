# CODEMAP.md — repository areas

Where things live. Updated by whichever task changes the repository structure (`AGENTS.md` §8).

**TASK-001 status:** implemented. The monorepo foundation exists — pnpm workspace, three apps, four packages, one integration-test package, CI, migration mechanism. No domain logic anywhere in it (verified in PROGRESS.md).

**TASK-002 status:** implemented. The official PESEL national surname resources are pinned, understood and fixtured — real fixture files, a machine-readable source manifest, and a fail-closed schema validator package. D-001 resolved (`docs/DECISIONS_NEEDED.md`). No importer (verified in PROGRESS.md).

**TASK-003 status:** implemented. The exact surname resolver exists (`packages/resolver`) over the minimal identity core — migration `0002_identity_core` creates `knowledge_entities`, `surnames`, `name_forms` and the `resolvable_name_forms` eligibility view, nothing else. Exact T0/T1 matching only; read-only; fails closed on ambiguity. No fuzzy, phonetic, transliteration, diacritic-fold or gender-form logic anywhere; no importer, no `Claim`, no `Source` (verified in PROGRESS.md).

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
| `docs/adr/` | Accepted decisions — `0001-stack.md`, `0002-db-access.md`, `0003-source-record-granularity.md`, `0004-population-value-unit.md` | active |
| `docs/contracts/` | Accepted API/data contracts — `surname-result.md` (TASK-006, schema `1.0`) | active |
| `docs/SOURCE_MAP.md` | Corpus classification and ownership | active |
| `docs/CODEMAP.md` | This file | active |
| `docs/DECISIONS_NEEDED.md` | Unresolved blocking decisions | active |
| `docs/sources/pesel.md` | TASK-002 PESEL source-verification record — complete for the national production pair; D-001 resolved | active |
| `docs/sources/pesel-regional.md` | Regional PESEL resources (`1148786`/`1148790`): the `CURRENT_DISTRIBUTION` preflight verdict — not adopted, not ingested, not actionable — the ordered prerequisites, and the TASK-008 spike's blocked execution record with its per-item outcomes. No regional data is in the repository. | active |
| `docs/sources/acquisition/2026-09-18/` | The project owner's acquisition run — genuine `api.dane.gov.pl` resource metadata, per-resource tool records, checksums and report. Evidence of what an external tool observed; no raw source data. | reference, read-only in practice |
| `tasks/` | Task specifications — `001-project-foundation.md` (done), `002-pesel-source-spike.md` (done), `003-exact-surname-resolver.md` (done), `004-pesel-surname-ingestion.md` (done), `005-current-population-truth-chain.md` (done), `006-surname-result-read-api.md` (done), `008-pesel-regional-source-spike.md` (specified; attempted 2026-09-19, blocked on source supply). No `007-*.md` here — see that file's numbering note. | active |
| `prompts/` | Session prompts as delivered | reference |
| `00_READ_THIS_FIRST.md`, `PACKAGE_MANIFEST.md`, `FIRST_PROMPT_TO_COPY.md`, `NAME_ATLAS_IMPLEMENTATION_PLAN_REVIEWED_2026-09-18.md` | Package orientation and review | reference |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `.nvmrc`, `.editorconfig`, `.gitignore`, `.env.example` | Root workspace/tooling configuration | stable (TASK-001) |
| `eslint.config.js`, `.prettierrc.json`, `.prettierignore` | Single lint/format configuration for the whole workspace (`AGENTS.md` §6) | stable (TASK-001) |
| `.github/workflows/ci.yml` | CI: install → typecheck → lint → format check → unit tests → migrate → verify generated types → integration tests → build | stable (TASK-001) |
| `apps/web` | Next.js public application. One page, one `/api/health` route handler (tested). No BFF logic yet — that arrives with the first real endpoint at M2. | stable (TASK-001 skeleton) |
| `apps/admin` | Minimal internal Next.js application. One page. No auth, no admin features. | stable (TASK-001 skeleton) |
| `apps/worker` | Node entry point (`runWorker()`). Logs a structured startup line with a correlation ID and exits. No queue, no Redis, no BullMQ (ADR-0001) — those arrive at M3. | stable (TASK-001 skeleton, buildable, no queue) |
| `packages/domain` | `uuidv7()`/`isUuidV7()` (via the `uuid` package) and `createCorrelationId()`. Nothing domain-specific yet — no `Surname`, no `Claim`. | stable (TASK-001 skeleton) |
| `packages/contracts` | `@name-atlas/contracts`: the runtime API schemas (Zod 4 → types), single source for both sides (`ARCHITECTURE.md` §6). Holds the TASK-006 surname result contract; `docs/contracts/surname-result.md` records what was accepted. | stable (TASK-006) |
| `packages/db` | `pg` pool, Kysely instance, `Migrator`/`FileMigrationProvider` (ADR-0002), `kysely-codegen` wiring, generated `DB` type. Migrations: `0001_bootstrap_extensions` (`postgis` + `pg_trgm`, TASK-001), `0002_identity_core` (`knowledge_entities`, `surnames`, `name_forms`, view `resolvable_name_forms` — TASK-003 §6.2) `0003_source_rights_distribution` (`rights_profiles`, `sources`, `source_records`, `distribution_snapshots`, `distribution_values` — TASK-004; `source_records` uniqueness follows ADR-0003, not `docs/canonical/11`'s index line) and `0004_truth_layer` (`research_runs`, `evidence_items`, `claims`, `claim_evidence`, `confidence_assessments`, `citations` — TASK-005). | stable (TASK-001 mechanism; TASK-003 identity core; TASK-004 source/rights/distribution; TASK-005 truth layer) |
| `packages/testing` | Testcontainers Postgres harness pinned to `postgis/postgis:16-3.4@sha256:44126d87…` (resolves D-005), frozen-clock helper. `TEST_DATABASE_URL` fallback (TASK-003): when set, a fresh uniquely-named database is created on that server instead of starting a container — the substitute path for environments that cannot pull the image; CI leaves it unset. | stable (TASK-001; fallback TASK-003) |
| `packages/sources` | `@name-atlas/sources`: (a) TASK-002's schema description and fail-closed parser/validator for the PESEL national CSV shape — pure, no database; (b) TASK-004's source registry (`registry.ts`: the PESEL `Source` and `RightsProfile` as data, not scattered constants), `BULK_DATASET` importer (`importer.ts`) and typed outcomes (`import-result.ts`), plus `bin/import-pesel.ts`. The importer downloads nothing, derives nothing, and resolves identity through `@name-atlas/resolver` rather than duplicating it. | stable (TASK-002 parser; TASK-004 registry + importer) |
| `packages/truth` | `@name-atlas/truth`: the `CURRENT_POPULATION` truth chain (TASK-005) and its read projection (TASK-006). `derive.ts` **writes** — it turns a resolved surname plus TASK-004's distribution rows into `EvidenceItem` → `Claim` → `ClaimEvidence` → `ConfidenceAssessment` → `Citation`, idempotently. `read.ts` and `query.ts` are the **read-only** path the API uses and never reach derivation. `confidence.ts` and `rights.ts` are deliberately separate modules importing neither each other nor each other's inputs (`ARCHITECTURE.md` §10 invariant 2). `bin/surname-profile.ts` is the developer demo (`pnpm demo:surname`). | stable (TASK-005 chain; TASK-006 read path) |
| `packages/resolver` | `@name-atlas/resolver` (TASK-003): `normalize.ts` (`canonical_key_v1`: NFC → full case fold → separator map → trim/collapse; Polish fold table present but retrieval-only and unused by matching), `script.ts` (Unicode `Script_Extensions` detection, no dependency), `validation.ts` (`VALID`/`EMPTY`/`EXCEEDS_OPERATIONAL_LIMIT`/`MALFORMED_CONTROL_CHARACTERS`/`MIXED_SCRIPT_REVIEW`), `resolution.ts` (canonical `ResolutionStatus` subset + derived `RESOLVED`/`UNRESOLVED`/`INVALID_INPUT` projection), `lookup.ts` (`resolveSurname`: SELECT-only inside a `READ ONLY` transaction, T0 then T1, ambiguity → `MULTIPLE_EXACT`, DB failure → typed `LOOKUP_FAILED`), `version.ts`. Test-only seeding under the separate `@name-atlas/resolver/testing` entry, never reachable from the lookup path (enforced by `import-boundary.test.ts`). | stable (TASK-003) |
| `fixtures/pesel/` | Real PESEL fixtures: `national-male-2026-01-20.csv` (22 rows), `national-female-2026-01-20.csv` (23 rows), `source-manifest.json` (machine-readable resource metadata). Every row verbatim from the official source; selection method documented in `docs/sources/pesel.md`. | stable (TASK-002) |
| `tests/integration` | Real-PostgreSQL tests: `extensions.test.ts` (migrations apply from empty, `postgis`/`pg_trgm` enabled, the schema is exactly the identity core and nothing else, `canonical_key` is UNIQUE) and `resolver.test.ts` (TASK-003 §8 items 13–19 — T0/T1 hits, ineligible forms invisible, `MULTIPLE_EXACT` fails closed, unknown creates nothing, zero writes across the suite, DB failure ≠ `UNKNOWN`). All seeded records synthetic. | stable (TASK-001; TASK-003) |

## Planned — does not exist yet

The shape comes from `docs/canonical/23` §7; the task that creates each area is named so nobody builds ahead of schedule.

| Path | Purpose | Created by |
|---|---|---|
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
