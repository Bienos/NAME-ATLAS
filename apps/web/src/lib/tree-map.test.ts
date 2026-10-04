import { describe, expect, it } from "vitest";
import { anchor, arcPath, kindOf, MAP_TERCS, MAP_VIEWBOX, treeMap } from "./tree-map.js";
import { pedigree } from "./tree-pedigree.js";
import type { PlaceRegion } from "./tree-places.js";
import { ID, PEOPLE, person, tree } from "./tree-fixture.js";

/**
 * TASK-092 AC-3: who stands where on the map, what joins whom, and that
 * every voivodeship's anchor lies on the map.
 */

const LUBELSKIE = { code: "06", name: "LUBELSKIE" };
const MAZOWIECKIE = { code: "14", name: "MAZOWIECKIE" };
const PLACES: readonly PlaceRegion[] = [
  { code: "0960432", name: "Szczebrzeszyn", district: "zamojski", region: LUBELSKIE },
  { code: "0918123", name: "Warszawa", district: "Warszawa", region: MAZOWIECKIE },
  { code: "0000001", name: "Nigdzie", district: null, region: null },
];

/** The fixture's tree with birthplaces: Marta and Andrzej in Lubelskie, Ewa in Mazowieckie, Józef in a place with no voivodeship, Halina typed only. */
function placed() {
  const at = (p: typeof PEOPLE.marta, code: string | null, text: string | null) => ({
    ...p,
    birth: { ...p.birth, place_code: code, place_text: text },
  });
  const persons = [
    at(PEOPLE.marta, "0960432", "Szczebrzeszyn"),
    at(PEOPLE.andrzej, "0960432", "Szczebrzeszyn"),
    at(PEOPLE.ewa, "0918123", "Warszawa"),
    at(PEOPLE.jozef, "0000001", "Nigdzie"),
    at(PEOPLE.halina, null, "Zamość"),
    { ...person(ID.stanislaw, "Stanisław", "Wróbel", 1929, 1998), source_note: "akt urodzenia" },
    PEOPLE.antoni,
    PEOPLE.cousin,
  ];
  return tree({ persons });
}

describe("the map's layout (TASK-092, AC-3)", () => {
  it("has an anchor inside the viewBox for every voivodeship, and none for a code the geometry lacks", () => {
    const [, , w, h] = MAP_VIEWBOX.split(" ").map(Number);
    expect(MAP_TERCS).toHaveLength(16);
    for (const terc of MAP_TERCS) {
      const a = anchor(terc);
      expect(a).not.toBeNull();
      expect(a!.x).toBeGreaterThan(0);
      expect(a!.x).toBeLessThan(w ?? 0);
      expect(a!.y).toBeGreaterThan(0);
      expect(a!.y).toBeLessThan(h ?? 0);
    }
    expect(anchor("99")).toBeNull();
  });

  it("puts a person with a known birthplace in one voivodeship, counts them, and leaves the rest off the map", () => {
    const slots = pedigree(placed());
    const map = treeMap(slots, PLACES, 1);
    expect(map.people.map((p) => [p.person.given_names, p.terc])).toEqual([
      ["Marta", "06"],
      ["Andrzej", "06"],
      ["Ewa", "14"],
    ]);
    expect(map.groups.map((g) => [g.terc, g.name, g.count, g.kind, g.picked])).toEqual([
      ["06", "LUBELSKIE", 2, "living", true],
      ["14", "MAZOWIECKIE", 1, "living", false],
    ]);
    // Józef (a place with no voivodeship), Halina (typed), Stanisław and Antoni (no place): off the map.
    expect(map.offMap).toBe(4);
    const rail = map.rail.flatMap((row) => row.items);
    expect(
      rail.map((item) => [item.person.given_names, item.onMap, item.place?.name ?? null]),
    ).toEqual([
      ["Marta", true, "Szczebrzeszyn"],
      ["Andrzej", true, "Szczebrzeszyn"],
      ["Ewa", true, "Warszawa"],
      ["Józef", false, "Nigdzie"],
      ["Halina", false, null],
      ["Stanisław", false, null],
      ["Antoni", false, null],
    ]);
    expect(map.rail.map((row) => row.generation)).toEqual([0, 1, 2, 3]);
  });

  it("joins a child to a parent across voivodeships and not within one, and ranks a group's kind", () => {
    const slots = pedigree(placed());
    const map = treeMap(slots, PLACES, 3);
    // Marta (06) → Ewa (14): an arc; Marta (06) → Andrzej (06): none.
    expect(map.arcs.map((a) => [a.from, a.to])).toEqual([[1, 3]]);
    expect(map.arcs[0]?.d).toMatch(/^M[0-9.]+ [0-9.]+Q[0-9.-]+ [0-9.-]+ [0-9.]+ [0-9.]+$/u);
    expect(map.groups.find((g) => g.terc === "14")?.picked).toBe(true);
    expect(map.groups.find((g) => g.terc === "06")?.picked).toBe(false);

    const sourced = treeMap(
      slots,
      [
        ...PLACES,
        {
          code: "0855397",
          name: "Budzów",
          district: "ząbkowicki",
          region: { code: "02", name: "DOLNOŚLĄSKIE" },
        },
      ],
      1,
    );
    expect(sourced.groups.map((g) => g.terc)).toEqual(["06", "14"]);
    expect(kindOf({ ...PEOPLE.jozef, source_note: "akt" })).toBe("source");
    expect(kindOf(PEOPLE.jozef)).toBe("entered");
    expect(kindOf(PEOPLE.marta)).toBe("living");
    const up = arcPath({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(up).toBe("M0 0Q50 -28 100 0");
  });

  it("is empty for a tree whose places the register does not know", () => {
    const map = treeMap(pedigree(placed()), [], 1);
    expect(map.people).toEqual([]);
    expect(map.groups).toEqual([]);
    expect(map.arcs).toEqual([]);
    expect(map.offMap).toBe(7);
  });
});
