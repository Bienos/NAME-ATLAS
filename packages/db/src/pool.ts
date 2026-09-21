import { Pool } from "pg";
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
export function createPool(config: DbConfig, onIdleError: IdleErrorHandler = reportToStderr): Pool {
  const pool = new Pool({ connectionString: config.databaseUrl });
  pool.on("error", onIdleError);
  return pool;
}
