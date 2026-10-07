# 2026-10-07 — The integration tests' migration and table lists name 0047

**Request.** The owner chose "1" (2026-10-07): a separate pull request into `main`, rather than a fix inside #190.

**The fault.** #187 added migration `0047_given_name_readings` and its table `given_name_readings`. Two integration tests still listed the migrations and tables as they stood before it, so `pnpm test:integration` failed on `main` @ `adef136` (3 tests in 2 files):
- `tests/integration/src/canonical-key-v2.test.ts` "refuses to migrate down while a sharp-s pair is stored": the first step down is now `0047_given_name_readings`, not `0046_purchases_fullnames_tier`;
- `tests/integration/src/extensions.test.ts` "records every migration as applied exactly once, in order": one migration more than listed;
- `tests/integration/src/extensions.test.ts` "creates exactly the … tables, and nothing else": one table more than listed.

GitHub Actions started no job in the repository at the time, so CI could not show it.

## What changed

- `canonical-key-v2.test.ts`: `0047_given_name_readings` is the first migration stepped down. Its down migration refuses only while a reading is stored, and none is.
- `extensions.test.ts`: `0047_given_name_readings` ends the list of applied migrations, and `given_name_readings` joins the expected tables in name order.
- `STATUS.md`: the "Last rewritten" line only.

## Verification (commands run, results as returned)

`TEST_DATABASE_URL` was a local PostgreSQL 16.14.

| Command | Result |
|---|---|
| `vitest run src/extensions.test.ts src/canonical-key-v2.test.ts` on `main` @ `adef136`, unchanged | 2 files failed, 3 tests failed, 7 passed |
| the same with this change | 2 files passed, 10 tests |
| `pnpm test:integration` with this change | 50 files, 546 tests passed |
| `pnpm format:check`, `check:ids` | exit 0 |

## Not verified

GitHub's CI did not run on this change; no job was being started in the repository.
