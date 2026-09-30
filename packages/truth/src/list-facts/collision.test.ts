import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildListHistogram, ListFactsInputError } from "./histogram.js";
import {
  birthdayReference,
  COLLISION_MODEL,
  distinctSurnameProbabilities,
  exampleRooms,
  halfPoint,
  listCollision,
  pairOneIn,
} from "./collision.js";
import { LIST_COLLISION_METHOD_VERSION, LIST_EXAMPLE_ROOMS } from "../version.js";

/**
 * `list_collision@1`: the exact without-replacement probability on
 * hand-computed lists, then against exact integer arithmetic (e_n by
 * polynomial expansion in BigInt, C(N, n) in BigInt) over random lists.
 */

function binomial(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  let out = 1n;
  for (let i = 0; i < k; i++) out = (out * BigInt(n - i)) / BigInt(i + 1);
  return out;
}

/** e_0 … e_max of the counts, exactly. */
function elementary(counts: readonly number[], max: number): bigint[] {
  const e: bigint[] = [1n, ...Array.from({ length: max }, () => 0n)];
  for (const c of counts) {
    for (let j = max; j >= 1; j--) e[j] = e[j]! + BigInt(c) * e[j - 1]!;
  }
  return e;
}

describe("distinctSurnameProbabilities on hand-computed lists", () => {
  it("counts 3, 2, 1 (N = 6): all different with chance 1, 22/30, 6/20, then 0", () => {
    // P(two differ) = 1 - (3*2 + 2*1) / (6*5) = 22/30; three differ: 3*2*1 / C(6,3) = 6/20.
    const f = distinctSurnameProbabilities(buildListHistogram([3, 2, 1]), 5);
    expect(f[0]).toBe(1);
    expect(f[1]).toBeCloseTo(1, 15);
    expect(f[2]).toBeCloseTo(22 / 30, 15);
    expect(f[3]).toBeCloseTo(6 / 20, 15);
    // Four people, three surnames: some surname repeats.
    expect(f[4]).toBe(0);
    expect(f[5]).toBe(0);
  });

  it("refuses a curve longer than the list's people", () => {
    expect(() => distinctSurnameProbabilities(buildListHistogram([2, 1]), 4)).toThrow(
      ListFactsInputError,
    );
  });

  it("the expansion (1 + cx)^k and k single factors give the same answer", () => {
    // maxN = 3 < 2k takes the expansion; maxN = 10 >= 2k multiplies five times.
    const h = buildListHistogram([2, 2, 2, 2, 2]);
    const expanded = distinctSurnameProbabilities(h, 3);
    const repeated = distinctSurnameProbabilities(h, 10);
    for (let n = 0; n <= 3; n++) expect(expanded[n]).toBeCloseTo(repeated[n]!, 14);
    // Exact: e_3 = C(5,3) 2^3 = 80 of C(10,3) = 120.
    expect(expanded[3]).toBeCloseTo(80 / 120, 14);
  });
});

describe("distinctSurnameProbabilities against exact arithmetic", () => {
  it("equals e_n / C(N, n) on random lists", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 40 }), { minLength: 1, maxLength: 40 }),
        (counts) => {
          const h = buildListHistogram(counts);
          const maxN = Math.min(h.people, 60);
          const f = distinctSurnameProbabilities(h, maxN);
          const e = elementary(counts, maxN);
          for (let n = 0; n <= maxN; n++) {
            const exact = Number(e[n]!) / Number(binomial(h.people, n));
            expect(Math.abs(f[n]! - exact)).toBeLessThan(1e-12);
          }
        },
      ),
    );
  });
});

describe("pairOneIn", () => {
  it("is the reciprocal of sum c(c-1) / N(N-1), rounded half up", () => {
    // 3, 2, 1: 30 / 8 = 3.75 -> 4.
    expect(pairOneIn(buildListHistogram([3, 2, 1]))).toBe(4);
    // 3, 2: 20 / 8 = 2.5 exactly -> 3 (half up).
    expect(pairOneIn(buildListHistogram([3, 2]))).toBe(3);
    // 2, 1, 1, 1: 20 / 2 = 10.
    expect(pairOneIn(buildListHistogram([2, 1, 1, 1]))).toBe(10);
  });

  it("refuses a list where no two people share a surname", () => {
    expect(() => pairOneIn(buildListHistogram([1, 1, 1]))).toThrow(ListFactsInputError);
  });
});

