import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  DERIVE_SURNAME_CLAIMS,
  MAX_ATTEMPTS,
  dispatchOutbox,
  enqueueInTransaction,
} from "@name-atlas/queue";
import type { JobPublisher } from "@name-atlas/queue";

/**
 * TASK-020 — the runtime outbox against a real PostgreSQL.
 *
 * The property under test is the one the outbox exists for: a job intent and the
 * domain write that caused it either both survive or both vanish. That cannot be
 * asserted against a mock database, so it is asserted here.
 *
 * Redis is not involved. The publisher is a stub, which is what makes the failure
 * cases — a publish that throws, an unknown job name — testable at all.
 */

/** Records what it was asked to publish, and can be told to fail. */
function stubPublisher(behaviour: { failTimes?: number } = {}): JobPublisher & {
  readonly published: { name: string; jobId?: string }[];
  calls: number;
} {
  let remaining = behaviour.failTimes ?? 0;
  const published: { name: string; jobId?: string }[] = [];
  return {
    published,
    calls: 0,
    add(name, _data, options) {
      this.calls += 1;
      if (remaining > 0) {
        remaining -= 1;
        return Promise.reject(new Error("redis unavailable"));
      }
      published.push({ name, jobId: options?.jobId });
      return Promise.resolve({ id: options?.jobId ?? "generated-id" });
    },
  };
}

const PAYLOAD = { surname: "NOWAK", correlationId: "01a0c30a-c803-7665-bb5e-5cdd6c8b2406" };

