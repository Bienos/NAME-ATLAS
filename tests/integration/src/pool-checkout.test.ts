import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import type { Kysely } from "kysely";
import { CheckoutWaitTimeoutError, createDb, createPool, queueCheckouts } from "@name-atlas/db";
import type { DB } from "@name-atlas/db";
import { startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";

/**
 * TASK-132 — a query waits for a busy connection with a limit of its own.
 *
 * TASK-130 found a directory page answering 500 on production: three queries
 * on an instance's two connections, and `pg-pool` gave the third up after its
 * `connectionTimeoutMillis`, the limit meant for opening a connection. Here the
 * same shape runs against PostgreSQL with short times: two connections, a
 * 200 ms connection timeout, and queries that hold their connection for 600 ms.
 */
describe("waiting for a busy connection (TASK-132)", () => {
  let database: TestDatabase | undefined;

  beforeAll(async () => {
    database = await startTestDatabase();
  }, 300_000);

  afterAll(async () => {
    await database?.stop();
  });

  function url(): string {
    if (!database) throw new Error("test database was not started");
    return database.connectionUri;
  }

  const hold = (db: Kysely<DB>) => sql`SELECT pg_sleep(0.6)`.execute(db);

  async function threeAtOnce(db: Kysely<DB>): Promise<PromiseSettledResult<unknown>[]> {
    try {
      return await Promise.allSettled([hold(db), hold(db), hold(db)]);
    } finally {
      await db.destroy();
    }
  }

  it("reproduces TASK-130: the pool alone fails the third query after its connection timeout", async () => {
    const pool = createPool(
      { databaseUrl: url() },
      { max: 2, connectionTimeoutMillis: 200, onIdleError: () => undefined },
    );
    const results = await threeAtOnce(createDb(pool));
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled", "rejected"]);
    const third = results[2] as PromiseRejectedResult;
    expect((third.reason as Error).message).toBe("timeout exceeded when trying to connect");
  });

  it("serves all three in turn when checkouts are queued, with the same connection timeout", async () => {
    const pool = createPool(
      { databaseUrl: url() },
      { max: 2, connectionTimeoutMillis: 200, onIdleError: () => undefined },
    );
    const results = await threeAtOnce(
      createDb(queueCheckouts(pool, { max: 2, waitMillis: 5_000 })),
    );
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled", "fulfilled"]);
  });

  it("still fails a query that waits past the queue's own limit", async () => {
    const pool = createPool(
      { databaseUrl: url() },
      { max: 1, connectionTimeoutMillis: 200, onIdleError: () => undefined },
    );
    const db = createDb(queueCheckouts(pool, { max: 1, waitMillis: 200 }));
    try {
      const [first, second] = await Promise.allSettled([hold(db), hold(db)]);
      expect(first?.status).toBe("fulfilled");
      expect((second as PromiseRejectedResult).reason).toBeInstanceOf(CheckoutWaitTimeoutError);
    } finally {
      await db.destroy();
    }
  });

  it("still fails at once when the server refuses the connection", async () => {
    const pool = createPool(
      { databaseUrl: "postgres://nobody:secret@127.0.0.1:1/none" },
      { max: 2, connectionTimeoutMillis: 200, onIdleError: () => undefined },
    );
    const db = createDb(queueCheckouts(pool, { max: 2, waitMillis: 5_000 }));
    const started = Date.now();
    try {
      await expect(sql`SELECT 1`.execute(db)).rejects.toThrow(/ECONNREFUSED/u);
      expect(Date.now() - started).toBeLessThan(2_000);
    } finally {
      await db.destroy();
    }
  });
});
