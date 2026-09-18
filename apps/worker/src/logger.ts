/**
 * Minimal structured logger. One JSON line per call, always including a
 * timestamp and (when provided) a correlation ID (ARCHITECTURE.md §9 —
 * structured logs + request IDs from the first backend; OpenTelemetry
 * arrives progressively, not in TASK-001).
 */
export interface LogFields {
  readonly [key: string]: unknown;
}

export function logStructured(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  fields: LogFields = {},
): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  });
  console.log(line);
}
