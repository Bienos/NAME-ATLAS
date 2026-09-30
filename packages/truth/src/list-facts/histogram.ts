/**
 * The histogram of one published list: for each count, how many surnames
 * carry it (TASK-040).
 *
 * Every `list_facts@1` fact except the seeded examples, and `dots`, `bands`
 * and `concentration`, depend on a list only through this histogram, so those
 * methods work on it rather than on 400,000 rows. It carries no surname
 * string; the methods that need the spelling work on the keyed rows
 * (`rows.ts`).
 *
 * One list only. Nothing here accepts, or can be given, two lists at once.
 */
import { LIST_FACTS_PRECISION } from "../version.js";

export interface ListHistogram {
  /** The distinct counts on the list, ascending. */
  readonly counts: readonly number[];
  /** `multiplicities[i]` surnames carry exactly `counts[i]` bearers. */
  readonly multiplicities: readonly number[];
  /** People on the list: the sum of its counts. A sum within one list. */
  readonly people: number;
  /** Surnames on the list: its rows. */
  readonly surnames: number;
}

/** Thrown when a list cannot carry a fact: empty, a non-positive count, or a total past 2^53. */
export class ListFactsInputError extends Error {
  override readonly name = "ListFactsInputError";
}

/** Builds the histogram of one list from its counts, in any order. */
export function buildListHistogram(rowCounts: readonly number[]): ListHistogram {
  if (rowCounts.length === 0) {
    throw new ListFactsInputError("a list with no rows has no facts");
  }
  const tally = new Map<number, number>();
  let people = 0;
  for (const count of rowCounts) {
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new ListFactsInputError(`a list count must be a positive integer, got ${count}`);
    }
    people += count;
    tally.set(count, (tally.get(count) ?? 0) + 1);
  }
  if (!Number.isSafeInteger(people)) {
    throw new ListFactsInputError("the list's people exceed exact integer arithmetic");
  }
  const counts = [...tally.keys()].sort((a, b) => a - b);
  const multiplicities = counts.map((count) => tally.get(count) ?? 0);
  return { counts, multiplicities, people, surnames: rowCounts.length };
}

/** The sum of the `k` largest counts: the people on the list's `k` most common surnames. */
export function peopleOnTop(histogram: ListHistogram, k: number): number {
  if (!Number.isInteger(k) || k < 1 || k > histogram.surnames) {
    throw new ListFactsInputError(
      `the ${k} most common surnames of a list of ${histogram.surnames} are not defined`,
    );
  }
  let remaining = k;
  let people = 0;
  for (let i = histogram.counts.length - 1; i >= 0 && remaining > 0; i--) {
    const take = Math.min(remaining, histogram.multiplicities[i] ?? 0);
    people += take * (histogram.counts[i] ?? 0);
    remaining -= take;
  }
  return people;
}

/**
 * Rounds a stored share, probability or expectation to nine decimal places,
 * as `shareOf` does (`LIST_FACTS_PRECISION`). `-0` becomes `0`.
 */
export function roundListValue(value: number): number {
  if (!Number.isFinite(value)) {
    throw new ListFactsInputError(`a list fact must be finite, got ${value}`);
  }
  const rounded = Number(value.toFixed(LIST_FACTS_PRECISION));
  return rounded === 0 ? 0 : rounded;
}
