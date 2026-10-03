import { describe, expect, it } from "vitest";
import { COVERAGE_DIMENSIONS, coverageTier } from "./coverage-assessment.js";
import type {
  CoverageAvailability,
  CoverageDimension,
  CoverageDimensionName,
} from "./coverage-assessment.js";

/** Every dimension NOT_RETRIEVED, except the ones given. */
function dims(
  given: Partial<Record<CoverageDimensionName, CoverageAvailability>>,
): CoverageDimension[] {
  return COVERAGE_DIMENSIONS.map((dimension) => ({
    dimension,
    availability: given[dimension] ?? "NOT_RETRIEVED",
    item_count: 0,
    reason_code: null,
  }));
}

const STATISTICS = { POPULATION: "STRONG", RARITY: "STRONG" } as const;

describe("coverageTier (TASK-080 §6 U-1, the owner's v0)", () => {
  it("is RICH only with a strong meaning and strong archives", () => {
    expect(coverageTier(dims({ ...STATISTICS, ETYMOLOGY: "STRONG", ARCHIVES: "STRONG" }))).toBe(
      "RICH",
    );
  });

  it("is STANDARD with one of the two strong", () => {
    expect(coverageTier(dims({ ...STATISTICS, ETYMOLOGY: "STRONG", ARCHIVES: "PARTIAL" }))).toBe(
      "STANDARD",
    );
    expect(coverageTier(dims({ ...STATISTICS, ARCHIVES: "STRONG" }))).toBe("STANDARD");
  });

  it("is LIMITED with the statistics and change over time, and partial evidence does not lift it", () => {
    expect(
      coverageTier(
        dims({
          ...STATISTICS,
          CHANGE_OVER_TIME: "STRONG",
          ETYMOLOGY: "PARTIAL",
          ARCHIVES: "PARTIAL",
        }),
      ),
    ).toBe("LIMITED");
  });

  it("is MINIMAL without the statistics, whatever else is strong", () => {
    expect(
      coverageTier(dims({ POPULATION: "STRONG", ETYMOLOGY: "STRONG", ARCHIVES: "STRONG" })),
    ).toBe("MINIMAL");
    expect(coverageTier(dims({ ...STATISTICS }))).toBe("MINIMAL");
  });

  it("never counts localities: a shared place name is not origin evidence", () => {
    expect(coverageTier(dims({ ...STATISTICS, LOCALITIES: "STRONG" }))).toBe("MINIMAL");
  });

  it("treats blocked rights as absent, not as strong", () => {
    expect(coverageTier(dims({ ...STATISTICS, ETYMOLOGY: "BLOCKED_RIGHTS" }))).toBe("MINIMAL");
  });
});
