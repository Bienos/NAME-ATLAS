#!/usr/bin/env tsx
/**
 * Enqueues a derivation the way a real producer must (TASK-020).
 *
 *   pnpm enqueue:derive "MELNYK"
 *
 * The point of the script is the transaction: the intent is written inside one,
 * alongside whatever domain write caused it, so it cannot be published for work
 * that was rolled back. Here the domain write is trivial, but the shape is the
 * shape a real caller uses.
 *
 * It does not touch Redis. The worker's dispatcher publishes what this commits —
 * which is exactly the separation being demonstrated.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { createCorrelationId } from "@name-atlas/domain";
import { createLogger } from "@name-atlas/logging";
import { DERIVE_SURNAME_CLAIMS, enqueueInTransaction } from "../src/index.js";

async function main(): Promise<void> {
  const surname = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (surname === undefined || surname === "") {
    throw new Error('usage: enqueue:derive "<surname>"');
  }
  const correlationId = createCorrelationId();
  const log = createLogger({ service: "enqueue", correlationId });
  const db = createDb(createPool(loadDbConfig()));
  try {
    const eventId = await db.transaction().execute(async (trx) =>
      enqueueInTransaction(trx, {
        jobName: DERIVE_SURNAME_CLAIMS,
        payload: { surname, correlationId },
        // Time-bucketed to the minute, so re-running immediately is deduplicated
        // while a later run is a genuinely new request.
        idempotencyKey: `${DERIVE_SURNAME_CLAIMS}:${surname}:${new Date().toISOString().slice(0, 16)}`,
      }),
    );
    log.info(eventId === null ? "already_enqueued" : "enqueued", {
      surname,
      outbox_event_id: eventId,
    });
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  log_failure(err);
});

function log_failure(err: unknown): void {
  createLogger({ service: "enqueue" }).error("enqueue_failed", { cause: err });
  process.exitCode = 1;
}
