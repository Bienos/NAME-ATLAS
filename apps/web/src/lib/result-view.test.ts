import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { Result } from "./result-view.js";
import { UI } from "./messages.js";

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
  // The real line, as the rights profile stores it and as a live page renders
  // it. It was `null` until 2026-09-21, which made the honesty guard below pass
  // for the wrong reason — see the comment there.
  attribution: "Dane pochodzą z rejestru PESEL, Ministerstwo Cyfryzacji, dane.gov.pl (CC0 1.0)",
  terms: "CC0 1.0",
  retrieved_at: "2026-09-18T17:40:00Z",
  source_page_url:
    "https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel",
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
  schema_version: "1.12",
  neighbours: {
    state: "UNAVAILABLE",
    lists: [],
    reason_code: "NO_COMPLETE_UNIVERSE",
    surface: SURFACE,
  },
  other_form: null,
  change: { state: "UNAVAILABLE", entries: [], reason_code: "NO_CHANGE_DERIVED", surface: SURFACE },
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
  // The state ADR-0008 §3 makes first-class, and the answer for every surname
  // until an onomastic source is imported.
  meaning: {
    state: "NO_SOURCED_MEANING",
    interpretations: [],
    confidence: null,
    methodology_code: null,
    reason_code: "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
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
    surface: { surface: "FREE", decision: "CONDITIONAL", reason_code: "COMMERCIAL_USE_UNRESOLVED" },
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
  schema_version: "1.12",
  neighbours: {
    state: "RIGHTS_BLOCKED",
    lists: [],
    reason_code: "COMMERCIAL_USE_UNKNOWN",
    surface: { surface: "PAID", decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNKNOWN" },
  },
  other_form: null,
  change: {
    state: "RIGHTS_BLOCKED",
    entries: [],
    reason_code: "COMMERCIAL_USE_UNKNOWN",
    surface: { surface: "PAID", decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNKNOWN" },
  },
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
  meaning: {
    state: "RIGHTS_BLOCKED",
    interpretations: [],
    confidence: null,
    methodology_code: null,
    reason_code: "COMMERCIAL_USE_UNKNOWN",
    surface: { surface: "PAID", decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNKNOWN" },
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
    surface: { surface: "FREE", decision: "CONDITIONAL", reason_code: "COMMERCIAL_USE_UNRESOLVED" },
  },
  archive: {
    state: "RIGHTS_BLOCKED",
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
    reason_code: "COMMERCIAL_USE_UNKNOWN",
    surface: { surface: "PAID", decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNKNOWN" },
  },
};

const WITH_SUGGESTIONS: unknown = {
  schema_version: "1.12",
  neighbours: null,
  other_form: null,
  change: null,
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
  meaning: null,
  archive: null,
  bearers: null,
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
  schema_version: "1.12",
  neighbours: null,
  other_form: null,
  change: null,
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
  meaning: null,
  archive: null,
  bearers: null,
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

  it("shows the date with every count, and the dataset's own scope at the foot (ADR-0012)", () => {
    const markup = render(RESOLVED, "en");
    expect(text(markup)).toContain("20 January 2026");
    const notes = text(markup.slice(markup.indexOf('<details class="notes">')));
    expect(notes).toContain("Wykaz nazwisk osób żyjących");
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

  /**
   * The forbidden substrings, in every string this project **authors**.
   *
   * One string on the page is not ours: `citation.attribution` is the rights
   * holder's own wording, which ADR-0007 §5 requires to be rendered verbatim
   * because it "is not ours to paraphrase". The real PESEL line is
   * "Dane pochodzą z rejestru PESEL…" — a statement about where the *data* came
   * from, which is exactly what an attribution is for, and which contains
   * `pochodzą`.
   *
   * Until 2026-09-21 the fixture above carried `attribution: null`, so this
   * guard passed without ever seeing that line. Making the fixture realistic is
   * what exposed it. The trap was that the obvious way to get green again is to
   * drop `pochodzi` from the list — which would blind a P0 honesty guard to the
   * one phrasing that matters most, "nazwisko pochodzi z Mazowsza".
   *
   * So the guard keeps every substring and excludes exactly one region: the
   * verbatim attribution. To make sure that exclusion cannot be used to smuggle
   * anything in, the test below asserts the attribution is rendered *exactly* as
   * supplied — it is not a place where prose can be composed.
   */
  const FORBIDDEN = [
    "lives in",
    "comes from",
    "originat",
    "is found in",
    "mieszka",
    "pochodzi",
    "urodzon",
  ] as const;

  it("never says lives in, comes from, originates, mieszka or pochodzi", () => {
    for (const [name, payload] of [
      ["RESOLVED", RESOLVED],
      ["LOW_COVERAGE", LOW_COVERAGE],
    ] as const) {
      for (const lang of ["pl", "en"] as const) {
        const body = text(render(payload, lang))
          // Remove only the verbatim rights-holder line, nothing else.
          .split(CITATION.attribution ?? "\u0000")
          .join(" ")
          .toLowerCase();
        for (const wrong of FORBIDDEN) {
          expect(body, `${name}/${lang}`).not.toContain(wrong);
        }
      }
    }
  });

  it("renders the rights holder's attribution verbatim and composes no prose around it", () => {
    for (const lang of ["pl", "en"] as const) {
      const body = text(render(RESOLVED, lang));
      // Present, unaltered, and the only reason a forbidden substring appears.
      expect(body).toContain(CITATION.attribution);
      const withoutAttribution = body.split(CITATION.attribution ?? "\u0000").join(" ");
      const leaked = FORBIDDEN.filter((w) => withoutAttribution.toLowerCase().includes(w));
      expect(leaked).toEqual([]);
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
    const markup = render(RESOLVED, "en");
    const body = text(markup);
    // Since TASK-023 the reader sees the word and the canonical status travels
    // as a machine-readable attribute. Both are asserted; a number still is not.
    // (The evidence panel's "Confidence" label went with the panel, ADR-0012.)
    expect(body).toContain("Verified");
    expect(markup).toContain('data-assessment="VERIFIED"');
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

/**
 * TASK-022 AC-10 — the meaning section (ADR-0008).
 *
 * The interpretations below are placeholders, matching the committed synthetic
 * fixtures. Nothing here states anything about a real surname's origin.
 */
const MEANING_AVAILABLE: unknown = {
  ...(RESOLVED as Record<string, unknown>),
  meaning: {
    state: "AVAILABLE",
    interpretations: [
      {
        root_form: "PLACEHOLDER-ROOT-1",
        root_language: "test",
        literal_gloss: "PLACEHOLDER GLOSS — first reading",
        formation_type: "OCCUPATIONAL",
        work: {
          title: "Synthetic Test Work A (not a real publication)",
          author_or_publisher: "Name Atlas test fixture",
          year: 1900,
        },
        locator: "p. 1, entry 1",
      },
    ],
    confidence: "POSSIBLE",
    methodology_code: "onomastic_agreement_rule@onomastic_confidence@1",
    reason_code: null,
    surface: SURFACE,
  },
};

const MEANING_CONFLICTING: unknown = {
  ...(MEANING_AVAILABLE as Record<string, unknown>),
  meaning: {
    ...((MEANING_AVAILABLE as Record<string, unknown>)["meaning"] as Record<string, unknown>),
    confidence: "CONFLICTING",
    methodology_code: "onomastic_agreement_rule@onomastic_confidence@1",
    interpretations: [
      ...(((MEANING_AVAILABLE as Record<string, unknown>)["meaning"] as Record<string, unknown>)[
        "interpretations"
      ] as unknown[]),
      {
        root_form: "PLACEHOLDER-ROOT-DIFFERENT",
        root_language: "test",
        literal_gloss: "PLACEHOLDER GLOSS — competing reading",
        formation_type: "TOPONYMIC",
        work: {
          title: "Synthetic Test Work B (not a real publication)",
          author_or_publisher: "Name Atlas test fixture",
          year: 1910,
        },
        locator: "p. 45, col. 1",
      },
    ],
  },
};

describe("AC-10: the meaning gap is a sentence, not an absence", () => {
  it("says in Polish that there is no sourced meaning, and that we do not guess", () => {
    const body = text(render(RESOLVED, "pl"));
    expect(body).toContain("Znaczenie");
    expect(body).toContain("Nie mamy udokumentowanego znaczenia tego nazwiska");
    expect(body).toContain("znaczenia nie zgadujemy");
  });

  it("says in English that there is no sourced meaning, and that we do not guess", () => {
    const body = text(render(RESOLVED, "en"));
    expect(body).toContain("Meaning");
    expect(body).toContain("We have no sourced meaning for this surname");
    expect(body).toContain("we do not guess at meanings");
  });

  it("never describes the surname itself as being of unknown origin", () => {
    // The gap is a statement about our evidence, not about the surname. Saying
    // the origin is unknown would be a claim we cannot support either.
    for (const lang of ["pl", "en"] as const) {
      const body = text(render(RESOLVED, lang)).toLowerCase();
      for (const forbidden of ["unknown origin", "nieznane pochodzenie", "pochodzenie nieznane"]) {
        expect(body).not.toContain(forbidden);
      }
    }
  });

  it("renders the licence refusal, and no interpretation, when rights block it", () => {
    const body = text(render(RIGHTS_BLOCKED, "pl"));
    expect(body).toContain("licencja nie pozwala nam pokazać");
    expect(body).not.toContain("PLACEHOLDER");
  });
});

describe("AC-10: an available meaning renders its work and its caveat", () => {
  it("renders the gloss, root, work and locator", () => {
    const body = text(render(MEANING_AVAILABLE, "en"));
    expect(body).toContain("PLACEHOLDER GLOSS — first reading");
    expect(body).toContain("PLACEHOLDER-ROOT-1");
    expect(body).toContain("Synthetic Test Work A");
    expect(body).toContain("p. 1, entry 1");
    expect(body).toContain("1900");
  });

  it("marks it an interpretation, before the reading and not after", () => {
    const markup = render(MEANING_AVAILABLE, "en");
    const caveat = markup.indexOf("not a measured value");
    const gloss = markup.indexOf("PLACEHOLDER GLOSS");
    expect(caveat).toBeGreaterThan(-1);
    expect(caveat).toBeLessThan(gloss);
  });

  it("shows both readings on a conflict, and says it does not choose", () => {
    for (const lang of ["pl", "en"] as const) {
      const body = text(render(MEANING_CONFLICTING, lang));
      expect(body).toContain("PLACEHOLDER-ROOT-1");
      expect(body).toContain("PLACEHOLDER-ROOT-DIFFERENT");
      expect(body).toContain("Synthetic Test Work A");
      expect(body).toContain("Synthetic Test Work B");
    }
    expect(text(render(MEANING_CONFLICTING, "en"))).toContain("we do not choose between them");
    expect(text(render(MEANING_CONFLICTING, "pl"))).toContain("nie wybieramy między nimi");
  });

  it("renders the confidence as a word, with no score or percentage", () => {
    // Scoped to the meaning section: the distribution section legitimately
    // renders percentages, and they are shares, not confidence.
    const markup = render(MEANING_CONFLICTING, "en");
    // From the section's own anchor: the chapter links above also say "Meaning".
    const section = text(markup.slice(markup.indexOf('id="meaning"')));
    expect(section).not.toMatch(/\d+\s*%/u);
    expect(section).not.toMatch(/0\.\d+/u);
    expect(section).toContain("Sources disagree");
    expect(markup).toContain('data-assessment="CONFLICTING"');
  });

  it("omits a root the work did not propose rather than writing one", () => {
    const withoutRoot = {
      ...(MEANING_AVAILABLE as Record<string, unknown>),
      meaning: {
        ...((MEANING_AVAILABLE as Record<string, unknown>)["meaning"] as Record<string, unknown>),
        interpretations: [
          {
            ...(
              (
                (MEANING_AVAILABLE as Record<string, unknown>)["meaning"] as Record<string, unknown>
              )["interpretations"] as Record<string, unknown>[]
            )[0],
            root_form: null,
            root_language: null,
          },
        ],
      },
    };
    const body = text(render(withoutRoot, "en"));
    expect(body).not.toContain("Root");
    expect(body).toContain("PLACEHOLDER GLOSS — first reading");
  });
});

/**
 * TASK-023 — the claim unit, the snapshot, intent order and the second-search
 * control, asserted against markup. ADR-0012 (2026-09-24) replaced TASK-023's
 * per-claim evidence panel (AC-2) with one section at the foot of the page.
 */
describe("TASK-023 AC-1, ADR-0012: every figure is a claim; its evidence is at the foot", () => {
  it("renders each observation, rarity entry and distribution entry as a claim, with no panel", () => {
    const markup = render(RESOLVED, "pl");
    // 2 population + 2 rarity + 1 distribution entries in the fixture.
    expect(markup.match(/class="claim"/gu)?.length).toBe(5);
    expect(markup).not.toContain('class="evidence"');
    expect(markup).not.toContain("Zobacz dowody");
    // The one disclosure left is the notes, inside #sources.
    expect(markup.match(/<details/gu)?.length).toBe(1);
    expect(markup.indexOf("<details")).toBeGreaterThan(markup.indexOf('id="sources"'));
  });

  it("shows the assessment as a word, the source kind and the scope line", () => {
    const body = text(render(RESOLVED, "pl"));
    expect(body).toContain("Zweryfikowane");
    expect(body).toContain("Dane urzędowe");
    expect(body).toContain("Polska · Ministerstwo Cyfryzacji · 20 stycznia 2026 r.");
    expect(body).not.toMatch(/VERIFIED/u);
  });

  it("links each source once, to the website it was taken from, never to the file", () => {
    const markup = render(RESOLVED, "en");
    const from = markup.indexOf('<ul class="sources">');
    const list = markup.slice(from, markup.indexOf("</ul>", from));
    expect(list.match(/<li>/gu)?.length).toBe(1);
    expect(list).toContain(`href="${CITATION.source_page_url}"`);
    expect(list).toContain(">dane.gov.pl</a>");
    // The retrieved file is provenance, not a destination: nothing links to it.
    expect(markup).not.toContain(CITATION.url);
  });

  it("keeps what the panels told a reader, each note once, at the foot", () => {
    const markup = render(RESOLVED, "en");
    const notes = text(markup.slice(markup.indexOf('<details class="notes">')));
    expect(notes).toContain("How to read these figures");
    for (const needed of [
      "Surnames occurring once are not published",
      "The 1-in-X figure is rounded",
      "A permanent registered residence is an address in the register",
      "Denominator: 21",
    ])
      expect(notes).toContain(needed);
    // Population and rarity both carry the suppression note; it is listed once.
    expect(notes.split("Surnames occurring once are not published").length - 1).toBe(1);
  });

  it("shows no method code, record identifier or retrieval date", () => {
    const body = text(render(RESOLVED, "en"));
    expect(body).not.toContain("rule@1");
    expect(body).not.toContain(CITATION.locator);
    expect(body).not.toContain("Retrieved");
    expect(body).not.toContain("18 September 2026");
  });

  it("puts no confidence number anywhere and no event handler attributes", () => {
    const markup = render(RESOLVED, "en");
    expect(markup).not.toMatch(/onclick|onchange|onsubmit/iu);
    expect(text(markup)).not.toMatch(/\d+\s*% (confidence|pewności)/iu);
  });
});

describe("TASK-023 AC-3/AC-4: the snapshot", () => {
  it("shows both counts as hero figures and never their sum", () => {
    const markup = render(RESOLVED, "pl");
    const snapshot = markup.slice(markup.indexOf('class="snapshot"'), markup.indexOf("</header>"));
    expect(snapshot).toContain("98\u00A0387");
    expect(snapshot).toContain("99\u00A0738");
    // Their sum, in either separator. It must appear nowhere.
    expect(snapshot).not.toContain("198\u00A0125");
    expect(snapshot).not.toContain("198125");
    expect(snapshot).toContain("mężczyźni");
    expect(snapshot).toContain("kobiety");
  });

  it("shows 1 in X only when rarity is READY", () => {
    const markup = render(RESOLVED, "en");
    const snapshot = markup.slice(markup.indexOf('class="snapshot"'), markup.indexOf("</header>"));
    expect(snapshot).toContain("about 1 in 215");
    const noRarity = {
      ...(RESOLVED as Record<string, unknown>),
      rarity: {
        state: "UNAVAILABLE",
        entries: [],
        reason_code: "NO_COMPLETE_UNIVERSE",
        surface: SURFACE,
      },
    };
    const m2 = render(noRarity, "en");
    const s2 = m2.slice(m2.indexOf('class="snapshot"'), m2.indexOf("</header>"));
    expect(s2).not.toContain("1 in");
  });

  it("names no strongest voivodeship when the top two are tied", () => {
    // The fixture's WIELKOPOLSKIE and ŚLĄSKIE both hold 16,077. `regions` is
    // ordered by count, but a tie is broken by whatever the sort did, so naming
    // the first would present a sort artefact as a fact.
    const ready = render(RESOLVED, "en");
    const s1 = ready.slice(ready.indexOf('class="snapshot"'), ready.indexOf("</header>"));
    expect(s1).not.toContain("Most registered in");
  });

  it("names the strongest voivodeship, with its date, when one is clearly ahead", () => {
    const clear = JSON.parse(JSON.stringify(RESOLVED)) as Record<string, unknown>;
    const distribution = clear["distribution"] as {
      entries: { regions: { count: number; share_of_covered: number }[]; covered_count: number }[];
    };
    for (const entry of distribution.entries) {
      // Break the tie downward, and keep the payload legal: covered_count is
      // the sum of its own regions and every share is over it.
      entry.regions[1]!.count = 9_000;
      entry.covered_count = entry.regions.reduce((sum, r) => sum + r.count, 0);
      for (const region of entry.regions) {
        region.share_of_covered = Number((region.count / entry.covered_count).toFixed(9));
      }
    }
    const markup = render(clear, "en");
    const snapshot = markup.slice(markup.indexOf('class="snapshot"'), markup.indexOf("</header>"));
    expect(snapshot).toContain("Most registered in");
    expect(snapshot).toContain("WIELKOPOLSKIE");
    // No share without its date (ARCHITECTURE.md §10 invariant 5).
    expect(snapshot).toContain("20 January 2026");
  });

  it("names no strongest voivodeship when coverage is below the threshold", () => {
    const low = render(LOW_COVERAGE, "en");
    const s2 = low.slice(low.indexOf('class="snapshot"'), low.indexOf("</header>"));
    expect(s2).not.toContain("Most registered in");
  });

  it("stacks the two rarity figures and says they are not comparable", () => {
    // Each 1-in-X is computed within its own resource version's published
    // universe, and the two universes are different sizes.
    const markup = render(RESOLVED, "en");
    const snapshot = markup.slice(markup.indexOf('class="snapshot"'), markup.indexOf("</header>"));
    expect(snapshot).toContain("about 1 in 215");
    expect(snapshot).toContain("about 1 in 216");
    // Never joined into one line that invites the comparison.
    expect(snapshot).not.toMatch(/1 in 215[^<]*·[^<]*1 in 216/u);
    expect(snapshot).toContain("not compared with each other");
  });

  it("tallies claims by their stored assessment", () => {
    const body = text(render(RESOLVED, "en"));
    // "statements", not "facts": a rarity figure is arithmetic over the count
    // above it, and calling the two independent facts would overstate it.
    expect(body).toMatch(/\d verified statements/u);
  });

  it("still renders for a surname with no count, stating the absence", () => {
    const absent = {
      ...(RESOLVED as Record<string, unknown>),
      population: {
        state: "UNAVAILABLE",
        observations: [],
        reason_code: "NO_APPLICABLE_EVIDENCE",
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
    };
    const body = text(render(absent, "en"));
    expect(body).toContain("This dataset publishes no count for this surname");
    expect(body).not.toMatch(/\b0 people\b/u);
  });
});

describe("TASK-023 AC-5: intent changes order only", () => {
  it("defaults to count, rarity, geography, meaning", () => {
    const m = render(RESOLVED, "en");
    const order = ['id="today-count"', 'id="rarity"', 'id="where"', 'id="meaning"'].map((id) =>
      m.indexOf(id),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("moves rarity first for ?intent=rarity, and the map first for ?intent=map", () => {
    const parsed = surnameResultResponseSchema.parse(RESOLVED) as SurnameResultResponse;
    const rarityFirst = renderToStaticMarkup(
      createElement(Result, { response: parsed, lang: "en", intent: "rarity" }),
    );
    expect(rarityFirst.indexOf('id="rarity"')).toBeLessThan(
      rarityFirst.indexOf('id="today-count"'),
    );
    const mapFirst = renderToStaticMarkup(
      createElement(Result, { response: parsed, lang: "en", intent: "map" }),
    );
    expect(mapFirst.indexOf('id="where"')).toBeLessThan(mapFirst.indexOf('id="today-count"'));
    // The snapshot is always first.
    expect(mapFirst.indexOf('class="snapshot"')).toBeLessThan(mapFirst.indexOf('id="where"'));
  });

  // Added by TASK-034: the fourth intent was never rendered by any test.
  it("moves the meaning chapter first for ?intent=meaning, and its link with it", () => {
    const parsed = surnameResultResponseSchema.parse(RESOLVED) as SurnameResultResponse;
    const meaningFirst = renderToStaticMarkup(
      createElement(Result, { response: parsed, lang: "en", intent: "meaning" }),
    );
    expect(meaningFirst.indexOf('id="meaning"')).toBeLessThan(
      meaningFirst.indexOf('id="today-count"'),
    );
    expect(meaningFirst.indexOf('href="#meaning"')).toBeLessThan(
      meaningFirst.indexOf('href="#today-count"'),
    );
  });
});

describe("TASK-023: sources section and anchors", () => {
  it("lists every distinct source once under #sources", () => {
    const m = render(RESOLVED, "en");
    expect(m).toContain('id="sources"');
    // The source list only: the notes below it are a list of their own.
    const from = m.indexOf('<ul class="sources">');
    const sources = m.slice(from, m.indexOf("</ul>", from));
    expect(sources.match(/<li>/gu)?.length).toBe(1);
  });

  it("carries the locale-neutral anchors", () => {
    const m = render(RESOLVED, "pl");
    for (const id of ['id="today"', 'id="where"', 'id="meaning"', 'id="sources"'])
      expect(m).toContain(id);
  });
});

describe("the voivodeship map", () => {
  it("draws all 16 voivodeships, the listed ones in the ramp and the rest hatched as not listed", () => {
    const markup = render(RESOLVED, "pl");
    expect(markup).toContain('aria-label="Mapa udziałów według województw"');
    expect(markup.match(/class="vmap-region /gu)).toHaveLength(16);
    // Two listed regions at 50% each: the top band of a 10-point scale.
    expect(markup.match(/vmap-region vmap-b4/gu)).toHaveLength(2);
    expect(markup.match(/vmap-region vmap-none/gu)).toHaveLength(14);
    expect(markup).toContain("WIELKOPOLSKIE: 50,0% (16\u00a0077)");
    expect(markup).toContain("brak w zbiorze — nie oznacza zera");
  });

  it("never draws a not-listed voivodeship in the ramp's palest step", () => {
    const markup = render(LOW_COVERAGE, "en");
    // One listed region; every other one is hatched, none is band 0.
    expect(markup.match(/vmap-region vmap-none/gu)).toHaveLength(15);
    expect(markup).not.toMatch(/vmap-region vmap-b0/u);
    expect(markup).toContain("not listed in the dataset — not zero");
  });

  it("keeps the table, and draws no map when a region has no TERC code", () => {
    const payload = structuredClone(RESOLVED) as {
      distribution: { entries: { regions: { terc_code: string | null }[] }[] };
    };
    payload.distribution.entries[0]!.regions[0]!.terc_code = null;
    const markup = render(payload, "pl");
    expect(markup).not.toContain("vmap-region");
    expect(markup).toContain('<table class="rank-bars">');
  });
});

describe("a meaning's formation type is words, never its code", () => {
  it("renders the type in the page's language", () => {
    for (const [lang, word] of [
      ["pl", "od zajęcia lub zawodu"],
      ["en", "occupational"],
    ] as const) {
      const body = text(render(MEANING_AVAILABLE, lang));
      expect(body).toContain(word);
      expect(body).not.toContain("OCCUPATIONAL");
    }
  });
});

describe("the snapshot surname is measured for fitting", () => {
  it("carries its width in em for the stylesheet, and nothing else changes", () => {
    const markup = render(RESOLVED, "pl");
    // NOWAK: 3.883 em of Fraunces advances, less 5 × 0.04 em of tracking (surname-fit.ts).
    expect(markup).toContain('<h2 class="surname" style="--surname-em:3.683">NOWAK</h2>');
  });
});

/**
 * The profile layout (2026-09-24): one column per register list in the
 * snapshot, question chapters numbered in page order, the rarity scale and the
 * ranked bars. Presentation, asserted so that it cannot drift into deriving a
 * fact or pairing one list's figure with the other's.
 */
describe("the profile layout", () => {
  it("puts each list's 1 in X in its own list's column, matched by list and not by position", () => {
    // Female first in the payload: pairing by position would put 216 under 98,387.
    const swapped = structuredClone(RESOLVED) as { rarity: { entries: unknown[] } };
    swapped.rarity.entries.reverse();
    const markup = render(swapped, "en");
    const snapshot = markup.slice(markup.indexOf('class="snapshot"'), markup.indexOf("</header>"));
    const male = snapshot.indexOf("98,387");
    const x215 = snapshot.indexOf("about 1 in 215");
    const female = snapshot.indexOf("99,738");
    const x216 = snapshot.indexOf("about 1 in 216");
    expect(male).toBeGreaterThan(-1);
    expect(male).toBeLessThan(x215);
    expect(x215).toBeLessThan(female);
    expect(female).toBeLessThan(x216);
  });

  it("draws the rarity scale only for a READY figure, at the figure's own place", () => {
    const markup = render(RESOLVED, "pl");
    expect(markup.match(/class="rscale"/gu)).toHaveLength(2);
    // 1 in 215 on a log axis from 1 in 100 (0%) to 10^7.2 (100%): (log10 215 − 2) / 5.2.
    expect(markup).toContain("--pos:6.39%");
    expect(markup).toContain('aria-label="Skala rzadkości: około 1 na 215"');
    expect(render(RIGHTS_BLOCKED, "pl")).not.toContain("rscale");
  });

  it("shows the rank the claim carries, and no rank where it carries none", () => {
    expect(text(render(RESOLVED, "en"))).toContain("#1 rank on the surname list");
    const noRank = structuredClone(RESOLVED) as {
      rarity: { entries: { supporting: unknown[] }[] };
    };
    for (const entry of noRank.rarity.entries) entry.supporting = [];
    expect(render(noRank, "en")).not.toContain('class="rank"');
  });

  it("gives each region a bar as long as its share against the largest, in its map shade", () => {
    const markup = render(RESOLVED, "pl");
    // Two regions at 50% each: both the largest, both full length, both the top band.
    expect(markup.match(/class="rb-fill" data-band="4" style="--w:100.0%"/gu)).toHaveLength(2);
  });

  it("numbers the chapters, and their links, in the order the page shows them", () => {
    const parsed = surnameResultResponseSchema.parse(RESOLVED) as SurnameResultResponse;
    const mapFirst = renderToStaticMarkup(
      createElement(Result, { response: parsed, lang: "en", intent: "map" }),
    );
    expect(mapFirst.slice(mapFirst.indexOf('id="where"'))).toMatch(
      /^id="where"[^>]*><div class="chapter-rail"><p class="chapter-number">01<\/p>/u,
    );
    const nav = mapFirst.slice(mapFirst.indexOf('class="chapter-nav"'), mapFirst.indexOf("</nav>"));
    expect(nav.indexOf('href="#where"')).toBeLessThan(nav.indexOf('href="#today-count"'));
  });

  it("keeps a chapter with no figures to its absence, without a reading note", () => {
    const blocked = render(RIGHTS_BLOCKED, "en");
    expect(blocked).toContain('<section id="today-count" class="chapter chapter-empty">');
    expect(blocked).not.toContain("The PESEL register publishes two separate surname lists");
  });
});

/**
 * TASK-053: the surname page as a journey. Each screen ends on the question
 * the next one answers, in the order the page shows them; the links are
 * presentation only and point at the registry's anchors.
 */
describe("the journey's steps", () => {
  const steps = (markup: string): [string, string][] =>
    [...markup.matchAll(/<p class="chapter-next"><a href="(#[^"]+)">([^<]+)<\/a><\/p>/gu)].map(
      (m) => [m[1] ?? "", m[2] ?? ""],
    );
  const after = { href: "#summary", label: "Twój wynik" };

  it("lead from the snapshot through every chapter and the sources to what the page adds", () => {
    const parsed = surnameResultResponseSchema.parse(RESOLVED) as SurnameResultResponse;
    const markup = renderToStaticMarkup(
      createElement(Result, { response: parsed, lang: "pl", after }),
    );
    const t = UI.pl;
    expect(steps(markup)).toEqual([
      ["#today-count", t.chapterCountTitle],
      ["#rarity", t.chapterRarityTitle],
      ["#where", t.chapterWhereTitle],
      ["#meaning", t.chapterMeaningTitle],
      ["#archive", t.chapterArchiveTitle],
      ["#bearers", t.chapterBearersTitle],
      ["#sources", t.chapterSourcesQuestion],
      ["#summary", "Twój wynik"],
    ]);
  });

  it("follow an intent's order, and stop at the sources when the page adds nothing", () => {
    const parsed = surnameResultResponseSchema.parse(RESOLVED) as SurnameResultResponse;
    const markup = renderToStaticMarkup(
      createElement(Result, { response: parsed, lang: "en", intent: "map" }),
    );
    expect(steps(markup).map(([href]) => href)).toEqual([
      "#where",
      "#today-count",
      "#rarity",
      "#meaning",
      "#archive",
      "#bearers",
      "#sources",
    ]);
    expect(steps(markup)[6]?.[1]).toBe(UI.en.chapterSourcesQuestion);
  });
});

/**
 * TASK-054: the archive chapter. NOWAK's real Polona inventory, as the loader
 * stored it on 2026-10-01 (ADR-0024).
 */
const POLONA_CITATION = {
  id: "cit-polona",
  title: "Polona",
  publisher: "Biblioteka Narodowa",
  publication_date: null,
  source_type: "DIGITAL_LIBRARY",
  locator: '"NOWAK"',
  url: "https://polona.pl/api/search-service/search/simple?query=%22NOWAK%22",
  attribution: "Polona, Biblioteka Narodowa",
  terms: null,
  retrieved_at: "2026-10-01T08:18:47Z",
  source_page_url: "https://polona.pl/",
};

const ARCHIVE_READY: unknown = {
  ...(RESOLVED as Record<string, unknown>),
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
    surface: { surface: "FREE", decision: "CONDITIONAL", reason_code: "COMMERCIAL_USE_UNRESOLVED" },
  },
  archive: {
    state: "READY",
    query: '"NOWAK"',
    searched_on: "2026-10-01",
    catalogue_records: 8237,
    catalogue_by_category: [
      { label: "Czasopisma", count: 894 },
      { label: "Książki", count: 500 },
    ],
    pages: 160_571,
    pages_by_period: [
      { from_year: null, to_year: 1799, count: 20 },
      { from_year: 1800, to_year: 1849, count: 2243 },
      { from_year: 1850, to_year: 1899, count: 13_090 },
      { from_year: 1900, to_year: 1918, count: 21_403 },
      { from_year: 1919, to_year: 1939, count: 70_818 },
      { from_year: 1940, to_year: null, count: 52_677 },
    ],
    pages_by_place: [
      { label: "Warszawa", count: 61_608 },
      { label: "Poznań", count: 25_519 },
      { label: "Kraków", count: 16_163 },
    ],
    examples: [
      {
        title:
          "Rocznik Kolejowy : opracowany na podstawie źródeł urzędowych Ministerstwa Komunikacji  R. 2 (1931/1932)",
        date: "1931-01-01",
        page_number: 795,
        excerpt:
          "Antoni 60 Nowak Józef 139 Nowak Walenty 97 Nosek Aleksander 436 Nowak Antoni 106 Nowak Józef",
        url: "https://polona.pl/item-view/a7ed43f7-ac1d-4e75-ba51-52bef4f09c67?page=794",
      },
    ],
    confidence: { status: "VERIFIED", methodology_code: "archive_search_scope@archive_scope@1" },
    citation: POLONA_CITATION,
    reason_code: null,
    surface: SURFACE,
  },
};

describe("TASK-054: the archive chapter", () => {
  it("counts pages and catalogue records of a word, with the search date, in both languages", () => {
    const pl = text(render(ARCHIVE_READY, "pl"));
    expect(pl).toContain(
      "Słowo NOWAK występuje na 160\u00a0571 stronach dzieł niechronionych prawem autorskim i w 8\u00a0237 rekordach katalogu Polony",
    );
    const en = text(render(ARCHIVE_READY, "en"));
    expect(en).toContain(
      "The word NOWAK appears on 160,571 pages of works not under copyright and in 8,237 catalogue records in Polona",
    );
  });

  it("says a match is a word, not a person, beside the figure", () => {
    const markup = render(ARCHIVE_READY, "pl");
    expect(text(markup)).toContain(UI.pl.archiveWordCaveat);
    expect(markup.indexOf("archive-caveat")).toBeLessThan(markup.indexOf("archive-periods"));
    expect(text(render(ARCHIVE_READY, "en"))).toContain(UI.en.archiveWordCaveat);
  });

  it("splits the pages by period and names the places of publication", () => {
    const pl = text(render(ARCHIVE_READY, "pl"));
    expect(pl).toContain("przed 1800");
    expect(pl).toContain("1919–1939");
    expect(pl).toContain("od 1940");
    expect(pl).toContain("70\u00a0818");
    expect(pl).toContain("Warszawa");
    expect(text(render(ARCHIVE_READY, "en"))).toContain("before 1800");
  });

  it("quotes a public-domain page with its work, year, page and a link to that scan", () => {
    const markup = render(ARCHIVE_READY, "pl");
    const t = text(markup);
    expect(t).toContain("Nowak Walenty");
    expect(t).toContain("Rocznik Kolejowy");
    expect(t).toContain("1931 · s. 795 · Polona, Biblioteka Narodowa");
    expect(markup).toContain(
      'href="https://polona.pl/item-view/a7ed43f7-ac1d-4e75-ba51-52bef4f09c67?page=794"',
    );
    expect(t).toContain(UI.pl.archiveOpen);
  });

  it("cites Polona and adds the word caveat to the sources", () => {
    const t = text(render(ARCHIVE_READY, "pl"));
    expect(t).toContain("Biblioteka Narodowa");
    expect(t).toContain(UI.pl.limitationArchiveWord);
  });

  it("says a surname not yet searched is not searched, and shows no figure", () => {
    const markup = render(RESOLVED, "pl");
    expect(text(markup)).toContain(UI.pl.archiveNotSearched);
    expect(markup).not.toContain("archive-periods");
    expect(text(render(RESOLVED, "en"))).toContain(UI.en.archiveNotSearched);
  });

  it("renders the licence refusal and nothing else when rights block it", () => {
    const markup = render(RIGHTS_BLOCKED, "pl");
    expect(text(markup)).toContain(UI.pl.archiveBlocked);
    expect(markup).not.toContain("archive-example");
  });

  it("says a search with no match is an answer, not a gap", () => {
    const archive = (ARCHIVE_READY as { archive: Record<string, unknown> }).archive;
    const none = {
      ...(ARCHIVE_READY as Record<string, unknown>),
      archive: {
        ...archive,
        catalogue_records: 0,
        catalogue_by_category: [],
        pages: 0,
        pages_by_period: [],
        pages_by_place: [],
        examples: [],
      },
    };
    const t = text(render(none, "pl"));
    expect(t).toContain("Wyszukiwarka Polony nie zwróciła żadnego wyniku dla słowa NOWAK");
    expect(t).not.toContain(UI.pl.archiveNotSearched);
  });
});

/**
 * TASK-051, ADR-0020: the change-over-time chapter, from the contract alone.
 *
 * The counts and list totals below are SYNTHETIC, chosen so the arithmetic is
 * checkable by eye (a count of 100 on a list of 1,000 is one in 10). The
 * builders compute `one_in_x` and `share` by the contract's own rule, which the
 * schema then re-checks when the fixture is parsed.
 */
function known(date: string, count: number, total: number, note = false) {
  return {
    status: "KNOWN",
    data_date: date,
    note_code: note ? "UNIVERSE_DESCRIPTION_DIFFERS" : null,
    source_url: null,
    count,
    list_total: total,
    one_in_x: Math.floor(total / count + 0.5),
    share: Number((count / total).toFixed(9)),
  };
}
const absent = (date: string) => ({
  status: "NOT_ON_LIST",
  data_date: date,
  note_code: null,
  source_url: null,
});

function changeEntry(
  list: "MALE" | "FEMALE",
  points: { status: string; data_date: string; count?: number; list_total?: number }[],
  gaps: { data_date: string; reason_code: "PUBLISHER_DUPLICATE" }[],
) {
  const knownPoints = points.filter((p) => p.status === "KNOWN") as {
    data_date: string;
    count: number;
    list_total: number;
  }[];
  const first = knownPoints[0]!;
  const last = knownPoints[knownPoints.length - 1]!;
  const percent = (from: number, to: number) => Math.round(((to - from) / from) * 1000) / 10;
  return {
    list,
    points,
    gaps,
    summary: {
      known_points: knownPoints.length,
      first: { data_date: first.data_date, count: first.count, list_total: first.list_total },
      last: { data_date: last.data_date, count: last.count, list_total: last.list_total },
      count_change_percent: percent(first.count, last.count),
      list_change_percent: percent(first.list_total, last.list_total),
    },
    methodology_code: "distribution_shift@1",
    scope_label_code: "PESEL_CURRENT_SURNAME",
    country_code: "PL",
    confidence: CONFIDENCE,
    citation: CITATION,
  };
}

// Men: the 2019 edition flagged, the 2020 one without the surname, a fall and a larger list.
const MALE_CHANGE = changeEntry(
  "MALE",
  [
    known("2019-06-30", 1000, 1_000_000, true),
    absent("2020-01-22"),
    known("2021-02-01", 900, 1_050_000),
    known("2026-01-20", 800, 1_200_000),
  ],
  [],
);
// Women: no 2022 edition, which the publisher's duplicate of 2021 stands in for.
const FEMALE_CHANGE = changeEntry(
  "FEMALE",
  [known("2021-02-02", 2000, 1_250_000), known("2023-01-30", 2000, 1_300_000)],
  [{ data_date: "2022-01-27", reason_code: "PUBLISHER_DUPLICATE" }],
);

function withChange(change: unknown): unknown {
  return { ...(structuredClone(RESOLVED) as object), change };
}
const CHANGE_READY = withChange({
  state: "READY",
  entries: [MALE_CHANGE, FEMALE_CHANGE],
  reason_code: null,
  surface: SURFACE,
});

describe("TASK-051: the change-over-time chapter", () => {
  it("renders, in Polish, what changed between the first and last edition and what the list did", () => {
    const body = text(render(CHANGE_READY, "pl"));
    expect(body).toContain("Zmiany w czasie");
    expect(body).toContain("Jak zmieniała się ta liczba w kolejnych edycjach listy?");
    // 1,000 → 800 is −20.0%, and the list 1,000,000 → 1,200,000 is +20.0%.
    expect(body).toContain(
      "Liczba osób o nazwisku NOWAK (mężczyźni) w rejestrze PESEL zmieniła się z 1\u00a0000 na dzień 30 czerwca 2019 r. na 800 na dzień 20 stycznia 2026 r.: −20,0%. Cała lista zmieniła się między tymi edycjami o +20,0%.",
    );
    // The women's counts are equal: the sentence says so rather than "changed by 0".
    expect(body).toContain(
      "była taka sama (2\u00a0000) na dzień 2 lutego 2021 r. i na dzień 30 stycznia 2023 r.",
    );
  });

  it("renders the same in English", () => {
    const body = text(render(CHANGE_READY, "en"));
    expect(body).toContain("Change over time");
    expect(body).toContain(
      "The number of people with the surname NOWAK (male) in the PESEL register changed from 1,000 on 30 June 2019 to 800 on 20 January 2026: −20.0%. The whole list changed by +20.0% between those editions.",
    );
  });

  it("shows each edition as a row with its count and its share of that edition's list", () => {
    const body = text(render(CHANGE_READY, "en"));
    // 1,000,000 / 1,000 = 1 in 1,000; 1,050,000 / 900 = 1 in 1,167; 1,200,000 / 800 = 1 in 1,500.
    for (const figure of ["1 in 1,000", "1 in 1,167", "1 in 1,500"]) expect(body).toContain(figure);
    expect(body).toContain("30 June 2019");
    expect(body).toContain("1 February 2021");
  });

  it("states an edition without the surname, never as zero", () => {
    for (const [lang, words] of [
      ["pl", "brak na liście — nie oznacza zera"],
      ["en", "not on the list — not zero"],
    ] as const) {
      expect(text(render(CHANGE_READY, lang))).toContain(words);
    }
    const markup = render(CHANGE_READY, "en");
    const row = markup.slice(
      markup.indexOf("22 January 2020"),
      markup.indexOf("</tr>", markup.indexOf("22 January 2020")),
    );
    expect(row).not.toMatch(/>0</u);
  });

  it("explains the publisher's duplicate where it falls, and flags the 2019 edition", () => {
    const pl = text(render(CHANGE_READY, "pl"));
    expect(pl).toContain(
      "Plik wydawcy z dnia 27 stycznia 2022 r. powtarza dane poprzedniej edycji",
    );
    expect(pl).toContain("Pliki z 2019 roku opisują swoją zawartość krótszym opisem");
    const en = text(render(CHANGE_READY, "en"));
    expect(en).toContain(
      "The publisher's file dated 27 January 2022 repeats the data of the previous edition",
    );
    expect(en).toContain("The 2019 files describe their contents in fewer words");
    // The women's list has no 2019 edition here, so its column carries no 2019 note.
    const markup = render(CHANGE_READY, "en");
    expect(markup.match(/The 2019 files describe/gu)).toHaveLength(1);
  });

  it("puts it after the geography and before the meaning, in the page and in its links", () => {
    const markup = render(CHANGE_READY, "en");
    const order = [
      'id="today-count"',
      'id="rarity"',
      'id="where"',
      'id="change"',
      'id="meaning"',
    ].map((id) => markup.indexOf(id));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(markup).toContain('href="#change"');
    // Numbered as it appears: the fourth of five chapters.
    expect(markup.slice(markup.indexOf('id="change"'))).toMatch(
      /^id="change"[^>]*><div class="chapter-rail"><p class="chapter-number">04<\/p>/u,
    );
  });

  it("moves first for ?intent=change, and changes only the order", () => {
    const parsed = surnameResultResponseSchema.parse(CHANGE_READY) as SurnameResultResponse;
    const first = renderToStaticMarkup(
      createElement(Result, { response: parsed, lang: "en", intent: "change" }),
    );
    expect(first.indexOf('id="change"')).toBeLessThan(first.indexOf('id="today-count"'));
  });

  it("is not a chapter at all where there is no claim: no chapter, no link, no sentence about it", () => {
    for (const reason of ["NO_CHANGE_DERIVED", "NOT_DERIVED_YET"]) {
      const markup = render(
        withChange({ state: "UNAVAILABLE", entries: [], reason_code: reason, surface: SURFACE }),
        "en",
      );
      expect(markup).not.toContain('id="change"');
      expect(markup).not.toContain('href="#change"');
      expect(text(markup)).not.toContain("Change over time");
    }
    // RESOLVED fixtures in the rest of this file carry no claim and render as before.
    expect(render(RESOLVED, "en")).not.toContain('id="change"');
  });

  it("carries no figure when the surface is rights-blocked", () => {
    for (const lang of ["pl", "en"] as const) {
      const markup = render(RIGHTS_BLOCKED, lang);
      expect(markup).toContain('id="change"');
      expect(markup).not.toContain("rb-fill");
      expect(text(markup)).toMatch(
        lang === "pl" ? /Licencja źródła nie pozwala/u : /licence does not permit/u,
      );
    }
  });

  it("cites the dataset once, however many claims cite it", () => {
    const markup = render(CHANGE_READY, "en");
    const from = markup.indexOf('<ul class="sources">');
    const sources = markup.slice(from, markup.indexOf("</ul>", from));
    expect(sources.match(/<li>/gu)).toHaveLength(1);
  });

  it("says nothing of why: no cause, no popularity, no decline, no fashion, no percentage of confidence", () => {
    const causal = [
      /popular/iu,
      /declin/iu,
      /\brising\b/iu,
      /\bfell\b/iu,
      /fashion/iu,
      /because/iu,
      /due to/iu,
      /migrat/iu,
      /birth/iu,
      /death/iu,
      /trend/iu,
      /popularn/iu,
      /spad/iu,
      /wzrost|wzrosł/iu,
      /moda|modn/iu,
      /przyczyn/iu,
      /migrac/iu,
      /urodzen/iu,
      /zgon/iu,
    ];
    for (const lang of ["pl", "en"] as const) {
      const body = text(render(CHANGE_READY, lang));
      for (const pattern of causal) expect(body, `${lang} ${String(pattern)}`).not.toMatch(pattern);
      expect(body).not.toMatch(/confidence[^.]{0,20}\d/iu);
    }
  });

  it("shows the sign of every change, with a true minus", () => {
    const body = text(render(CHANGE_READY, "en"));
    expect(body).toContain("−20.0%");
    expect(body).toContain("+20.0%");
    expect(body).not.toMatch(/-\d+\.\d%/u);
  });
});

/**
 * TASK-073: the known people's chapter, on this file's NOWAK page. The first
 * person is ZAREMBA's second in Wikidata's answer of 2026-10-03
 * (`fixtures/wikidata-bearers`); the second is SYNTHETIC (`Q1` is not a
 * person), standing for a living person with only an English description. The
 * chapter renders what the contract gives it and checks no name.
 */
const BEARERS_READY: unknown = {
  ...(RESOLVED as Record<string, unknown>),
  bearers: {
    state: "READY",
    searched_on: "2026-10-03",
    total: 59,
    with_death_date: 37,
    people: [
      {
        wikidata_id: "Q896660",
        name: "Stanisław Zaremba",
        description_pl: "polski matematyk, profesor UJ",
        description_en: null,
        born: 1863,
        died: 1942,
        article_url: "https://pl.wikipedia.org/wiki/Stanis%C5%82aw_Zaremba_(1863%E2%80%931942)",
        wikidata_url: "https://www.wikidata.org/wiki/Q896660",
      },
      {
        wikidata_id: "Q1",
        name: "Anna Zaremba",
        description_pl: null,
        description_en: "Polish singer",
        born: 1980,
        died: null,
        article_url: null,
        wikidata_url: "https://www.wikidata.org/wiki/Q1",
      },
    ],
    more: 57,
    confidence: { status: "VERIFIED", methodology_code: "wikidata_query_scope@wikidata_scope@1" },
    citation: {
      id: "cit-wikidata",
      title: "Wikidata",
      publisher: null,
      publication_date: null,
      source_type: "OTHER",
      locator: "Zaremba",
      url: "https://query.wikidata.org/",
      attribution: null,
      terms: "CC0",
      retrieved_at: "2026-10-03T12:05:00Z",
      source_page_url: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    },
    reason_code: null,
    surface: { surface: "FREE", decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" },
  },
};

describe("TASK-073: the known people's chapter", () => {
  it("counts the people with the surname and a Wikipedia article, with the date, in both languages", () => {
    expect(text(render(BEARERS_READY, "pl"))).toContain(
      "Wikidane wymieniają 59 osób o nazwisku NOWAK z artykułem w Wikipedii (stan z 3 października 2026",
    );
    expect(text(render(BEARERS_READY, "en"))).toContain(
      "Wikidata lists 59 people with the surname NOWAK who have a Wikipedia article",
    );
  });

  it("scopes the claim to the world, not to Poland: the people are from anywhere", () => {
    expect(text(render(BEARERS_READY, "pl"))).toContain("Świat · Wikidata · 3 października 2026");
    expect(text(render(BEARERS_READY, "en"))).toContain("Worldwide · Wikidata · 3 October 2026");
  });

  it("says a shared surname is not a family, before the people", () => {
    const markup = render(BEARERS_READY, "pl");
    expect(text(markup)).toContain(UI.pl.bearersCaveat);
    expect(markup.indexOf("bearers-caveat")).toBeLessThan(markup.indexOf("bearers-list"));
    expect(text(markup)).toContain(UI.pl.limitationBearersFamily);
  });

  it("names each person with their years, description and links, in the reader's language first", () => {
    const markup = render(BEARERS_READY, "pl");
    const t = text(markup);
    expect(t).toContain("Stanisław Zaremba");
    expect(t).toContain("1863–1942");
    expect(t).toContain("polski matematyk, profesor UJ");
    // A living person: a year of birth, and no claim that they are alive.
    expect(t).toContain("ur. 1980");
    expect(t).toContain("Polish singer");
    expect(markup).toContain('href="https://www.wikidata.org/wiki/Q1"');
    expect(markup).toContain(
      'href="https://pl.wikipedia.org/wiki/Stanis%C5%82aw_Zaremba_(1863%E2%80%931942)"',
    );
    expect(text(render(BEARERS_READY, "en"))).toContain("b. 1980");
  });

  it("says how many more the report will hold, and how to be taken off the list", () => {
    const markup = render(BEARERS_READY, "pl");
    expect(text(markup)).toContain("Pozostałe osoby (57) pokażemy w raporcie");
    expect(markup).toContain('href="/pl/oferta"');
    expect(markup).toContain('href="/pl/kontakt"');
    expect(text(markup)).toContain(UI.pl.bearersRemoval);
  });

  it("says a surname not yet looked up is not looked up, and names nobody", () => {
    const markup = render(RESOLVED, "pl");
    expect(text(markup)).toContain(UI.pl.bearersNotSearched);
    expect(markup).not.toContain("bearers-list");
  });

  it("says nobody is listed as an answer, not a gap", () => {
    const bearers = (BEARERS_READY as { bearers: Record<string, unknown> }).bearers;
    const none = {
      ...(BEARERS_READY as Record<string, unknown>),
      bearers: { ...bearers, total: 0, with_death_date: 0, people: [], more: 0 },
    };
    const markup = render(none, "pl");
    expect(text(markup)).toContain("Wikidane nie wymieniają nikogo o nazwisku NOWAK");
    expect(markup).not.toContain("bearers-removal");
  });
});
