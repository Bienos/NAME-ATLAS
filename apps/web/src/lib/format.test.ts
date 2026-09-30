import { describe, expect, it } from "vitest";
import { formatCount, formatIsoDate } from "./format.js";

describe("formatCount", () => {
  it("groups thousands without changing the value", () => {
    expect(formatCount(408182)).toBe("408,182");
    expect(formatCount(2)).toBe("2");
  });
});

describe("formatIsoDate", () => {
  it("renders a reference date for reading", () => {
    expect(formatIsoDate("2026-01-20")).toBe("20 Jan 2026");
  });

  it("rejects anything that is not a calendar date", () => {
    expect(() => formatIsoDate("2026-02-30")).toThrow(RangeError);
    expect(() => formatIsoDate("20.01.2026")).toThrow(RangeError);
  });
});
