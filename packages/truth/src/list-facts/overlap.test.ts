import { describe, expect, it } from "vitest";
import { ListFactsInputError } from "./histogram.js";
import { listOverlap } from "./overlap.js";
import { buildListRows } from "./rows.js";
import { LIST_OVERLAP_METHOD_VERSION } from "../version.js";

/** `list_overlap@1` on synthetic lists worked out by hand. */

const rows = (list: Record<string, number>) =>
  buildListRows(Object.entries(list).map(([surname, count]) => ({ surname, count })));

describe("listOverlap", () => {
  it("compares the two sets of keys exactly and selects by the ADR-0018 rules", () => {
    const male = rows({ NOWAK: 50, KOWALSKI: 40, ŁUCZAK: 25, WÓJCIK: 22, ADAMS: 21, XU: 3 });
    const female = rows({ NOWAK: 45, KOWALSKA: 44, LUCZAK: 30, WÓJCIK: 2, LEE: 20 });
    expect(listOverlap(male, female)).toEqual({
      method_version: LIST_OVERLAP_METHOD_VERSION,
      // On both: nowak, wójcik. ŁUCZAK and LUCZAK are two surnames.
      male_only: 4,
      both: 2,
      female_only: 3,
      on_both_top: {
        key: "nowak",
        male: { published: "NOWAK", count: 50 },
        female: { published: "NOWAK", count: 45 },
      },
      one_list_top: {
        male: { key: "kowalski", published: "KOWALSKI", count: 40 },
        female: { key: "kowalska", published: "KOWALSKA", count: 44 },
      },
    });
  });

  it("selects on both by the male list's order, and names it only if both counts reach the floor", () => {
    // WÓJCIK is the male list's most common surname on both; on the female list it has 2.
    const male = rows({ WÓJCIK: 60, NOWAK: 50 });
    const female = rows({ NOWAK: 45, WÓJCIK: 2 });
    const overlap = listOverlap(male, female);
    expect(overlap.on_both_top).toBeNull();
    expect(overlap.both).toBe(2);
  });

  it("names no one-list surname below the floor, and breaks a tie by key", () => {
    const below = listOverlap(rows({ NOWAK: 50, XU: 3 }), rows({ NOWAK: 45, LEE: 19 }));
    expect(below.one_list_top).toEqual({ male: null, female: null });
    const tie = listOverlap(rows({ BAK: 30, ABC: 30, NOWAK: 20 }), rows({ NOWAK: 20 }));
    expect(tie.one_list_top.male).toEqual({ key: "abc", published: "ABC", count: 30 });
    expect(tie.one_list_top.female).toBeNull();
    expect(tie.female_only).toBe(0);
  });

  it("refuses rows out of selection order or with a key twice", () => {
    const male = rows({ NOWAK: 50, KOT: 20 });
    expect(() => listOverlap([...male].reverse(), male)).toThrow(ListFactsInputError);
    const twice = [
      ...male,
      { key: "zzz", published: "ZZZ", count: 1 },
      { key: "zzz", published: "ZZZ", count: 0 },
    ];
    expect(() => listOverlap(male, twice)).toThrow(ListFactsInputError);
  });
});
