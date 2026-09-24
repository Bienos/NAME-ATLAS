import { describe, expect, it } from "vitest";
import { formatCount, formatIsoDate, isoDay } from "./format";

describe("format", () => {
  it("groups counts for the English interface without changing them", () => {
    expect(formatCount(98387)).toBe("98,387");
    expect(formatCount(2)).toBe("2");
  });

  it("writes register dates out in full, on the same calendar day everywhere", () => {
    expect(formatIsoDate("2026-01-20")).toBe("20 January 2026");
    expect(formatIsoDate("2026-12-31")).toBe("31 December 2026");
  });

  it("leaves anything that is not an ISO date untouched", () => {
    expect(formatIsoDate("20.01.2026")).toBe("20.01.2026");
  });

  it("takes the UTC day of an instant", () => {
    expect(isoDay(new Date("2026-09-24T23:30:00Z"))).toBe("2026-09-24");
  });
});
