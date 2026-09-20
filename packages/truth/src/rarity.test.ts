import { describe, expect, it } from "vitest";
import { oneInX, shareOf } from "./rarity.js";
import { TruthInvariantError } from "./derive.js";
import {
  RARITY_DENOMINATOR_KIND,
  RARITY_METHODOLOGY_CODE,
  RARITY_ROUNDING,
  RARITY_UNIVERSE_LABEL_CODE,
} from "./version.js";

/**
 * TASK-014 — the two pure rules behind "about 1 in X", tested without a
 * database. Every figure below is arithmetic on stated inputs; none is a
 * claim about any real surname.
 */
describe("oneInX (U-6: denominator / count, rounded half up)", () => {
  it("computes the real NOWAK figure from the real male universe", () => {
    // 21,197,537 is the sum of resource 1148808's published counts; 98,387 is
    // NOWAK's count in it. Both are observed, and the quotient is 215.44…
    expect(oneInX(98_387, 21_197_537)).toBe(215);
  });

  it("rounds half up, and only half up", () => {
    expect(oneInX(2, 5)).toBe(3); // 2.5 → 3
    expect(oneInX(4, 10)).toBe(3); // 2.5 → 3
    expect(oneInX(3, 7)).toBe(2); // 2.33 → 2
    expect(oneInX(3, 8)).toBe(3); // 2.66 → 3
  });

  it("is exact where the division is exact", () => {
    expect(oneInX(1, 1)).toBe(1);
    expect(oneInX(7, 21)).toBe(3);
    expect(oneInX(100, 1_000_000)).toBe(10_000);
  });

  it("refuses a count that is not a positive integer — a rarity of zero bearers is not a figure", () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => oneInX(bad, 1_000)).toThrow(TruthInvariantError);
    }
  });

  it("refuses a denominator smaller than the count: X below 1 would be a lie about the universe", () => {
    expect(() => oneInX(500, 499)).toThrow(TruthInvariantError);
    expect(() => oneInX(10, 10.5)).toThrow(TruthInvariantError);
  });
});

describe("shareOf (count / denominator)", () => {
  it("carries nine decimal places, enough for a single bearer in a 21-million universe", () => {
    expect(shareOf(1, 21_197_537)).toBe(0.000000047);
    expect(shareOf(98_387, 21_197_537)).toBe(0.004641435);
  });

  it("is 1 when the surname is the whole universe", () => {
    expect(shareOf(5, 5)).toBe(1);
  });

  it("agrees with one_in_x to the rounding", () => {
    const count = 98_387;
    const denominator = 21_197_537;
    expect(Math.round(1 / shareOf(count, denominator))).toBe(oneInX(count, denominator));
  });
});

describe("the labels that keep the figure honest", () => {
  it("names the published universe, never a national population", () => {
    expect(RARITY_DENOMINATOR_KIND).toBe("PUBLISHED_UNIVERSE_SUM");
    expect(RARITY_UNIVERSE_LABEL_CODE).toBe("PESEL_PUBLISHED_UNIVERSE");
    expect(RARITY_METHODOLOGY_CODE).toBe("PESEL_PUBLISHED_UNIVERSE_SUM_V1");
    // The codes are localised by a frontend; none of them says "Poland" or
    // "Poles", because the denominator is not a national population (U-6).
    for (const code of [
      RARITY_DENOMINATOR_KIND,
      RARITY_UNIVERSE_LABEL_CODE,
      RARITY_METHODOLOGY_CODE,
    ]) {
      expect(code).not.toMatch(/POLAND|POLES|POPULATION_OF/u);
    }
  });

  it("states its rounding, because a figure without a rule is not reproducible", () => {
    expect(RARITY_ROUNDING).toBe("ROUND_HALF_UP");
  });
});
