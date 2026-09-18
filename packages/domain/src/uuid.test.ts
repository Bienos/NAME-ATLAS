import { describe, expect, it } from "vitest";
import { isUuidV7, uuidv7 } from "./uuid.js";

describe("uuidv7", () => {
  it("produces a string matching the UUIDv7 layout", () => {
    const value = uuidv7();
    expect(isUuidV7(value)).toBe(true);
  });

  it("produces distinct values across calls", () => {
    const a = uuidv7();
    const b = uuidv7();
    expect(a).not.toBe(b);
  });

  it("rejects a UUIDv4 string as not UUIDv7", () => {
    // Well-known UUIDv4 example (version nibble is 4, not 7).
    expect(isUuidV7("110ec58a-a0f2-4ac4-8393-c866d813b8d1")).toBe(false);
  });

  it("rejects a non-UUID string", () => {
    expect(isUuidV7("not-a-uuid")).toBe(false);
  });
});
