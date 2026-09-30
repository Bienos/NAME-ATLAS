/**
 * `list_collision@1` — the chance that at least two of n people share a
 * surname, for people drawn at random without replacement from ONE published
 * list (model `RANDOM_PEOPLE_WITHOUT_REPLACEMENT`; TASK-040).
 *
 * With counts c_1 … c_R summing to N, the draws of n people all on different
 * surnames number e_n(c_1, …, c_R), the elementary symmetric polynomial, out
 * of C(N, n) draws in all. So
 *
 *   P(n) = 1 - e_n / C(N, n).
 *
 * e_n is the coefficient of x^n in Π_i (1 + c_i x). It is accumulated over the
 * histogram, a count c held by k surnames contributing (1 + c x)^k exactly,
 * in the scaled form a_j = e_j * j! / N^j. Every a_j lies in [0, 1] (by
 * Maclaurin, e_j <= N^j / j!), every update adds non-negative terms, so there
 * is no overflow and no cancellation. Then
 *
 *   e_n / C(N, n) = a_n / Π_{i<n} (1 - i/N).
 */
import {
  BIRTHDAY_REFERENCE_DAYS,
  LIST_COLLISION_CURVE_MAX,
  LIST_COLLISION_METHOD_VERSION,
  LIST_EXAMPLE_ROOMS,
} from "../version.js";
import { ListFactsInputError, roundListValue } from "./histogram.js";
import type { ListHistogram } from "./histogram.js";
import { PersonIndex, drawPeopleWithoutReplacement, mulberry32 } from "./random.js";

export const COLLISION_MODEL = "RANDOM_PEOPLE_WITHOUT_REPLACEMENT";

export interface CollisionPoint {
  readonly n: number;
  readonly p: number;
}

export interface ExampleRooms {
  readonly seed: number;
  readonly first_pair_at: readonly number[];
  readonly showcase_pair: readonly [number, number];
}

export interface ListCollision {
  readonly method_version: string;
  readonly model: typeof COLLISION_MODEL;
  readonly curve: readonly CollisionPoint[];
  readonly n_half: number;
  readonly p_at_n_half: number;
  readonly p_before_n_half: number;
  readonly pair_one_in: number;
  readonly example_rooms: ExampleRooms;
}

/** In place: a(x) := a(x) * (1 + c x), in the scaled coefficients. */
function multiplyOnce(a: Float64Array, c: number, total: number): void {
  for (let j = a.length - 1; j >= 1; j--) {
    a[j] = (a[j] ?? 0) + ((c * j) / total) * (a[j - 1] ?? 0);
  }
}

/**
 * In place: a(x) := a(x) * (1 + c x)^k, in the scaled coefficients:
 *
 *   a'_j = Σ_{i=0}^{min(j,k)} a_{j-i} * C(k, i) (c/N)^i j! / (j - i)!
 *
 * with the weight built up term by term, so no factorial is ever formed.
 */
function multiplyPower(a: Float64Array, c: number, k: number, total: number): void {
  const out = new Float64Array(a.length);
  const r = c / total;
  for (let j = 0; j < a.length; j++) {
    let weight = 1;
    let sum = a[j] ?? 0;
    const top = Math.min(j, k);
    for (let i = 1; i <= top; i++) {
      weight *= ((k - i + 1) / i) * r * (j - i + 1);
      sum += (a[j - i] ?? 0) * weight;
    }
    out[j] = sum;
  }
  a.set(out);
}

/**
 * The probability that n people drawn without replacement are all on
 * different surnames, for n = 0 … maxN (index n). Unrounded.
 */
export function distinctSurnameProbabilities(histogram: ListHistogram, maxN: number): number[] {
  const total = histogram.people;
  if (!Number.isInteger(maxN) || maxN < 0 || maxN > total) {
    throw new ListFactsInputError(`the curve can run to at most the list's ${total} people`);
  }
  const a = new Float64Array(maxN + 1);
  a[0] = 1;
  for (let idx = 0; idx < histogram.counts.length; idx++) {
    const c = histogram.counts[idx] ?? 0;
    const k = histogram.multiplicities[idx] ?? 0;
    // Both branches are exact; the expansion is cheaper once k exceeds maxN/2.
    if (2 * k > maxN) {
      multiplyPower(a, c, k, total);
    } else {
      for (let t = 0; t < k; t++) multiplyOnce(a, c, total);
    }
  }
  const out: number[] = [];
  let falling = 1; // Π_{i<n} (1 - i/N)
  for (let n = 0; n <= maxN; n++) {
    if (n > 0) falling *= 1 - (n - 1) / total;
    // A draw of more people than there are surnames always repeats one.
    out.push(n > histogram.surnames ? 0 : Math.min(1, (a[n] ?? 0) / falling));
  }
  return out;
}

/**
 * Two random people share a surname with chance Σ c(c - 1) / (N(N - 1)); this
 * is 1 in its reciprocal, rounded half up. Exact integer arithmetic.
 */
