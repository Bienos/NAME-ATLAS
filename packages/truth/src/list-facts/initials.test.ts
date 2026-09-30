import { describe, expect, it } from "vitest";
import { LIST_INITIAL_LETTERS } from "@name-atlas/contracts";
import { firstLetter, listInitials } from "./initials.js";
import { buildListRows } from "./rows.js";
import { LIST_INITIALS_METHOD_VERSION } from "../version.js";

/** `list_initials@1` on a synthetic list worked out by hand. */

const rows = (list: Record<string, number>) =>
  buildListRows(Object.entries(list).map(([surname, count]) => ({ surname, count })));

describe("firstLetter", () => {
  it("is the first code point with any combining marks after it", () => {
    expect(firstLetter("kowalski")).toBe("k");
    expect(firstLetter("óźdź")).toBe("ó");
    expect(firstLetter("a̋bc")).toBe("a̋");
  });
});

describe("listInitials", () => {
  const initials = listInitials(
    rows({
      KOWALSKI: 10,
      KOWAL: 5, // K: 2 surnames, 15 people
      ZABŁOCKI: 15, // Z: 15 people, tied with K
      ŁUCZAK: 4, // Ł, not L: identity is exact
      LUCZAK: 6, // L
      ÓŹDŹ: 3, // Ó: 3 people
      ĆMA: 3, // Ć: 3 people, tied with Ó
      QUINN: 2, // Q
      XU: 2, // X
      A̋BC: 2, // A followed by a combining mark: not A, so outside
      İNCE: 7, // the key keeps İ (simple case folding has no single-letter lower case): outside
      ÉMILE: 2, // outside
    }),
  );
  const figures = Object.fromEntries(initials.letters.map((l) => [l.letter, l]));

  it("holds every letter once, in the fixed order", () => {
    expect(initials.method_version).toBe(LIST_INITIALS_METHOD_VERSION);
    expect(initials.letters.map((l) => l.letter)).toEqual([...LIST_INITIAL_LETTERS]);
  });

  it("counts the surnames and people under each letter present", () => {
    expect(figures.K).toEqual({ letter: "K", surnames: 2, people: 15 });
    expect(figures.Z).toEqual({ letter: "Z", surnames: 1, people: 15 });
    expect(figures.Ł).toEqual({ letter: "Ł", surnames: 1, people: 4 });
    expect(figures.L).toEqual({ letter: "L", surnames: 1, people: 6 });
    expect(figures.Ó).toEqual({ letter: "Ó", surnames: 1, people: 3 });
    expect(figures.Ć).toEqual({ letter: "Ć", surnames: 1, people: 3 });
    expect(figures.Q).toEqual({ letter: "Q", surnames: 1, people: 2 });
    expect(figures.X).toEqual({ letter: "X", surnames: 1, people: 2 });
  });

  it("states a letter no surname starts with as absent, never as zero", () => {
    expect(figures.A).toEqual({ letter: "A", absent: true });
    expect(figures.Ą).toEqual({ letter: "Ą", absent: true });
    expect(figures.I).toEqual({ letter: "I", absent: true });
    expect(initials.letters.filter((l) => "absent" in l)).toHaveLength(35 - 8);
  });

  it("counts every other first letter outside: A with a mark, İ, É", () => {
    expect(initials.outside).toEqual({ surnames: 3, people: 11 });
  });

  it("names the top letter and the rarest Polish letter, a tie going to the earlier letter", () => {
    // K and Z both have 15 people: K comes first.
    expect(initials.top).toBe("K");
    // Q and X have fewer people but are not Polish letters; Ć and Ó tie at 3: Ć comes first.
    expect(initials.rarest_polish).toBe("Ć");
  });
});
