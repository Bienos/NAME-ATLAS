import { describe, expect, it } from "vitest";
import { countEndings, listEndings } from "./endings.js";
import { ListFactsInputError } from "./histogram.js";
import { buildListRows } from "./rows.js";
import { LIST_ENDINGS_METHOD_VERSION } from "../version.js";

/** `list_endings@1` on synthetic lists worked out by hand. */

const rows = (list: Record<string, number>) =>
  buildListRows(Object.entries(list).map(([surname, count]) => ({ surname, count })));

describe("listEndings", () => {
  // 100 people in all.
  const male = rows({
    KOWALSKI: 30, // -ski
    "ŻMUDA-TRZEBIATOWSKI": 5, // -ski: matched on the key's last letters
    NOWAK: 20, // -ak
    NOWICKI: 10, // -cki, not -ski
    KOWALCZYK: 8, // -czyk, not -ik
    WÓJCIK: 7, // -ik
    ZAWADZKI: 6, // -zki: none of the endings
    LEWANDOWSKA: 5, // -ska is not a male-list ending
    MICKIEWICZ: 4, // -ewicz
    JANKOWICZ: 3, // -owicz
    MA̋KELA̋: 2, // ends with a combining mark: not -a
  });

  it("counts each fixed ending of the male list, in order, with its share of the people", () => {
    expect(listEndings(male, "national_male", 100)).toEqual({
      method_version: LIST_ENDINGS_METHOD_VERSION,
      entries: [
        { ending: "ski", surnames: 2, people: 35, share_of_people: 0.35 },
        { ending: "ak", surnames: 1, people: 20, share_of_people: 0.2 },
        { ending: "ek", surnames: 0, people: 0, share_of_people: 0 },
        { ending: "cki", surnames: 1, people: 10, share_of_people: 0.1 },
        { ending: "ik", surnames: 1, people: 7, share_of_people: 0.07 },
        { ending: "czyk", surnames: 1, people: 8, share_of_people: 0.08 },
        { ending: "uk", surnames: 0, people: 0, share_of_people: 0 },
        { ending: "ewicz", surnames: 1, people: 4, share_of_people: 0.04 },
        { ending: "owicz", surnames: 1, people: 3, share_of_people: 0.03 },
      ],
    });
  });

  it("uses the female list's endings for the female list", () => {
    const female = rows({ KOWALSKA: 7, NOWICKA: 2, KOWALSKI: 3 });
    const entries = listEndings(female, "national_female", 12).entries;
    expect(entries.map((e) => e.ending)).toEqual([
      "ska",
      "ak",
      "ek",
      "cka",
      "ik",
      "czyk",
      "uk",
      "ewicz",
      "owicz",
    ]);
    // 7 of 12 = 0.58333…, stored to nine decimals.
    expect(entries[0]).toEqual({
      ending: "ska",
      surnames: 1,
      people: 7,
      share_of_people: 0.583333333,
    });
    expect(entries[3]).toEqual({
      ending: "cka",
      surnames: 1,
      people: 2,
      share_of_people: 0.166666667,
    });
  });

  it("refuses endings where one is a suffix of another", () => {
    expect(() => countEndings(male, ["ski", "wski"], 100)).toThrow(ListFactsInputError);
    expect(() => countEndings(male, ["ak", "ak"], 100)).toThrow(ListFactsInputError);
  });
});
