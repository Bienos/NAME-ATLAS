# Merging `main` (#83, #84) into the pending pipeline (#76)

The owner approved the merge order on 2026-10-03: #77 into #76, then #76 into `main`. #77 was merged into #76's branch (`8d053c6`). Meanwhile `main` had taken #83 (a blog post) and #84 (well-known bearers: TASK-073, ADR-0030, migration `0029_notable_bearers`, contract 1.12). This merge brings `main` into #76.

## What changed in the merge

- **The family schema's migration is now `0030_family_schema`** (it was `0028_family_schema`).
  - **Why:** `main`'s 0029 may already be applied in production when #76 lands, and Kysely refuses to apply a migration that sorts before one already applied.
  - **What was updated:** references to the migration in code, tests and `docs/CODEMAP.md`: the roles file, the family schema types, the migration lists in `migrator.test.ts`, `extensions.test.ts` and `canonical-key-v2.test.ts`, the family and accounts tests, and a comment in `0029_notable_bearers.ts`.
  - **What was not:** the dated progress records and task files that name 0028 record what was true when they were written, and are unchanged.
- **Contract 1.12 carries both new sections:** `localities` (1.11, TASK-066) and `bearers` (1.12, TASK-073).
  - `docs/contracts/surname-result.md` numbers the localities rules 29–32 and the bearers rules 33–34, and lists both version steps.
  - A test fixture written for 1.11 now sets `bearers: null`.
- **Page and deck order:** archive, localities, well-known people, then sources and summary. Each side's own placement is kept. Two tests that counted the chapters and the deck's cards now count one more.
- **`docs/DECISIONS_NEEDED.md`:** #76's newer version, with `main`'s D-033 added above D-032. `STATUS.md` combines both sides' lines.

## Verification, 2026-10-03

Local PostgreSQL 16 with PostGIS.

| Command | Result |
|---|---|
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `pnpm test` | exit 0 (after the two count fixes and the fixture fix above) |
| `pnpm build` | exit 0 |
| `pnpm test:integration` | exit 0; 33 files, 404 tests |
| `pnpm test:golden` | exit 0; 364 tests |
| `pnpm test:backup` | exit 0 |
| `pnpm db:migrate` on an empty database, then `pnpm db:generate-types` | 0001–0027, 0029, 0030 applied in that order; the generated types unchanged |

## Not verified

- Production: no migration was run.
- #67 still carries the family schema as `0028_family_schema`. It must take this numbering, or drop its copy, before it merges.
