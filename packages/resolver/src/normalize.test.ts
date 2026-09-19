import { describe, expect, it } from "vitest";
import {
  canonicalKey,
  collapseWhitespace,
  fullCaseFold,
  mapSeparators,
  polishDiacriticFold,
  toNfc,
} from "./normalize.js";
import { unicodeRuntime } from "./version.js";

/**
 * TASK-003 §8 items 1–3, 5 (the punctuation half) — pure normalisation.
 *
 * Every surname string here is either a real Polish surname spelling used
 * only as a realistic string (never as a count or a claim) or a clearly
 * synthetic construction such as a decomposed code-point sequence.
 */

// "Ł" precomposed vs "L" + U+0327? No — Ł has no canonical decomposition.
// Use a letter that does: "ó" (U+00F3) ≡ "o" + U+0301 COMBINING ACUTE.
const GORSKI_PRECOMPOSED = "Górski";
const GORSKI_DECOMPOSED = "Go\u0301rski";

describe("toNfc", () => {
  it("composes a decomposed sequence to its precomposed form", () => {
    expect(toNfc(GORSKI_DECOMPOSED)).toBe(GORSKI_PRECOMPOSED);
  });

  it("leaves a combining mark that has no precomposed form in place", () => {
    // Real property of PESEL data (docs/sources/pesel.md): G + U+0308 has no
    // precomposed code point, so NFC must preserve the two-code-point form.
    const withMark = "DOG\u0308AN";
    expect(toNfc(withMark)).toBe(withMark);
  });
});

describe("fullCaseFold", () => {
  it("folds the full Polish alphabet to lowercase, diacritics intact", () => {
    expect(fullCaseFold("ĄĆĘŁŃÓŚŹŻ")).toBe("ąćęłńóśźż");
    expect(fullCaseFold("ąćęłńóśźż")).toBe("ąćęłńóśźż");
  });

  it("performs full (multi-character) folding, not simple lowercasing", () => {
    expect(fullCaseFold("ß")).toBe("ss");
    expect(fullCaseFold("ẞ")).toBe("ss"); // capital sharp s
    expect(fullCaseFold("ﬁ")).toBe("fi");
    expect(fullCaseFold("\u03c2")).toBe("\u03c3"); // final sigma
  });

  it("does not merge Turkish dotless \u0131 with Latin i (default, non-Turkic profile)", () => {
    expect(fullCaseFold("\u0131")).toBe("\u0131");
    expect(fullCaseFold("i")).toBe("i");
  });

  it("is idempotent on the tricky multi-character cases", () => {
    for (const input of ["ẞ", "ß", "ﬁ", "ǅ", "ŉ", "\u03a3"]) {
      const once = fullCaseFold(input);
      expect(fullCaseFold(once)).toBe(once);
    }
  });
});

describe("mapSeparators", () => {
  it("maps typographic dashes to ASCII hyphen-minus", () => {
    expect(mapSeparators("Kowalska\u2013Nowak")).toBe("Kowalska-Nowak"); // en dash
    expect(mapSeparators("Kowalska\u2014Nowak")).toBe("Kowalska-Nowak"); // em dash
    expect(mapSeparators("Kowalska\u2010Nowak")).toBe("Kowalska-Nowak"); // hyphen
  });

  it("maps typographic apostrophes to ASCII apostrophe and never deletes them", () => {
    expect(mapSeparators("O\u2019Brien")).toBe("O'Brien");
    expect(mapSeparators("O\u02bcBrien")).toBe("O'Brien");
    expect(mapSeparators("O'Brien")).not.toBe("OBrien");
  });

  it("leaves ordinary letters alone", () => {
    expect(mapSeparators("Łuczak")).toBe("Łuczak");
  });
});

describe("collapseWhitespace", () => {
  it("trims and collapses runs of ordinary spaces", () => {
    expect(collapseWhitespace("  van   der  X  ")).toBe("van der X");
  });

  it("treats Unicode space separators (NBSP, thin space) as ordinary spaces", () => {
    expect(collapseWhitespace("van\u00a0der\u2009X")).toBe("van der X");
  });

  it("does not treat tab as whitespace - it is a control character validation rejects", () => {
    expect(collapseWhitespace("van\tder")).toBe("van\tder");
  });

  it("preserves token order", () => {
    expect(collapseWhitespace("de la Cruz")).toBe("de la Cruz");
  });
});

