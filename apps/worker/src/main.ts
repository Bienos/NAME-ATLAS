#!/usr/bin/env tsx
/**
 * The worker process (TASK-020).
 *
 * Two loops in one process, because at this size two processes would be
 * ceremony:
 *
 * 1. **The outbox dispatcher**, polling PostgreSQL for committed job intents and
 *    publishing them to BullMQ. Polling rather than `LISTEN/NOTIFY`: a poll
 *    recovers on its own after any outage, whereas a missed notification is lost
 *    silently, which is the failure the outbox exists to prevent.
 * 2. **The BullMQ consumer**, running the jobs.
 *
 * Both shut down on `SIGINT`/`SIGTERM` so a redeploy does not abandon a job
 * mid-flight.
 *
 *   REDIS_URL=… DATABASE_URL=… pnpm --filter worker run start
 */
import { Queue, Worker } from "bullmq";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { createLogger } from "@name-atlas/logging";
import {
  DERIVE_SURNAME_CLAIMS,
  JOB_SCHEMAS,
  QUEUE_NAME,
  createRedis,
  dispatchOutbox,
  isJobName,
  loadQueueConfig,
} from "@name-atlas/queue";
import { deriveSurnameClaims } from "./handlers.js";

/** How often the dispatcher looks for committed intents. */
const DISPATCH_INTERVAL_MS = 1000;

async function main(): Promise<void> {
  const log = createLogger({ service: "worker" });
  const db = createDb(createPool(loadDbConfig()));
  const connection = createRedis(loadQueueConfig());
  const queue = new Queue(QUEUE_NAME, { connection });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      // Never trust what was dequeued: a payload can outlive the code that wrote
      // it, and the same schema validated it on the way in.
      if (!isJobName(job.name)) {
        throw new Error(`unknown job name "${job.name}"`);
      }
      const payload = JOB_SCHEMAS[job.name].parse(job.data);
      // The job's own correlation ID, so its lines join the request that caused it.
      const jobLog = createLogger({
        service: "worker",
        correlationId: payload.correlationId,
        base: { job_id: job.id ?? null, job_name: job.name },
      });
      jobLog.info("job_started");
      const started = Date.now();
      switch (job.name) {
        case DERIVE_SURNAME_CLAIMS: {
          const result = await deriveSurnameClaims(db, payload, jobLog);
          jobLog.info("job_completed", {
            claims: result.claims,
            outcomes: result.outcomes,
            ms: Date.now() - started,
          });
          return result;
        }
      }
    },
    { connection, concurrency: 2 },
  );

  worker.on("failed", (job, error) => {
    log.error("job_failed", { job_id: job?.id ?? null, job_name: job?.name ?? null, cause: error });
  });

  let dispatching = true;
  const dispatcher = (async () => {
    while (dispatching) {
      try {
        const report = await dispatchOutbox(db, queue, { log });
        if (report.claimed > 0) log.info("outbox_dispatched", { ...report });
      } catch (cause: unknown) {
        // A dispatcher that dies on one bad pass stops every job in the system.
        log.error("outbox_dispatch_pass_failed", { cause });
      }
      await new Promise((resolve) => setTimeout(resolve, DISPATCH_INTERVAL_MS));
    }
  })();

  log.info("worker_started", { queue: QUEUE_NAME, dispatch_interval_ms: DISPATCH_INTERVAL_MS });

  const shutdown = async (signal: string): Promise<void> => {
    log.info("worker_stopping", { signal });
    dispatching = false;
    await dispatcher;
    await worker.close();
    await queue.close();
    connection.disconnect();
    await db.destroy();
    log.info("worker_stopped");
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void shutdown(signal).then(() => process.exit(0));
    });
  }
}

void main();
