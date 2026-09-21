import { describe, expect, it } from "vitest";
import { ogFacts } from "./og-facts.js";
import type { SurnameResultResponse } from "@name-atlas/contracts";

/** TASK-024 AC-5 — what a share image may say. Synthetic fixtures. */
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
};

const RESOLVED = {
  schema_version: "1.5",
  status: "RESOLVED",
  surname: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc088", display_name: "NOWAK", script: "Latn" },
  population: {
    state: "READY",
    observations: [
      {
        value: { status: "KNOWN", value: 98_387, unit: "PEOPLE", scope_label_code: "S" },
        snapshot_date: "2026-01-20",
        country_code: "PL",
        source_population_scope: "s",
        coverage_notes: null,
        comparability_group: "pesel_2026_national_male",
        confidence: { status: "VERIFIED", methodology_code: "m@1" },
        citation,
      },
      {
        value: { status: "KNOWN", value: 99_738, unit: "PEOPLE", scope_label_code: "S" },
        snapshot_date: "2026-01-20",
        country_code: "PL",
        source_population_scope: "s",
        coverage_notes: null,
        comparability_group: "pesel_2026_national_female",
        confidence: { status: "VERIFIED", methodology_code: "m@1" },
        citation,
      },
    ],
    reason_code: null,
    surface: SURFACE,
  },
  rarity: {
    state: "UNAVAILABLE",
    entries: [],
    reason_code: "NO_COMPLETE_UNIVERSE",
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
} as unknown as SurnameResultResponse;

describe("ogFacts", () => {
  it("renders the count per partition and never a total", () => {
    const f = ogFacts(RESOLVED, "pl");
    expect(f.surname).toBe("NOWAK");
    expect(f.lines).toEqual(["98\u00A0387 osób · mężczyźni", "99\u00A0738 osób · kobiety"]);
    expect(JSON.stringify(f)).not.toContain("198");
    expect(f.footer).toBe("PESEL · 20 stycznia 2026 r.");
  });

  it("omits 1 in X when the two entries come from different universes", () => {
    // Each PESEL partition is its own published universe, and the card has no
    // room to name them, so it names neither figure rather than inviting a
    // comparison across denominators.
    const two = {
      ...RESOLVED,
      rarity: {
        state: "READY",
        entries: [
          {
            primary: { metric: "ONE_IN_X", value: 104 },
            supporting: [],
            methodology_code: "m",
            universe_label_code: "u",
            numerator: 98_387,
            denominator: 10_281_000,
            share: 0.00957,
            scope_label_code: "s",
            snapshot_date: "2026-01-20",
            country_code: "PL",
            comparability_group: "pesel_2026_national_male",
            confidence: { status: "VERIFIED", methodology_code: "m@1" },
            citation,
          },
          {
            primary: { metric: "ONE_IN_X", value: 109 },
            supporting: [],
            methodology_code: "m",
            universe_label_code: "u",
            numerator: 99_738,
            denominator: 10_916_537,
            share: 0.00913,
            scope_label_code: "s",
            snapshot_date: "2026-01-20",
            country_code: "PL",
            comparability_group: "pesel_2026_national_female",
            confidence: { status: "VERIFIED", methodology_code: "m@1" },
            citation,
          },
        ],
        reason_code: null,
        surface: SURFACE,
      },
    } as unknown as SurnameResultResponse;
    const f = ogFacts(two, "en");
    expect(f.lines.join(" ")).not.toContain("1 in");
    // The counts still appear; only the incommensurable figures are withheld.
    expect(f.lines.join(" ")).toContain("98,387 people");
  });

  it("omits 1 in X unless rarity is READY", () => {
    expect(ogFacts(RESOLVED, "en").lines.join(" ")).not.toContain("1 in");
    const withRarity = {
      ...RESOLVED,
      rarity: {
        state: "READY",
        entries: [
          {
            primary: { metric: "ONE_IN_X", value: 215 },
            supporting: [],
            methodology_code: "m",
            universe_label_code: "u",
            numerator: 98_387,
            denominator: 21_197_537,
            share: 0.0046,
            scope_label_code: "s",
            snapshot_date: "2026-01-20",
            country_code: "PL",
            comparability_group: "pesel_2026_national_male",
            confidence: { status: "VERIFIED", methodology_code: "m@1" },
            citation,
          },
        ],
        reason_code: null,
        surface: SURFACE,
      },
    } as unknown as SurnameResultResponse;
    expect(ogFacts(withRarity, "en").lines).toContain("about 1 in 215 · male");
  });

  it("carries no number when rights block the count", () => {
    const blocked = {
      ...RESOLVED,
      population: {
        state: "RIGHTS_BLOCKED",
        observations: [],
        reason_code: "R",
        surface: { ...SURFACE, decision: "BLOCKED" },
      },
    } as unknown as SurnameResultResponse;
    const f = ogFacts(blocked, "en");
    expect(f.lines).toEqual([]);
    expect(f.caveat).toMatch(/withheld by licence/u);
    expect(JSON.stringify(f)).not.toMatch(/\d{2,}/u);
  });

  it("states absence for an unresolved input and names nothing", () => {
    const f = ogFacts(null, "pl");
    expect(f.surname).toBe("—");
    expect(f.lines).toEqual(["Nie znaleziono takiego nazwiska"]);
  });

  it("puts the date on each line when the two partitions disagree about it", () => {
    // The contract permits different snapshot dates, and one footer date would
    // then be wrong for at least one count (caught by review 2026-09-21).
    const mixed = JSON.parse(JSON.stringify(RESOLVED)) as Record<string, unknown>;
    const population = mixed["population"] as { observations: { snapshot_date: string }[] };
    population.observations[1]!.snapshot_date = "2025-01-20";
    const f = ogFacts(mixed as unknown as SurnameResultResponse, "en");
    expect(f.lines[0]).toContain("20 January 2026");
    expect(f.lines[1]).toContain("20 January 2025");
    expect(f.footer).toBe("PESEL");
  });
});
