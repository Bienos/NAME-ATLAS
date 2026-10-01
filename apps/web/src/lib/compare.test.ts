import { describe, expect, it } from "vitest";
import { comparePopulation, compareRarity, rarerOf } from "./compare.js";
import type { SurnameResultResponse } from "@name-atlas/contracts";

/** TASK-025 AC-1/AC-2 — comparability is a gate, not a preference. Synthetic fixtures. */
const SURFACE = { surface: "FREE" as const, decision: "ALLOWED" as const, reason_code: "X" };
const citation = {
  id: "c",
  title: "T",
  publisher: "P",
  publication_date: "2026-01-20",
  source_type: "OFFICIAL_DATASET",
  locator: null,
  url: null,
  attribution: null,
  terms: null,
  retrieved_at: null,
  source_page_url: null,
};
const confidence = { status: "VERIFIED" as const, methodology_code: "m@1" };

function observation(value: number, group: string, date = "2026-01-20") {
  return {
    value: { status: "KNOWN" as const, value, unit: "PEOPLE" as const, scope_label_code: "S" },
    snapshot_date: date,
    country_code: "PL",
    source_population_scope: "s",
    coverage_notes: null,
    comparability_group: group,
    confidence,
    citation,
  };
}
function rarity(x: number, group: string, denominator = 21_197_537, date = "2026-01-20") {
  return {
    primary: { metric: "ONE_IN_X" as const, value: x },
    supporting: [],
    methodology_code: "m",
    universe_label_code: "u",
    numerator: 100,
    denominator,
    share: 0.001,
    scope_label_code: "s",
    snapshot_date: date,
    country_code: "PL",
    comparability_group: group,
    confidence,
    citation,
  };
}
function side(observations: unknown[], rarities: unknown[] = []): SurnameResultResponse {
  return {
    schema_version: "1.8",
    status: "RESOLVED",
    surname: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc088", display_name: "X", script: "Latn" },
    population: {
      state: observations.length ? "READY" : "UNAVAILABLE",
      observations,
      reason_code: observations.length ? null : "NO_APPLICABLE_EVIDENCE",
      surface: SURFACE,
    },
    rarity: {
      state: rarities.length ? "READY" : "UNAVAILABLE",
      entries: rarities,
      reason_code: rarities.length ? null : "NO_COMPLETE_UNIVERSE",
      surface: SURFACE,
    },
    distribution: {
      state: "UNAVAILABLE",
      entries: [],
      reason_code: "NO_COMPLETE_REGIONAL_UNIVERSE",
      surface: SURFACE,
    },
    suggestions: null,
    meaning: {
      state: "NO_SOURCED_MEANING",
      interpretations: [],
      confidence: null,
      methodology_code: null,
      reason_code: "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
      surface: SURFACE,
    },
    archive: {
      state: "NOT_SEARCHED",
      query: null,
      searched_on: null,
      catalogue_records: null,
      catalogue_by_category: [],
      pages: null,
      pages_by_period: [],
      pages_by_place: [],
      examples: [],
      confidence: null,
      citation: null,
      reason_code: "ARCHIVE_NOT_SEARCHED",
      surface: SURFACE,
    },
  } as unknown as SurnameResultResponse;
}

describe("comparePopulation", () => {
  it("compares within a partition when the date matches", () => {
    const pairs = comparePopulation(
      side([observation(100, "g_male")]),
      side([observation(50, "g_male")]),
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ comparable: true, group: "g_male" });
  });

  it("refuses across partitions — a male count is not a female count", () => {
    const pairs = comparePopulation(
      side([observation(100, "g_male")]),
      side([observation(50, "g_female")]),
    );
    expect(pairs).toHaveLength(2);
    for (const p of pairs)
      expect(p).toMatchObject({ comparable: false, reason: "MISSING_ON_ONE_SIDE" });
  });

  it("refuses across snapshot dates", () => {
    const pairs = comparePopulation(
      side([observation(100, "g_male")]),
      side([observation(50, "g_male", "2025-01-20")]),
    );
    expect(pairs[0]).toMatchObject({ comparable: false, reason: "DIFFERENT_SNAPSHOT_DATE" });
  });

  it("refuses when one side has no count at all", () => {
    expect(comparePopulation(side([observation(100, "g_male")]), side([]))[0]).toMatchObject({
      comparable: false,
      reason: "MISSING_ON_ONE_SIDE",
    });
  });

  it("returns nothing to compare when neither side has a count", () => {
    expect(comparePopulation(side([]), side([]))).toEqual([]);
  });
});

describe("compareRarity", () => {
  it("compares when partition, date and denominator all match", () => {
    const pairs = compareRarity(
      side([], [rarity(215, "g_male")]),
      side([], [rarity(4000, "g_male")]),
    );
    expect(pairs[0]).toMatchObject({ comparable: true });
  });

  it("refuses when the denominator differs — two universes, two meanings of X", () => {
    const pairs = compareRarity(
      side([], [rarity(215, "g_male")]),
      side([], [rarity(215, "g_male", 9_000_000)]),
    );
    expect(pairs[0]).toMatchObject({ comparable: false, reason: "DIFFERENT_DENOMINATOR" });
  });

  it("refuses across snapshot dates even with the same denominator", () => {
    const pairs = compareRarity(
      side([], [rarity(215, "g_male")]),
      side([], [rarity(215, "g_male", 21_197_537, "2025-01-20")]),
    );
    expect(pairs[0]).toMatchObject({ comparable: false, reason: "DIFFERENT_SNAPSHOT_DATE" });
  });
});

describe("rarerOf", () => {
  function pairOf(aX: number, aShare: number, bX: number, bShare: number) {
    const left = side([], [{ ...rarity(aX, "g"), share: aShare }]);
    const right = side([], [{ ...rarity(bX, "g"), share: bShare }]);
    const pair = compareRarity(left, right)[0];
    if (!pair?.comparable) throw new Error("expected a comparable pair");
    return pair;
  }

  it("calls the smaller share rarer", () => {
    expect(rarerOf(pairOf(215, 0.00465, 4000, 0.00025))).toBe("b");
    expect(rarerOf(pairOf(4000, 0.00025, 215, 0.00465))).toBe("a");
  });

  it("calls an equal share no ranking", () => {
    expect(rarerOf(pairOf(215, 0.00465, 215, 0.00465))).toBeNull();
  });

  it("refuses to rank two shares that round to the same 1-in-X", () => {
    // ONE_IN_X is rounded half up, so two different counts in one universe can
    // display the same X. Ranking them would report a difference the reader
    // cannot see, and calling them equal would deny one that exists.
    expect(rarerOf(pairOf(212, 0.0047081, 212, 0.0047269))).toBe("TOO_CLOSE");
  });

  it("never reads the rounded figure when the shares disagree with it", () => {
    // A payload whose displayed X and share point opposite ways: the share is
    // the measured quantity and wins.
    expect(rarerOf(pairOf(100, 0.001, 200, 0.002))).toBe("a");
  });
});
