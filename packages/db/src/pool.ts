import { Pool } from "pg";
import type { PoolClient } from "pg";
import type { PostgresPool } from "kysely";
import type { DbConfig } from "./config.js";

/**
 * How a pool reports an error raised on a connection nobody is awaiting.
 *
 * Kept as a parameter so `packages/db` stays free of a dependency on
 * `packages/logging`, and so a caller that has a real logger can pass one.
 */
export type IdleErrorHandler = (error: unknown) => void;

/**
 * Replaces the credentials in any `scheme://user:pass@host` inside a string.
 *
 * A deliberate copy of `packages/logging`'s `scrubCredentials`: this package has
 * no dependency on that one, and the alternative — leaving the message alone
 * because "a message is just a message" — is exactly the mistake
 * `packages/logging/src/redact.test.ts` documents. A connection string reaches a
 * log through `pg`'s **own error text** far more often than through a field
 * named `password`.
 */
function scrubCredentials(value: string): string {
  return value.replace(/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^\s/@]*:[^\s/@]*@/gu, "$1[redacted]@");
}

/**
 * The default: one JSON line on stderr, in the same shape the structured logger
 * emits, carrying the error's message and its SQLSTATE and nothing else.
 *
 * Two defences, because there are two ways a credential gets out. `pg` attaches
 * the offending `Client` to the error, and that object holds
 * `connectionParameters` — including the password — so **the error is never
 * serialised whole**. And the message itself can embed the connection string, so
 * it is **scrubbed** before it is written. The first version of this function
 * had only the first defence; review on 2026-09-21 caught the second.
 */
function reportToStderr(error: unknown): void {
  const message = scrubCredentials(error instanceof Error ? error.message : String(error));
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? scrubCredentials(String((error as { code: unknown }).code))
      : null;
  process.stderr.write(
    `${JSON.stringify({ level: "error", service: "db", event: "pool_idle_client_error", message, code })}\n`,
  );
}

/**
 * Creates a pooled PostgreSQL connection. One pool per process
 * (ARCHITECTURE.md §9, ADR-0002) — callers are responsible for calling
 * `pool.end()` on shutdown.
 *
 * **The `error` listener is not optional.** `pg` emits `error` on the pool when a
 * connection fails while it is idle — a network blip, a server restart, an
 * administrator terminating the backend — and an `EventEmitter` error with no
 * listener is an uncaught exception, which in Node ends the process. A pool
 * without this listener is a web server that a PostgreSQL restart can kill.
 *
 * Found on 2026-09-21: it also made `pnpm test:integration` exit non-zero while
 * every one of its 243 tests passed. The external-server teardown path drops its
 * throwaway database `WITH (FORCE)`, which terminates any connection still
 * closing, and the resulting FATAL `57P01` surfaced as an unhandled error — a red
 * CI run with nothing wrong in it. Handling the event fixes the real fault and
 * the false failure together.
 */
export interface PoolOptions {
  /**
   * Largest number of connections this pool opens. `pg`'s default is 10, which
   * is right for one long-lived server and wrong everywhere the process is
   * multiplied.
   *
   * On a serverless host each concurrent invocation is its own process with its
   * own pool, so the connections in flight are `max × instances`, not `max`.
   * Ten of those against a 100-connection database is ten instances before it
   * refuses. Two is the number that survives a crawl; the pooler in front
   * (Supabase's Supavisor, PgBouncer) is what multiplexes them onto the real
   * backends.
   */
  readonly max?: number;
  /** How long an unused connection is kept. Short on serverless: the process dies anyway. */
  readonly idleTimeoutMillis?: number;
  /** Fail a connection attempt rather than hanging a request forever. */
  readonly connectionTimeoutMillis?: number;
  readonly onIdleError?: IdleErrorHandler;
}

export function createPool(config: DbConfig, options: PoolOptions | IdleErrorHandler = {}): Pool {
  // The second parameter used to be the error handler alone. Both shapes are
  // accepted so existing callers and tests keep working unchanged.
  const opts: PoolOptions = typeof options === "function" ? { onIdleError: options } : options;
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ...(opts.max === undefined ? {} : { max: opts.max }),
    ...(opts.idleTimeoutMillis === undefined ? {} : { idleTimeoutMillis: opts.idleTimeoutMillis }),
    ...(opts.connectionTimeoutMillis === undefined
      ? {}
      : { connectionTimeoutMillis: opts.connectionTimeoutMillis }),
  });
  pool.on("error", opts.onIdleError ?? reportToStderr);
  return pool;
}

export interface CheckoutQueueOptions {
  /** The pool's own `max`: how many checkouts may be out at once. */
  readonly max: number;
  /** How long a checkout waits for one of them to come back before it fails. */
  readonly waitMillis: number;
}

/** What a checkout that waited `waitMillis` for a busy connection fails with. */
export class CheckoutWaitTimeoutError extends Error {
  constructor(waitMillis: number) {
    super(`no database connection came free within ${String(waitMillis)} ms`);
    this.name = "CheckoutWaitTimeoutError";
  }
}

/**
 * A pool whose checkouts wait their turn (TASK-132).
 *
 * `pg-pool` has one `connectionTimeoutMillis` for two different waits: opening
 * a new connection, and waiting in its queue for a busy one to come back. A
 * short value is right for the first, so a request fails fast when the database
 * is unreachable, and wrong for the second: on production a page's third query
 * gave up after 5 s while two slow queries held the instance's two connections
 * (TASK-130).
 *
 * So the waiting happens here, in a queue of its own with its own limit, and a
 * checkout reaches the pool only when fewer than `max` are out. The pool then
 * always has an idle connection or room to open one, never queues, and its
 * `connectionTimeoutMillis` times only the opening. Checkouts are served in the
 * order they asked.
 *
 * The result is what Kysely's `PostgresDialect` takes. It is not a `pg` `Pool`:
 * nothing else should check out from the pool behind it, or the count here is
 * wrong.
 */
export function queueCheckouts(pool: Pool, options: CheckoutQueueOptions): PostgresPool {
  let free = options.max;
  const waiting: (() => void)[] = [];

  function giveBack(): void {
    const next = waiting.shift();
    if (next === undefined) free += 1;
    else next();
  }

  function take(): Promise<void> {
    if (free > 0) {
      free -= 1;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const turn = (): void => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        const index = waiting.indexOf(turn);
        if (index !== -1) waiting.splice(index, 1);
        reject(new CheckoutWaitTimeoutError(options.waitMillis));
      }, options.waitMillis);
      waiting.push(turn);
    });
  }

  return {
    // Kysely reads these only to cancel a query, on a connection of its own.
    // `pg-pool` sets `Client` on every pool; `@types/pg` does not declare it.
    options: pool.options,
    Client: (pool as Pool & Pick<PostgresPool, "Client">).Client,
    end: () => pool.end(),
    async connect(): Promise<PoolClient> {
      await take();
      let client: PoolClient;
      try {
        client = await pool.connect();
      } catch (error) {
        // A failed opening holds nothing: the next in line may try.
        giveBack();
        throw error;
      }
      // `pg-pool` sets a fresh `release` on every checkout, so this wrapper
      // lasts for this checkout only. The turn is passed on once the
      // connection is back in the pool, and only once.
      const release = client.release;
      let released = false;
      client.release = (error?: Error | boolean) => {
        try {
          release(error);
        } finally {
          if (!released) {
            released = true;
            giveBack();
          }
        }
      };
      return client;
    },
  };
}
