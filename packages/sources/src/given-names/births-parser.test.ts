import { describe, expect, it } from "vitest";
import { PeselSchemaError } from "../errors.js";
import { parseBirthNameFile } from "./births-parser.js";
import {
  BIRTH_NAME_RESOURCES,
  BIRTH_NAMES_FIRST_2000_2019,
  BIRTH_NAMES_FIRST_MALE_2022,
  BIRTH_NAMES_FIRST_MALE_2025,
  BIRTH_NAMES_ONE_YEAR_HEADER,
  BIRTH_NAMES_ONE_YEAR_HEADER_2022,
  BIRTH_NAMES_YEARS_HEADER,
  birthListPublicationThreshold,
} from "./births-registry.js";
import type { BirthNameResourceDescriptor } from "./births-registry.js";

const crlf = (...lines: string[]) => lines.join("\r\n") + "\r\n";

/** A two-year, two-sex resource, so the shape checks can be shown on a few lines. */
const YEARS: BirthNameResourceDescriptor = {
  ...BIRTH_NAMES_FIRST_2000_2019,
  years: [2012, 2013],
};
const years = (...rows: string[]) =>
  crlf(
    BIRTH_NAMES_YEARS_HEADER,
    "2012,JAKUB,11989,M",
    "2012,JULIA,14287,K",
    "2013,JAKUB,10870,M",
    "2013,JULIA,11440,K",
    ...rows,
  );

function reason(text: string, resource: BirthNameResourceDescriptor): string {
  try {
    parseBirthNameFile(text, resource);
  } catch (e) {
    if (e instanceof PeselSchemaError) return e.reasonCode;
    throw e;
  }
  return "parsed";
}

describe("birthListPublicationThreshold (dataset 219's note)", () => {
  it("is 5 to 2012 and 2 from 2013", () => {
    expect([2000, 2012, 2013, 2025].map(birthListPublicationThreshold)).toEqual([5, 5, 2, 2]);
  });
});

describe("parseBirthNameFile (TASK-132)", () => {
  it("splits the 2000–2019 layout into one list per year and sex, with the year's cut-off", () => {
    const lists = parseBirthNameFile(years("2012,ABDUL,5,M", "2013,ABDUL,3,M"), YEARS);
    expect(
      lists.map((l) => [l.birthYear, l.sex, l.publicationThreshold, l.rows.map((r) => r.name)]),
    ).toEqual([
      [2012, "MALE", 5, ["JAKUB", "ABDUL"]],
      [2012, "FEMALE", 5, ["JULIA"]],
      [2013, "MALE", 2, ["JAKUB", "ABDUL"]],
      [2013, "FEMALE", 2, ["JULIA"]],
    ]);
    expect(lists[0]?.rows[1]).toEqual({ name: "ABDUL", count: 5, line: 6 });
  });

  it("reads a yearly file, 2022's own header included", () => {
    const lists = parseBirthNameFile(
      crlf(BIRTH_NAMES_ONE_YEAR_HEADER_2022, "ANTONI,MĘŻCZYZNA,6670", "NIKOLA,MĘŻCZYZNA,2"),
      BIRTH_NAMES_FIRST_MALE_2022,
    );
    expect(lists).toEqual([
      {
        birthYear: 2022,
        sex: "MALE",
        publicationThreshold: 2,
        rows: [
          { name: "ANTONI", count: 6670, line: 2 },
          { name: "NIKOLA", count: 2, line: 3 },
        ],
      },
    ]);
  });

  it("fails closed on any change of shape", () => {
    expect(reason(years("2012,ADAM,4,M"), YEARS)).toBe("count_below_publication_threshold");
    expect(reason(years("2013,ADAM,1,M"), YEARS)).toBe("count_below_publication_threshold");
    expect(reason(years("2014,ADAM,9,M"), YEARS)).toBe("unexpected_year");
    expect(reason(years("13,ADAM,9,M"), YEARS)).toBe("non_numeric_year");
    expect(reason(years("2013,ADAM,9,X"), YEARS)).toBe("unexpected_sex");
    expect(reason(years("2013,ADAM,9"), YEARS)).toBe("wrong_column_count");
    expect(reason(years("2013,,9,M"), YEARS)).toBe("empty_name");
    expect(reason(years("2013,ADAM,9 ,M"), YEARS)).toBe("non_numeric_count");
    expect(
      reason(crlf(BIRTH_NAMES_YEARS_HEADER, "2012,JAKUB,11989,M", "2012,JULIA,14287,K"), YEARS),
    ).toBe("missing_list");
    expect(reason(crlf("Rok,Imie,Liczba,Plec", "2012,JAKUB,11989,M"), YEARS)).toBe(
      "unexpected_header",
    );
    expect(reason(years().replaceAll("\r\n", "\n"), YEARS)).toBe("bad_line_ending");

    const one = BIRTH_NAMES_FIRST_MALE_2025;
    expect(reason(crlf(BIRTH_NAMES_ONE_YEAR_HEADER, "ZOFIA,KOBIETA,4415"), one)).toBe(
      "unexpected_sex",
    );
    expect(reason(crlf(BIRTH_NAMES_ONE_YEAR_HEADER_2022, "NIKODEM,MĘŻCZYZNA,5772"), one)).toBe(
      "unexpected_header",
    );
    expect(reason(crlf(BIRTH_NAMES_ONE_YEAR_HEADER), one)).toBe("missing_list");
  });
});

describe("BIRTH_NAME_RESOURCES (ADR-0042 §3)", () => {
  it("holds every year from 2000 to 2025 for each sex exactly once", () => {
    const lists = BIRTH_NAME_RESOURCES.flatMap((r) =>
      r.years.flatMap((y) => r.sexes.map((s) => `${y}:${s}`)),
    );
    expect(new Set(lists).size).toBe(lists.length);
    expect(lists).toHaveLength(52);
    for (let y = 2000; y <= 2025; y += 1) {
      expect(lists).toContain(`${y}:MALE`);
      expect(lists).toContain(`${y}:FEMALE`);
    }
  });

  it("gives a yearly file one year and one sex", () => {
    for (const r of BIRTH_NAME_RESOURCES) {
      if (r.layout === "ONE_YEAR") {
        expect([r.years.length, r.sexes.length]).toEqual([1, 1]);
        expect(r.sex_value).toBe(r.sexes[0] === "MALE" ? "MĘŻCZYZNA" : "KOBIETA");
      }
    }
  });
});
