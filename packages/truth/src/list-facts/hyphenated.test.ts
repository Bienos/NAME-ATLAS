import { describe, expect, it } from "vitest";
import { listHyphenated } from "./hyphenated.js";
import { buildListRows } from "./rows.js";
import { LIST_HYPHENATED_METHOD_VERSION } from "../version.js";

/** `list_hyphenated@1` on synthetic lists worked out by hand. */

const rows = (list: Record<string, number>) =>
  buildListRows(Object.entries(list).map(([surname, count]) => ({ surname, count })));

describe("listHyphenated", () => {
  it("counts the keys holding a hyphen, and names the most common, a tie by key", () => {
    expect(
      listHyphenated(
        rows({
          NOWAK: 90, // no hyphen
          "WNUK LIPIŃSKI": 50, // a space is not a hyphen
          "CZESZEJKO-SOCHACKI": 30,
          "ANDRZEJEWSKI–KOT": 30, // an en dash: the key maps it to "-"
          "A-B": 4,
        }),
      ),
    ).toEqual({
      method_version: LIST_HYPHENATED_METHOD_VERSION,
      surnames: 3,
      people: 64,
      // Tied at 30: "andrzejewski-kot" comes before "czeszejko-sochacki".
      top: { key: "andrzejewski-kot", published: "ANDRZEJEWSKI–KOT", count: 30 },
    });
  });

  it("names none below the floor of 20 people, and still counts them", () => {
    expect(listHyphenated(rows({ NOWAK: 90, "A-B": 19, "C-D": 3 }))).toEqual({
      method_version: LIST_HYPHENATED_METHOD_VERSION,
      surnames: 2,
      people: 22,
      top: null,
    });
  });

  it("names exactly at the floor", () => {
    expect(listHyphenated(rows({ "A-B": 20 })).top).toEqual({
      key: "a-b",
      published: "A-B",
      count: 20,
    });
  });
});
