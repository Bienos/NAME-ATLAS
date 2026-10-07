import type { PurchaseTier } from "@name-atlas/accounts";
import { BABY_NAMES_FULL_TIERS } from "@name-atlas/accounts";
import type { CitationDto } from "@name-atlas/contracts";
import { birthShare } from "@name-atlas/truth";
import type {
  BirthCountFigure,
  BirthNameFacts,
  BirthNameLookup,
  BirthSexFigures,
  BirthYearFigures,
  GivenNameFacts,
  GivenNameListFacts,
} from "@name-atlas/truth";
import type { BabyNamesDeps } from "./baby-names-page.js";

/**
 * Fixtures for the share cards' three test files (TASK-152), after
 * `baby-names-page.test.ts`: ZOFIA's girls' claims on the full 2020 and 2025
 * files and a 26-year history, the boys' lists she is on none of, and the
 * register's two lists. Not imported by the app.
 */

export const cite = (resource: string): CitationDto => ({
  id: `cit-${resource}`,
  title: "Imiona nadawane dzieciom w Polsce",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: null,
  source_type: "OFFICIAL_DATASET",
  locator: `resource:${resource}`,
  url: `https://api.dane.gov.pl/resources/${resource}`,
  attribution: null,
  terms: null,
  retrieved_at: null,
  source_page_url: null,
});

const PEOPLE_SUM: Readonly<Record<number, number>> = { 2025: 119_788, 2020: 176_829 };

export const list = (year: number, sex: "MALE" | "FEMALE") => ({
  list_id: `${sex}-${year}`,
  birth_year: year,
  sex,
  publication_threshold: year <= 2012 ? 5 : 2,
  people_sum: PEOPLE_SUM[year] ?? 100_000,
});

export const countOf = (
  year: number,
  sex: "MALE" | "FEMALE",
  count: number,
  resource: string,
): BirthCountFigure => ({
  claim_id: `c-${sex}-${year}`,
  count,
  ...birthShare(count, list(year, sex).people_sum),
  citation: cite(resource),
});

export const year = (
  y: number,
  count: number | null,
  rank: number | null,
  resource = y >= 2020 ? (y === 2020 ? "28021" : "1159538") : "21457",
): BirthYearFigures => ({
  birth_year: y,
  list: list(y, "FEMALE"),
  count: count === null ? null : countOf(y, "FEMALE", count, resource),
  rank:
    rank === null || count === null
      ? null
      : { claim_id: `r-${y}`, rank, universe_size: y < 2013 ? 600 : 939, citation: cite(resource) },
});

/** 2 913 in 2000 (rank 14), absent in 2001, a peak of 9 012 in 2017, 4 415 in 2025 (rank 1). */
export const GIRLS_COUNTS: readonly (number | null)[] = [
  2913,
  null,
  3100,
  3400,
  3700,
  4000,
  4300,
  4700,
  5100,
  5600,
  6100,
  6600,
  7000,
  7400,
  7900,
  8400,
  8800,
  9012,
  8900,
  8500,
  7073,
  6500,
  5900,
  5300,
  4800,
  4415,
];
export const GIRLS_RANKS: readonly (number | null)[] = [
  14,
  null,
  13,
  12,
  11,
  10,
  9,
  8,
  7,
  6,
  5,
  4,
  3,
  3,
  2,
  2,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  1,
  1,
  1,
];

export function girlsHistory(): BirthYearFigures[] {
  return GIRLS_COUNTS.map((count, i) => year(2000 + i, count, GIRLS_RANKS[i] ?? null));
}

export function boysHistory(): BirthYearFigures[] {
  return Array.from({ length: 26 }, (_, i) => ({
    birth_year: 2000 + i,
    list: list(2000 + i, "MALE"),
    count: null,
    rank: null,
  }));
}

