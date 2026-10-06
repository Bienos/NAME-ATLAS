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
  bearersSectionSchema,
  neighbourListSchema,
  neighboursSectionSchema,
  otherFormSchema,
  LOCALITIES_LIMIT,
  localitiesSectionSchema,
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
        bearers: null,
        change: null,
        neighbours: null,
        other_form: null,
        other_spelling: null,
        localities: null,
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
      bearers: null,
      neighbours: null,
      other_form: null,
      other_spelling: null,
      localities: null,
    };
    expect(surnameResultResponseSchema.safeParse({ ...base, change: null }).success).toBe(true);
    expect(
      surnameResultResponseSchema.safeParse({
        ...base,
        change: { state: "UNAVAILABLE", entries: [], reason_code: "X", surface: SURFACE },
      }).success,
    ).toBe(false);
    // Missing altogether is not the same as null: a 1.6 producer fails against 1.11.
    expect(surnameResultResponseSchema.safeParse(base).success).toBe(false);
  });

  it("is schema version 1.13", () => {
    expect(SURNAME_RESULT_SCHEMA_VERSION).toBe("1.13");
  });
});

describe("neighbours and the other form (TASK-055, ADR-0025; schema 1.10)", () => {
  const SURFACE = { surface: "FREE" as const, decision: "ALLOWED" as const, reason_code: "X" };
  const who = (n: number, display_name: string) => ({
    id: `01a0b9e3-34f3-7633-a239-2b8596dfc0${String(n).padStart(2, "0")}`,
    display_name,
    script: "Latn",
  });
  // Synthetic ranks and counts.
  const LIST = {
    comparability_group: "g_male",
    snapshot_date: "2026-01-20",
    entries: [
      { surname: who(1, "A"), rank: 2, count: 500, is_self: false },
      { surname: who(2, "B"), rank: 3, count: 400, is_self: true },
      { surname: who(3, "C"), rank: 3, count: 400, is_self: false },
      { surname: who(4, "D"), rank: 5, count: 300, is_self: false },
    ],
  };
  const OTHER = {
    surname: who(9, "BSKA"),
    rule_code: "ADJECTIVAL_SKI_CKI_DZKI" as const,
    comparability_group: "g_female",
    snapshot_date: "2026-01-20",
    rank: 7,
    count: 250,
    surface: SURFACE,
  };

  it("accepts a list with the surname once, ties sharing a rank", () => {
    expect(neighbourListSchema.safeParse(LIST).success).toBe(true);
  });

  it("refuses a list without the surname itself, or with it twice", () => {
    const none = LIST.entries.map((e) => ({ ...e, is_self: false }));
    expect(neighbourListSchema.safeParse({ ...LIST, entries: none }).success).toBe(false);
    const twice = LIST.entries.map((e, i) => ({ ...e, is_self: i < 2 }));
    expect(neighbourListSchema.safeParse({ ...LIST, entries: twice }).success).toBe(false);
  });

  it("refuses a list out of rank order, or with a count rising down the list", () => {
    const reversed = [...LIST.entries].reverse();
    expect(neighbourListSchema.safeParse({ ...LIST, entries: reversed }).success).toBe(false);
    const rising = LIST.entries.map((e, i) => (i === 3 ? { ...e, count: 450 } : e));
    expect(neighbourListSchema.safeParse({ ...LIST, entries: rising }).success).toBe(false);
  });

  it("refuses more than two places either side", () => {
    const six = [...LIST.entries, { surname: who(5, "E"), rank: 6, count: 200, is_self: false }];
    six.push({ surname: who(6, "F"), rank: 7, count: 100, is_self: false });
    expect(neighbourListSchema.safeParse({ ...LIST, entries: six }).success).toBe(false);
  });

  it("is READY exactly when it holds lists, and gives a reason otherwise", () => {
    const ready = { state: "READY", lists: [LIST], reason_code: null, surface: SURFACE };
    expect(neighboursSectionSchema.safeParse(ready).success).toBe(true);
    expect(neighboursSectionSchema.safeParse({ ...ready, lists: [] }).success).toBe(false);
    expect(neighboursSectionSchema.safeParse({ ...ready, reason_code: "X" }).success).toBe(false);
    const none = { state: "UNAVAILABLE", lists: [], reason_code: "NO_RANK", surface: SURFACE };
    expect(neighboursSectionSchema.safeParse(none).success).toBe(true);
    expect(neighboursSectionSchema.safeParse({ ...none, lists: [LIST] }).success).toBe(false);
    expect(neighboursSectionSchema.safeParse({ ...none, reason_code: null }).success).toBe(false);
  });

  it("names the other form only by the fixed rule", () => {
    expect(otherFormSchema.safeParse(OTHER).success).toBe(true);
    expect(otherFormSchema.safeParse({ ...OTHER, rule_code: "ANY_ENDING" }).success).toBe(false);
  });

  const resolved = {
    schema_version: SURNAME_RESULT_SCHEMA_VERSION,
    status: "RESOLVED" as const,
    surname: who(2, "B"),
    population: {
      state: "UNAVAILABLE",
      observations: [],
      reason_code: "X",
      surface: SURFACE,
    },
    rarity: { state: "UNAVAILABLE", entries: [], reason_code: "X", surface: SURFACE },
    distribution: { state: "UNAVAILABLE", entries: [], reason_code: "X", surface: SURFACE },
    suggestions: null,
    meaning: {
      state: "NO_SOURCED_MEANING",
      interpretations: [],
      confidence: null,
      methodology_code: null,
      reason_code: "X",
      surface: SURFACE,
    },
    change: { state: "UNAVAILABLE", entries: [], reason_code: "X", surface: SURFACE },
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
      reason_code: "X",
      surface: SURFACE,
    },
    bearers: {
      state: "NOT_SEARCHED",
      searched_on: null,
      total: null,
      with_death_date: null,
      people: [],
      more: null,
      confidence: null,
      citation: null,
      reason_code: "X",
      surface: SURFACE,
    },
    neighbours: { state: "READY", lists: [LIST], reason_code: null, surface: SURFACE },
    other_form: OTHER,
    other_spelling: null,
    localities: {
      state: "NOT_LOADED",
      reference_date: null,
      places: [],
      total: null,
      confidence: null,
      citation: null,
      reason_code: "TERYT_NOT_LOADED",
      surface: SURFACE,
    },
  };

  it("carries both on a resolved surname, and refuses an other form that is the surname itself", () => {
    const check = (r: unknown) => surnameResultResponseSchema.safeParse(r);
    expect(check(resolved).success).toBe(true);
    expect(check({ ...resolved, neighbours: null }).success).toBe(false);
    const self = { ...OTHER, surname: resolved.surname };
    expect(check({ ...resolved, other_form: self }).success).toBe(false);
  });

  it("refuses either on a surname that did not resolve", () => {
    const unresolved = {
      ...resolved,
      status: "UNRESOLVED" as const,
      surname: null,
      population: null,
      rarity: null,
      distribution: null,
      suggestions: NO_SUGGESTIONS,
      meaning: null,
      change: null,
      archive: null,
      bearers: null,
      neighbours: null,
      other_form: null,
      other_spelling: null,
      localities: null,
    };
    const check = (r: unknown) => surnameResultResponseSchema.safeParse(r);
    expect(check(unresolved).success).toBe(true);
    expect(check({ ...unresolved, neighbours: resolved.neighbours }).success).toBe(false);
    expect(check({ ...unresolved, other_form: OTHER }).success).toBe(false);
  });

  it("carries an other spelling on a resolved surname only, and never the surname itself (1.13)", () => {
    // WIŚNIEWSKI's men's count on the 2026-01-20 register, on WISNIEWSKI's page (TASK-131).
    const spelling = {
      surname: {
        id: "01a0b9e3-34f3-7633-a239-2b8596dfc0ff",
        display_name: "WIŚNIEWSKI",
        script: "Latn",
      },
      rule_code: "POLISH_DIACRITIC_FOLD",
      comparability_group: "pesel_2026_national_male",
      snapshot_date: "2026-01-20",
      count: 53079,
      surface: SURFACE,
    };
    const check = (r: unknown) => surnameResultResponseSchema.safeParse(r);
    expect(check({ ...resolved, other_spelling: spelling }).success).toBe(true);
    expect(
      check({ ...resolved, other_spelling: { ...spelling, surname: resolved.surname } }).success,
    ).toBe(false);
    expect(
      check({ ...resolved, other_spelling: { ...spelling, rule_code: "FUZZY" } }).success,
    ).toBe(false);
    expect(check({ ...resolved, other_spelling: { ...spelling, count: 0 } }).success).toBe(false);
    const { other_spelling: _, ...without } = resolved;
    expect(check(without).success).toBe(false);
    const unresolved = {
      ...resolved,
      status: "UNRESOLVED" as const,
      surname: null,
      population: null,
      rarity: null,
      distribution: null,
      suggestions: NO_SUGGESTIONS,
      meaning: null,
      change: null,
      archive: null,
      bearers: null,
      neighbours: null,
      other_form: null,
      localities: null,
    };
    expect(check({ ...unresolved, other_spelling: null }).success).toBe(true);
    expect(check({ ...unresolved, other_spelling: spelling }).success).toBe(false);
  });

  describe("localities with the surname's name (TASK-090, ADR-0025 §2.7; schema 1.11)", () => {
    // SYNTHETIC ids; the place is the real Jemna of the TERYT excerpt (TASK-039).
    const id = (n: number) => `01a0b9e3-34f3-7633-a239-2b8596dfc0${String(n).padStart(2, "0")}`;
    const place = (n: number, name: string, kind: "CITY" | "VILLAGE" | "OTHER") => ({
      place: { id: id(n), name, kind, teryt_simc: String(855_434 + n).padStart(7, "0") },
      gmina: "Stoszowice",
      powiat: "ząbkowicki",
      voivodeship: "DOLNOŚLĄSKIE",
    });
    const CITATION = {
      ...VALID_CITATION,
      id: id(90),
      title: "TERYT",
      publisher: "GUS",
      publication_date: "2026-01-01",
      locator: "TERYT SIMC, wersja urzędowa, STAN_NA 2026-01-01",
      attribution: null,
      terms: null,
      source_page_url: "https://api.stat.gov.pl/Home/TerytApi?lang=en",
    };
    const ready = {
      state: "READY",
      reference_date: "2026-01-01",
      places: [place(1, "Jemna", "VILLAGE")],
      total: 1,
      confidence: {
        status: "VERIFIED",
        methodology_code: "official_name_exact_key@locality_match@1",
      },
      citation: CITATION,
      reason_code: null,
      surface: SURFACE,
    };
    const notLoaded = resolved.localities;
    const check = (l: unknown) => localitiesSectionSchema.safeParse(l).success;

    it("accepts a READY section with its date, total, confidence and citation, and one with no place", () => {
      expect(check(ready)).toBe(true);
      expect(check({ ...ready, places: [], total: 0 })).toBe(true);
      expect(check(notLoaded)).toBe(true);
    });

    it("refuses a READY section missing its date, total, confidence or citation, or carrying a reason", () => {
      expect(check({ ...ready, reference_date: null })).toBe(false);
      expect(check({ ...ready, total: null })).toBe(false);
      expect(check({ ...ready, confidence: null })).toBe(false);
      expect(check({ ...ready, citation: null })).toBe(false);
      expect(check({ ...ready, reason_code: "X" })).toBe(false);
    });

    it("refuses a list longer than its total, a place listed twice, or more than the limit", () => {
      expect(check({ ...ready, total: 0 })).toBe(false);
      expect(
        check({
          ...ready,
          places: [place(1, "Jemna", "VILLAGE"), place(1, "Jemna", "VILLAGE")],
          total: 2,
        }),
      ).toBe(false);
      const many = Array.from({ length: LOCALITIES_LIMIT + 1 }, (_, i) =>
        place(i + 1, "Jemna", "OTHER"),
      );
      expect(check({ ...ready, places: many, total: many.length })).toBe(false);
      expect(check({ ...ready, places: many.slice(0, LOCALITIES_LIMIT), total: many.length })).toBe(
        true,
      );
    });

    it("refuses places, a date or a citation on a section that is not READY, and a bad SIMC id", () => {
      expect(check({ ...notLoaded, places: ready.places })).toBe(false);
      expect(check({ ...notLoaded, reference_date: "2026-01-01" })).toBe(false);
      expect(check({ ...notLoaded, reason_code: null })).toBe(false);
      const bad = { ...place(1, "Jemna", "VILLAGE") };
      expect(
        check({ ...ready, places: [{ ...bad, place: { ...bad.place, teryt_simc: "855434" } }] }),
      ).toBe(false);
    });

    it("is present exactly when the surname resolved", () => {
      const response = (r: unknown) => surnameResultResponseSchema.safeParse(r).success;
      expect(response({ ...resolved, localities: ready })).toBe(true);
      expect(response({ ...resolved, localities: null })).toBe(false);
      const unresolved = {
        ...resolved,
        status: "UNRESOLVED" as const,
        surname: null,
        population: null,
        rarity: null,
        distribution: null,
        suggestions: NO_SUGGESTIONS,
        meaning: null,
        change: null,
        archive: null,
        neighbours: null,
        other_form: null,
        other_spelling: null,
        localities: null,
        bearers: null,
      };
      expect(response(unresolved)).toBe(true);
      expect(response({ ...unresolved, localities: ready })).toBe(false);
    });
  });
});

