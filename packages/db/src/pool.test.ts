import { describe, expect, it } from "vitest";
import { createPool } from "./pool.js";

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
