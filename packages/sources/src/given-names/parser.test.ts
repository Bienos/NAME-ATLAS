import { describe, expect, it } from "vitest";
import { PeselSchemaError } from "../errors.js";
import { parseGivenNameFile } from "./parser.js";
import { GIVEN_NAMES_FIRST_HEADER, needsFormReview } from "./registry.js";

const MALE = { sex_value: "MĘŻCZYZNA" } as const;
const file = (...rows: string[]) => [GIVEN_NAMES_FIRST_HEADER, ...rows].join("\r\n") + "\r\n";

function reason(text: string): string {
  try {
    parseGivenNameFile(text, MALE);
  } catch (e) {
    if (e instanceof PeselSchemaError) return e.reasonCode;
    throw e;
  }
  return "parsed";
}

describe("parseGivenNameFile (TASK-075)", () => {
  it("reads the name verbatim, the count, and the line", () => {
    expect(parseGivenNameFile(file("PIOTR,MĘŻCZYZNA,682516", "ALİ,MĘŻCZYZNA,459"), MALE)).toEqual([
      { name: "PIOTR", count: 682516, line: 2 },
      { name: "ALİ", count: 459, line: 3 },
    ]);
  });

  it("fails closed on a changed header, a wrong sex, a bad count or a bare LF", () => {
    expect(reason("IMIĘ,PŁEĆ,LICZBA\r\nPIOTR,MĘŻCZYZNA,5\r\n")).toBe("unexpected_header");
    expect(reason(file("ANNA,KOBIETA,5"))).toBe("unexpected_sex");
    expect(reason(file("PIOTR,MĘŻCZYZNA,1"))).toBe("count_below_suppression_threshold");
    expect(reason(file("PIOTR,MĘŻCZYZNA,5,6"))).toBe("wrong_column_count");
    expect(reason(file("PIOTR,MĘŻCZYZNA,x"))).toBe("non_numeric_count");
    expect(reason(file(",MĘŻCZYZNA,5"))).toBe("empty_name");
    expect(reason(`${GIVEN_NAMES_FIRST_HEADER}\nPIOTR,MĘŻCZYZNA,5\n`)).toBe("bad_line_ending");
  });
});

describe("needsFormReview (ADR-0030 §4)", () => {
  it("flags one character and a full stop, and nothing else", () => {
    expect(["I", "E", "MD.", "MA. CRISTINA", "ROMEO JR."].map(needsFormReview)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(["JAN", "JUAN CARLOS", "ALİ", "THỊ", "NICOLO'"].map(needsFormReview)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
