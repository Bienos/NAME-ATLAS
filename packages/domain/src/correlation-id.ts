/**
 * Request/run correlation ID helper.
 *
 * Used to tag a single request or worker run so its log lines can be
 * traced end to end (ARCHITECTURE.md §9, ADR-0001: structured logs +
 * request IDs from the first backend, OpenTelemetry progressively).
 * A correlation ID is transport/observability state, not a domain
 * identifier — it is never stored as a foreign key on a domain row.
 */
import { uuidv7 } from "./uuid.js";

/** Generates a new correlation ID. Currently a UUIDv7; treat as opaque. */
export function createCorrelationId(): string {
  return uuidv7();
}
