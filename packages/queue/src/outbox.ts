/**
 * The outbox (TASK-020, `docs/canonical/15` MCP 15-C).
 *
 * Two functions, and the split between them is the whole point:
 *
 * - {@link enqueueInTransaction} writes the job intent **inside the caller's
 *   database transaction**. It takes a `Transaction`, not a `Kysely`, so it
 *   cannot be called outside one — the guarantee is in the type, not in a
 *   comment. If the caller's transaction rolls back, the intent goes with it.
 * - {@link dispatchOutbox} publishes committed intents to BullMQ afterwards.
 *
 * Delivery is therefore **at-least-once**, never maybe-once. That is the right
 * trade here because every job this repository has is idempotent — a derivation
 * is keyed by `claim_key` and re-running it re-reads rather than duplicating — so
 * a duplicate costs a few milliseconds while a lost job is invisible.
 *
 * The dispatcher claims rows with `FOR UPDATE SKIP LOCKED`, so running two of
 * them is safe and neither blocks the other.
 */
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import type { Logger } from "@name-atlas/logging";
import { JOB_SCHEMAS, QUEUE_NAME, isJobName } from "./jobs.js";
import type { JobName } from "./jobs.js";

/** How many publication failures before an intent is parked as FAILED. */
export const MAX_ATTEMPTS = 5;

export interface OutboxIntent<N extends JobName = JobName> {
  readonly jobName: N;
  readonly payload: unknown;
  /**
   * Deduplication key, UNIQUE in the table. Two producers racing on the same
   * intent produce one row, and the loser's insert is refused rather than
   * silently doubling the work.
   */
  readonly idempotencyKey: string;
  readonly queueName?: string;
}

/**
 * Writes a job intent in the caller's transaction.
 *
 * Returns the row id, or `null` when an intent with that idempotency key already
 * exists — which is a success, not a failure: the work is already scheduled.
 *
 * The payload is validated here, so a malformed job cannot even be committed. A
 * queue whose payloads are only checked on the consuming side turns a producer
 * bug into a dead letter hours later.
 */
export async function enqueueInTransaction(
  trx: Transaction<DB>,
  intent: OutboxIntent,
): Promise<string | null> {
  const schema = JOB_SCHEMAS[intent.jobName];
  const parsed = schema.safeParse(intent.payload);
  if (!parsed.success) {
    throw new Error(
      `refusing to enqueue ${intent.jobName}: payload does not match its schema — ` +
        parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; "),
    );
  }

  const outboxEventId = uuidv7();
  const inserted = await trx
    .insertInto("runtime_outbox")
    .values({
      outbox_event_id: outboxEventId,
      queue_name: intent.queueName ?? QUEUE_NAME,
      job_name: intent.jobName,
      payload: JSON.stringify(parsed.data),
      idempotency_key: intent.idempotencyKey,
      status: "PENDING",
    })
    .onConflict((oc) => oc.column("idempotency_key").doNothing())
    .returning("outbox_event_id")
    .executeTakeFirst();

  return inserted?.outbox_event_id ?? null;
}

/** What a dispatch pass did. Numbers, so a caller can log or assert them. */
export interface DispatchReport {
  readonly claimed: number;
  readonly delivered: number;
  readonly failed: number;
  readonly parked: number;
}

/** The narrow slice of BullMQ's `Queue` the dispatcher needs; keeps tests honest. */
export interface JobPublisher {
  add: (name: string, data: unknown, options?: { jobId?: string }) => Promise<{ id?: string }>;
}

export interface DispatchOptions {
  readonly batchSize?: number;
  readonly log?: Logger;
}

/**
 * Publishes committed intents, marking each delivered or failed.
 *
 * One transaction per pass claims a batch with `FOR UPDATE SKIP LOCKED`; the
 * publishes happen outside it, because holding a database transaction open across
 * a network call to Redis is how a queue takes a database down with it.
 *
 * A row whose job name this build does not know is parked as `FAILED`
 * immediately rather than retried: the code that understands it is not coming
 * back on attempt two, and an unknown job name is a deployment mismatch worth
 * seeing.
 */
export async function dispatchOutbox(
  db: Kysely<DB>,
  publisher: JobPublisher,
  options: DispatchOptions = {},
): Promise<DispatchReport> {
  const batchSize = options.batchSize ?? 50;

  const claimed = await db.transaction().execute(async (trx) => {
    const rows = await sql<{
      outbox_event_id: string;
      job_name: string;
      payload: unknown;
      attempts: number;
    }>`
      SELECT outbox_event_id::text, job_name, payload, attempts
      FROM runtime_outbox
      WHERE status = 'PENDING' AND available_at <= now()
      ORDER BY available_at, created_at
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `.execute(trx);
    return rows.rows;
  });

  let delivered = 0;
  let failed = 0;
  let parked = 0;

  for (const row of claimed) {
    if (!isJobName(row.job_name)) {
      await park(db, row.outbox_event_id, `unknown job name "${row.job_name}"`);
      parked += 1;
      options.log?.error("outbox_unknown_job", {
        outbox_event_id: row.outbox_event_id,
        job_name: row.job_name,
      });
      continue;
    }
    try {
      // The outbox row id is the BullMQ job id, so a redelivery of the same
      // intent is the same job rather than a second one.
      const job = await publisher.add(row.job_name, row.payload, { jobId: row.outbox_event_id });
      await db
        .updateTable("runtime_outbox")
        .set({
          status: "DELIVERED",
          delivered_job_id: job.id ?? row.outbox_event_id,
          delivered_at: new Date(),
        })
        .where("outbox_event_id", "=", row.outbox_event_id)
        .execute();
      delivered += 1;
      options.log?.info("outbox_delivered", {
        outbox_event_id: row.outbox_event_id,
        job_name: row.job_name,
      });
    } catch (cause: unknown) {
      const attempts = row.attempts + 1;
      const reason = cause instanceof Error ? cause.message : String(cause);
      if (attempts >= MAX_ATTEMPTS) {
        await park(db, row.outbox_event_id, reason, attempts);
        parked += 1;
      } else {
        // Exponential backoff in the row itself, so no second table is needed.
        await db
          .updateTable("runtime_outbox")
          .set({
            attempts,
            last_error: reason,
            available_at: new Date(Date.now() + 2 ** attempts * 1000),
          })
          .where("outbox_event_id", "=", row.outbox_event_id)
          .execute();
        failed += 1;
      }
      options.log?.warn("outbox_publish_failed", {
        outbox_event_id: row.outbox_event_id,
        attempts,
        parked: attempts >= MAX_ATTEMPTS,
        cause,
      });
    }
  }

  return { claimed: claimed.length, delivered, failed, parked };
}

/** Parks an intent as FAILED. Never deletes: an undeliverable intent is a finding. */
async function park(
  db: Kysely<DB>,
  outboxEventId: string,
  reason: string,
  attempts?: number,
): Promise<void> {
  await db
    .updateTable("runtime_outbox")
    .set({
      status: "FAILED",
      last_error: reason,
      ...(attempts === undefined ? {} : { attempts }),
    })
    .where("outbox_event_id", "=", outboxEventId)
    .execute();
}
