import { describe, expect, it } from "vitest";
import type { CitationDto } from "@name-atlas/contracts";
import { assembleBirthNameFacts, birthShare, stockListOfSex } from "./given-name-birth-facts.js";
import type { GivenNameListFacts } from "./given-name-facts.js";
import type { BirthClaimRow, BirthListInfo } from "./given-name-birth-facts.js";
import { GIVEN_NAME_BIRTH_TREND_METHOD_VERSION } from "./version.js";

/**
 * TASK-141: which of a name's birth-list claims the baby-names page takes.
 * Synthetic ids and values; the figures on real lists are the integration
 * test's (`tests/integration/src/baby-names.test.ts`).
 */

const NAME = { id: "name-1", display_name: "ZOFIA" };
const OPEN: BirthClaimRow["rights"] = {
  automated_access: "ALLOWED",
  commercial_use: "ALLOWED",
  redistribution: "ALLOWED",
  metadata_rights: "ALLOWED",
  review_status: "APPROVED",
};

const citation = (id: string, resource: string): CitationDto => ({
  id,
  title: "Imiona nadawane dzieciom w Polsce",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: null,
  source_type: "OFFICIAL_DATASET",
  locator: `resource:${resource}`,
  url: "https://example.test/r",
  attribution: null,
  terms: null,
  retrieved_at: null,
  source_page_url: null,
});

const list = (
  id: string,
  year: number,
  sex: "MALE" | "FEMALE",
  people_sum = 119_788,
): BirthListInfo => ({
  list_id: id,
  birth_year: year,
  sex,
  publication_threshold: year <= 2012 ? 5 : 2,
  people_sum,
});

const LISTS: BirthListInfo[] = [
  list("f2011", 2011, "FEMALE"),
  list("f2020", 2020, "FEMALE"),
  list("f2025", 2025, "FEMALE"),
  list("m2020", 2020, "MALE"),
  list("m2025", 2025, "MALE"),
];

function count(listId: string, value: number, claim = `c-${listId}`): BirthClaimRow {
  return {
    claim_id: claim,
    claim_type: "GIVEN_NAME_BIRTH_COUNT",
    claim_key: `GIVEN_NAME_BIRTH_COUNT|${NAME.id}|${listId}`,
    method_version: "given_name_birth_count@1",
    payload: JSON.stringify({ count: value }),
    citation: citation(`cit-${claim}`, listId),
    rights: OPEN,
  };
}
function rank(listId: string, value: number, of: number): BirthClaimRow {
  return {
    claim_id: `r-${listId}`,
    claim_type: "GIVEN_NAME_BIRTH_RANK",
    claim_key: `GIVEN_NAME_BIRTH_RANK|${NAME.id}|${listId}`,
    method_version: "given_name_birth_rank@1",
    payload: JSON.stringify({ rank: value, universe_size: of }),
    citation: citation(`cit-r-${listId}`, listId),
    rights: OPEN,
  };
}
function trend(
  latest: string,
  earlier: string,
  direction: string,
  version = GIVEN_NAME_BIRTH_TREND_METHOD_VERSION,
  earlierShare: number | null = 39999,
): BirthClaimRow[] {
  const base = {
    claim_id: `t-${latest}-${version}`,
    claim_type: "GIVEN_NAME_BIRTH_TREND",
    claim_key: `GIVEN_NAME_BIRTH_TREND|${NAME.id}|${latest}|${earlier}`,
    method_version: version,
    payload: JSON.stringify({
      direction,
      latest: { birth_year: 2025, share_per_million: 36856 },
      earlier: { birth_year: 2020, share_per_million: earlierShare },
      window_years: 5,
      change_percent: 10,
    }),
    rights: OPEN,
  };
  // Lists in two resources: one claim, two citation rows.
  return [
    { ...base, citation: citation(`cit-t-${latest}`, latest) },
    { ...base, citation: citation(`cit-t-${earlier}`, earlier) },
  ];
}

const FREE = { surface: "FREE", history: false } as const;
const PAID = { surface: "PAID", history: true } as const;

