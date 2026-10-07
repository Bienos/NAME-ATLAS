import { describe, expect, it } from "vitest";
import type { GivenNameMeaningFacts } from "@name-atlas/truth";
import {
  hasQuotedMeaning,
  parseReadingOutput,
  READING_INSTRUCTIONS,
  READING_SCHEMA,
  readingInput,
  readingParagraphs,
  whyNoReading,
} from "./couple-names-reading.js";
import { MALGORZATA_MEANING, PIOTR_MEANING, ANNA_MEANING } from "./couple-names-fixture.js";

/** TASK-156 AC-3, AC-5: what the model is given, and what it is told. */

describe("the reading's material (TASK-156)", () => {
  it("sends the two claims' entries and nothing else: no surname, no locator, no year, no account (AC-5)", () => {
    const input = readingInput(
      { name: "MAŁGORZATA", meaning: MALGORZATA_MEANING },
      { name: "PIOTR", meaning: PIOTR_MEANING },
    );
    const parsed = JSON.parse(input) as { names: { name: string; entries: unknown[] }[] };
    expect(parsed.names.map((n) => n.name)).toEqual(["MAŁGORZATA", "PIOTR"]);
    expect(parsed.names[0]?.entries).toEqual([
      {
        work: { author: "Charlotte M. Yonge", title: "History of Christian Names" },
        origin: { as_printed: "Gr.", language_en: "Greek", language_pl: "greckie" },
        meaning: "pearl",
        polish_translation: "perła",
      },
      {
        work: { author: "ks. Józef Buryan", title: "Skąd pochodzi twoje imię i nazwisko" },
        origin: { as_printed: "z greckich", language_en: "Greek", language_pl: "greckie" },
        meaning: null,
        polish_translation: null,
      },
    ]);
    expect(input).not.toMatch(
      /1884|1933|locator|Glossary|s\. \d|citation|claim_id|user|account|@/u,
    );
    expect(Object.keys(parsed)).toEqual(["names"]);
    expect(Object.keys(parsed.names[0] ?? {})).toEqual(["name", "entries"]);
  });

  it("knows which names can take part: a quoted meaning, not an origin alone", () => {
    expect(hasQuotedMeaning(MALGORZATA_MEANING)).toBe(true);
    expect(hasQuotedMeaning(ANNA_MEANING)).toBe(false);
    expect(whyNoReading(MALGORZATA_MEANING)).toBeNull();
    expect(whyNoReading(ANNA_MEANING)).toBe("ORIGIN_ONLY");
    expect(whyNoReading({ state: "NO_SOURCE" })).toBe("NO_SOURCE");
    expect(whyNoReading({ state: "RIGHTS_BLOCKED" })).toBe("RIGHTS_BLOCKED");
    const none: GivenNameMeaningFacts = {
      state: "READY",
      claim_id: "claim-x",
      confidence: { status: "POSSIBLE", methodology_code: "x@1" },
      works: [],
    };
    expect(whyNoReading(none)).toBe("ORIGIN_ONLY");
  });

  it("tells the model the rules of ADR-0047 §2.3 and asks for the two texts", () => {
    expect(READING_INSTRUCTIONS).toContain("only material you may use");
    expect(READING_INSTRUCTIONS).toContain("Add no meaning, origin, etymology");
    expect(READING_INSTRUCTIONS).toContain("Write no year, no page and no digit");
    expect(READING_INSTRUCTIONS).toContain("Never say or imply whether the names suit");
    expect(READING_INSTRUCTIONS).toContain("between 120 and 220 words in Polish");
    expect(READING_SCHEMA).toEqual({
      name: "couple_names_reading",
      schema: {
        type: "object",
        properties: { pl: { type: "string" }, en: { type: "string" } },
        required: ["pl", "en"],
        additionalProperties: false,
      },
    });
  });

  it("reads the model's answer as two trimmed texts, or nothing", () => {
    expect(parseReadingOutput({ pl: " Tekst. ", en: "Text." })).toEqual({
      pl: "Tekst.",
      en: "Text.",
    });
    expect(parseReadingOutput({ pl: "Tekst." })).toBeNull();
    expect(parseReadingOutput({ pl: "", en: "x" })).toBeNull();
    expect(parseReadingOutput({ pl: 1, en: "x" })).toBeNull();
    expect(parseReadingOutput(["a", "b"])).toBeNull();
    expect(parseReadingOutput(null)).toBeNull();
  });

  it("splits a text into paragraphs on blank lines", () => {
    expect(readingParagraphs("Jeden.\nDwa.\n\n  Trzy. \n\n\nCztery.")).toEqual([
      "Jeden. Dwa.",
      "Trzy.",
      "Cztery.",
    ]);
  });
});
