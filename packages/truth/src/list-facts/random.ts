/**
 * Deterministic draws for the seeded examples of `list_collision@1` and
 * `list_crowd@1` (TASK-040). The examples illustrate the exact figures; they
 * are never a figure themselves.
 *
 * The generator is mulberry32 (32-bit state, 32-bit output). An index in
 * [0, n) is drawn by rejection, so it is exactly uniform, never the slightly
 * biased `floor(u * n)`.
 */
import { ListFactsInputError } from "./histogram.js";

const TWO_32 = 2 ** 32;

/** mulberry32: returns a function yielding the next unsigned 32-bit integer. */
export function mulberry32(seed: number): () => number {
  if (!Number.isInteger(seed) || seed < 0 || seed >= TWO_32) {
    throw new RangeError(`a mulberry32 seed is an unsigned 32-bit integer, got ${seed}`);
  }
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/** An exactly uniform integer in [0, n), 1 <= n <= 2^32, by rejection sampling. */
export function uniformIndex(next: () => number, n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > TWO_32) {
    throw new RangeError(`uniformIndex needs an integer 1 <= n <= 2^32, got ${n}`);
  }
  const limit = TWO_32 - (TWO_32 % n);
  for (;;) {
    const u = next();
    if (u < limit) return u % n;
  }
}

/**
 * Maps a person (an index in [0, N)) to the row that carries them: row i
 * holds persons [cum[i-1], cum[i]). Rows are in file order.
 */
export class PersonIndex {
  readonly people: number;
  private readonly ends: Float64Array;

  constructor(rowCounts: readonly number[]) {
    if (rowCounts.length === 0) throw new ListFactsInputError("a list with no rows has no people");
    this.ends = new Float64Array(rowCounts.length);
    let total = 0;
    rowCounts.forEach((count, i) => {
      if (!Number.isSafeInteger(count) || count < 1) {
        throw new ListFactsInputError(`a list count must be a positive integer, got ${count}`);
      }
      total += count;
      this.ends[i] = total;
    });
    this.people = total;
  }

  /** The row (0-based, file order) carrying person `p`. */
  rowOf(p: number): number {
    let lo = 0;
    let hi = this.ends.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.ends[mid] ?? 0) > p) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
}

/**
 * Draws distinct people uniformly without replacement: a person already drawn
 * is rejected and drawn again. Yields the row of each new person.
 */
export function drawPeopleWithoutReplacement(index: PersonIndex, next: () => number): () => number {
  const drawn = new Set<number>();
  return () => {
    if (drawn.size >= index.people) {
      throw new ListFactsInputError("every person on the list has already been drawn");
    }
    for (;;) {
      const person = uniformIndex(next, index.people);
      if (drawn.has(person)) continue;
      drawn.add(person);
      return index.rowOf(person);
    }
  };
}
