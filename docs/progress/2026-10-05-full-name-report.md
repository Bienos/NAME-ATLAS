# 2026-10-05 — The full-name report (TASK-124)

The full-name report D-043 put in the 28,99 zł tier, as an internal test artifact (`tasks/124-full-name-report.md`; ADR-0041, proposed). The owner chose "Name + surname" and "Stored + preview". Built on `main` @ `93db9a1`. Nothing is deployed, applied on the VM, built on production or sold.

## What changed

- **Migration 0039** (`packages/db/migrations/0039_full_name_reports.ts`):
  - `reports.given_name_id`, and the type `FULL_NAME`;
  - the check `reports_given_name_for_full_name`;
  - `reports_one_per_subject`, unique `NULLS NOT DISTINCT` over surname, first name, type and entitlement, in place of `reports_one_per_surname`;
  - the section type `GIVEN_NAME`.

  Down refuses while a full-name report is stored. `packages/db/src/generated/db.ts` is regenerated.
- **`packages/truth/src/given-name-facts.ts`** (new):
  - `readGivenNameFacts` reads a first name's active `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` claims, per list, with confidence and citation, gated by the source's rights on the surface.
  - `parseGivenNameFacts` checks a frozen copy field by field.
- **`packages/truth/src/report.ts`:**
  - `buildFullNameReport` and `full_name_report@0`.
  - Ten sections, `GIVEN_NAME` first. The first name's citations lead SOURCES, and LIMITATIONS lists the missing meaning, the missing joint count and each list without a rank.
  - `GIVEN_NAME_NOT_FOUND` and `GIVEN_NAME_UNREVIEWED` write nothing.
  - `buildReport` now writes through the shared `writeVersion`, whose conflict target is the new constraint. What it stores is unchanged.
  - `readReportVersion` returns `report_type`.
- **`packages/truth/bin/report-build.ts`:** `--given-name`. A full name is never printed.
- **`apps/web/src/lib/report-view.tsx`:**
  - the full name and "Raport imienia i nazwiska" on the cover;
  - the "Imię / First name" chapter: each list's count and "rank of N", footnoted, a missing rank as "brak / none", and the meaning's absence;
  - the first name's gaps under "Czego nie wiemy";
  - the surname's eligibility, shown only as the surname part's.
- **Tests:**
  - `tests/integration/src/full-name-report.test.ts` (6, new);
  - `apps/web/src/lib/report-view.test.ts` (5 new);
  - the migration lists in `packages/db/src/migrator.test.ts`, `extensions.test.ts` and `canonical-key-v2.test.ts`.
- **Docs:** `tasks/124-full-name-report.md`, ADR-0041, ADR-0032 (one consequence line), `STATUS.md`, `docs/CODEMAP.md`.

## Verification (commands run, results as returned)

CI's `verify` job cannot run on GitHub because of the account's billing block (see #136). Its steps from `.github/workflows/ci.yml` were run locally in order on the working tree of `f30bc36`. The database was PostgreSQL 16.14 with PostGIS 3.4.2: `DATABASE_URL` was a fresh `name_atlas`, and `TEST_DATABASE_URL` was the same server.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `python3 scripts/test-backup.py` | exit 0, 6 tests |
| `pnpm test` | exit 0, 2,308 tests (web 922) |
| `pnpm db:migrate`; `db:generate-types` and `git diff --exit-code -- packages/db/src/generated` | exit 0, no diff |
| `pnpm test:integration` | exit 0: 39 files, 475 tests |
| `pnpm test:golden` | exit 0: 4 files, 364 tests |
| `pnpm build`, `e2e:seed`, `test:e2e` | running when the pull request opened; results follow in the next commit |

**`pnpm report:build` on real first-name data.** These runs used the database `gn_full`, which holds the full official 2026-01-20 first-name lists and their TASK-122 claims. `tests/e2e/seed.sh` was first run against it (exit 0), which applied 0039 and added the e2e surnames.
- `--surname NOWAK --given-name PIOTR`: exit 0, version 1. The `GIVEN_NAME` section has 4 claims (a count and a rank on each list), and both lists' rank is `READY`.
- `--given-name Anna`: exit 0, also 4 claims.
- `--given-name MA.`: `[report] GIVEN_NAME_UNREVIEWED`, exit 1.
- `--given-name "BRAK DANYCH"`: `[report] GIVEN_NAME_NOT_FOUND`, exit 1.
- `--given-name` with no value: the usage line, exit 2.
- No output line held a name.

## Not verified

- Migration 0039 on the VM, and a report built on production.
