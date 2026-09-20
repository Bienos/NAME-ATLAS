# PROGRESS.md — observed state

Facts only. What exists, what was verified, what is blocked. No diary, no intentions.

**Last updated:** 2026-09-19 — three parallel branches consolidated onto this one and the merged tree verified end to end (193 unit tests, 113 integration tests, migrations, build, and the chain through a real HTTP server). TASK-001 through TASK-006 implemented and verified; M1 complete, M2 begun. TASK-008 (PESEL regional source spike) specified and attempted; blocked on source supply.

## Current state

| | |
|---|---|
| Repository control plane | created (prior session) |
| Specification corpus | present and unmodified — `docs/canonical/10–23` verified byte-identical (SHA-256 of directory listing unchanged) |
| **TASK-001 — project foundation** | **implemented and verified** |
| **TASK-002 — PESEL source spike** | **IMPLEMENTED AND VERIFIED — now complete with no residuals.** All 20 acceptance items resolved; the two items previously carried forward (download URLs, portal timestamps) closed 2026-09-19 — `docs/sources/pesel.md`. D-001 **RESOLVED** (`docs/DECISIONS_NEEDED.md`). |
| **TASK-003 — exact surname resolver** | **IMPLEMENTED AND VERIFIED.** §6.2 approved by the project owner ("do task 003"). `packages/resolver` + migration `0002_identity_core`. All 19 acceptance tests in §8 implemented and passing — see the TASK-003 section below. |
| Application source code | `packages/resolver` (TASK-003), `packages/sources` (TASK-002/004), `packages/truth` (truth chain TASK-005; read path TASK-006), `packages/contracts` (TASK-006 API schemas), and one route handler in `apps/web`. Identity, source/rights, distribution and truth-layer tables exist. No `DigitalAsset`, `Place`, `EvidenceDependency`, `ResearchModuleRun` or outbox table. |
| Database migrations | `0001_bootstrap_extensions`, `0002_identity_core`, `0003_source_rights_distribution` and `0004_truth_layer` (`research_runs`, `evidence_items`, `claims`, `claim_evidence`, `confidence_assessments`, `citations` + 10 enums). Nothing else. |
| CI | configured (`.github/workflows/ci.yml`) |
| **TASK-004 — canonical PESEL surname dataset ingestion** | **IMPLEMENTED AND VERIFIED.** Migration `0003_source_rights_distribution` + `packages/sources` registry/importer/CLI. All 26 acceptance criteria demonstrated by tests that were run — see the TASK-004 section below. |
| **TASK-005 — `CURRENT_POPULATION` truth chain** | **IMPLEMENTED AND VERIFIED.** D-008 and D-009 answered by the project owner and recorded as RESOLVED. Migration `0004_truth_layer` + `packages/truth`. See the TASK-005 section below. |
| **TASK-006 — surname result read API / query contract** | **IMPLEMENTED AND VERIFIED.** `packages/contracts` (Zod schemas), `packages/truth/src/{read,query}.ts`, `GET /api/v1/surname-results`, and the repository's first accepted contract document. See the TASK-006 section below. |
| **`CURRENT_DISTRIBUTION` truth chain** | **NOT ACTIONABLE — no task file.** Preflight 2026-09-19: no approved source carries geographic surname distribution; the candidate regional pair is unadopted (D-004), carries no administrative code, and its suppression grain is unverified. `docs/sources/pesel-regional.md`. |
| **TASK-008 — PESEL regional source spike** | **SPECIFIED; ATTEMPTED AND BLOCKED 2026-09-19.** `tasks/008-pesel-regional-source-spike.md`. The source bytes were not supplied and every candidate host is egress-blocked. 3 of 27 acceptance items verified from committed metadata, 22 recorded `UNRESOLVED`. Resumes when the project owner supplies the two regional CSV files. |
| Next approved task | None. TASK-008 resumes on source supply. The rest of M2 (`CURRENT_RANK`, `RARITY_CONTEXT`, `pg_trgm` candidate generation, free result UI) has no task file. |

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
| D-001 | ~~PESEL source uncertainty~~ — **RESOLVED this session**, see below and `docs/DECISIONS_NEEDED.md`. Two narrow non-blocking residuals carried forward for TASK-004: exact per-resource download URL string; portal-update timestamp (distinct from the verified `data_date`). | — |
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

Still unresolved for TASK-002 at that point: the actual national CSV file bytes, exact headers, field types, encoding, checksum, the portal-update date (distinct from `data_date`), and the fixture. None of these could be produced without the actual file, which this session could not download.

## TASK-002 completed — real CSV files supplied, all remaining acceptance items verified (this session)

The project owner uploaded the two actual national CSV files (male `1148808`, female `1148811`), stated to be downloaded from the official resource endpoints. This session inspected the real bytes directly (not the upload metadata alone) and verified, from the bytes themselves:

- SHA-256 (`ce4238fe…62f4` male, `c508680d…09f6e6` female — full values in `docs/sources/pesel.md` and `fixtures/pesel/source-manifest.json`), exact byte sizes (5,293,415 / 5,592,881), UTF-8 encoding with no decode errors, no BOM, comma delimiter, no quoting anywhere, CRLF line endings throughout with a trailing terminator, exact header (`Nazwisko aktualne,Liczba`) identical in both files, 2 columns consistently, row counts (408,182 / 420,082), descending sort by count, value ranges (2–98,387 / 2–99,738);
- directly from the bytes: **zero** rows with `Liczba ≤ 1` in either file — the suppression rule confirmed independently of the earlier dataset-level metadata claim;
- **zero** malformed rows in either real file — both are completely clean, so fail-closed behaviour had to be demonstrated with deliberately mutated test files (as TASK-002 §4 item 13 anticipated), not with any real row;
- genuine Unicode/data-quality findings, preserved exactly rather than "fixed": 7 (male) / 5 (female) rows with a base Latin letter plus a standalone combining mark with no precomposed equivalent (e.g. `DOG̈AN`); one female row (`SCHIED ,2`) with a trailing space in the surname; several rows with a forward slash inside the surname (e.g. `W/SILASSIE`); a much wider real character set than just Polish diacritics (Vietnamese, German, Hungarian, Romanian, Cyrillic-adjacent).

Built as a result, all real and tested:

- `fixtures/pesel/national-male-2026-01-20.csv` (22 rows) and `national-female-2026-01-20.csv` (23 rows) — every row copy-identical to its source line (verified programmatically, not just by construction), selected by a documented, reproducible stratified method: top 15 by count, first 3 real rows at the count=2 suppression boundary, a foreign-script row, a combining-mark row, a slash row, and (female only) the whitespace row.
- `fixtures/pesel/source-manifest.json` — machine-readable metadata for both national resources (and, for D-004's record only, the two regional resource IDs), keeping `dataset_id`, `resource_id`, `resource_title`, `data_date`, `created`, `modified`, `verified`, `retrieved_at`, `official_source_url`, `checksum`, `format` and `encoding` as explicitly separate fields — never assumed equal to `data_date` or to each other. *(At the time this section was written, `official_source_url` and the four portal date fields were `null` with a note that they had never been supplied and were not guessed. They were populated from verified evidence on 2026-09-19 — see the section below.)*
- `packages/sources` (`@name-atlas/sources`, zero runtime dependencies): `schema.ts` (confirmed header/column/delimiter/terminator/minimum-count constants), `decode.ts` (strict UTF-8 decode, fails closed on invalid bytes or an unexpected BOM), `parser.ts` (fails closed on the first row deviating from the confirmed shape; returns surname text completely unmodified — no trim, no case change, no normalisation), `errors.ts` (`PeselSchemaError` with reason code and line number). 21 tests (`decode.test.ts`, `parser.test.ts`) — passing against both real fixtures (including every edge-case row above) and one deliberately mutated file per drift category: wrong header, missing column, extra column, non-numeric count, count of 1, count of 0, negative count, empty surname, LF-only endings, missing trailing terminator, empty file, unexpected BOM, invalid UTF-8.

`docs/DECISIONS_NEEDED.md` D-001 rewritten as **RESOLVED (TASK-002)**, with the full resolution recorded and two narrow, explicitly non-blocking residual items carried forward for TASK-004 (exact download URL string; portal-update timestamp distinct from `data_date`) — neither fabricated, both stated plainly as still unknown. *(Both closed 2026-09-19 — see below.)* D-004 unchanged from the prior session's update (source existence verified, adoption/implementation still open) — no map or regional logic was built.

## Verification run this session (after adding `packages/sources` and the fixtures)

| Command | Result |
|---|---|
| `pnpm install` | Passed — recognised the new `packages/sources` workspace member (10 of 10 projects). |
| `pnpm typecheck` | Passed — all 9 packages with a `typecheck` script, including the new `packages/sources`. |
| `pnpm lint` | Passed — zero errors, zero warnings. |
| `pnpm format:check` | Passed after one `pnpm format` auto-fix pass on a newly created test file. |
| `pnpm test` | Passed — **40 tests** across 8 packages (19 from TASK-001 + 21 new in `packages/sources`), including every fail-closed drift case. No Docker required. |
| `pnpm build` | Passed — `apps/web`, `apps/admin` (`next build`), `apps/worker` (`tsc`), unchanged from TASK-001. |
| `git status --porcelain` / `git diff --check` | Clean — only the files listed below; no whitespace errors. |
| `docs/canonical/` checksum | Unchanged (verified again). |

No canonical surname resolution, `NameForm` relationship, historical ingestion, `EvidenceItem`, `Claim`, trend calculation, API, or UI code was written — `packages/sources` parses raw source bytes into `{ surname, count }` rows only, with no mapping to any Name Atlas domain entity.

## TASK-003 specified — planning only, no code written (this session)

Created `tasks/003-exact-surname-resolver.md`. This session made no application-code change: `git status` before this task's commit shows only the new task file. `docs/canonical/` checksum re-verified unchanged.

What it specifies: an exact-only surname resolver (`packages/resolver`, `@name-atlas/resolver`) that takes a surname string and returns one of a small set of typed outcomes — `EXACT`, `KNOWN_VARIANT`, `MULTIPLE_EXACT`, `UNKNOWN`, `REVIEW_REQUIRED`, or a validation-stage outcome — never a guess. No fuzzy/phonetic/candidate-generation matching, no gendered-form generation, no PESEL ingestion.

**Baseline confirmed by direct inspection, not assumed:** no identity table (`knowledge_entities`, `surnames`, `name_forms`) exists anywhere in the repository; only one migration exists (`0001_bootstrap_extensions.ts`, extensions only); `packages/resolver` does not exist. TASK-002's completeness does not affect this task — the resolver depends only on TASK-001 (per the canonical roadmap's own dependency table: RES-001 depends on DB-001 and QA-001, not on the PESEL source epics).

