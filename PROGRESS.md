# PROGRESS.md — observed state

Facts only. What exists, what was verified, what is blocked. No diary, no intentions.

**Last updated:** 2026-09-18 — TASK-001 implementation session

## Current state

| | |
|---|---|
| Repository control plane | created (prior session) |
| Specification corpus | present and unmodified — `docs/canonical/10–23` verified byte-identical (SHA-256 of directory listing unchanged) |
| **TASK-001 — project foundation** | **implemented and verified** |
| Application source code | exists — foundation only, no domain logic (verified below) |
| Database migrations | one bootstrap migration only (`postgis` + `pg_trgm`); no domain tables |
| CI | configured (`.github/workflows/ci.yml`) |
| Next approved task | **TASK-002 is not yet specified.** Per AGENTS.md §8 and TASK-001 §9, this session stops here. Only the control-plane session may add a new detailed task. |

## What TASK-001 built

```text
package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig.base.json,
.nvmrc, .editorconfig, .gitignore, .env.example
eslint.config.js, .prettierrc.json, .prettierignore
.github/workflows/ci.yml

apps/web       — Next.js App Router, one page, /api/health (tested)
apps/admin     — minimal Next.js app, one page (tested)
apps/worker    — runWorker(): structured startup log + correlation ID (tested)

packages/domain    — uuidv7()/isUuidV7() (via `uuid`), createCorrelationId()
packages/contracts — empty but buildable, one placeholder export (tested)
packages/db        — pg pool, Kysely instance, Migrator/FileMigrationProvider,
                      one bootstrap migration, kysely-codegen wiring
packages/testing   — Testcontainers Postgres harness (pinned image), frozen clock

tests/integration  — Testcontainers-backed extension/migration test
```

No canonical domain table, no surname/resolver/PESEL/evidence/claim/rights logic, no Redis/BullMQ, no Stripe, no SEO, no genealogy code exists anywhere in this diff — confirmed by reviewing the complete `git diff` file by file against TASK-001 §3's out-of-scope list.

## Decisions accepted (prior session, unchanged)

| ADR | Decision |
|---|---|
| ADR-0001 | P0 stack: Next.js + TypeScript/Node.js modular monolith + PostgreSQL/PostGIS/`pg_trgm`. Redis/Valkey and BullMQ deferred to M3. |
| ADR-0002 | Data access: Kysely over `pg`, hand-written SQL migrations, database-generated types verified in CI. |

## D-005 resolved this session

Pinned PostgreSQL/PostGIS image, used everywhere: `postgis/postgis:16-3.4@sha256:44126d872ac91993766c341e369c539e8196614321765d36a6f1bab0419a5fa5` (PostgreSQL 16, PostGIS 3.4.2). Digest confirmed against Docker Hub's registry API at implementation time. `postgis/postgis` is built on the official `postgres` image, so it also carries `pg_trgm`. Full detail in `docs/DECISIONS_NEEDED.md` (D-005, now resolved) and in `docs/adr/0002-db-access.md`.

## Dependency choices and why

Beyond what ADR-0001/ADR-0002 already fix (Next.js, React, PostgreSQL, PostGIS, `pg_trgm`, Kysely, `pg`, `kysely-codegen`):

| Package | Why |
|---|---|
| `uuid` (v7) | UUIDv7 generation (RFC 9562) with a monotonic in-process counter — avoids hand-rolling timestamp/version/variant bit layout, which is easy to get subtly wrong. |
| `vitest` | P0 test runner per `docs/canonical/17` §3.1. |
| `fast-check` | P0 property-based testing per `docs/canonical/17` §3.5, used for the UUIDv7 helper. |
| `testcontainers`, `@testcontainers/postgresql` | P0 integration-test harness per `docs/canonical/17` §3.2 and ADR-0002. |
| `tsx` | Runs TypeScript CLI scripts (migration runner, worker) directly — no separate compile-then-run step for these entry points. |
| `eslint` (pinned `9.39.5`, not the newly-released `10.x`) | `eslint-config-next`'s transitive plugins (`eslint-plugin-import`/`react`/`jsx-a11y`) declare peer support only up to ESLint 9 at time of writing; pinning avoids unmet-peer warnings and unverified behaviour on a same-day major release. |
| `typescript` (pinned `5.9.3`, not `7.x`) | `typescript-eslint`'s peer range caps at `<6.1.0`; TypeScript 7 would break linting. `5.9.3` is the latest version inside every tool's supported range. |
| `@vitejs/plugin-react` (apps/admin only) | Vitest 5's default transform (Vite 8's `oxc` engine) does not honour Next's `jsx: "preserve"` tsconfig setting, so a `.tsx` component cannot be unit-tested without an explicit React JSX transform. Scoped to `apps/admin`, where a component test exists; does not affect `next build`, which reads its own config independently. |
| `@types/node`, `@types/pg`, `@types/react`, `@types/react-dom` | Type declarations for the above. |

