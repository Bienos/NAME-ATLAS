# TASK-132 — A query waits its turn for a busy connection

- **Status:** IMPLEMENTED 2026-10-06 on `claude/loving-faraday-1pyo0y` (`docs/progress/2026-10-06-pool-checkout-wait.md`).
- **Requested by:** the project owner, 2026-10-06: "fix the connection pool timeout", after TASK-130. Its record leaves this open: renders on one instance share its two connections, and a third directory render at once could fail as `inne` did.
- **Depends on:** TASK-029, TASK-130.
- **Model guidance:** implementation session.

## 1. Goal

A query that finds the instance's connections busy waits its turn instead of failing after 5 s. Opening a connection to an unreachable database still fails after 5 s, and the instance still opens at most two.

## 2. In scope

- `packages/db/src/pool.ts`: `queueCheckouts(pool, { max, waitMillis })`, a pool for Kysely whose checkouts wait in a queue of their own. They reach `pg-pool` only when fewer than `max` are out, so `pg-pool`'s `connectionTimeoutMillis` times only the opening of a connection. `CheckoutWaitTimeoutError` is what a checkout fails with after `waitMillis`.
- `packages/db/src/kysely.ts`: `createDb` takes Kysely's `PostgresPool`, which a `pg` `Pool` already is.
- `apps/web/src/lib/db.ts`: the web handle queues its checkouts, waiting up to 30 s (`CHECKOUT_WAIT_MS`). `max` (2), the idle timeout (10 s) and the connection timeout (5 s) are unchanged.
- Unit tests for the queue, and an integration test that reproduces the production failure against PostgreSQL.

## 3. Out of scope

- The number of connections per instance, PgBouncer, the database.
- The worker, the admin app and the command-line tools, which keep their pools as they are.
- The directory's queries and their speed.

## 4. Acceptance criteria

- **AC-1.** Against PostgreSQL, two connections and three slow queries: the pool alone fails the third with "timeout exceeded when trying to connect"; with checkouts queued, all three succeed with the same connection timeout (integration test).
- **AC-2.** A checkout that waits past `waitMillis` fails with `CheckoutWaitTimeoutError`; a failed opening, and a second release, give back exactly one turn; checkouts are served in the order they asked (unit tests).
- **AC-3.** A refused connection still fails at once (integration test).
- **AC-4.** In the built app, a burst of directory pages that made `main`'s build answer 500 is answered 200 (local `next start`).
- **AC-5.** On production after deployment, the directory and a surname page still answer.

## 5. Verification

```bash
pnpm test
TEST_DATABASE_URL=… pnpm test:integration
pnpm test:golden
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm build
```
