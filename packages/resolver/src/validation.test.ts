import { describe, expect, it } from "vitest";
import { detectScripts } from "./script.js";
import { DEFAULT_MAX_INPUT_CODE_POINTS, validateSurnameInput } from "./validation.js";

/** TASK-003 §8 items 4–8 — validation and script detection, no database. */

describe("validateSurnameInput - what is VALID (docs/canonical/13 §4.2, §4.3)", () => {
  it("item 4: a short surname (1-3 characters) is VALID", () => {
    expect(validateSurnameInput("O").status).toBe("VALID");
    expect(validateSurnameInput("Li").status).toBe("VALID");
    expect(validateSurnameInput("Żak").status).toBe("VALID");
  });

  it("item 4: a multi-word surname with particles is VALID", () => {
    expect(validateSurnameInput("van der X").status).toBe("VALID");
    expect(validateSurnameInput("de la Cruz").status).toBe("VALID");
  });

  it("item 5: hyphenated and apostrophised surnames are VALID", () => {
    expect(validateSurnameInput("Kowalska-Nowak").status).toBe("VALID");
    expect(validateSurnameInput("O'Brien").status).toBe("VALID");
    expect(validateSurnameInput("O\u2019Brien").status).toBe("VALID");
  });

  it("a real surname with a slash or a standalone combining mark is VALID", () => {
    // Both shapes occur in the verified PESEL source (docs/sources/pesel.md);
    // used here as strings only, never as counts or claims.
    expect(validateSurnameInput("W/SILASSIE").status).toBe("VALID");
    expect(validateSurnameInput("DOG\u0308AN").status).toBe("VALID");
  });

  it("leading/trailing whitespace does not invalidate an otherwise valid surname", () => {
    expect(validateSurnameInput("  ŁUCZAK  ").status).toBe("VALID");
  });
});

describe("validateSurnameInput - what is not (docs/canonical/13 §4.1, §4.4, §4.5)", () => {
  it("item 6: empty and whitespace-only input is EMPTY", () => {
    expect(validateSurnameInput("").status).toBe("EMPTY");
    expect(validateSurnameInput("   ").status).toBe("EMPTY");
    expect(validateSurnameInput("\u00a0 \u2009").status).toBe("EMPTY"); // NBSP, thin space
  });

  it("tab and newline are control characters, not whitespace - MALFORMED, never EMPTY or VALID", () => {
    expect(validateSurnameInput("\t").status).toBe("MALFORMED_CONTROL_CHARACTERS");
    expect(validateSurnameInput("van\tder").status).toBe("MALFORMED_CONTROL_CHARACTERS");
    expect(validateSurnameInput("Kowalski\r\n").status).toBe("MALFORMED_CONTROL_CHARACTERS");
  });

  it("item 6: input beyond the operational limit is EXCEEDS_OPERATIONAL_LIMIT", () => {
    const atLimit = "a".repeat(DEFAULT_MAX_INPUT_CODE_POINTS);
    const overLimit = "a".repeat(DEFAULT_MAX_INPUT_CODE_POINTS + 1);
    expect(validateSurnameInput(atLimit).status).toBe("VALID");
    expect(validateSurnameInput(overLimit).status).toBe("EXCEEDS_OPERATIONAL_LIMIT");
  });

  it("the limit counts code points, not UTF-16 units, and is configurable", () => {
    // U+1F600 is one code point but two UTF-16 code units.
    const astral = "\u{1f600}".repeat(5);
    expect(validateSurnameInput(astral, { maxCodePoints: 5 }).status).not.toBe(
      "EXCEEDS_OPERATIONAL_LIMIT",
    );
    expect(validateSurnameInput(astral, { maxCodePoints: 4 }).status).toBe(
      "EXCEEDS_OPERATIONAL_LIMIT",
    );
  });

  it("item 7: bidi controls and zero-width characters are MALFORMED_CONTROL_CHARACTERS", () => {
    expect(validateSurnameInput("Kowal\u202eski").status).toBe("MALFORMED_CONTROL_CHARACTERS"); // RLO
    expect(validateSurnameInput("Kowal\u200bski").status).toBe("MALFORMED_CONTROL_CHARACTERS"); // ZWSP
    expect(validateSurnameInput("Kowal\u200dski").status).toBe("MALFORMED_CONTROL_CHARACTERS"); // ZWJ
    expect(validateSurnameInput("\ufeffKowalski").status).toBe("MALFORMED_CONTROL_CHARACTERS"); // BOM
    expect(validateSurnameInput("Kowal\u0000ski").status).toBe("MALFORMED_CONTROL_CHARACTERS"); // NUL
    expect(validateSurnameInput("Kowalski\n").status).toBe("MALFORMED_CONTROL_CHARACTERS"); // LF
  });

  it("item 8: a Latin + Cyrillic confusable is MIXED_SCRIPT_REVIEW, with the confusable flag set", () => {
    // Latin "Kowalski" with a Cyrillic а (U+0430) in place of Latin a.
    const result = validateSurnameInput("Kow\u0430lski");
    expect(result.status).toBe("MIXED_SCRIPT_REVIEW");
    expect(result.mixed_script).toBe(true);
    expect(result.script_confusable_flag).toBe(true);
    expect(result.detected_scripts).toEqual(["Latn", "Cyrl"]);
  });

  it("checks run in a fixed order, so overlapping conditions are deterministic", () => {
    const longAndMalformed = "\u202e" + "a".repeat(DEFAULT_MAX_INPUT_CODE_POINTS + 1);
    expect(validateSurnameInput(longAndMalformed).status).toBe("EXCEEDS_OPERATIONAL_LIMIT");
    const malformedAndMixed = "Kow\u0430l\u200bski";
    expect(validateSurnameInput(malformedAndMixed).status).toBe("MALFORMED_CONTROL_CHARACTERS");
  });
});

