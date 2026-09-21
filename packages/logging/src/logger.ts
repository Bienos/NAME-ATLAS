/**
 * The structured logger every service writes through (TASK-019).
 *
 * One JSON object per line on stdout, so a log shipper can parse it and a
 * developer can read it with `jq`. `ARCHITECTURE.md` §9 and ADR-0001 ask for
 * structured logs and request IDs from the first backend, with OpenTelemetry
 * arriving progressively — this is the "from the first backend" half, and it is
 * deliberately not a tracing library.
 *
 * Three properties matter more than features:
 *
 * - **Every line carries a correlation ID**, so one request's lines can be found
 *   among everything else. A logger created without one generates it.
 * - **Every value is redacted before it is written** (`redact.ts`), so a
 *   connection string or an authorisation header cannot reach a log through a
 *   field name nobody thought about.
 * - **Logging never throws.** A failure to serialise is caught and reported as a
 *   log line about the failure. A logger that can break a request is worse than
 *   no logger.
 */
import { createCorrelationId } from "@name-atlas/domain";
import { redact } from "./redact.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LogFields {
  readonly [key: string]: unknown;
}

export interface Logger {
  readonly correlationId: string;
  debug: (event: string, fields?: LogFields) => void;
  info: (event: string, fields?: LogFields) => void;
  warn: (event: string, fields?: LogFields) => void;
  error: (event: string, fields?: LogFields) => void;
  /** A logger with the same correlation ID and extra fields on every line. */
  child: (fields: LogFields) => Logger;
}

export interface LoggerOptions {
  /** Which service is speaking: `web`, `admin`, `worker`, a CLI name. */
  readonly service: string;
  /** Reuse an inbound request's ID; a new one is generated when absent. */
  readonly correlationId?: string;
  /** Lines below this level are dropped. Defaults to `LOG_LEVEL`, else `info`. */
  readonly level?: LogLevel;
  /** Fields repeated on every line. */
  readonly base?: LogFields;
  /** Injectable for tests. Defaults to `console.log`. */
  readonly write?: (line: string) => void;
  /** Injectable for tests. */
  readonly now?: () => Date;
}

function levelFromEnv(env: Record<string, string | undefined>): LogLevel {
  const raw = env["LOG_LEVEL"]?.toLowerCase();
  return raw === "debug" || raw === "info" || raw === "warn" || raw === "error" ? raw : "info";
}

export function createLogger(options: LoggerOptions): Logger {
  const correlationId = options.correlationId ?? createCorrelationId();
  const threshold = LEVEL_ORDER[options.level ?? levelFromEnv(process.env)];
  const write = options.write ?? ((line: string) => void console.log(line));
  const now = options.now ?? (() => new Date());
  const base = options.base ?? {};

  function emit(level: LogLevel, event: string, fields: LogFields): void {
    if (LEVEL_ORDER[level] < threshold) return;
    try {
      write(
        JSON.stringify({
          timestamp: now().toISOString(),
          level,
          service: options.service,
          event,
          correlationId,
          ...(redact({ ...base, ...fields }) as Record<string, unknown>),
        }),
      );
    } catch (cause: unknown) {
      // Never let logging break the caller. Report the failure, drop the fields.
      try {
        write(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "error",
            service: options.service,
            event: "log_serialisation_failed",
            correlationId,
            original_event: event,
            reason: cause instanceof Error ? cause.message : String(cause),
          }),
        );
      } catch {
        // Nothing further is safe to attempt.
      }
    }
  }

  const logger: Logger = {
    correlationId,
    debug: (event, fields = {}) => emit("debug", event, fields),
    info: (event, fields = {}) => emit("info", event, fields),
    warn: (event, fields = {}) => emit("warn", event, fields),
    error: (event, fields = {}) => emit("error", event, fields),
    child: (fields) =>
      createLogger({
        ...options,
        correlationId,
        base: { ...base, ...fields },
      }),
  };
  return logger;
}
