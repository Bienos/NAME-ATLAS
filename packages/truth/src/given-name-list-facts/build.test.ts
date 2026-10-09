import { describe, expect, it } from "vitest";
import { NAMED_GIVEN_NAME_FLOOR } from "@name-atlas/contracts";
import { BIRTH_NAME_RESOURCES, BIRTH_NAMES_FIRST_2000_2019 } from "@name-atlas/sources";
import type { BirthNameResourceDescriptor } from "@name-atlas/sources";
import {
  GivenNameListFactsRefusedError,
  alwaysTopTen,
  buildGivenNameListFactsArtefact,
  firstLetter,
  inSelectionOrder,
  listChange,
  listYear,
  numberOneRuns,
  topTen,
} from "./build.js";
import type { ListName } from "./build.js";

/**
 * `given_name_list_facts_pipeline@1` on small synthetic lists whose answers
 * are worked out by hand, and the gates on bytes that are not the registry's.
 * Every name and count here is invented.
 */

const F = NAMED_GIVEN_NAME_FLOOR;

const LIST_2024: ListName[] = [
  { published: "ANNA", count: 5 * F },
  { published: "MARIA", count: 3 * F },
  { published: "ZOFIA", count: 3 * F },
  { published: "BEATA", count: F },
  { published: "HANNAH", count: 2 },
];

describe("inSelectionOrder", () => {
  it("orders by count descending, ties by the published string in code-unit order", () => {
    expect(inSelectionOrder(LIST_2024).map((n) => n.published)).toEqual([
      "ANNA",
      "MARIA",
      "ZOFIA",
      "BEATA",
      "HANNAH",
    ]);
  });
});

describe("listYear", () => {
  it("states one list's figures: names, children, extremes, the top, the ten, the half, the letter, the ending", () => {
    const year = listYear(2024, "63899", LIST_2024);
    // Children: 500 + 300 + 300 + 100 + 2 = 1 202.
    expect(year).toMatchObject({
      birth_year: 2024,
      resource_id: "63899",
      publication_threshold: 2,
      names: 5,
      children: 1202,
      min_count: 2,
      max_count: 500,
      top: { published: "ANNA", count: 500 },
      // ANNA alone is 500 of 1 202, under half; ANNA and MARIA are 800, over.
      half_names: 2,
    });
    expect(year.top.share).toBeCloseTo(500 / 1202, 9);
    // Five names: all of them are "the ten most common".
    expect(year.top10_share).toBeCloseTo(1, 9);
    // The letter: A (ANNA 500) against M (300), Z (300), B (100), H (2).
    expect(year.top_letter).toEqual({ letter: "A", share: year.top.share });
    // Every name but HANNAH ends in -a: 1 200 of 1 202.
    expect(year.ends_a_share).toBeCloseTo(1200 / 1202, 9);
  });

  it("takes the publisher's threshold from the year", () => {
    expect(listYear(2012, "21457", LIST_2024).publication_threshold).toBe(5);
    expect(listYear(2013, "21457", LIST_2024).publication_threshold).toBe(2);
  });

  it("refuses to name a most common name below the floor", () => {
    expect(() => listYear(2024, "63899", [{ published: "ANNA", count: F - 1 }])).toThrow(
      GivenNameListFactsRefusedError,
    );
  });

  it("reads the first letter as the first code point", () => {
    expect(firstLetter("ŻANETA")).toBe("Ż");
    expect(firstLetter("ŁUCJA")).toBe("Ł");
  });
});

describe("topTen", () => {
  it("takes at most ten, in selection order, each at or above the floor", () => {
    expect(() => topTen(2024, LIST_2024)).toThrow(GivenNameListFactsRefusedError);
    const ten = topTen(2024, LIST_2024.slice(0, 4));
    expect(ten.map((n) => n.published)).toEqual(["ANNA", "MARIA", "ZOFIA", "BEATA"]);
    const many = Array.from({ length: 12 }, (_, i) => ({
      published: `N${String(i).padStart(2, "0")}`,
      count: F + 12 - i,
    }));
    expect(topTen(2024, many)).toHaveLength(10);
  });
});

