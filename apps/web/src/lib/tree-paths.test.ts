import { describe, expect, it } from "vitest";
import type { TreePersonRead } from "@name-atlas/family";
import {
  draftFrom,
  draftOf,
  draftQuery,
  EMPTY_DRAFT,
  hasDraft,
  isId,
  isTreeAction,
  parseYear,
  personFromDraft,
  TREE_ACTIONS,
  treeActionPath,
  treePath,
  treeTarget,
} from "./tree-paths.js";

const TREE = "0199a1b2-0000-7000-8000-00000000aa01";
const PERSON = "0199a1b2-0000-7000-8000-00000000bb01";

describe("the tree's addresses (TASK-073)", () => {
  it("names every page in both languages, under the account", () => {
    expect(treePath("pl", { page: "trees" })).toBe("/pl/konto/drzewa");
    expect(treePath("en", { page: "trees" })).toBe("/en/account/trees");
    expect(treePath("pl", { page: "consent" })).toBe("/pl/konto/drzewa/zgoda");
    expect(treePath("en", { page: "consent" })).toBe("/en/account/trees/consent");
    expect(treePath("pl", { page: "tree", treeId: TREE })).toBe(`/pl/konto/drzewa/${TREE}`);
    expect(treePath("pl", { page: "add", treeId: TREE })).toBe(`/pl/konto/drzewa/${TREE}/dodaj`);
    expect(treePath("en", { page: "add", treeId: TREE })).toBe(`/en/account/trees/${TREE}/add`);
    expect(treePath("pl", { page: "person", treeId: TREE, personId: PERSON })).toBe(
      `/pl/konto/drzewa/${TREE}/osoba/${PERSON}`,
    );
    expect(treePath("en", { page: "person", treeId: TREE, personId: PERSON })).toBe(
      `/en/account/trees/${TREE}/person/${PERSON}`,
    );
    expect(treePath("pl", { page: "trees" }, { status: "tree-deleted" })).toBe(
      "/pl/konto/drzewa?status=tree-deleted",
    );
  });

  it("reads every page back from its segments, and nothing else", () => {
    for (const lang of ["pl", "en"] as const) {
      const round = (target: Parameters<typeof treePath>[1]) =>
        treeTarget(lang, treePath(lang, target).split("/").slice(4));
      expect(round({ page: "trees" })).toEqual({ page: "trees" });
      expect(round({ page: "consent" })).toEqual({ page: "consent" });
      expect(round({ page: "tree", treeId: TREE })).toEqual({ page: "tree", treeId: TREE });
      expect(round({ page: "add", treeId: TREE })).toEqual({ page: "add", treeId: TREE });
      expect(round({ page: "person", treeId: TREE, personId: PERSON })).toEqual({
        page: "person",
        treeId: TREE,
        personId: PERSON,
      });
    }
    expect(treeTarget("pl", undefined)).toEqual({ page: "trees" });
    expect(treeTarget("pl", ["consent"])).toBeNull();
    expect(treeTarget("en", ["zgoda"])).toBeNull();
    expect(treeTarget("pl", ["not-an-id"])).toBeNull();
    expect(treeTarget("pl", [TREE, "add"])).toBeNull();
    expect(treeTarget("pl", [TREE, "osoba"])).toBeNull();
    expect(treeTarget("pl", [TREE, "osoba", "x"])).toBeNull();
    expect(treeTarget("pl", [TREE, "osoba", PERSON, "more"])).toBeNull();
    expect(treeTarget("pl", [TREE.toUpperCase()])).toEqual({ page: "tree", treeId: TREE });
  });

  it("knows an id and an action", () => {
    expect(isId(TREE)).toBe(true);
    expect(isId("")).toBe(false);
    expect(isId(`${TREE}/..`)).toBe(false);
    expect(isId(42)).toBe(false);
    for (const action of TREE_ACTIONS) {
      expect(isTreeAction(action)).toBe(true);
      expect(treeActionPath(action)).toBe(`/api/tree/${action}`);
    }
    expect(isTreeAction("drop-table")).toBe(false);
  });
});

