# 2026-10-01 — Migration 0024 on `main`, so TASK-054's load can migrate the VM

Scope authority: `tasks/054-polona-archive-availability.md` (its VM step). This change adds no feature.

## Why

The first `Register VM` run of `archive` on `main` @ `8121138` (run 36838776848, 08:49 UTC) stopped at `pnpm db:migrate`:

```
[migrate] migration run failed: Error: corrupted migrations: previously executed migration 0024_distribution_shift is missing
```

Kysely checked before running anything, so nothing was applied. The production database had run `0024_distribution_shift` from #43's branch (TASK-051): run 36797284343, step `shift-finish`, 00:39–00:47 UTC, whose log reports 807,358 ACTIVE `SURNAME_DISTRIBUTION_SHIFT` claims. `main` had 0025 and not 0024.

## What changed

- `packages/db/migrations/0024_distribution_shift.ts`: #43's file, byte for byte (git blob `f99e4c9` on both). One `claim_type` value and one `SURNAME_LEVEL` check constraint.
- `packages/db/src/generated/db.ts`: regenerated with `pnpm db:generate-types` from a fresh database migrated to 0025; `ClaimType` gains `SURNAME_DISTRIBUTION_SHIFT`.
- The four tests that pin the migration list or the `claim_type` values: `migrator.test.ts`, `extensions.test.ts`, `canonical-key-v2.test.ts` (also its comment, which still named `0023` as the first step down after TASK-054) and `current-rank.test.ts`.
- `STATUS.md`: #43 keeps 0024 and moves its schema to 1.9; the database line names #43's claims; the production line names #53's deployment.

## Verification (run 2026-10-01, on this branch)

- Production before this change, at 08:51 UTC, on the database without 0025: `GET /api/v1/surname-results?surname=Nowak` and `?surname=Zaremba` answered 200, schema 1.8, `archive.state` `NOT_SEARCHED`; `/pl/nazwisko/nowak` answered 200 with the chapter's not-searched line.
- `pnpm db:migrate` on a fresh local database applied 0001–0025 in order.
- `pnpm typecheck`, `lint`, `format:check`, `check:ids`: each exit 0.
- `pnpm test`: exit 0, 1,540 tests in 13 packages.
- `TEST_DATABASE_URL=… pnpm test:integration` against a local PostgreSQL: exit 0, 27 files, 316 tests.

## Not verified

- The `archive` step on the VM after this change: it runs after the merge.
