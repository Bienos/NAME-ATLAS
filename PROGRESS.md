# PROGRESS.md — observed state

Facts only. What exists, what was verified, what is blocked. No diary, no intentions.

**Last updated:** 2026-09-18 — TASK-002 in progress (production resource IDs verified; file-level facts open)

## Current state

| | |
|---|---|
| Repository control plane | created (prior session) |
| Specification corpus | present and unmodified — `docs/canonical/10–23` verified byte-identical (SHA-256 of directory listing unchanged) |
| **TASK-001 — project foundation** | **implemented and verified** |
| **TASK-002 — PESEL source spike** | **IN PROGRESS.** Dataset-level facts and the exact national production resource pair (male `1148808`, female `1148811`, `data_date` 2026-01-20) verified (project-owner-supplied, manual API retrieval — `docs/sources/pesel.md`). File-level facts (headers, types, encoding, checksum, fixture) remain unresolved — no file downloaded. `packages/sources`/`fixtures/pesel/` not yet created. |
| Application source code | unchanged since TASK-001 — foundation only, no domain logic, no `packages/sources` |
| Database migrations | one bootstrap migration only (`postgis` + `pg_trgm`); no domain tables |
| CI | configured (`.github/workflows/ci.yml`) |
| Next approved task | TASK-002 continues. Next required evidence: the actual CSV file bytes (or a reachable download URL) for resources `1148808`/`1148811`, plus header/type/encoding/checksum facts derived from them — unreachable from this session (confirmed again), to be supplied by the project owner the same way as before. |

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
| D-001 | Dataset-level facts and the exact national production resource pair (male `1148808`, female `1148811`, reference date 2026-01-20) now verified — see `docs/sources/pesel.md`. File structure, encoding, checksum, exact headers/types, portal-update date, and the rarity denominator remain unpinned; no file has been downloaded. | TASK-004 |
| D-002 | Onomastics rights/source strategy unresolved. | meaning/etymology capability, M2+ |
| D-003 | Polona per-surface rights (metadata / OCR / image) unresolved. | M3 |
| D-004 | Source *existence* now verified: a current (2026-01-20), lawful, official regional resource pair exists (male `1148786`, female `1148790`) — see `docs/DECISIONS_NEEDED.md` D-004 and `docs/sources/pesel.md`. Whether/how to adopt it (voivodeship-of-registered-residence, not origin/ancestry/current-physical-residence) is a separate, still-open decision. No map or regional logic built. | current-geography capability; not on the paid-MVP critical path |
| — | `dane.gov.pl` (the PESEL source domain) was unreachable from this planning session's environment — `EGRESS_BLOCKED` on the dataset landing page. TASK-002's own file records this as an explicit environment dependency for whichever session implements it. | TASK-002 implementation (not this planning task) |

## TASK-002 planning session

`tasks/002-pesel-source-spike.md` created per `docs/canonical/23` SPIKE-01. No code was written; no canonical document was touched (byte-identical, verified again). The task requires the implementing session to establish 20 specific facts about the real PESEL resource from the live source, or explicitly record each as unresolved — never guessed (`AGENTS.md` §9). It commits no fixture, no schema, no validator itself; those are TASK-002's implementation output, not this planning session's.

A live check of `https://dane.gov.pl/pl/dataset/1681,nazwis` was attempted while writing the task, purely to confirm the URL already recorded in `docs/canonical/12` §2.1 was still reachable — it returned `EGRESS_BLOCKED` from this session's network policy.

## TASK-002 implementation attempt — BLOCKED (this session)

Per TASK-002's own source preflight, this session tested real outbound access to `dane.gov.pl` before doing anything else, as required. Result:

| Check | Result |
|---|---|
| `WebFetch https://dane.gov.pl/pl/dataset/1681,nazwis` | `EGRESS_BLOCKED` |
| `curl https://dane.gov.pl/` | `curl: (56) CONNECT tunnel failed, response 403` |
| `curl https://www.dane.gov.pl/` | `curl: (56) CONNECT tunnel failed, response 403` |
| `curl https://api.dane.gov.pl/` | `curl: (56) CONNECT tunnel failed, response 403` |
| `getent hosts dane.gov.pl` | Resolves (`185.41.93.178`) — confirms this is an egress-proxy policy block, not a DNS or connectivity fault |

Every `dane.gov.pl` host is blocked at this session's network egress policy, consistently, across two different tools (`WebFetch` and `curl`). This is the same domain-level block encountered in the TASK-002 planning session, now confirmed again and more thoroughly.

**Nothing else was implemented as a result**, matching TASK-002 §11 and this session's explicit instructions:

- No dataset ID, resource ID, URL, date, schema, checksum, field type, or licence term was fabricated, inferred, or reconstructed from the canonical corpus and presented as freshly verified.
- No unofficial mirror or third-party source was substituted for the official portal.
- No different surname dataset (e.g., one including deceased persons) was substituted for the living-person dataset.
- No fixture, schema description, or validator was written — all twenty items in TASK-002 §8 require either a verified fact from the live source or an explicit `UNRESOLVED`, and with the source unreachable, every one of them is unresolved. Writing a document of twenty `UNRESOLVED` entries with no real content would not have added information beyond what is recorded here.
- `packages/sources`, `fixtures/pesel/`, and `docs/sources/pesel.md` were **not** created.
- `docs/DECISIONS_NEEDED.md` D-001 was **not** marked resolved. It was updated to record this attempt and to list exactly what must be supplied — either by a session with real access to `dane.gov.pl`, or manually by the project owner — to unblock it (see D-001 for the full list).

