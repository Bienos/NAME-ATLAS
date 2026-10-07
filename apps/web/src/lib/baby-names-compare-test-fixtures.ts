import type { BirthNameFacts, BirthSexFigures, GivenNameFacts } from "@name-atlas/truth";
import { cite, list, registerList, year } from "./baby-names-share-test-fixtures.js";

/**
 * JULIA's girls' fixtures for the comparison's tests (TASK-158), built from
 * TASK-152's helpers: on every girls' list from 2000, no rank claim in 2010,
 * below the 2020 list's cut-off in the trend claim, on no boys' list. Not
 * imported by the app.
 */

const JULIA_COUNTS = [
  10074, 10500, 11000, 11500, 12000, 14232, 14800, 15000, 15200, 15400, 15445, 14000, 12500, 11000,
  10000, 9207, 8800, 8300, 7900, 7600, 7351, 6400, 5400, 4600, 3900, 3207,
];
const JULIA_RANKS: (number | null)[] = [
  4,
  3,
  2,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  null,
  1,
  1,
  2,
  3,
  3,
  2,
  1,
  2,
  2,
  1,
  3,
  4,
  5,
  5,
  6,
];

function juliaGirls(): BirthSexFigures {
  const history = JULIA_COUNTS.map((count, i) => year(2000 + i, count, JULIA_RANKS[i] ?? null));
  return {
    sex: "FEMALE",
    on_any_list: true,
    latest: year(2025, 3207, 6),
    trend: {
      claim_id: "t-julia",
      direction: "FALLING",
      latest_year: 2025,
      earlier_year: 2020,
      window_years: 5,
      change_percent: 10,
      latest_share_per_million: 26772,
      earlier_share_per_million: null,
      citations: [cite("1159538"), cite("28021")],
    },
    history,
  };
}

export function julia(): BirthNameFacts {
  return {
    given_name: { id: "julia", display_name: "JULIA" },
    state: "READY",
    sexes: [
      {
        sex: "MALE",
        on_any_list: false,
        latest: { birth_year: 2025, list: list(2025, "MALE"), count: null, rank: null },
        trend: null,
        history: Array.from({ length: 26 }, (_, i) => ({
          birth_year: 2000 + i,
          list: list(2000 + i, "MALE"),
          count: null,
          rank: null,
        })),
      },
      juliaGirls(),
    ],
  };
}

export const JULIA_STOCK: GivenNameFacts = {
  given_name: { id: "julia", display_name: "JULIA" },
  state: "READY",
  lists: [registerList("female", 200_123, 20, 28781)],
};
