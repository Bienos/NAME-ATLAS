# PROGRESS.md — observed state

Facts only. What exists, what was verified, what is blocked. No diary, no intentions.

**Last updated:** 2026-09-19 — TASK-004 specified (planning only, no code); TASK-003 implemented and verified (exact surname resolver + identity core migration)

## Current state

| | |
|---|---|
| Repository control plane | created (prior session) |
| Specification corpus | present and unmodified — `docs/canonical/10–23` verified byte-identical (SHA-256 of directory listing unchanged) |
| **TASK-001 — project foundation** | **implemented and verified** |
| **TASK-002 — PESEL source spike** | **IMPLEMENTED AND VERIFIED — now complete with no residuals.** All 20 acceptance items resolved; the two items previously carried forward (download URLs, portal timestamps) closed 2026-09-19 — `docs/sources/pesel.md`. D-001 **RESOLVED** (`docs/DECISIONS_NEEDED.md`). |
| **TASK-003 — exact surname resolver** | **IMPLEMENTED AND VERIFIED.** §6.2 approved by the project owner ("do task 003"). `packages/resolver` + migration `0002_identity_core`. All 19 acceptance tests in §8 implemented and passing — see the TASK-003 section below. |
| Application source code | `packages/sources` (PESEL CSV schema/parser, TASK-002) and `packages/resolver` (exact resolver, TASK-003). Identity tables exist (`knowledge_entities`, `surnames`, `name_forms`); no other canonical domain table, no importer, no `Claim`/`Source`/`RightsProfile`. |
| Database migrations | `0001_bootstrap_extensions` (`postgis` + `pg_trgm`) and `0002_identity_core` (three identity tables + `resolvable_name_forms` view). Nothing else. |
| CI | configured (`.github/workflows/ci.yml`) |
| **TASK-004 — canonical PESEL surname dataset ingestion** | **SPECIFIED AND READY TO IMPLEMENT — no code written.** `tasks/004-pesel-surname-ingestion.md` is the scope authority. No TASK-004 code, migration, importer or test exists. All blocking decisions are closed: §14 U-1, U-2, U-3 (project owner, 2026-09-19) and U-8 (ADR-0003, closing D-006). U-4 to U-7 are implementer choices to record during the work. |
| Next approved task | None. TASK-004 is specified but not approved for implementation; the §14 decisions are unanswered. |

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

## Next action

TASK-001, TASK-002 and TASK-003 are implemented and verified. One flagged deviation awaits the project owner's acknowledgement: the `TemporalExtent` columns on `name_forms` were omitted alongside the two omissions §6.2 named (reasoning above); adding them later is a nullable-column migration.

TASK-004 is now **specified** — see the section below. Per AGENTS.md §8: **STOP.** No TASK-004 code was written and no `tasks/005-*.md` exists.

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
