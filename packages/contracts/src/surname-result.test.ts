import { describe, expect, it } from "vitest";
import {
  SURNAME_RESULT_SCHEMA_VERSION,
  apiErrorResponseSchema,
  suggestionsSectionSchema,
  distributionEntrySchema,
  distributionSectionSchema,
  populationObservationSchema,
  populationSectionSchema,
  populationValueSchema,
  surnameResultResponseSchema,
} from "./surname-result.js";

/**
 * The read contract's own rules (TASK-006 §11 unit items 25–26).
 *
 * Every payload here is SYNTHETIC — constructed to exercise a schema rule.
 * None is PESEL evidence, and the counts are mechanical values.
 */

const VALID_CITATION = {
  id: "cit-1",
  title: "Nazwiska występujące w rejestrze PESEL",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: "2026-01-20",
  source_type: "OFFICIAL_DATASET",
  locator: "resource:1148808",
  url: "https://api.dane.gov.pl/resources/1148808/csv",
  attribution: null,
  terms: "CC0 1.0",
  retrieved_at: "2026-09-18T17:40:00Z",
  source_page_url:
    "https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel",
};

/** An empty suggestions section, which every non-RESOLVED response carries. */
const NO_SUGGESTIONS = {
  state: "UNAVAILABLE" as const,
  outcome: null,
  decision_mode: null,
  reason_code: "NO_CANDIDATE_ABOVE_THRESHOLD",
  suggestions: [],
};

const VALID_OBSERVATION = {
  value: {
    status: "KNOWN" as const,
    value: 1234,
    unit: "SURNAME_OCCURRENCES" as const,
    scope_label_code: "PESEL_CURRENT_SURNAME",
  },
  snapshot_date: "2026-01-20",
  country_code: "PL",
  source_population_scope: "Wykaz nazwisk męskich osób żyjących…",
  coverage_notes: null,
  comparability_group: "pesel_2026_national_male",
  confidence: { status: "VERIFIED" as const, methodology_code: "rule@1" },
  citation: VALID_CITATION,
};

describe("population value (docs/canonical/16 §26)", () => {
  it("accepts a known count", () => {
    expect(populationValueSchema.safeParse(VALID_OBSERVATION.value).success).toBe(true);
  });

  it("rejects a value of 0 — absence is never zero", () => {
    const zero = { ...VALID_OBSERVATION.value, value: 0 };
    expect(populationValueSchema.safeParse(zero).success).toBe(false);
  });

  it("rejects a negative count", () => {
    expect(populationValueSchema.safeParse({ ...VALID_OBSERVATION.value, value: -1 }).success).toBe(
      false,
    );
  });

  it("rejects a suppressed value that still carries a number", () => {
    // The whole point of NumericValueStatus is that suppression is not a
    // number. `{status: "SUPPRESSED", value: 0}` must be unrepresentable.
    const suppressedWithValue = {
      ...VALID_OBSERVATION.value,
      status: "SUPPRESSED" as const,
      value: 1,
    };
    expect(populationValueSchema.safeParse(suppressedWithValue).success).toBe(false);
  });

  it("accepts a suppressed value with a null count", () => {
    const suppressed = {
      ...VALID_OBSERVATION.value,
      status: "SUPPRESSED" as const,
      value: null,
      scope_label_code: "PESEL_PUBLICATION_THRESHOLD",
    };
    expect(populationValueSchema.safeParse(suppressed).success).toBe(true);
  });

  it("rejects a KNOWN status with a null count", () => {
    expect(
      populationValueSchema.safeParse({ ...VALID_OBSERVATION.value, value: null }).success,
    ).toBe(false);
  });

  it("admits SURNAME_OCCURRENCES as a unit (ADR-0004)", () => {
    expect(populationValueSchema.safeParse(VALID_OBSERVATION.value).success).toBe(true);
  });

  it("rejects a unit the contract does not define", () => {
    expect(
      populationValueSchema.safeParse({ ...VALID_OBSERVATION.value, unit: "HOUSEHOLDS" }).success,
    ).toBe(false);
  });
});