describe("listCollision", () => {
  // 40 surnames of 2..41 bearers: N = 860.
  const counts = Array.from({ length: 40 }, (_, i) => i + 2);
  const h = buildListHistogram(counts);
  const collision = listCollision(h, counts, 7);

  it("stores the curve from n = 2, strictly increasing, with n_half on it", () => {
    expect(collision.method_version).toBe(LIST_COLLISION_METHOD_VERSION);
    expect(collision.model).toBe(COLLISION_MODEL);
    expect(collision.curve[0]!.n).toBe(2);
    collision.curve.forEach((point, i) => expect(point.n).toBe(i + 2));
    // It rises strictly while visibly below 1; stored at nine decimals it then
    // reaches 1 (and must, past R = 40 people) and stays there.
    for (let i = 1; i < collision.curve.length; i++) {
      const [before, after] = [collision.curve[i - 1]!.p, collision.curve[i]!.p];
      if (before < 0.999) expect(after).toBeGreaterThan(before);
      else expect(after).toBeGreaterThanOrEqual(before);
    }
    expect(collision.curve.find((point) => point.n === 41)!.p).toBe(1);
    const at = collision.curve.find((point) => point.n === collision.n_half)!;
    const before = collision.curve.find((point) => point.n === collision.n_half - 1);
    expect(at.p).toBeGreaterThanOrEqual(0.5);
    expect(collision.p_at_n_half).toBe(at.p);
    expect(collision.p_before_n_half).toBe(before?.p ?? 0);
    expect(collision.p_before_n_half).toBeLessThan(0.5);
  });

  it("decides n_half on the unrounded chances", () => {
    const distinct = distinctSurnameProbabilities(h, 300);
    expect(1 - distinct[collision.n_half]!).toBeGreaterThanOrEqual(0.5);
    expect(1 - distinct[collision.n_half - 1]!).toBeLessThan(0.5);
  });

  it("P(2) on the curve agrees with the pair figure", () => {
    const p2 = collision.curve[0]!.p;
    expect(Math.abs(1 / p2 - collision.pair_one_in)).toBeLessThanOrEqual(0.5 + 1e-3);
  });

  it("fails closed when the chance never reaches one half on the curve", () => {
    // Ten thousand surnames of one bearer and one of two: P(n) stays tiny.
    const rare = [2, ...Array.from({ length: 10000 }, () => 1)];
    expect(() => listCollision(buildListHistogram(rare), rare, 1)).toThrow(ListFactsInputError);
  });
});

describe("halfPoint", () => {
  it("decides on the unrounded chance: just under one half does not count, though it rounds to 0.5", () => {
    const curve = [
      { n: 2, p: 0.3 },
      { n: 3, p: 0.4999999996 },
      { n: 4, p: 0.6000000004 },
    ];
    // Read off the rounded curve, n = 3 would wrongly be the answer.
    expect(halfPoint(curve)).toEqual({ n_half: 4, p_at_n_half: 0.6, p_before_n_half: 0.5 });
  });

  it("an exact half, or a chance just over it that rounds to 0.5, ends the search", () => {
    expect(
      halfPoint([
        { n: 2, p: 0.25 },
        { n: 3, p: 0.5 },
      ]),
    ).toEqual({ n_half: 3, p_at_n_half: 0.5, p_before_n_half: 0.25 });
    expect(
      halfPoint([
        { n: 2, p: 0.1234567894 },
        { n: 3, p: 0.5000000004 },
      ]),
    ).toEqual({ n_half: 3, p_at_n_half: 0.5, p_before_n_half: 0.123456789 });
  });

  it("at n = 2 the chance before is P(1) = 0", () => {
    expect(halfPoint([{ n: 2, p: 0.75 }])).toEqual({
      n_half: 2,
      p_at_n_half: 0.75,
      p_before_n_half: 0,
    });
  });

  it("fails closed when the chance never reaches one half", () => {
    expect(() => halfPoint([{ n: 2, p: 0.4999999999 }])).toThrow(ListFactsInputError);
    expect(() => halfPoint([])).toThrow(ListFactsInputError);
  });
});

describe("exampleRooms", () => {
  const counts = [5, 4, 3, 2, 2, 2];

  it("is deterministic for a seed and records where each room's first pair appears", () => {
    const a = exampleRooms(counts, 20260120);
    const b = exampleRooms(counts, 20260120);
    expect(a).toEqual(b);
    expect(a.seed).toBe(20260120);
    expect(a.first_pair_at).toHaveLength(LIST_EXAMPLE_ROOMS);
    for (const seat of a.first_pair_at) {
      // A pair needs two people; six surnames force one by the seventh seat.
      expect(seat).toBeGreaterThanOrEqual(2);
      expect(seat).toBeLessThanOrEqual(7);
    }
    const [first, second] = a.showcase_pair;
    expect(second).toBe(a.first_pair_at[0]);
    expect(first).toBeGreaterThanOrEqual(1);
    expect(first).toBeLessThan(second);
  });

  it("differs between seeds", () => {
    const many = Array.from({ length: 200 }, (_, i) => 2 + (i % 7));
    expect(exampleRooms(many, 1).first_pair_at).not.toEqual(exampleRooms(many, 2).first_pair_at);
  });

  it("fails closed on a list where no surname repeats", () => {
    expect(() => exampleRooms([1, 1, 1], 1, 1)).toThrow(ListFactsInputError);
  });
});

describe("birthdayReference", () => {
  it("is the classic 23 people at 365 equally likely days, computed exactly", () => {
    // 1 - 365!/(342! 365^23) = 0.507297234323985…
    expect(birthdayReference()).toEqual({ n_half: 23, p_at_n_half: 0.507297234 });
  });

  it("handles the degenerate years", () => {
    expect(birthdayReference(1)).toEqual({ n_half: 2, p_at_n_half: 1 });
    expect(birthdayReference(2)).toEqual({ n_half: 2, p_at_n_half: 0.5 });
  });
});
