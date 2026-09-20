import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { Result } from "./result-view.js";

/**
 * TASK-017's acceptance criteria, asserted against **rendered markup**.
 *
 * Every payload here is first parsed with `surnameResultResponseSchema`, so a
 * fixture that could not legally reach the page cannot be used to prove the page
 * behaves. The figures are the real ones from the register.
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
    source_population_scope: "Wykaz nazwisk osób żyjących…",
    coverage_notes: null,
    comparability_group: group,
    confidence: CONFIDENCE,
    citation: CITATION,
  };
}

function rarity(x: number, numerator: number, group: string) {
  return {
    primary: { metric: "ONE_IN_X", value: x },
    supporting: [{ metric: "RANK", value: 1 }],
    methodology_code: "PESEL_PUBLISHED_UNIVERSE_SUM_V1",
    universe_label_code: "PESEL_PUBLISHED_UNIVERSE",
    numerator,
    denominator: 21_197_537,
    share: 0.004641435,
    scope_label_code: "PESEL_CURRENT_SURNAME",
    snapshot_date: "2026-01-20",
    country_code: "PL",
    comparability_group: group,
    confidence: CONFIDENCE,
    citation: CITATION,
  };
}

/** NOWAK: both partitions, and a READY distribution over its 16 voivodeships. */
const RESOLVED: unknown = {
  schema_version: "1.3",
  status: "RESOLVED",
  surname: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc088", display_name: "NOWAK", script: "Latn" },
  population: {
    state: "READY",
    observations: [
      observation(98_387, "pesel_2026_national_male"),
      observation(99_738, "pesel_2026_national_female"),
    ],
    reason_code: null,
    surface: SURFACE,
  },
  rarity: {
    state: "READY",
    entries: [
      rarity(215, 98_387, "pesel_2026_national_male"),
      rarity(216, 99_738, "pesel_2026_national_female"),
    ],
    reason_code: null,
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
            display_name: "WIELKOPOLSKIE",
            count: 16_077,
            share_of_covered: 0.5,
          },
          {
            place_id: "01a0c057-0000-7000-8000-000000000024",
            terc_code: "24",
            display_name: "ŚLĄSKIE",
            count: 16_077,
            share_of_covered: 0.5,
          },
        ],
        covered_count: 32_154,
        national_count: 98_387,
        coverage_ratio: 0.326811,
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
};