**One contract decision requires approval before an implementation session begins** (task file §6.2): the task's own migration creates only `knowledge_entities`, `surnames`, `name_forms` — a deliberately narrower slice of `docs/canonical/23` §9.1's Migration Group A than the full group, omitting `name_form_relations`, `entity_external_ids`, `sources`, `rights_profiles`, `research_runs` (none of which this task's matching logic touches), and omitting two FK columns (`NameForm.geographic_scope_place_id`, `NameForm.created_by_run_id`) whose target tables don't exist yet. This is this planning session's engineering judgement applying the canonical staged-migration principle, not a project-level blocker — but it is flagged for a human's explicit sign-off rather than asserted silently, since it is the one place this task adds real schema ahead of TASK-004.

No entry was added to `docs/DECISIONS_NEEDED.md` — there is no genuine project-level blocker, only the in-task contract decision above.

## TASK-002 residuals closed — documentation only, no code change (2026-09-19)

The project owner supplied `NAME_ATLAS_ALL_DOWNLOADED_DATA.zip` (138,623,907 bytes, SHA-256 `555bc4da551058746a181dc16acaa66e28f39bd98e8ef3c405ff89270a9fb6ea`) as six `split` parts, reassembled in this session's scratchpad. It is the output of an automated acquisition run the project owner performed on their own machine, containing raw source files and the genuine `api.dane.gov.pl` JSON:API metadata responses for each.

**Verified, not assumed:**

- Zip integrity OK; **46 of 46 files verified against the archive's own `SHA256SUMS.txt`**, zero mismatches.
- The 2026 national CSV checksums in the archive are **byte-identical** to the ones already committed in `fixtures/pesel/source-manifest.json` (`ce4238fe…62f4` male, `c508680d…f6e6` female) — independent corroboration of TASK-002's pinned bytes along a second acquisition path.
- Regional pair likewise matched on checksum and byte size, and its header row was read from the actual bytes: `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba`.
- Resource-level portal metadata read from the captured JSON:API responses: `created`/`modified`/`verified` `2026-01-28T13:47:34Z` (male `1148808`) and `2026-01-28T13:48:39Z` (female `1148811`); `retrieved_at` `2026-09-18T17:40:00Z` / `17:39:46Z`.
- **New source fact:** the resources' native published format is **XLSX** (7,621,712 / 7,972,934 bytes); the CSV Name Atlas pins is a portal-generated conversion served from the official `csv_download_url` endpoint.
- **Checked and negative:** the resource-level metadata carries **no licence, rights or terms attribute** on any of the four resources — licence is stated only at dataset level. Recorded in D-004 rather than glossed over.

**This session did not download anything from `dane.gov.pl`.** It remained network-egress-blocked throughout; every fact above comes from the archive the project owner supplied.

Files changed (documentation and metadata only — no application code, no test, no migration):

- `fixtures/pesel/source-manifest.json` — previously-`null` fields populated for all four resources (`official_source_url`, `official_source_media_file_url`, `official_resource_metadata_url`, `created`, `modified`, `verified`, `retrieved_at`, `native_resource_format`, `native_resource_byte_size`), plus a dual-path `provenance` string and a `dates_note` restating that the four date concepts are never inferred from one another. Regional entries gained checksums, byte sizes, endpoints, timestamps and `observed_header_row`. Also corrected `dataset.official_dataset_url`, which was truncated mid-slug (`...1681,nazwis`) — a transcription artefact, now the full landing-page form, with the portal's own verified API self-link recorded alongside it. Dataset-level `license_name = 'CC0 1.0'` was corroborated from the portal's dataset metadata, and a `licence_provenance` note records that resource-level inheritance of it remains unverified.
- `docs/sources/pesel.md` — new section recording the above; `## D-001 status` rewritten to RESOLVED; three earlier "not yet supplied" markers corrected so the document no longer contradicts itself.
- `docs/DECISIONS_NEEDED.md` — D-001's two residual items marked CLOSED with the evidence; D-004 given a bounded update covering the regional bytes now observed and the sharper licence finding, explicitly not changing its adoption gate.
- `PROGRESS.md` — this section.

**Not done, deliberately:** the archive itself is not committed. Raw source files stay out of the repository — only checksums, metadata and the small real fixtures are versioned. The archive also contains non-PESEL sources (USA, France, Belgium, GeoNames, TERYT, morphology); none of them were read into any Name Atlas document, and none is authorised by this session.

## Verification run 2026-09-19

| Command | Result |
|---|---|
| `python3 -c "import json; json.load(...)"` on `fixtures/pesel/source-manifest.json` | Passed — parses as valid JSON; 2 national resources, 2 regional entries. |
| `pnpm typecheck` | Passed — all 9 packages with a `typecheck` script. |
| `pnpm lint` | Passed — zero errors, zero warnings. |
| `pnpm format:check` | Failed on first run (`fixtures/pesel/source-manifest.json` — my JSON rewrite did not match Prettier's style). Fixed with `pnpm exec prettier --write`; re-run **passed**, all matched files clean. |
| `pnpm test` | Passed — **40 tests** across 8 packages, unchanged from the TASK-002 run. No Docker required. |
| `git status --porcelain` | Four modified files, all documentation/metadata: `PROGRESS.md`, `docs/DECISIONS_NEEDED.md`, `docs/sources/pesel.md`, `fixtures/pesel/source-manifest.json`. No new, deleted or renamed files. |
| `git diff --check` | Clean — no whitespace errors. |
| `docs/canonical/` (and `library/`, `archive/`, `reference/`, `review/`, `prompts/`) | Unchanged — `git status --porcelain` on those paths returns empty. |

**Not run:** `pnpm build` and `pnpm test:integration`. No application code, dependency or migration changed in this session, and `test:integration` still requires Docker images that remain egress-blocked (see the TASK-001 section above). Neither is reported as passing.

## TASK-003 implemented — exact surname resolver (this session)

§6.2 of `tasks/003-exact-surname-resolver.md` (the minimal identity migration) was approved by the project owner before implementation began. Implemented exactly that scope. One reconciliation recorded up front: the project owner's implementation prompt named `RESOLVED / UNRESOLVED / INVALID_INPUT` outcomes while the task file uses the canonical `ResolutionStatus` enum and states the tri-state is a superseded simplification; the prompt itself defers to canonical field names and existing repository types. So `resolution_status` (canonical) is the primary field, and `outcome` is a pure, documented projection of it (`EXACT`/`KNOWN_VARIANT` → `RESOLVED`; `MULTIPLE_EXACT`/`UNKNOWN`/`REVIEW_REQUIRED` → `UNRESOLVED`; `EMPTY`/`EXCEEDS_OPERATIONAL_LIMIT`/`MALFORMED_CONTROL_CHARACTERS` → `INVALID_INPUT`). One model, both contracts.

**Built:**

- `packages/db/migrations/0002_identity_core.ts` — enums (`entity_type` narrowed to `SURNAME`/`NAME_FORM`, `evidence_scope`, `privacy_class`, `entity_status`, `surname_status`, `name_form_type`, `attestation_status`), tables `knowledge_entities`, `surnames` (`canonical_key` **UNIQUE** — T0 is unique by construction), `name_forms`, and view `resolvable_name_forms` encoding the §6.1 eligibility rule (`surname_id IS NOT NULL AND form_type IN ('CANONICAL','MODERN_VARIANT') AND attestation_status IN ('ATTESTED','DERIVED')`) so the lookup path structurally cannot see an ineligible row. **Not created:** `name_form_relations`, `entity_external_ids`, `sources`, `rights_profiles`, `research_runs`. **Columns omitted, each with its reason in the migration header:** `name_forms.geographic_scope_place_id` and `created_by_run_id` (target tables do not exist — as §6.2 says), and additionally `name_forms.valid_from_*/valid_to_*` — the flattened `TemporalExtent` (docs/canonical/11 §15.1: 8 columns + 3 enums), nullable and optional, which §6.2 did not name; this task performs no temporal logic, so creating it would be speculative abstraction (AGENTS.md §6). **This third omission is a deviation from §6.2's literal wording and is flagged here for the project owner.**
- `packages/db/src/generated/db.ts` — regenerated from the migrated database.
- `packages/resolver` (`@name-atlas/resolver`, deps: `@name-atlas/db`, `@name-atlas/domain`, `kysely` — no new third-party dependency): `normalize.ts` (`canonical_key_v1`: NFC → full case fold → separator mapping → trim → collapse; diacritics/particles/order preserved; Polish §6.1 fold table present, retrieval-only, **not called by matching** — asserted by test), `script.ts` (`\p{Script}`/`\p{Script_Extensions}` detection; Common/Inherited never count; Latin+Cyrillic/Greek flagged confusable), `validation.ts` (five outcomes; short/multi-word/hyphen/apostrophe inputs are VALID; tab/newline are control characters, not whitespace), `resolution.ts`, `lookup.ts` (`resolveSurname`: invalid input never touches the DB; valid input runs T0 then T1 inside one PostgreSQL `READ ONLY` transaction with the handle narrowed to `selectFrom` only; >1 distinct surname → `MULTIPLE_EXACT`, no selection; any DB error → typed `LOOKUP_FAILED`, never `UNKNOWN`), `version.ts` (`exact_resolver_v1`, `canonical_key_v1`, fixed strings — never derived from the runtime). Test-only `seedTestSurname`/`seedTestNameForm`/`countIdentityRows` under the separate `@name-atlas/resolver/testing` entry.
- Full case folding is implemented per code point as lower→upper→lower over ICU data (Node has no case-fold API; simple lowercasing misses `ß`→`ss`, which docs/canonical/13 §5.5 rules out), with one explicit exception (`ı` U+0131 stays itself, matching the default non-Turkic profile). **Not diffed against CaseFolding.txt** — unicode.org was egress-blocked. Verified empirically instead: idempotent and NFC/NFD-equivalent for every code point ≤ U+2FFFF and 400,000 random multi-code-point strings; the identity-relevant behaviour is pinned by tests.
- `packages/testing/src/postgres-container.ts` — `TEST_DATABASE_URL` fallback: creates a fresh uniquely-named database on an external server per `startTestDatabase()` and drops it (`WITH (FORCE)`) on `stop()`. CI is unchanged (env unset → pinned Testcontainers image). `TestDatabase` gained `connectionUri`; `container` is `null` on the fallback path.
- `tests/integration/src/resolver.test.ts` — §8 items 13–19 plus AC-specific cases, against real PostgreSQL. **Every seeded record is synthetic**; Polish spellings are realistic strings only.
- Two TASK-001 assertions that were true only while a single migration existed were tightened rather than deleted: `packages/db/src/migrator.test.ts` now asserts the exact ordered migration list; `tests/integration/src/extensions.test.ts` now asserts the exact table/view set (and that `canonical_key` is UNIQUE) instead of "no domain table".

**Defects found and fixed by running the tests, not by inspection:** (1) script detection tested Latin before Inherited, so a combining diaeresis on a Cyrillic base was classified Latin and flagged a mixed script — fixed by testing `Script=Common/Inherited` first; (2) `String.prototype.trim()` strips tabs/newlines, letting a control character pass as "empty" — replaced by a spaces-only trim so validation sees it; (3) Kysely's `destroy()` is a no-op on a never-initialised driver, so the first "dead connection" simulation was not dead — the test now initialises, destroys, and proves the instance rejects a query before using it; (4) an abandoned pool left a throwaway test database undroppable — `DROP DATABASE … WITH (FORCE)`.

**Tooling note for future sessions:** the file-write tool used in this session converts `\uXXXX` escape sequences in written content into literal characters. Invisible/bidi/confusable code points therefore landed literally in source and had to be re-escaped programmatically (139 code points across 7 files). Source files were verified afterwards: on code lines, the only remaining non-ASCII characters are Latin-script letters.

## Verification run for TASK-003 (2026-09-19)

Docker/container registries remain egress-blocked (as in TASK-001/002), so `pnpm test:integration` ran against a locally installed PostgreSQL 16.13 + PostGIS 3.4.2 via the `TEST_DATABASE_URL` fallback — the substitute TASK-003 §10 prescribes. It did **not** run against the pinned container image in this environment; CI will.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Failed as expected on first run (new workspace member); lockfile updated by `pnpm install --offline` — diff is only the `packages/resolver` importer block (workspace links + `kysely@0.29.6`, already in the lockfile). Nothing downloaded, no dependency upgraded. |
| `pnpm typecheck` | Passed — 10 of 10 packages with a `typecheck` script. |
| `pnpm lint` | Passed — zero errors, zero warnings (after re-escaping literal invisible characters flagged by `no-irregular-whitespace`). |
| `pnpm format:check` | Passed. |
| `pnpm test` | Passed — **95 tests** across 9 packages: 40 pre-existing + 55 new in `packages/resolver` (normalisation, validation, script detection, 6 fast-check properties, import-boundary). |
| `pnpm db:migrate` (local dev DB) | Passed — `0001_bootstrap_extensions: applied`, `0002_identity_core: applied`; re-run reports `no pending migrations`. |
| `pnpm db:generate-types` | Passed — regenerated file is byte-identical to the committed one (checked with `cmp`). |
| `pnpm test:integration` (`TEST_DATABASE_URL` → local PostgreSQL 16.13/PostGIS 3.4.2) | Passed — **28 tests** (3 in `extensions.test.ts`, 25 in `resolver.test.ts`), including the 40-run async property; zero throwaway databases left behind. |
| `pnpm build` | Passed — `apps/web`, `apps/admin` compiled, `apps/worker` built. |
| Forbidden-logic grep (`pg_trgm`, `similarity`, `levenshtein`, `soundex`, `metaphone`, `unaccent`, `transliterat`, `phonetic`, `fuzzy`, `gender`, `pesel`, `llm`) over new code | Only comment/test-title matches asserting absence, plus the canonical `name_form_type` enum member `'TRANSLITERATION'` (a value from docs/canonical/11 §4.3, no logic). |
| `git status` on `docs/canonical/`, `library/`, `archive/`, `reference/`, `review/`, `prompts/` | Unchanged. |

**Not verified in this environment:** the integration suite against the pinned `postgis/postgis:16-3.4@sha256:44126d87…` image itself (registry egress-blocked). Everything else above was run and observed.

## TASK-004 implemented — PESEL surname dataset ingestion (2026-09-19)

Scope authority: `tasks/004-pesel-surname-ingestion.md`. One bounded capability: the pinned official PESEL national surname resources can be ingested deterministically, idempotently and with full provenance, stopping before any claim, confidence or citation.

### What exists now

| Path | What it is |
|---|---|
| `packages/db/migrations/0003_source_rights_distribution.ts` | 10 enums + 5 tables: `rights_profiles`, `sources`, `source_records`, `distribution_snapshots`, `distribution_values` |
| `packages/sources/src/registry.ts` | PESEL `Source` + `RightsProfile` + the two approved resource descriptors, as data |
| `packages/sources/src/importer.ts` | The `BULK_DATASET` importer and the rights gate |
| `packages/sources/src/import-result.ts` | Typed outcomes and the reconciliation report |
| `packages/sources/bin/import-pesel.ts` | CLI (`pnpm --filter @name-atlas/sources run import-pesel`) |
| `packages/sources/src/{registry,importer}.test.ts` | 37 new unit tests |
| `tests/integration/src/pesel-ingestion.test.ts` | 32 new integration tests against real PostgreSQL |

Modified: `packages/db/src/migrator.test.ts` and `tests/integration/src/extensions.test.ts` (both are schema-inventory assertions that every schema-adding task must update), `packages/db/src/generated/db.ts` (regenerated), `packages/sources/{package.json,tsconfig.json,src/index.ts}`, `tests/integration/package.json`, `pnpm-lock.yaml` (workspace links only — no dependency added or upgraded; `kysely@0.29.6` already in use elsewhere).

### Implementer choices recorded (TASK-004 §14)

- **U-5 → option (a).** Any unresolvable row aborts the whole import and writes nothing. Fail closed.
- **U-6 → `universe_size` null.** The PESEL living-population denominator is not verified; inventing one is forbidden.
- **U-7 → separate read pass.** Resolution runs through `resolveSurname` *before* the write transaction, so its `READ ONLY` guarantee is never relaxed. The time-of-check/time-of-use gap is closed by the `surnames.canonical_key` UNIQUE constraint, which turns a concurrent creation into a rollback rather than a duplicate identity.

### Two documented deviations

1. **`source_records` uniqueness** is `(source_id, external_record_id, content_hash)`, not `docs/canonical/11`'s `(source_id, external_record_id)`. Per **ADR-0003**; the migration carries a comment pointing there. Without it, supersession of a reissued annual resource is unrepresentable.
2. **`distribution_values.place_id` carries no foreign key**, because `places` does not exist until M3. Null for every row this task writes.

### Verification actually run (2026-09-19)

Commands were run in this session; results are the observed output, not inspection.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | **PASS** |
| `pnpm typecheck` | **PASS** — 10 of 10 packages |
| `pnpm lint` | **PASS** — zero errors, zero warnings |
| `pnpm format:check` | **PASS** (after running Prettier on the 4 new/changed files) |
| `pnpm test` | **PASS** — **132 tests** across 9 packages (95 before; +37 in `packages/sources`) |
| `pnpm db:migrate` | **PASS** — `0001`, `0002`, `0003` applied; re-run reports `no pending migrations` |
| `pnpm db:generate-types` | **PASS** — regenerated file byte-identical to the committed one (`cmp`) |
| `pnpm test:integration` | **PASS** — **60 tests** (was 28): 4 `extensions`, 24 `resolver`, 32 `pesel-ingestion` |
| `pnpm build` | **PASS** — `apps/web`, `apps/admin`, `apps/worker` |
| Forbidden-logic grep over new code (`pg_trgm`, `similarity`, `levenshtein`, `soundex`, `metaphone`, `unaccent`, `transliterat`, `phonetic`, `fuzzy`, `polishDiacriticFold`, `etymolog`, `genealog`, `heraldr`, `claim`, `evidence`, `confidence`) | Only prose, comments and test titles asserting absence. No such logic exists. |
| `git status --porcelain` on `docs/canonical/`, `library/`, `archive/`, `reference/`, `review/`, `prompts/` | Unchanged |

**End-to-end CLI run against the real committed fixtures** (not only the test harness), against a live PostgreSQL:

| Run | Observed |
|---|---|
| Import male `1148808` | `IMPORTED` — rows read 22, imported 22, quarantined 0, surnames created 22, snapshots 22, values 22 |
| Re-run, identical bytes | `ALREADY IMPORTED` — nothing written |
| Import female `1148811` | `IMPORTED` — rows read 23, imported 23, quarantined 0, surnames created 16, **reused 7**, snapshots 23, values 23 |

Resulting database state, queried directly: 1 source, 1 rights profile, **2 source records** (one per resource version, not per row), 38 surnames, 38 name forms, 45 snapshots, 45 values; `0` rows with a count below 2, `0` with a non-null `place_id`, `0` with any derived field populated.

Real-value spot checks: `WIŚNIEWSKI` → key `wiśniewski` (**not** `wisniewski` — diacritics are identity-bearing), `NOWAK` 98,387 male / 99,738 female (matching the ranges recorded in `docs/sources/pesel.md`), `NGUYỄN`, `W/SILASSIE`, `SCHIED ` stored at length 7 with its real trailing space, and `DOG̈AN` / `SCHA̋FER` retaining their standalone combining marks.

### Not verified in this environment

The integration suite ran against a **locally installed PostgreSQL 16.13 + PostGIS 3.4.2** via the `TEST_DATABASE_URL` fallback, as in TASK-001/002/003. The pinned `postgis/postgis:16-3.4@sha256:44126d87…` container image was **not** exercised here — container registries remain egress-blocked. CI runs it.

### Carried forward

- **D-007** (`docs/DECISIONS_NEEDED.md`) — resource-level PESEL licence unconfirmed. The seeded profile carries `commercial_use = UNKNOWN` and `review_status = LEGAL_REVIEW_REQUIRED`, so `docs/canonical/12` §6.4 keeps `paid_surface_eligible = false` in the database. Blocks M5/M6, not ingestion.
- **TASK-004 §14 U-1** — what the male/female split partitions is still unknown. Handled by carrying the publisher's verbatim wording and putting the two partitions in **different `comparability_group` values**, so summing them is structurally forbidden. **Blocks TASK-005's claim wording.**
- **TASK-004 §14 U-4** — the unit of `Liczba` (occurrences vs. living people) is not stated by the publisher. **Blocks TASK-005's `CURRENT_POPULATION` claim.**
- **U-3** — raw source bytes are still not stored anywhere; `raw_text_ref` is null by design. Reproduction depends on the project owner retaining the acquisition archive. Object storage remains an infrastructure obligation.

## TASK-005 specified — planning only, no code written (2026-09-19)

`tasks/005-current-population-truth-chain.md` specifies one bounded capability: for a surname that resolves exactly and has applicable ingested PESEL data, produce a `CURRENT_POPULATION` claim with evidence, confidence, citation and rights metadata, plus a developer-facing result object. It closes M1's vertical slice and produces no rank, rarity, API or UI.

Established by direct inspection during the preflight, not assumed:

- **No truth-layer table exists.** There is no `evidence_items`, `claims`, `claim_evidence`, `confidence_assessments`, `citations` or `research_runs` table; migrations stop at `0003`. `packages/contracts` is still the intentional stub exporting only `CONTRACT_PACKAGE_VERSION`.
- **The chain TASK-005 must extend already reaches rights.** From a `distribution_values` row, a single join chain reaches `distribution_snapshots → source_records → sources → rights_profiles`; TASK-004's suite exercises it. TASK-005 extends this chain rather than building a second one.
- **A surname can carry two snapshots.** TASK-004's verified run observed 7 surnames present in both the male and female fixtures, in different `comparability_group` values (`NOWAK` at 98,387 and 99,738). The task therefore specifies **one claim per snapshot and no summation**, which follows from `docs/canonical/11` §6.1 plus the unanswered U-1 rather than from a new rule.

### Two canonical contradictions found and recorded, not resolved

Both were discovered by reading `docs/canonical/11` and `docs/canonical/14` against each other, and both block the TASK-005 migration. Per `AGENTS.md` §2 they are recorded rather than settled in code.

- **D-008** — `docs/canonical/14` presents a series of MODEL CHANGE PROPOSALS (14-A, 14-D and others) that conflict with `docs/canonical/11`'s schema on the `EvidenceType` enum (`OFFICIAL_DATASET_FIELD` vs `OFFICIAL_DATASET_VALUE` — one concept, two names), the `EvidenceItem` field set, the `ClaimEvidence` relationship enum, and the `CURRENT_POPULATION` payload field names (§10.1 vs §14.1). Which binds is undecided; three options and a recommendation are recorded.
- **D-009** — `EvidenceItem.created_by_run_id` and `Claim.created_by_run_id` are both required and not nullable, referencing `ResearchRun`, which `docs/canonical/11` marks **P0** while `PLAN.md` schedules the research runtime at **M3**. No `research_runs` table exists. TASK-005 is the first task forced to resolve it; three options and a recommendation are recorded.

### Carried forward, unchanged

TASK-004 §14 **U-1** (what the male/female split partitions) and **U-4** (the unit of `Liczba`) remain unanswered by the publisher. The task specifies how to proceed honestly without them — one claim per snapshot, never summed; the publisher's universe wording carried verbatim; no claim describing a count as a number of *people* — and instructs the implementing session to stop and report rather than choose a unit if that proves impossible. **D-007** (resource-level licence) stays open and constrains TASK-005's rights output without being its to close.

**Nothing was verified by running.** This session ran only read-only inspection over repository files. No test, typecheck or build was executed, and no TASK-005 code exists.

## TASK-006 specified — planning only, no code written (2026-09-19)

`tasks/006-surname-result-read-api.md` specifies one bounded capability: a caller submits an exact surname query and receives a stable, typed, rights-aware result carrying `CURRENT_POPULATION` and its supporting metadata, produced entirely by the TASK-003 → TASK-005 pipeline. It is the first slice of M2 and adds no second fact, no search, and no UI.

Established by direct inspection during the preflight, not assumed:

- **The API style is settled and is REST.** `docs/canonical/16` §2.1 records "REST — CHOSEN"; §1.2 fixes REST + JSON + OpenAPI-compatible schemas, with GraphQL and WebSockets explicitly excluded from P0. §5 fixes the `/api/v1/` prefix.
- **The BFF convention already exists in skeleton.** `apps/web` is a Next.js 16 App Router app whose only route handler is `apps/web/src/app/api/health/route.ts`, tested by importing and calling the handler directly. That is the pattern TASK-006 follows. `ARCHITECTURE.md` §6 forbids the handler from resolving, interpreting claims, computing confidence or evaluating rights, so the task puts the query service in a package and keeps the handler thin.
- **`packages/contracts` is still the intentional stub** exporting only `CONTRACT_PACKAGE_VERSION`, and `docs/contracts/README.md` states no contract is accepted yet, with the first expected at M2. TASK-006's contract is that first accepted contract and must be recorded there in the same change.
- **Zod is not a direct dependency** of any workspace package, though `docs/canonical/16` §1.3 recommends Zod 4 as the contract source. Adding it needs the one-line justification `AGENTS.md` §6 requires.
- **The canonical zero-versus-missing representation already exists**: `NumericValueStatus` (`KNOWN`, `SUPPRESSED`, `NOT_AVAILABLE`, `NOT_APPLICABLE`) with an explicit "Never `{"value": 0}` for suppressed values" (`docs/canonical/16` §26), and `RIGHTS_BLOCKED` as a `SectionState` member (§23). The task uses these rather than inventing states.
- **Exposing the surname UUID as API identity is canonically permitted** (`docs/canonical/16` §18, §21), so the usual "no internal identifiers" rule does not apply to it — but `PublicSurnameIdentity` also requires `canonical_slug` and `canonical_path`, and **no slug exists** anywhere in the schema.

### One contract-versus-evidence collision found and recorded, not resolved

- **D-010** — `docs/canonical/16` §26 fixes the population DTO's unit as the literal `"PEOPLE"`, with no alternative permitted. TASK-004 §14 **U-4** records that the publisher says *"liczba wystąpień"* — occurrences — and never states that one occurrence equals one living person. A response built literally to §26 would assert to end users something TASK-005's claim payload is forbidden to claim, in the one place `PRODUCT.md` §7 rule 1 promises full traceability. Because `ARCHITECTURE.md` §6 forbids the frontend from deriving facts, the unit is fixed at the contract boundary and cannot be deferred to the UI. Three options and a recommendation are recorded; shipping `"PEOPLE"` on the strength of the implication is explicitly not recommended. ***Resolved 2026-09-19 by `docs/adr/0004-population-value-unit.md`*** — Option B: the unit enum is widened and PESEL-derived responses carry `SURNAME_OCCURRENCES`.

### Precondition not met

**TASK-006 cannot begin until TASK-005 is implemented and accepted**, and TASK-005 is itself blocked on D-008 and D-009. The task file states this at the top and forbids the obvious workaround — querying `distribution_values` directly to "get something working" — because that is exactly the second truth chain the task exists to avoid.

**Nothing was verified by running.** This session ran only read-only inspection over repository files. No test, typecheck or build was executed, and no TASK-006 code exists.

## TASK-005 implemented — CURRENT_POPULATION truth chain (2026-09-19)

Scope authority: `tasks/005-current-population-truth-chain.md`. Closes M1's vertical slice: a surname that resolves exactly and has ingested PESEL data now yields an evidence-backed claim with confidence, citation and rights metadata, and nothing beyond it.

### Decisions answered before implementation

The project owner answered both blockers on 2026-09-19; both are recorded RESOLVED in `docs/DECISIONS_NEEDED.md`.

- **D-008 → Option A.** `docs/canonical/11` binds; `docs/canonical/14`'s MODEL CHANGE PROPOSALS are not ratified and were not built. `evidence_type` is §9.5's enum (`OFFICIAL_DATASET_FIELD`), `claim_evidence.relationship` is the three-member §10.2 enum, and `EvidenceItem` has no `directness`/`extraction_*` columns. Claim payload naming follows `docs/canonical/14` §14.1. **No ADR was needed** — nothing deviates from a canonical specification.
- **D-009 → Option A.** A minimal synchronous `research_runs` table was created, so `created_by_run_id` is NOT NULL on `evidence_items` and `claims` exactly as canonical specifies, with no lineage gap. `prompt_manifest` and `model_manifest` are stored as **empty JSON objects** because no prompt and no model exist at M1 — genuinely inapplicable, not merely unrecorded. An integration test asserts they are `{}`.

### What exists now

| Path | What it is |
|---|---|
| `packages/db/migrations/0004_truth_layer.ts` | 10 enums + 6 tables: `research_runs`, `evidence_items`, `claims`, `claim_evidence`, `confidence_assessments`, `citations` |
| `packages/truth/src/derive.ts` | The derivation service and its typed invariant error |
| `packages/truth/src/confidence.ts` | `docs/canonical/14` §29's four provisos as predicates; `evidence_set_hash` |
| `packages/truth/src/rights.ts` | Surface eligibility from `docs/canonical/12` §6.3/§6.4 |
| `packages/truth/src/result.ts` | The developer-facing projection types |
| `packages/truth/bin/surname-profile.ts` | Demo CLI (`pnpm demo:surname -- "NOWAK"`) |
| `packages/truth/src/*.test.ts` | 32 new unit tests |
| `tests/integration/src/truth-chain.test.ts` | 31 new integration tests |

Modified: `packages/db/src/migrator.test.ts` and `tests/integration/src/extensions.test.ts` (schema-inventory assertions every schema-adding task updates); `tests/integration/src/pesel-ingestion.test.ts` (one TASK-004 assertion was reframed — it asserted the truth tables did not *exist*, which stopped being meaningful once `0004` created them; it now asserts the importer writes **no rows** into them, which is the real invariant and still holds); `packages/db/src/generated/db.ts` (regenerated); root `package.json` (`demo:surname` alias); `tests/integration/package.json`; `pnpm-lock.yaml` (workspace links only — no dependency added or upgraded).

### Design points worth recording

- **One claim per snapshot, never a sum.** A surname in both PESEL resources gets two claims with their own counts and comparability groups. Verified with `NOWAK`: 98,387 and 99,738, reported separately. A test asserts no result field equals their sum.
- **No `unit` is stored.** The publisher says *"liczba wystąpień"* (occurrences), not people (U-4). The claim payload carries `source_population_scope` with the publisher's verbatim Polish instead. A test asserts the stored payload contains neither `"unit"` nor `"PEOPLE"`. This is what D-010 settled for the presentation boundary — ***resolved 2026-09-19 by ADR-0004***, which gives the DTO `SURNAME_OCCURRENCES`. TASK-005's storage is unaffected: the unit is a contract-boundary concept, not a claim-payload one.
- **Confidence and rights cannot reach each other.** They are separate modules; neither imports the other, and `ConfidenceInputs` has no field through which a rights value could arrive. An integration test re-derives under a fully permissive rights profile and asserts the confidence is byte-identical while all four surfaces open up. (An earlier version of that test compared against a `PROHIBITED` profile and was **vacuous** — `PROHIBITED` and `UNKNOWN` map to the same decisions. The comparison was corrected to a permissive profile, which is also the harder direction of invariant 2.)
- **U-5 recorded:** `EXACT` only. `KNOWN_VARIANT` is excluded, because no `NameForm` variant links exist in production data, so a permissive path could not be tested against anything real.
- **U-7 recorded:** resolution runs as a read pass before the write transaction; the resolver's `READ ONLY` guarantee is untouched.

### Verification actually run (2026-09-19)

| Command | Result |
|---|---|
| `pnpm typecheck` | **PASS** — 11 of 11 packages |
| `pnpm lint` | **PASS** — zero errors, zero warnings |
| `pnpm format:check` | **PASS**, after Prettier reformatted the manifest. The first run **failed** on `fixtures/pesel/source-manifest.json` because this session wrote it with Python's JSON serialiser; `npx prettier --write` on that one file fixed it and the values were re-checked unchanged afterwards. |
| `pnpm test` | **PASS** — **164 tests** (132 before; +32 in `packages/truth`) |
| `pnpm db:migrate` | **PASS** — `0004_truth_layer` applied; re-run reports `no pending migrations` |
| `pnpm db:generate-types` | **PASS** — regenerated file byte-identical to the committed one (`cmp`) |
| `pnpm test:integration` | **PASS** — **91 tests** (60 before; +31 in `truth-chain.test.ts`), exit code 0 |
| `pnpm build` | **PASS** |
| Forbidden-logic grep over new code | Only a comment and the canonical `ALGORITHMIC_SIMILARITY` enum member (a value from `docs/canonical/11` §9.5, no logic) |
| Module-boundary greps | `confidence.ts` does not import `rights.js`; `rights.ts` does not import `confidence.js`; the CLI contains no SQL; derivation contains no `insertInto`/`updateTable` against any source or identity table |
| `git status --porcelain` on read-only dirs | Unchanged |

**Regression:** TASK-003 resolver tests (55 unit, 24 integration) and TASK-004 ingestion tests (37 unit, 32 integration) all pass. Two TASK-004 integration assertions were updated as described above; no behaviour changed.

**End-to-end demo against a live database**, after importing both committed fixtures:

```text
input "NOWAK" → EXACT → 2 claims
  male   98,387  2026-01-20  pesel_2026_national_male    VERIFIED
  female 99,738  2026-01-20  pesel_2026_national_female  VERIFIED
  citation: Nazwiska występujące w rejestrze PESEL · Ministerstwo Cyfryzacji · CC0 1.0
            resource:1148808 / resource:1148811
  surfaces: INTERNAL ALLOWED · FREE CONDITIONAL · PAID BLOCKED · SEO BLOCKED
```

Idempotency observed directly: row counts across all six truth tables were `2/2/2/2/2/2` after the first derivation and unchanged after two further runs (including a case-variant input). `Nieistniejące` → `UNRESOLVED`, no claim, no zero. `WISNIEWSKI` → `UNRESOLVED`; `WIŚNIEWSKI` → `EXACT`, 53,079.

### Not verified in this environment

The integration suite ran against a **locally installed PostgreSQL 16.13 + PostGIS 3.4.2** via the `TEST_DATABASE_URL` fallback, as in TASK-001 through TASK-004. The pinned `postgis/postgis:16-3.4@sha256:44126d87…` image was **not** exercised here — container registries remain egress-blocked. CI runs it.

### Carried forward

- **D-010** — **RESOLVED 2026-09-19** by `docs/adr/0004-population-value-unit.md`: the unit enum is widened and PESEL-derived responses carry `SURNAME_OCCURRENCES`, not `"PEOPLE"`. TASK-006 is unblocked. The underlying source question (U-4) is still open — `"PEOPLE"` stays in the enum as the value PESEL switches to if the publisher confirms it, which is a change of emitted value rather than of schema.
- **TASK-004 §14 U-1 and U-4** — still unanswered by the publisher. U-1 is contained structurally (separate comparability groups); U-4 is contained by storing no unit.
- **D-007** — resource-level licence unconfirmed, so `commercial_use = UNKNOWN` keeps paid and SEO surfaces blocked. Observed in the demo output above.

## TASK-006 implemented — surname result read API (2026-09-19)

Scope authority: `tasks/006-surname-result-read-api.md`. One bounded capability: an exact surname query returns a stable, typed, rights-aware result carrying `CURRENT_POPULATION`, produced entirely by the TASK-003 → TASK-005 pipeline. First slice of M2.

### What exists now

| Path | What it is |
|---|---|
| `packages/contracts/src/surname-result.ts` | Zod 4 schemas + inferred types: request, response, error envelope |
| `packages/truth/src/read.ts` | **Read-only** lookup of already-derived claims |
| `packages/truth/src/query.ts` | The application query service |
| `apps/web/src/app/api/v1/surname-results/route.ts` | Thin BFF handler — no SQL, no business logic |
| `docs/contracts/surname-result.md` | **The repository's first accepted contract** |
| tests | 25 contract, 4 route-shape, 22 integration |

Modified: `packages/contracts/package.json` (adds `zod@4.6.5`), `apps/web/{package.json,next.config.ts}`, `tests/integration/{package.json,tsconfig.json}`, both index files, `pnpm-lock.yaml` (workspace links + zod; nothing upgraded). **No migration.**

### Implementer choices recorded (TASK-006 §15)

- **U-1 → extend `packages/truth`.** One fewer package; the truth service already exposed a clean result object.
- **U-2 → omit `canonical_slug`/`canonical_path`.** No slug exists, and Polish slug transliteration is a real decision that must not be confused with the identity-bearing diacritics of `ARCHITECTURE.md` §10 invariant 8. This slice ships no browser route or SEO surface to consume them. Recorded as a deviation in the contract document.
- **U-3 → read-only path, confirmed necessary.** `deriveCurrentPopulation` performs six inserts, so a read must not reach it. `read.ts` exists for exactly this; a test asserts no import of or call to derivation from the read path, and an integration test asserts all fourteen tables are unchanged across a batch of reads including miss and error paths.
- **U-4 → `400` for invalid input**, successful states for valid-but-unresolved.
- **Surface handling:** `ALLOWED` and `CONDITIONAL` surface the values; `BLOCKED` omits them from the payload entirely rather than sending them flagged (`docs/canonical/16` §55).

### Two things worth recording

**One deviation, in the contract document.** The unit is `SURNAME_OCCURRENCES` per ADR-0004, not `docs/canonical/16` §26's literal `"PEOPLE"`. A test asserts `"PEOPLE"` appears nowhere in a PESEL-derived response.

**The build needed fixing, and the fix is a workaround.** `apps/web` previously had no workspace dependencies. Once it consumed them, `next build` failed on ten unresolved imports: the packages are consumed as TypeScript source and use `.js`-extension specifiers (the repo's NodeNext convention), which **Turbopack cannot resolve and has no option to**. The webpack builder can, via `resolve.extensionAlias`, so `apps/web` now pins `--webpack` for `dev` and `build`, with the reason in `next.config.ts`. **This should be revisited**: the cleaner long-term fix is compiling the workspace packages to `dist`, which is a repo-wide change and was not TASK-006's to make.

### Verification actually run (2026-09-19)

| Command | Result |
|---|---|
| `pnpm typecheck` | **PASS** — 11 packages |
| `pnpm lint` | **PASS** |
| `pnpm format:check` | **PASS** |
| `pnpm test` | **PASS** — **193 tests** (164 before; +25 contract, +4 route-shape) |
| `pnpm test:integration` | **PASS** — **113 tests** (91 before; +22), including 3 through the real route handler |
| `pnpm build` | **PASS** (webpack builder — see above) |
| `pnpm db:migrate` | **PASS** — `no pending migrations`; this task adds none |
| `pnpm db:generate-types` | **PASS** — byte-identical (`cmp`) |
| Boundary greps | Route handler holds no SQL and no resolver import; read path contains no `insertInto`/`updateTable`/`deleteFrom`; derivation is neither imported nor called from the read path |
| `git status --porcelain` on read-only dirs | Unchanged |

**Regression:** TASK-003, TASK-004 and TASK-005 suites all pass unchanged. No existing test was modified.

**Read-path behaviour observed** (integration, over genuinely ingested and derived fixture data): a surname in both PESEL resources returns two observations in different comparability groups with no total anywhere in the payload; `WIŚNIEWSKI` resolves while `WISNIEWSKI` returns `UNRESOLVED`; a resolved surname with no derived evidence returns `UNAVAILABLE`/`NO_APPLICABLE_EVIDENCE` and no zero; the `PAID` surface returns `RIGHTS_BLOCKED` with the value absent from the serialized body; confidence is identical across surfaces while surface decisions differ; the persisted assessment `rationale` never appears in a response.

### Not verified in this environment

Integration tests ran against a **locally installed PostgreSQL 16.13 + PostGIS 3.4.2** via the `TEST_DATABASE_URL` fallback, as in every task so far. The pinned container image was not exercised here — registries remain egress-blocked. CI runs it.

### Carried forward

- **Turbopack/`--webpack`** — a build workaround, not a decision. Compiling workspace packages to `dist` would remove it.
- **Caching is `no-store`.** `docs/canonical/16` §84/§87's ETag and cache-by-version policy belongs to whichever task first needs it.
- **D-007** still gates paid surfaces, which is why `PAID` is `BLOCKED` in every observed response. **U-4** (the source unit) still open; ADR-0004 makes the contract honest about it rather than answering it.

## Next action

TASK-001 through TASK-004 are implemented and verified. One flagged deviation still awaits the project owner's acknowledgement: the `TemporalExtent` columns on `name_forms` were omitted alongside the two omissions TASK-003 §6.2 named; adding them later is a nullable-column migration.

TASK-005 (`CURRENT_POPULATION` truth chain) is now **specified** — see the section below — and **is blocked on four answers**: D-008 and D-009 in `docs/DECISIONS_NEEDED.md` before its migration can be written, and TASK-004 §14 U-1 and U-4 from the publisher before any claim is phrased as a statement about people.

TASK-001 through TASK-005 are implemented and verified. M1's vertical slice is complete: a real surname goes from raw input through exact resolution, ingested PESEL evidence, a typed claim, confidence, citation and rights evaluation to a deterministic developer-facing result.

TASK-001 through TASK-006 are implemented and verified. M1 is complete and M2 has begun: a caller can now query an exact surname over HTTP and receive a rights-aware, evidence-backed `CURRENT_POPULATION` result with its snapshot date, confidence and citation.

The rest of M2 has no task file yet: `CURRENT_RANK` and `RARITY_CONTEXT` (the first derived claims — note `RARITY_CONTEXT` needs the denominator TASK-004 left as U-6 with `universe_size` null), `pg_trgm` candidate generation with tier-safe ranking, gender forms, the free result UI, a read-only inspector, and logging/tracing.

**Four decisions remain open, none of them blocking current work:** D-002 (onomastics rights, blocks M2 meaning), D-003 (Polona rights, blocks M3), D-004 (regional map framing, blocks M2 geography), D-007 (PESEL resource-level licence, blocks M5/M6 paid surfaces). All four need an external party or a commercial judgement, not an engineering decision. D-007's publisher enquiry would also answer TASK-004 §14 U-4 and let the DTO move to `"PEOPLE"`.

Per AGENTS.md §8: **STOP.** No TASK-006 code was written, TASK-007 was not started, and no `tasks/007-*.md` exists.

## TASK-004 specified — planning only, no code written (2026-09-19)

`tasks/004-pesel-surname-ingestion.md` specifies one bounded capability: deterministic, idempotent, provenance-carrying ingestion of the pinned official PESEL national surname resources into the canonical data layer, stopping before any claim, confidence or citation (those are TASK-005).

Observed state, verified against the working tree this session and not assumed:

- **No TASK-004 code exists.** No importer, no source registry, no migration `0003`, no `sources`/`rights_profiles`/`source_records`/`distribution_snapshots`/`distribution_values` table. `packages/sources` still contains only TASK-002's schema/decoder/parser.
- **The spec's stated preconditions were re-verified**, not taken on trust: `@name-atlas/sources` exports `decodePeselBytes`, `parsePeselFile`, `PeselSchemaError`, `PESEL_MIN_VALID_COUNT = 2`; `@name-atlas/resolver` exports `canonicalKey`, `NORMALIZATION_VERSION` (= `CANONICAL_KEY_VERSION` = `canonical_key_v1`), `resolveSurname`, `detectScripts`; resolver outcomes are `EXACT | KNOWN_VARIANT | MULTIPLE_EXACT | UNKNOWN | REVIEW_REQUIRED` plus a separate `LOOKUP_FAILED` kind; `resolveSurname` runs under `setAccessMode("read only")`; migration `0002_identity_core` creates `knowledge_entities`, `surnames` (`canonical_key` UNIQUE), `name_forms` and the `resolvable_name_forms` view; `fixtures/pesel/source-manifest.json` carries the dataset, national-pair and `regional_resources_not_ingested` records the spec cites. No claim in the task file was found unsupported.
- **A duplicate draft was removed.** `tasks/004-pesel-ingestion-source-rights.md` (an earlier, narrower second draft that labelled itself non-authoritative) was deleted so that `tasks/` holds exactly one TASK-004 scope authority, per AGENTS.md §3. It remains in git history at commit `a528773`. Its one substantive contribution not already present in the authority — the `SourceRecord` granularity decision — was **not** carried over as a decision, because it turned out not to be a decision this project may make silently (next item).
- **A contradiction between two canonical documents was found and recorded, not resolved.** `docs/canonical/12` §3.1/§9.2 specifies a resource-version-scoped `BULK_DATASET` import, while `docs/canonical/11` §37.2's worked example is row-scoped, and `docs/canonical/11`'s index specification mandates `UNIQUE source_records(source_id, external_record_id) WHERE external_record_id IS NOT NULL` — which the resource-version reading collides with as soon as supersession creates a second version. Recorded as **D-006** in `docs/DECISIONS_NEEDED.md` and as §14 U-8 in the task file. The earlier draft of the task file had asserted a different uniqueness key (`(source_id, external_record_id, content_hash)`) with no flag; that silent deviation is now marked as such.

**Nothing was verified by running.** No command was executed this session beyond read-only inspection (`git`, `grep`, `sed`, `python3` over repository files). Dependencies are not installed in this environment (`node_modules` absent), so `pnpm test`, `pnpm typecheck` and the integration suite were **not** run — the 95 unit / 28 integration counts cited in the task file's §13 are carried forward from the TASK-003 verification run recorded above, not re-observed.

**No decision now blocks the start of TASK-004.** U-4 to U-7 are implementer choices to be recorded during implementation.

## TASK-004 §14 U-1, U-2, U-3 answered by the project owner (2026-09-19)

Answered on the project owner's instruction ("answer U-1, U-2 and U-3 so TASK-004 can start"). Full text of each answer is in `tasks/004-pesel-surname-ingestion.md` §14; the decisions are binding on the implementer. Summary of what was decided and — equally important — what was **not**:

- **U-1 (male/female split).** Decided: do not decide the semantics. Carry the publisher's verbatim Polish `universe_description`, use a `methodology_key` that names the resource without asserting a basis, state the ambiguity in `coverage_notes`, and give the two partitions **different `comparability_group` values** so `docs/canonical/11` §6.1's comparability rule mechanically forbids summing them. **Not decided:** what the split actually means. That fact is still unknown, still requires the publisher, and remains a precondition of TASK-005 alongside U-4.
- **U-2 (resource-level licence / `RightsProfile`).** Decided: a full field-by-field seed, every value traceable to evidence or honestly `UNKNOWN`, verified against the real field list and enum members in `docs/canonical/11` §9.4. Key values: `automated_access = ALLOWED`, `commercial_use = UNKNOWN`, `redistribution = UNKNOWN`, `review_status = LEGAL_REVIEW_REQUIRED`, `attribution_required = false`, `terms_version = CC0 1.0`. This unblocks ingestion (the only hard gate is `automated_access == PROHIBITED`) while `commercial_use = UNKNOWN` keeps `evidence.paid_surface_eligible = false` by `docs/canonical/12` §6.4. **Not decided:** whether the resources actually inherit the dataset's CC0 dedication. No legal review was performed and none is claimed. Carried forward as **D-007**, which blocks M5/M6.
- **U-3 (raw bytes not stored).** Decided: accept the deviation from `docs/canonical/12` §9.2 and record it rather than fake it — `raw_text_ref` null with a stated reason, bytes identified by `content_hash` + `source_url` + `raw_payload`, object storage carried forward as an M0-infrastructure obligation. **Condition:** the project owner retains the acquired bytes outside the repository (checksums in `docs/sources/acquisition/2026-09-18/SHA256SUMS.txt`); if those are lost the import becomes unreproducible and that is a finding to raise.

**Verified before writing these answers, not assumed:** the `RightsProfile` field list and the `RightsPermission` / `CachePermission` / `RightsReviewStatus` enum members (`docs/canonical/11` §9.4); the `DistributionSnapshot` field list including `comparability_group` and its stated meaning (§6.1); the hard gates in `docs/canonical/12` §6.4; and the publisher's verbatim resource titles and descriptions, read from the captured metadata under `docs/sources/acquisition/2026-09-18/metadata/`. The same check reconfirmed that resource-level metadata carries no licence attribute.

**Still not run:** no test, typecheck or build was executed in this session; dependencies are not installed here.

## TASK-004 U-8 closed by ADR-0003 (2026-09-19)

The contradiction recorded as D-006 was put to the project owner with three options and their costs, and resolved: **one `SourceRecord` per resource version**, `external_record_id` kept as the publisher's bare resource id (`1148808`), `record_type = API_OBJECT`, `raw_payload` holding the resource-metadata object, and the uniqueness key relaxed to `(source_id, external_record_id, content_hash)`.

- Written up as `docs/adr/0003-source-record-granularity.md` (Accepted), including the two rejected alternatives — encoding a version discriminator into `external_record_id`, and row granularity (~828k records per full import) — and the conditions for revisiting.
- This is a **deliberate deviation** from `docs/canonical/11`'s `UNIQUE source_records(source_id, external_record_id)` index line, which cannot coexist with the supersession requirement in `docs/canonical/12` §9.3 and `ARCHITECTURE.md` §10 invariant 6. Per `AGENTS.md` §2 the contradiction was superseded by an ADR rather than settled in code; the migration must carry a comment pointing at it.
- D-006 is marked RESOLVED in `docs/DECISIONS_NEEDED.md`, pointing at the ADR. `tasks/004-pesel-surname-ingestion.md` AC-06, AC-22 and §9 invariant 7 are now written in concrete, testable form.

`docs/canonical/` remains untouched — the deviation lives in the ADR, not in the read-only corpus.

## `CURRENT_DISTRIBUTION` preflight — TASK-008 NOT ACTIONABLE, no task file written (2026-09-19)

A read-only preflight was run for a requested TASK-008 (`CURRENT_DISTRIBUTION` truth chain). It
found the capability not actionable from current repository evidence and **created no task
file**, as the request required in that case. No code, migration, fixture, dependency or test
was touched. Full record: `docs/sources/pesel-regional.md`.

### Verdict, with the evidence

- **No approved production source contains geographic surname distribution.** The approved
  ingestion target is the national pair `1148808`/`1148811`: two columns
  (`PESEL_HEADER = "Nazwisko aktualne,Liczba"`, `PESEL_COLUMN_COUNT = 2` in
  `packages/sources/src/schema.ts`), portal `regions = Polska`.
- **A current regional candidate exists and is explicitly unadopted.** Resources `1148786`
  (male) / `1148790` (female) on dataset `1681`, `data_date = 2026-01-20`, header
  `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba`, voivodeship granularity
  only. Gated by D-004; resource-level licence unconfirmed; `PRODUCT.md` §10 unchanged.
- **The candidate carries no geographic identifier** — a voivodeship name string, no TERYT code,
  no ISO 3166-2. Canonical requires `Place` + `EntityExternalId` (`docs/canonical/11` §6.2,
  §20.3, §32; `12` §11).
- **No canonical geography exists to reference.** `packages/db/src/generated/db.ts` lists no
  `places`, `place_names`, `administrative_memberships` or `entity_external_ids` on any branch
  (`GeographyColumns`, `GeometryColumns`, `SpatialRefSys` are PostGIS side tables). No TERYT
  connector; TERC/SIMC exist only in the project owner's archive, not ingested or rights-recorded.
- **Suppression grain, zero rows, the distinct geography value set and reconciliation with
  national totals are all unverified** — no session has read the regional bytes in this
  repository.
- **TASK-004 does not ingest geographic data**: `geography_level = 'NATIONAL'` and
  `place_id = null` for every row, regional ingestion explicitly out of scope, and the parser
  fails closed on the three-column shape.

### Repository state found, and why it matters

The working tree of this branch (`claude/elegant-archimedes-w5ony1`) carries TASK-001–003
implemented and TASK-004 **specified only**. The task files the request named as preconditions
are on sibling branches, all forked from `a528773`:

- `origin/claude/sharp-bohr-ld17v3` — TASK-004, TASK-005 (`CURRENT_POPULATION` truth chain,
  migration `0004`, `packages/truth`) and TASK-006 (read API, first accepted contract)
  implemented and verified; ADR-0003 and ADR-0004; D-008/D-009/D-010 resolved. Still no
  geography: every `place_id` null, every snapshot `NATIONAL`.
- `origin/claude/inspiring-johnson-x88mbo` — an independently produced regional source record
  with the same verdict, plus `tasks/007-pesel-regional-source-spike.md`, specified and not
  executed.

So the Truth Layer a distribution chain must extend **does not exist on this branch at all**.
There is also no task, on any branch, concerning workspace-package build compatibility; number
007 is taken by the regional spike. The nearest real item is TASK-006's carried-forward note that
`apps/web` pins `next build --webpack` because Turbopack cannot resolve the workspace packages'
`.js`-extension specifiers. That is separable work, not a distribution prerequisite, and is not
specified here.

### Prerequisites, in dependency order

1. D-004 adoption decision (project owner).
2. Resource-level rights confirmation with the publisher (D-004, D-007; also answers U-4).
3. TASK-004 implemented on the branch that will carry the work.
4. TASK-005 Truth Layer implemented on that same branch.
5. **Smallest next step — a regional source spike:** verify the bytes, the distinct geography
   value set, the suppression grain, zero rows, the surname-set relation and the observed
   reconciliation against national counts, and record a TERYT TERC correspondence as evidence.
   Proposed in `docs/sources/pesel-regional.md`; an equivalent specification already exists on
   `origin/claude/inspiring-johnson-x88mbo` and should be reconciled rather than forked.
6. Voivodeship `Place` foundation with TERYT external IDs — currently M3, so pulling it forward
   is a sequencing decision for the project owner.
7. Regional ingestion (three-column schema, fail-closed validator, `geography_level = 'REGION'`).
8. Only then the `CURRENT_DISTRIBUTION` truth chain.

### Verification actually run

No test, typecheck, lint or build was run, because no code changed. This session ran read-only
inspection over repository files and `git` history only. Changes are documentation: this entry,
`docs/sources/pesel-regional.md` (new), a findings-only subsection under D-004 in
`docs/DECISIONS_NEEDED.md`, and one `docs/CODEMAP.md` row. `docs/canonical/`, `docs/library/`,
`docs/archive/`, `docs/reference/`, `docs/review/` and `prompts/` are untouched.

No `tasks/008-*.md` was created by the preflight itself, TASK-009 was not begun, and nothing was
implemented.

## TASK-008 specified — PESEL regional source spike, planning only (2026-09-19)

Created later in the same session, at the project owner's request, as the preflight's first
prerequisite: `tasks/008-pesel-regional-source-spike.md`. It is the regional source spike, **not**
a distribution truth chain. Planning only — no code, no schema, no database, no fixture yet.

One bounded outcome: establish from the actual bytes of resources `1148786` and `1148790`, and
with a small real fixture, exactly what they contain — the distinct geography value set, the
suppression grain, whether zero rows exist, the surname-set relation to the national resources,
the observed reconciliation between regional sums and national counts, and a TERYT TERC
correspondence recorded as evidence. It adopts nothing, ingests nothing and decides nothing;
D-004 stays with the project owner.

The task pattern is TASK-002 applied to the regional pair, and it mirrors that record's
"File-level facts" structure. It depends on TASK-002 alone and is independent of TASK-003 through
TASK-006, because it writes no application code and touches no database.

Established by direct inspection while writing it, not assumed:

- **The national baseline is exact and already committed.** Manifest: `1148808` checksum
  `ce4238fe…62f4`, 5,293,415 B, 408,182 data rows; `1148811` checksum `c508680d…f6e6`,
  5,592,881 B, 420,082 data rows; `file_structure` records the verified two-column shape, CRLF
  throughout with a trailing terminator, no BOM, descending sort by `Liczba`, and no row with
  `Liczba ≤ 1`.
- **The committed national fixtures carry real full-resource counts**, so per-surname
  reconciliation for the surnames they contain is population-valid without the full national
  files. Verified directly: the male fixture has 22 data rows, SHA-256 `426f44a2…2448`, with
  `NOWAK,98387`, `WIŚNIEWSKI,53079`, `NGUYỄN,3730`, `MÜLLER,1462`, and the artefact rows
  `DOG̈AN,5`, `W/SILASSIE,3`, `A/GADIR,2`. The female fixture has 23 data rows, SHA-256
  `72ff8dfa…eea8`, with `NOWAK,99738`, `WIŚNIEWSKA,54177`, `NGUYỄN,2132`, `MÜLLER,1874`,
  `SCHA̋FER,4`, `W/RUFAEL,2`, and `SCHIED ,2` retaining its real trailing space. Both files end
  `0d 0a`. A fixture's own checksum is not the resource's, and the task keeps the two separate.
- **The TERC data identity is recorded but the file is not here.**
  `teryt_terc__1cfbb50ebf97.zip`, SHA-256 `1cfbb50e…2768`, 132,136 B per `SHA256SUMS.txt`; it
  lives in the project owner's archive. `teryt_wmrodz` failed with `HTML_ERROR_PAGE_NOT_DATA`, so
  the task tells the implementing session not to expect it.
- **The acquisition tool's regional inspection is labelled as an external observation**, not a
  Name Atlas fact: 3 columns, 646,052 male / 694,553 female data rows, strict-UTF-8 compatible,
  null BOM, and five sample rows per file. The task requires each to be confirmed or corrected
  from the bytes.
- **The unit-test baseline on this branch is 95 tests across 9 packages, with 28 integration
  tests.** Since the spike changes no code, `pnpm test` must still report 95. The task states
  explicitly that `typecheck`, `lint`, `build` and `test:integration` are not required and must
  not be reported as run, and that `format:check` covers no file the task writes because
  `.prettierignore` excludes `*.md` and the acquisition metadata, and a `.csv` fixture is not a
  Prettier target.

**Numbering.** The project owner assigned 008. An equivalent specification exists on
`origin/claude/inspiring-johnson-x88mbo` as `tasks/007-pesel-regional-source-spike.md`, produced
independently on the same date; both files say to reconcile into one on merge rather than keep
both.

**Nothing was verified by running.** This session ran read-only inspection over repository files
and `git` history only. No test, typecheck or build was executed, and no TASK-008 code exists.

Per `AGENTS.md` §8: **STOP.** Regional ingestion was not begun, no `Place` foundation was built,
no `tasks/009-*.md` was written, and nothing was implemented.

## TASK-008 execution attempt — BLOCKED on source supply (2026-09-19)

Scope authority: `tasks/008-pesel-regional-source-spike.md`. Its §12 requires the environment
dependency be checked first and the blocker reported rather than worked around. The check failed.
Full record with every command and its output: `docs/sources/pesel-regional.md`, section
"TASK-008 execution attempt".

### The blocker, established by running

- **No source file on disk.** A depth-4 search of `/home/user`, `/root`, `/tmp`, `/mnt`, `/data`
  and the session scratchpad for `*pesel*`, `*nazwisk*`, `NAME_ATLAS_ALL_DOWNLOADED_DATA*` and
  `*teryt*`, excluding this repository's docs, fixtures and packages, returned only task files.
- **Egress is policy-blocked, not broken.** `getent hosts` resolves `api.dane.gov.pl` and
  `dane.gov.pl` to `185.41.93.178`; `curl` returns `curl: (56) CONNECT tunnel failed, response
  403`. The agent proxy's status endpoint records
  `kind: "connect_rejected"`, `detail: "gateway answered 403 to CONNECT (policy denial or upstream
  failure)"`, `host: "api.dane.gov.pl:443"`.
- **All four candidate hosts are blocked identically** — `HTTP 000`, CONNECT 403:
  `api.dane.gov.pl`, `dane.gov.pl`, `api.stat.gov.pl`, `eteryt.stat.gov.pl`. The last two close
  the GUS TERYT route, and the archive copy of `teryt_terc__1cfbb50ebf97.zip` is not on disk.

This reproduces what D-001 recorded for TASK-002. **To unblock: the project owner supplies the two
regional CSV files**, whose SHA-256 and byte size are verified against
`fixtures/pesel/source-manifest.json` before a single row is read.

### Completed anyway — the three acceptance items that do not need the bytes

- **Item 22, committed-metadata half — VERIFIED.** A recursive key scan of both regional resource
  objects for `licen[cs]|rights|terms|condition|copyright|reuse|attribution|waiver|cc0`, excluding
  the JSON:API container key, returns **NONE** across all 34 attribute keys of each, nested `files`
  and `supplements` included. Dataset level carries a bare `license_name = "CC0 1.0"` with
  `license_chosen = null` and every `license_condition_*` field empty, `false` or `null`. The
  publisher confirmation D-004 and D-007 require is still not reported, so the item's other half is
  unresolved and nothing was approved.
- **Item 20 — VERIFIED**, with three findings new to this repository. Each regional resource offers
  **three** representations, not one: XLSX native (openness 2), CSV (3) and JSON-LD (4), the last
  at 722,529,033 B male and 793,494,377 B female, roughly 44 times the CSV. **`special_signs` is
  `[]` on all four 2026 resources**, national and regional — the portal's in-band vocabulary for
  marking a suppressed or unavailable cell is declared nowhere, so a suppressed regional cell could
  only be represented by row absence; this is evidence about the metadata, not the bytes. And
  `contains_protected_data: false` sits among four sibling `false` classification flags, confirming
  it is a portal flag and not a legal review.
- **Item 21 — VERIFIED.** Both publisher descriptions recorded verbatim, with two asymmetries
  preserved rather than smoothed: the male text says `(bez zgonów)` and the female does not, and the
  male carries a trailing `<p>\xa0</p>`. TASK-004 §14 **U-1** stays open. No male-plus-female sum
  and no cross-file comparison appears anywhere in the record.

### One genuine result on the question the spike exists to answer

The dataset `notes` field is the whole of what the publisher says about suppression:
"Nazwiska z pojedynczą liczbą wystąpień oraz dane dot. osób zmarłych nie zostały uwzględnione w
zestawieniu." It is written once, at dataset level, for a dataset holding both national and
regional resources, and speaks of **surnames** excluded from the **compilation**. **It does not
address the per-(surname, voivodeship) cell grain at all.** So item 18's first half is now
verified — the publisher's wording cannot settle the per-cell question in either direction — while
the observed behaviour stays unresolved until the bytes are compared against the national counts.
Attributing either reading to the publisher would be the fabrication `AGENTS.md` §9 forbids.

Also recorded, since these are never inferred from one another: dataset `created`
`2019-08-13T07:16:07Z`, `modified` `2024-06-19T13:29:14Z`, `verified` `2026-01-28T13:48:39Z`,
`update_frequency` `Rocznie`. The dataset's `modified` stamp is **older** than the 2026 resources'
own timestamps.

### Acceptance-item outcome

Of the 27 items in §8: **3 verified** (20, 21, and the committed-metadata half of 22), **2
partially verified** (18's publisher-wording half, 19 as a stated rule), **1 done** (27, the record
itself), and **22 explicitly `UNRESOLVED`** with their reasons — items 1–17 and 23–26, all on
either missing source bytes or missing TERC data. Item 26 is unresolved by deliberate choice:
everything the task asks the manifest to carry is bytes-dependent, so the manifest was left
unedited for the next session to extend once, alongside the real file-level facts.

### Verification actually run

No test, typecheck, lint or build was run, because **no code changed**. `pnpm test` was not run:
`node_modules` is absent in this container and installing it would prove nothing about a
documentation-only change. The unit-test baseline stands where TASK-003 left it at 95 tests with 28
integration tests; nothing in this change can affect it. `.prettierignore` excludes `*.md` and
`docs/sources/acquisition/**/metadata/`, so `format:check` covers no file touched here.
`git status --porcelain` on `docs/canonical/`, `docs/library/`, `docs/archive/`,
`docs/reference/`, `docs/review/` and `prompts/` is empty, and `git diff --check` is clean.

### Not done, and why

No fixture was created or substituted. No TERC code was read or written. The manifest is unchanged
and its key stays `regional_resources_not_ingested`. `packages/sources` is untouched, so the
two-column parser still fails closed on a three-column file. No NOT VERIFIED row was promoted on
the strength of metadata: the regional header row remains the project owner's earlier observation
and the row counts remain the acquisition tool's. D-004's status, options and adoption gate are
unchanged.

**STOP.** Regional ingestion was not begun, no `Place` foundation was built, no
`CURRENT_DISTRIBUTION` work was started, and no `tasks/009-*.md` was written.

## Sibling branch consolidated — its TASK-007 spike superseded by TASK-008 (2026-09-19)

`origin/claude/inspiring-johnson-x88mbo` was merged into this branch. It had run the same
`CURRENT_DISTRIBUTION` preflight independently and reached the same verdict — not actionable — and
had specified the prerequisite spike as `tasks/007-pesel-regional-source-spike.md`.

What was done with it, and why:

- **Its `tasks/007-pesel-regional-source-spike.md` was deleted.** The project owner assigned the
  number 008 to this spike, and both files said to reconcile into one file on merge rather than
  keep both. `tasks/008-pesel-regional-source-spike.md` is the surviving scope authority. It is a
  superset: same goal, inputs and out-of-scope list, plus 27 acceptance items instead of 26, the
  verified national fixture digests and counts, the fixture-versus-resource checksum distinction,
  the note that `@name-atlas/sources` must keep failing closed on a three-column file, and the
  reasoning for why per-surname reconciliation against the committed fixtures is population-valid
  while the set-level questions are not.
- **Its parallel narrative of the preflight was not duplicated.** It described the pre-merge state
  of this branch — "TASK-004 specified, not implemented", "no migration `0003`", "no `005` or `006`
  file" — all of which stopped being true when the implementation branch was merged. The fuller
  record above stands, and `docs/sources/pesel-regional.md` carries the evidence.
- **Its `docs/sources/pesel-regional.md` was reconciled into this branch's copy**, which already
  covered the same fifteen questions and additionally carries the TASK-008 execution record. Two
  forward references unique to the sibling version were folded in: `docs/canonical/16` §70 on map
  layers carrying an explicit `layer_type`, and `17` §34 on the QA corpus requiring each geographic
  claim to carry a correct label, time scope, source type and coverage caveat.
- **Its `docs/DECISIONS_NEEDED.md` changes merged cleanly** and are retained.

Nothing from the sibling branch was discarded on the merits. Its findings were either already
present, folded in, or superseded by a later verified fact.


## Merged tree verified end to end (2026-09-19)

The three branches were consolidated onto `claude/elegant-archimedes-w5ony1` (two merge commits
above). No prior session had run anything against the **combined** tree, so the whole suite was run
here. Every figure below is observed output from this container, not inspection, and every figure
the sibling branches recorded is independently corroborated.

### Environment

PostgreSQL 16.13 with **PostGIS 3.4.2** was installed locally and a cluster started, so the
integration suite ran through the `TEST_DATABASE_URL` fallback. The PostGIS version matches what
D-005 pins. The pinned `postgis/postgis:16-3.4@sha256:44126d87…` **container image was still not
exercised** — container registries remain egress-blocked. CI runs it.

Recorded because it cost a cycle: the first `apt-get install postgresql-16-postgis-3` **exited 0
while actually failing**, with two dependency `.deb` files returning 404 against a stale package
index. `pg_available_extensions` then showed `pg_trgm` but no `postgis`. An `apt-get update`
followed by a reinstall fixed it. A zero exit status from that wrapper is not evidence the package
landed; check `pg_available_extensions`.

### Static checks and unit tests

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | **PASS** — lockfile unchanged |
| `pnpm typecheck` | **PASS** — all 11 packages |
| `pnpm lint` | **PASS** — zero errors, zero warnings |
| `pnpm format:check` | **PASS** — "All matched files use Prettier code style!" |
| `pnpm test` | **PASS** — **193 tests** across 10 packages |
| `pnpm build` | **PASS** — `apps/web` (webpack builder), `apps/admin`, `apps/worker`; routes `/`, `/_not-found`, `/api/health`, `/api/v1/surname-results` |

Per-package unit counts: `apps/admin` 1, `packages/db` 4, `packages/domain` 7,
`packages/contracts` 26, `apps/worker` 2, `packages/resolver` 55, `packages/testing` 3,
`packages/sources` 58, `packages/truth` 32, `apps/web` 5. The total of 193 matches exactly what the
implementation branch recorded for TASK-006.

### Database

| Command | Result |
|---|---|
| `pnpm db:migrate` | **PASS** — `0001_bootstrap_extensions`, `0002_identity_core`, `0003_source_rights_distribution`, `0004_truth_layer` all applied |
| `pnpm db:migrate` (re-run) | **PASS** — `no pending migrations` |
| `pnpm db:generate-types` | **PASS** — introspected 18 tables; regenerated file **byte-identical** to the committed one (`cmp`, and `git status` clean) |
| `pnpm test:integration` | **PASS** — **113 tests** across 5 files, 7.23s |

113 also matches the implementation branch's recorded figure exactly.

### End to end, against real ingested fixture data

Both committed fixtures imported through the production CLI, each pinned by its own SHA-256:

| Run | Observed |
|---|---|
| Import male `1148808` | `IMPORTED` — rows read 22, imported 22, quarantined 0, surnames created 22, snapshots 22, values 22 |
| Import female `1148811` | `IMPORTED` — rows read 23, imported 23, quarantined 0, surnames created 16, **reused 7**, snapshots 23, values 23 |

Resulting state: 2 `source_records`, 38 surnames, 38 name forms, 45 snapshots, 45 values. The 7
reused surnames reproduce the implementation branch's observation.

`pnpm demo:surname -- "NOWAK"` produced the full chain: two claims, never summed, at **98,387**
(male, `pesel_2026_national_male`) and **99,738** (female, `pesel_2026_national_female`), both
`snapshot_date 2026-01-20`, both confidence `VERIFIED` by `pesel_current_population_rule`
`confidence@1`, both citing *Nazwiska występujące w rejestrze PESEL* / Ministerstwo Cyfryzacji /
CC0 1.0 with locators `resource:1148808` and `resource:1148811`, and surfaces
`INTERNAL ALLOWED · FREE CONDITIONAL · PAID BLOCKED · SEO BLOCKED` — the last three all
`COMMERCIAL_USE_UNRESOLVED`, which is D-007 still open, visible in behaviour.

Identity behaviour: `WIŚNIEWSKI` → `EXACT`, one claim, 53,079. `WISNIEWSKI` → `UNKNOWN`,
`NO_RESULT (UNRESOLVED)`. `Nieistniejące` → `UNKNOWN`, `NO_RESULT`. No path produced a zero.

Idempotency observed directly: all six truth tables stood at `2/2/2/2/2/2` after the first
derivation and were **unchanged** after two further runs, the second with a lower-case input.

### Invariants queried against the real database

| Invariant | Observed |
|---|---|
| Claims with count 0, null or negative | 0 |
| Claims missing `snapshot_date` | 0 |
| Claims with no `SUPPORTS` evidence | 0 |
| Evidence whose subject differs from its claim's subject | 0 |
| `distribution_values` with a non-null `place_id` | 0 |
| Snapshots not `NATIONAL` | 0 |
| Duplicate `claim_key` among `ACTIVE` claims | 0 |

The last two matter for the distribution work: the merged tree still carries **no geography at
all**, which is what TASK-008 exists to unblock.

### The HTTP surface, over a real server

`next start` on the production build, against the live database. `GET /api/health` → `{"status":
"ok"}`. Then `GET /api/v1/surname-results`:

- `surname=NOWAK&surface=FREE` → `200`, `status RESOLVED`, `population.state READY`, two
  observations with `unit: "SURNAME_OCCURRENCES"` per ADR-0004, each carrying its snapshot date,
  its verbatim Polish `source_population_scope`, its comparability group, its coverage note
  (which states the partition is not summable and that absence is `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT`,
  never a confirmed zero), confidence and a full citation with attribution and terms.
- `surface=PAID` → `200`, `population.state RIGHTS_BLOCKED`, `reason_code
  COMMERCIAL_USE_UNRESOLVED`, `observations []`. The serialized body contains neither `98387` nor
  `99738`, nor the string `PEOPLE`, nor their sum `198125`. The value is **absent**, not sent and
  flagged.
- `surname=WISNIEWSKI` → `200`, `status UNRESOLVED`, `surname null`, `population null`. No zero
  anywhere in the body.
- `surname=` (empty) → `400`.

**The read path wrote nothing**, measured rather than assumed: a snapshot of eight table counts
taken before eight HTTP requests (three surfaces, a resolved surname, an unresolved one, a
diacritic one, an invalid one, a foreign-script one) was identical afterwards —
`3/3/3/3/3/3/38/45` both times.

### One correction to an earlier claim in this file

An earlier section of this record said `pnpm test` "was not run" during the TASK-008 attempt
because `node_modules` was absent and installing it "would prove nothing". The install in fact
works in this container — `registry.npmjs.org` is exempt from the egress policy — and the suite
runs in seconds. That reasoning was wrong, though the conclusion it defended was not: the TASK-008
attempt changed only Markdown, so no suite could have been affected. The tests are now run and
green on the merged tree, which supersedes the point.

### Still not verified here

The pinned PostGIS container image, as above. The regional PESEL bytes, which is TASK-008's
blocker and unchanged by any of this.

## TASK-008 executed — regional PESEL bytes verified (2026-09-19)

Scope authority: `tasks/008-pesel-regional-source-spike.md`. The project owner supplied the source
bytes, which was the blocker, and the spike ran. **23 of 27 acceptance items are verified from the
bytes; 4 remain open on two missing inputs.** Full record with every figure:
`docs/sources/pesel-regional.md`, section "TASK-008 executed". Findings are in D-004, whose status
and adoption gate are unchanged.

**Nothing was ingested.** No `Source`, `SourceRecord`, `RightsProfile`, `DistributionSnapshot` or
`DistributionValue` row was written, no `Place` exists, and `packages/sources` is untouched, so the
two-column parser still fails closed on these three-column files.

### The gate, passed before any row was read

Both regional files matched the manifest exactly: male `1148786` at
`0eb31d19955fbbb0a04c7693fb3e2515bc821515c31486851215f1482bee1b51` and 16,615,897 B, female
`1148790` at `cd0c100e9205cffef594a16129e65c4a8373b62c49dcbb5fd7ed3ae27f7b6989` and 17,900,370 B.
Both **full national** files were supplied and matched too, which made the reconciliation
population-wide rather than fixture-scoped. The 2025 regional pair was supplied and deliberately
**not read** — out of scope by §5.

### File-level facts, from the bytes

Both files: strict UTF-8 with zero invalid sequences, no BOM (first bytes `57 6f 6a`), comma
delimiter, **no quote character anywhere**, CRLF throughout with a trailing terminator, the header
byte-identical to the manifest's recorded value, exactly 3 fields on every row, zero malformed
rows, zero non-integer counts, and **zero duplicate (voivodeship, surname) pairs**. Sorted by
geography value, then descending by `Liczba` within each group.

Row counts **match the acquisition tool exactly**: 646,052 male and 694,553 female. So do its first
sample rows, `DOLNOŚLĄSKIE,NOWAK,5548` and `DOLNOŚLĄSKIE,NOWAK,5757`, now in the fixtures verbatim.

Distinct surnames: 188,413 male, 206,804 female. All values NFC. One combining-mark surname in the
male file (`GLA̋SSNER`), none in the female; slash surnames in both; **no edge-whitespace surname in
either**, unlike the national female file's real `SCHIED ` artefact.

### Geography: 16 values, no code, no other category

Both files carry **exactly the same 16 values**, every one an uppercase Polish voivodeship name with
no edge whitespace, and **no non-voivodeship category at all** — no "abroad", no "no registered
residence", no "unknown". Largest by rows: MAZOWIECKIE 71,545 male / 77,193 female; smallest:
ŚWIĘTOKRZYSKIE 19,181 / 20,689. Rows per surname: mean 3.43 / 3.36, median 2, max 16; present in
all 16 voivodeships 3,106 / 3,561; present in exactly one 86,044 / 99,050.

### Suppression is per cell — the question the preflight could not answer

`Liczba` never falls below **2** and **no row carries 0 or 1**, in either file. The publisher's
single-occurrence exclusion is therefore applied at the **(surname, voivodeship) cell** level, not
only to the national count. 19.7% of male rows and 21.6% of female rows sit exactly at that
boundary. Consequently **53.8% of national male surnames (219,769 of 408,182) and 50.8% of female
(213,278 of 420,082) have no regional row at all**, and a surname with 1,077 male or 1,183 female
bearers nationally can still be entirely absent regionally. An absent cell means zero, or one
suppressed bearer, or a bearer with no voivodeship value — never a confirmed zero.

The publisher's own text still does not state the grain; this is observed, and recorded as observed.

### Reconciliation: one supported invariant, and a residual suppression cannot explain

Matching was byte-identical on the raw surname field against the **same-sex** national file, with
no normalisation, no folding, no resolver, and never across sexes.

**The only source-supported invariant: `regional sum ≤ national count`, for every surname, zero
exceptions** — 0 of 188,413 male and 0 of 206,804 female exceeded it. Equality holds for 46,808 and
58,631 surnames respectively, roughly a quarter, so equality must never be asserted or enforced.
Zero regional surnames lack a national row.

| | Male | Female |
|---|---:|---:|
| National total over all surnames | 21,197,537 | 21,560,302 |
| Regional total over all cells | 16,590,111 | 17,296,363 |
| **Residual in no voivodeship row** | **4,607,426 (21.74%)** | **4,263,939 (19.78%)** |
| Upper bound explainable by per-cell suppression | 684,961 | 676,743 |

The bound follows from arithmetic: a surname in *k* of 16 voivodeships has 16 − *k* absent cells and
per-cell exclusion hides at most one bearer each. **The decisive case: all 3,106 male and 3,561
female surnames present in all 16 voivodeships, where suppression can hide nothing whatsoever, are
still short** — by 971,775 and 849,705 bearers, a median of 10.2% and 8.1% of national. `NOWAK` has
a row in every voivodeship and is short by 11,418 male, 10,353 female.

**A second mechanism exists and the publisher does not state what it is.** Recorded `UNRESOLVED`,
with candidates consistent with the field's own name (no permanent registration in Poland,
registration abroad, or a further undocumented exclusion) named as candidates only. Nothing asserted.

The residual is **systematically biased**: coverage rises from 78.6% for male surnames of 2–9
bearers to 89.3% above 10,000, and individual surnames diverge far more — `MELNYK` 6,442 national
against a regional sum of 210, `KOVALCHUK` 5,382 against 66, `SHEVCHENKO` 5,217 against 69, `BOIKO`
4,616 against 56, `NGUYỄN` 3,730 against 169, against `NOWAK` at 86,969 of 98,387. Any regional
surface built on this resource understates every region, unevenly, and worst for surnames of
recent-migration origin. That is a decision input for D-004, not a footnote.

### Deliverables committed

- `fixtures/pesel/regional-male-2026-01-20.csv` — 40 real rows, SHA-256 `3f38f91f…78b0`, 1,204 B.
- `fixtures/pesel/regional-female-2026-01-20.csv` — 38 real rows, SHA-256 `3eddbc5f…51bb`, 1,135 B.
- `fixtures/pesel/source-manifest.json` — each regional entry gains a `verified_from_bytes` block,
  plus a new `regional_reconciliation_against_national_2026` block. The key stays
  `regional_resources_not_ingested`, and the dataset, national-resource and `file_structure` blocks
  are **byte-identical to before**, checked by comparison.

Both fixtures carry the real header and CRLF convention, cover **all 16** geography values (asserted
before writing), and every data row was verified to appear byte-identically in its checksum-verified
source. The fixtures' `NOWAK` rows sum to 86,969 and 89,385 — equal to the full-file regional sums
and **not** equal to the national fixture values of 98,387 and 99,738, which is the finding, not a
defect. A fixture's digest is its own and is never the resource's.

### Still open, and on what

- **Items 23 and 24, and item 10 which depends on them: the TERYT TERC correspondence.** The
  geography column carries no administrative code of any kind, the TERC archive file was not
  supplied, and `api.stat.gov.pl` and `eteryt.stat.gov.pl` are egress-blocked. **No TERC code was
  read or written anywhere.** A voivodeship `Place` foundation stays unspecifiable until this
  closes; supplying `raw/polska_teryt/teryt_terc__1cfbb50ebf97.zip` closes it.
- **Half of item 22: the publisher's resource-level licence confirmation**, which is not this task's
  to close. D-004 and D-007 still hold it.

### Verification actually run

| Command | Result |
|---|---|
| `sha256sum` and `stat` on both regional and both national files, before reading rows | **PASS** — all four match the manifest |
| `python3 -c "import json; json.load(...)"` on the manifest | **PASS** — parses; national blocks unchanged |
| Fixture row byte-identity against the checksum-verified sources | **PASS** — every row of both fixtures |
| Geography coverage assertion before writing each fixture | **PASS** — all 16 values in both |
| `pnpm test` | **PASS** — **193 tests**, unchanged; this task altered no code |
| `pnpm format:check` | **PASS** |
| `git status --porcelain` on the read-only directories | **PASS** — empty |
| `git diff --check` | **PASS** |

`pnpm typecheck`, `pnpm lint`, `pnpm build` and `pnpm test:integration` were **not run and are not
claimed**: no code changed. The two new fixtures are `.csv`, which Prettier does not target.

## Foundation re-verified and an annual-series record added (2026-09-19)

Two loose ends closed while the project owner's supplied files were still on disk. Documentation
only: no code, migration, dependency or test changed, and nothing was ingested.

### The 2026 national facts re-verified against the full bytes

TASK-002 established the national file-level facts from bytes the project owner supplied at the
time; no later session had re-checked them. With the full resources on disk, **every fact recorded
in `docs/sources/pesel.md` and D-001 for resources `1148808` and `1148811` was independently
confirmed**: checksum, byte size, strict UTF-8 with no BOM, comma delimiter, no quote character,
CRLF with trailing terminator, exact header, 408,182 and 420,082 data rows, two fields on every row
with zero malformed, `Liczba` ranges of 2–98,387 and 2–99,738, zero rows at 0 or 1, descending sort
across the whole file, no duplicate surnames, all values NFC — and the **exact** recorded artefact
counts: 7 combining-mark rows male and 5 female, plus the single `SCHIED ` edge-whitespace row in
the female file. Nothing recorded was found wrong.

**The fixture-provenance claim is now proven rather than argued.** All 22 male and 23 female
committed fixture rows appear byte-identically in their full source files, and their headers match.
That is the premise TASK-008 §9 relied on when it argued per-surname reconciliation against the
fixtures is population-valid: the fixture counts are full-resource counts, not subtotals. It was an
argument before; it is an observation now.

### `docs/sources/pesel-annual-series.md` — new

Identity and shape facts for all 20 distinct files supplied: national 2019 through 2026 and
regional 2025 and 2026. **All 20 digests appear in the archive's committed `SHA256SUMS.txt`**, so
every file is an authentic archive copy. Deliberately not a year-over-year comparison: no count is
compared across years, no trend computed, no claim derived, nothing adopted or ingested.

Two findings make an annual refresh unsafe to assume, which is why the record exists:

- **The 2019 pair uses a different schema.** Its header is `nazwisko,liczba`; from 2020 onward it is
  `Nazwisko aktualne,Liczba`. The field is named `nazwisko`, **not** `nazwisko aktualne`. The
  project rests on the current-surname field, and the 2019 resources do not say they carry it.
  Whether the data is the same and only the label changed is not stated by the publisher and not
  inferable from the bytes. The committed parser was confirmed to reject the 2019 file with a typed
  `PeselSchemaError` naming both headers, which is correct and must not be relaxed.
- **Two resource ids carry byte-identical files.** National `35279` (labelled 2021 female) and
  `38772` (labelled 2022 female) share SHA-256 `9af26480ed30…62e0`, 4,141,803 bytes and 311,240
  rows, with `cmp` reporting no difference. The archive's `SHA256SUMS.txt` already listed the digest
  twice; both files confirm it. At least one year label is wrong, or the content was published twice,
  or the acquisition run fetched one resource for both — undecidable from the bytes, and unsafe to
  build a series on. The 2021 and 2022 male files differ normally, so the anomaly is confined to the
  female pair.

The record also notes that resource ids are not sequential by year and that the male id is sometimes
lower than the same year's female id, so **a resource id must never be derived from a year**, and it
lists what a refresh session must re-verify rather than assume.

D-001's "do not revisit unless" clause gains a pointer to it. **D-001 stays RESOLVED**; no status,
option or resolution changed.

### Verification actually run

| Command | Result |
|---|---|
| Re-verification of both 2026 national files against every recorded fact | **PASS** — all facts confirmed, artefact counts exact |
| Fixture row byte-identity against the full national sources | **PASS** — 22/22 and 23/23, headers identical |
| Digest match for all 20 supplied files against `SHA256SUMS.txt` | **PASS** — 20/20 |
| `cmp` on the two same-digest files | **confirmed byte-identical** |
| `pnpm format:check` | **PASS** |
| `git status --porcelain` on the read-only directories | **PASS** — empty |
| `git diff --check` | **PASS** |

`pnpm test`, `typecheck`, `lint`, `build` and the integration suite were **not run and are not
claimed**: no code changed, and the previous entry's run of the full suite stands.

## TASK-009 specified — `CURRENT_RANK` truth chain, planning only (2026-09-19)

`tasks/009-current-rank-truth-chain.md` specifies one bounded capability: the repository's **first
derived claim**. For a surname that resolves exactly and has ingested PESEL evidence, emit a
`CURRENT_RANK` claim carrying its universe definition, ties policy and algorithm version — and
refuse to emit anything when the universe is incomplete. Planning only: no code, no schema, no
migration written. **It is blocked on D-011**, recorded this session.

It takes `CURRENT_RANK` alone. `RARITY_CONTEXT` is deliberately excluded because it needs the
population denominator TASK-004 left as U-6 with `universe_size` null, and inventing one is
forbidden. Rank does not depend on the unit of `Liczba` either (U-4), which is part of why it comes
first.

### The finding that shaped the whole task

**A rank is meaningless unless its universe is complete, and the ingested universe is 0.005% of the
real one.** Established by querying the live database during the preflight, not assumed:

| | Resource `1148808` | Resource `1148811` |
|---|---|---|
| `source_records.content_hash` as stored | `426f44a2…be2448` | `72ff8dfa…feeea8` |
| Registry `official_sha256` | `ce4238fe…62b62f4` | `c508680d…909f6e6` |
| Snapshots for that record | **22** | **23** |
| Registry `official_row_count` | **408,182** | **420,082** |

What is ingested is the committed 22-row and 23-row fixture, so the stored `content_hash` is the
*fixture's* digest. A naive rank would assert "NOWAK is rank 1 of 22" in the language of a national
ranking. Worse, it would be **accidentally correct for the top fifteen**, because the fixtures were
selected as the top fifteen by count plus a tail — so it would survive a casual eyeball and be false
from rank 16 on. That breaches `PRODUCT.md` §7 rule 1 and `AGENTS.md` §9.

The task therefore makes the **completeness gate**, not the ranking arithmetic, its substance: a
pure predicate comparing the source record's `content_hash` against the registry's `official_sha256`
**and** the snapshot count against `official_row_count`, with no bypass, no flag and no environment
variable. An acceptance criterion requires a test proving the gate refuses over the committed
fixtures and writes zero rows.

### Other preflight facts, verified not assumed

- **`claim_type` carries exactly one member**, `CURRENT_POPULATION`. Migration `0004`'s own header
  anticipates this task: later types "arrive by `ALTER TYPE … ADD VALUE` … the same staging
  migration `0002` used for `entity_type`". So adding `CURRENT_RANK` is the sanctioned pattern and
  **not** a deviation needing an ADR.
- **The registry already carries the completeness facts** — `official_sha256`, `official_byte_size`
  and `official_row_count`, with the comment "NOT the committed fixture's checksum". No new source
  metadata is needed.
- **`evidence_scope` includes `SURNAME_LEVEL`**, so §11's scope allow-list is satisfiable.
- **`evidence_dependencies` does not exist**, which is what D-011 is about.
- **A rank universe cannot be "a snapshot".** `DistributionSnapshot` is surname-scoped
  (`ARCHITECTURE.md` §10 invariant 3), so one snapshot holds one surname. `docs/canonical/12` §9.6's
  "within a specific snapshot" cannot be read literally; the task fixes the universe as the set of
  snapshots sharing one `source_record_id`, which is one resource version and one comparability
  group.
- **There are two rank universes per annual refresh, not one.** Male and female sit in different
  comparability groups and U-1 forbids summing them, so **no all-Poland rank is derivable from this
  source at all.** The task forbids the payload implying one.

### D-011 recorded — a genuine canonical tension

**Does a derived claim need `EvidenceDependency`, or do `ClaimEvidence` links suffice?**
`docs/canonical/14` §30 specifies a derived statistic's lineage as
`EvidenceItem → EvidenceDependency → {count evidence, universe evidence, methodology/version}`.
`evidence_dependencies` does not exist, because TASK-005 excluded it on `docs/canonical/11` §9.6's
own hedge that it is "P1 if `ClaimEvidence` links are sufficient for the first vertical slice".

That hedge's condition has now expired: `CURRENT_POPULATION` had one input, while `CURRENT_RANK` has
two of **different kinds** — the subject's count and the universe — and `ClaimEvidence` cannot record
which input played which role. Three options, their costs and a recommendation (Option A, create the
table, since it needs no ADR and satisfies both canonical documents literally) are in
`docs/DECISIONS_NEEDED.md`. Per `AGENTS.md` §2 this is recorded rather than settled inside a
migration.

One implementer choice is left to record during the work: **U-1, the ties policy**, which
`docs/canonical/12` §9.6 requires be stored but does not fix. Competition ranking is recommended.

**Nothing was verified by running.** This session ran read-only inspection over repository files and
queries against the local database. No test, typecheck or build was executed, and no TASK-009 code
exists. `pnpm format:check` passes and the read-only directories are untouched.

## Build baseline investigated; D-012 recorded (2026-09-19)

The project owner's original framing named "workspace package build compatibility" as a
precondition; no task ever existed for it, and TASK-006 carried the `--webpack` pin forward as "a
build workaround, not a decision". This session investigated it **by running**, recorded the
options as D-012, and **changed no build configuration**, because the choice is the project owner's
and nothing is broken.

### Established by running, not by reading

1. **Turbopack genuinely cannot resolve the packages.** `next build --turbopack` fails
   `module-not-found` across `packages/truth/src/index.ts` and `packages/db/src/index.ts`.
   TASK-006's note is accurate, not stale.
2. **No Turbopack configuration fixes it.** Next 16.3.5 offers `turbopack.resolveAlias`, which maps
   bare module specifiers, and `turbopack.resolveExtensions`, which supplies extensions for
   *extensionless* imports. An explicit `./derive.js` request is neither case.
3. **A bare `next build` now fails on a guard, not on resolution.** Next 16 refuses to build when a
   `webpack` config is present and no `turbopack` config is. The scripts always pass `--webpack`, so
   only someone running the bare command is affected. Adding `turbopack: {}` would silence the guard
   and make Turbopack the default builder, at which point finding 1 applies — so it must not be done.
4. **The repo's stated reason for the `.js` extensions was wrong.** `next.config.ts` called them
   "the NodeNext convention the rest of the repo uses". `tsconfig.base.json` sets
   **`moduleResolution: "Bundler"`**, under which TypeScript does not require explicit extensions at
   all. The real value of the convention is that emitted JavaScript stays runnable by plain Node
   under `type: module`. **The comment has been corrected in place**, with the correction dated and
   the empirical findings and a pointer to D-012 added. No behaviour changed.
5. **Blast radius of changing the convention: 138 import statements across 50 files**, spanning all
   seven packages and all three apps.
6. **Nothing currently runs the emitted worker output.** `apps/worker` has `build: tsc` and
   `start: tsx src/index.ts`, so `dist/` is produced and never executed. It still matters: today
   that output *is* Node-runnable, and one of D-012's options would make it not.

### D-012 — recorded, not decided

Three options with costs and a recommendation. **Option A** compiles the packages to `dist`, which
fixes Turbopack and keeps emitted output portable, at the cost of a topological build step and care
that tests do not run against a stale build. **Option B** drops the `.js` extensions, which is the
smallest diff and is legal under `Bundler` resolution, but makes emitted JavaScript unrunnable by
plain Node — it is explicitly **not** recommended, being the cheapest to type and the only one that
invalidates a property that currently holds. **Option C** keeps `--webpack` and revisits on a
defined trigger.

**Recommended: C now, A when a trigger fires** — nothing is broken, `--webpack` is a supported
explicit flag, both alternatives give something real away, and M2 still has product capability
pending, so `AGENTS.md` §6's "no unrelated refactors" applies. The triggers are named in D-012:
Turbopack gaining extension aliasing, a package needing to be published, dev-loop speed becoming a
real complaint, or a second app consuming the packages.

### Verification actually run

| Command | Result |
|---|---|
| `next build --turbopack` in `apps/web` | **FAILS** as expected — `module-not-found`; this is the finding, not a regression |
| `next build` bare in `apps/web` | **FAILS** on the Next 16 webpack/turbopack guard — finding 3 |
| `pnpm typecheck` | **PASS** — all packages |
| `pnpm lint` | **PASS** |
| `pnpm format:check` | **PASS** |
| `pnpm build` | **PASS** — the documented `--webpack` path still builds all three apps and all four routes |

Only a code comment and two documentation files changed. No build configuration, no script, no
package manifest, no dependency. `pnpm test` and the integration suite were not re-run and are not
claimed; nothing touched can affect them, and the full green run earlier this session stands.

## CI fixed: generated-type verification no longer introspects PostGIS schemas (2026-09-19)

Every CI run this repository has ever produced failed, on every branch. The cause was found,
reproduced locally against a CI-shaped database, and fixed with a one-line change to one script.
The fix was developed on a parallel branch and is ported here; see the note below.

### The failure

`.github/workflows/ci.yml` step 12, **"Verify generated types are current"**, regenerates
`packages/db/src/generated/db.ts` against the service database and fails if `git diff --exit-code`
reports a change. Steps 13 and 14, the integration suite and the build, are `skipped` in
consequence, so **no CI run has ever executed the integration tests or the build**.

On this branch, CI runs 24, 25, 26, 29, 31, 32, 33, 34 and 37 — all nine — failed at that step. Run
37 (`a4eb308`) is the most recent: steps 1–11 `success`, step 12 `failure`, steps 13–14 `skipped`.

### Root cause, established by running

The CI service container is `postgis/postgis:16-3.4`, whose image entrypoint script `10_postgis.sh`
creates **`postgis_topology`, `fuzzystrmatch` and `postgis_tiger_geocoder`** in the template
databases, not just `postgis`. Those extensions install tables into the `tiger` and `topology`
schemas. `kysely-codegen` introspects every schema by default, so in CI it emits those tables as
well as ours. The committed file was generated against a local database that has only `postgis`, so
the two can never match.

Reproduced locally on two databases built from this branch's four migrations:

| Database | Extensions | Unrestricted codegen | With the fix |
|---|---|---|---|
| `na_elegant_ci` | postgis, postgis_topology, fuzzystrmatch, postgis_tiger_geocoder | **54 tables, 600-line diff** against the committed file | **18 tables, byte-identical**, `git status` clean |
| `na_elegant_plain` | postgis, pg_trgm | 18 tables, byte-identical | 18 tables, byte-identical |

Both repro databases were dropped afterwards.

### The fix

`packages/db/package.json`, `generate-types` gains `--include-pattern="public.*"`:

```
kysely-codegen --dialect=postgres --url="$DATABASE_URL" --include-pattern="public.*" --out-file=src/generated/db.ts
```

All application tables live in `public`, so this restricts introspection to what the repository owns
and makes the generated file independent of which extensions the host database happens to carry. No
workflow, migration, dependency or generated file changed. `packages/db/src/generated/db.ts` is
untouched and still matches byte for byte.

### Verification actually run, on this branch with the fix applied

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm db:generate-types` against `na_elegant_ci` | PASS — byte-identical to the committed file, `git status` clean |
| `pnpm db:generate-types` against `na_elegant_plain` | PASS — byte-identical |
| `pnpm typecheck` | PASS — 11 packages, 0 errors |
| `pnpm lint` | PASS — exit 0 |
| `pnpm format:check` | PASS |
| `pnpm test` | PASS — **193 unit tests** across 10 packages (admin 1, db 4, domain 7, contracts 26, worker 2, resolver 55, testing 3, sources 58, truth 32, web 5) |

`pnpm build` and the integration suite were not re-run in this worktree and are not claimed here;
nothing this change touches can affect them, and the full green run recorded earlier in this file
stands. Whether CI itself goes green is settled by the run on this commit, not by this note.

### Provenance: a parallel branch, now retired

Branch `claude/laughing-mccarthy-12i9h9` is a second implementation line that diverged from the
shared base `claude/exciting-noether-05np1s` at `a528773` and independently implemented the PESEL
ingestion and the `CURRENT_POPULATION` truth chain, with 301 unit and 118 integration tests. It
found and fixed the CI failure first; its run 35 is the first green CI run in this repository's
history, with the integration tests and the build actually executing.

**On the project owner's decision (2026-09-19), this branch is the line of record and
`claude/laughing-mccarthy-12i9h9` is retired.** Only the type-generation fix is carried across. The
two lines' schemas differ (their `0003` differs from this branch's by 109 of 126 lines, and their
`0004_truth_chain` is not this branch's `0004_truth_layer`), so no other code is portable without a
deliberate merge task.

Two things from the retired branch are worth porting as separate follow-ups, neither started here:

1. **Completeness-based absence classification.** A classifier that distinguishes `NOT_COVERED` (the
   partition was never researched or the record is an excerpt) from
   `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` (the source covers the partition and the surname is not
   in it) by comparing the stored `content_hash` against the registry's `official_sha256`. This is
   the same predicate TASK-009 §-preflight needs for its rank completeness gate.
2. **Rights-independence tests.** Property and boundary tests asserting that no rights value on any
   axis can change a confidence verdict or its reason codes, which is `ARCHITECTURE.md` §5–6 and
   ADR-0001 enforced by test rather than by convention.

## TASK-009 implemented — `CURRENT_RANK`, the first derived claim (2026-09-19)

Scope authority: `tasks/009-current-rank-truth-chain.md`. D-011 was answered **Option A**, so
`evidence_dependencies` exists and the lineage `docs/canonical/14` §30 specifies is implemented as
specified. **The completeness gate is implemented and verified. The gate's passing path is blocked
by D-013, discovered while trying to demonstrate it** — see below; the gate is refusing for exactly
the right reason.

### What exists now

| Path | What it is |
|---|---|
| `packages/db/migrations/0005_current_rank.ts` | `ALTER TYPE claim_type ADD VALUE 'CURRENT_RANK'`, plus `evidence_dependencies` and `evidence_dependency_role` |
| `packages/truth/src/completeness.ts` | The universe gate — pure, conjunctive, fail-closed, no bypass |
| `packages/truth/src/rank.ts` | Rank derivation with `EvidenceDependency` lineage |
| `packages/truth/src/confidence.ts` | `assessDerivedStatistic` added, for `docs/canonical/14` §30 |
| `packages/truth/src/result.ts` | `SurnameRankResult`, `CurrentRankClaimResult`, `RankUniverse` |
| `packages/truth/bin/surname-rank.ts` | CLI (`pnpm demo:surname-rank`) |
| `packages/truth/src/{completeness,rank}.test.ts` | 23 new unit tests |
| `tests/integration/src/current-rank.test.ts` | 18 new integration tests |

Modified: `packages/truth/src/{version,index}.ts`; `packages/db/src/generated/db.ts` (regenerated,
19 tables); root and truth `package.json` (the CLI alias); and the two schema-inventory assertions
every schema-adding task updates — `packages/db/src/migrator.test.ts` and
`tests/integration/src/extensions.test.ts`. **No dependency added or upgraded.**

### Design points worth recording

- **The gate is the substance, not the arithmetic.** It compares the source record's `content_hash`
  against the registry's `official_sha256` **and** the persisted snapshot count against
  `official_row_count`. Conjunctive on purpose: the checksum alone would pass a truncated copy of
  the right file, and the count alone would pass a same-sized different file. An unknown resource is
  `UNKNOWN_RESOURCE` — undecidable is not the same as complete, and neither permits a rank.
- **No bypass exists**, and a test asserts it: passing a fully permissive `rightsOverride` still
  refuses. Rights and completeness are unrelated axes.
- **A rank universe is a resource version, not a snapshot.** `DistributionSnapshot` is
  surname-scoped, so the ranked set is every snapshot sharing a `source_record_id`. The claim key is
  therefore `CURRENT_RANK|surname|source_record`.
- **There is no all-Poland rank, and the result type has no field for one.** The sex partitions are
  different comparability groups and U-1 forbids summing them.
- **Competition ranking** (1, 2, 2, 4), recorded on every claim because `docs/canonical/12` §9.6
  requires a ties policy be stored. Computed by the database as "one plus the number of strictly
  greater counts", so the result cannot depend on row order and a 408,182-row universe costs one
  aggregate rather than a full sort.
- **The rank reuses TASK-005's count evidence rather than duplicating the observation**, and fails
  closed with `MISSING_UPSTREAM_COUNT_EVIDENCE` if `CURRENT_POPULATION` has not been derived — a
  derived statistic may not invent its own input.
- **`distribution_values.rank` stays null.** A rank is a claim, not a column
  (`ARCHITECTURE.md` §10 invariant 10), asserted by a test.
- **A PostgreSQL constraint, tested not assumed:** `ALTER TYPE … ADD VALUE` works inside a migration
  transaction alongside a `CREATE TABLE` referencing the type, but *using* the new value in that
  transaction fails with `unsafe use of new value`. A future migration must never add an enum value
  and seed a row carrying it in one step. Recorded in the migration header and in D-011.

### D-013 — the finding that blocks the passing path

Demonstrating the gate letting a complete universe through requires importing a full official
resource. **That import fails, and writes nothing:**

```text
[import] FAILED (DUPLICATE_CANONICAL_KEY): two rows share canonical key "weiss": "WEISS" and "WEIẞ"
```

`canonical_key_v1` applies Unicode **full** case folding, which maps `ẞ` (U+1E9E) to `ss`. So
`WEIẞ` and `WEISS` both key to `weiss`. Measured across both full resources: **52 colliding keys in
the male file and 119 in the female, 171 in total, and every single one has this one cause.** Zero
arise from diacritics, whitespace or script. Confirmed against the real `canonicalKey` export rather
than a reimplementation; simple case mapping (`ẞ → ß`) separates all 171.

These are distinct surnames with distinct counts, so merging them is the automatic merge
`ARCHITECTURE.md` §10 invariant 8 forbids. The importer refusing is **correct**. The consequence —
that no production-scale data can be ingested at all — is what needs the project owner's decision,
recorded as **D-013** with three options and a recommendation (Option A: simple case mapping,
`canonical_key_v2`, with an ADR since it changes accepted TASK-003 behaviour).

**The identity model is otherwise sound across 828,264 real surnames**, which is the other half of
this finding.

### Verification actually run (2026-09-19)

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | **PASS** |
| `pnpm typecheck` | **PASS** — all packages |
| `pnpm lint` | **PASS** — zero errors, zero warnings |
| `pnpm format:check` | **PASS**, after Prettier on two new files |
| `pnpm test` | **PASS** — **216 tests** (193 before; +23) |
| `pnpm db:migrate` | **PASS** — `0005_current_rank` applied; re-run reports `no pending migrations` |
| `pnpm db:generate-types` | **PASS** — 19 tables introspected; `EvidenceDependencies` present |
| `pnpm test:integration` | **PASS** — **130 tests** (113 before; +18, minus one reframed) |
| `pnpm build` | **PASS** — all three apps |

**Three assertions failed first and were fixed, which is worth recording rather than smoothing
over.** Two were the schema-inventory assertions a schema-adding task is expected to update. The
third was **my own test passing vacuously**: the self-dependency constraint test inserted from an
empty `evidence_items`, affected zero rows and therefore proved nothing. It now derives the
population chain first, asserts evidence exists, and then expects the constraint to reject.

**One TASK-005 assertion was reframed.** Its forbidden-table list named `evidence_dependencies`;
migration `0005` legitimately creates it per D-011. TASK-005 still creates no lineage row, so the
invariant that test protects is unchanged, and the comment explains the change — the same treatment
TASK-005 gave a TASK-004 assertion.

**End-to-end CLI, against real ingested fixture data:**

```text
[rank] input              "NOWAK"
[rank] resolution status  EXACT
[rank] result             NO_RESULT (INCOMPLETE_UNIVERSE)
[rank] detail             no resource version backing this surname is a complete universe …
[rank]   resource 1148808  reason CONTENT_HASH_MISMATCH  rows expected 408182  rows persisted 22
[rank]   resource 1148811  reason CONTENT_HASH_MISMATCH  rows expected 420082  rows persisted 23
```

Exit code 1, and zero rows written to any truth-layer table. That is the gate working.

### Not verified in this environment

The integration suite ran against locally installed PostgreSQL 16.13 with PostGIS 3.4.2 via the
`TEST_DATABASE_URL` fallback; the pinned container image was not exercised, as registries remain
egress-blocked. **And the gate's passing path was not demonstrated**, because D-013 makes a
complete import impossible. It is not claimed as verified.

### Carried forward

- **D-013** — blocks the full import, so it blocks `CURRENT_RANK`'s passing path, `RARITY_CONTEXT`,
  and any production surface. The highest-priority open decision.
- **D-007** — resource-level licence, still keeping paid and SEO ineligible.
- **TASK-004 §14 U-1 and U-4** — unanswered by the publisher; U-1 is why there is no all-Poland rank.
- **U-6** — `universe_size` null, which is why `RARITY_CONTEXT` was excluded from this task.

## D-013 resolved — `canonical_key_v2` folds simply (2026-09-20)

The project owner chose **Option A** for D-013 and **Option C** for D-012 on 2026-09-20. D-012 is a
decision to change nothing and no code moved for it. D-013 is implemented, and the record below is
the merge of **two sessions that implemented it independently** on this branch — the branch carried
both. Where they differed, the stronger part won, and the redundant one was removed rather than left
to rot:

- the **migration** came from the other session, and is the better mechanism than the CLI this
  session first wrote: automatic at the version boundary, replayable, and reversible. The CLI
  (`packages/sources/src/rekey.ts`, `bin/rekey-keys.ts`, `pnpm db:rekey-keys`) was deleted, because
  two mechanisms for one job is what `AGENTS.md` §6 rules out.
- the **fold** came from this session. The other implementation folded by per-code-point
  `toLowerCase()`, which is not simple case folding: it leaves final sigma `ς` alone, so a Greek
  surname written in ordinary case would not have matched the same surname in capitals. The
  22-entry letterform-variant table and the exhaustive property tests are what close that.
- the **ADR** was written twice, under two filenames. They are now one file,
  `docs/adr/0005-canonical-key-simple-case-folding.md`; the other was deleted.

### What the defect was

`canonical_key_v1` applied Unicode **full** case folding, which expands one letter into several: `ẞ`
folds to `ss`. So `WEIẞ` and `WEISS` produced one identity key, `surnames.canonical_key` is UNIQUE,
and the importer refused the whole production resource with `DUPLICATE_CANONICAL_KEY` — correctly,
per TASK-004 U-5.

### What changed

| File | Change |
|---|---|
| `packages/resolver/src/normalize.ts` | `simpleCaseFold` added and used by `canonicalKey`, with a 22-entry letterform-variant table and no expansions; `fullCaseFold` kept, exported and tested, no longer the identity fold |
| `packages/resolver/src/version.ts` | `CANONICAL_KEY_VERSION`/`NORMALIZATION_VERSION` → `canonical_key_v2`; `RESOLUTION_METHOD_VERSION` → `exact_resolver_v2` |
| `packages/db/migrations/0006_canonical_key_v2.ts` | **new** — data-only re-key of `surnames.canonical_key` and `name_forms.search_key`, with a frozen copy of the pipeline and a `down()` that refuses rather than merges |
| `docs/adr/0005-canonical-key-simple-case-folding.md` | **new** — the decision, its measurements, and what it deviates from |
| `packages/resolver/src/normalize.test.ts` | the fold's unit tests rewritten; the D-013 pair regression added |
| `packages/resolver/src/normalize.property.test.ts` | three exhaustive properties added (P5–P7) |
| `tests/integration/src/canonical-key-v2.test.ts` | **new** — six tests against real PostgreSQL |

Also: `tests/integration/src/resolver.test.ts` (two hard-coded version strings), `resolution.ts` (a
doc comment), the two schema-inventory assertions every migration-adding change updates
(`packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts`),
`docs/CODEMAP.md`, `docs/DECISIONS_NEEDED.md` (D-013 → RESOLVED) and
`tasks/003-exact-surname-resolver.md` (an **Amended by** line — the task stays as accepted, with a
pointer). **No dependency added or upgraded.**

### Design points worth recording

- **Simple folding is not simple lowercasing, and the difference is not academic.** Applying
  `toLowerCase` per code point removes its *context* sensitivity — per code point, `Σ` is always
  `σ` — but a surname written in ordinary Greek case carries `ς` in final position, and
  `toLowerCase` leaves that alone. Twenty-two letterform variants therefore need an explicit
  mapping: final sigma, long s, the Greek symbol letters, nine Cyrillic historic forms, `ẛ`, the
  micro sign and ypogegrammeni. Without them `ΣΟΦΟΣ` and `Σοφος` take different keys.
- **The table was derived, not transcribed.** unicode.org is egress-blocked here, so
  CaseFolding.txt could not be read. ECMAScript specifies that a `u`-mode case-insensitive `RegExp`
  canonicalises with simple case folding, so `/^X$/iu` is an oracle for "do these two code points
  share a fold class". The property tests re-derive the relation from that oracle over **every** code
  point and assert both directions: the fold never joins what Unicode separates (the D-013 defect)
  and never separates what Unicode joins (caselessness). A sample would have been the wrong
  instrument — the whole point of D-013 is that the defect lived in one code point nobody sampled.
- **`toLowerCase`'s one expansion is discarded.** U+0130 `İ` lowercases to `i` + U+0307. Simple
  folding has no expansions and Unicode gives U+0130 no simple-fold entry, so the code point stands.
- **`v1` was not changed in place**, and `fullCaseFold` stays exported: it produced the keys the
  migration rewrites, and the regression test uses it to show the collisions were real.
- **The migration carries a frozen copy of the pipeline rather than importing the resolver.** A
  migration must mean the same thing when replayed after v3 exists; `migrator.test.ts` pins that the
  copy agrees with the live function today.
- **It recomputes rather than pattern-matching, and that is not fussiness.** A v1 key cannot be
  inverted — `gross` could have come from `GROSS` or from `GROẞ` — and a stale row is dangerous
  precisely because it looks healthy: v1 and v2 keys are identical for every surname without an
  affected code point, so an un-migrated database resolves correctly until it meets one of the 171.

### Measured with the real export, not asserted

Over the two full official resources, through the real `decodePeselBytes`/`parsePeselFile` path and
the real `canonicalKey` under `canonical_key_v2`:

| Resource | Source rows | Distinct keys | Collisions | Surnames containing `ẞ` or `ß` |
|---|---:|---:|---:|---:|
| `1148808` male | 408,182 | 408,182 | **0** | 86 |
| `1148811` female | 420,082 | 420,082 | **0** | 203 |

Under `canonical_key_v1` the same two files produced 408,130 and 419,963 keys — 52 and 119
collisions, 171 in total. Every one is now separated, and no new collision appeared anywhere across
828,264 real surnames.

### Verification run (2026-09-20, after the merge of the two implementations)

| Command | Result |
|---|---|
| `pnpm typecheck` | **Passed** — all ten workspace projects |
| `pnpm lint` | **Passed** — no findings |
| `pnpm format:check` | **Passed** |
| `pnpm test` | **Passed** — **235 unit tests** (resolver 74, was 55) |
| `pnpm db:migrate` on a fresh database | **Passed** — `0001`–`0006` applied in order; re-run reports `no pending migrations` |
| `pnpm db:generate-types` | **Passed** — 19 tables, byte-identical to the committed file (`git status` clean) |
| `pnpm test:integration` (`TEST_DATABASE_URL` → local PostgreSQL 16.13/PostGIS 3.4.2) | **Passed** — **136 tests** across 7 files |
| `pnpm build` | **Passed** — all three apps, all four `apps/web` routes |

The integration suite proves the fix where the defect actually bit. Both members of all five named
pairs store side by side; `WEIẞ` reads back as `weiß` rather than `weiss`; a name form's search key
follows the same v2 rules; every stored key equals what the live resolver computes from the display
form, which is what makes the migration's frozen copy trustworthy; and `migrateDown` returns an
error naming the collision while leaving every row unchanged.

It ran against a **locally installed PostgreSQL 16.13 + PostGIS 3.4.2** via the `TEST_DATABASE_URL`
fallback, as in every task so far. The pinned container image was not exercised here — registries
remain egress-blocked. CI runs it.

### Pre-existing flake found while verifying, not fixed

`pnpm test:integration` exits non-zero on roughly a third of runs with one unhandled
`terminating connection due to administrator command` (PostgreSQL `57P01`), attributed to a
different test file each time. **This is not caused by the D-013 change**: the same failure
reproduces on the unmodified tree at 2 of 6 runs, established by stashing the change and re-running.
It is a teardown race in the shared-server fallback, where one file's forced `DROP DATABASE` kills
another file's pooled connection. Every test passes on every run; only the process exit code is
affected. CI uses a per-run service container and has not shown it. Left alone as out of scope for
this change.

### Still open

- **D-004** (regional adoption), **D-007** (resource-level licence).
- TASK-008 items 10, 23 and 24 still need `raw/polska_teryt/teryt_terc__1cfbb50ebf97.zip`.
- `RARITY_CONTEXT` needs U-6's denominator decision; `distribution_snapshots.universe_size` is null.
- `ß`≡`ss` as a **retrieval** rule belongs to whichever task builds the fuzzy tiers (ADR-0005).

## Full official import run — male resource ingested, `CURRENT_RANK` proven, female blocked on D-014 (2026-09-20)

The step neither D-013 session could take: importing the real resources. The bytes were on disk in
this session, both files matching their official SHA-256 exactly, so the import was run for real.

### The male resource imported cleanly — the thing D-013 made impossible

```text
[import] IMPORTED source_record 01a0be06-ca69-729e-9a5f-a1103e96f915
[import] superseded          01a0bbe8-ae8b-72c4-94fc-ffbd2486a393
[import] resource            1148808
[import] rows read           408182
[import] rows imported       408182
[import] rows quarantined    0
[import] surnames created    408154
[import] surnames reused     28
[import] snapshots written   408182
[import] values written      408182
```

Twenty-two minutes, one transaction, zero quarantined rows. The 28 reused surnames are the TASK-002
fixture identities the excerpt had already created; the fixture-derived source record for the same
resource was **superseded, not rewritten** (invariant 6).

### The female resource failed, and it is not D-013

```text
[import] FAILED (UNRESOLVED_ROWS): 2 row(s) could not be resolved unambiguously
[import]   line 338202: HODŽIЌ — REVIEW_REQUIRED
[import]   line 420083: ЌATOVIЌ — REVIEW_REQUIRED
```

Both rows carry **U+040C CYRILLIC CAPITAL LETTER KJE** among otherwise Latin letters, both at
`Liczba = 2`. `detectScripts` sees two scripts in one token, validation returns
`MIXED_SCRIPT_REVIEW`, the resolver refuses to guess, and TASK-004 U-5 aborts the resource without
writing. Every layer did what it was built to do. Recorded as **D-014** with three options and a
recommendation; nothing was changed in code to work around it, and no row was normalised.

### `canonical_key_v2` verified at production scale

Migration `0006_canonical_key_v2` applied to the populated database in **14.9 seconds**. Then every
stored key was compared against what the live resolver computes from the display form:

| Check | Result |
|---|---|
| Surnames checked | 408,192 |
| Keys disagreeing with the live `canonicalKey` | **0** |
| Stale `canonical_key_version` | **0** |
| Name forms checked | 408,192 |
| Search keys disagreeing | **0** |
| Stale `normalization_version` | **0** |
| Keys containing `ß` | 86 |

`GROSS → gross` and `GROẞ → groß` are stored side by side, as are `WEISS`/`WEIẞ`. That pair is
the one the UNIQUE constraint could not hold under v1, so this is the defect's fix observed in the
database rather than in a test fixture.

### `CURRENT_RANK`'s passing path — the gate let a complete universe through

`pnpm demo:surname` then `pnpm demo:surname-rank`, against the imported resource:

| Surname | Count | Rank | Universe |
|---|---:|---:|---|
| `NOWAK` | 98,387 | **1 of 408,182** | source record `1148808`, `pesel_2026_national_male` |
| `GROSS` | 928 | 3,297 of 408,182 | same |
| `GROẞ` | 27 | 73,813 of 408,182 | same |

Each claim carries `confidence VERIFIED` from `derived_statistic_rule`, ties policy `COMPETITION`,
algorithm `current_rank@1`, and a citation locating resource `1148808`. Rank derivation took about
1.5 seconds end to end over the 408,182-row universe, because the rank is one SQL aggregate rather
than a sort. `GROẞ` and `GROSS` ranking separately is the clearest statement of what D-013 cost:
under v1 neither row could be stored at all, and now they are two surnames 70,000 places apart.

`evidence_dependencies` holds three `COUNT` and three `UNIVERSE` rows — one pair per rank claim, the
lineage `docs/canonical/14` §30 requires.

### Invariants checked against 408,227 real value rows

| Invariant | Observed |
|---|---|
| A rank is a claim, not a column (§10.10) | `distribution_values.rank` null on all 408,227 rows |
| No derived value written by ingestion | `surname_share`, `population_denominator` null on all 408,227 |
| `universe_size` still unknown | null on all 408,227 snapshots — this is what still blocks `RARITY_CONTEXT` (U-6) |

### What this leaves open

- **D-014** is now the blocker for the female side, and the only thing between the product and a
  complete national pair.
- `RARITY_CONTEXT` still needs U-6's denominator decision; the import writes no `universe_size` and
  should not.
- The male resource's rank claims are real, so the first production-scale read surface is now
  possible for male surnames — a task, not a change to slip into this one.
## TASK-008 closed out: TERYT TERC correspondence established (2026-09-20)

The project owner supplied the TERYT TERC register, the input TASK-008 had been waiting on since
2026-09-19. Items 23, 24 and the dependent item 10 are now verified, taking the spike from 23 of 27
acceptance items to **26 of 27**. The one remaining open item is half of item 22, the publisher's
licence confirmation, which belongs to D-007 and is not this task's to close.

**All 16 observed geography values map to a current TERC voivodeship code. None is unmapped.**

| Fact | Value |
|---|---|
| Comparison method | exact string equality, byte for byte against the TERC `NAZWA` field |
| Normalisation applied | **none**, and none claimed — both sides are already NFC and every value already matches including case and diacritics, so a folding step could not have changed any outcome |
| Register reference date | `2026-01-01` (field `STAN_NA`), ten days before the PESEL resources' `2026-01-20` |
| TERC zip SHA-256 | `1cfbb50e…2768`, equal to the value already committed in the acquisition archive's `SHA256SUMS.txt`, so an authentic archive copy |
| File read | `TERC_Urzedowy_2026-09-18.csv`, 205,660 B, UTF-8 with BOM, CRLF, `;` delimited, 4,360 data rows, 16 voivodeship-level |
| GUS page reached | **no** — `api.stat.gov.pl` and `eteryt.stat.gov.pl` both answered 403 at CONNECT when tested on 2026-09-20 |

Because the GUS page could not be reached, `docs/canonical/12` §2.1's rights statement is **quoted,
not re-verified**. No raw TERYT file is committed (`AGENTS.md` §6); only the derived correspondence
is, at `fixtures/teryt/voivodeship-terc-correspondence.json`. `teryt_simc` was supplied alongside
and deliberately **not read** — SIMC is the locality register and this item needs voivodeship level
only.

### What it unblocks, and what it does not

It answers exactly one of the `CURRENT_DISTRIBUTION` preflight's objections: that the regional
candidate "carries no geographic identifier at all". The codes now exist, are official and are
documented, so a later task could build a voivodeship `Place` foundation without inventing one.

It changes nothing else. No `Place`, table, migration or connector was created and none is
authorised. The two findings that decide whether a regional surface is honest are untouched:
per-cell suppression leaves over half of national surnames with no regional row, and about 21% of
bearers appear in no voivodeship row for a reason the publisher does not state. The resource-level
licence is still unconfirmed. **D-004's status, options and adoption gate are exactly as they
were.**

### Also observed while working on the line of record

A parallel session implemented D-013 independently and the two were merged at `fae6237`. The merged
`simpleCaseFold` is the better of the two: it applies the `CaseFolding.txt` simple-fold variants,
such as final sigma to sigma, on top of per-code-point lowercasing, and it keeps the original code
point where lowercasing would expand it. The resolver's suite passes at **74 tests** on the merged
tree. The ADR is `docs/adr/0005-canonical-key-simple-case-folding.md`.

**Merged from a parallel session (2026-09-20):** the same correspondence was produced independently
from the extracted TERC files and discarded in favour of the zip-verified record above; the
mappings were identical (16/16). Its three extra facts — the extracted CSV's digest equals the
zip member's, the XML twin is identical row for row, and the SIMC files' identities — are recorded
as an addendum in `docs/sources/pesel-regional.md`.

## TASK-010 implemented — mixed-script rows in bulk ingestion; D-004 and D-014 resolved (2026-09-20)

Scope authority: `tasks/010-mixed-script-rows-in-bulk-ingestion.md`. The project owner resolved
**D-014 as Option C** and **D-004 as Preferred** on 2026-09-20. D-014 is implemented here; D-004 is
specified as `tasks/011-voivodeship-places-and-regional-ingestion.md` and **not** implemented.

### What exists now

| Path | What it is |
|---|---|
| `packages/resolver/src/lookup.ts` | `ResolveOptions.mixedScript: "REVIEW" \| "RESOLVE_FLAGGED"`; the default is unchanged, the option lets a `MIXED_SCRIPT_REVIEW` input reach the T0/T1 lookup with the finding attached |
| `packages/db/migrations/0007_script_flags.ts` | `surnames.mixed_script`, `surnames.script_confusable_flag`, `CHECK (NOT script_confusable_flag OR mixed_script)` |
| `packages/sources/src/importer.ts` | resolves with `RESOLVE_FLAGGED`; a flagged row's identity is created with the flags as detected; reported under `mixedScriptRows`; `MULTIPLE_EXACT` and every other finding still abort (U-5(a)) |
| `packages/sources/src/import-result.ts` | `FlaggedRow`, `ReconciliationReport.mixedScriptRows` |
| `packages/sources/bin/import-pesel.ts` | prints the flagged rows |
| `tests/integration/src/mixed-script-ingestion.test.ts` | 7 tests: AC-1 to AC-5, the check constraint, idempotence |
| `tasks/011-voivodeship-places-and-regional-ingestion.md` | **specification only** for D-004 |

Modified: `packages/db/src/generated/db.ts` (two columns), the migration inventories in
`migrator.test.ts` and `extensions.test.ts`, `canonical-key-v2.test.ts` (its `migrateDown` refusal
test now steps past `0007` first, then restores), `docs/DECISIONS_NEEDED.md`, `docs/CODEMAP.md`,
`tasks/004-pesel-surname-ingestion.md` (an **Amended by** line for U-5). **No dependency added.**

### Why no ADR

`docs/canonical/13` §10.4 says of Latin + Cyrillic lookalikes: *"review/security flag. Do not
reject automatically; historical/OCR text can genuinely contain mixed scripts."* Option C is that
sentence implemented for bulk ingestion. What rejected before was TASK-004's implementer choice
U-5(a), narrowed once for this finding and no other. Nothing is mapped, folded or merged: `HODŽIЌ`
is stored as `HODŽIЌ`, key `hodžiќ`, U+040C intact, and a user typing it still gets
`REVIEW_REQUIRED` on the query path.

### Verification run

| Command | Result |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm format:check` | **Passed** |
| `pnpm test` | **Passed** — 235 unit tests |
| `pnpm test:integration` (`TEST_DATABASE_URL` → local PostgreSQL 16.13/PostGIS 3.4.2) | **Passed** — **143 tests** across 8 files (136 before, 7 new) |
| `pnpm db:migrate` on a fresh database | **Passed** — `0001`–`0007` applied in order; re-run reports `no pending migrations` |
| `pnpm db:generate-types` | **Passed** — exactly two lines added, `mixed_script` and `script_confusable_flag`; committed |
| `pnpm db:migrate` on the populated dev database | `0007_script_flags: applied`; 0 of 408,192 existing surnames flagged, as the migration header predicts |
| `pnpm build` | **Passed** — all three apps |

The pinned container image was not exercised here — registries remain egress-blocked. CI runs it.

### The real female import — AC-8

Launched against resource `1148811` (official bytes, checksum-matched) at 12:47 on 2026-09-20 and
**still running when this section was committed**. Its outcome — rows imported, the two flagged
rows, and `CURRENT_RANK` for a female surname over the 420,082-row universe — is recorded in the
next section, not here. Until that section exists, AC-8 is **not verified**.

## The national pair is complete — female resource imported, both-sex `CURRENT_RANK` (2026-09-20)

TASK-010's AC-8, run for real against the official female bytes (checksum-matched):

```text
[import] IMPORTED source_record 01a0bede-cfd7-77a2-84a0-2c91db7faa47
[import] superseded          01a0bbe8-b28f-765e-84f6-e00731ce15df
[import] resource            1148811
[import] rows read           420082
[import] rows imported       420082
[import] rows quarantined    0
[import] surnames created    190284
[import] surnames reused     229798
[import] snapshots written   420082
[import] values written      420082
[import] mixed-script rows   2 (imported, flagged)
[import]   line 338202: HODŽIЌ — MIXED_SCRIPT_REVIEW persisted
[import]   line 420083: ЌATOVIЌ — MIXED_SCRIPT_REVIEW persisted
```

Ten minutes and forty-two seconds, one transaction. 229,798 surnames were reused because the same
string occurs in both sex partitions — the identity is shared, the counts are not, and nothing was
summed. The fixture-derived female source record was superseded, not rewritten.

### Observed in the database afterwards

| Fact | Value |
|---|---|
| Surnames | 598,476, of which **2** carry `mixed_script = true` and `script_confusable_flag = true`, both `primary_script = Latn`, both stored with U+040C intact (`HODŽIЌ` → key `hodžiќ`) |
| Complete universes | `1148808`: 408,182 snapshots on the checksum-matched record; `1148811`: 420,082 on the checksum-matched record |
| `distribution_values` | 828,309 rows; `rank`, `surname_share`, `population_denominator` null on every one |

### `CURRENT_RANK` for both sexes

`pnpm demo:surname "NOWAK"` then `pnpm demo:surname-rank "NOWAK"`:

| Universe | Count | Rank | Confidence |
|---|---:|---:|---|
| `1148808`, `pesel_2026_national_male` | 98,387 | **1 of 408,182** | `VERIFIED` |
| `1148811`, `pesel_2026_national_female` | 99,738 | **1 of 420,082** | `VERIFIED` |

Two claims, each within one resource version; the CLI states that there is no all-Poland rank
because the sex partitions may not be combined (U-1).

### The query path is unchanged, checked

`pnpm demo:surname-rank "HODŽIЌ"` → `resolution status REVIEW_REQUIRED`, `NO_RESULT (AMBIGUOUS)`. The
row is stored and counted in the universe; typing it still reaches nobody without review. That is
§5.6 and §10.4 both satisfied at once.

### One observation for the read layer, not acted on

`pnpm demo:surname "NOWAK"` lists **four** `CURRENT_POPULATION` claims: two on the current source
records and two on the superseded fixture-derived records from earlier sessions. Claims are
immutable and the superseded records still exist, so this is correct storage; whether a read
projection should surface claims on superseded records is a TASK-006 read-path question, recorded
here and not changed.

### Where this leaves the product

Both national resources are complete universes. `CURRENT_POPULATION` and `CURRENT_RANK` exist for
either sex over real data. Still open: `RARITY_CONTEXT` (U-6's denominator — the sum of counts is
a lower bound, not a universe), D-007 (licence, gating paid surfaces), TASK-011 (regional storage,
specified), and the read-layer observation above.

## TASK-013 implemented — importer throughput, ~20×, byte-identical output (2026-09-20)

Scope authority: `tasks/013-importer-throughput.md`. Done ahead of TASK-011 so its 1.3 million
regional rows do not take an hour.

### What changed

| Path | Change |
|---|---|
| `packages/resolver/src/lookup.ts` | T0/T1 classification extracted into pure functions (`classifyCanonical`, `classifyForms`, `knownVariant`) that both paths call; `resolveSurnamesBulk` added — one `READ ONLY` transaction, `IN (…)` lists of at most 5,000 keys, one outcome per input in input order, `LOOKUP_FAILED` for every pending input on a database failure |
| `packages/sources/src/importer.ts` | read pass: one `resolveSurnamesBulk` call with `RESOLVE_FLAGGED`; write pass: rows buffered per table and inserted in chunks of 1,000 (`identityRows` builds what `createIdentity` used to insert one at a time). Still one transaction, still U-7 via the UNIQUE constraint, still U-5(a) |
| `tests/integration/src/bulk-resolution.test.ts` | 5 tests — input-by-input equality with `resolveSurname` over EXACT, KNOWN_VARIANT, MULTIPLE_EXACT, UNKNOWN, mixed-script under both policies, EMPTY, control characters, the limit, duplicates; the empty batch; the all-invalid batch; a dead handle |

`resolveSurname`'s signature and behaviour are unchanged; the API never calls the bulk path.

### Measured

| Run | Before (per-row path, 2026-09-20 morning) | After (this change) |
|---|---|---|
| Full male resource `1148808`, 408,182 rows, fresh database | **22m28s** | **1m07s** |

### Same data, proven not assumed (AC-3)

Over the checksum-matched `1148808` source record in each database — the dev database imported with
the old path this morning, a fresh database imported with the new path just now:

| | Old path (dev) | New path (fresh) |
|---|---|---|
| Snapshots | 408,182 | 408,182 |
| Sum of counts | 21,197,537 | 21,197,537 |
| Distinct display forms | 408,182 | 408,182 |
| `md5` over every `(canonical_key, count)` pair in key order | `b44bd17cd9a8f91bc31991930881e3dd` | `b44bd17cd9a8f91bc31991930881e3dd` |

### Verification run

| Command | Result |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm format:check` | **Passed** |
| `pnpm test` | **Passed** — 235 unit tests |
| `pnpm test:integration` | **Passed** — **148 tests** across 9 files (143 before, 5 new). One run exited non-zero with every test green, which is the documented teardown race in the shared-server fallback; it did not reproduce on the re-run |
| `pnpm build` | **Passed** |

Environment note, not a repository fact: the local PostgreSQL was killed twice today between
commands, without a log entry and with memory idle — the container reaps it when a shell goes idle.
Restarted each time; nothing in the data was affected.

## D-007, U-4 and U-6 decided — the paid-surface gate opens, the unit is people (2026-09-20)

Three judgements by the project owner, recorded as judgements. D-007 and U-4 are implemented here;
U-6 is specified as `tasks/014-rarity-context-truth-chain.md` and not implemented.

### What changed

| Path | Change |
|---|---|
| `packages/sources/src/registry.ts` | `PESEL_RIGHTS_PROFILE`: `commercial_use` and `redistribution` `ALLOWED`, `review_status` `APPROVED`, `checked_at`/`valid_from` 2026-09-20, `notes` carrying the basis (dataset-level CC0 1.0 + statutory re-use right; "the project owner's judgement … not a publisher confirmation") |
| `packages/db/migrations/0008_pesel_rights_decision.ts` | **new**, data only — brings a populated database's stored profile to the seeded values (`ensureRegistry` seeds only when the Source is absent); `down()` restores the earlier posture |
| `packages/truth/src/query.ts` | `PESEL_POPULATION_UNIT` → `"PEOPLE"` — the one-value switch ADR-0004 said U-4 would be |
| `docs/contracts/surname-result.md` | unit deviation rewritten; the accepted EN and PL sentence templates for `PESEL_CURRENT_SURNAME` recorded |
| `docs/adr/0004-population-value-unit.md` | amendment of 2026-09-20 |
| `docs/DECISIONS_NEEDED.md` | D-007 → RESOLVED, with U-4 and U-6 recorded beside it |

Tests that pinned the earlier posture were rewritten to pin the decided one, not deleted: three in
`registry.test.ts`, one in `importer.test.ts`, the two rights traversals (`pesel-ingestion`,
`truth-chain`), the surface and unit assertions in `surname-result-api.test.ts`, and the
confidence-invariance tests, which now flip to a **restrictive** override (`PROHIBITED`) so the
"confidence never moves while surfaces do" comparison stays non-vacuous under a permissive profile.
The read API took no rights override — the two "rights-blocked" tests tighten the stored profile
for their own scope and restore it, which is the real path. `canonical-key-v2`'s `migrateDown`
refusal test now steps past `0008` and `0007` before reaching `0006`.

### Effect, observed

Every PESEL claim's surface eligibility is now `INTERNAL / FREE / PAID / SEO` all `ALLOWED`
(`RIGHTS_PERMIT_FREE_SURFACE`, `COMMERCIAL_USE_ALLOWED`, `REDISTRIBUTION_ALLOWED`). The dev
database's stored profile reads `ALLOWED | ALLOWED | APPROVED | 2026-09-20` after migration.
PESEL values carry `unit: "PEOPLE"` with `scope_label_code: "PESEL_CURRENT_SURNAME"`.

### Verification run

| Command | Result |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm format:check` | **Passed** |
| `pnpm test` | **Passed** — 235 unit tests |
| `pnpm test:integration` | **Passed** — **149 tests** across 9 files |
| `pnpm db:migrate` on a fresh database | **Passed** — `0001`–`0008`; re-run reports no pending migrations |
| `pnpm db:migrate` on the populated dev database | `0008_pesel_rights_decision: applied`; profile row verified as above |
| `pnpm db:generate-types` | **Passed** — byte-identical (no schema change) |
| `pnpm build` | **Passed** |

One defect caught by the suite on the way: the migration's first draft joined on
`sources.rights_profile_id`, which does not exist (`default_rights_profile_id` does); every
integration file's `beforeAll` failed on it, which is how it was found before it could ship.

## TASK-014 implemented — `RARITY_CONTEXT`, about one in X over the published universe (2026-09-20)

Scope authority: `tasks/014-rarity-context-truth-chain.md`. U-6 was decided by the project owner on
2026-09-20: the denominator is the **published universe** — the sum of one resource's published
counts — labelled as such. M2's last capability.

### What exists now

| Path | What it is |
|---|---|
| `packages/db/migrations/0009_rarity_context.ts` | `RARITY_CONTEXT` on `claim_type`, `DENOMINATOR` on `evidence_dependency_role` (the role `0005` anticipated) |
| `packages/truth/src/universe.ts` | **new** — the resolution-and-gate plumbing `rank.ts` and `rarity.ts` now share, extracted rather than copied, so there is one completeness gate and a universe that fails it fails for both claims identically |
| `packages/truth/src/rarity.ts` | the chain: denominator evidence → derived evidence → claim → confidence → citation, with `COUNT` / `DENOMINATOR` / `UNIVERSE` lineage; `oneInX` and `shareOf` are pure and exported |
| `packages/truth/src/read.ts` | `readRarityContext` — read-only, mirrors `readCurrentPopulation` |
| `packages/contracts/src/surname-result.ts` | schema **1.1**: a `rarity` section carrying canonical/16 §27's `RarityDTO` |
| `packages/truth/bin/surname-rarity.ts` | `pnpm demo:surname-rarity` |
| `packages/truth/src/rarity.test.ts` | 10 unit tests on the two pure rules |
| `tests/integration/src/rarity-context.test.ts` | 11 tests: refusal, auditability, no bypass, idempotence, `universe_size` still null, the API's own answer |

### The real figures, and they were checked against SQL rather than against the code

`pnpm demo:surname-rarity "NOWAK"` over the fully imported national pair:

| Universe | Count | Denominator | About 1 in | Share | Supporting rank |
|---|---:|---:|---:|---:|---|
| `1148808` male | 98,387 | 21,197,537 | **215** | 0.004641435 | 1 of 408,182 |
| `1148811` female | 99,738 | 21,560,302 | **216** | 0.004626002 | 1 of 420,082 |

Recomputed in SQL — `SUM(count)` per source record and `round(total / numerator)` — and both the
denominators and both values of X matched the stored claims exactly. Lineage: two `COUNT`, two
`DENOMINATOR`, two `UNIVERSE` dependency rows, one set per claim. `distribution_snapshots.universe_size`
is still null on every row, which is the point: the register's living-person total remains unknown.

The API serves it at schema `1.1`, validating against the published contract, on `FREE`
(`RIGHTS_PERMIT_FREE_SURFACE`) and on `PAID` (`COMMERCIAL_USE_ALLOWED`) alike now that D-007 is
decided. The combined male+female sum (42,757,839) appears **nowhere** in any payload or claim —
asserted, not assumed.

### Two honesty properties worth stating

- **"About" is used here and only here.** X is rounded (`ROUND_HALF_UP`, named on every claim), so
  the rendering says "about 1 in 215". The population count is exact and never says "about".
- **The label is part of the claim, not the frontend's discretion.** Every entry carries
  `universe_label_code = PESEL_PUBLISHED_UNIVERSE`, rendered "of people counted in the register" /
  "osób ujętych w rejestrze". A unit test asserts none of the codes contains "POLAND" or "POLES",
  because the denominator excludes single-bearer surnames and includes registered emigrants.

### Verification run

| Command | Result |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm format:check` | **Passed** |
| `pnpm test` | **Passed** — **245 unit tests** (truth 65, contracts 26) |
| `pnpm test:integration` | **Passed** — **160 tests** across 10 files, exit 0 |
| `pnpm db:migrate` on a fresh database | **Passed** — `0001`–`0009`; re-run reports no pending migrations |
| `pnpm db:generate-types` | **Passed** — two lines changed, `ClaimType` and `EvidenceDependencyRole`; committed |
| `pnpm build` | **Passed** |

One correction on the way: the first draft of `rarity.test.ts` asserted a share of `0.004641893`,
which was my arithmetic error, not the code's — the true value is `0.004641435`. The literal was
corrected, not the implementation.

### What M2 still lacks

`CURRENT_DISTRIBUTION` (TASK-011 specified, then TASK-012), the fuzzy retrieval tiers, and the
consumer UI. Nothing in the truth layer is now blocked on a decision.

## TASK-011 implemented — the voivodeship `Place` foundation and regional ingestion (2026-09-20)

Scope authority: `tasks/011-voivodeship-places-and-regional-ingestion.md`. D-004 was resolved
"Preferred" on 2026-09-20. **Storage only: no claim, no share, no rank, no "most common in".**
`CURRENT_DISTRIBUTION` is TASK-012 and may not begin until these figures exist — they now do.

### What exists now

| Path | What it is |
|---|---|
| `packages/db/migrations/0010_places_core.ts` | `places`, `place_names`, `entity_external_ids` and four enums; `PLACE` on `entity_type`. Voivodeship scope only |
| `packages/sources/src/regional-schema.ts` | the three-column shape and the **closed** 16-value voivodeship set |
| `packages/sources/src/regional-parser.ts` | fail-closed: a 17th value, a wrong column count, a count below 2, an LF ending each refuse the file |
| `packages/sources/src/voivodeships.ts` | seeds the 16 `REGION` places from `fixtures/teryt/voivodeship-terc-correspondence.json`, idempotently |
| `packages/sources/src/regional-importer.ts` | one surname-scoped `REGION` snapshot per surname, one value per (surname, voivodeship) cell with `place_id` |
| `packages/sources/bin/import-pesel-regional.ts` | `pnpm --filter @name-atlas/sources run import-pesel-regional` |
| `packages/sources/src/regional-parser.test.ts` | 14 unit tests |
| `tests/integration/src/regional-ingestion.test.ts` | 14 integration tests |

The regional importer **shares** the national importer's internals — `ensureRegistry`,
`identityRows`, `insertChunked`, `rightsRefusal`, `sha256Hex` — rather than copying them. The
registry gained the two regional descriptors with their official checksums and row counts, and
`findPeselResource` now finds them: the D-004 gate that made them unapproved is lifted, and the
test that pinned it was moved deliberately.

### Two constraints the database now enforces rather than trusts

- **`UNIQUE (provider_key, external_id)`** on `entity_external_ids`: TERYT `14` names exactly one
  place, forever. A second claimant is rejected by the database, and a test proves it.
- **A region may not carry a precise point** (`docs/canonical/11` §5.1). `centroid` is null on all
  16 and a CHECK admits one only at `EXACT_POINT` or `LOCALITY` precision. TERC carries no
  geometry, so null is the honest value; a test proves an attempted point is refused.

### The real import — AC-7

| Resource | Rows | Values | Places | Surnames reused | Regional sum | vs national | Time |
|---|---:|---:|---:|---:|---:|---:|---:|
| `1148786` male | 646,052 | 646,052 | 16 | 188,413 | 16,590,111 | **78.3%** of 21,197,537 | 42s |
| `1148790` female | 694,553 | 694,553 | 16 | 206,804 | 17,296,363 | **80.2%** of 21,560,302 | 46s |

Zero quarantined, zero surnames created (every regional surname already existed nationally), zero
with no national row. `ЌATOVIЌ` appears in the female regional file too and was stored flagged, as
TASK-010 decided. 1.34 million rows in 88 seconds, which is TASK-013's batching earning its place:
on the per-row path this would have taken roughly an hour.

**The residuals are exactly TASK-008's: 21.7% and 19.8%.** So is every per-surname figure, now
reproduced through a different code path (importer plus SQL, against the spike's own analysis):

| | Male `1148786` | Female `1148790` |
|---|---:|---:|
| Surnames with regional rows | 188,413 | 206,804 |
| Regional sum **exceeding** the national count | **0** | **0** |
| Regional sum **equal** to the national count | 46,808 | 58,631 |
| Surnames with no national row | **0** | **0** |

TASK-008 recorded 188,413 / 46,808 / 0 and 206,804 / 58,631 / 0. The one supported invariant —
`regional sum ≤ national count`, with zero exceptions — holds across 395,217 surnames.

### Invariants checked over the 1,340,605 regional values

| Invariant | Observed |
|---|---|
| Every regional value references a place and keeps the publisher's string | 0 rows with a null `place_id` or `source_geography_key` |
| Nothing derived (§10.10) | 0 rows with `rank`, `surname_share`, `population_denominator`, `population_rate` or `derivation_version` |
| `universe_size` unknown for the regional universe too | null on all `REGION` snapshots |
| One snapshot per (surname, resource) | 0 duplicates |
| No zero rows | none; an absent cell is simply absent |

### The national chains are untouched (AC-8)

After 1.34 million regional rows landed, `NOWAK` reads exactly as before: counts 98,387 and 99,738,
ranks **1 of 408,182** and **1 of 420,082**, rarity **1 in 215** and **1 in 216** over the national
sums. The population read path selects on `geography_level`, so a regional row cannot be read as a
national one — asserted in the integration suite as well as observed here.

### Verification run

| Command | Result |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm format:check` | **Passed** |
| `pnpm test` | **Passed** — **261 unit tests** (sources 74, up from 60) |
| `pnpm test:integration` | **Passed** — **174 tests** across 11 files, exit 0 |
| `pnpm db:migrate` on a fresh database | **Passed** — `0001`–`0010`; re-run reports no pending migrations |
| `pnpm db:generate-types` | **Passed** — 22 tables; committed |
| `pnpm build` | **Passed** |

Four schema-inventory assertions moved, as every schema-adding task's do: the table list in
`extensions.test.ts`, the `migrateDown` step list in `canonical-key-v2.test.ts`, and the two
"forbidden table" lists that named `places`. The last two were **reframed rather than deleted** —
what they protect is that a *national* import and the TASK-005 derivation build nothing geographic,
so they now assert `places` is empty and no value carries a `place_id`, which is the property that
actually mattered.

### What TASK-012 may now assume, and what it may not

It may assume: 16 `REGION` places with TERYT ids, `REGION` snapshots per surname, one value per
cell with a `place_id`, and the reconciliation figures above. It may **not** assume that a regional
sum equals a national count, that the residual is explained, or that a region may be compared with
another sex's region. And the binding framing stands: this is *permanent registered residence*,
never origin, ancestry, birthplace or unqualified current residence.

## TASK-012 implemented — `CURRENT_DISTRIBUTION`, counts and shares of the covered set (2026-09-20)

Scope authority: `tasks/012-current-distribution-truth-chain.md`. The last claim of the
current-surname vertical. The spec left exactly one decision open — the low-coverage threshold — and
it was implemented at the recommended **0.50**, in one named constant
(`DISTRIBUTION_LOW_COVERAGE_THRESHOLD`) with its rationale; moving it changes nothing else. That
value is an implementation default awaiting the project owner's confirmation, not a decision made on
their behalf.

### What exists now

- `0011_current_distribution` — one enum value, `CURRENT_DISTRIBUTION` on `claim_type`. No table and
  no column: the roles this chain needs already exist, and a derived value is a claim, not a column
  (`ARCHITECTURE.md` §10 invariant 10).
- `packages/truth/src/universe.ts` — `resolveForDerivation` extracted from `prepareDerivation`, so
  the national and regional paths cannot drift on what counts as resolved, plus
  `loadRegionalCandidates`, `regionalUniverseSize` and `prepareRegionalDerivation`. One gate for
  three claims. `regionalUniverseSize` counts published **cells**, not surnames, because that is
  what the registry's `official_row_count` records: 646,052 rows describe 188,413 surnames.
- `packages/truth/src/distribution.ts` — `deriveCurrentDistribution` plus four pure, exported
  functions (`coveredSetSum`, `shareOfCovered`, `coverageRatio`, `coverageState`).
- `packages/sources/src/registry.ts` — `nationalCounterpartOf`, which pairs `1148786` with
  `1148808` and `1148790` with `1148811` and returns nothing for anything else. It never pairs male
  with female.
- Read path: `readCurrentDistribution`, a `distribution` section in `query.ts`, and the contract at
  schema **1.2** with `placeStatSchema`, `distributionEntrySchema` and `distributionSectionSchema`.
- `pnpm demo:surname-distribution`.

### The design question the data settled

A regional figure could be published as a share of the national count. It is not, and must not be.
The 16 voivodeships hold 78.3% (male) and 80.2% (female) of the national totals, and the shortfall
is biased by surname size — 78.0% for surnames with 10–99 bearers against 89.3% above 10,000
(TASK-008). Per surname it is far worse. Observed:

| Surname | Partition | Regions | Covered | National | Coverage | State |
|---|---|---:|---:|---:|---:|---|
| `NOWAK` | male | 16 | 86,969 | 98,387 | 0.884 | `READY` |
| `NOWAK` | female | 16 | 89,385 | 99,738 | 0.896 | `READY` |
| `MELNYK` | male | 14 | 210 | 6,442 | 0.033 | `LOW_COVERAGE` |
| `MELNYK` | female | 14 | 239 | 7,257 | 0.033 | `LOW_COVERAGE` |

A share of the national count would report `MELNYK` as almost absent from every region of a country
where it has 6,442 registered bearers. So every share is of the **covered set** — the surname's own
regional sum — and coverage travels on the claim as a state a surface must honour, not a footnote it
may drop.

### Three honesty properties, each checked rather than asserted

1. **Coverage never touches confidence.** All 310 derived claims are `VERIFIED`: 276 `READY` and 34
   `LOW_COVERAGE`. The counts are exactly what the source says in both states; what differs is
   scope. Conflating the two is what `ARCHITECTURE.md` §10 invariant 2 exists to prevent.
2. **Unknown coverage is its own state.** `COVERAGE_UNKNOWN` exists because a regional resource can
   be complete while its national counterpart is not, and not knowing what share of the bearers a
   set of cells represents is not a licence to present it as the whole. Zero claims reached it here,
   because both national resources are complete; the state and its contract refinement exist
   regardless. This is a refinement of the spec, which named only two states.
3. **The one cross-group comparison is justified in writing.** `coverage_ratio` compares a regional
   snapshot with a national one, which `docs/canonical/11` §6.1 permits only with explicit
   justification. The justification is `nationalCounterpartOf`'s pairing — same publisher, same
   partition, same reference date, same counted field, same register, differing only by the
   residence restriction — and `DISTRIBUTION_COVERAGE_BASIS` states it on every claim.

### The complete-universe path, verified by SQL recomputation

The committed regional fixtures are 40- and 38-row excerpts, so the integration suite can only prove
the refusal — the same constraint TASK-009 and TASK-014 documented. AC-2 to AC-7 were therefore
verified against the real imported resources, by recomputing every figure in SQL from
`distribution_values` rather than from the code that wrote it. 180 surnames were derived, spanning
the size range (the top 60 by covered count, 60 at the median percentile, the 60 smallest), giving
**310 claims over 2,113 entries**:

| Check | Result |
|---|---|
| Entries whose `count` ≠ the stored `distribution_values.count` | 0 of 2,113 |
| Entries whose `share_of_covered` ≠ `round(count/covered, 9)` | 0 of 2,113 |
| Entries with no corresponding stored row | 0 |
| Entries missing a TERC code | 0 |
| Entries with a count below 1 | 0 |
| Claims whose `covered_count` ≠ `SUM(count)` | 0 of 310 |
| Claims whose `regions_present` ≠ the SQL row count | 0 of 310 |
| Claims whose `national_count` ≠ the same partition's national value | 0 of 310 |
| Claims whose `coverage_ratio` ≠ `round(covered/national, 9)` | 0 of 310 |
| Claims where `covered_count > national_count` | 0 of 310 |
| Largest drift of a claim's shares from 1 | 3e-9 |
| Regions per claim | min 1, max 16 |
| Claims without exactly 3 lineage rows in roles `COUNT`/`DENOMINATOR`/`UNIVERSE` | 0 of 310 |
| Distinct `claim_key` values / active claims / max per key | 310 / 310 / 1 |
| Claims missing `coverage_basis` or the residence restriction | 0 of 310 |
| Payload fields expressing a share of the national count | 0 |

`min 1` region is the point of AC-6: a surname listed in one voivodeship gets one entry, not sixteen
with fifteen zeroes. The 3e-9 drift is per-entry rounding at nine places over up to 16 entries;
apportioning the remainder would distort individual shares, so the tolerance is stated instead.

### The DTO, checked against a real payload rather than only a synthetic one

The integration suite cannot reach a `READY` distribution, so the schema-1.2 projection was run
against the real claims through `querySurnameResult` and validated with
`surnameResultResponseSchema`. This is the check that would catch a key-name mismatch between the
claim payload, the reader and the DTO, which no synthetic test can see:

| Surname | Partition | Section state | Entry `coverage_state` | Regions | Largest region | Sum of shares | Schema valid |
|---|---|---|---|---:|---|---:|---|
| `NOWAK` | male | `READY` | `READY` | 16 | `WIELKOPOLSKIE` (TERC 30), 16,077 | 1 | yes |
| `NOWAK` | female | `READY` | `READY` | 16 | `WIELKOPOLSKIE` (TERC 30), 16,203 | 1 | yes |
| `MELNYK` | male | `READY` | `LOW_COVERAGE` | 14 | `WARMIŃSKO-MAZURSKIE` (TERC 28), 38 | 1.000000001 | yes |
| `MELNYK` | female | `READY` | `LOW_COVERAGE` | 14 | `MAZOWIECKIE` (TERC 14), 40 | 1.000000001 | yes |

The two levels are deliberate and must not be conflated. The **section** state says whether figures
are present at all (`READY` / `UNAVAILABLE` / `RIGHTS_BLOCKED`, as `population` and `rarity` use).
The **entry** `coverage_state` says how those figures may be presented. `MELNYK` is therefore a
`READY` section carrying two `LOW_COVERAGE` entries: the data is real and is returned, and a surface
must render it as "of the 210 bearers with a registered voivodeship".

`1.000000001` is the per-entry rounding drift in the real data. The schema deliberately does not
require the shares to sum to 1 — it requires `covered_count` to equal the sum of the *counts*, which
is exact.

### AC-8 — nothing else moved

- `0001`–`0011` applied to a freshly created database in order; re-run reported `no pending
  migrations`.
- `pnpm db:generate-types` against that fresh database produced a file byte-identical to the
  committed one. The only change from the previous commit is the new `ClaimType` member.
- After deriving 310 distributions, `NOWAK` still reads: counts 98,387 / 99,738; rank **1 of
  408,182**; **about 1 in 215** of 21,197,537, share 0.004641435. Unchanged.

### Verification run

```
pnpm typecheck                → passed, 11 projects
pnpm lint                     → passed
pnpm format:check             → passed
pnpm test                     → passed, 283 unit tests
                                 (resolver 74, sources 74, truth 77, contracts 36, db 4,
                                  domain 7, testing 3, web 5, worker 2, admin 1)
pnpm test:integration         → passed, 182 tests across 12 files, exit 0
pnpm db:migrate (fresh DB)    → 0001–0011 applied; re-run: no pending migrations
pnpm db:generate-types        → 22 tables, byte-identical to the committed file
pnpm build                    → passed, 3 apps
pnpm demo:surname-distribution "NOWAK"   → 2 claims, both READY, 16 regions each
pnpm demo:surname-distribution "MELNYK"  → 2 claims, both LOW_COVERAGE, 14 regions each
```

Three stale assertions in existing suites were corrected as part of this change: the `claim_type`
enum list in `current-rank.test.ts`, the pinned schema version in `rarity-context.test.ts`, and the
`migrateDown` step list in `canonical-key-v2.test.ts`. Two stale comments in
`packages/contracts/src/surname-result.ts` still described U-4 as open; U-4 was decided on
2026-09-20, so they were corrected to match.

### What M2 has now, and what is still open

The current-surname vertical is complete: `CURRENT_POPULATION`, `CURRENT_RANK`, `RARITY_CONTEXT` and
`CURRENT_DISTRIBUTION`, each over a gated complete universe, each with lineage, confidence, a
citation and a rights decision, and all four readable through one contract at schema 1.2.

Still open, unchanged by this task: the low-coverage threshold awaits the owner's confirmation at
0.50; the ~21% regional residual's *cause* stays `UNRESOLVED` pending a publisher enquiry (optional,
blocks nothing); D-002 (onomastics rights) and D-003 (Polona rights) belong to later milestones.
`GEOGRAPHIC_ORIGIN` was explicitly **not** produced here — `docs/canonical/14` §27.3 makes modern
concentration contextual evidence, not proof of origin — and the binding framing stands: these
counts are *permanent registered residence*, never location, origin, ancestry or birthplace.

## TASK-015 implemented — fuzzy candidate retrieval, suggestions only (2026-09-20)

Scope authority: `tasks/015-fuzzy-candidate-retrieval.md`. Both open decisions were answered by the
project owner as recommended: **D-016 GIN** (ADR-0006) and **D-017 option (a)**, a minimum input
length below which nothing is suggested.

### What exists now

- `0012_surname_trigram_index` — one GIN index on `surnames.canonical_key`. No table, no column.
- `packages/resolver/src/distance.ts` — Damerau-Levenshtein (unrestricted variant, by code point)
  and `hasAdjacentTransposition`. Pure.
- `packages/resolver/src/candidates.ts` — `suggestSurnames`, the length-band threshold table,
  `compareCandidates`, and the `SearchCandidate` value object. Read-only on the same three grounds
  as `lookup.ts`.
- `packages/resolver/bin/measure-fuzzy-recall.ts` (`pnpm measure:fuzzy-recall`) — the committed
  measurement tool, so recall stays a recorded number.
- `pnpm demo:surname-candidates`.
- ADR-0006, recording why the index deviates from `docs/canonical/13` §23.1.

`resolveSurname` is unchanged. Nothing here resolves: the outcome is `SUGGESTION_REQUIRED` or
`MULTIPLE_CANDIDATES` with decision mode `USER_CONFIRM`, never `AUTO`.

### A real bug, caught by a unit test before it reached the thresholds

The first `damerauLevenshtein` advanced its transposition bookkeeping one step too early and reported
`kowalskii` against `kowalski` as distance **0**. The first threshold sweep ran on that function, so
its recall figures were wrong. The fix, a re-measurement and a property test covering the metric
laws (identity, symmetry, triangle inequality, length bounds, one-edit shapes) all landed before any
number below was recorded. Every figure here comes from the corrected function.

### AC-9 — the measured recall, recorded rather than claimed

Measured on the ingested register (**598,476 surnames**), 25 real surnames per length band by
descending national count, four single-edit classes each (transposition, substitution, deletion,
insertion). Full sweep in the tool; the chosen thresholds are the **tightest that cost no recall**:

| Input length | Threshold | Retrieved in a 25-row shortlist | Reranked first | Trigram first | Transposition class | Mean shortlist |
|---|---:|---:|---:|---:|---:|---:|
| 4–5 | *none* | 60/94 | 30/94 | 26/94 | **0/25** | 25.0 (saturated) |
| 6–8 | 0.25 | 97/100 | **77/100** | 57/100 | 22/25 | 24.9 |
| 9–11 | 0.40 | 100/100 | **80/100** | 53/100 | 25/25 | 19.8 |
| 12+ | 0.50 | 100/100 | **87/100** | 66/100 | 25/25 | 7.9 |

So roughly four in five single-edit typos come back first at six characters or more, and about one in
five does not. That is the honest state of the feature.

### The two rules that carry it, each measured against its own absence

**Reranking beats trigram order.** Compare the "reranked first" and "trigram first" columns above:
at nine to eleven characters, 80 against 53. Ordering by trigram distance in the database would order
by the wrong thing, which is why ADR-0006's loss of GiST's `<->` costs nothing.

**Preferring a detected transposition at equal edit distance.** Re-running the same sweep with that
one comparator step disabled:

| Length | Threshold | First place without | with | Transposition without | with |
|---|---:|---:|---:|---:|---:|
| 6–8 | 0.25 | 74/100 | 77/100 | 18/25 | 22/25 |
| 9–11 | 0.40 | 63/100 | **80/100** | 8/25 | **25/25** |
| 12+ | 0.50 | 84/100 | 87/100 | 22/25 | 25/25 |

`CICHWOSKI` is the case in one line: one edit from both `CICHOWSKI` (transposed) and `CICHOSKI`
(deleted), and trigram prefers the wrong one, 0.583 against 0.429. With the rule, `CICHOWSKI` ranks
first; without it, second.

### D-017 — why short inputs return nothing

At four to five characters the best any threshold achieved was 30 first-place hits of 94, with the
shortlist saturated at the cap for every query and **0 of 25 transpositions recovered at any
threshold**. What such an input retrieves is an alphabet walk of real surnames: `NOWK` returns `NOWS`,
`NOWY`, `NOWE` and `NOWA`, all at similarity 0.429. So `MIN_FUZZY_INPUT_LENGTH` is **6**, and a
shorter input returns `INPUT_TOO_SHORT` with an empty list and says why.

### Observed on the real register

| Input | Behaviour |
|---|---|
| `NOWAK`, `KOWALSKY` | `EXACT` — an exact surname wins outright, and no suggestion is offered |
| `CICHWOSKI` | 16-row shortlist, 10 candidates, `CICHOWSKI` **first** with `ADJACENT_TRANSPOSITION` |
| `WISNIEWSKY` | `MULTIPLE_CANDIDATES`, `WISNIEWSKA` and `WISNIEWSKI` both at distance 1 and trigram 0.692, resolved to neither |
| `NOWK` | no suggestions, `INPUT_TOO_SHORT` |

Query latency for the real 598,476-row table, threshold 0.40, top 25: **7.4 ms**. Index size 18 MB
against the table's 91 MB.

### Verification run

```
pnpm typecheck                → passed, 11 projects
pnpm lint                     → passed
pnpm format:check             → passed
pnpm test                     → passed, 311 unit tests
                                 (resolver 102, sources 74, truth 77, contracts 36, db 4,
                                  domain 7, testing 3, web 5, worker 2, admin 1)
pnpm test:integration         → passed, 193 tests across 13 files, exit 0
pnpm db:migrate (fresh DB)    → 0001–0012 applied; re-run: no pending migrations
pnpm db:generate-types        → byte-identical; an index changes no type
pnpm build                    → passed, 3 apps
pnpm demo:surname-candidates "CICHWOSKI" / "WISNIEWSKY" / "NOWK" / "KOWALSKY"  → as tabled above
pnpm demo:surname / -rank / -rarity / -distribution "NOWAK"  → unchanged:
                                 98,387 · rank 1 of 408,182 · 1 in 215 · 16 regions, 0.884, READY
```

### What this does not do

No diacritic fold: `similarity('luczak','łuczak')` is 0.400 and `LUCZAK` is itself a real surname
scoring 1.000, so that candidate needs its own key and its own task. No gender forms, no
transliteration, no phonetics, no OCR expansion, no language packs. No search endpoint and no UI —
those consume this. No candidate is persisted as a row (`docs/canonical/13` §18.2), and no fuzzy
candidate can reach a claim: an integration test drives all four derivations with a fuzzily-matchable
input and asserts nothing is written.

### What M2 still lacks

The search API endpoint and the free result UI. The truth layer and the retrieval layer are both
done; nothing in either is blocked on a decision.

## TASK-016 implemented — suggestions on the read API, schema 1.3 (2026-09-20)

Scope authority: `tasks/016-surname-suggestions-api.md`. The retrieval TASK-015 built was unreachable
from outside the repository; the endpoint answered `UNRESOLVED` and stopped. It now carries the
candidates.

**D-015 was also decided and is now closed.** The distribution low-coverage threshold is **0.50**,
confirmed by the project owner. Every claim already stores the threshold it was judged against, so
the decision is recorded in the data and not only in a constant.

### What exists now

- Contract schema **1.3**: `suggestionSchema` and `suggestionsSectionSchema`, plus a `suggestions`
  section on the response, required and nullable, **present exactly when `status` is not
  `RESOLVED`** — the inverse of every fact section's rule, and the first section in this contract to
  work that way.
- `querySurnameResult` calls `suggestSurnames` when the resolver returned `UNKNOWN`.
- The route handler is **unchanged**. It was already thin enough that a new section needed no work
  there, which is the property `ARCHITECTURE.md` §6 was after.

### Three things the schema now makes impossible rather than merely discouraged

1. **An auto-applied suggestion.** `decision_mode` is the literal `USER_CONFIRM` whenever candidates
   are present, so a payload claiming `AUTO` fails validation. `docs/canonical/13` §32.2 is explicit
   — "Do not silently replace input" — and §33.4 forbids auto-resolving a fuzzy relation at any
   score.
2. **A similarity, distance or score on the wire.** A suggestion is an identity, a match type and
   explanation codes. An integration test walks every key of the serialized response and asserts the
   absence of `trigram_similarity`, `edit_distance`, `retrieval_rank_score`, `score`, `probability`
   and `transposition_detected`. `docs/canonical/16` §35 keeps internal scores off the boundary, and
   a number here would invite a surface to render "91% match".
3. **An outcome that disagrees with its own contents.** `SUGGESTION_REQUIRED` carries exactly one
   candidate and `MULTIPLE_CANDIDATES` more than one, enforced by refinement.

### Two decisions taken from the contract's own precedents rather than invented

**The suggestions section carries no `surface` decision.** Every fact section has one; the `surname`
identity object never has. A suggestion is a canonical surname string and its id, which is identity,
not a fact, so it follows the identity precedent. Gating it would have been the inconsistency.
Recorded in `docs/contracts/surname-result.md` with the condition that would reopen it: a source
whose rights restrict even naming its surnames.

**The top-level `status` enum does not gain `SUGGESTION_REQUIRED`.** `docs/canonical/13` §32.2 names
that outcome for a typo while §32.5 keeps `UNRESOLVED` "with spelling suggestion if any" for an
unknown surname. Separating those means asserting an input *is* a typo, and TASK-015 measured
first-place accuracy at roughly four in five — not enough to make that claim at the top level. The
distinction is carried inside the section, where the resolver computes it.

### Mixed script gets nothing, deliberately

An input carrying a Cyrillic lookalike resolves `AMBIGUOUS` as before, and its suggestions section is
`UNAVAILABLE` with `reason_code: MIXED_SCRIPT_REVIEW`. `docs/canonical/13` §33.4 names mixed-script
identity as a case never to auto-resolve; offering Latin neighbours for it would be worse than
offering nothing. This is the only place that signal can reach a client, and it is why the section is
present for `AMBIGUOUS` and not only for `UNRESOLVED`.

### Observed behaviour

| Input | `status` | Section | Detail |
|---|---|---|---|
| `KOWALSKY` (exact) | `RESOLVED` | `null` | an exact surname wins outright |
| `CICHWOSKI` | `UNRESOLVED` | `READY` | `MULTIPLE_CANDIDATES`, `CICHOWSKI` first with `ADJACENT_TRANSPOSITION` |
| `ZAWADKZI` | `UNRESOLVED` | `READY` | `SUGGESTION_REQUIRED`, one candidate, `USER_CONFIRM` |
| `NOWK` | `UNRESOLVED` | `UNAVAILABLE` | `INPUT_TOO_SHORT`, empty list |
| Latin/Cyrillic mix | `AMBIGUOUS` | `UNAVAILABLE` | `MIXED_SCRIPT_REVIEW`, empty list |

Dropping the trigram index does not break the answer: PostgreSQL falls back to a sequential scan, so
the suggestions are still correct, only slower. A test asserts that rather than assuming it.

### Verification run

```
pnpm typecheck                → passed, 11 projects
pnpm lint                     → passed
pnpm format:check             → passed
pnpm test                     → passed, 317 unit tests
                                 (resolver 102, sources 74, truth 77, contracts 42, db 4,
                                  domain 7, testing 3, web 5, worker 2, admin 1)
pnpm test:integration         → passed, 203 tests across 14 files, exit 0
pnpm build                    → passed, 3 apps
```

Two pinned schema-version assertions in existing suites were updated from 1.2 to 1.3; the rules those
tests assert are unchanged by this section.

### What M2 still lacks

**Only the consumer UI.** `apps/web` serves two API routes and a placeholder homepage that still says
"Foundation build". Everything a result page needs now exists behind the contract: four facts with
confidence, source and date, the rights decision per surface, the honest low-data states, the
suggestions for a miss, and the accepted English and Polish sentences for every figure recorded in
`docs/contracts/surname-result.md`. No decision blocks it.

## TASK-017 implemented — the free surname result page; M2's journey is complete (2026-09-20)

Scope authority: `tasks/017-free-surname-result-page.md`. `apps/web` served a placeholder reading
"Foundation build" until now. A person can enter a surname in a browser and get a sourced, dated,
caveated answer, or honest suggestions, or an honest nothing.

### What exists now

- `apps/web/src/app/page.tsx` — a server component, **no client bundle**. The build reports the route
  as dynamic and server-rendered on demand; nothing ships to the browser but HTML and one stylesheet.
- `apps/web/src/lib/messages.ts` — the accepted Polish and English sentences, verbatim from
  `docs/contracts/surname-result.md`, plus the formatting.
- `apps/web/src/lib/result-view.tsx` — the presentation, split from the page so it can be rendered in
  a test.
- `apps/web/src/app/globals.css` — one stylesheet, no framework, no dependency, mobile first, both
  themes.
- **Polish and English**, `?lang=pl` (default) and `?lang=en`. Both renderings were already accepted
  by the project owner, so shipping one would have left half a contract unimplemented.

### The rule the page is built on

**It renders validated claims and derives nothing.** It calls `querySurnameResult`, parses with
`surnameResultResponseSchema`, and renders from the parsed value; a payload that fails validation
renders an error and no figures, because a payload violating its own contract is a bug and must not
reach a reader.

That one rule settles the rest. The page never sums the two partitions, never rounds, never divides a
regional count by a national one, never decides whether a distribution is presentable, and never
renders a withheld value — a `RIGHTS_BLOCKED` section carries no values in the payload at all, so
there is nothing to hide with CSS.

### Verified against rendered markup, not against intent

`result-view.tsx` was split out precisely so `renderToStaticMarkup` could assert these, and each
fixture is parsed by the contract first, so a payload that could not legally arrive cannot prove the
page behaves:

| Rule | How it is asserted |
|---|---|
| No total across partitions | The sum 198,125 appears in neither notation, in either language |
| A count is exact | No "about", "approximately" or "estimated" near a count |
| A rarity figure is hedged | "About 1 in 215" / "Około 1 na 215" required |
| Coverage warning precedes figures | Its index in the markup is lower than the first region's |
| Never a location claim | "lives in", "comes from", "originates", "mieszka", "pochodzi" all absent |
| Rights-blocked shows nothing | No figure, and no `display:none`, `hidden` or `aria-hidden` |
| Suggestions are offered, not applied | Links only; no `selected`, `checked`, `autofocus` or meta refresh |
| No score reaches a reader | No probability, similarity, trigram or edit-distance anywhere |
| Every state has words | Six states render six distinct bodies, in both languages |

### Two bugs the work surfaced, both fixed

1. **A doubled full stop in Polish.** The Polish date form ends in `r.` and the sentence template
   appended its own period, producing `2026 r..`. A unit test comparing against the accepted sentence
   caught it; sentences now terminate through one helper.
2. **A crash on missing configuration.** `loadDbConfig()` throws when `DATABASE_URL` is absent, and it
   sat *outside* the page's `try`, so a misconfigured deployment returned HTTP 500 instead of the
   honest unavailable state. Found by starting the server without the variable. Configuration and
   connection are now inside the try, with the reason logged and nothing about it rendered.

### One presentation decision corrected in review

The first version printed a suggestion's raw explanation codes to the reader —
`ADJACENT_TRANSPOSITION · EDIT_DISTANCE_1 · TRIGRAM_MODERATE`. Two things wrong: the contract calls
them *localisable* codes and the page is the downstream that localises them, and `TRIGRAM_MODERATE`
is a similarity band, which is a score in words. They now render as "dwie litery przestawione, różni
się jedną literą", the trigram codes are not rendered at all, and an unknown code is omitted rather
than printed.

### Observed against the real register

| Query | Rendered |
|---|---|
| `NOWAK` | two counts, both rarity figures, the distribution table, the "never summed" note |
| `MELNYK` (`lang=en`) | two counts; rarity unavailable with its reason; distribution warning **first**, then 210 placed of 6,442 |
| `CICHWOSKI` | "Czy chodziło Ci o:" with `CICHOWSKI` first, reason in words |
| `NOWK` | no suggestions, "Zapytanie jest za krótkie…" |
| Latin/Cyrillic mix | "This query needs narrowing" and no candidate |

### A finding the page exposed, recorded as D-018

Searching `NOWAK` rendered its count **twice** per partition. The page is correct; the data has two
source records for each publisher resource — one from the committed fixture import, one from the full
import — and `CURRENT_POPULATION` derived a claim from each. Nothing supersedes the earlier one, and
`claims.supersedes_claim_id` is unused. This is not a test-database quirk: a production re-import of
the same annual resource would double every observation. **D-018** records it with a recommendation
(supersede on import) and the rule that no presentation layer may deduplicate, because which claim is
true is not a rendering question.

### Verification run

```
pnpm typecheck                → passed, 11 projects
pnpm lint                     → passed
pnpm format:check             → passed
pnpm test                     → passed, 366 unit tests (web 54, resolver 102, sources 74,
                                 truth 77, contracts 42, db 4, domain 7, testing 3, worker 2, admin 1)
pnpm test:integration         → passed, 203 tests across 14 files, exit 0
pnpm build                    → passed; / is ƒ (dynamic, server-rendered on demand)
next start + real register    → the five journeys tabled above, by eye, in both languages
```

`apps/web/vitest.config.ts` now names the JSX transform, because `tsconfig.json` sets
`jsx: "preserve"` for Next's own build and Vitest does its own.

### Where this leaves M2

The milestone's exit journey exists: search → resolution → current result → confidence, source and
date → honest low-data state. Four facts, a retrieval tier behind the suggestions, one validated
contract, and a page that renders them without deriving anything.

What M2's description still names and this repository does not have: the **read-only internal
inspector** (`apps/admin` is one page), and a **structured logging and tracing baseline** — the page
and the route handler log to `console.error` with a request id, which is not an observability
baseline. Neither blocks the journey; both are what an internal alpha would want before it is
watched by anyone other than its author.

## D-018 resolved — one source record per resource wins, by authority (2026-09-20)

The duplicate counts the result page exposed are fixed. `NOWAK` returned four population observations
and the page rendered each count twice; it now returns two.

**The rule is authority, not recency.** When more than one `SourceRecord` exists for one publisher
resource id, the record whose `content_hash` matches the registry's `official_sha256` is the one that
counts, and claims from the others become `SUPERSEDED`. Import order is irrelevant, so re-importing an
older or truncated copy cannot displace the real file, and the rule applies retroactively to data
already imported rather than depending on what the importer knew at the time.

**A lone partial import stays active.** If no record for a resource is complete, they all stay: that
is the only thing that exists, `CURRENT_POPULATION` has no universe requirement, and its count is
honest about its own scope. It is the state the committed fixtures are in, which is why every refusal
test still works unchanged.

Nothing is deleted — a superseded claim stays readable.

| | Before | After |
|---|---:|---:|
| `NOWAK` active `CURRENT_POPULATION` claims | 4 | 2 |
| Superseded | 0 | 2 |
| Observations in the API and on the page | 4 | 2 |

Still open deliberately: `source_records.supersedes_source_record_id` exists and the importer does not
set it, so the lineage between two imports is not recorded at import time, only its consequence. The
authority rule does not need it; wiring it is an importer-side follow-up.

Verified: `pnpm typecheck`, `pnpm lint`, `pnpm format:check` passed; **366 unit tests**; **207
integration tests across 15 files, exit 0**, including four new ones asserting the lone-partial case,
the supersession, that repeated derivation does not flip the decision, and that nothing is deleted.