describe("the one-question flow's draft (TASK-073, AC-6)", () => {
  const full = {
    given: "Halina",
    surname: "Zielińska",
    birthSurname: "Kaczmarek",
    birthYear: "1937",
    birthApprox: true,
    placeCode: "0920077",
    placeText: "Szczebrzeszyn",
    deathYear: "2015",
    deathApprox: false,
    living: "DECEASED" as const,
    sourceNote: "akt małżeństwa",
    notes: "ślub 1960",
  };

  it("survives a round trip through the query, empty fields left out", () => {
    const query = draftQuery(full);
    expect(query).toEqual({
      given: "Halina",
      surname: "Zielińska",
      born: "Kaczmarek",
      birth: "1937",
      birth_approx: "1",
      place_code: "0920077",
      place: "Szczebrzeszyn",
      death: "2015",
      living: "DECEASED",
      source: "akt małżeństwa",
      notes: "ślub 1960",
    });
    expect(draftFrom((name) => query[name] ?? null)).toEqual(full);
    expect(draftQuery(EMPTY_DRAFT)).toEqual({});
    expect(draftFrom(() => null)).toEqual(EMPTY_DRAFT);
  });

  it("takes a place chosen from the TERYT list as its code and its name", () => {
    const chosen = draftFrom((name) =>
      name === "place_code" ? "0920077 Szczebrzeszyn" : name === "place" ? "Szcze" : null,
    );
    expect(chosen.placeCode).toBe("0920077");
    expect(chosen.placeText).toBe("Szczebrzeszyn");
    const kept = draftFrom((name) =>
      name === "place_code" ? "0920077" : name === "place" ? "Szcze" : null,
    );
    expect(kept).toMatchObject({ placeCode: "0920077", placeText: "Szcze" });
    const typed = draftFrom((name) =>
      name === "place_code" ? "" : name === "place" ? "Szcze" : null,
    );
    expect(typed).toMatchObject({ placeCode: "", placeText: "Szcze" });
  });

  it("tells a kept draft from a fresh form, and reads a form's checkbox", () => {
    expect(hasDraft(() => null)).toBe(false);
    expect(hasDraft((name) => (name === "given" ? "" : null))).toBe(true);
    expect(draftFrom((name) => (name === "birth_approx" ? "on" : null)).birthApprox).toBe(true);
    expect(draftFrom((name) => (name === "living" ? "ALIVE" : null)).living).toBe("UNKNOWN");
  });

  it("becomes the service's input without guessing: a year is four digits or a problem", () => {
    expect(parseYear("")).toBeNull();
    expect(parseYear(" 1937 ")).toBe(1937);
    expect(parseYear("37")).toBeNaN();
    expect(parseYear("ok. 1937")).toBeNaN();
    const person = personFromDraft(full);
    expect(person).toEqual({
      givenNames: "Halina",
      surname: "Zielińska",
      birthSurname: "Kaczmarek",
      birthYear: 1937,
      birthYearApprox: true,
      birthPlaceCode: "0920077",
      birthPlaceText: "Szczebrzeszyn",
      deathYear: 2015,
      deathYearApprox: false,
      livingStatus: "DECEASED",
      sourceNote: "akt małżeństwa",
      notes: "ślub 1960",
    });
  });

  it("shows a person as the form that made them", () => {
    const read: TreePersonRead = {
      id: PERSON,
      given_names: "Halina",
      surname: "Zielińska",
      birth_surname: "Kaczmarek",
      birth: { year: 1937, approx: true, place_code: "0920077", place_text: "Szczebrzeszyn" },
      death: { year: 2015, approx: false, place_code: null, place_text: null },
      living_status: "DECEASED",
      treated_as_living: false,
      provenance: "ENTERED",
      source_note: "akt małżeństwa",
      notes: "ślub 1960",
      updated_at: "2026-10-03T10:00:00.000Z",
    };
    expect(draftOf(read)).toEqual(full);
  });
});