describe("population observation", () => {
  it("accepts a complete observation", () => {
    expect(populationObservationSchema.safeParse(VALID_OBSERVATION).success).toBe(true);
  });

  it("rejects an observation with no snapshot date", () => {
    const { snapshot_date: _omitted, ...withoutDate } = VALID_OBSERVATION;
    expect(populationObservationSchema.safeParse(withoutDate).success).toBe(false);
  });

  it("rejects a malformed snapshot date", () => {
    expect(
      populationObservationSchema.safeParse({ ...VALID_OBSERVATION, snapshot_date: "2026" })
        .success,
    ).toBe(false);
  });

  it("rejects an observation with no dataset scope", () => {
    expect(
      populationObservationSchema.safeParse({ ...VALID_OBSERVATION, source_population_scope: "" })
        .success,
    ).toBe(false);
  });

  it("carries no confidence rationale field", () => {
    // docs/canonical/11 §10.3: the rationale is internal, "not final
    // consumer copy". It must not be expressible in this contract.
    const withRationale = populationObservationSchema.safeParse({
      ...VALID_OBSERVATION,
      confidence: { ...VALID_OBSERVATION.confidence, rationale: "internal explanation" },
    });
    expect(withRationale.success).toBe(true);
    if (!withRationale.success) return;
    expect(withRationale.data.confidence).not.toHaveProperty("rationale");
  });
});

describe("citation source page (1.6, ADR-0012)", () => {
  it("requires source_page_url, so a producer cannot silently leave it out", () => {
    const { source_page_url: _omitted, ...withoutPage } = VALID_CITATION;
    expect(
      populationObservationSchema.safeParse({ ...VALID_OBSERVATION, citation: withoutPage })
        .success,
    ).toBe(false);
  });

  it("accepts null for a source with no public page", () => {
    expect(
      populationObservationSchema.safeParse({
        ...VALID_OBSERVATION,
        citation: { ...VALID_CITATION, source_page_url: null },
      }).success,
    ).toBe(true);
  });
});

describe("population section", () => {
  const surface = { surface: "FREE" as const, decision: "CONDITIONAL" as const, reason_code: "X" };

  it("requires observations when READY", () => {
    expect(
      populationSectionSchema.safeParse({
        state: "READY",
        observations: [],
        reason_code: null,
        surface,
      }).success,
    ).toBe(false);
  });

  it("forbids observations when RIGHTS_BLOCKED", () => {
    // docs/canonical/16 §55: never send content a surface may not show and
    // rely on the client to hide it.
    expect(
      populationSectionSchema.safeParse({
        state: "RIGHTS_BLOCKED",
        observations: [VALID_OBSERVATION],
        reason_code: "COMMERCIAL_USE_UNRESOLVED",
        surface: { ...surface, decision: "BLOCKED" },
      }).success,
    ).toBe(false);
  });

  it("forbids observations when UNAVAILABLE", () => {
    expect(
      populationSectionSchema.safeParse({
        state: "UNAVAILABLE",
        observations: [VALID_OBSERVATION],
        reason_code: "NO_APPLICABLE_EVIDENCE",
        surface,
      }).success,
    ).toBe(false);
  });

  it("accepts an empty UNAVAILABLE section", () => {
    expect(
      populationSectionSchema.safeParse({
        state: "UNAVAILABLE",
        observations: [],
        reason_code: "NO_APPLICABLE_EVIDENCE",
        surface,
      }).success,
    ).toBe(true);
  });
});

