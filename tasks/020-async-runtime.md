# TASK-020 — the asynchronous runtime: Redis, BullMQ and the outbox

- **Status:** IMPLEMENTED 2026-09-21.
- **Milestone:** M3's prerequisite. ADR-0001 deferred Redis and BullMQ to M3 and says introducing them
  then "is an expected, planned change, not a stack revision, and needs no new ADR".
- **Canonical basis:** `docs/canonical/15` MODEL CHANGE PROPOSAL 15-C (the runtime outbox), §6 (run
  types), §7 (run status); ADR-0001.

## 1. Goal

Work can be scheduled by a database transaction and performed by a separate process, without a crash
between the two losing it.

## 2. Why an outbox rather than enqueue-and-hope

Creating a run in PostgreSQL and enqueueing a job in Redis are two writes to two systems. A crash
between them leaves a run with no job, or a job pointing at state that rolled back. Neither fails
loudly: the work simply never happens.

So the intent is written **inside the caller's database transaction** and published afterwards.
`enqueueInTransaction` takes a `Transaction`, not a `Kysely`, so it cannot be called outside one — the
guarantee is in the type, not in a comment.

That makes delivery **at-least-once**. The trade is right here because every job is idempotent: a
derivation is keyed by `claim_key` and re-running it re-reads rather than duplicating, so a duplicate
costs milliseconds while a lost job is invisible. Proven by running: enqueuing the same surname twice
left the claim count unchanged at 8.

## 3. In scope

1. **Migration `0013_runtime_outbox`** — the table, with constraints that keep the two systems
   reconcilable (`DELIVERED` requires a job id and a timestamp), a UNIQUE idempotency key, and a
   partial index on the pending set only.
2. **`packages/queue`** — the job contract (one Zod schema per job, validated on both sides), the
   Redis connection, `enqueueInTransaction` and `dispatchOutbox`.
3. **`apps/worker`** — a real process: the outbox dispatcher polling PostgreSQL, and the BullMQ
   consumer running jobs, both shutting down cleanly on a signal.
4. **One job**, `derive-surname-claims`, running all four derivations. `docs/canonical/15` §6 lists
   eight run types; seven describe work no module performs yet, and a queue full of unimplemented job
   names is scaffolding, not capability.
5. **`pnpm enqueue:derive`** and **`pnpm worker`**.

## 4. Out of scope

`ResearchPlan` and `ResearchModuleRun` (MCP 15-A and 15-B — nothing plans modules yet), the wider
`ResearchRunStatus` enum of §7 (no consumer for the extra states), `ProjectionBuild` (MCP 15-D defers
it), Temporal, scheduled jobs, dead-letter surfacing in the admin console, and the seven unimplemented
run types.

## 5. Acceptance criteria

- **AC-1** An intent committed in a transaction survives; one whose transaction rolls back does not.
- **AC-2** A payload that fails its schema cannot be committed.
- **AC-3** Two enqueues of one idempotency key produce one row, and the second reports success.
- **AC-4** A dispatched intent is marked `DELIVERED` with the queue's job id; a second pass claims
  nothing.
- **AC-5** A failed publish backs off, retries, and is parked `FAILED` after the attempt limit —
  never deleted.
- **AC-6** An unknown job name is parked immediately, not retried.
- **AC-7** The database refuses a `DELIVERED` row with no job id.
- **AC-8** End to end against real Redis and the real register: enqueue, dispatch, consume, derive,
  and the job runs under the **producer's** correlation ID.
- **AC-9** Running the same job twice does not duplicate a claim.

## 6. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration && pnpm build
redis-server --daemonize yes
REDIS_URL=redis://localhost:6379 DATABASE_URL=… pnpm worker
DATABASE_URL=… pnpm enqueue:derive "KOWALCZYK"
```

## 7. Do not

- Do not enqueue outside a transaction, or add an overload that permits it.
- Do not hold a database transaction open across a publish to Redis.
- Do not delete a parked intent. An undeliverable one is a finding.
- Do not add a job name whose handler does not exist.
