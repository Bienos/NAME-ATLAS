import { describe, expect, it } from "vitest";
import {
  coverageRatio,
  coverageState,
  coveredSetSum,
  currentDistributionClaimKey,
  shareOfCovered,
} from "./distribution.js";
import { TruthInvariantError } from "./derive.js";
import { DISTRIBUTION_LOW_COVERAGE_THRESHOLD } from "./version.js";

/**
 * TASK-012's arithmetic and its one presentational rule, tested without a
 * database. Every figure here is a real one, taken from the ingested PESEL
 * resources; nothing is invented to make an assertion convenient.
 */

/** NOWAK, male, resource 1148786 — the 16 published cells, descending. */
const NOWAK_MALE_CELLS = [
  16_077, 12_756, 11_309, 7390, 6142, 5548, 4823, 4330, 4321, 3201, 2780, 2309, 2302, 2216, 1102,
  363,
] as const;
const NOWAK_MALE_COVERED = 86_969;
const NOWAK_MALE_NATIONAL = 98_387;

/** MELNYK, male — 14 cells, and the reason the LOW_COVERAGE state exists. */
const MELNYK_MALE_COVERED = 210;
const MELNYK_MALE_NATIONAL = 6442;

describe("coveredSetSum", () => {
  it("sums NOWAK male's published cells to its covered count", () => {
    expect(coveredSetSum([...NOWAK_MALE_CELLS])).toBe(NOWAK_MALE_COVERED);
  });

  it("refuses an empty cell list — no cells is absence, not a zero sum", () => {
    expect(() => coveredSetSum([])).toThrow(TruthInvariantError);
  });

  it("refuses a zero or fractional cell: the publisher emits neither", () => {
    expect(() => coveredSetSum([10, 0])).toThrow(/positive integer/u);
    expect(() => coveredSetSum([10, 1.5])).toThrow(/positive integer/u);
  });
});

describe("shareOfCovered", () => {
  it("is the cell over the covered set, to nine places", () => {
    // WIELKOPOLSKIE, NOWAK male: 16,077 of 86,969.
    expect(shareOfCovered(16_077, NOWAK_MALE_COVERED)).toBe(0.184858973);
  });

  it("the shares of one surname's cells sum to 1 within the rounding they carry", () => {
    // Each share is rounded independently to nine places, so the sum can drift
    // by up to half a unit in the last place per entry. Apportioning the
    // remainder would distort individual shares, so the tolerance is stated
    // rather than the figures adjusted.
    const shares = NOWAK_MALE_CELLS.map((c) => shareOfCovered(c, NOWAK_MALE_COVERED));
    const total = shares.reduce((sum, share) => sum + share, 0);
    expect(Math.abs(total - 1)).toBeLessThanOrEqual(NOWAK_MALE_CELLS.length * 1e-9);
  });

  it("refuses a cell larger than the covered set it is a share of", () => {
    expect(() => shareOfCovered(100, 99)).toThrow(TruthInvariantError);
  });
});

describe("coverageRatio", () => {
  it("is the covered set over the national count, to nine places", () => {
    expect(coverageRatio(NOWAK_MALE_COVERED, NOWAK_MALE_NATIONAL)).toBe(0.883948083);
    expect(coverageRatio(MELNYK_MALE_COVERED, MELNYK_MALE_NATIONAL)).toBe(0.032598572);
  });

  it("refuses a covered set exceeding the national count rather than clamping", () => {
    // TASK-008 verified across 395,217 surnames that this never happens, so if
    // it ever does it is a finding about the data, not a case to smooth over.
    expect(() => coverageRatio(6443, MELNYK_MALE_NATIONAL)).toThrow(
      /covered sum 6443 exceeds the national count/u,
    );
  });
});

describe("coverageState", () => {
  it("keeps NOWAK READY and puts MELNYK in LOW_COVERAGE at the default threshold", () => {
    expect(DISTRIBUTION_LOW_COVERAGE_THRESHOLD).toBe(0.5);
    expect(coverageState(coverageRatio(NOWAK_MALE_COVERED, NOWAK_MALE_NATIONAL))).toBe("READY");
    expect(coverageState(coverageRatio(MELNYK_MALE_COVERED, MELNYK_MALE_NATIONAL))).toBe(
      "LOW_COVERAGE",
    );
  });

  it("flips exactly at the threshold, inclusive", () => {
    expect(coverageState(0.5, 0.5)).toBe("READY");
    expect(coverageState(0.499999999, 0.5)).toBe("LOW_COVERAGE");
    // The same figures either side of a threshold the owner moved.
    expect(coverageState(0.883948083, 0.9)).toBe("LOW_COVERAGE");
    expect(coverageState(0.032598572, 0.03)).toBe("READY");
  });

  it("reports unknown coverage as its own state, never as adequate coverage", () => {
    expect(coverageState(null)).toBe("COVERAGE_UNKNOWN");
    expect(coverageState(null, 0)).toBe("COVERAGE_UNKNOWN");
  });
});

describe("currentDistributionClaimKey", () => {
  it("is keyed by surname and resource version, so the two sexes never collide", () => {
    expect(currentDistributionClaimKey("s-1", "r-male")).toBe("CURRENT_DISTRIBUTION|s-1|r-male");
    expect(currentDistributionClaimKey("s-1", "r-male")).not.toBe(
      currentDistributionClaimKey("s-1", "r-female"),
    );
  });
});