describe("numberOneRuns and alwaysTopTen", () => {
  it("joins consecutive years with the same top into one run, and counts a return as a new run", () => {
    const years = [2000, 2001, 2002, 2003, 2004].map((birthYear, i) =>
      listYear(birthYear, "21457", [
        { published: i < 2 || i === 4 ? "JULIA" : "LENA", count: 9 * F },
        { published: "MAJA", count: F },
      ]),
    );
    expect(numberOneRuns(years)).toEqual([
      { published: "JULIA", from_year: 2000, to_year: 2001, years: 2 },
      { published: "LENA", from_year: 2002, to_year: 2003, years: 2 },
      { published: "JULIA", from_year: 2004, to_year: 2004, years: 1 },
    ]);
  });

  it("keeps only the names in every year's ten most common, sorted", () => {
    const a = [
      { published: "ZOFIA", count: 3 * F },
      { published: "ANNA", count: 2 * F },
    ];
    const b = [
      { published: "ANNA", count: 3 * F },
      { published: "ZOFIA", count: 2 * F },
    ];
    const c = [
      { published: "ZOFIA", count: 3 * F },
      { published: "MAJA", count: 2 * F },
    ];
    expect(alwaysTopTen([a, b])).toEqual(["ANNA", "ZOFIA"]);
    expect(alwaysTopTen([a, b, c])).toEqual(["ZOFIA"]);
  });
});

describe("listChange", () => {
  it("compares the two lists' sets of names by exact spelling, adding nothing", () => {
    const first = [
      { published: "ANNA", count: 9 },
      { published: "BEATA", count: 5 },
    ];
    const last = [
      { published: "ANNA", count: 2 },
      { published: "ZOFIA", count: 2 },
    ];
    expect(listChange(2000, first, 2025, last)).toEqual({
      first_year: 2000,
      last_year: 2025,
      on_last_not_first: 1,
      on_first_not_last: 1,
      on_both: 1,
    });
  });
});

describe("buildGivenNameListFactsArtefact", () => {
  it("refuses bytes that are not the registry's pinned resource, as an excerpt looks", () => {
    const excerpt = new TextEncoder().encode(
      "Rok,Imię,Liczba,Płeć\r\n2000,JAKUB,14497,M\r\n2000,JULIA,10074,K\r\n",
    );
    expect(() =>
      buildGivenNameListFactsArtefact([
        { descriptor: BIRTH_NAMES_FIRST_2000_2019, bytes: excerpt },
      ]),
    ).toThrow(GivenNameListFactsRefusedError);
    try {
      buildGivenNameListFactsArtefact([
        { descriptor: BIRTH_NAMES_FIRST_2000_2019, bytes: excerpt },
      ]);
    } catch (cause: unknown) {
      expect((cause as GivenNameListFactsRefusedError).reason).toBe("BYTES_NOT_OFFICIAL");
    }
  });

  it("refuses the 2020 files alone: one year is no sequence, and the registry's bytes are not these", () => {
    const bytes = new TextEncoder().encode("IMIĘ_PIERWSZE,PŁEĆ,LICZBA_WYSTĄPIEŃ\r\n");
    const of = (id: string): BirthNameResourceDescriptor => {
      const descriptor = BIRTH_NAME_RESOURCES.find((r) => r.resource_id === id);
      if (descriptor === undefined) throw new Error(`no resource ${id} in the registry`);
      return descriptor;
    };
    expect(() =>
      buildGivenNameListFactsArtefact([
        { descriptor: of("28020"), bytes },
        { descriptor: of("28021"), bytes },
      ]),
    ).toThrow(GivenNameListFactsRefusedError);
  });
});