describe("runtime outbox (TASK-020)", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function rows(): Promise<
    { status: string; attempts: number; job_name: string; delivered_job_id: string | null }[]
  > {
    const result = await sql<{
      status: string;
      attempts: number;
      job_name: string;
      delivered_job_id: string | null;
    }>`
      SELECT status::text, attempts, job_name, delivered_job_id
      FROM runtime_outbox ORDER BY created_at
    `.execute(db());
    return result.rows;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  beforeEach(async () => {
    await sql`DELETE FROM runtime_outbox`.execute(db());
  });

  it("writes the intent inside the caller's transaction", async () => {
    await db()
      .transaction()
      .execute(async (trx) =>
        enqueueInTransaction(trx, {
          jobName: DERIVE_SURNAME_CLAIMS,
          payload: PAYLOAD,
          idempotencyKey: "derive:nowak:1",
        }),
      );
    const stored = await rows();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      status: "PENDING",
      attempts: 0,
      job_name: DERIVE_SURNAME_CLAIMS,
    });
  });

  it("loses the intent when the caller's transaction rolls back — the whole point", async () => {
    // Without the outbox this is the failure mode: a job enqueued for work that
    // was never committed.
    await expect(
      db()
        .transaction()
        .execute(async (trx) => {
          await enqueueInTransaction(trx, {
            jobName: DERIVE_SURNAME_CLAIMS,
            payload: PAYLOAD,
            idempotencyKey: "derive:nowak:rollback",
          });
          throw new Error("the domain write failed");
        }),
    ).rejects.toThrow("the domain write failed");
    expect(await rows()).toHaveLength(0);
  });

  it("refuses a payload that does not match its schema, before it can commit", async () => {
    await expect(
      db()
        .transaction()
        .execute(async (trx) =>
          enqueueInTransaction(trx, {
            jobName: DERIVE_SURNAME_CLAIMS,
            payload: { surname: "" },
            idempotencyKey: "derive:bad",
          }),
        ),
    ).rejects.toThrow(/does not match its schema/u);
    expect(await rows()).toHaveLength(0);
  });

  it("deduplicates on the idempotency key rather than doubling the work", async () => {
    const enqueue = async (): Promise<string | null> =>
      db()
        .transaction()
        .execute(async (trx) =>
          enqueueInTransaction(trx, {
            jobName: DERIVE_SURNAME_CLAIMS,
            payload: PAYLOAD,
            idempotencyKey: "derive:nowak:same",
          }),
        );
    const first = await enqueue();
    const second = await enqueue();
    expect(first).not.toBeNull();
    // Already scheduled is a success, not a failure.
    expect(second).toBeNull();
    expect(await rows()).toHaveLength(1);
  });

  it("publishes a committed intent and marks it delivered with the queue's job id", async () => {
    const eventId = await db()
      .transaction()
      .execute(async (trx) =>
        enqueueInTransaction(trx, {
          jobName: DERIVE_SURNAME_CLAIMS,
          payload: PAYLOAD,
          idempotencyKey: "derive:nowak:deliver",
        }),
      );
    const publisher = stubPublisher();
    const report = await dispatchOutbox(db(), publisher);

    expect(report).toEqual({ claimed: 1, delivered: 1, failed: 0, parked: 0 });
    // The outbox row id is the job id, so a redelivery is the same job.
    expect(publisher.published).toEqual([{ name: DERIVE_SURNAME_CLAIMS, jobId: eventId }]);
    const stored = await rows();
    expect(stored[0]).toMatchObject({ status: "DELIVERED", delivered_job_id: eventId });
  });

  it("does not publish the same intent twice across two passes", async () => {
    await db()
      .transaction()
      .execute(async (trx) =>
        enqueueInTransaction(trx, {
          jobName: DERIVE_SURNAME_CLAIMS,
          payload: PAYLOAD,
          idempotencyKey: "derive:nowak:once",
        }),
      );
    const publisher = stubPublisher();
    await dispatchOutbox(db(), publisher);
    const second = await dispatchOutbox(db(), publisher);
    expect(second).toEqual({ claimed: 0, delivered: 0, failed: 0, parked: 0 });
    expect(publisher.published).toHaveLength(1);
  });

  it("backs off and retries a failed publish rather than losing it", async () => {
    await db()
      .transaction()
      .execute(async (trx) =>
        enqueueInTransaction(trx, {
          jobName: DERIVE_SURNAME_CLAIMS,
          payload: PAYLOAD,
          idempotencyKey: "derive:nowak:retry",
        }),
      );
    const publisher = stubPublisher({ failTimes: 1 });
    const first = await dispatchOutbox(db(), publisher);
    expect(first).toEqual({ claimed: 1, delivered: 0, failed: 1, parked: 0 });

    const afterFailure = await rows();
    expect(afterFailure[0]).toMatchObject({ status: "PENDING", attempts: 1 });
    expect(afterFailure[0]?.delivered_job_id).toBeNull();

    // Backoff puts it in the future, so the next pass skips it.
    expect(await dispatchOutbox(db(), publisher)).toEqual({
      claimed: 0,
      delivered: 0,
      failed: 0,
      parked: 0,
    });

    // Once due again, it delivers.
    await sql`UPDATE runtime_outbox SET available_at = now() - interval '1 second'`.execute(db());
    expect(await dispatchOutbox(db(), publisher)).toEqual({
      claimed: 1,
      delivered: 1,
      failed: 0,
      parked: 0,
    });
  });

  it("parks an intent as FAILED after the attempt limit, and never deletes it", async () => {
    await db()
      .transaction()
      .execute(async (trx) =>
        enqueueInTransaction(trx, {
          jobName: DERIVE_SURNAME_CLAIMS,
          payload: PAYLOAD,
          idempotencyKey: "derive:nowak:park",
        }),
      );
    const publisher = stubPublisher({ failTimes: MAX_ATTEMPTS });
    for (let pass = 0; pass < MAX_ATTEMPTS; pass += 1) {
      await sql`UPDATE runtime_outbox SET available_at = now() - interval '1 second'`.execute(db());
      await dispatchOutbox(db(), publisher);
    }
    const stored = await rows();
    // Kept, with the reason: an undeliverable intent is a finding, not litter.
    expect(stored).toHaveLength(1);
    expect(stored[0]?.status).toBe("FAILED");
    expect(stored[0]?.attempts).toBe(MAX_ATTEMPTS);
  });

  it("parks an unknown job name immediately instead of retrying it", async () => {
    // A deployment mismatch: the code that understands this name is not coming
    // back on attempt two.
    await sql`
      INSERT INTO runtime_outbox (outbox_event_id, queue_name, job_name, payload, idempotency_key)
      VALUES (gen_random_uuid(), 'name-atlas-runtime', 'from-the-future', '{}'::jsonb, 'future:1')
    `.execute(db());
    const publisher = stubPublisher();
    expect(await dispatchOutbox(db(), publisher)).toEqual({
      claimed: 1,
      delivered: 0,
      failed: 0,
      parked: 1,
    });
    expect(publisher.published).toHaveLength(0);
    expect((await rows())[0]?.status).toBe("FAILED");
  });

  it("the database refuses a DELIVERED row with no job id", async () => {
    // The constraint, not the code, is what guarantees the two systems stay
    // reconcilable.
    await expect(
      sql`
        INSERT INTO runtime_outbox
          (outbox_event_id, queue_name, job_name, payload, idempotency_key, status, delivered_at)
        VALUES (gen_random_uuid(), 'q', ${DERIVE_SURNAME_CLAIMS}, '{}'::jsonb, 'bad:1',
                'DELIVERED', now())
      `.execute(db()),
    ).rejects.toThrow(/runtime_outbox_delivered_has_job_id/u);
  });

  it("respects the batch size, so one pass cannot monopolise the loop", async () => {
    for (let i = 0; i < 5; i += 1) {
      await db()
        .transaction()
        .execute(async (trx) =>
          enqueueInTransaction(trx, {
            jobName: DERIVE_SURNAME_CLAIMS,
            payload: PAYLOAD,
            idempotencyKey: `derive:batch:${String(i)}`,
          }),
        );
    }
    const publisher = stubPublisher();
    expect((await dispatchOutbox(db(), publisher, { batchSize: 2 })).claimed).toBe(2);
    expect((await dispatchOutbox(db(), publisher, { batchSize: 2 })).claimed).toBe(2);
    expect((await dispatchOutbox(db(), publisher, { batchSize: 2 })).claimed).toBe(1);
  });
});
