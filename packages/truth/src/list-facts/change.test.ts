import { describe, expect, it } from "vitest";
import { listChange } from "./change.js";
import type { EditionRows } from "./change.js";
import { editionFigures } from "./editions.js";
import { ListFactsInputError } from "./histogram.js";
import { buildListRows } from "./rows.js";
import { listNamedTop } from "./selections.js";
import { LIST_CHANGE_METHOD_VERSION } from "../version.js";

/**
 * `list_change@1` on synthetic editions of one list (TASK-044 §4.3,
 * ADR-0019 §2.3), worked out by hand:
 *
 *   2020: NOWAK 50, KOWALSKI 30, ŁUCZAK 5, STARY 2                 (4 surnames, 87 people)
 *   2026: NOWAK 60, KOWALSKI 30, LUCZAK 25, ŁUCZAK 4, NOWY 2       (5 surnames, 121 people)
 *
 * LUCZAK and NOWY are on the 2026 edition only; STARY on the 2020 one only.
 * ŁUCZAK and LUCZAK are two surnames: the key is exact, never a Polish fold.
 */

type Row = readonly [surname: string, count: number];

function editionRows(resource_id: string, data_date: string, rows: readonly Row[]): EditionRows {
  return {
    edition: editionFigures(
      {
        series: "pesel_living_current_surname_national_male",
        resource_id,
        data_date,
        sha256: resource_id.slice(-1).repeat(64),
      },
      rows.map(([, count]) => count),
    ),
    rows: buildListRows(rows.map(([surname, count]) => ({ surname, count }))),
  };
}

const first = editionRows("22817", "2020-01-22", [
  ["NOWAK", 50],
  ["KOWALSKI", 30],
  ["ŁUCZAK", 5],
  ["STARY", 2],
]);
const last = editionRows("1148808", "2026-01-20", [
  ["NOWAK", 60],
  ["KOWALSKI", 30],
  ["LUCZAK", 25],
  ["ŁUCZAK", 4],
  ["NOWY", 2],
]);
const top3 = listNamedTop(last.rows).items;

describe("listChange", () => {
  it("compares the first edition with the last, by exact key", () => {
    expect(listChange(first, last, top3)).toEqual({
      method_version: LIST_CHANGE_METHOD_VERSION,
      first_data_date: "2020-01-22",
      last_data_date: "2026-01-20",
      surnames_first: 4,
      surnames_last: 5,
      surnames_delta: 1,
      people_first: 87,
      people_last: 121,
      people_delta: 34,
      // LUCZAK 25 and NOWY 2. ŁUCZAK is on both, so it is not new.
      on_last_not_first: { surnames: 2, people: 27 },
      // STARY 2, counted on the first edition.
      on_first_not_last: { surnames: 1, people_on_first: 2 },
      top3_first_counts: [
        { key: "nowak", count_first: 50 },
        { key: "kowalski", count_first: 30 },
        // Not on the 2020 list: null, never zero (it may have been below the floor).
        { key: "luczak", count_first: null },
      ],
      // 2020: nowak, kowalski, łuczak, stary; 2026: nowak, kowalski, luczak, łuczak, nowy.
      top10_unchanged: false,
    });
  });

  it("stores a fall as a negative delta, never as a sum of anything", () => {
    const change = listChange(
      last,
      { ...first, edition: { ...first.edition, data_date: "2027-01-20" } },
      [],
    );
    expect(change.surnames_delta).toBe(-1);
    expect(change.people_delta).toBe(-34);
    expect(change.top3_first_counts).toEqual([]);
  });

  it("finds the ten most common surnames unchanged only when the keys and their order are", () => {
    const rows: Row[] = Array.from({ length: 12 }, (_, i) => [`NAZWISKO${i}`, 100 - i]);
    const a = editionRows("22817", "2020-01-22", rows);
    const sameOrder = editionRows(
      "1148808",
      "2026-01-20",
      rows.map(([surname, count]) => [surname, count + 5]),
    );
    expect(listChange(a, sameOrder, []).top10_unchanged).toBe(true);
    // The 11th and 12th swapping does not touch the ten.
    const tailSwap = editionRows("1148808", "2026-01-20", [
      ...rows.slice(0, 10),
      ["NAZWISKO10", 80],
      ["NAZWISKO11", 85],
    ]);
    expect(listChange(a, tailSwap, []).top10_unchanged).toBe(true);
    // Two of the ten swapping does.
    const swapped = editionRows("1148808", "2026-01-20", [
      ["NAZWISKO1", 100],
      ["NAZWISKO0", 99],
      ...rows.slice(2),
    ]);
    expect(listChange(a, swapped, []).top10_unchanged).toBe(false);
  });

  it("refuses editions in the wrong order, and rows that are not the edition's surnames", () => {
    expect(() => listChange(last, first, [])).toThrow(ListFactsInputError);
    const short = { ...last, rows: last.rows.slice(1) };
    expect(() => listChange(first, short, [])).toThrow(/its rows must be its 5 surnames/u);
  });

  it("refuses a named surname that is not on the last edition", () => {
    expect(() => listChange(first, last, [{ key: "stary" }])).toThrow(/not on the last edition/u);
  });
});
