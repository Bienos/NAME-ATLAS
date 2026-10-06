import { describe, expect, it } from "vitest";
import {
  BIRTH_TREND_CHANGE_PERCENT,
  BIRTH_TREND_WINDOW_YEARS,
  birthTrend,
  givenNameBirthCountClaimKey,
  givenNameBirthRankClaimKey,
  givenNameBirthTrendClaimKey,
} from "./given-name-births.js";
import { TruthInvariantError } from "./derive.js";

/** TASK-137 (ADR-0043): D-044 §6's rule, as a pure function. */
describe("birthTrend", () => {
  it("holds D-044 §6's parameters", () => {
    expect(BIRTH_TREND_WINDOW_YEARS).toBe(5);
    expect(BIRTH_TREND_CHANGE_PERCENT).toBe(10);
  });

  it("is rising only when more than 10% higher, falling only when more than 10% lower", () => {
    const listed = (count: number) => ({ kind: "LISTED", count }) as const;
    expect(birthTrend(111, listed(100))).toEqual({ kind: "TREND", direction: "RISING" });
    expect(birthTrend(110, listed(100))).toEqual({ kind: "TREND", direction: "STEADY" });
    expect(birthTrend(100, listed(100))).toEqual({ kind: "TREND", direction: "STEADY" });
    expect(birthTrend(90, listed(100))).toEqual({ kind: "TREND", direction: "STEADY" });
    expect(birthTrend(89, listed(100))).toEqual({ kind: "TREND", direction: "FALLING" });
  });

  it("decides the published examples as the stored lists give them", () => {
    // 2025 against 2020, boys' and girls' lists (resources 1159536/28020, 1159538/28021).
    expect(birthTrend(4415, { kind: "LISTED", count: 7073 }).kind).toBe("TREND");
    expect(birthTrend(4415, { kind: "LISTED", count: 7073 })).toMatchObject({
      direction: "FALLING",
    });
    expect(birthTrend(4222, { kind: "LISTED", count: 3867 })).toMatchObject({
      direction: "STEADY",
    });
    expect(birthTrend(1268, { kind: "LISTED", count: 588 })).toMatchObject({
      direction: "RISING",
    });
  });

  it("calls an absence under a cut-off of 2 rising, without reading it as zero", () => {
    // At most 1 earlier; at least 2 now: more than 10% up from any value it could have had.
    const below = { kind: "BELOW_CUTOFF", publicationThreshold: 2 } as const;
    expect(birthTrend(2, below)).toEqual({ kind: "TREND", direction: "RISING" });
    expect(birthTrend(17, below)).toEqual({ kind: "TREND", direction: "RISING" });
  });

  it("reads the cut-off it is given: under 5, a latest count of 4 is not provably rising", () => {
    const below = { kind: "BELOW_CUTOFF", publicationThreshold: 5 } as const;
    // The earlier count could have been 4; 4 is not more than 10% above it.
    expect(birthTrend(4, below)).toEqual({
      kind: "INDETERMINATE",
      reason: "BELOW_CUTOFF_TOO_CLOSE",
    });
    // 5 is more than 10% above 4, the largest count the cut-off allows.
    expect(birthTrend(5, below)).toEqual({ kind: "TREND", direction: "RISING" });
  });

  it("refuses a count that is not a positive whole number", () => {
    expect(() => birthTrend(0, { kind: "LISTED", count: 10 })).toThrow(TruthInvariantError);
    expect(() => birthTrend(10, { kind: "LISTED", count: 0 })).toThrow(TruthInvariantError);
    expect(() => birthTrend(2.5, { kind: "LISTED", count: 10 })).toThrow(TruthInvariantError);
  });
});

describe("claim keys", () => {
  it("name the claim type, the name and the list or lists", () => {
    expect(givenNameBirthCountClaimKey("n", "l")).toBe("GIVEN_NAME_BIRTH_COUNT|n|l");
    expect(givenNameBirthRankClaimKey("n", "l")).toBe("GIVEN_NAME_BIRTH_RANK|n|l");
    expect(givenNameBirthTrendClaimKey("n", "l2025", "l2020")).toBe(
      "GIVEN_NAME_BIRTH_TREND|n|l2025|l2020",
    );
  });
});
