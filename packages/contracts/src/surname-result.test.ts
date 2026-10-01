import { describe, expect, it } from "vitest";
import {
  SURNAME_RESULT_SCHEMA_VERSION,
  apiErrorResponseSchema,
  changeEntrySchema,
  changePointSchema,
  changeSectionSchema,
  suggestionsSectionSchema,
  distributionEntrySchema,
  distributionSectionSchema,
  populationObservationSchema,
  populationSectionSchema,
  populationValueSchema,
  surnameResultResponseSchema,
  archiveSectionSchema,
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
        archive: null,
        change: null,
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

/** TASK-054: the archive section (ADR-0024). */
describe("archive section", () => {
  const surface = {
    surface: "FREE",
    decision: "ALLOWED",
    reason_code: "RIGHTS_PERMIT_FREE_SURFACE",
  };
  const READY = {
    state: "READY",
    query: '"ZAREMBA"',
    searched_on: "2026-10-01",
    catalogue_records: 1148,
    catalogue_by_category: [{ label: "Czasopisma", count: 193 }],
    pages: 54479,
    pages_by_period: [{ from_year: 1800, to_year: 1849, count: 2814 }],
    pages_by_place: [{ label: "Warszawa", count: 25755 }],
    examples: [
      {
        title: "Sprawozdanie Dyrekcyi Towarzystwa Przyjaciół Sztuk Pięknych w Krakowie",
        date: "1882-01-01",
        page_number: 122,
        excerpt: "Zaremba, w Starej Sieniawie",
        url: "https://polona.pl/item-view/31e6feab-8aa7-4d76-b824-a842ebc95507?page=121",
      },
    ],
    confidence: { status: "VERIFIED", methodology_code: "archive_search_scope@1" },
    citation: {
      id: "c1",
      title: "Polona",
      publisher: "Biblioteka Narodowa",
      publication_date: null,
      source_type: "DIGITAL_LIBRARY",
      locator: '"ZAREMBA"',
      url: "https://polona.pl/api/search-service/search/simple?query=%22ZAREMBA%22",
      attribution: "Polona, Biblioteka Narodowa",
      terms: null,
      retrieved_at: "2026-10-01T08:09:00.000Z",
      source_page_url: "https://polona.pl/",
    },
    reason_code: null,
    surface,
  };
  const NOT_SEARCHED = {
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
    surface,
  };

  it("accepts a searched surname, and one not searched yet", () => {
    expect(archiveSectionSchema.safeParse(READY).success).toBe(true);
    expect(archiveSectionSchema.safeParse(NOT_SEARCHED).success).toBe(true);
  });

  it("accepts zero matches as an answer, not as an absence", () => {
    expect(
      archiveSectionSchema.safeParse({
        ...READY,
        catalogue_records: 0,
        pages: 0,
        catalogue_by_category: [],
        pages_by_period: [],
        pages_by_place: [],
        examples: [],
      }).success,
    ).toBe(true);
  });

  it("refuses figures without their search, and a search without its source", () => {
    expect(archiveSectionSchema.safeParse({ ...READY, citation: null }).success).toBe(false);
    expect(archiveSectionSchema.safeParse({ ...READY, searched_on: null }).success).toBe(false);
    expect(
      archiveSectionSchema.safeParse({ ...NOT_SEARCHED, pages_by_place: READY.pages_by_place })
        .success,
    ).toBe(false);
    expect(archiveSectionSchema.safeParse({ ...NOT_SEARCHED, catalogue_records: 0 }).success).toBe(
      false,
    );
  });

  it("refuses an excerpt longer than 300 characters, and more than three examples", () => {
    const long = { ...READY.examples[0], excerpt: "x".repeat(301) };
    expect(archiveSectionSchema.safeParse({ ...READY, examples: [long] }).success).toBe(false);
    const four = Array.from({ length: 4 }, () => READY.examples[0]);
    expect(archiveSectionSchema.safeParse({ ...READY, examples: four }).success).toBe(false);
  });
});

describe("change over time (TASK-051, ADR-0020; schema 1.7)", () => {
  // Synthetic two-edition list, arithmetic checkable by eye: 100 of 1,000 is one in 10.
  const KNOWN_2019 = {
    status: "KNOWN" as const,
    data_date: "2019-06-30",
    note_code: "UNIVERSE_DESCRIPTION_DIFFERS" as const,
    source_url: "https://example.invalid/resources/1",
    count: 100,
    list_total: 1000,
    one_in_x: 10,
    share: 0.1,
  };
  const KNOWN_2026 = {
    status: "KNOWN" as const,
    data_date: "2026-01-20",
    note_code: null,
    source_url: "https://example.invalid/resources/2",
    count: 120,
    list_total: 1500,
    one_in_x: 13,
    share: 0.08,
  };
  const ENTRY = {
    list: "MALE" as const,
    points: [KNOWN_2019, KNOWN_2026],
    gaps: [],
    summary: {
      known_points: 2,
      first: { data_date: "2019-06-30", count: 100, list_total: 1000 },
      last: { data_date: "2026-01-20", count: 120, list_total: 1500 },
      count_change_percent: 20,
      list_change_percent: 50,
    },
    methodology_code: "distribution_shift@1",
    scope_label_code: "PESEL_CURRENT_SURNAME",
    country_code: "PL",
    confidence: { status: "VERIFIED" as const, methodology_code: "rule@1" },
    citation: VALID_CITATION,
  };
  const SURFACE = { surface: "FREE" as const, decision: "ALLOWED" as const, reason_code: "OK" };

  it("accepts a two-edition list", () => {
    expect(changeEntrySchema.safeParse(ENTRY).success).toBe(true);
  });

  it("accepts a NOT_ON_LIST point between two known ones, and refuses it carrying a count", () => {
    const absent = {
      status: "NOT_ON_LIST" as const,
      data_date: "2021-02-01",
      note_code: null,
      source_url: null,
    };
    expect(
      changeEntrySchema.safeParse({
        ...ENTRY,
        points: [KNOWN_2019, absent, KNOWN_2026],
      }).success,
    ).toBe(true);
    // The whole point: a surname a list does not name is never a zero.
    expect(changePointSchema.safeParse({ ...absent, count: 0 }).success).toBe(false);
    expect(changePointSchema.safeParse({ ...absent, count: 5 }).success).toBe(false);
  });

  it("refuses a known point with a count of zero or a one in X of zero", () => {
    expect(changePointSchema.safeParse({ ...KNOWN_2019, count: 0 }).success).toBe(false);
    expect(changePointSchema.safeParse({ ...KNOWN_2019, one_in_x: 0 }).success).toBe(false);
  });

  it("refuses fewer than two points, and fewer than two known ones", () => {
    expect(changeEntrySchema.safeParse({ ...ENTRY, points: [KNOWN_2019] }).success).toBe(false);
    const absent = {
      status: "NOT_ON_LIST" as const,
      data_date: "2026-01-20",
      note_code: null,
      source_url: null,
    };
    expect(
      changeEntrySchema.safeParse({
        ...ENTRY,
        points: [KNOWN_2019, absent],
        summary: { ...ENTRY.summary, known_points: 1 },
      }).success,
    ).toBe(false);
  });

  it("refuses points out of date order", () => {
    expect(
      changeEntrySchema.safeParse({ ...ENTRY, points: [KNOWN_2026, KNOWN_2019] }).success,
    ).toBe(false);
  });

  it("refuses a one in X, or a share, that does not follow the point's own count and total", () => {
    expect(
      changeEntrySchema.safeParse({
        ...ENTRY,
        points: [{ ...KNOWN_2019, one_in_x: 11 }, KNOWN_2026],
      }).success,
    ).toBe(false);
    expect(
      changeEntrySchema.safeParse({
        ...ENTRY,
        points: [{ ...KNOWN_2019, share: 0.2 }, KNOWN_2026],
      }).success,
    ).toBe(false);
  });

  it("refuses a count above its own list's total", () => {
    expect(
      changeEntrySchema.safeParse({
        ...ENTRY,
        points: [{ ...KNOWN_2019, count: 2000, one_in_x: 1, share: 1 }, KNOWN_2026],
      }).success,
    ).toBe(false);
  });

  it("refuses a summary that does not describe the first and the last known point", () => {
    expect(
      changeEntrySchema.safeParse({
        ...ENTRY,
        summary: { ...ENTRY.summary, first: { ...ENTRY.summary.first, count: 99 } },
      }).success,
    ).toBe(false);
    expect(
      changeEntrySchema.safeParse({ ...ENTRY, summary: { ...ENTRY.summary, known_points: 3 } })
        .success,
    ).toBe(false);
  });

  it("refuses a change whose sign contradicts its own first and last values", () => {
    expect(
      changeEntrySchema.safeParse({
        ...ENTRY,
        summary: { ...ENTRY.summary, count_change_percent: -20 },
      }).success,
    ).toBe(false);
    expect(
      changeEntrySchema.safeParse({
        ...ENTRY,
        summary: { ...ENTRY.summary, list_change_percent: 0 },
      }).success,
    ).toBe(false);
  });

  it("accepts a gap between the first and the last known point and refuses one outside them", () => {
    const gap = { data_date: "2022-01-27", reason_code: "PUBLISHER_DUPLICATE" as const };
    expect(changeEntrySchema.safeParse({ ...ENTRY, gaps: [gap] }).success).toBe(true);
    expect(
      changeEntrySchema.safeParse({ ...ENTRY, gaps: [{ ...gap, data_date: "2027-01-01" }] })
        .success,
    ).toBe(false);
  });

  it("puts entries on the section exactly when it is READY", () => {
    expect(
      changeSectionSchema.safeParse({
        state: "READY",
        entries: [ENTRY],
        reason_code: null,
        surface: SURFACE,
      }).success,
    ).toBe(true);
    expect(
      changeSectionSchema.safeParse({
        state: "READY",
        entries: [],
        reason_code: null,
        surface: SURFACE,
      }).success,
    ).toBe(false);
    expect(
      changeSectionSchema.safeParse({
        state: "UNAVAILABLE",
        entries: [ENTRY],
        reason_code: "NO_CHANGE_DERIVED",
        surface: SURFACE,
      }).success,
    ).toBe(false);
    expect(
      changeSectionSchema.safeParse({
        state: "UNAVAILABLE",
        entries: [],
        reason_code: "NO_CHANGE_DERIVED",
        surface: SURFACE,
      }).success,
    ).toBe(true);
  });

  it("is present exactly when the status is RESOLVED", () => {
    const base = {
      schema_version: SURNAME_RESULT_SCHEMA_VERSION,
      status: "UNRESOLVED" as const,
      surname: null,
      population: null,
      rarity: null,
      distribution: null,
      suggestions: NO_SUGGESTIONS,
      meaning: null,
      archive: null,
    };
    expect(surnameResultResponseSchema.safeParse({ ...base, change: null }).success).toBe(true);
    expect(
      surnameResultResponseSchema.safeParse({
        ...base,
        change: { state: "UNAVAILABLE", entries: [], reason_code: "X", surface: SURFACE },
      }).success,
    ).toBe(false);
    // Missing altogether is not the same as null: a 1.6 producer fails against 1.9.
    expect(surnameResultResponseSchema.safeParse(base).success).toBe(false);
  });

  it("is schema version 1.9", () => {
    expect(SURNAME_RESULT_SCHEMA_VERSION).toBe("1.9");
  });
});
