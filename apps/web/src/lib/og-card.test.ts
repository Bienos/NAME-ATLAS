import { describe, expect, it } from "vitest";
import { graphemeCount, surnameSize } from "./og-card.js";

/** The share card's surname sizing (Visual System v1 §6.3). */
describe("graphemeCount", () => {
  it("counts a Polish letter once, precomposed or combining", () => {
    expect(graphemeCount("ŁUCZAK")).toBe(6);
    expect(graphemeCount("ĹUCZAK")).toBe(6);
  });
});

describe("surnameSize", () => {
  it("keeps a short surname at full size", () => {
    expect(surnameSize("Nowak")).toBe(144);
    expect(surnameSize("NOWAK")).toBe(144);
  });

  it("steps down as the surname gets longer", () => {
    const sizes = ["NOWAK", "WIŚNIEWSKA", "KOWALCZYK-ŁUCZAK", "BRZĘCZYSZCZYKIEWICZOWA"].map(
      surnameSize,
    );
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]!);
  });

  it("sets upper case smaller than the same name in mixed case", () => {
    expect(surnameSize("KOWALCZYK-ŁUCZAK")).toBeLessThan(surnameSize("Kowalczyk-Łuczak"));
  });

  it("never goes below 56px, however long the name", () => {
    expect(surnameSize("X".repeat(80))).toBe(56);
  });
});