describe("assembleBirthNameFacts (TASK-141)", () => {
  it("takes the latest list's count, rank and trend for each sex, boys first, never summed", () => {
    const rows = [
      count("f2025", 4415),
      rank("f2025", 1, 939),
      count("f2020", 7073),
      ...trend("f2025", "f2020", "STEADY"),
      count("m2025", 3),
    ];
    const facts = assembleBirthNameFacts(NAME, LISTS, rows, FREE);
    expect(facts.state).toBe("READY");
    expect(facts.sexes.map((s) => s.sex)).toEqual(["MALE", "FEMALE"]);
    const [boys, girls] = facts.sexes;
    expect(girls?.latest).toMatchObject({
      birth_year: 2025,
      count: { count: 4415 },
      rank: { rank: 1, universe_size: 939 },
    });
    expect(girls?.trend).toMatchObject({
      direction: "STEADY",
      latest_year: 2025,
      earlier_year: 2020,
      change_percent: 10,
    });
    expect(girls?.trend?.citations.map((c) => c.locator)).toEqual([
      "resource:f2025",
      "resource:f2020",
    ]);
    // The boys' figure is the boys' own; no rank and no trend stand for it.
    expect(boys?.latest).toMatchObject({ birth_year: 2025, count: { count: 3 }, rank: null });
    expect(boys?.trend).toBeNull();
    expect(girls?.history).toBeNull();
  });

  it("reads an absence from the latest list as below that list's cut-off, never zero", () => {
    const facts = assembleBirthNameFacts(NAME, LISTS, [count("f2020", 12)], FREE);
    const girls = facts.sexes[1];
    expect(girls?.latest).toEqual({
      birth_year: 2025,
      list: LISTS[2],
      count: null,
      rank: null,
    });
    expect(girls?.latest?.list?.publication_threshold).toBe(2);
    expect(girls?.trend).toBeNull();
  });

  it("says per sex whether the name is on any of its lists, in any year, without a history (TASK-157)", () => {
    // A girls' name: on the 2011 girls' list only, so absent from both latest lists.
    const girlsOnly = assembleBirthNameFacts(NAME, LISTS, [count("f2011", 40)], FREE);
    expect(girlsOnly.sexes.map((s) => [s.sex, s.on_any_list])).toEqual([
      ["MALE", false],
      ["FEMALE", true],
    ]);
    expect(girlsOnly.sexes[1]?.latest?.count).toBeNull();
    // Both sexes: the boys on their 2020 list only.
    const both = assembleBirthNameFacts(NAME, LISTS, [count("f2025", 4), count("m2020", 2)], FREE);
    expect(both.sexes.map((s) => s.on_any_list)).toEqual([true, true]);
    // No list of a sex stored: not on any of its lists.
    const girlsLists = LISTS.filter((l) => l.sex === "FEMALE");
    const noBoysList = assembleBirthNameFacts(NAME, girlsLists, [count("f2025", 4)], FREE);
    expect(noBoysList.sexes[0]).toMatchObject({ sex: "MALE", on_any_list: false, latest: null });
  });

  it("says a name is on no list when no count claim stands on a current list", () => {
    expect(assembleBirthNameFacts(NAME, LISTS, [], FREE).state).toBe("NOT_ON_ANY_LIST");
    // A claim on a list no longer active (a superseded resource) is not read.
    expect(assembleBirthNameFacts(NAME, LISTS, [count("old-list", 9)], FREE).state).toBe(
      "NOT_ON_ANY_LIST",
    );
  });

  it("takes the trend only on the current latest list, and only of the current method", () => {
    const rows = [
      count("f2025", 100),
      ...trend("f2020", "f2011", "RISING"),
      ...trend("f2025", "f2020", "FALLING", "given_name_birth_trend@1"),
    ];
    expect(assembleBirthNameFacts(NAME, LISTS, rows, FREE).sexes[1]?.trend).toBeNull();
  });

  it("gives every year from 2000 to the latest when asked, with missing lists and absences apart", () => {
    const rows = [count("f2011", 40), rank("f2011", 300, 1500), count("f2025", 4415)];
    const girls = assembleBirthNameFacts(NAME, LISTS, rows, PAID).sexes[1];
    const history = girls?.history ?? [];
    expect(history.map((y) => y.birth_year)).toEqual(
      Array.from({ length: 26 }, (_, i) => 2000 + i),
    );
    expect(history.find((y) => y.birth_year === 2011)).toMatchObject({
      count: { count: 40 },
      rank: { rank: 300, universe_size: 1500 },
    });
    // On the 2020 list's years but absent: below its cut-off (2), not zero.
    expect(history.find((y) => y.birth_year === 2020)).toMatchObject({
      list: { publication_threshold: 2 },
      count: null,
      rank: null,
    });
    // No list stored for 2005 in this fixture: no list, which is not an absence either.
    expect(history.find((y) => y.birth_year === 2005)).toEqual({
      birth_year: 2005,
      list: null,
      count: null,
      rank: null,
    });
  });

  it("gives each count claim its share of its own list's children and its 1 in N (TASK-151)", () => {
    // 4 415 of 119 788 girls: 36 857 per million rounded down (3.7%), one in 27.
    const rows = [count("f2025", 4415), count("f2020", 7073), count("m2025", 3)];
    const lists = [
      ...LISTS.filter((l) => l.list_id !== "f2020"),
      list("f2020", 2020, "FEMALE", 176_829),
    ];
    const facts = assembleBirthNameFacts(NAME, lists, rows, PAID);
    const [boys, girls] = facts.sexes;
    expect(girls?.latest?.count).toMatchObject({
      count: 4415,
      share_per_million: 36856,
      one_in: 27,
    });
    // The 2020 figure is a share of the 2020 list's own sum, never the latest list's.
    expect(girls?.history?.find((y) => y.birth_year === 2020)?.count).toMatchObject({
      count: 7073,
      share_per_million: 39999,
      one_in: 25,
    });
    expect(boys?.latest?.count).toMatchObject({ count: 3, share_per_million: 25, one_in: 39929 });
    // A year with no count claim has no share: nothing to divide, and never 0.
    expect(girls?.history?.find((y) => y.birth_year === 2011)?.count).toBeNull();
  });

  it("reads the two shares the direction was decided on from the trend claim, the earlier null when absent", () => {
    const steady = assembleBirthNameFacts(
      NAME,
      LISTS,
      [count("f2025", 4415), ...trend("f2025", "f2020", "STEADY")],
      FREE,
    );
    expect(steady.sexes[1]?.trend).toMatchObject({
      latest_share_per_million: 36856,
      earlier_share_per_million: 39999,
    });
    // Absent five years earlier: the claim carries null, and so does the figure.
    const rising = assembleBirthNameFacts(
      NAME,
      LISTS,
      [count("m2025", 40), ...trend("m2025", "m2020", "RISING", undefined, null)],
      FREE,
    );
    expect(rising.sexes[0]?.trend).toMatchObject({
      direction: "RISING",
      latest_share_per_million: 36856,
      earlier_share_per_million: null,
    });
    // A claim without the figures (an older payload) gives null, not 0.
    const bare = trend("f2025", "f2020", "STEADY").map((row) => ({
      ...row,
      payload: JSON.stringify({
        direction: "STEADY",
        latest: { birth_year: 2025 },
        earlier: { birth_year: 2020 },
        window_years: 5,
        change_percent: 10,
      }),
    }));
    expect(
      assembleBirthNameFacts(NAME, LISTS, [count("f2025", 4415), ...bare], FREE).sexes[1]?.trend,
    ).toMatchObject({ latest_share_per_million: null, earlier_share_per_million: null });
  });

  it("refuses two active lists of one year and sex (ADR-0042 §3)", () => {
    expect(() =>
      assembleBirthNameFacts(NAME, [...LISTS, list("f2025b", 2025, "FEMALE")], [], FREE),
    ).toThrow(/two active lists/u);
  });

  it("shows nothing when the rights refuse the surface", () => {
    const blocked = { ...count("f2025", 5), rights: { ...OPEN, commercial_use: "PROHIBITED" } };
    expect(assembleBirthNameFacts(NAME, LISTS, [blocked], PAID)).toEqual({
      given_name: NAME,
      state: "RIGHTS_BLOCKED",
      sexes: [],
    });
  });
});