describe("top-level response", () => {
  const identity = {
    id: "01a0b9e3-34f3-7633-a239-2b8596dfc088",
    display_name: "NOWAK",
    script: "Latn",
  };

  it("requires an identity and a population section when RESOLVED", () => {
    expect(
      surnameResultResponseSchema.safeParse({
        schema_version: SURNAME_RESULT_SCHEMA_VERSION,
        status: "RESOLVED",
        surname: null,
        population: null,
        rarity: null,
        distribution: null,
        suggestions: null,
      }).success,
    ).toBe(false);
  });

  it("forbids an identity when UNRESOLVED — one surname's facts never leak into another's miss", () => {
    expect(
      surnameResultResponseSchema.safeParse({
        schema_version: SURNAME_RESULT_SCHEMA_VERSION,
        status: "UNRESOLVED",
        surname: identity,
        population: null,
        rarity: null,
        distribution: null,
        suggestions: NO_SUGGESTIONS,
      }).success,
    ).toBe(false);
  });

  it("accepts a bare UNRESOLVED response", () => {
    expect(
      surnameResultResponseSchema.safeParse({
        schema_version: SURNAME_RESULT_SCHEMA_VERSION,
        status: "UNRESOLVED",
        surname: null,
        population: null,
        rarity: null,
        distribution: null,
        suggestions: NO_SUGGESTIONS,
        meaning: null,
      }).success,
    ).toBe(true);
  });

  it("rejects a non-uuid surname id", () => {
    expect(
      surnameResultResponseSchema.safeParse({
        schema_version: SURNAME_RESULT_SCHEMA_VERSION,
        status: "RESOLVED",
        surname: { ...identity, id: "nowak" },
        population: {
          state: "READY",
          observations: [VALID_OBSERVATION],
          reason_code: null,
          surface: { surface: "FREE", decision: "CONDITIONAL", reason_code: "X" },
        },
        rarity: null,
        distribution: null,
        suggestions: null,
      }).success,
    ).toBe(false);
  });

  it("pins the schema version", () => {
    expect(
      surnameResultResponseSchema.safeParse({
        schema_version: "2.0",
        status: "UNRESOLVED",
        surname: null,
        population: null,
        rarity: null,
        distribution: null,
        suggestions: NO_SUGGESTIONS,
      }).success,
    ).toBe(false);
  });
});

