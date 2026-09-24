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
  // The real line, as the rights profile stores it and as a live page renders
  // it. It was `null` until 2026-09-21, which made the honesty guard below pass
  // for the wrong reason — see the comment there.
  attribution: "Dane pochodzą z rejestru PESEL, Ministerstwo Cyfryzacji, dane.gov.pl (CC0 1.0)",
  terms: "CC0 1.0",
  retrieved_at: "2026-09-18T17:40:00Z",
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
  schema_version: "1.5",
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
  schema_version: "1.5",
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
};

const WITH_SUGGESTIONS: unknown = {
  schema_version: "1.5",
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
  schema_version: "1.5",
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
    expect(body).toContain("Verified");
    expect(markup).toContain('data-assessment="VERIFIED"');
    expect(body).toContain("Confidence");
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
    const full = text(markup);
    const section = full.slice(full.indexOf("Meaning"));
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
 * TASK-023 — the claim unit, the evidence panel, the snapshot, intent order
 * and the second-search control, asserted against markup.
 */
describe("TASK-023 AC-1/AC-2: every figure is a claim with inline evidence", () => {
  it("renders each observation, rarity entry and distribution entry as a claim", () => {
    const markup = render(RESOLVED, "pl");
    // 2 population + 2 rarity + 1 distribution entries in the fixture.
    expect(markup.match(/class="claim"/gu)?.length).toBe(5);
    expect(markup.match(/<details class="evidence">/gu)?.length).toBe(5);
  });

  it("shows the assessment as a word, the source kind and the scope line", () => {
    const body = text(render(RESOLVED, "pl"));
    expect(body).toContain("Zweryfikowane");
    expect(body).toContain("Dane urzędowe");
    expect(body).toContain("Polska · Ministerstwo Cyfryzacji · 20 stycznia 2026 r.");
    expect(body).not.toMatch(/VERIFIED/u);
  });

  it("names source, provider, data date, retrieved date and method in the evidence", () => {
    const body = text(render(RESOLVED, "en"));
    expect(body).toContain("Nazwiska występujące w rejestrze PESEL");
    expect(body).toContain("Retrieved");
    expect(body).toContain("18 September 2026");
    expect(body).toContain("Method");
    expect(body).toContain("rule@1");
    expect(body).toContain("Limitations");
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
});

describe("TASK-023: sources section and anchors", () => {
  it("lists every distinct citation once under #sources", () => {
    const m = render(RESOLVED, "en");
    expect(m).toContain('id="sources"');
    const sources = m.slice(m.indexOf('id="sources"'));
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
    expect(markup).toContain("<table>");
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
