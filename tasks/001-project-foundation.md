# TASK-001 — Project foundation

- **Status:** NOT STARTED
- **Milestone:** M0
- **Depends on:** nothing
- **Blocks:** TASK-002, TASK-003, and everything after
- **Model guidance:** mid-tier model, fresh session
- **Canonical epic:** FND-001 + the foundation half of QA-001 (`docs/canonical/23` §48)

## 1. Goal

Create the smallest production-shaped, testable TypeScript monorepo foundation required before the first surname vertical slice.

"Production-shaped" means the skeleton is the real structure — real workspace layout, real strict compiler settings, real CI, a real PostgreSQL with the extensions the architecture needs — not a prototype to be replaced later.

"Smallest" means no domain logic. This task builds the thing that later tasks build **inside**. If a file in this task knows what a surname is, the task has gone out of scope.

## 2. In scope

1. **pnpm workspace** — root `package.json`, `pnpm-workspace.yaml`, pinned Node and pnpm versions, lockfile committed.
2. **Strict TypeScript** — shared base `tsconfig`, `strict: true`, no implicit `any`, no unchecked indexed access escapes; project references or path aliases so packages import each other by name.
3. **`apps/web`** — Next.js App Router application. One page and one health route handler. Builds and serves.
4. **`apps/admin`** — minimal separate Next.js application. One page. Builds. No authentication, no admin features (`docs/canonical/22` is out of scope here).
5. **`apps/worker`** — minimal Node entry point that starts, logs a structured startup line with a request/run correlation ID helper, and exits cleanly. **No queue, no Redis, no BullMQ** (ADR-0001).
6. **Initial shared packages** — `packages/domain` (shared primitives including a UUIDv7 helper), `packages/contracts` (empty, buildable, ready for M2), `packages/db` (connection + migrations + generated types), `packages/testing` (test helpers, Testcontainers harness, frozen-clock helper).
7. **Lint and format** — one linter and one formatter, one configuration at the root, applied across all workspaces, enforced in CI.
8. **Root scripts** — `build`, `typecheck`, `lint`, `format:check`, `test`, `test:integration`, `db:migrate`, `db:generate-types`, each fanning out across the workspace.
9. **Vitest** — unit test runner wired for every package, with at least one real test per package (not a placeholder assertion of `true`).
10. **fast-check** — installed and proven with one property test in `packages/domain` (for example: the UUIDv7 helper produces well-formed, unique, monotonically non-decreasing values).
11. **Testcontainers** — integration harness that starts PostgreSQL, applies migrations from empty, and tears down. Used by `test:integration`.
12. **Local/test PostgreSQL** — the same image for local development, CI and Testcontainers. Resolves D-005 in `docs/DECISIONS_NEEDED.md`.
13. **PostGIS and `pg_trgm`** — both enabled by the bootstrap migration, with an integration test asserting both are present.
14. **Migration mechanism per ADR-0002** — Kysely `Migrator` + `FileMigrationProvider`, migrations authored as explicit SQL, ordered file naming, plus the type-generation step and a CI check that checked-in types match a freshly migrated database.
15. **GitHub Actions** — one workflow running install → typecheck → lint → format check → test → integration test → build, on push and pull request.
16. **`.env.example`** — every variable the foundation reads, by name, with a comment. **No values, no secrets, no real hostnames.**
17. **Minimal health/build smoke checks** — `apps/web` health route returns a static OK payload and is covered by a test; `apps/worker` startup is covered by a test; both are exercised in CI.
18. **`docs/CODEMAP.md` update** — move every area this task creates from "Planned" to "Current", with accurate paths.

## 3. Out of scope

Do not create, stub, scaffold or "prepare for" any of the following. Their absence is a success condition.

- Surname resolver, normalisation, casefolding, diacritic handling, candidate generation.
- PESEL source discovery, download, parsing or fixtures.
- PESEL ingestion; any importer.
- `SourceRecord` implementation; `Source`, `RightsProfile` or any rights logic.
- `EvidenceItem`, `Claim`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation`.
- **Any canonical domain table.** Migration Groups A–G (`docs/canonical/23` §9) belong to TASK-004 and later. The only migration in this task is the bootstrap that enables extensions.
- Polona, any connector, any historical research.
- Redis, Valkey, BullMQ, any queue or job — unless TASK-001 proves them strictly required, which is not expected; if it somehow is, stop and report before adding them.
- Stripe, offers, orders, entitlements, premium reports.
- SEO, sitemaps, structured data, slug logic.
- `Family`, `Person`, genealogy anything.
- Analytics, PostHog, OpenTelemetry instrumentation (structured logs and correlation IDs only).
- UI design system, component library, visual styling beyond what a default Next.js page requires.
- Playwright, Storybook, k6 — later milestones (`docs/canonical/17` §3).
- Deployment to any hosting provider; provisioning any cloud resource.

## 4. Referenced decisions and documents

Read these; do not read the rest of the corpus.

| Reference | Why |
|---|---|
| `docs/adr/0001-stack.md` | The stack, and what is deferred |
| `docs/adr/0002-db-access.md` | Kysely + `pg` + SQL migrations + generated types; TASK-001 obligations are listed at its end |
| `ARCHITECTURE.md` §1, §2, §8, §9 | Topology, module ownership, runtime and deployment boundaries |
| `docs/CODEMAP.md` | Planned paths — use exactly these |
| `docs/DECISIONS_NEEDED.md` D-005 | The PostgreSQL image question this task resolves |
| `docs/canonical/23` §7 | Repository strategy and directory shape |
| `docs/canonical/23` §11, §12 | UUIDv7 from the first migration; enable PostGIS early, no spatial logic yet |
| `docs/canonical/23` §48 (FND-001, QA-001) | The canonical epic definitions |
| `docs/canonical/17` §3.1, §3.2, §3.5 | Vitest, Testcontainers and fast-check as the P0 test stack |
| `AGENTS.md` | Operating rules |

Do not read `docs/canonical/11`, `13`, `14` or `16` for this task — nothing here implements them.

## 5. Likely code areas

```text
package.json                     pnpm-workspace.yaml            pnpm-lock.yaml
tsconfig.base.json               .editorconfig                  .gitignore
.env.example                     .github/workflows/ci.yml

