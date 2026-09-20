import { describe, expect, it } from "vitest";
import type { DistributionEntry, PopulationObservation, RarityEntry } from "@name-atlas/contracts";
import {
  coverageWarning,
  explanationText,
  distributionSentence,
  formatDate,
  formatInteger,
  formatPercent,
  parseLang,
  partitionLabel,
  populationSentence,
  rankSentence,
  raritySentence,
  reasonText,
  UI,
} from "./messages.js";

/**
 * TASK-017. Every honesty rule the page must keep, as a test.
 *
 * The figures are the real ones: NOWAK male 98,387 counted on 2026-01-20, about
 * 1 in 215 of the published universe, 86,969 placed across 16 voivodeships with
 * WIELKOPOLSKIE holding 16,077; MELNYK male 210 placed of 6,442 registered.
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

const CONFIDENCE = { status: "VERIFIED" as const, methodology_code: "rule@1" };

const NOWAK_COUNT: PopulationObservation = {
  value: {
    status: "KNOWN",
    value: 98_387,
    unit: "PEOPLE",
    scope_label_code: "PESEL_CURRENT_SURNAME",
  },
  snapshot_date: "2026-01-20",
  country_code: "PL",
  source_population_scope: "Wykaz nazwisk męskich osób żyjących…",
  coverage_notes: null,
  comparability_group: "pesel_2026_national_male",
  confidence: CONFIDENCE,
  citation: CITATION,
};

const NOWAK_RARITY: RarityEntry = {
  primary: { metric: "ONE_IN_X", value: 215 },
  supporting: [{ metric: "RANK", value: 1 }],
  methodology_code: "PESEL_PUBLISHED_UNIVERSE_SUM_V1",
  universe_label_code: "PESEL_PUBLISHED_UNIVERSE",
  numerator: 98_387,
  denominator: 21_197_537,
  share: 0.004641435,
  scope_label_code: "PESEL_CURRENT_SURNAME",
  snapshot_date: "2026-01-20",
  country_code: "PL",
  comparability_group: "pesel_2026_national_male",
  confidence: CONFIDENCE,
  citation: CITATION,
};

const NOWAK_DISTRIBUTION: DistributionEntry = {
  coverage_state: "READY",
  regions: [
    {
      place_id: "01a0c057-0000-7000-8000-000000000030",
      terc_code: "30",
      display_name: "WIELKOPOLSKIE",
      count: 16_077,
      share_of_covered: 0.184858973,
    },
  ],
  covered_count: 16_077,
  national_count: 98_387,
  coverage_ratio: 0.883948083,
  coverage_basis: "covered_count / national_count",
  low_coverage_threshold: 0.5,
  universe_label_code: "PESEL_REGISTERED_VOIVODESHIP_COVERED_SET",
  scope_label_code: "PESEL_CURRENT_SURNAME",
  snapshot_date: "2026-01-20",
  country_code: "PL",
  comparability_group: "pesel_2026_regional_male",
  confidence: CONFIDENCE,
  citation: CITATION,
};

const MELNYK_LOW: DistributionEntry = {
  ...NOWAK_DISTRIBUTION,
  coverage_state: "LOW_COVERAGE",
  regions: [
    {
      place_id: "01a0c057-0000-7000-8000-000000000028",
      terc_code: "28",
      display_name: "WARMIŃSKO-MAZURSKIE",
      count: 38,
      share_of_covered: 0.180952381,
    },
  ],
  covered_count: 38,
  national_count: 6442,
  coverage_ratio: 0.032598572,
};

describe("parseLang", () => {
  it("defaults to Polish and accepts only the two languages that ship", () => {
    expect(parseLang(null)).toBe("pl");
    expect(parseLang(undefined)).toBe("pl");
    expect(parseLang("pl")).toBe("pl");
    expect(parseLang("en")).toBe("en");
    expect(parseLang("de")).toBe("pl");
    expect(parseLang("EN")).toBe("pl");
  });
});

describe("formatInteger", () => {
  it("groups Polish with a non-breaking space and English with a comma", () => {
    expect(formatInteger(98_387, "pl")).toBe("98 387");
    expect(formatInteger(98_387, "en")).toBe("98,387");
    expect(formatInteger(21_197_537, "pl")).toBe("21 197 537");
    expect(formatInteger(215, "pl")).toBe("215");
    expect(formatInteger(0, "en")).toBe("0");
  });

  it("does not depend on the runtime's ICU data", () => {
    // Deliberately hand-rolled: Intl has shipped different separators for pl-PL
    // across ICU versions, and a rendered number must not change on upgrade.
    expect(formatInteger(1000, "pl")).not.toBe((1000).toLocaleString("pl-PL"));
  });
});

describe("formatPercent", () => {
  it("uses a comma for Polish and a point for English, to one place", () => {
    expect(formatPercent(0.184858973, "pl")).toBe("18,5%");
    expect(formatPercent(0.184858973, "en")).toBe("18.5%");
    expect(formatPercent(0.032598572, "pl")).toBe("3,3%");
  });
});

describe("formatDate", () => {
  it("uses the Polish genitive month and the r. suffix", () => {
    expect(formatDate("2026-01-20", "pl")).toBe("20 stycznia 2026 r.");
    expect(formatDate("2026-09-01", "pl")).toBe("1 września 2026 r.");
    expect(formatDate("2026-01-20", "en")).toBe("20 January 2026");
  });

  it("returns a malformed date unchanged rather than inventing one", () => {
    expect(formatDate("not-a-date", "pl")).toBe("not-a-date");
    expect(formatDate("2026-13-01", "en")).toBe("2026-13-01");
  });
});

describe("partitionLabel", () => {
  it("reads the partition from the comparability group", () => {
    expect(partitionLabel("pesel_2026_national_male", "pl")).toBe("mężczyźni");
    expect(partitionLabel("pesel_2026_national_female", "en")).toBe("female");
    expect(partitionLabel("pesel_2026_regional_male", "en")).toBe("male");
  });

  it("returns null rather than guessing for an unknown or absent group", () => {
    expect(partitionLabel(null, "pl")).toBeNull();
    expect(partitionLabel("something_else", "en")).toBeNull();
  });
});

describe("populationSentence", () => {
  it("is the accepted sentence, exact, with scope and date", () => {
    expect(populationSentence(NOWAK_COUNT, "Nowak", "en")).toBe(
      "98,387 people were registered with the surname Nowak (male) in the PESEL register on 20 January 2026.",
    );
    expect(populationSentence(NOWAK_COUNT, "Nowak", "pl")).toBe(
      "98 387 osób było zarejestrowanych z nazwiskiem Nowak (mężczyźni) w rejestrze PESEL na dzień 20 stycznia 2026 r.",
    );
  });

  it("never says about, estimated or approximately — the count is exact", () => {
    for (const lang of ["pl", "en"] as const) {
      const text = populationSentence(NOWAK_COUNT, "Nowak", lang).toLowerCase();
      for (const hedge of ["about", "approximately", "estimated", "około", "szacunkowo"]) {
        expect(text).not.toContain(hedge);
      }
    }
  });

  it("states an absent value rather than rendering zero", () => {
    const suppressed: PopulationObservation = {
      ...NOWAK_COUNT,
      value: { ...NOWAK_COUNT.value, status: "SUPPRESSED", value: null },
    };
    const text = populationSentence(suppressed, "Nowak", "en");
    expect(text).not.toContain("0 people");
    expect(text).toMatch(/No count/u);
  });

  it("omits the partition rather than guessing when the group is unknown", () => {
    const text = populationSentence({ ...NOWAK_COUNT, comparability_group: null }, "Nowak", "en");
    expect(text).not.toContain("(");
    expect(text).toContain("98,387 people were registered with the surname Nowak in the PESEL");
  });
});

describe("raritySentence", () => {
  it("is the accepted sentence and always hedges, because the figure is rounded", () => {
    expect(raritySentence(NOWAK_RARITY, "Nowak", "en")).toBe(
      "About 1 in 215 people counted in the PESEL register (male) bore the surname Nowak on 20 January 2026.",
    );
    expect(raritySentence(NOWAK_RARITY, "Nowak", "pl")).toBe(
      "Około 1 na 215 osób ujętych w rejestrze PESEL (mężczyźni) nosiło nazwisko Nowak na dzień 20 stycznia 2026 r.",
    );
  });

  it("never says of Poles or in Poland — the denominator is not a national population", () => {
    for (const lang of ["pl", "en"] as const) {
      const text = raritySentence(NOWAK_RARITY, "Nowak", lang).toLowerCase();
      for (const wrong of ["of poles", "in poland", "polaków", "w polsce"]) {
        expect(text).not.toContain(wrong);
      }
    }
  });
});

describe("rankSentence", () => {
  it("states the position without a total, because the payload carries none", () => {
    expect(rankSentence(NOWAK_RARITY, "Nowak", "en")).toBe(
      "Nowak (male) ranked 1 among the surnames in this dataset.",
    );
    // The published-universe sum must never be rendered as the rank's universe.
    expect(rankSentence(NOWAK_RARITY, "Nowak", "en")).not.toContain("21,197,537");
  });

  it("is absent when no rank claim exists", () => {
    expect(rankSentence({ ...NOWAK_RARITY, supporting: [] }, "Nowak", "pl")).toBeNull();
  });
});

describe("coverageWarning", () => {
  it("is absent for an adequate distribution", () => {
    expect(coverageWarning(NOWAK_DISTRIBUTION, "pl")).toBeNull();
    expect(coverageWarning(NOWAK_DISTRIBUTION, "en")).toBeNull();
  });

  it("names the coverage and says this is not the surname's distribution", () => {
    expect(coverageWarning(MELNYK_LOW, "en")).toBe(
      "Only 3.3% of bearers had a registered voivodeship, so this is not the surname's distribution.",
    );
    expect(coverageWarning(MELNYK_LOW, "pl")).toBe(
      "Tylko 3,3% nosicieli miało zameldowanie na pobyt stały, więc nie jest to rozkład nazwiska.",
    );
  });

  it("says coverage is unknown rather than naming a figure it does not have", () => {
    const unknown: DistributionEntry = {
      ...MELNYK_LOW,
      coverage_state: "COVERAGE_UNKNOWN",
      national_count: null,
      coverage_ratio: null,
    };
    const text = coverageWarning(unknown, "en");
    expect(text).toMatch(/unknown/u);
    expect(text).not.toMatch(/\d/u);
  });
});

describe("distributionSentence", () => {
  it("is the accepted sentence, over the covered set, naming registered residence", () => {
    expect(distributionSentence(NOWAK_DISTRIBUTION, 0, "Nowak", "en")).toBe(
      "Among the 16,077 people with the surname Nowak (male) who had a registered voivodeship on 20 January 2026, 18.5% were registered in WIELKOPOLSKIE.",
    );
    expect(distributionSentence(NOWAK_DISTRIBUTION, 0, "Nowak", "pl")).toContain(
      "mających zameldowanie na pobyt stały",
    );
  });

  it("never says lives in, from, originates, mieszka or pochodzi", () => {
    for (const lang of ["pl", "en"] as const) {
      for (const entry of [NOWAK_DISTRIBUTION, MELNYK_LOW]) {
        const text = (distributionSentence(entry, 0, "Nowak", lang) ?? "").toLowerCase();
        for (const wrong of [
          "lives in",
          "comes from",
          "originat",
          "is found in",
          "mieszka",
          "pochodzi",
          "urodzon",
        ]) {
          expect(text).not.toContain(wrong);
        }
      }
    }
  });

  it("returns null for a region index the entry does not have", () => {
    expect(distributionSentence(NOWAK_DISTRIBUTION, 9, "Nowak", "en")).toBeNull();
  });
});

describe("reasonText", () => {
  it("has words for every code the query service can emit", () => {
    for (const code of [
      "NO_APPLICABLE_EVIDENCE",
      "NO_COMPLETE_UNIVERSE",
      "NO_COMPLETE_REGIONAL_UNIVERSE",
      "INPUT_TOO_SHORT",
      "NO_CANDIDATE_ABOVE_THRESHOLD",
      "MIXED_SCRIPT_REVIEW",
      "MULTIPLE_EXACT_MATCHES",
      "SUGGESTIONS_UNAVAILABLE",
    ]) {
      for (const lang of ["pl", "en"] as const) {
        const text = reasonText(code, lang);
        expect(text).toBeTruthy();
        // The raw code never reaches a reader.
        expect(text).not.toContain(code);
      }
    }
  });

  it("falls back honestly for an unknown code instead of printing it", () => {
    const text = reasonText("SOMETHING_NEW", "en");
    expect(text).toBeTruthy();
    expect(text).not.toContain("SOMETHING_NEW");
  });

  it("is null when there is no reason", () => {
    expect(reasonText(null, "pl")).toBeNull();
  });
});

describe("explanationText", () => {
  it("localises the codes a reader should see", () => {
    expect(explanationText(["ADJACENT_TRANSPOSITION", "EDIT_DISTANCE_1"], "en")).toBe(
      "two letters swapped, differs by one letter",
    );
    expect(explanationText(["ADJACENT_TRANSPOSITION"], "pl")).toBe("dwie litery przestawione");
  });

  it("never renders a similarity band — that is a score in words", () => {
    expect(explanationText(["TRIGRAM_HIGH"], "en")).toBeNull();
    expect(explanationText(["TRIGRAM_MODERATE", "EDIT_DISTANCE_1"], "en")).toBe(
      "differs by one letter",
    );
  });

  it("omits an unknown code rather than printing it raw", () => {
    expect(explanationText(["SOMETHING_NEW"], "pl")).toBeNull();
    expect(explanationText([], "en")).toBeNull();
    const text = explanationText(["SOMETHING_NEW", "EDIT_DISTANCE_2"], "en");
    expect(text).toBe("differs by two letters");
    expect(text).not.toContain("SOMETHING_NEW");
  });
});

describe("UI strings", () => {
  it("cover both languages with the same keys, so no state is wordless", () => {
    expect(Object.keys(UI.pl).sort()).toEqual(Object.keys(UI.en).sort());
    for (const lang of ["pl", "en"] as const) {
      for (const [key, value] of Object.entries(UI[lang])) {
        expect(value, `${lang}.${key}`).not.toBe("");
      }
    }
  });

  it("says the two datasets are never summed, in both languages", () => {
    expect(UI.pl.notSummed).toMatch(/nigdy nie są sumowane/u);
    expect(UI.en.notSummed).toMatch(/never summed/u);
  });
});
