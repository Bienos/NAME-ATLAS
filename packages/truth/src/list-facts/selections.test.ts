import { describe, expect, it } from "vitest";
import { NAMED_SURNAME_FLOOR } from "@name-atlas/contracts";
import { ListFactsInputError } from "./histogram.js";
import { buildListRows } from "./rows.js";
import { assertSelectionOrder, listNamedTop, selectFirst } from "./selections.js";
import { LIST_NAMED_TOP_METHOD_VERSION } from "../version.js";

/** ADR-0018's `TOP_3` and the floor, on synthetic lists worked out by hand. */

const rows = (list: Record<string, number>) =>
  buildListRows(Object.entries(list).map(([surname, count]) => ({ surname, count })));

describe("listNamedTop", () => {
  it("names the three most common surnames, a tie broken by key in code-point order", () => {
    expect(listNamedTop(rows({ ZED: 30, NOWAK: 50, BAK: 30, ABC: 30, KOT: 2 }))).toEqual({
      method_version: LIST_NAMED_TOP_METHOD_VERSION,
      items: [
        { key: "nowak", published: "NOWAK", count: 50 },
        { key: "abc", published: "ABC", count: 30 },
        { key: "bak", published: "BAK", count: 30 },
      ],
    });
  });

  it("names none below the floor of 20 people, and one exactly at it", () => {
    expect(NAMED_SURNAME_FLOOR).toBe(20);
    expect(listNamedTop(rows({ NOWAK: 50, KOT: 20, KAT: 19 })).items).toEqual([
      { key: "nowak", published: "NOWAK", count: 50 },
      { key: "kot", published: "KOT", count: 20 },
    ]);
    expect(listNamedTop(rows({ KAT: 19, KOT: 2 })).items).toEqual([]);
  });
});

describe("selectFirst", () => {
  it("does not move past a selection below the floor to one further down", () => {
    const list = rows({ NOWAK: 50, "A-B": 19, "C-D": 3 });
    expect(selectFirst(list, (row) => row.key.includes("-"))).toBeNull();
    expect(selectFirst(list, (row) => row.key === "none")).toBeNull();
  });
});

describe("assertSelectionOrder", () => {
  it("refuses rows out of selection order", () => {
    const list = rows({ NOWAK: 50, KOT: 20 });
    expect(() => assertSelectionOrder(list)).not.toThrow();
    expect(() => assertSelectionOrder([...list].reverse())).toThrow(ListFactsInputError);
  });
});