describe("stockListOfSex (TASK-145)", () => {
  const stock = (group: string, date: string, people: number): GivenNameListFacts => ({
    comparability_group: group,
    snapshot_date: date,
    count: {
      claim_id: `c-${group}`,
      count: people,
      confidence: { status: "HIGH", methodology_code: "x@1" },
      citation: citation(`cit-${group}`, "1159670"),
    },
    rank: null,
  });
  const men = stock("pesel_given_names_2026_first_male", "2026-01-20", 100);
  const women = stock("pesel_given_names_2026_first_female", "2026-01-20", 200);

  it("takes each sex's own list and never sums the two", () => {
    expect(stockListOfSex([men, women], "MALE")).toBe(men);
    expect(stockListOfSex([men, women], "FEMALE")).toBe(women);
  });

  it("is null for a sex with no claim, never a zero", () => {
    expect(stockListOfSex([women], "MALE")).toBeNull();
    expect(stockListOfSex([], "FEMALE")).toBeNull();
  });

  it("takes the latest date when two lists of one sex stand, never both", () => {
    const later = stock("pesel_given_names_2027_first_female", "2027-01-20", 300);
    expect(stockListOfSex([women, later], "FEMALE")).toBe(later);
  });
});

describe("birthShare (TASK-151)", () => {
  it("is the trend claim's definition: parts per million rounded down, and 1 in N rounded", () => {
    expect(birthShare(4415, 119_788)).toEqual({ share_per_million: 36856, one_in: 27 });
    expect(birthShare(7073, 176_829)).toEqual({ share_per_million: 39999, one_in: 25 });
    expect(birthShare(1, 3)).toEqual({ share_per_million: 333333, one_in: 3 });
    expect(birthShare(2, 3)).toEqual({ share_per_million: 666666, one_in: 2 });
    expect(birthShare(119_788, 119_788)).toEqual({ share_per_million: 1_000_000, one_in: 1 });
  });

  it("gives null, never 0, when the stored figures contradict each other", () => {
    for (const [count, sum] of [
      [0, 100],
      [5, 0],
      [101, 100],
      [-1, 100],
      [1.5, 100],
    ] as const) {
      expect(birthShare(count, sum), `${count} of ${sum}`).toEqual({
        share_per_million: null,
        one_in: null,
      });
    }
  });
});
