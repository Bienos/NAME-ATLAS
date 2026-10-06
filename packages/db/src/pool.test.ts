import { describe, expect, it } from "vitest";
import type { Pool, PoolClient } from "pg";
import { CheckoutWaitTimeoutError, createPool, queueCheckouts } from "./pool.js";

/**
 * The pool's `error` listener. No database is needed: the point is that the
 * listener exists and that a raised error reaches it instead of the process.
 */
describe("createPool", () => {
  const config = { databaseUrl: "postgres://nobody:secret@127.0.0.1:1/none" };

  it("attaches exactly one error listener, so an idle failure cannot crash the process", async () => {
    const pool = createPool(config, () => undefined);
    expect(pool.listenerCount("error")).toBe(1);
    await pool.end();
  });

  it("routes a raised error to the handler rather than throwing", async () => {
    const seen: unknown[] = [];
    const pool = createPool(config, (error) => seen.push(error));
    const raised = Object.assign(new Error("terminating connection due to administrator command"), {
      code: "57P01",
    });
    // What `pg` does when a connection dies while idle.
    pool.emit("error", raised);
    expect(seen).toEqual([raised]);
    await pool.end();
  });

  it("scrubs a password embedded in the error's own message", async () => {
    // How a credential actually reaches a log: inside pg's own message text,
    // not in a field called `password` (packages/logging/src/redact.test.ts
    // documents the same vector). Caught by review 2026-09-21; the first
    // version of this handler wrote the message raw.
    const written: string[] = [];
    const original = process.stderr.write.bind(process.stderr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrow stub for one assertion
    (process.stderr as any).write = (chunk: string): boolean => {
      written.push(chunk);
      return true;
    };
    try {
      const pool = createPool(config);
      pool.emit(
        "error",
        new Error(
          'connection to server at "localhost" failed: ' +
            "postgres://atlas:SUPERSECRETPW@localhost:5432/name_atlas",
        ),
      );
      await pool.end();
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- restore
      (process.stderr as any).write = original;
    }
    const output = written.join("");
    expect(output).toContain("pool_idle_client_error");
    expect(output).not.toContain("SUPERSECRETPW");
    expect(output).toContain("[redacted]@localhost");
  });

  it("never lets a connection password reach the default report", async () => {
    // pg attaches the offending Client, whose connectionParameters hold the
    // password. The default handler must not serialise it.
    const written: string[] = [];
    const original = process.stderr.write.bind(process.stderr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrow stub for one assertion
    (process.stderr as any).write = (chunk: string): boolean => {
      written.push(chunk);
      return true;
    };
    try {
      const pool = createPool(config);
      pool.emit(
        "error",
        Object.assign(new Error("connection terminated"), {
          code: "57P01",
          client: { connectionParameters: { password: "SUPERSECRETPW" } },
        }),
      );
      await pool.end();
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- restore
      (process.stderr as any).write = original;
    }
    expect(written.join("")).toContain("pool_idle_client_error");
    expect(written.join("")).not.toContain("SUPERSECRETPW");
  });
});

/**
 * TASK-132 — checkouts wait their turn with a limit of their own. A stand-in
 * for `pg-pool` that counts what is out and, like it, gives each checkout a
 * fresh `release`; `tests/integration/src/pool-checkout.test.ts` runs the same
 * against PostgreSQL.
 */
describe("queueCheckouts", () => {
  function standIn(failures = 0) {
    const state = { out: 0, most: 0, asked: 0, failures };
    const pool = {
      options: {},
      Client: class {},
      end: async () => undefined,
      connect: async (): Promise<PoolClient> => {
        state.asked += 1;
        if (state.failures > 0) {
          state.failures -= 1;
          throw new Error("Connection terminated due to connection timeout");
        }
        state.out += 1;
        state.most = Math.max(state.most, state.out);
        let released = false;
        return {
          release: () => {
            // `pg-pool` throws on a second release of one checkout.
            if (released)
              throw new Error("Release called on client which has already been released");
            released = true;
            state.out -= 1;
          },
        } as unknown as PoolClient;
      },
    };
    return { pool: pool as unknown as Pool, state };
  }

  /** Whether a promise has settled by the next turn of the event loop. */
  async function settled(promise: Promise<unknown>): Promise<boolean> {
    let done = false;
    void promise.then(
      () => (done = true),
      () => (done = true),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    return done;
  }

  it("lets `max` checkouts out at once and serves the rest in the order they asked", async () => {
    const { pool, state } = standIn();
    const queued = queueCheckouts(pool, { max: 2, waitMillis: 1_000 });
    const first = await queued.connect();
    const second = await queued.connect();
    const third = queued.connect();
    const fourth = queued.connect();
    expect(await settled(third)).toBe(false);
    expect(state.asked).toBe(2);
    first.release();
    expect(await settled(third)).toBe(true);
    expect(await settled(fourth)).toBe(false);
    second.release();
    (await third).release();
    (await fourth).release();
    expect(state.most).toBe(2);
    expect(state.out).toBe(0);
  });

  it("fails a checkout that waits past its limit with its own error, and the queue moves on", async () => {
    const { pool } = standIn();
    const queued = queueCheckouts(pool, { max: 1, waitMillis: 20 });
    const held = await queued.connect();
    await expect(queued.connect()).rejects.toBeInstanceOf(CheckoutWaitTimeoutError);
    held.release();
    const next = queued.connect();
    expect(await settled(next)).toBe(true);
    (await next).release();
  });

  it("gives the turn back when opening a connection fails", async () => {
    const { pool, state } = standIn(1);
    const queued = queueCheckouts(pool, { max: 1, waitMillis: 20 });
    await expect(queued.connect()).rejects.toThrow(/connection timeout/u);
    const client = await queued.connect();
    expect(state.asked).toBe(2);
    client.release();
  });

  it("passes a turn on once, however often a checkout is released", async () => {
    const { pool } = standIn();
    const queued = queueCheckouts(pool, { max: 1, waitMillis: 1_000 });
    const client = await queued.connect();
    client.release();
    expect(() => client.release()).toThrow(/already been released/u);
    const next = await queued.connect();
    const after = queued.connect();
    expect(await settled(after)).toBe(false);
    next.release();
    (await after).release();
  });
});