No verification commands were run beyond confirming the repository is unchanged from TASK-001 (`git status --porcelain` — clean before this session's doc-only edits); there is no new code to typecheck, lint, or test.

## TASK-002 continued — dataset-level facts supplied by the project owner (this session)

The project owner manually retrieved the official `dane.gov.pl` API response for dataset 1681 and relayed the dataset-level facts into this session, per the "what must be supplied manually" list recorded above. This session:

- reconfirmed the API is still unreachable directly (`curl https://api.dane.gov.pl/1.4/datasets/.../resources` → `CONNECT tunnel failed, response 403`; `WebFetch` on the same URL → `EGRESS_BLOCKED`) — the block persists, which is why manual supply is being used;
- recorded the supplied facts in a new file, `docs/sources/pesel.md`, attributed explicitly as project-owner-supplied, not independently fetched;
- did **not** infer any resource-level fact from the dataset-level response, per the project owner's explicit instruction — in particular, the dataset's `verified`/`modified` timestamps are recorded as existing dataset-level fields only, not as the PESEL data reference date, and no value for either was given to this session to record;
- did **not** create `packages/sources` or `fixtures/pesel/` — there is still no resource-level data (headers, types, real rows) to build a schema, validator, or fixture from.

Facts now verified at the dataset level (full detail in `docs/sources/pesel.md`): dataset ID 1681, full API slug, title, publishing institution (333 / Ministerstwo Cyfryzacji), licence (CC0 1.0), yearly update frequency, national (Poland) scope, living-persons-only scope, current-surname-field semantics, and the suppression rule (surnames occurring exactly once excluded).

Still unresolved: exact resource ID(s) and which of the dataset's 21 resources are the current male/female production files, resource reference date, portal-update-date value, checksum, encoding, headers, field types, the fixture, and the schema validator. Next required evidence: the resource listing at `https://api.dane.gov.pl/1.4/datasets/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel/resources`, also unreachable from this session, to be supplied the same way.

`docs/DECISIONS_NEEDED.md` D-001 updated accordingly. **D-001 remains OPEN — not resolved.**

## TASK-002 continued — production resource IDs supplied by the project owner (this session)

The project owner manually retrieved the dataset 1681 resource listing (`/resources?per_page=100`) and relayed the current 2026 production resource IDs. This session:

- reconfirmed the API is still unreachable directly — `curl https://dane.gov.pl/` and `curl https://api.dane.gov.pl/1.4/resources/1148808,...` both → `CONNECT tunnel failed, response 403`; the block is domain-wide, not resource-specific;
- recorded the supplied facts in `docs/sources/pesel.md`, attributed as project-owner-supplied;
- kept `data_date`, `created`, `modified`, `verified`, `retrieved_at` explicitly distinct per the project owner's instruction — only `data_date` (`2026-01-20`) has a stated value; the other four field names are recorded as known to exist, with no value assumed for any of them;
- did **not** download any file, compute any checksum, or infer any header/type/encoding — none of that was supplied, and none was guessed;
- did **not** create `packages/sources` or `fixtures/pesel/` — still no file-level data to build them from;
- did **not** implement any regional/map logic — the regional resources are recorded as evidence of source existence only.

**Now verified:** national production resource pair — male `1148808` ("Nazwiska męskie - stan na 2026-01-20"), female `1148811` ("Nazwiska żeńskie - stan na 2026-01-20"), both `data_date = 2026-01-20`. Also verified: a current regional resource pair exists (male `1148786`, female `1148790`, same date) — voivodeship of *registered permanent residence*, explicitly not origin/ancestry/birthplace/historical distribution/necessarily-current-physical-residence per the project owner's instruction.

`docs/DECISIONS_NEEDED.md` updated: D-001 records the verified resource IDs and reference date, still open on file-level facts; D-004 records that a current regional source now verifiably exists, with adoption/framing/implementation explicitly left open — not resolved, no map built.

Still unresolved for TASK-002: the actual national CSV file bytes, exact headers, field types, encoding, checksum, the portal-update date (distinct from `data_date`), and the fixture. None of these can be produced without the actual file, which this session cannot download.

## Next action

TASK-001 remains implemented and verified as recorded above. TASK-002 is in progress: the exact national production resource IDs and reference date are verified; file-level facts (structure, encoding, checksum, fixture) remain open and require the actual CSV files, which this session cannot download. Per AGENTS.md §8 and TASK-002 §11: **STOP.** This session does not implement the production importer, does not create `packages/sources`/`fixtures/pesel/` without real file-level data, does not mark D-001 resolved, does not implement any D-004 regional/map logic, and does not write `tasks/003-*.md` or `tasks/004-*.md`.
