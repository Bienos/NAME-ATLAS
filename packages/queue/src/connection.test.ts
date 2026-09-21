import { describe, expect, it } from "vitest";
import { MissingRedisUrlError, loadQueueConfig } from "./connection.js";

/** TASK-020. A queue without a Redis URL must fail loudly at start, not later. */

describe("loadQueueConfig", () => {
  it("reads REDIS_URL", () => {
    expect(loadQueueConfig({ REDIS_URL: "redis://localhost:6379" })).toEqual({
      redisUrl: "redis://localhost:6379",
    });
  });

  it("throws a named error when it is missing or blank", () => {
    expect(() => loadQueueConfig({})).toThrow(MissingRedisUrlError);
    expect(() => loadQueueConfig({ REDIS_URL: "" })).toThrow(MissingRedisUrlError);
    expect(() => loadQueueConfig({ REDIS_URL: "   " })).toThrow(MissingRedisUrlError);
  });
});
