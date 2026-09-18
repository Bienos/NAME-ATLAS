import { describe, expect, it } from "vitest";
import { POSTGRES_TEST_IMAGE } from "./postgres-container.js";

describe("POSTGRES_TEST_IMAGE", () => {
  it("is pinned to an exact tag and content digest, not a floating tag", () => {
    // TASK-001 §6 / D-005: never a stock or unpinned image.
    expect(POSTGRES_TEST_IMAGE).toMatch(/^postgis\/postgis:\d+-\d+\.\d+@sha256:[0-9a-f]{64}$/);
  });
});
