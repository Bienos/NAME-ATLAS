import { describe, expect, it } from "vitest";
import type { CitationDto } from "@name-atlas/contracts";
import { assembleBirthNameFacts, stockListOfSex } from "./given-name-birth-facts.js";
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

const list = (id: string, year: number, sex: "MALE" | "FEMALE"): BirthListInfo => ({
  list_id: id,
  birth_year: year,
  sex,
  publication_threshold: year <= 2012 ? 5 : 2,
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
): BirthClaimRow[] {
  const base = {
    claim_id: `t-${latest}-${version}`,
    claim_type: "GIVEN_NAME_BIRTH_TREND",
    claim_key: `GIVEN_NAME_BIRTH_TREND|${NAME.id}|${latest}|${earlier}`,
    method_version: version,
    payload: JSON.stringify({
      direction,
      latest: { birth_year: 2025 },
      earlier: { birth_year: 2020 },
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
