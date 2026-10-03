import { describe, expect, it } from "vitest";
import { checkPerson, parentCount, treatedAsLiving, wouldCycle } from "./rules.js";

describe("treatedAsLiving", () => {
  it("protects UNKNOWN as living and frees only DECEASED", () => {
    expect(treatedAsLiving("UNKNOWN")).toBe(true);
    expect(treatedAsLiving("LIVING")).toBe(true);
    expect(treatedAsLiving("DECEASED")).toBe(false);
  });
});

describe("checkPerson", () => {
  it("trims, keeps nulls, and leaves an unknown status unknown", () => {
    const result = checkPerson({ givenNames: "  Halina ", surname: "Zielińska", birthYear: 1937 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields.given_names).toBe("Halina");
    expect(result.fields.living_status).toBe("UNKNOWN");
    expect(result.fields.death_year).toBeNull();
    expect(result.fields.birth_place_code).toBeNull();
  });

  it("makes a death year DECEASED whatever status was sent, and infers nothing from an old birth", () => {
    const died = checkPerson({
      givenNames: "Józef",
      surname: "Zieliński",
      deathYear: 2009,
      livingStatus: "LIVING",
    });
    expect(died.ok && died.fields.living_status).toBe("DECEASED");
    const old = checkPerson({ givenNames: "Jan", surname: "Sikora", birthYear: 1901 });
    expect(old.ok && old.fields.living_status).toBe("UNKNOWN");
  });

  it("names every problem at once", () => {
    const result = checkPerson({
      givenNames: " ",
      surname: "x".repeat(121),
      birthYear: 2010,
      deathYear: 1990,
      birthPlaceCode: "12",
      sourceNote: "s".repeat(501),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      "GIVEN_NAMES",
      "SURNAME",
      "DEATH_BEFORE_BIRTH",
      "BIRTH_PLACE_CODE",
      "SOURCE_NOTE",
    ]);
  });

  it("refuses a year outside 1000–2100 and a non-integer", () => {
    expect(checkPerson({ givenNames: "A", surname: "B", birthYear: 999 }).ok).toBe(false);
    expect(checkPerson({ givenNames: "A", surname: "B", deathYear: 1934.5 }).ok).toBe(false);
    expect(checkPerson({ givenNames: "A", surname: "B", birthYear: 2100 }).ok).toBe(true);
  });

  it("accepts a seven-digit SIMC code and refuses anything else", () => {
    expect(checkPerson({ givenNames: "A", surname: "B", birthPlaceCode: "0960432" }).ok).toBe(true);
    expect(checkPerson({ givenNames: "A", surname: "B", birthPlaceCode: "096043" }).ok).toBe(false);
    expect(checkPerson({ givenNames: "A", surname: "B", deathPlaceCode: "Zamość" }).ok).toBe(false);
  });
});

describe("wouldCycle and parentCount", () => {
  // marta ← andrzej ← józef ← franciszek
  const edges = [
    { child_id: "marta", parent_id: "andrzej" },
    { child_id: "andrzej", parent_id: "józef" },
    { child_id: "józef", parent_id: "franciszek" },
  ];

  it("refuses a person as their own parent and any ancestor as a descendant's child", () => {
    expect(wouldCycle(edges, "marta", "marta")).toBe(true);
    expect(wouldCycle(edges, "franciszek", "marta")).toBe(true);
    expect(wouldCycle(edges, "józef", "andrzej")).toBe(true);
  });

  it("allows a new ancestor and an unrelated person", () => {
    expect(wouldCycle(edges, "marta", "ewa")).toBe(false);
    expect(wouldCycle(edges, "franciszek", "antoni")).toBe(false);
    expect(wouldCycle(edges, "ewa", "stanisław")).toBe(false);
  });

  it("counts a child's parents", () => {
    expect(parentCount(edges, "marta")).toBe(1);
    expect(parentCount(edges, "franciszek")).toBe(0);
  });
});
