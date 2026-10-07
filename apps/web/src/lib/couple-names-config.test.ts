import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "../middleware.js";
import {
  checkReading,
  COUPLE_NAMES_BANNED,
  coupleNamesEnabled,
  coupleNamesPath,
  countWords,
  isCoupleNamesPath,
  readingStatusOf,
} from "./couple-names-config.js";
import { COUPLE_NAMES_TEXT } from "./couple-names-text.js";
import { GIVEN_NAME_MEANING_TEXT } from "./given-name-meaning-view.js";

/** TASK-156: the flag, the addresses, the check every reading must pass, and the page's own words under it. */

const WORDS = (n: number) =>
  Array.from({ length: n }, (_, i) => `słowo${"x".repeat(i % 3)}`).join(" ");

describe("the couple first-names page's gate (TASK-156 AC-1)", () => {
  it("is on only when the variable is exactly 1", () => {
    expect(coupleNamesEnabled({ COUPLE_NAMES_ENABLED: "1" })).toBe(true);
    for (const value of [undefined, "", "0", "true", " 1", "1 "]) {
      expect(coupleNamesEnabled({ COUPLE_NAMES_ENABLED: value }), String(value)).toBe(false);
    }
  });

  it("names its two addresses and nothing near them", () => {
    expect(isCoupleNamesPath("/pl/imiona-pary")).toBe(true);
    expect(isCoupleNamesPath("/en/couple-names")).toBe(true);
    expect(isCoupleNamesPath("/pl/imiona-pary/")).toBe(false);
    expect(isCoupleNamesPath("/api/couple-names")).toBe(false);
    expect(isCoupleNamesPath("/pl/para")).toBe(false);
  });

  it("writes the page's address with both names and the route's status word", () => {
    expect(coupleNamesPath("pl", "MAŁGORZATA", "BARTŁOMIEJ")).toBe(
      "/pl/imiona-pary?a=MA%C5%81GORZATA&b=BART%C5%81OMIEJ",
    );
    expect(coupleNamesPath("en", "Anna", "Jan", "limit")).toBe(
      "/en/couple-names?a=Anna&b=Jan&reading=limit",
    );
    expect(readingStatusOf("failed")).toBe("failed");
    expect(readingStatusOf("stored")).toBeNull();
    expect(readingStatusOf(undefined)).toBeNull();
  });

  it("is sent private, no-store by the middleware, on or off (AC-7)", () => {
    for (const path of ["/pl/imiona-pary?a=Anna&b=Jan", "/en/couple-names"]) {
      const response = middleware(new NextRequest(`https://name-atlas.pl${path}`));
      expect(response.headers.get("cache-control"), path).toBe("private, no-store");
    }
  });
});

describe("checkReading (TASK-156 AC-4, AC-7)", () => {
  it("passes a plain text of the asked length", () => {
    expect(checkReading(WORDS(150))).toEqual({ ok: true });
    expect(countWords("  jedno dwa   trzy ")).toBe(3);
    expect(countWords("")).toBe(0);
  });

  it("refuses a digit, wherever it is", () => {
    expect(checkReading(`${WORDS(100)} w roku 1884 ${WORDS(20)}`)).toMatchObject({
      ok: false,
      reason: "DIGIT",
      detail: "1",
    });
  });

  it("refuses every banned word, in either language, in any case", () => {
    const samples = [
      "Wasze imiona do siebie pasują",
      "Pasujecie do siebie",
      "to dopasowanie jest widoczne",
      "zgodność imion",
      "jesteście zgodni",
      "idealna para",
      "Stworzeni dla siebie",
      "stworzone dla siebie",
      "dziewięćdziesiąt procent",
      "a 90% chance",
      "a perfect match",
      "these names are compatible",
      "made for each other",
      "you belong together",
      "they suit each other",
      "a high score",
      "ninety percent",
      "♥",
    ];
    for (const sample of samples) {
      const check = checkReading(`${WORDS(60)} ${sample} ${WORDS(60)}`);
      expect(check.ok, sample).toBe(false);
      if (!check.ok)
        expect(check.reason, sample).toBe(check.reason === "DIGIT" ? "DIGIT" : "BANNED");
    }
  });

  it("keeps 'zgodnie z', which judges nothing", () => {
    expect(checkReading(`${WORDS(60)} zgodnie z Yonge'em ${WORDS(60)}`)).toEqual({ ok: true });
  });

  it("refuses a text too short or too long for what was asked", () => {
    expect(checkReading(WORDS(79))).toMatchObject({ ok: false, reason: "SHORT" });
    expect(checkReading(WORDS(261))).toMatchObject({ ok: false, reason: "LONG" });
    expect(checkReading("")).toMatchObject({ ok: false, reason: "SHORT" });
  });
});

describe("the page's own words (TASK-100 §3.4, TASK-156 AC-7)", () => {
  const texts = (lang: "pl" | "en"): string[] => {
    const t = COUPLE_NAMES_TEXT[lang];
    const m = GIVEN_NAME_MEANING_TEXT[lang];
    return [
      ...Object.values(t).map((v) =>
        typeof v === "function"
          ? [
              (v as (...a: string[]) => string)("ANNA", "JAN"),
              (v as (...a: string[]) => string)("ANNA", "ORIGIN_ONLY"),
              (v as (...a: string[]) => string)("ANNA", "NO_SOURCE"),
              (v as (...a: string[]) => string)("ANNA", "RIGHTS_BLOCKED"),
            ].join(" ")
          : String(v),
      ),
      ...Object.values(m).map((v) => (typeof v === "function" ? v("x") : String(v))),
    ];
  };
  it("hold none of the banned patterns, in either language", () => {
    for (const lang of ["pl", "en"] as const) {
      for (const text of texts(lang)) {
        const lower = text.toLowerCase();
        for (const pattern of COUPLE_NAMES_BANNED) {
          expect(lower, `${lang}: ${text}`).not.toMatch(pattern);
        }
      }
    }
  });

  it("cover both languages with the same keys", () => {
    expect(Object.keys(COUPLE_NAMES_TEXT.pl).sort()).toEqual(
      Object.keys(COUPLE_NAMES_TEXT.en).sort(),
    );
  });
});
