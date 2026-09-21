import { describe, expect, it } from "vitest";
import { isUuidV7 } from "@name-atlas/domain";
import { createLogger } from "./logger.js";
import { REDACTED } from "./redact.js";

/** TASK-019. The shape, the correlation ID, the redaction, and never throwing. */

function capture(level?: "debug" | "info" | "warn" | "error") {
  const lines: string[] = [];
  const logger = createLogger({
    service: "test",
    level: level ?? "debug",
    write: (line) => lines.push(line),
    now: () => new Date("2026-09-21T08:00:00.000Z"),
  });
  return {
    logger,
    lines,
    parsed: () => lines.map((l) => JSON.parse(l) as Record<string, unknown>),
  };
}

describe("line shape", () => {
  it("writes one JSON object per call with the fixed fields", () => {
    const { logger, parsed } = capture();
    logger.info("surname_resolved", { status: "EXACT", ms: 7 });
    const [line] = parsed();
    expect(line).toMatchObject({
      timestamp: "2026-09-21T08:00:00.000Z",
      level: "info",
      service: "test",
      event: "surname_resolved",
      status: "EXACT",
      ms: 7,
    });
    expect(isUuidV7(String(line?.["correlationId"]))).toBe(true);
  });

  it("writes exactly one line per call", () => {
    const { logger, lines } = capture();
    logger.info("a");
    logger.warn("b");
    logger.error("c");
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(line.includes("\n")).toBe(false);
  });

  it("reuses an inbound correlation ID so a request can be traced end to end", () => {
    const lines: string[] = [];
    const logger = createLogger({
      service: "web",
      correlationId: "01a0bbe8-ae8b-72c4-94fc-ffbd2486a393",
      write: (line) => lines.push(line),
    });
    logger.info("request_started");
    logger.info("request_finished");
    const ids = lines.map((l) => (JSON.parse(l) as Record<string, unknown>)["correlationId"]);
    expect(new Set(ids)).toEqual(new Set(["01a0bbe8-ae8b-72c4-94fc-ffbd2486a393"]));
  });
});

describe("levels", () => {
  it("drops lines below the threshold", () => {
    const { logger, lines } = capture("warn");
    logger.debug("dropped");
    logger.info("dropped");
    logger.warn("kept");
    logger.error("kept");
    expect(lines).toHaveLength(2);
  });

  it("defaults to info when no level is given", () => {
    const lines: string[] = [];
    const logger = createLogger({ service: "test", write: (line) => lines.push(line) });
    logger.debug("dropped");
    logger.info("kept");
    expect(lines).toHaveLength(1);
  });
});

describe("redaction happens before anything is written", () => {
  it("never writes a password or a connection string", () => {
    const { logger, lines } = capture();
    logger.error("db_failed", {
      password: "hunter2",
      dsn: "postgres://atlas:hunter2@localhost:5432/db",
      cause: new Error("connect failed for postgres://atlas:hunter2@localhost:5432/db"),
    });
    const written = lines.join("\n");
    expect(written).not.toContain("hunter2");
    expect(written).toContain(REDACTED);
    // The host survives, which is the part worth knowing.
    expect(written).toContain("localhost:5432/db");
  });
});

describe("child loggers", () => {
  it("keep the correlation ID and repeat their fields", () => {
    const { logger, parsed } = capture();
    const child = logger.child({ route: "/api/v1/surname-results" });
    child.info("request_started");
    child.info("request_finished", { status: 200 });
    const lines = parsed();
    expect(lines[0]).toMatchObject({ route: "/api/v1/surname-results" });
    expect(lines[1]).toMatchObject({ route: "/api/v1/surname-results", status: 200 });
    expect(lines[0]?.["correlationId"]).toBe(logger.correlationId);
  });

  it("let a per-call field override a base field", () => {
    const { logger, parsed } = capture();
    logger.child({ phase: "start" }).info("e", { phase: "end" });
    expect(parsed()[0]?.["phase"]).toBe("end");
  });
});

describe("logging never throws", () => {
  it("reports a serialisation failure instead of propagating it", () => {
    const { logger, parsed } = capture();
    // A getter that throws defeats JSON.stringify.
    const hostile = {
      get boom(): string {
        throw new Error("nope");
      },
    };
    expect(() => logger.info("hostile", { hostile })).not.toThrow();
    const lines = parsed();
    expect(lines[0]).toMatchObject({
      level: "error",
      event: "log_serialisation_failed",
      original_event: "hostile",
    });
  });

  it("survives a BigInt, which JSON cannot represent", () => {
    const { logger, parsed } = capture();
    expect(() => logger.info("big", { n: 1n })).not.toThrow();
    expect(parsed()[0]?.["event"]).toBe("log_serialisation_failed");
  });
});
