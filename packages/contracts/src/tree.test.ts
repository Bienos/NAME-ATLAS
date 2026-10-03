import { describe, expect, it } from "vitest";
import { TREE_SCHEMA_VERSION, treePersonSchema, treeResponseSchema } from "./tree.js";

const person = {
  id: "0199a1b2-0000-7000-8000-000000000001",
  given_names: "Halina",
  surname: "Zielińska",
  birth_surname: "Kaczmarek",
  birth: { year: 1937, approx: false, place_code: "0960432", place_text: "Szczebrzeszyn" },
  death: { year: 2015, approx: false, place_code: null, place_text: null },
  living_status: "DECEASED",
  treated_as_living: false,
  provenance: "ENTERED",
  source_note: null,
  notes: null,
  updated_at: "2026-10-01T12:00:00.000Z",
};

describe("tree contract", () => {
  it("accepts a complete response", () => {
    const result = treeResponseSchema.safeParse({
      schema_version: TREE_SCHEMA_VERSION,
      tree: {
        id: "0199a1b2-0000-7000-8000-000000000010",
        title: "Rodzina Zielińskich",
        root_person_id: null,
        role: "OWNER",
        created_at: "2026-10-01T12:00:00.000Z",
        updated_at: "2026-10-01T12:00:00.000Z",
      },
      persons: [person],
      parentage: [],
      members: [],
      hidden_living_count: 0,
      places: [{ code: "0960432", name: "Szczebrzeszyn", lat: 50.7, lon: 22.97 }],
    });
    expect(result.success).toBe(true);
  });

  it("holds the living rule: a death year means DECEASED, and treated_as_living follows the status", () => {
    expect(treePersonSchema.safeParse({ ...person, living_status: "LIVING" }).success).toBe(false);
    expect(treePersonSchema.safeParse({ ...person, treated_as_living: true }).success).toBe(false);
    const unknown = {
      ...person,
      death: { year: null, approx: false, place_code: null, place_text: null },
      living_status: "UNKNOWN",
      treated_as_living: true,
    };
    expect(treePersonSchema.safeParse(unknown).success).toBe(true);
    expect(treePersonSchema.safeParse({ ...unknown, treated_as_living: false }).success).toBe(
      false,
    );
  });

  it("knows one provenance and a seven-digit place code", () => {
    expect(treePersonSchema.safeParse({ ...person, provenance: "SOURCE" }).success).toBe(false);
    expect(
      treePersonSchema.safeParse({ ...person, birth: { ...person.birth, place_code: "123" } })
        .success,
    ).toBe(false);
  });
});