export function pairOneIn(histogram: ListHistogram): number {
  let same = 0n;
  histogram.counts.forEach((c, i) => {
    same += BigInt(c) * BigInt(c - 1) * BigInt(histogram.multiplicities[i] ?? 0);
  });
  if (same === 0n) {
    throw new ListFactsInputError("no two people on the list share a surname");
  }
  const n = BigInt(histogram.people);
  const all = n * (n - 1n);
  // floor(all / same + 1/2) = floor((2 all + same) / (2 same))
  return Number((2n * all + same) / (2n * same));
}

/**
 * The seeded example rooms: people are drawn one at a time without
 * replacement from one generator stream; each room ends at the first seat
 * whose surname an earlier seat already carries. Records that seat (1-based)
 * per room, and the first room's pair of seats.
 */
export function exampleRooms(
  rowCounts: readonly number[],
  seed: number,
  rooms: number = LIST_EXAMPLE_ROOMS,
): ExampleRooms {
  const index = new PersonIndex(rowCounts);
  const next = mulberry32(seed);
  const firstPairAt: number[] = [];
  let showcase: [number, number] | null = null;
  for (let room = 0; room < rooms; room++) {
    const draw = drawPeopleWithoutReplacement(index, next);
    const seatOfRow = new Map<number, number>();
    for (let seat = 1; ; seat++) {
      if (seat > index.people) {
        throw new ListFactsInputError("no two people on the list share a surname");
      }
      const row = draw();
      const earlier = seatOfRow.get(row);
      if (earlier !== undefined) {
        firstPairAt.push(seat);
        if (showcase === null) showcase = [earlier, seat];
        break;
      }
      seatOfRow.set(row, seat);
    }
  }
  if (showcase === null) throw new ListFactsInputError("at least one example room is needed");
  return { seed, first_pair_at: firstPairAt, showcase_pair: showcase };
}

/**
 * n_half from the UNROUNDED curve (points for n = 2, 3, … in order): the
 * smallest n whose chance is at least one half, and the chances at n and at
 * n - 1, rounded for storage as the curve is. A chance just under one half
 * that rounds to 0.5 therefore does not end the search; the stored p at
 * n_half - 1 can then read 0.5 while the unrounded chance there is below it.
 */
export function halfPoint(unrounded: readonly CollisionPoint[]): {
  n_half: number;
  p_at_n_half: number;
  p_before_n_half: number;
} {
  const at = unrounded.findIndex((point) => point.p >= 0.5);
  const half = unrounded[at];
  if (half === undefined) {
    const last = unrounded[unrounded.length - 1]?.n ?? 0;
    throw new ListFactsInputError(
      `the chance of a shared surname does not reach one half by n = ${last}`,
    );
  }
  return {
    n_half: half.n,
    p_at_n_half: roundListValue(half.p),
    // P(1) = 0: one person cannot share a surname with nobody.
    p_before_n_half: roundListValue(unrounded[at - 1]?.p ?? 0),
  };
}

export function listCollision(
  histogram: ListHistogram,
  rowCounts: readonly number[],
  seed: number,
): ListCollision {
  const maxN = Math.min(LIST_COLLISION_CURVE_MAX, histogram.people);
  const distinct = distinctSurnameProbabilities(histogram, maxN);
  const unrounded: CollisionPoint[] = [];
  for (let n = 2; n <= maxN; n++) unrounded.push({ n, p: 1 - (distinct[n] ?? 0) });
  return {
    method_version: LIST_COLLISION_METHOD_VERSION,
    model: COLLISION_MODEL,
    curve: unrounded.map(({ n, p }) => ({ n, p: roundListValue(p) })),
    // Decided on the unrounded chances; stored rounded, as the curve is.
    ...halfPoint(unrounded),
    pair_one_in: pairOneIn(histogram),
    example_rooms: exampleRooms(rowCounts, seed),
  };
}

/**
 * The birthday comparison, exactly: with `days` equally likely days, the
 * smallest n at which two of n people share a day with chance at least one
 * half, and that chance. Rational arithmetic, then rounded like every list fact.
 */
export function birthdayReference(days: number = BIRTHDAY_REFERENCE_DAYS): {
  n_half: number;
  p_at_n_half: number;
} {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`days must be a positive integer, got ${days}`);
  }
  const d = BigInt(days);
  let distinct = 1n; // d (d-1) … (d-n+1)
  let all = 1n; // d^n
  for (let n = 1; n <= days + 1; n++) {
    distinct *= d - BigInt(n - 1);
    all *= d;
    const shared = all - distinct;
    if (2n * shared >= all) {
      const scale = 10n ** 9n;
      // round half up to nine decimals: floor((2 * shared * 10^9 + all) / (2 all))
      const scaled = (2n * shared * scale + all) / (2n * all);
      return { n_half: n, p_at_n_half: Number(scaled) / 1e9 };
    }
  }
  throw new Error("unreachable: pigeonhole guarantees a shared day by days + 1");
}
