import { createLogger } from "@name-atlas/logging";

/**
 * Worker entry point.
 *
 * TASK-001 scope: start, log a structured startup line with a correlation
 * ID, exit cleanly. No queue, no Redis, no BullMQ (ADR-0001) — those
 * arrive at M3 when asynchronous historical research requires them.
 *
 * Exported as a plain function (rather than only a top-level script) so it
 * can be exercised directly in a test without spawning a real process, and
 * so it never assumes it is called exactly once per process lifetime —
 * the idempotent-safe-by-construction constraint in TASK-001 §6 applies
 * even though this does no real work yet.
 */
export function runWorker(): { correlationId: string } {
  // Since TASK-019 this writes through the shared logger, so the worker's lines
  // are the same shape as the web app's and carry the same correlation field.
  const log = createLogger({ service: "worker" });
  log.info("worker_started");
  log.info("worker_exiting_cleanly");
  return { correlationId: log.correlationId };
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href;
if (isMain) {
  runWorker();
}
