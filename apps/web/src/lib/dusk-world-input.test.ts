import { describe, expect, it } from "vitest";
import type { DistributionEntry, SurnameResultResponse } from "@name-atlas/contracts";
import { EMPTY_WORLD, worldInput } from "./dusk-world-input.js";

const CITATION = {
  id: "src",
  title: "Nazwiska występujące w rejestrze PESEL",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: "2026-01-20",
  source_type: "OFFICIAL_STATISTICS",
  locator: null,
  url: null,
  attribution: null,
  terms: "CC0 1.0",
  retrieved_at: null,
  source_page_url: null,
};

function region(terc: string | null, name: string, count: number, share: number) {
  return {
    place_id: `${name}-${String(count)}`,
    terc_code: terc,
    display_name: name,
    count,
    share_of_covered: share,
  };
}

function entry(regions: DistributionEntry["regions"]): DistributionEntry {
  return {
    comparability_group: "PESEL_MALE",
    country_code: "PL",
    snapshot_date: "2026-01-20",
    coverage_state: "READY",
    coverage_ratio: 0.9,
    low_coverage_threshold: 0.5,
    covered_total: regions.reduce((sum, r) => sum + r.count, 0),
    coverage_basis: "basis",
    regions,
    confidence: { status: "VERIFIED", methodology_code: "M" },
    citation: CITATION,
  } as unknown as DistributionEntry;
}

function response(distribution: SurnameResultResponse["distribution"]): SurnameResultResponse {
  return { status: "RESOLVED", distribution } as unknown as SurnameResultResponse;
}

describe("worldInput (TASK-052)", () => {
  it("takes the first ready entry's shares by TERC code and lights the strict leader", () => {
    const d = {
      state: "READY",
      reason_code: null,
      entries: [
        entry([
          region("18", "PODKARPACKIE", 300, 0.5),
          region("12", "MAŁOPOLSKIE", 200, 0.33),
          region(null, "UNKNOWN", 100, 0.17),
        ]),
      ],
    } as unknown as SurnameResultResponse["distribution"];
    expect(worldInput(response(d))).toEqual({ weights: { "18": 0.5, "12": 0.33 }, lit: "18" });
  });

  it("lights nothing on a tie, and nothing when the leader has no TERC code", () => {
    const tie = {
      state: "READY",
      reason_code: null,
      entries: [entry([region("18", "A", 100, 0.5), region("12", "B", 100, 0.5)])],
    } as unknown as SurnameResultResponse["distribution"];
    expect(worldInput(response(tie)).lit).toBeNull();
    const noTerc = {
      state: "READY",
      reason_code: null,
      entries: [entry([region(null, "A", 100, 1)])],
    } as unknown as SurnameResultResponse["distribution"];
    expect(worldInput(response(noTerc))).toEqual({ weights: {}, lit: null });
  });

  it("draws the register alone without a ready distribution", () => {
    expect(worldInput(response(null))).toBe(EMPTY_WORLD);
    const notReady = {
      state: "RIGHTS_BLOCKED",
      reason_code: null,
      entries: [],
    } as unknown as SurnameResultResponse["distribution"];
    expect(worldInput(response(notReady))).toBe(EMPTY_WORLD);
    const lowCoverage = {
      state: "READY",
      reason_code: null,
      entries: [{ ...entry([region("18", "A", 10, 1)]), coverage_state: "LOW_COVERAGE" }],
    } as unknown as SurnameResultResponse["distribution"];
    expect(worldInput(response(lowCoverage))).toBe(EMPTY_WORLD);
  });
});
