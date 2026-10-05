# 2026-10-05 — The frozen surname report (TASK-119, RPT-001 first step)

M5's first step (`tasks/118-frozen-report.md`). The owner asked to "build next step premium report" after TASK-117 merged, and chose a frozen, stored report with no page, for any surname under an internal test entitlement (§6). Built on `main` @ `512e48b` as TASK-118, then renumbered 119 and merged with `1a8e210` (#142, which took 118 for the one-page PDF; of these files it touched only `STATUS.md` and `docs/CODEMAP.md`). Nothing is deployed, applied on the VM or built on production.

## What changed

- **Migration 0037** (`packages/db/migrations/0037_reports.ts`) adds four tables in `public`:
  - `reports`: unique per surname, type and entitlement. The type is `NAME_ATLAS`, and a check allows only `INTERNAL_TEST`.
  - `report_versions`: `version_number` ≥ 1, unique per report, plus the versions of the report schema, coverage, index and policy, the eligibility state, and `rendered_payload` jsonb.
  - `report_sections`: nine types, each once per version, numbered.
  - `report_claim_references`: one row per claim per section, in a role, with an index on `claim_id`.

  The trigger function `refuse_report_change()` refuses UPDATE and DELETE on versions, sections and references. Every reference is ON DELETE RESTRICT, and down refuses while a report is stored. `packages/db/src/generated/db.ts` is regenerated.
- **`packages/truth/src/report.ts`** (new):
  - `buildReport(db, surname)` reads the active claims, then the validated PAID response, DiscoveryIndex with coverage, and eligibility, then the active claims again in the write transaction. It returns CLAIMS_CHANGED, writing nothing, if they differ. The bracket exists because the resolver's own read-only transaction cannot nest in the writing one.
  - It stores the next version (`report@0`), its sections and its claim references.
  - `reportSectionsOf(payload, claims)` is the pure section builder: presented fields and their states, confidence summaries, sourceless sections' availability, SOURCES' citation ids, LIMITATIONS' coverage, index and eligibility gaps, and claim roles (HERO, SUPPORT, or LIMITATION when the PAID surface does not show the claim's field).
- **`packages/truth/bin/report-build.ts`**, `pnpm report:build -- --surname NAME` (root) and `report-build` (`@name-atlas/truth`).
- `packages/truth/src/index.ts` exports. Migration lists in `packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts` (and its table list) and `tests/integration/src/canonical-key-v2.test.ts`. `tests/integration/src/coverage-assessment.test.ts`: a `the frozen report (TASK-119)` block of 4 tests.
- `tasks/118-frozen-report.md`, `STATUS.md`, `PLAN.md` (the M5 row), `docs/CODEMAP.md`.

## Verification (commands run, results as returned)

CI's `verify` job cannot run on GitHub (the account's billing block; see #136). Its steps from `.github/workflows/ci.yml` were run locally in order, on the working tree of `bf477b3` (before the renumbering and the merge of #142), against PostgreSQL 16.13 with PostGIS 3.4.2 (`DATABASE_URL` a fresh `name_atlas`; `TEST_DATABASE_URL` the same server), with the pre-installed Chromium for Playwright.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `python3 scripts/test-backup.py` | exit 0, 6 tests |
| `pnpm test` | exit 0; 2,260 tests (db 11, with 0037 in the migration list; truth 395) |
| `pnpm db:migrate` | exit 0; "0037_reports: applied" |
| `pnpm db:generate-types` and `git diff --exit-code -- packages/db/src/generated` | exit 0; the committed types match |
| `pnpm report:build` with no surname | "usage: pnpm report:build -- --surname NAME", exit 2 |
| `pnpm report:build -- --surname KOWALCZYK` on that empty register | "[report] KOWALCZYK: NOT_RESOLVED", exit 1; `SELECT count(*) FROM reports` = 0 |
| `pnpm test:integration` | exit 0; 37 files, 462 tests (4 new; the migration lists and the public table list include 0037; `0037` comes down cleanly in the canonical-key step-down) |
| `pnpm test:golden` | exit 0; 4 files, 364 tests |
| `pnpm build` | exit 0 |
| `pnpm e2e:seed`; `pnpm test:e2e` | exit 0; 10 Playwright tests passed |

What the integration tests show on the committed PESEL male excerpt, with the synthetic meaning works and ZAREMBA's recorded Polona responses:

- **AC-1, AC-2:** KOWALCZYK is built as version 1 with the nine sections in order and eligibility INSUFFICIENT_MEANINGFUL_CONTENT.
  - ORIGIN presents `meaning` (AVAILABLE), with its claim as HERO and confidence `{LIKELY: 1}`.
  - DISTRIBUTION's first claim and ARCHIVES' claim are HERO.
  - VARIANTS, PLACES and MIGRATION are NOT_RETRIEVED with `NO_SOURCE_YET` and no claims.
  - SOURCES lists citations.
  - LIMITATIONS carries `ALL_SHOWN_FREE` and `COVERAGE_BELOW_STANDARD`.
  - The stored row holds that state, the display name in `rendered_payload`, `INTERNAL_TEST`, 9 sections, and as many references as were built.
- **AC-3:** a rebuild is version 2, and version 1's `rendered_payload` and `generated_at` are unchanged. These are refused:
  - an UPDATE of `report_versions`;
  - a DELETE of `report_claim_references` or `report_sections` ("immutable");
  - an INSERT of a report with entitlement `PAID` (`reports_internal_test_only`).
- **AC-4:** with the meaning works' commercial use UNKNOWN, ORIGIN's state is RIGHTS_BLOCKED, its claim is a LIMITATION, and eligibility is RIGHTS_BLOCKED.
- **AC-5:** MAZUR's ORIGIN is NO_SOURCED_MEANING and its ARCHIVES NOT_SEARCHED, both with no claims; an input that does not resolve returns NOT_RESOLVED and adds no report.

## Not verified

- **CLAIMS_CHANGED:** no test interleaves a derivation with a build, so the refusal to write when the active claims change mid-build is not exercised. A change to rights or confidence during a build, without a change of claims, is not detected.
- **Migration 0037 on the VM, and a report built on production:** neither has been done. The next Register VM step that migrates applies 0037; `pnpm report:build` writes, so it needs a role that may insert.
- **Report size on real surnames:** `rendered_payload` holds the whole PAID response (famous bearers and localities included). Its size on production surnames is not measured.
