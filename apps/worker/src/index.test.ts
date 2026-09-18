import { afterEach, describe, expect, it, vi } from "vitest";
import { isUuidV7 } from "@name-atlas/domain";
import { runWorker } from "./index.js";

describe("runWorker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a structured startup line carrying a valid correlation ID and exits cleanly", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { correlationId } = runWorker();

    expect(isUuidV7(correlationId)).toBe(true);
    expect(logSpy).toHaveBeenCalledTimes(2);

    const [startedLine] = logSpy.mock.calls[0] ?? [];
    const started: unknown = JSON.parse(String(startedLine));
    expect(started).toMatchObject({
      level: "info",
      message: "worker started",
      correlationId,
      service: "worker",
    });

    const [exitedLine] = logSpy.mock.calls[1] ?? [];
    const exited: unknown = JSON.parse(String(exitedLine));
    expect(exited).toMatchObject({
      level: "info",
      message: "worker exiting cleanly",
      correlationId,
    });
  });

  it("is safe to call more than once (idempotent-safe by construction)", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const first = runWorker();
    const second = runWorker();

    expect(first.correlationId).not.toBe(second.correlationId);
  });
});