apps/web/                        Next.js app, one page, /api/health route
apps/admin/                      Next.js app, one page
apps/worker/                     Node entry point, structured startup log

packages/domain/                 shared primitives, UUIDv7 helper, property test
packages/contracts/              empty but buildable
packages/db/                     pool, Kysely instance, migrator, migrations/, generated types
packages/db/migrations/          0001 bootstrap: CREATE EXTENSION postgis, pg_trgm
packages/testing/                Testcontainers harness, frozen clock, shared test setup

tests/integration/               extension + migration integration tests
```

Exact naming may differ where a tool requires it; the workspace shape may not.

## 6. Constraints

- **Nothing domain-specific.** No file in this task may reference a surname, source, claim, evidence item or rights profile.
- **One bootstrap migration only.** It enables `postgis` and `pg_trgm` and nothing else. No domain tables.
- **UUIDv7 from the start** — the helper exists now so no later task retrofits IDs.
- **The same PostgreSQL image everywhere** — local, CI, Testcontainers. A PostGIS-bundled image is required; the stock image will not do.
- **Migrations are SQL, authored by hand** (ADR-0002). Nothing generated by diffing a model.
- **Types are generated from the database**, checked in, and verified current in CI.
- **No secrets.** `.env.example` carries names and comments only. Nothing real is committed.
- **No production infrastructure.** No deploy step, no cloud resource, no hosting account.
- **Add no dependency** beyond what the in-scope list requires. Each one is justified in one line in the change description.
- **Jobs and processes must be idempotent-safe by construction** — the worker skeleton must not assume single delivery, even though it does no work yet.
- Every test must assert something real. A test that cannot fail is not a test.

## 7. Verification commands

Run all of these from a clean checkout, in this order. Report the actual command and its actual output.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:integration
pnpm build
```

Then verify the database environment explicitly:

```bash
pnpm db:migrate
pnpm db:generate-types      # must produce no diff against the checked-in types
```

And confirm, inside the integration suite (asserted by a test, not by eye):

```sql
SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm');
-- must return both rows
```

Finally:

```bash
git status --porcelain      # expect no unexpected or untracked files
git diff --check            # expect no whitespace errors
```

## 8. Acceptance criteria

1. `pnpm install --frozen-lockfile` succeeds from a clean checkout with a committed lockfile.
2. `pnpm typecheck` passes with `strict: true` across every workspace package.
3. `pnpm lint` and `pnpm format:check` pass across every workspace package.
4. `pnpm test` passes and runs at least one meaningful test in every package, including one fast-check property test in `packages/domain`.
5. `pnpm test:integration` passes: Testcontainers starts PostgreSQL, migrations apply from an empty database, `postgis` and `pg_trgm` are asserted present, teardown is clean.
6. `pnpm build` produces builds for `apps/web`, `apps/admin` and `apps/worker`.
7. `apps/web` serves a health endpoint returning a static OK payload, covered by a test.
8. `apps/worker` starts, emits a structured log line with a correlation ID, and exits cleanly, covered by a test.
9. `pnpm db:migrate` applies the bootstrap migration; `pnpm db:generate-types` regenerates types with no diff against what is committed.
10. The migration mechanism matches ADR-0002: Kysely migrator, hand-written SQL, ordered files.
11. GitHub Actions runs the full verification sequence on push and pull request, and passes.
12. `.env.example` lists every variable the foundation reads, with no values.
13. No domain table, no domain logic, and nothing from the out-of-scope list exists anywhere in the diff.
14. `docs/CODEMAP.md` reflects the real structure.
15. `PROGRESS.md` records observed facts: what exists, the commands run, their real results, the PostgreSQL image chosen.

## 9. Definition of done

- Every acceptance criterion above is met and was verified by running the command, not by inspection.
- The complete `git diff` has been reviewed file by file; accidental changes, debug code and stray files are removed.
- `docs/canonical/` is untouched.
- `docs/CODEMAP.md` is updated.
- `PROGRESS.md` is updated with facts only, including the resolution of D-005 (the exact PostgreSQL image and tag).
- If anything was blocked, it is stated explicitly in `PROGRESS.md` with what is needed to unblock it.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin TASK-002. Do not write `tasks/002-*.md`. Do not download a PESEL resource "while you are here".