## Real defects found and fixed during this session's own verification

Recorded because AGENTS.md §7 requires reporting actual results, not intentions:

1. **`kysely/migration` subpath.** Kysely 0.29 moved `Migrator`/`FileMigrationProvider` out of the main `kysely` export into `kysely/migration`, with a type-level guard on the main export's names. Caught by `pnpm typecheck`; fixed by importing from the subpath.
2. **`pnpm test` was sweeping in the Docker-dependent integration suite.** `tests/integration/package.json` originally named its script `"test"`, so the root `pnpm test` (`pnpm -r --if-present run test`) ran it too, making the "no Docker required" unit-test command fail in any environment without Docker. Fixed by renaming that package's script to `"test:integration"` and pointing the root `test:integration` script at it explicitly. Confirmed: `pnpm test` now runs only the 7 non-Docker packages (19 tests); `pnpm test:integration` targets only `tests/integration`.
3. **Integration test's "no domain table" assertion was wrong.** It excluded only `kysely_migration%` rows, but PostGIS itself creates three tables in the `public` schema (`geography_columns`, `geometry_columns`, `spatial_ref_sys`) as a side effect of `CREATE EXTENSION postgis`. Running the migration against a real database and inspecting `information_schema.tables` (see below) showed this; the test now excludes the five known non-domain tables by name and fails on anything else.
4. **Integration test teardown crashed on startup failure.** `afterAll` called `database.stop()` unconditionally; if `beforeAll` threw before assigning `database` (as happened in this sandbox — see below), teardown threw a second, unrelated `TypeError` that masked the real error. Fixed with an optional call and a `requireDatabase()` guard for the `it()` bodies.

## Verification actually run, and its actual results

