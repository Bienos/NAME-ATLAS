/**
 * `@name-atlas/logging` — structured logs with a correlation ID on every line,
 * and redaction that runs before anything is written (TASK-019).
 *
 * Deliberately not a tracing library. `ARCHITECTURE.md` §9 asks for structured
 * logs and request IDs from the first backend and for OpenTelemetry to arrive
 * progressively; this is the former, with no vendor and no dependency beyond the
 * correlation-ID helper.
 */
export { createLogger } from "./logger.js";
export type { Logger, LoggerOptions, LogFields, LogLevel } from "./logger.js";
export { redact, scrubCredentials, REDACTED } from "./redact.js";
