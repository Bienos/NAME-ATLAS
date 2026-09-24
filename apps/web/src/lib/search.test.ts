import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_INPUT_CODE_POINTS } from "@name-atlas/resolver";
import {
  MAX_SURNAME_CODE_POINTS,
  NAME_PARAM,
  RESULTS_PATH,
  checkSearchInput,
  readNameParam,
  surnameHref,
} from "./search";

describe("checkSearchInput (docs/canonical/16 §9: UX checks only)", () => {
  it("allows the same maximum as the resolver", () => {
    expect(MAX_SURNAME_CODE_POINTS).toBe(DEFAULT_MAX_INPUT_CODE_POINTS);
  });

  it("flags only empty, over-long and unencodable input", () => {
    expect(checkSearchInput("")).toBe("EMPTY");
    expect(checkSearchInput("   ")).toBe("EMPTY");
    expect(checkSearchInput("x".repeat(MAX_SURNAME_CODE_POINTS + 1))).toBe("TOO_LONG");
    expect(checkSearchInput("Now\uD800ak")).toBe("UNREADABLE");
  });

  it("counts code points, not UTF-16 units, against the limit", () => {
    // 256 astral characters are 512 UTF-16 units but within the limit.
    expect(checkSearchInput("𝒜".repeat(MAX_SURNAME_CODE_POINTS))).toBe("OK");
  });

  it("accepts every ordinary surname shape without judging it", () => {
    for (const name of ["Nowak", "Łuczak", "O'Neil", "Nowak-Jeleński", "de la Cruz", "Ng", "李"]) {
      expect(checkSearchInput(name)).toBe("OK");
    }
  });
});

describe("surnameHref and readNameParam", () => {
  it("round-trips exactly what was typed — no trimming, casing or normalising", () => {
    for (const raw of ["Nowak", "  nowak ", "ŁUCZAK", "O'Neil & Co", "a/b?c#d", "50%", "DOG̈AN"]) {
      const url = new URL(surnameHref(raw), "https://example.test");
      expect(url.pathname).toBe(RESULTS_PATH);
      expect(readNameParam(url.searchParams.get(NAME_PARAM) ?? undefined)).toBe(raw);
    }
  });

  it("reads the first value when a parameter repeats, and nothing when absent", () => {
    expect(readNameParam(["Nowak", "Kowalski"])).toBe("Nowak");
    expect(readNameParam(undefined)).toBeNull();
  });
});