All commands below were executed in this session; output is summarized, not assumed.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` (from a `node_modules`-clean state) | **Passed.** Lockfile up to date, no resolution step needed. |
| `pnpm typecheck` | **Passed.** All 8 packages with a `typecheck` script (`apps/web`, `apps/admin`, `apps/worker`, `packages/domain`, `packages/contracts`, `packages/db`, `packages/testing`, `tests/integration`) report `Done` under `strict: true`. |
| `pnpm lint` | **Passed.** Zero errors, zero warnings, across the whole workspace with one root ESLint flat config. |
| `pnpm format:check` | **Passed.** All matched files (code; Markdown is intentionally excluded — see `.prettierignore`) use Prettier's style. |
| `pnpm test` | **Passed.** 19 tests across 7 packages: `packages/domain` 7 (incl. 3 fast-check property tests), `packages/db` 4, `packages/testing` 3, `packages/contracts` 1, `apps/web` 1, `apps/admin` 1, `apps/worker` 2. No Docker required. |
| `pnpm db:migrate` (`DATABASE_URL` → local PostgreSQL 16 + `postgresql-16-postgis-3` apt package, PostGIS 3.4.2) | **Passed.** `0001_bootstrap_extensions: applied`; re-run reports `no pending migrations` (idempotent). |
| `pnpm db:generate-types` (same database) | **Passed.** Regenerates `packages/db/src/generated/db.ts`; `git diff`/`git status` on that path show **no difference** from the committed file. |
| Direct SQL: `SELECT extname FROM pg_extension WHERE extname IN ('postgis','pg_trgm')` | **Both rows returned** (`pg_trgm` 1.6, `postgis` 3.4.2) against the migrated database. |
| `pnpm test:integration` | **Did not complete in this session — environment limitation, not a code defect. See below.** |
| `pnpm build` | **Passed.** `next build` succeeds for `apps/web` (routes: `/`, `/_not-found`, `ƒ /api/health`) and `apps/admin` (routes: `/`, `/_not-found`); `tsc -p tsconfig.json` succeeds for `apps/worker`. |
| `git status --porcelain` (after staging) | Exactly the 73 files TASK-001 created — no stray or unexpected files. |
| `git diff --check` | Clean — no whitespace errors introduced. |

### `pnpm test:integration` — environment limitation, not a code defect

This session ran in a sandbox whose egress policy blocks container-registry **blob** downloads: Docker Hub, GHCR, Quay and public ECR all returned `403 Forbidden` on the actual image-layer fetch (registry API calls like manifest/tag lookups succeeded; only the blob CDN was blocked). This was confirmed directly — `docker pull` of the pinned image, of `ghcr.io`/`quay.io`/`public.ecr.aws` alternatives, and even of Testcontainers' own `testcontainers/ryuk` reaper image, all failed the same way. The digest recorded in D-005 was itself obtained from Docker Hub's metadata API, which *is* reachable — only the blob fetch is blocked.

Given this, `pnpm test:integration` could not run to completion in this sandbox: `startTestDatabase()` throws `Error: (HTTP code 404) no such container - No such image: ...` when Testcontainers tries to pull the pinned image (confirmed with `TESTCONTAINERS_RYUK_DISABLED=true` to isolate the failure to the Postgres image itself, not the reaper sidecar). This is expected to work normally on GitHub Actions (which has ordinary Docker Hub egress) and on a developer's own machine.

**Substitute verification actually performed**, to gain real confidence in the harness and the migration logic despite this:

- Installed `postgresql-16-postgis-3` via `apt` (PostgreSQL 16.13, PostGIS 3.4.2 — the same PostgreSQL and PostGIS minor version as the pinned container image) and started a local instance.
- Ran the actual `packages/db` code (`createPool`, `createDb`, `createMigrator`, the real bootstrap migration, and a `kysely` `sql` tagged-template query) against it directly from a script — not just raw `psql` — and confirmed the migration applies, both extensions report as enabled, and the same query the integration test runs returns the expected two rows.
- Ran `pnpm db:migrate` and `pnpm db:generate-types` for real against this database (see the table above) — these are the same code paths `tests/integration` exercises via Testcontainers, just against a differently-provisioned PostgreSQL+PostGIS instance rather than a container.
- This is how the two real defects in items 3 and 4 above were actually found: by running the logic against a real database rather than reasoning about it.

This substitutes for, but does not replace, an actual `pnpm test:integration` run. **`pnpm test:integration` should be re-run in an environment with normal container-registry access (CI, or local development) before this is treated as fully verified**, though nothing found in the substitute verification suggests it would fail there.

## Blockers

| ID | Blocker | Blocks |
|---|---|---|
| D-005 | ~~PostgreSQL image~~ — **resolved this session**, see above. | — |
| — | `pnpm test:integration` unverified via actual Testcontainers run in this sandbox (see above) — needs confirmation in an environment with normal Docker registry access. | Full TASK-001 sign-off; not a code change |
| D-001 | Exact production PESEL resource ID(s), file structure, resource reference date vs portal updated date, checksum, rights metadata and rarity denominator are not pinned. | TASK-004 |
| D-002 | Onomastics rights/source strategy unresolved. | meaning/etymology capability, M2+ |
| D-003 | Polona per-surface rights (metadata / OCR / image) unresolved. | M3 |
| D-004 | No lawful current regional surname dataset established. | current-geography capability; not on the paid-MVP critical path |

## Next action

TASK-001 is implemented and verified to the extent possible in this session (all commands green except the Testcontainers-specific run, which is blocked by this sandbox's network policy rather than by the code). Per TASK-001 §9 and AGENTS.md §8: **STOP.** Do not begin TASK-002. The control-plane session, not this one, is responsible for writing `tasks/002-*.md`.