export function zofiaGirls(history: boolean): BirthSexFigures {
  return {
    sex: "FEMALE",
    on_any_list: true,
    latest: year(2025, 4415, 1),
    trend: {
      claim_id: "t25",
      direction: "STEADY",
      latest_year: 2025,
      earlier_year: 2020,
      window_years: 5,
      change_percent: 10,
      latest_share_per_million: 36856,
      earlier_share_per_million: 39999,
      citations: [cite("1159538"), cite("28021")],
    },
    history: history ? girlsHistory() : null,
  };
}

export function zofia(history: boolean): BirthNameFacts {
  const boys: BirthSexFigures = {
    sex: "MALE",
    on_any_list: false,
    latest: { birth_year: 2025, list: list(2025, "MALE"), count: null, rank: null },
    trend: null,
    history: history ? boysHistory() : null,
  };
  return {
    given_name: { id: "zofia", display_name: "ZOFIA" },
    state: "READY",
    sexes: [boys, zofiaGirls(history)],
  };
}

const registerCite = (resource: string): CitationDto => ({
  ...cite(resource),
  title: "Lista imion występujących w rejestrze PESEL",
});

export const registerList = (
  sex: "male" | "female",
  people: number,
  rank: number | null,
  universe: number,
): GivenNameListFacts => {
  const resource = sex === "male" ? "1159669" : "1159670";
  const conf = { status: "HIGH", methodology_code: "x@1" };
  return {
    comparability_group: `pesel_given_names_2026_first_${sex}`,
    snapshot_date: "2026-01-20",
    count: {
      claim_id: `p-${sex}`,
      count: people,
      confidence: conf,
      citation: registerCite(resource),
    },
    rank:
      rank === null
        ? null
        : {
            claim_id: `k-${sex}`,
            rank,
            universe_size: universe,
            ties_policy: "shared",
            confidence: conf,
            citation: registerCite(resource),
          },
  };
};

export const ZOFIA_STOCK: GivenNameFacts = {
  given_name: { id: "zofia", display_name: "ZOFIA" },
  state: "READY",
  lists: [registerList("female", 321456, 12, 28781), registerList("male", 77, null, 46197)],
};

export const NO_STOCK: GivenNameFacts = {
  given_name: { id: "zofia", display_name: "ZOFIA" },
  state: "UNAVAILABLE",
  lists: [],
};

/** Deps over a fake store: ZOFIA found, RARA on no list, anything else unknown. */
export function shareDeps(
  bought: Record<string, readonly PurchaseTier[]>,
  calls: { findName: number; readFacts: number; hasFullView: number } = {
    findName: 0,
    readFacts: 0,
    hasFullView: 0,
  },
): BabyNamesDeps & { readonly calls: typeof calls } {
  return {
    calls,
    findName: (typed): Promise<BirthNameLookup> => {
      calls.findName++;
      const key = typed.trim().toUpperCase();
      if (key === "ZOFIA") {
        return Promise.resolve({
          kind: "FOUND",
          given_name: { id: "zofia", display_name: "ZOFIA" },
        });
      }
      if (key === "RARA") {
        return Promise.resolve({ kind: "FOUND", given_name: { id: "rara", display_name: "RARA" } });
      }
      return Promise.resolve({ kind: "NOT_FOUND" });
    },
    readFacts: (name, history) => {
      calls.readFacts++;
      if (name.id === "rara") {
        return Promise.resolve({ given_name: name, state: "NOT_ON_ANY_LIST", sexes: [] });
      }
      return Promise.resolve({ ...zofia(history), given_name: name });
    },
    readStock: (name) => Promise.resolve(name.id === "zofia" ? ZOFIA_STOCK : NO_STOCK),
    readLists: () => Promise.resolve([list(2025, "MALE"), list(2025, "FEMALE")]),
    hasFullView: (userId) => {
      calls.hasFullView++;
      return Promise.resolve((bought[userId] ?? []).some((t) => BABY_NAMES_FULL_TIERS.includes(t)));
    },
    readMeaning: () => Promise.resolve({ state: "NO_SOURCE" }),
  };
}

/** The PNG's width and height from its IHDR chunk. */
export function pngSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
