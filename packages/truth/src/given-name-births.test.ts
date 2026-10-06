import { describe, expect, it } from "vitest";
import {
  BIRTH_TREND_CHANGE_PERCENT,
  BIRTH_TREND_WINDOW_YEARS,
  birthTrend,
  givenNameBirthCountClaimKey,
  givenNameBirthRankClaimKey,
  givenNameBirthTrendClaimKey,
  sharePerMillion,
} from "./given-name-births.js";
import { TruthInvariantError } from "./derive.js";

/**
 * TASK-137 (ADR-0043): D-044 §6's rule, as a pure function. TASK-139: the
 * rule as amended on 2026-10-06 compares shares of each list's children.
 */
describe("birthTrend", () => {
  const on = (count: number, peopleSum: number) => ({ count, peopleSum });
  const listed = (count: number, peopleSum: number) =>
    ({ kind: "LISTED", count, peopleSum }) as const;
  const below = (publicationThreshold: number, peopleSum: number) =>
    ({ kind: "BELOW_CUTOFF", publicationThreshold, peopleSum }) as const;

  it("holds D-044 §6's parameters", () => {
    expect(BIRTH_TREND_WINDOW_YEARS).toBe(5);
    expect(BIRTH_TREND_CHANGE_PERCENT).toBe(10);
  });

  it("is rising only when the share is more than 10% higher, falling only when more than 10% lower", () => {
    expect(birthTrend(on(111, 1000), listed(100, 1000))).toEqual({
      kind: "TREND",
      direction: "RISING",
    });
    expect(birthTrend(on(110, 1000), listed(100, 1000))).toEqual({
      kind: "TREND",
      direction: "STEADY",
    });
    expect(birthTrend(on(100, 1000), listed(100, 1000))).toEqual({
      kind: "TREND",
      direction: "STEADY",
    });
    expect(birthTrend(on(90, 1000), listed(100, 1000))).toEqual({
      kind: "TREND",
      direction: "STEADY",
    });
    expect(birthTrend(on(89, 1000), listed(100, 1000))).toEqual({
      kind: "TREND",
      direction: "FALLING",
    });
  });

  it("compares shares, not counts: each side is divided by its own list's people_sum", () => {
    // Fewer children named, on a list half the size: the share went up 80%.
    expect(birthTrend(on(90, 500), listed(100, 1000))).toMatchObject({ direction: "RISING" });
    // More children named, on a list twice the size: the share went down 44.5%.
    expect(birthTrend(on(111, 2000), listed(100, 1000))).toMatchObject({ direction: "FALLING" });
    // A third fewer children named on a list a third smaller: steady.
    expect(birthTrend(on(66, 660), listed(100, 1000))).toMatchObject({ direction: "STEADY" });
  });

  it("decides the published examples as the stored lists give them", () => {
    // 2025 against 2020 (resources 1159536/28020 and 1159538/28021); the
    // people_sum of each list is the sum of its rows.
    const girls2025 = 119788;
    const girls2020 = 176829;
    const boys2025 = 126404;
    const boys2020 = 186590;
    // ZOFIA: 3.69% of listed girls against 4.00%. FALLING by count, steady by share.
    expect(birthTrend(on(4415, girls2025), listed(7073, girls2020))).toEqual({
      kind: "TREND",
      direction: "STEADY",
    });
    // ANTONI: 4.16% against 4.48%.
    expect(birthTrend(on(5253, boys2025), listed(8368, boys2020))).toMatchObject({
      direction: "STEADY",
    });
    // JULIA: 2.68% against 4.16%.
    expect(birthTrend(on(3207, girls2025), listed(7351, girls2020))).toMatchObject({
      direction: "FALLING",
    });
    // JAKUB: 2.68% against 3.84%.
    expect(birthTrend(on(3386, boys2025), listed(7162, boys2020))).toMatchObject({
      direction: "FALLING",
    });
  });

  it("calls an absence rising only if rising from the largest count the cut-off allows", () => {
    // MYROSLAV, 17 boys in 2025, absent from the 2020 list (at most 1 of 186,590).
    expect(birthTrend(on(17, 126404), below(2, 186590))).toEqual({
      kind: "TREND",
      direction: "RISING",
    });
    // 2 of 126,404 against at most 1 of 186,590: more than 10% up from any value it had.
    expect(birthTrend(on(2, 126404), below(2, 186590))).toMatchObject({ direction: "RISING" });
  });

  it("is indeterminate when an absence could have been a share as large", () => {
    // 2 of 1,000 against at most 1 of 500: the share may not have changed at all.
    expect(birthTrend(on(2, 1000), below(2, 500))).toEqual({
      kind: "INDETERMINATE",
      reason: "BELOW_CUTOFF_TOO_CLOSE",
    });
    // Exactly 10% above the largest possible share is not more than 10%.
    expect(birthTrend(on(11, 1000), below(2, 100))).toEqual({
      kind: "INDETERMINATE",
      reason: "BELOW_CUTOFF_TOO_CLOSE",
    });
    expect(birthTrend(on(12, 1000), below(2, 100))).toMatchObject({ direction: "RISING" });
  });

  it("reads the cut-off it is given: under 5, a latest count of 4 is not provably rising", () => {
    // The earlier count could have been 4; on lists of equal size 4 is not more than 10% above it.
    expect(birthTrend(on(4, 1000), below(5, 1000))).toEqual({
      kind: "INDETERMINATE",
      reason: "BELOW_CUTOFF_TOO_CLOSE",
    });
    expect(birthTrend(on(5, 1000), below(5, 1000))).toEqual({
      kind: "TREND",
      direction: "RISING",
    });
  });

  it("is exact for every count a PostgreSQL integer holds", () => {
    const max = 2_147_483_647;
    // The products reach about 5·10^20, past Number's exact range.
    expect(birthTrend(on(max, max), listed(max, max))).toMatchObject({ direction: "STEADY" });
    expect(birthTrend(on(max, max), listed(1, max))).toMatchObject({ direction: "RISING" });
    expect(birthTrend(on(1, max), listed(max, max))).toMatchObject({ direction: "FALLING" });
    expect(birthTrend(on(max, max), below(2, max))).toMatchObject({ direction: "RISING" });
  });

  it("refuses a count or people_sum that is not a positive whole number, or a count above its sum", () => {
    expect(() => birthTrend(on(0, 100), listed(10, 100))).toThrow(TruthInvariantError);
    expect(() => birthTrend(on(10, 100), listed(0, 100))).toThrow(TruthInvariantError);
    expect(() => birthTrend(on(2.5, 100), listed(10, 100))).toThrow(TruthInvariantError);
    expect(() => birthTrend(on(10, 0), listed(10, 100))).toThrow(TruthInvariantError);
    expect(() => birthTrend(on(10, 100), listed(10, 99.5))).toThrow(TruthInvariantError);
    expect(() => birthTrend(on(101, 100), listed(10, 100))).toThrow(TruthInvariantError);
    expect(() => birthTrend(on(10, 100), listed(101, 100))).toThrow(TruthInvariantError);
    expect(() => birthTrend(on(10, 100), below(1, 100))).toThrow(TruthInvariantError);
  });
});

describe("sharePerMillion", () => {
  it("rounds down a share to whole parts per million", () => {
    expect(sharePerMillion(4415, 119788)).toBe(36856);
    expect(sharePerMillion(7073, 176829)).toBe(39999);
    expect(sharePerMillion(1, 3)).toBe(333333);
    expect(sharePerMillion(5, 5)).toBe(1_000_000);
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
