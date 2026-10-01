import { describe, expect, it } from "vitest";
import { otherGrammaticalForm } from "./neighbours.js";

/** ADR-0025 §2.5: the fixed rule, and nothing beyond it. */
describe("the other grammatical form", () => {
  it("pairs -ski, -cki and -dzki with -ska, -cka and -dzka, both ways", () => {
    expect(otherGrammaticalForm("KOWALSKI")).toEqual({ form: "KOWALSKA", list: "female" });
    expect(otherGrammaticalForm("KOWALSKA")).toEqual({ form: "KOWALSKI", list: "male" });
    expect(otherGrammaticalForm("WIŚNIEWSKI")).toEqual({ form: "WIŚNIEWSKA", list: "female" });
    expect(otherGrammaticalForm("ZIELIŃSKA")).toEqual({ form: "ZIELIŃSKI", list: "male" });
    expect(otherGrammaticalForm("NOWICKI")).toEqual({ form: "NOWICKA", list: "female" });
    expect(otherGrammaticalForm("ZAWADZKA")).toEqual({ form: "ZAWADZKI", list: "male" });
  });

  it("reads -dzki as -dzki, not as -zki or -ki", () => {
    expect(otherGrammaticalForm("ZAWADZKI")?.form).toBe("ZAWADZKA");
  });

  it("pairs no other ending", () => {
    for (const name of ["NOWAK", "WÓJCIK", "MAZUR", "NOWOTNY", "BIAŁY", "ZAREMBA", "SKI", "SKA"]) {
      expect(otherGrammaticalForm(name)).toBeNull();
    }
  });

  it("works on the display form's case", () => {
    expect(otherGrammaticalForm("Kowalski")).toEqual({ form: "KOWALSKA", list: "female" });
  });
});
