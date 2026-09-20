import { describe, expect, it } from "vitest";
import {
  canonicalKey,
  collapseWhitespace,
  fullCaseFold,
  mapSeparators,
  simpleCaseFold,
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

describe("simpleCaseFold (the canonical_key_v2 identity fold)", () => {
  it("folds the full Polish alphabet to lowercase, diacritics intact", () => {
    expect(simpleCaseFold("ĄĆĘŁŃÓŚŹŻ")).toBe("ąćęłńóśźż");
    expect(simpleCaseFold("ąćęłńóśźż")).toBe("ąćęłńóśźż");
  });

  it("never expands one letter into several - this is the whole point of v2 (D-013)", () => {
    expect(simpleCaseFold("ẞ")).toBe("ß"); // capital sharp s, NOT "ss"
    expect(simpleCaseFold("ß")).toBe("ß");
    expect(simpleCaseFold("ﬁ")).toBe("ﬁ"); // ligature, NOT "fi"
  });

  it("leaves dotless \u0131 alone without needing an exception table", () => {
    expect(simpleCaseFold("\u0131")).toBe("\u0131");
    expect(simpleCaseFold("i")).toBe("i");
  });

  it("is context-free: sigma does not become final sigma at the end of a word", () => {
    // "ΟΔΥΣΣΕΥΣ".toLowerCase() on the whole string ends in final sigma; per
    // code point it cannot, which is why the fold is applied per code point.
    expect(simpleCaseFold("\u03a3")).toBe("\u03c3");
    expect(simpleCaseFold("ΟΔΥΣΣΕΥΣ").endsWith("\u03c3")).toBe(true);
  });

  it("is idempotent on the cases that tripped full folding", () => {
    for (const input of ["ẞ", "ß", "ﬁ", "ǅ", "ŉ", "\u03a3", "\u0130"]) {
      const once = simpleCaseFold(input);
      expect(simpleCaseFold(once)).toBe(once);
    }
  });
});

describe("D-013 regression: sharp-s surnames keep separate identities", () => {
  // Every pair below is two distinct surnames in the PESEL register with
  // distinct counts. Under canonical_key_v1's full folding both members of
  // each pair produced one key, which made the full resource uningestible.
  // Spellings only - no count, no claim. See ADR-0005.
  const PAIRS: readonly (readonly [string, string])[] = [
    ["WEIẞ", "WEISS"],
    ["GROẞ", "GROSS"],
    ["GAUẞ", "GAUSS"],
    ["FUẞ", "FUSS"],
    ["BERGSTRÄẞER", "BERGSTRÄSSER"],
  ];

  it.each(PAIRS)("%s and %s do not share a canonical key", (sharp, doubled) => {
    expect(canonicalKey(sharp)).not.toBe(canonicalKey(doubled));
  });

  it("the sharp-s key keeps the sharp s rather than expanding it", () => {
    expect(canonicalKey("WEIẞ")).toBe("weiß");
    expect(canonicalKey("WEISS")).toBe("weiss");
  });

  it("uppercase and lowercase of the same sharp-s surname still agree", () => {
    // Separating ẞ from SS must not also separate a surname from itself.
    expect(canonicalKey("WEIẞ")).toBe(canonicalKey("Weiß"));
    expect(canonicalKey("GROẞ")).toBe(canonicalKey("groß"));
  });

  it("canonical_key_v1 would have merged them - the defect is real, not theoretical", () => {
    for (const [sharp, doubled] of PAIRS) {
      expect(fullCaseFold(sharp)).toBe(fullCaseFold(doubled));
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

describe("canonicalKey (canonical_key_v2)", () => {
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
