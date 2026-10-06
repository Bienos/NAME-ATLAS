# 2026-10-06 — TASK-132: a query waits its turn for a busy connection

Branch `claude/loving-faraday-1pyo0y`, restarted from `origin/main` at `02160d9` (#158), rebased onto `2d5c29b` (#150) and then onto `015b788` (#151) before the pull request. Task: `tasks/132-pool-checkout-wait.md`. Requested by the owner: "fix the connection pool timeout". Written as TASK-131. #151 then merged as TASK-131, so this is TASK-132, free on `main` with no pull request open.

## Observed before the change

- `pg-pool` 3.14.0 (`index.js`, `connect` and `newClient`) applies its one `connectionTimeoutMillis` to two waits:
  - opening a new connection;
  - waiting in its queue for a busy connection to come back. The error is the same for both: "timeout exceeded when trying to connect".
- `apps/web/src/lib/db.ts` sets it to 5 s, so that a request fails fast when the database is unreachable, with at most two connections per instance (TASK-029).
- On production after #156, `/pl/nazwiska/inne` failed with that error (TASK-130). TASK-130 made one render use one connection at a time. Renders on one instance still shared its two connections.
- Reproduced with `main`'s build (`02160d9`), one `next start` process on the synthetic register-sized database (TASK-129's): 40 directory pages not yet rendered, requested at once.
  - 8 answered `200` and 32 answered `500`, the slowest in 6.6 s.
  - The log held 128 "timeout exceeded when trying to connect" errors.
  - Ten pages at once all answered `200` in 10.6–11.9 s: on that database a query takes about half a second, so ten pages never made a query wait 5 s.

## Changed

- `packages/db/src/pool.ts`:
  - `queueCheckouts(pool, { max, waitMillis })` returns the pool Kysely's `PostgresDialect` takes.
  - A checkout waits in its own first-come queue until fewer than `max` are out, for at most `waitMillis`, then fails with `CheckoutWaitTimeoutError`.
  - Only then does it ask `pg-pool`, which therefore always has an idle connection or room for a new one. So `pg-pool`'s `connectionTimeoutMillis` times only the opening.
  - A failed opening gives its turn back. A checkout's turn passes on once, when its connection is back in the pool, however often it is released.
  - `options` and `Client` are the pool's own, which Kysely reads only to cancel a query.
  - Exported from `@name-atlas/db` with `CheckoutWaitTimeoutError` and `CheckoutQueueOptions`.
- `packages/db/src/kysely.ts`: `createDb` takes Kysely's `PostgresPool`. A `pg` `Pool` already satisfies it, so every other caller is unchanged.
- `apps/web/src/lib/db.ts`:
  - `db()` queues its checkouts, with `CHECKOUT_WAIT_MS` = 30 s, longer than the slowest directory page took in all on production (27.3 s, TASK-130).
  - `MAX_CONNECTIONS_PER_INSTANCE` (2), the 10 s idle timeout and `CONNECTION_TIMEOUT_MS` (5 s) are unchanged.
  - The two timeouts are exported for its test.
- Tests:
  - `packages/db/src/pool.test.ts`: four tests against a stand-in pool: `max` at once, in order; the wait limit; a failed opening; a double release.
  - `apps/web/src/lib/db.test.ts`: the wait is longer than the 5 s connection timeout.
  - `tests/integration/src/pool-checkout.test.ts` (new): against PostgreSQL, two connections, a 200 ms connection timeout, queries holding a connection for 600 ms.

## Verified

- `tests/integration/src/pool-checkout.test.ts` against the local PostgreSQL 16: 4 of 4 passed, four runs. It checks that:
  - the pool alone fails the third of three queries with "timeout exceeded when trying to connect", the production error;
  - with checkouts queued, all three succeed with the same connection timeout;
  - a query that waits past the queue's 200 ms fails with `CheckoutWaitTimeoutError`;
  - a refused connection (`127.0.0.1:1`) fails at once with `ECONNREFUSED`.
- `packages/db/src/pool.test.ts`: 8 of 8 passed. `apps/web/src/lib/db.test.ts`: 5 of 5.
- The same burst on this branch's build, the same database and process setup:
  - 40 of 40 answered `200`, the slowest in 45.4 s;
  - no "timeout exceeded" and no `CheckoutWaitTimeoutError` in the log.
- A second burst at once was answered 19 `200` and 21 `429`: the site's rate limit, 60 requests a minute per client (TASK-029).
- A surname page reached from the directory (`/pl/nazwisko/bench-139857`) answered `200` in 0.92 s.
- Full suite on `02160d9` plus this change, all exit 0:
  - `pnpm typecheck` and `pnpm lint`;
  - `pnpm test`: `packages/db` 15 tests, `apps/web` 944, `apps/admin` 14, `apps/worker` 2;
  - `pnpm test:integration` with `TEST_DATABASE_URL` (local PostgreSQL 16 + PostGIS): 487 tests in 42 files;
  - `pnpm test:golden`: 364 tests;
  - `pnpm build`.

- After the rebase onto `015b788` (#151; neither it nor #155 or #150 touches a file this change does), all exit 0:
  - `pnpm typecheck`, `pnpm lint`;
  - `pnpm format:check`: "All matched files use Prettier code style!";
  - `pnpm check:ids`: "every task, ADR, migration and decision number is used once";
  - `pnpm test`: `packages/db` 15, `apps/web` 952, `apps/admin` 14, `apps/worker` 2;
  - `pnpm test:integration`: 493 tests in 43 files;
  - `pnpm test:golden`: 364 tests;
  - `pnpm build`.

## Not verified

- AC-5, production: it needs the deployment.
- How long requests wait on production under a crawl. Locally, the queue turned 32 failures into answers, at up to 45 s. On production, where a directory query takes several seconds, a request waits longer, and one that waits more than 30 s for a connection fails with `CheckoutWaitTimeoutError`. The function's time limit is Vercel's default; `vercel.json` sets none.
- With the database unreachable and more than two requests at once on one instance, a later request now waits its turn, then fails 5 s into its own attempt, up to about 35 s, instead of failing after 5 s. A lone request still fails after 5 s.
- `pnpm test:e2e`: not run.