describe("detectScripts (docs/canonical/13 §10)", () => {
  it("Latin plus punctuation is a single script - Common never counts (§10.3)", () => {
    const result = detectScripts("O'Brien-Nowak");
    expect(result.primary_script).toBe("Latn");
    expect(result.mixed_script).toBe(false);
    expect(result.detected_scripts).toEqual(["Latn", "Zyyy"]);
  });

  it("a combining mark is Inherited and never causes a mixed-script result", () => {
    const latin = detectScripts("DOG\u0308AN");
    expect(latin.mixed_script).toBe(false);
    expect(latin.detected_scripts).toEqual(["Latn", "Zinh"]);
    // The same mark on a Cyrillic base must not be read as a Latin letter
    // just because Latin appears in its Script_Extensions.
    const cyrillic = detectScripts("\u041a\u043e\u0432\u0430\u043b\u0308");
    expect(cyrillic.mixed_script).toBe(false);
    expect(cyrillic.detected_scripts).toEqual(["Cyrl", "Zinh"]);
  });

  it("pure Cyrillic is detected as Cyrl, not mixed (P1 detection-only support)", () => {
    const result = detectScripts("\u041a\u043e\u0432\u0430\u043b\u044c\u0441\u043a\u0438"); // "Kowalski" in Cyrillic
    expect(result.primary_script).toBe("Cyrl");
    expect(result.mixed_script).toBe(false);
    expect(result.script_confusable_flag).toBe(false);
  });

  it("Latin + Greek is mixed and confusable; Latin + Hebrew is mixed but not a confusable pair", () => {
    expect(detectScripts("Kow\u03b1lski").script_confusable_flag).toBe(true); // Greek alpha
    const hebrew = detectScripts("Kowalski \u05d0");
    expect(hebrew.mixed_script).toBe(true);
    expect(hebrew.script_confusable_flag).toBe(false);
  });

  it("an input with no letters of any script has primary_script Zyyy", () => {
    expect(detectScripts("---").primary_script).toBe("Zyyy");
    expect(detectScripts("").primary_script).toBe("Zyyy");
  });

  it("primary_script is the most frequent real script", () => {
    // Nine Latin letters, one Cyrillic — Latin wins; still flagged mixed.
    const result = detectScripts("Kowalski\u0430");
    expect(result.primary_script).toBe("Latn");
    expect(result.mixed_script).toBe(true);
  });
});
