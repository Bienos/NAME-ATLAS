import type { SurnameResultResponse } from "@name-atlas/contracts";
import { surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * Surname results for the couple report's tests (TASK-100), each parsed by the
 * contract first, so a fixture the page could never receive proves nothing.
 * SYNTHETIC: the figures are shaped like the register's, not quoted from it.
 */

const CITATION = {
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
  source_page_url: null,
};
const CONFIDENCE = { status: "VERIFIED", methodology_code: "rule@1" };
const SURFACE = { surface: "FREE", decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" };

function observation(count: number, group: string) {
  return {
    value: {
      status: "KNOWN",
      value: count,
      unit: "PEOPLE",
      scope_label_code: "PESEL_CURRENT_SURNAME",
    },
    snapshot_date: "2026-01-20",
    country_code: "PL",
    source_population_scope: "Wykaz nazwisk osób żyjących",
    coverage_notes: null,
    comparability_group: group,
    confidence: CONFIDENCE,
    citation: CITATION,
  };
}

const NO_MEANING = {
  state: "NO_SOURCED_MEANING",
  interpretations: [],
  confidence: null,
  methodology_code: null,
  reason_code: "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
  surface: SURFACE,
};

const WITH_MEANING = {
  state: "AVAILABLE",
  interpretations: [
    {
      literal_gloss: "SYNTHETIC GLOSS FOR A TEST",
      root_form: "kowal",
      root_language: "polski",
      formation_type: "PATRONYMIC",
      work: { author_or_publisher: "Test", title: "Słownik testowy", year: 2000 },
      locator: "s. 1",
    },
  ],
  confidence: "LIKELY",
  methodology_code: "meaning@1",
  reason_code: null,
  surface: SURFACE,
};

export interface FixtureOptions {
  readonly id: string;
  readonly display: string;
  /** Counts on the men's and women's lists; an empty list makes population UNAVAILABLE. */
  readonly counts?: readonly (readonly [number, "male" | "female"])[];
  readonly otherForm?: { readonly id: string; readonly display: string } | null;
  readonly meaning?: boolean;
  readonly region?: string;
}

export function resolved(options: FixtureOptions): SurnameResultResponse {
  const counts = options.counts ?? [[1000, "male"]];
  const region = options.region ?? "WIELKOPOLSKIE";
  const payload = {
    schema_version: "1.13",
    neighbours: {
      state: "UNAVAILABLE",
      lists: [],
      reason_code: "NO_COMPLETE_UNIVERSE",
      surface: SURFACE,
    },
    other_form:
      options.otherForm === undefined || options.otherForm === null
        ? null
        : {
            surname: {
              id: options.otherForm.id,
              display_name: options.otherForm.display,
              script: "Latn",
            },
            rule_code: "ADJECTIVAL_SKI_CKI_DZKI",
            comparability_group: "pesel_2026_national_female",
            snapshot_date: "2026-01-20",
            rank: 10,
            count: 900,
            surface: SURFACE,
          },
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
    change: {
      state: "UNAVAILABLE",
      entries: [],
      reason_code: "NO_CHANGE_DERIVED",
      surface: SURFACE,
    },
    status: "RESOLVED",
    surname: { id: options.id, display_name: options.display, script: "Latn" },
    population:
      counts.length === 0
        ? {
            state: "UNAVAILABLE",
            observations: [],
            reason_code: "NO_APPLICABLE_EVIDENCE",
            surface: SURFACE,
          }
        : {
            state: "READY",
            observations: counts.map(([count, list]) =>
              observation(count, `pesel_2026_national_${list}`),
            ),
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
      state: "READY",
      entries: [
        {
          coverage_state: "READY",
          regions: [
            {
              place_id: "01a0c057-0000-7000-8000-000000000030",
              terc_code: "30",
              display_name: region,
              count: 600,
              share_of_covered: 1,
            },
          ],
          covered_count: 600,
          national_count: 1000,
          coverage_ratio: 0.6,
          coverage_basis: "covered_count / national_count",
          low_coverage_threshold: 0.3,
          universe_label_code: "PESEL_REGISTERED_VOIVODESHIP_COVERED_SET",
          scope_label_code: "PESEL_CURRENT_SURNAME",
          snapshot_date: "2026-01-20",
          country_code: "PL",
          comparability_group: "pesel_2026_regional_male",
          confidence: CONFIDENCE,
          citation: CITATION,
        },
      ],
      reason_code: null,
      surface: SURFACE,
    },
    suggestions: null,
    meaning: options.meaning === true ? WITH_MEANING : NO_MEANING,
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
    bearers: {
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
    },
  };
  return surnameResultResponseSchema.parse(payload) as SurnameResultResponse;
}

export function unresolved(): SurnameResultResponse {
  return surnameResultResponseSchema.parse({
    schema_version: "1.13",
    neighbours: null,
    other_form: null,
    other_spelling: null,
    localities: null,
    change: null,
    status: "UNRESOLVED",
    surname: null,
    population: null,
    rarity: null,
    distribution: null,
    suggestions: {
      state: "UNAVAILABLE",
      outcome: null,
      decision_mode: null,
      reason_code: "NO_CANDIDATES",
      suggestions: [],
    },
    meaning: null,
    archive: null,
    bearers: null,
  }) as SurnameResultResponse;
}
