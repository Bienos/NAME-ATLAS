import { describe, expect, it } from "vitest";
import type {
  ChangeEntry,
  DistributionEntry,
  OtherSpelling,
  PopulationObservation,
  RarityEntry,
} from "@name-atlas/contracts";
import {
  changeGapNote,
  changeListLabel,
  changeSentence,
  coverageWarning,
  explanationText,
  distributionSentence,
  fillTemplate,
  formatChance,
  formatCompact,
  formatDate,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPercentChange,
  formatQuantile,
  formatShare,
  formatSigned,
  otherSpellingParts,
  parseLang,
  parseTemplate,
  pluralForm,
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
  retrieved_at: "2026-09-18T17:40:00Z",
  source_page_url:
    "https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel",
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

describe("formatPercent with a precision (TASK-040)", () => {
  it("keeps one decimal by default and takes the caller's precision otherwise", () => {
    expect(formatPercent(0.505603006, "pl")).toBe("50,6%");
    expect(formatPercent(0.505603006, "pl", 2)).toBe("50,56%");
    expect(formatPercent(0.505603006, "en", 2)).toBe("50.56%");
    expect(formatPercent(0.5, "pl", 0)).toBe("50%");
    expect(formatPercent(0.999, "pl", 1)).toBe("99,9%");
  });
});

describe("formatDecimal", () => {
  it("groups the whole part like a count and uses the locale's decimal mark", () => {
    expect(formatDecimal(921.139864938, 1, "pl")).toBe("921,1");
    expect(formatDecimal(921.139864938, 1, "en")).toBe("921.1");
    expect(formatDecimal(146707.158767278, 0, "pl")).toBe("146\u00a0707");
    expect(formatDecimal(146707.158767278, 0, "en")).toBe("146,707");
    expect(formatDecimal(7041.760172186, 1, "pl")).toBe("7\u00a0041,8");
    expect(formatDecimal(98.941585207, 0, "pl")).toBe("99");
  });

  it("never prints a negative zero", () => {
    expect(formatDecimal(-0.01, 1, "pl")).toBe("0,0");
    expect(formatDecimal(-1234.5, 1, "en")).toBe("-1,234.5");
  });
});

describe("formatChance", () => {
  it("shows a probability to two decimals, so both sides of one half stay apart", () => {
    expect(formatChance(0.505603006, "pl")).toBe("50,56%");
    expect(formatChance(0.497246043, "pl")).toBe("49,72%");
    expect(formatChance(0.054230001, "en")).toBe("5.42%");
  });

  it("adds digits rather than round a value onto 0%, 50% or 100% it does not equal", () => {
    expect(formatChance(0.50001953, "pl")).toBe("50,002%");
    expect(formatChance(0.500001, "pl")).toBe("50,0001%");
    expect(formatChance(0.999801374, "en")).toBe("99.98%");
    expect(formatChance(0.99999, "en")).toBe("99.999%");
    expect(formatChance(0.000023, "pl")).toBe("0,002%");
    expect(formatChance(0.5, "pl")).toBe("50,00%");
  });

  it("rounds a value still on an edge at four decimals toward the side it is on", () => {
    expect(formatChance(0.4999996, "pl")).toBe("49,9999%");
    expect(formatChance(0.49999999, "en")).toBe("49.9999%");
    expect(formatChance(0.5000004, "pl")).toBe("50,0001%");
    expect(formatChance(0.9999999, "en")).toBe("99.9999%");
    expect(formatChance(0.0000001, "en")).toBe("0.0001%");
    expect(formatChance(1, "en")).toBe("100.00%");
    expect(formatChance(0, "en")).toBe("0.00%");
  });

  it("never shows a chance on the wrong side of one half", () => {
    const shown = (p: number) => Number(formatChance(p, "en").replace("%", ""));
    for (let k = -2000; k <= 2000; k++) {
      const p = 0.5 + k * 1.3e-8;
      if (p < 0.5) expect(shown(p), String(p)).toBeLessThan(50);
      else if (p > 0.5) expect(shown(p), String(p)).toBeGreaterThan(50);
      else expect(shown(p)).toBe(50);
    }
  });
});

describe("formatQuantile", () => {
  it("shows a quantile with only the digits it needs", () => {
    expect(formatQuantile(0.5, "pl")).toBe("50%");
    expect(formatQuantile(0.9, "pl")).toBe("90%");
    expect(formatQuantile(0.99, "en")).toBe("99%");
    expect(formatQuantile(0.999, "pl")).toBe("99,9%");
    expect(formatQuantile(0.999, "en")).toBe("99.9%");
    expect(formatQuantile(0.9999, "pl")).toBe("99,99%");
    expect(formatQuantile(0.12345, "en")).toBe("12.345%");
  });
});

describe("formatShare", () => {
  it("keeps one decimal, and two below one per cent so a small share is not rounded up", () => {
    expect(formatShare(0.862875112, "pl")).toBe("86,3%");
    expect(formatShare(0.10680321, "en")).toBe("10.7%");
    expect(formatShare(0.004641435, "pl")).toBe("0,46%");
    expect(formatShare(0.004641435, "en")).toBe("0.46%");
    expect(formatShare(0.0251, "pl")).toBe("2,5%");
  });
});

describe("formatSigned (TASK-044)", () => {
  it("writes a stored difference with its sign, grouped, and a minus sign for a fall", () => {
    expect(formatSigned(1318492, "pl")).toBe("+1\u00a0318\u00a0492");
    expect(formatSigned(1318492, "en")).toBe("+1,318,492");
    expect(formatSigned(-4182, "pl")).toBe("\u22124\u00a0182");
    expect(formatSigned(-4182, "en")).toBe("\u22124,182");
    expect(formatSigned(0, "pl")).toBe("0");
  });
});

describe("formatCompact", () => {
  it("writes round thousands and millions as words, and anything else in full", () => {
    expect(formatCompact(100, "pl")).toBe("100");
    expect(formatCompact(1000, "pl")).toBe("1\u00a0tys.");
    expect(formatCompact(100000, "pl")).toBe("100\u00a0tys.");
    expect(formatCompact(1000000, "pl")).toBe("1\u00a0mln");
    expect(formatCompact(1000000, "en")).toBe("1M");
    expect(formatCompact(10000, "en")).toBe("10k");
    expect(formatCompact(1500, "pl")).toBe("1\u00a0500");
  });
});

describe("message templates (TASK-040)", () => {
  it("parses slots, agreeing words and emphasis", () => {
    expect(parseTemplate("**Typowe** {s} {s:osoba|osoby|osób}.")).toEqual([
      { kind: "text", text: "Typowe", strong: true },
      { kind: "text", text: " ", strong: false },
      { kind: "slot", key: "s", strong: false },
      { kind: "text", text: " ", strong: false },
      { kind: "plural", key: "s", forms: ["osoba", "osoby", "osób"], strong: false },
      { kind: "text", text: ".", strong: false },
    ]);
  });

  it("agrees a Polish word with its count in three forms, an English one in two", () => {
    const forms = ["osoba", "osoby", "osób"];
    expect([1, 2, 5, 12, 22, 82, 112, 738].map((n) => pluralForm(n, forms, "pl"))).toEqual([
      "osoba",
      "osoby",
      "osób",
      "osób",
      "osoby",
      "osoby",
      "osób",
      "osób",
    ]);
    expect(pluralForm(1, ["person", "people"], "en")).toBe("person");
    expect(pluralForm(82, ["person", "people"], "en")).toBe("people");
  });

  it("fills a template as text and leaves no mark for a missing key", () => {
    expect(
      fillTemplate(
        "{n:Wystarczy|Wystarczą|Wystarczy} {n} {n:osoba|osoby|osób}.",
        { n: "82" },
        { n: 82 },
        "pl",
      ),
    ).toBe("Wystarczą 82 osoby.");
    expect(fillTemplate("a {missing} b {gone:x|y}", {}, {}, "en")).toBe("a  b ");
  });

  it("uses only marks its sentences can fill: every atlas string parses to known parts", () => {
    for (const lang of ["pl", "en"] as const) {
      for (const [key, value] of Object.entries(UI[lang])) {
        if (!key.startsWith("lf")) continue;
        const parts = parseTemplate(value);
        const rebuilt = parts.map((p) => (p.kind === "text" ? p.text : "")).join("");
        expect(rebuilt, `${lang}.${key}`).not.toMatch(/[{}]|\*\*/u);
        for (const part of parts) {
          if (part.kind !== "plural") continue;
          expect(part.forms.length, `${lang}.${key}`).toBe(lang === "pl" ? 3 : 2);
        }
      }
    }
  });

  it("keeps the atlas's copy clear of origin, residence and nationality words", () => {
    for (const lang of ["pl", "en"] as const) {
      for (const [key, value] of Object.entries(UI[lang])) {
        if (!key.startsWith("lf")) continue;
        const lower = value.toLowerCase();
        for (const wrong of [
          "pochodzi",
          "mieszka",
          "urodzon",
          "polaków",
          "w polsce",
          "comes from",
          "lives in",
          "of poles",
          "in poland",
          "originat",
        ]) {
          expect(lower, `${lang}.${key}`).not.toContain(wrong);
        }
      }
    }
  });

  it("gives no cause for a change: no births, deaths, marriages, migration or war (TASK-044)", () => {
    for (const lang of ["pl", "en"] as const) {
      for (const [key, value] of Object.entries(UI[lang])) {
        if (!key.startsWith("lf")) continue;
        const lower = value.toLowerCase();
        for (const wrong of [
          /przyczyn/u,
          /urodze/u,
          /narodzin/u,
          /zgon/u,
          /śmier/u,
          /zmarł/u,
          /małżeń/u,
          /ślub/u,
          /migr/u,
          /wojn/u,
          /narodow/u,
          /cudzoziem/u,
          /obywatel/u,
          /ukrai/u,
          /przybył/u,
          /ubył/u,
          /foreign/u,
          /citizen/u,
          /immigr/u,
          /\bbirth(?!day)/u,
          /\bdeath/u,
          /\bdied\b/u,
          /marriag/u,
          /\bmarried\b/u,
          /\bwars?\b/u,
          /nationalit/u,
          /\bcaus/u,
        ]) {
          expect(lower, `${lang}.${key}`).not.toMatch(wrong);
        }
      }
    }
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
      "NOT_DERIVED_YET",
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

describe("formatPercentChange (TASK-051)", () => {
  it("writes a stored change with its sign, one decimal and a true minus", () => {
    expect(formatPercentChange(6, "en")).toBe("+6.0%");
    expect(formatPercentChange(6, "pl")).toBe("+6,0%");
    expect(formatPercentChange(-6.7, "en")).toBe("\u22126.7%");
    expect(formatPercentChange(-6.7, "pl")).toBe("\u22126,7%");
    expect(formatPercentChange(0.1, "en")).toBe("+0.1%");
  });

  it("writes zero without a sign, and never a negative zero", () => {
    expect(formatPercentChange(0, "en")).toBe("0.0%");
    expect(formatPercentChange(-0, "pl")).toBe("0,0%");
  });
});

describe("changeSentence and its notes (TASK-051, ADR-0020)", () => {
  // SYNTHETIC figures, as in the contract tests.
  const entry = (firstCount: number, lastCount: number, count: number, list: number): ChangeEntry =>
    ({
      list: "FEMALE",
      points: [],
      gaps: [],
      summary: {
        known_points: 2,
        first: { data_date: "2019-06-30", count: firstCount, list_total: 1_000_000 },
        last: { data_date: "2026-01-20", count: lastCount, list_total: 1_200_000 },
        count_change_percent: count,
        list_change_percent: list,
      },
    }) as unknown as ChangeEntry;

  it("names the list, both dates, both counts and both changes, in each language", () => {
    expect(changeSentence(entry(100, 120, 20, 20), "NOWAK", "en")).toBe(
      "The number of people with the surname NOWAK (female) in the PESEL register changed from 100 on 30 June 2019 to 120 on 20 January 2026: +20.0%. The whole list changed by +20.0% between those editions.",
    );
    expect(changeSentence(entry(100, 120, 20, 20), "NOWAK", "pl")).toBe(
      "Liczba osób o nazwisku NOWAK (kobiety) w rejestrze PESEL zmieniła się z 100 na dzień 30 czerwca 2019 r. na 120 na dzień 20 stycznia 2026 r.: +20,0%. Cała lista zmieniła się między tymi edycjami o +20,0%.",
    );
  });

  it("says the count was the same when it was, rather than a change of nothing", () => {
    const sentence = changeSentence(entry(100, 100, 0, 20), "NOWAK", "en");
    expect(sentence).toContain("was the same (100) on 30 June 2019 and on 20 January 2026.");
    expect(sentence).not.toContain("changed from");
  });

  it("ends each of its two sentences with one full stop, including after a Polish date", () => {
    const pl = changeSentence(entry(100, 100, 0, 20), "NOWAK", "pl");
    expect(pl).toContain("na dzień 20 stycznia 2026 r. Cała lista");
    expect(pl).not.toContain("..");
    expect(pl.endsWith("+20,0%.")).toBe(true);
  });

  it("labels the lists as the count does", () => {
    expect(changeListLabel("MALE", "pl")).toBe("mężczyźni");
    expect(changeListLabel("FEMALE", "pl")).toBe("kobiety");
    expect(changeListLabel("MALE", "en")).toBe("male");
    expect(changeListLabel("FEMALE", "en")).toBe("female");
  });

  it("dates a publisher's duplicate in words", () => {
    expect(changeGapNote("2022-01-27", "en")).toContain("dated 27 January 2022 repeats");
    expect(changeGapNote("2022-01-27", "pl")).toContain("z dnia 27 stycznia 2022 r. powtarza");
  });

  it("uses no word of cause, popularity, decline or fashion anywhere in its catalogue", () => {
    const causal =
      /popular|declin|rising|fashion|because|due to|migrat|birth|death|trend|popularn|spad|wzrost|wzrosł|moda|modn|przyczyn|migrac|urodzen|zgon/iu;
    for (const lang of ["pl", "en"] as const) {
      const words = Object.entries(UI[lang])
        .filter(([key]) => /^(change|chapterChange|navChange)/u.test(key))
        .map(([, value]) => String(value));
      expect(words.length).toBeGreaterThan(8);
      for (const word of words) expect(word).not.toMatch(causal);
      for (const sentence of [
        changeGapNote("2022-01-27", lang),
        changeSentence(entry(100, 120, 20, 20), "NOWAK", lang),
        changeSentence(entry(100, 100, 0, 20), "NOWAK", lang),
      ]) {
        expect(sentence).not.toMatch(causal);
      }
    }
  });
});

describe("otherSpellingParts (TASK-131)", () => {
  // SYNTHETIC counts, to reach each Polish plural form; the name is a placeholder.
  const other = (count: number, group: string): OtherSpelling => ({
    surname: { id: "01a0f034-0000-7000-8000-000000000001", display_name: "ŁĄCKI", script: "Latn" },
    rule_code: "POLISH_DIACRITIC_FOLD",
    comparability_group: group,
    snapshot_date: "2026-01-20",
    count,
    surface: { surface: "FREE", decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" },
  });
  const sentence = (o: OtherSpelling, lang: "pl" | "en") => {
    const { lead, name, rest } = otherSpellingParts(o, lang);
    return `${lead}${name}${rest}`;
  };

  it("asks, with the count agreeing in Polish and the list and date named", () => {
    const male = "pesel_2026_national_male";
    expect(sentence(other(1, male), "pl")).toBe(
      "Szukasz ŁĄCKI? 1 osoba (mężczyźni) w rejestrze PESEL na dzień 20 stycznia 2026 r.",
    );
    expect(sentence(other(3, male), "pl")).toContain("? 3 osoby (mężczyźni)");
    expect(sentence(other(12, male), "pl")).toContain("? 12 osób (mężczyźni)");
    expect(sentence(other(1, "pesel_2026_national_female"), "en")).toBe(
      "Looking for ŁĄCKI? 1 person (female) in the PESEL register on 20 January 2026.",
    );
  });

  it("omits the list label for a list it does not recognise, rather than guessing", () => {
    expect(sentence(other(5, "some_list"), "pl")).toContain("? 5 osób w rejestrze PESEL");
  });
});
