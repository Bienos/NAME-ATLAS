import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The runtime outbox (TASK-020, per `docs/canonical/15` MODEL CHANGE PROPOSAL
 * 15-C).
 *
 * Creating a `ResearchRun` in PostgreSQL and enqueueing a BullMQ job in Redis are
 * two writes to two systems. Without an outbox a crash between them leaves either
 * a run with no job, or a job pointing at state that was rolled back. Both are
 * silent: nothing fails, the work simply never happens.
 *
 * So the job intent is written **inside the same transaction as the domain
 * write**, and a dispatcher publishes it afterwards. That makes delivery
 * at-least-once rather than maybe-once, which is the trade a queue should make:
 * a duplicated derivation is idempotent by construction (`claim_key` is unique
 * per claim), whereas a lost one is invisible.
 *
 * `status` is the dispatcher's own state, not domain state:
 *
 * - `PENDING` — committed, not yet published.
 * - `DELIVERED` — accepted by the queue, with the queue's job id recorded so the
 *   two systems can be reconciled by hand if they ever disagree.
 * - `FAILED` — publication failed `attempts` times; kept, never deleted, because
 *   an undeliverable intent is a finding.
 *
 * `available_at` gives the dispatcher a backoff without a second table, and the
 * partial index keeps the dispatcher's query on the pending set only, which stays
 * small while the table grows.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE TYPE outbox_status AS ENUM ('PENDING', 'DELIVERED', 'FAILED')`.execute(db);

  await sql`
    CREATE TABLE runtime_outbox (
      outbox_event_id   uuid PRIMARY KEY,
      -- The queue and job name this intent publishes to. Text, not an enum: a
      -- new job type must not require a migration.
      queue_name        text NOT NULL,
      job_name          text NOT NULL,
      -- The job's payload, validated by the queue package's schema on both
      -- sides. Stored as jsonb so a stuck intent can be inspected in SQL.
      payload           jsonb NOT NULL,
      -- Deduplication key. UNIQUE, so the same intent cannot be enqueued twice
      -- even if the producer retries: the second insert is refused.
      idempotency_key   text NOT NULL UNIQUE,
      status            outbox_status NOT NULL DEFAULT 'PENDING',
      attempts          integer NOT NULL DEFAULT 0,
      last_error        text,
      -- The queue's own id once accepted, so the two systems are reconcilable.
      delivered_job_id  text,
      available_at      timestamptz NOT NULL DEFAULT now(),
      created_at        timestamptz NOT NULL DEFAULT now(),
      delivered_at      timestamptz,
      CONSTRAINT runtime_outbox_delivered_has_job_id
        CHECK (status <> 'DELIVERED' OR delivered_job_id IS NOT NULL),
      CONSTRAINT runtime_outbox_delivered_has_timestamp
        CHECK ((status = 'DELIVERED') = (delivered_at IS NOT NULL)),
      CONSTRAINT runtime_outbox_attempts_non_negative CHECK (attempts >= 0)
    )
  `.execute(db);

  // The dispatcher only ever reads the pending set, so only the pending set is
  // indexed. A delivered row costs nothing to keep and nothing to skip.
  await sql`
    CREATE INDEX runtime_outbox_pending
      ON runtime_outbox (available_at, created_at)
      WHERE status = 'PENDING'
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE runtime_outbox`.execute(db);
  await sql`DROP TYPE outbox_status`.execute(db);
}
