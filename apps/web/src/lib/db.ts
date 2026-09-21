import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";

/**
 * The web app's database handle (TASK-029).
 *
 * **One pool per process**, which is what `ARCHITECTURE.md` §9 and ADR-0002 say
 * and what `packages/db/src/pool.ts` documents in its own header. Until now
 * every route did `createDb(createPool(loadDbConfig()))` and destroyed it in a
 * `finally`, so each request paid for a fresh TCP connect, TLS handshake and
 * authentication, and held its own backend for the duration.
 *
 * Measured before the change, against the full register: **59 PostgreSQL
 * connections for 60 concurrent requests**, falling back to idle afterwards.
 * `max_connections` defaults to 100. A crawler walking 248,406 sitemap URLs is
 * exactly the traffic that turns that into refused connections — and it is the
 * traffic that indexing invites.
 *
 * ## Why this is not simply a singleton
 *
 * On a serverless host each concurrent invocation is a **separate process with
 * its own module scope**, so this memo is per-instance, not per-deployment. The
 * connections in flight are `max × instances`. That is why `max` is 2 rather
 * than `pg`'s default of 10: ten instances at the default would exhaust a
 * 100-connection database on their own, before any other client.
 *
 * Keeping the process's connections low is half the answer; the other half is a
 * pooler in front of PostgreSQL — Supabase's Supavisor, or PgBouncer — which
 * multiplexes many short-lived clients onto few real backends. **On a
 * serverless deployment the app must point at the pooler, not at the database
 * directly**, and migrations and batch jobs must point at the direct
 * connection, because transaction-mode pooling does not carry session state.
 * `.env.example` says which is which.
 *
 * ## Why nothing closes it
 *
 * A pool is closed when the process ends, not when a request does. Destroying
 * it per request is what this replaces. A serverless instance is frozen between
 * invocations and its sockets are closed by the platform; a long-lived server
 * keeps them, which is the point.
 */

const MAX_CONNECTIONS_PER_INSTANCE = 2;

/** Ten seconds: long enough to serve a burst, short enough to release quickly. */
const IDLE_TIMEOUT_MS = 10_000;

/** Fail a request rather than hanging it when the database is unreachable. */
const CONNECTION_TIMEOUT_MS = 5_000;

let cached: Kysely<DB> | undefined;

/**
 * The shared handle. Created on first use so that a build, or a route that
 * never touches the database, needs no `DATABASE_URL`.
 */
export function db(): Kysely<DB> {
  cached ??= createDb(
    createPool(loadDbConfig(), {
      max: MAX_CONNECTIONS_PER_INSTANCE,
      idleTimeoutMillis: IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    }),
  );
  return cached;
}

/** Test-only: forget the memo so a test can observe a fresh handle. */
export function resetDbForTests(): void {
  cached = undefined;
}

export { MAX_CONNECTIONS_PER_INSTANCE };