/** TASK-073: the known people with the surname, from Wikidata (ADR-0030). */
describe("bearers section", () => {
  const SURFACE = {
    surface: "FREE",
    decision: "ALLOWED",
    reason_code: "RIGHTS_PERMIT_FREE_SURFACE",
  };
  const PERSON = {
    wikidata_id: "Q896660",
    name: "Stanisław Zaremba",
    description_pl: "polski matematyk, profesor UJ",
    description_en: null,
    born: 1863,
    died: 1942,
    article_url: "https://pl.wikipedia.org/wiki/Stanis%C5%82aw_Zaremba_(1863%E2%80%931942)",
    wikidata_url: "https://www.wikidata.org/wiki/Q896660",
  };
  const READY = {
    state: "READY",
    searched_on: "2026-10-03",
    total: 59,
    with_death_date: 37,
    people: [PERSON],
    more: 58,
    confidence: { status: "VERIFIED", methodology_code: "wikidata_query_scope@wikidata_scope@1" },
    citation: {
      id: "c1",
      title: "Wikidata",
      publisher: null,
      publication_date: null,
      source_type: "OTHER",
      locator: "Zaremba",
      url: "https://query.wikidata.org/#q",
      attribution: null,
      terms: "CC0",
      retrieved_at: "2026-10-03T12:05:00Z",
      source_page_url: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    },
    reason_code: null,
    surface: SURFACE,
  };
  const NOT_SEARCHED = {
    state: "NOT_SEARCHED",
    searched_on: null,
    total: null,
    with_death_date: null,
    people: [],
    more: null,
    confidence: null,
    citation: null,
    reason_code: "BEARERS_NOT_SEARCHED",
    surface: SURFACE,
  };

  it("accepts a ready answer, a zero, and the absence of one", () => {
    expect(bearersSectionSchema.safeParse(READY).success).toBe(true);
    expect(
      bearersSectionSchema.safeParse({
        ...READY,
        total: 0,
        with_death_date: 0,
        people: [],
        more: 0,
      }).success,
    ).toBe(true);
    expect(bearersSectionSchema.safeParse(NOT_SEARCHED).success).toBe(true);
  });

  it("refuses people or counts on a section that holds no answer", () => {
    expect(bearersSectionSchema.safeParse({ ...NOT_SEARCHED, people: [PERSON] }).success).toBe(
      false,
    );
    expect(bearersSectionSchema.safeParse({ ...NOT_SEARCHED, total: 0 }).success).toBe(false);
    expect(bearersSectionSchema.safeParse({ ...READY, citation: null }).success).toBe(false);
  });

  it("refuses people and a remainder that do not add up to the total", () => {
    expect(bearersSectionSchema.safeParse({ ...READY, more: 57 }).success).toBe(false);
    expect(bearersSectionSchema.safeParse({ ...READY, with_death_date: 60 }).success).toBe(false);
  });

  it("refuses an id that is not a Wikidata id", () => {
    const bad = { ...PERSON, wikidata_id: "2143315" };
    expect(bearersSectionSchema.safeParse({ ...READY, people: [bad] }).success).toBe(false);
  });
});
