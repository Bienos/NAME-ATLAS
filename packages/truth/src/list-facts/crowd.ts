/**
 * `list_crowd@1` — what a crowd of n people drawn at random without
 * replacement from ONE published list looks like (model
 * `RANDOM_PEOPLE_WITHOUT_REPLACEMENT`; TASK-040).
 *
 * With counts c_1 … c_R summing to N:
 *
 *   expected distinct surnames   Σ_i [1 - C(N - c_i, n) / C(N, n)]
 *   share without a namesake     Σ_i (c_i / N) C(N - c_i, n - 1) / C(N - 1, n - 1)
 *   chance to meet a set S       1 - C(N - C_S, n) / C(N, n),  C_S = people on S
 *
 * The two expectations read their ratios from `logBinomialRatioTable` (one
 * compensated running `log1p` sum per n over c = 1 … the list's largest
 * count; no log-gamma) and add their terms over the histogram with a
 * compensated sum, so they are good to a few units in the last place: the
 * nine stored decimals of a value near 10^5 need that. The chance to meet a
 * set uses `logBinomialRatio`. `1 - ratio` is `-expm1(log ratio)`, so a tiny
 * chance is not lost to cancellation.
 */
import {
  LIST_CROWD_METHOD_VERSION,
  LIST_CROWD_SIZE,
  LIST_CROWD_SIZES,
  LIST_REACH_SETS,
} from "../version.js";
import { ListFactsInputError, peopleOnTop, roundListValue } from "./histogram.js";
import type { ListHistogram } from "./histogram.js";
import { CompensatedSum, logBinomialRatio, logBinomialRatioTable } from "./log-gamma.js";
import { PersonIndex, drawPeopleWithoutReplacement, mulberry32 } from "./random.js";
import { COLLISION_MODEL } from "./collision.js";

export type ReachSet = (typeof LIST_REACH_SETS)[number]["set"];

export interface ReachHalf {
  readonly set: ReachSet;
  readonly share_of_people: number;
  readonly n_half: number;
  readonly p_at_n_half: number;
}

export interface ExampleCrowd {
  readonly seed: number;
  readonly n: number;
  readonly distinct: number;
  readonly without_namesake: number;
  readonly group_sizes: readonly number[];
}

export interface ListCrowd {
  readonly method_version: string;
  readonly model: typeof COLLISION_MODEL;
  readonly expected_distinct: readonly { readonly n: number; readonly value: number }[];
  readonly crowd_size: number;
  readonly share_without_namesake: number;
  readonly reach_half: readonly ReachHalf[];
  readonly example: ExampleCrowd;
}

function checkCrowd(histogram: ListHistogram, n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > histogram.people) {
    throw new ListFactsInputError(
      `a crowd of ${n} cannot be drawn from a list of ${histogram.people} people`,
    );
  }
}

/** The list's largest count. */
function maxCount(histogram: ListHistogram): number {
  return histogram.counts[histogram.counts.length - 1] ?? 0;
}

/** Expected number of different surnames among n people. Unrounded. */
export function expectedDistinct(histogram: ListHistogram, n: number): number {
  checkCrowd(histogram, n);
  // Entry c: ln[C(N - c, n) / C(N, n)], the log-chance that n people miss a surname of c bearers.
  const missed = logBinomialRatioTable(histogram.people, n, maxCount(histogram));
  const sum = new CompensatedSum();
  histogram.counts.forEach((c, i) => {
    const k = histogram.multiplicities[i] ?? 0;
    sum.add(k * -Math.expm1(missed[c] ?? 0));
  });
  return sum.value;
}

/**
 * Expected share of n people whose surname nobody else among the n carries:
 * the chance that one of them, taken at random, has no namesake. Unrounded.
 */
export function shareWithoutNamesake(histogram: ListHistogram, n: number): number {
  checkCrowd(histogram, n);
  const total = histogram.people;
  // C(N - c, n - 1) / C(N - 1, n - 1) = C((N - 1) - (c - 1), n - 1) / C(N - 1, n - 1):
  // entry c - 1 of the table for N - 1 people and n - 1 others.
  const alone = logBinomialRatioTable(total - 1, n - 1, maxCount(histogram) - 1);
  const sum = new CompensatedSum();
  histogram.counts.forEach((c, i) => {
    const k = histogram.multiplicities[i] ?? 0;
    sum.add(((k * c) / total) * Math.exp(alone[c - 1] ?? 0));
  });
  return sum.value;
}

/** The chance that at least one of n people carries a surname from a set holding `setPeople`. */
export function chanceToMeet(total: number, setPeople: number, n: number): number {
  return -Math.expm1(logBinomialRatio(total, setPeople, n));
}

/**
 * For the list's k most common surnames (the first k rows by count
 * descending; a tie at the boundary cannot change the figure, since tied rows
 * carry the same count): their share of the list's people, and the smallest
 * n at which n people include one of them with chance at least one half.
 */
export function reachHalf(histogram: ListHistogram, set: ReachSet, k: number): ReachHalf {
  const setPeople = peopleOnTop(histogram, k);
  const total = histogram.people;
  const chance = (n: number): number => chanceToMeet(total, setPeople, n);
  // The chance rises with n and is 1 at n = N - C_S + 1: search up, then bisect.
  let hi = 1;
  while (chance(hi) < 0.5) hi = Math.min(2 * hi, total - setPeople + 1);
  let lo = Math.floor(hi / 2);
  if (hi === 1) lo = 0;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (chance(mid) >= 0.5) hi = mid;
    else lo = mid;
  }
  return {
    set,
    share_of_people: roundListValue(setPeople / total),
    n_half: hi,
    p_at_n_half: roundListValue(chance(hi)),
  };
}

/**
 * One seeded example crowd of n distinct people: how many different surnames
 * it holds, how many of its people have no namesake in it, and the sizes of
 * its groups of two or more sharing a surname, largest first.
 */
export function exampleCrowd(rowCounts: readonly number[], seed: number, n: number): ExampleCrowd {
  const index = new PersonIndex(rowCounts);
  if (!Number.isInteger(n) || n < 1 || n > index.people) {
    throw new ListFactsInputError(`a crowd of ${n} cannot be drawn from ${index.people} people`);
  }
  const draw = drawPeopleWithoutReplacement(index, mulberry32(seed));
  const perRow = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const row = draw();
    perRow.set(row, (perRow.get(row) ?? 0) + 1);
  }
  const sizes = [...perRow.values()];
  return {
    seed,
    n,
    distinct: sizes.length,
    without_namesake: sizes.filter((size) => size === 1).length,
    group_sizes: sizes.filter((size) => size >= 2).sort((a, b) => b - a),
  };
}

export function listCrowd(
  histogram: ListHistogram,
  rowCounts: readonly number[],
  seed: number,
): ListCrowd {
  const sizes = LIST_CROWD_SIZES.filter((n) => n <= histogram.people);
  return {
    method_version: LIST_CROWD_METHOD_VERSION,
    model: COLLISION_MODEL,
    expected_distinct: sizes.map((n) => ({
      n,
      value: roundListValue(expectedDistinct(histogram, n)),
    })),
    crowd_size: LIST_CROWD_SIZE,
    share_without_namesake: roundListValue(shareWithoutNamesake(histogram, LIST_CROWD_SIZE)),
    reach_half: LIST_REACH_SETS.map(({ set, k }) => reachHalf(histogram, set, k)),
    example: exampleCrowd(rowCounts, seed, LIST_CROWD_SIZE),
  };
}