describe("canonicalKey (canonical_key_v1)", () => {
  it("item 1: NFC-equivalent inputs produce the same key", () => {
    expect(canonicalKey(GORSKI_PRECOMPOSED)).toBe(canonicalKey(GORSKI_DECOMPOSED));
    expect(canonicalKey(GORSKI_DECOMPOSED)).toBe("górski");
  });

  it("item 2: case and ordinary-whitespace variants produce the same key", () => {
    expect(canonicalKey("Kowalski")).toBe("kowalski");
    expect(canonicalKey("KOWALSKI")).toBe("kowalski");
    expect(canonicalKey("  kowalski  ")).toBe("kowalski");
    expect(canonicalKey("  ŁUCZAK  ")).toBe(canonicalKey("Łuczak"));
  });

  it("item 3: Polish diacritics are preserved - ŁUCZAK becomes łuczak, never luczak", () => {
    expect(canonicalKey("ŁUCZAK")).toBe("łuczak");
    expect(canonicalKey("Łuczak")).not.toBe(canonicalKey("Luczak"));
    expect(canonicalKey("Górski")).not.toBe(canonicalKey("Gorski"));
    expect(canonicalKey("Żak")).not.toBe(canonicalKey("Zak"));
  });

  it("item 5: hyphens and apostrophes are canonicalised, not stripped", () => {
    expect(canonicalKey("Kowalska-Nowak")).toBe("kowalska-nowak");
    expect(canonicalKey("Kowalska\u2013Nowak")).toBe("kowalska-nowak");
    expect(canonicalKey("O\u2019Brien")).toBe("o'brien");
    expect(canonicalKey("O'Brien")).not.toBe(canonicalKey("OBrien"));
  });

  it("does not resolve a compound surname to one of its components (§7.5)", () => {
    expect(canonicalKey("Kowalska-Nowak")).not.toBe(canonicalKey("Kowalska"));
    expect(canonicalKey("Kowalska-Nowak")).not.toBe(canonicalKey("Nowak"));
  });

  it("keeps gender pairs distinct - no suffix rule runs (§7.5)", () => {
    expect(canonicalKey("Kowalski")).not.toBe(canonicalKey("Kowalska"));
    expect(canonicalKey("Cichowski")).not.toBe(canonicalKey("Cichowska"));
  });

  it("keeps particles and token order (§9.1, §9.3)", () => {
    expect(canonicalKey("van der Berg")).toBe("van der berg");
    expect(canonicalKey("Berg van der")).not.toBe(canonicalKey("van der Berg"));
  });

  it("is idempotent on representative inputs", () => {
    for (const input of [
      "  ŁUCZAK  ",
      GORSKI_DECOMPOSED,
      "O\u2019Brien",
      "ẞtraße",
      "van\u00a0der X",
    ]) {
      const once = canonicalKey(input);
      expect(canonicalKey(once)).toBe(once);
    }
  });

  it("output is always NFC", () => {
    const key = canonicalKey("Go\u0301rski");
    expect(key.normalize("NFC")).toBe(key);
  });
});

describe("polishDiacriticFold (retrieval only - never identity)", () => {
  it("applies the nine-letter §6.1 table exactly", () => {
    expect(polishDiacriticFold("ąćęłńóśźż")).toBe("acelnoszz");
    expect(polishDiacriticFold("ĄĆĘŁŃÓŚŹŻ")).toBe("acelnoszz"); // uppercase after case fold
  });

  it("gives Łuczak and Luczak the same *search* key while their canonical keys differ", () => {
    expect(polishDiacriticFold("Łuczak")).toBe(polishDiacriticFold("Luczak"));
    expect(canonicalKey("Łuczak")).not.toBe(canonicalKey("Luczak"));
  });

  it("does not touch non-Polish diacritics - it is not a generic accent stripper", () => {
    expect(polishDiacriticFold("Müller")).toBe("müller");
    expect(polishDiacriticFold("Dvořák")).toBe("dvořák");
  });
});

describe("runtime pin", () => {
  it("reports the Unicode data the runtime carries (diagnostic, not identity)", () => {
    const runtime = unicodeRuntime();
    expect(runtime.node).toBe(process.versions.node);
    // Full-ICU is required for \p{Script_Extensions=…} and full case data.
    expect(runtime.icu).toBeDefined();
    expect(runtime.unicode).toBeDefined();
  });
});