/** MELNYK's real shape: coverage below the threshold. */
const LOW_COVERAGE: unknown = {
  ...(RESOLVED as Record<string, unknown>),
  surname: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc090", display_name: "MELNYK", script: "Latn" },
  distribution: {
    state: "READY",
    entries: [
      {
        coverage_state: "LOW_COVERAGE",
        regions: [
          {
            place_id: "01a0c057-0000-7000-8000-000000000028",
            terc_code: "28",
            display_name: "WARMIŃSKO-MAZURSKIE",
            count: 210,
            share_of_covered: 1,
          },
        ],
        covered_count: 210,
        national_count: 6442,
        coverage_ratio: 0.032598572,
        coverage_basis: "covered_count / national_count",
        low_coverage_threshold: 0.5,
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
};

const RIGHTS_BLOCKED: unknown = {
  schema_version: "1.3",
  status: "RESOLVED",
  surname: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc088", display_name: "NOWAK", script: "Latn" },
  population: {
    state: "RIGHTS_BLOCKED",
    observations: [],
    reason_code: "COMMERCIAL_USE_UNKNOWN",
    surface: { surface: "PAID", decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNKNOWN" },
  },
  rarity: {
    state: "RIGHTS_BLOCKED",
    entries: [],
    reason_code: "COMMERCIAL_USE_UNKNOWN",
    surface: { surface: "PAID", decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNKNOWN" },
  },
  distribution: {
    state: "RIGHTS_BLOCKED",
    entries: [],
    reason_code: "COMMERCIAL_USE_UNKNOWN",
    surface: { surface: "PAID", decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNKNOWN" },
  },
  suggestions: null,
};

const WITH_SUGGESTIONS: unknown = {
  schema_version: "1.3",
  status: "UNRESOLVED",
  surname: null,
  population: null,
  rarity: null,
  distribution: null,
  suggestions: {
    state: "READY",
    outcome: "MULTIPLE_CANDIDATES",
    decision_mode: "USER_CONFIRM",
    reason_code: null,
    suggestions: [
      {
        surname: {
          id: "01a0b9e3-34f3-7633-a239-2b8596dfc0a1",
          display_name: "CICHOWSKI",
          script: "Latn",
        },
        match_type: "FUZZY_CANDIDATE",
        explanation_codes: ["ADJACENT_TRANSPOSITION", "EDIT_DISTANCE_1"],
      },
      {
        surname: {
          id: "01a0b9e3-34f3-7633-a239-2b8596dfc0a2",
          display_name: "CICHOSKI",
          script: "Latn",
        },
        match_type: "FUZZY_CANDIDATE",
        explanation_codes: ["EDIT_DISTANCE_1"],
      },
    ],
  },
};

const NO_SUGGESTIONS: unknown = {
  ...(WITH_SUGGESTIONS as Record<string, unknown>),
  suggestions: {
    state: "UNAVAILABLE",
    outcome: null,
    decision_mode: null,
    reason_code: "INPUT_TOO_SHORT",
    suggestions: [],
  },
};

const MIXED_SCRIPT: unknown = {
  schema_version: "1.3",
  status: "AMBIGUOUS",
  surname: null,
  population: null,
  rarity: null,
  distribution: null,
  suggestions: {
    state: "UNAVAILABLE",
    outcome: null,
    decision_mode: null,
    reason_code: "MIXED_SCRIPT_REVIEW",
    suggestions: [],
  },
};

/** Parses first: a fixture the contract would reject cannot prove anything. */
function render(payload: unknown, lang: "pl" | "en"): string {
  const parsed = surnameResultResponseSchema.parse(payload) as SurnameResultResponse;
  return renderToStaticMarkup(createElement(Result, { response: parsed, lang }));
}

function text(markup: string): string {
  return (
    markup
      .replace(/<[^>]+>/gu, " ")
      .replace(/&#x27;/gu, "'")
      .replace(/&quot;/gu, '"')
      .replace(/&amp;/gu, "&")
      // Collapse ordinary whitespace only. A non-breaking space is what the Polish
      // thousands separator actually is, so normalising it away would make these
      // assertions pass against markup that renders the wrong character.
      .replace(/[ \t\n\r]+/gu, " ")
  );
}

describe("AC-2: two partitions, never a total", () => {
  it("renders both counts and both rarity figures", () => {
    const body = text(render(RESOLVED, "pl"));
    expect(body).toContain("98 387 osób");
    expect(body).toContain("99 738 osób");
    expect(body).toContain("Około 1 na 215");
    expect(body).toContain("Około 1 na 216");
  });

  it("never renders the sum of the two counts", () => {
    // 98,387 + 99,738 = 198,125. It must appear in neither notation.
    for (const lang of ["pl", "en"] as const) {
      const body = text(render(RESOLVED, lang));
      expect(body).not.toContain("198125");
      expect(body).not.toContain("198,125");
      expect(body).not.toContain("198 125");
    }
  });

  it("says the two datasets are never summed", () => {
    expect(text(render(RESOLVED, "pl"))).toContain("nigdy nie są sumowane");
    expect(text(render(RESOLVED, "en"))).toContain("never summed");
  });
});

describe("AC-3: a count is exact, a rarity figure is hedged", () => {
  it("does not hedge the count and does hedge the rarity figure", () => {
    const body = text(render(RESOLVED, "en"));
    expect(body).toContain("98,387 people were registered with the surname NOWAK (male)");
    expect(body).toContain("About 1 in 215 people counted in the PESEL register");
    expect(body).not.toMatch(/about 98,387/iu);
    expect(body).not.toMatch(/estimated/iu);
  });

  it("shows the dataset scope and date with every count", () => {
    const body = text(render(RESOLVED, "en"));
    expect(body).toContain("20 January 2026");
    expect(body).toContain("Dataset scope");
  });
});

describe("AC-4: a low-coverage warning precedes its figures", () => {
  it("puts the warning before the first regional figure in the markup", () => {
    for (const lang of ["pl", "en"] as const) {
      const markup = render(LOW_COVERAGE, lang);
      const warning = markup.indexOf(lang === "pl" ? "Tylko 3,3%" : "Only 3.3%");
      const figure = markup.indexOf("WARMIŃSKO-MAZURSKIE");
      expect(warning).toBeGreaterThan(-1);
      expect(figure).toBeGreaterThan(-1);
      expect(warning).toBeLessThan(figure);
    }
  });

  it("never says lives in, comes from, originates, mieszka or pochodzi", () => {
    for (const payload of [RESOLVED, LOW_COVERAGE]) {
      for (const lang of ["pl", "en"] as const) {
        const body = text(render(payload, lang)).toLowerCase();
        for (const wrong of [
          "lives in",
          "comes from",
          "originat",
          "is found in",
          "mieszka",
          "pochodzi",
          "urodzon",
        ]) {
          expect(body).not.toContain(wrong);
        }
      }
    }
  });

  it("names the shares as being of the covered set, not of every bearer", () => {
    expect(text(render(RESOLVED, "en"))).toContain("Shares are of the people with a registered");
    expect(text(render(RESOLVED, "pl"))).toContain("względem osób z zameldowaniem");
  });
});

describe("AC-5: a rights-blocked section renders no value", () => {
  it("renders the licence reason and none of the figures", () => {
    for (const lang of ["pl", "en"] as const) {
      const body = text(render(RIGHTS_BLOCKED, lang));
      expect(body).not.toContain("98,387");
      expect(body).not.toContain("98 387");
      expect(body).not.toContain("215");
      expect(body).toMatch(
        lang === "pl" ? /Licencja źródła nie pozwala/u : /licence does not permit/u,
      );
    }
  });

  it("hides nothing with CSS — there is no hidden element to reveal", () => {
    const markup = render(RIGHTS_BLOCKED, "en");
    expect(markup).not.toMatch(/display:\s*none/iu);
    expect(markup).not.toMatch(/hidden/iu);
    expect(markup).not.toMatch(/aria-hidden/iu);
  });
});

describe("AC-6: suggestions are offered, never applied", () => {
  it("renders them as a question with a link each, and no auto-selection", () => {
    for (const lang of ["pl", "en"] as const) {
      const markup = render(WITH_SUGGESTIONS, lang);
      const body = text(markup);
      expect(body).toContain(lang === "pl" ? "Czy chodziło Ci o:" : "Did you mean:");
      expect(body).toContain("CICHOWSKI");
      expect(body).toContain("CICHOSKI");
      expect(markup).toContain('href="/?surname=CICHOWSKI');
      // Nothing is pre-selected, checked or auto-submitted.
      expect(markup).not.toMatch(/\bselected\b|\bchecked\b|autofocus/iu);
      expect(markup).not.toMatch(/<meta[^>]+refresh/iu);
      // Why a candidate is listed is in words, never as a machine code.
      expect(body).toContain(lang === "pl" ? "dwie litery przestawione" : "two letters swapped");
      expect(body).not.toContain("ADJACENT_TRANSPOSITION");
      expect(body).not.toContain("EDIT_DISTANCE_1");
      expect(body).not.toContain("TRIGRAM");
    }
  });

  it("carries the language through a suggestion link", () => {
    expect(render(WITH_SUGGESTIONS, "en")).toContain("lang=en");
    expect(render(WITH_SUGGESTIONS, "pl")).not.toContain("lang=en");
  });

  it("states the reason when there are no candidates", () => {
    expect(text(render(NO_SUGGESTIONS, "en"))).toMatch(/too short/u);
    expect(text(render(NO_SUGGESTIONS, "pl"))).toMatch(/za krótkie/u);
    // Never the raw code.
    expect(text(render(NO_SUGGESTIONS, "en"))).not.toContain("INPUT_TOO_SHORT");
  });
});

describe("AC-7: a mixed-script input is offered nothing", () => {
  it("renders the ambiguous heading and the reason, with no candidate", () => {
    for (const lang of ["pl", "en"] as const) {
      const body = text(render(MIXED_SCRIPT, lang));
      expect(body).toMatch(lang === "pl" ? /uściślenia/u : /needs narrowing/u);
      expect(body).toMatch(lang === "pl" ? /różnych alfabetów/u : /different alphabets/u);
      expect(body).not.toContain("Did you mean");
      expect(body).not.toContain("Czy chodziło");
    }
  });
});

describe("AC-8: every state has distinct words in both languages", () => {
  it("renders a different body for each state", () => {
    for (const lang of ["pl", "en"] as const) {
      const bodies = [
        RESOLVED,
        LOW_COVERAGE,
        RIGHTS_BLOCKED,
        WITH_SUGGESTIONS,
        NO_SUGGESTIONS,
        MIXED_SCRIPT,
      ].map((payload) => text(render(payload, lang)));
      expect(new Set(bodies).size).toBe(bodies.length);
      for (const body of bodies) expect(body.trim()).not.toBe("");
    }
  });

  it("renders Polish and English differently for the same payload", () => {
    expect(text(render(RESOLVED, "pl"))).not.toBe(text(render(RESOLVED, "en")));
  });
});

describe("AC-9: no score, probability or percentage of confidence", () => {
  it("renders confidence as a status word only", () => {
    const body = text(render(RESOLVED, "en"));
    expect(body).toContain("Confidence: VERIFIED");
    expect(body).not.toMatch(/confidence[^.]{0,20}\d/iu);
    for (const forbidden of [
      "probability",
      "identity_probability",
      "retrieval_rank_score",
      "trigram",
      "edit_distance",
      "similarity",
      "%.confidence",
    ]) {
      expect(body.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it("renders no internal rationale", () => {
    const body = text(render(RESOLVED, "en"));
    expect(body).not.toContain("rationale");
    expect(body).not.toContain("methodology_code");
  });
});

describe("provenance is on every figure", () => {
  it("names publisher, title, date and licence", () => {
    const body = text(render(RESOLVED, "en"));
    expect(body).toContain("Ministerstwo Cyfryzacji");
    expect(body).toContain("Nazwiska występujące w rejestrze PESEL");
    expect(body).toContain("CC0 1.0");
  });
});
