/**
 * Redaction, applied before anything is written (TASK-019).
 *
 * Two independent dangers, so two independent defences:
 *
 * 1. **A field named after a secret.** `password`, `token`, `authorization`,
 *    `DATABASE_URL` and their kin are replaced by a marker, matched on the field
 *    name, recursively, whatever the value's type.
 * 2. **A secret inside a string that is not named after one.** A connection
 *    string reaches a log through an error message far more often than through a
 *    field called `password` — `pg`'s own errors and stack traces carry it. So
 *    every string value is also scrubbed for credentials.
 *
 * `docs/canonical/19` §85 requires cookies, authorisation, email and source
 * secrets redacted in anything that captures errors, and §84 forbids permanent
 * payload logging. This is the smallest thing that honours both without a
 * vendor.
 *
 * Pure and dependency-free, so every rule below is a unit test.
 */

export const REDACTED = "[redacted]";

/**
 * Field names whose value never reaches a log.
 *
 * Matched case-insensitively as a **substring**, so `DATABASE_URL`,
 * `databaseUrl` and `db_url_secret` are all caught by `url`... which would also
 * catch a harmless `source_url`. That is the wrong trade: a published dataset URL
 * is useful in a log and is not a secret. So `url` is not in the list, and
 * connection strings are caught by the string scrubber below instead, which sees
 * them wherever they appear rather than only where they are named.
 */
const SECRET_NAME_PARTS: readonly string[] = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "auth_header",
  "cookie",
  "session_id",
  "credential",
  "private_key",
  "connection_string",
  "connectionstring",
  "database_url",
  "databaseurl",
  "email",
  "e_mail",
];

function isSecretName(name: string): boolean {
  const lowered = name.toLowerCase();
  return SECRET_NAME_PARTS.some((part) => lowered.includes(part));
}

/**
 * Removes credentials from a string.
 *
 * Any `scheme://user:password@host` becomes `scheme://[redacted]@host`, which
 * keeps the host — genuinely useful when diagnosing a connection failure — and
 * loses the part that must never be stored. Applied to every string the logger
 * writes, including error messages and stack traces, because that is where a
 * connection string actually travels.
 */
export function scrubCredentials(value: string): string {
  return value.replace(/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^\s/@]*:[^\s/@]*@/gu, `$1${REDACTED}@`);
}

/**
 * Recursively redacts a value for logging.
 *
 * Cycles are replaced with a marker rather than throwing: a logger must never be
 * the reason a request fails. Depth is capped for the same reason.
 */
export function redact(value: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): unknown {
  if (depth > 6) return "[depth limit]";
  if (typeof value === "string") return scrubCredentials(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1, seen));
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubCredentials(value.message),
      // A stack is diagnostic and not personal data, but it does carry file
      // paths and sometimes a connection string, so it is scrubbed too.
      stack: value.stack === undefined ? undefined : scrubCredentials(value.stack),
    };
  }

  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSecretName(key) ? REDACTED : redact(inner, depth + 1, seen);
  }
  return out;
}
