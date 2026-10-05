# 2026-10-05 — TASK-114: a recorded purchase lifts the free tree's 5-person cap

Branch `claude/tree-paid-tier`, on `origin/main` @ `de39642` (#130, TASK-111). No migration and no ADR.

## Changed

- `packages/accounts/src/purchases.ts`: `Purchases.hasPurchase(userId)`. It is true when any row of `accounts.purchases` names the account. Every sold tier unlocks the tree (D-025, ADR-0037 §2.1), and a purchase is a one-time payment, so nothing expires.
- `apps/web/src/lib/family-runtime.ts`: `createFamily` gets `hasPaidTier: (userId) => purchases.hasPurchase(userId)`, with a purchases store on the same accounts pool. `@name-atlas/family` still does not import `@name-atlas/accounts`. The function comes in through `FamilyDeps`, as TASK-112 provided.
- `packages/family/src/rules.ts`, `service.ts`: comments only (`noPaidTier` is the default, and the web replaces it).
- `tests/integration/src/family.test.ts`: one new test. Wired as the runtime wires it, on a pool logged in as `nameatlas_app`, a test-mode purchase is recorded for one account. That account's tree takes a sixth person (6 rows). Another account's tree answers `PERSON_LIMIT` (5 rows). The test deletes its purchase row afterwards, because the other tests in the file expect the owner to have no paid tier.
- Docs: `tasks/114-tree-paid-tier.md` (new), `docs/contracts/tree.md` (the `hasPaidTier` line), ADR-0037's "Implemented by" line, `STATUS.md`.

## The database role

- The family service and the purchases store share the accounts pool, which logs in as `nameatlas_app`. The family service sets no other role, only `app.user_id` and `app.invitation`. `hasPurchase` runs as its own query on the pool, outside the family transaction.
- `ops/vm/accounts-roles.sql` grants `nameatlas_app` `SELECT, INSERT, UPDATE, DELETE` on all tables in schema `accounts` (line 43), with default privileges for later tables (line 46). That covers `accounts.purchases`.
- The integration test runs those role files and reads the purchase as `nameatlas_app`. The paid owner's sixth person being saved shows the read succeeded.

## Verified (run locally on this branch, 2026-10-05)

- `pnpm lint`: exit 0, no findings.
- `pnpm typecheck`: exit 0.
- `pnpm test`: exit 0. `apps/web`: 83 files, 870 tests passed. `packages/accounts`: 50 tests passed. `packages/family`: 12 tests passed. Every other package's suite passed.
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `prettier --check` on the changed files: clean.
- `TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres pnpm test:integration`, against a throwaway PostgreSQL 16.14 cluster with `postgresql-16-postgis-3` installed in this session (Docker was not used): 37 files, 448 tests passed. The new test passed in `family.test.ts` (21 tests). The run logs one `pool_idle_client_error` (57P01, "terminating connection due to administrator command"). The same line appears when this suite runs on unchanged `main`.
- Not run: GitHub Actions, which is not starting jobs on this account. Also not run: the web app in a browser, and anything in production.

## Not done, and why

- **Production.** Nothing is turned on. `CHECKOUT_ENABLED` and `ACCOUNTS_DATABASE_URL` are unset there, migration 0036 is not on the VM, and only test-mode purchases can be stored.
- **UI.** No change. The full-tree message appears only after a `PERSON_LIMIT` redirect, which a paid owner never gets.
- **Matches up to second cousins.** Nothing limits them, because no tree matching exists (TASK-112 §2.4).