describe("distribution entry (docs/canonical/16 §28, TASK-012)", () => {
  // Three synthetic regions whose counts sum to 100, so the arithmetic a
  // refinement checks is obvious by inspection.
  const REGIONS = [
    {
      place_id: "01a0c057-0000-7000-8000-000000000001",
      terc_code: "30",
      display_name: "WIELKOPOLSKIE",
      count: 50,
      share_of_covered: 0.5,
    },
    {
      place_id: "01a0c057-0000-7000-8000-000000000002",
      terc_code: "24",
      display_name: "ŚLĄSKIE",
      count: 30,
      share_of_covered: 0.3,
    },
    {
      place_id: "01a0c057-0000-7000-8000-000000000003",
      terc_code: "20",
      display_name: "PODLASKIE",
      count: 20,
      share_of_covered: 0.2,
    },
  ];

  const ENTRY = {
    coverage_state: "READY" as const,
    regions: REGIONS,
    covered_count: 100,
    national_count: 110,
    coverage_ratio: 0.909090909,
    coverage_basis: "covered_count / national_count",
    low_coverage_threshold: 0.5,
    universe_label_code: "PESEL_REGISTERED_VOIVODESHIP_COVERED_SET",
    scope_label_code: "PESEL_CURRENT_SURNAME",
    snapshot_date: "2026-01-20",
    country_code: "PL",
    comparability_group: "pesel_2026_regional_male",
    confidence: { status: "VERIFIED" as const, methodology_code: "rule@1" },
    citation: VALID_CITATION,
  };

  it("accepts a complete entry", () => {
    expect(distributionEntrySchema.safeParse(ENTRY).success).toBe(true);
  });

  it("rejects a covered count that disagrees with its own regions", () => {
    // The whole point of the covered set is that it is the sum of the
    // numerators. A payload where it is not cannot be served.
    expect(distributionEntrySchema.safeParse({ ...ENTRY, covered_count: 99 }).success).toBe(false);
  });

  it("rejects a region with a count of 0 — an unlisted region has no entry at all", () => {
    expect(
      distributionEntrySchema.safeParse({
        ...ENTRY,
        regions: [
          ...REGIONS,
          {
            place_id: "01a0c057-0000-7000-8000-000000000004",
            terc_code: "28",
            display_name: "WARMIŃSKO-MAZURSKIE",
            count: 0,
            share_of_covered: 0,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects an entry with no regions", () => {
    expect(
      distributionEntrySchema.safeParse({ ...ENTRY, regions: [], covered_count: 100 }).success,
    ).toBe(false);
  });

  it("requires COVERAGE_UNKNOWN exactly when the ratio is null", () => {
    expect(
      distributionEntrySchema.safeParse({
        ...ENTRY,
        coverage_state: "COVERAGE_UNKNOWN",
        national_count: null,
        coverage_ratio: null,
      }).success,
    ).toBe(true);
    // A null ratio with a state claiming the figures are presentable.
    expect(
      distributionEntrySchema.safeParse({
        ...ENTRY,
        national_count: null,
        coverage_ratio: null,
      }).success,
    ).toBe(false);
    // A known ratio dressed as unknown.
    expect(
      distributionEntrySchema.safeParse({ ...ENTRY, coverage_state: "COVERAGE_UNKNOWN" }).success,
    ).toBe(false);
  });

  it("requires a ratio and a national count to travel together", () => {
    expect(distributionEntrySchema.safeParse({ ...ENTRY, national_count: null }).success).toBe(
      false,
    );
    expect(distributionEntrySchema.safeParse({ ...ENTRY, coverage_ratio: null }).success).toBe(
      false,
    );
  });

  it("requires the coverage state to agree with the threshold it carries", () => {
    // MELNYK's real shape: 210 placed of 6,442, which is not a distribution.
    expect(
      distributionEntrySchema.safeParse({
        ...ENTRY,
        coverage_state: "LOW_COVERAGE",
        national_count: 3068,
        coverage_ratio: 0.032594524,
      }).success,
    ).toBe(true);
    // The same figures labelled READY.
    expect(
      distributionEntrySchema.safeParse({
        ...ENTRY,
        national_count: 3068,
        coverage_ratio: 0.032594524,
      }).success,
    ).toBe(false);
  });

  it("refuses a covered count above the national count", () => {
    expect(
      distributionEntrySchema.safeParse({ ...ENTRY, national_count: 99, coverage_ratio: 0.99 })
        .success,
    ).toBe(false);
  });

  it("has no field for a share of the national count", () => {
    const parsed = distributionEntrySchema.parse(ENTRY);
    const keys = Object.keys(parsed).concat(Object.keys(parsed.regions[0] ?? {}));
    expect(keys.filter((k) => k.includes("national"))).toEqual(["national_count"]);
    expect(keys).not.toContain("share_of_national");
    expect(keys).not.toContain("share");
  });
});

describe("distribution section (docs/canonical/16 §28)", () => {
  const SURFACE = { surface: "FREE" as const, decision: "ALLOWED" as const, reason_code: "OK" };

  it("forbids entries when UNAVAILABLE — §28 forbids a fabricated empty map", () => {
    expect(
      distributionSectionSchema.safeParse({
        state: "UNAVAILABLE",
        entries: [],
        reason_code: "NO_COMPLETE_REGIONAL_UNIVERSE",
        surface: SURFACE,
      }).success,
    ).toBe(true);
    expect(
      distributionSectionSchema.safeParse({
        state: "READY",
        entries: [],
        reason_code: null,
        surface: SURFACE,
      }).success,
    ).toBe(false);
  });
});

describe("suggestions section (docs/canonical/13 §32.2, §33.4, TASK-016)", () => {
  const one = {
    surname: {
      id: "01a0b9e3-34f3-7633-a239-2b8596dfc088",
      display_name: "CICHOWSKI",
      script: "Latn",
    },
    match_type: "FUZZY_CANDIDATE" as const,
    explanation_codes: ["ADJACENT_TRANSPOSITION", "EDIT_DISTANCE_1"],
  };
  const two = {
    ...one,
    surname: {
      ...one.surname,
      id: "01a0b9e3-34f3-7633-a239-2b8596dfc089",
      display_name: "CICHOSKI",
    },
    explanation_codes: ["EDIT_DISTANCE_1"],
  };

  it("accepts one candidate as SUGGESTION_REQUIRED and several as MULTIPLE_CANDIDATES", () => {
    expect(
      suggestionsSectionSchema.safeParse({
        state: "READY",
        outcome: "SUGGESTION_REQUIRED",
        decision_mode: "USER_CONFIRM",
        reason_code: null,
        suggestions: [one],
      }).success,
    ).toBe(true);
    expect(
      suggestionsSectionSchema.safeParse({
        state: "READY",
        outcome: "MULTIPLE_CANDIDATES",
        decision_mode: "USER_CONFIRM",
        reason_code: null,
        suggestions: [one, two],
      }).success,
    ).toBe(true);
  });

  it("rejects an outcome that disagrees with how many candidates it carries", () => {
    expect(
      suggestionsSectionSchema.safeParse({
        state: "READY",
        outcome: "SUGGESTION_REQUIRED",
        decision_mode: "USER_CONFIRM",
        reason_code: null,
        suggestions: [one, two],
      }).success,
    ).toBe(false);
    expect(
      suggestionsSectionSchema.safeParse({
        state: "READY",
        outcome: "MULTIPLE_CANDIDATES",
        decision_mode: "USER_CONFIRM",
        reason_code: null,
        suggestions: [one],
      }).success,
    ).toBe(false);
  });

  it("cannot express an auto-applied suggestion — §32.2 forbids replacing input silently", () => {
    expect(
      suggestionsSectionSchema.safeParse({
        state: "READY",
        outcome: "SUGGESTION_REQUIRED",
        decision_mode: "AUTO",
        reason_code: null,
        suggestions: [one],
      }).success,
    ).toBe(false);
  });

  it("forbids candidates when UNAVAILABLE and requires them when READY", () => {
    expect(
      suggestionsSectionSchema.safeParse({
        state: "UNAVAILABLE",
        outcome: null,
        decision_mode: null,
        reason_code: "INPUT_TOO_SHORT",
        suggestions: [],
      }).success,
    ).toBe(true);
    expect(
      suggestionsSectionSchema.safeParse({
        state: "UNAVAILABLE",
        outcome: null,
        decision_mode: null,
        reason_code: "INPUT_TOO_SHORT",
        suggestions: [one],
      }).success,
    ).toBe(false);
    expect(
      suggestionsSectionSchema.safeParse({
        state: "READY",
        outcome: "SUGGESTION_REQUIRED",
        decision_mode: "USER_CONFIRM",
        reason_code: null,
        suggestions: [],
      }).success,
    ).toBe(false);
  });

  it("carries no similarity, distance or score field", () => {
    const parsed = suggestionsSectionSchema.parse({
      state: "READY",
      outcome: "SUGGESTION_REQUIRED",
      decision_mode: "USER_CONFIRM",
      reason_code: null,
      suggestions: [one],
    });
    const keys = Object.keys(parsed.suggestions[0] ?? {});
    for (const forbidden of [
      "trigram_similarity",
      "similarity",
      "edit_distance",
      "retrieval_rank_score",
      "score",
      "confidence",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(keys.sort()).toEqual(["explanation_codes", "match_type", "surname"]);
  });

  it("requires at least one explanation code — every candidate explains itself", () => {
    expect(
      suggestionsSectionSchema.safeParse({
        state: "READY",
        outcome: "SUGGESTION_REQUIRED",
        decision_mode: "USER_CONFIRM",
        reason_code: null,
        suggestions: [{ ...one, explanation_codes: [] }],
      }).success,
    ).toBe(false);
  });
});

describe("error envelope (docs/canonical/16 §78)", () => {
  it("accepts a well-formed envelope", () => {
    expect(
      apiErrorResponseSchema.safeParse({
        error: {
          code: "INVALID_SURNAME_INPUT",
          message: "the surname could not be accepted",
          retryable: false,
          request_id: "req-1",
        },
      }).success,
    ).toBe(true);
  });

  it("rejects a code the contract does not define", () => {
    expect(
      apiErrorResponseSchema.safeParse({
        error: { code: "SQL_ERROR", message: "x", retryable: false, request_id: "r" },
      }).success,
    ).toBe(false);
  });

  it("carries no field a stack trace could travel in", () => {
    const parsed = apiErrorResponseSchema.safeParse({
      error: {
        code: "INTERNAL_ERROR",
        message: "the request could not be completed",
        retryable: false,
        request_id: "r",
        stack: "Error: at /home/user/...",
        details: { sql: "SELECT 1" },
      },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.error).not.toHaveProperty("stack");
    expect(parsed.data.error).not.toHaveProperty("details");
  });
});
