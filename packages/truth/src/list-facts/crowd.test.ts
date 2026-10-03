import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildListHistogram, ListFactsInputError, roundListValue } from "./histogram.js";
import {
  chanceToMeet,
  exampleCrowd,
  expectedDistinct,
  listCrowd,
  reachHalf,
  shareWithoutNamesake,
} from "./crowd.js";
import { COLLISION_MODEL } from "./collision.js";
import { LIST_CROWD_METHOD_VERSION, LIST_CROWD_SIZE, LIST_REACH_SETS } from "../version.js";

/**
 * `list_crowd@1`: hand-computed lists, then an exhaustive enumeration of
 * every n-subset of people on small random lists.
 */

/** Every n-subset of people 0..N-1, as surname (row) indices. */
function* subsets(rows: readonly number[], n: number, start = 0): Generator<number[]> {
  if (n === 0) {
    yield [];
    return;
  }
  for (let i = start; i <= rows.length - n; i++) {
    for (const rest of subsets(rows, n - 1, i + 1)) yield [rows[i]!, ...rest];
  }
}

function peopleRows(counts: readonly number[]): number[] {
  return counts.flatMap((c, row) => Array.from({ length: c }, () => row));
}

describe("expectedDistinct and shareWithoutNamesake on a hand-computed list", () => {
  // Counts 2, 1, 1: people A, A, B, C (N = 4). Six pairs: AA once, five mixed.
  const h = buildListHistogram([2, 1, 1]);

  it("a pair holds 11/6 different surnames on average", () => {
    // (1 * 1 + 5 * 2) / 6; by formula (1 - C(2,2)/6) + 2 (1 - C(3,2)/6).
    expect(expectedDistinct(h, 2)).toBeCloseTo(11 / 6, 14);
    expect(expectedDistinct(h, 1)).toBeCloseTo(1, 14);
    // Everyone drawn: every surname is present.
    expect(expectedDistinct(h, 4)).toBeCloseTo(3, 14);
  });

  it("in a pair, a person has no namesake with chance 5/6", () => {
    // Loners: 0 in AA, 2 in each mixed pair: (10/6) / 2.
    expect(shareWithoutNamesake(h, 2)).toBeCloseTo(5 / 6, 14);
    expect(shareWithoutNamesake(h, 1)).toBeCloseTo(1, 14);
  });

  it("refuses a crowd larger than the list", () => {
    expect(() => expectedDistinct(h, 5)).toThrow(ListFactsInputError);
    expect(() => shareWithoutNamesake(h, 0)).toThrow(ListFactsInputError);
  });
});

describe("expectedDistinct and shareWithoutNamesake against enumeration", () => {
  it("agree with the average over every n-subset of people", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 20 }),
        (counts, want) => {
          const h = buildListHistogram(counts);
          const n = Math.min(want, h.people);
          let subsetsSeen = 0;
          let distinct = 0;
          let loners = 0;
          for (const subset of subsets(peopleRows(counts), n)) {
            subsetsSeen += 1;
            const tally = new Map<number, number>();
            for (const row of subset) tally.set(row, (tally.get(row) ?? 0) + 1);
            distinct += tally.size;
            loners += [...tally.values()].filter((size) => size === 1).length;
          }
          expect(expectedDistinct(h, n)).toBeCloseTo(distinct / subsetsSeen, 12);
          expect(shareWithoutNamesake(h, n)).toBeCloseTo(loners / subsetsSeen / n, 12);
        },
      ),
      { numRuns: 60 },
    );
  });
});

/** x (x - 1) … (x - n + 1), exactly. */
function falling(x: number, n: number): bigint {
  let out = 1n;
  for (let i = 0; i < n; i++) out *= BigInt(x - i);
  return out;
}

/**
 * num / den to double precision: at least 20 significant decimal digits, parsed
 * in exponent form (JS parsing rounds correctly, down into the denormals). An
 * earlier version kept 40 decimal *places*, which left a share near 1e-30 ten
 * significant digits and made one near 1e-40 zero: the property below then
 * measured this helper, not the implementation, on the rare list that drew
 * such a share, and CI failed by the seed.
 */
function toDouble(num: bigint, den: bigint): number {
  if (num === 0n) return 0;
  const shift = Math.max(0, den.toString().length - num.toString().length + 20);
  const scaled = (num * 10n ** BigInt(shift)) / den;
  return Number(`${scaled.toString()}e-${shift}`);
}

/** num / den rounded half up to nine decimals, exactly. */
function toNine(num: bigint, den: bigint): number {
  const nine = ((2n * num * 10n ** 9n + den) / (2n * den)).toString().padStart(10, "0");
  return Number(`${nine.slice(0, -9)}.${nine.slice(-9)}`);
}

/**
 * Both expectations as exact rationals over (N)_n:
 *   E[distinct]            = R - Σ_c k_c (N - c)_n / (N)_n
 *   share without namesake = Σ_c k_c c (N - c)_{n-1} / (N)_n
 * with (N - c)_n stepped from c - 1 to c by an exact division.
 */
function exactExpectations(counts: readonly number[], n: number) {
  const total = counts.reduce((a, b) => a + b, 0);
  const tally = new Map<number, number>();
  for (const c of counts) tally.set(c, (tally.get(c) ?? 0) + 1);
  const den = falling(total, n);
  let missAll = falling(total - 1, n); // (N - c)_n at c = 1
  let missOthers = falling(total - 1, n - 1); // (N - c)_{n-1} at c = 1
  let missed = 0n;
  let alone = 0n;
  for (let c = 1; c <= Math.max(...counts); c++) {
    if (c > 1) {
      missAll = (missAll * BigInt(total - c + 1 - n)) / BigInt(total - c + 1);
      missOthers = (missOthers * BigInt(total - c + 2 - n)) / BigInt(total - c + 1);
    }
    const k = BigInt(tally.get(c) ?? 0);
    missed += k * missAll;
    alone += k * BigInt(c) * missOthers;
  }
  const distinct = BigInt(counts.length) * den - missed;
  return {
    distinct: toDouble(distinct, den),
    distinctNine: toNine(distinct, den),
    share: toDouble(alone, den),
    shareNine: toNine(alone, den),
  };
}

describe("expectedDistinct and shareWithoutNamesake against exact rational arithmetic", () => {
  const rep = (k: number, c: number) => Array.from({ length: k }, () => c);
  // N = 20,295 on 148 surnames, three of them above 2,048 bearers.
  const counts = [
    ...rep(60, 2),
    ...rep(40, 3),
    ...rep(25, 7),
    ...rep(12, 40),
    ...rep(6, 300),
    ...rep(3, 2500),
    4100,
    6000,
  ];
  const h = buildListHistogram(counts);

  // n = 15,000 leaves only 5,295 others: a surname of 6,000 is then always met.
  it.each([100, 1000, 3000, 8000, 15000])(
    "n = %i: stored at nine decimals exactly as the rational rounds, within 2 ulp unrounded",
    (n) => {
      const exact = exactExpectations(counts, n);
      const distinct = expectedDistinct(h, n);
      const share = shareWithoutNamesake(h, n);
      expect(roundListValue(distinct)).toBe(exact.distinctNine);
      expect(roundListValue(share)).toBe(exact.shareNine);
      expect(Math.abs(distinct - exact.distinct)).toBeLessThanOrEqual(4.5e-16 * exact.distinct);
      expect(Math.abs(share - exact.share)).toBeLessThanOrEqual(4.5e-16 * exact.share);
    },
  );

  it("agree with the rationals to double precision on random lists", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 200 }), { minLength: 1, maxLength: 40 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (list, fraction) => {
          const hist = buildListHistogram(list);
          const n = Math.max(1, Math.round(fraction * hist.people));
          const exact = exactExpectations(list, n);
          expect(Math.abs(expectedDistinct(hist, n) - exact.distinct)).toBeLessThanOrEqual(
            1e-15 * exact.distinct,
          );
          // The share is exp(log-ratio) and carries about |log| ulps of relative
          // error, so its bound follows |ln share|: a flat 1e-15 was exceeded by
          // 11 of 30,000 random lists (up to 2.8e-15 at a share near 3e-20), and
          // CI drew one of them ([33, 58], n = 21: 1.03e-15). Below 1e-300 the
          // doubles themselves run out, so an absolute floor stands in.
          const share = Math.max(exact.share, Number.MIN_VALUE);
          expect(Math.abs(shareWithoutNamesake(hist, n) - exact.share)).toBeLessThanOrEqual(
            Math.max((4 + Math.abs(Math.log(share))) * 2.3e-16 * share, 1e-300),
          );
        },
      ),
      { numRuns: 60 },
    );
  });
});

describe("reachHalf", () => {
  it("counts 4, 3, 2, 1: the top surname holds 0.4; two people meet it with chance 2/3", () => {
    // P(2) = 1 - C(6,2)/C(10,2) = 1 - 15/45.
    const h = buildListHistogram([1, 3, 4, 2]);
    expect(reachHalf(h, "TOP_1", 1)).toEqual({
      set: "TOP_1",
      share_of_people: 0.4,
      n_half: 2,
      p_at_n_half: 0.666666667,
    });
  });

  it("an exact half is reached at n = 1", () => {
    const h = buildListHistogram([5, 3, 1, 1]);
    expect(reachHalf(h, "TOP_1", 1)).toMatchObject({ n_half: 1, p_at_n_half: 0.5 });
  });

  it("n_half is the smallest n with chance at least one half, on random lists", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 10, maxLength: 300 }),
        fc.constantFrom(1, 3, 10),
        (counts, k) => {
          const h = buildListHistogram(counts);
          const top = [...counts].sort((a, b) => b - a).slice(0, k);
          const setPeople = top.reduce((a, b) => a + b, 0);
          const result = reachHalf(h, "TOP_10", k);
          expect(chanceToMeet(h.people, setPeople, result.n_half)).toBeGreaterThanOrEqual(0.5);
          if (result.n_half > 1) {
            expect(chanceToMeet(h.people, setPeople, result.n_half - 1)).toBeLessThan(0.5);
          }
        },
      ),
    );
  });
});

describe("exampleCrowd", () => {
  const counts = Array.from({ length: 300 }, (_, i) => 2 + (i % 11));

  it("is deterministic and internally whole: loners plus groups make the crowd", () => {
    const crowd = exampleCrowd(counts, 42, 200);
    expect(exampleCrowd(counts, 42, 200)).toEqual(crowd);
    expect(crowd.n).toBe(200);
    expect(crowd.distinct).toBe(crowd.without_namesake + crowd.group_sizes.length);
    expect(crowd.without_namesake + crowd.group_sizes.reduce((a, b) => a + b, 0)).toBe(200);
    for (let i = 0; i < crowd.group_sizes.length; i++) {
      expect(crowd.group_sizes[i]).toBeGreaterThanOrEqual(2);
      if (i > 0) expect(crowd.group_sizes[i]).toBeLessThanOrEqual(crowd.group_sizes[i - 1]!);
    }
  });

  it("drawing everyone yields every surname with its full count", () => {
    const small = [3, 2, 2, 1];
    const crowd = exampleCrowd(small, 5, 8);
    expect(crowd).toMatchObject({ distinct: 4, without_namesake: 1, group_sizes: [3, 2, 2] });
    expect(() => exampleCrowd(small, 5, 9)).toThrow(ListFactsInputError);
  });
});

describe("listCrowd", () => {
  // 150 surnames of 2..151 bearers: N = 11,475, R = 150.
  const counts = Array.from({ length: 150 }, (_, i) => i + 2);
  const crowd = listCrowd(buildListHistogram(counts), counts, 1020);

  it("keeps only the crowd sizes the list can supply, rising and bounded by n and R", () => {
    expect(crowd.method_version).toBe(LIST_CROWD_METHOD_VERSION);
    expect(crowd.model).toBe(COLLISION_MODEL);
    expect(crowd.expected_distinct.map((e) => e.n)).toEqual([100, 1000, 10000]);
    for (let i = 0; i < crowd.expected_distinct.length; i++) {
      const { n, value } = crowd.expected_distinct[i]!;
      expect(value).toBeLessThanOrEqual(Math.min(n, 150));
      if (i > 0) expect(value).toBeGreaterThan(crowd.expected_distinct[i - 1]!.value);
    }
  });

  it("reports the three sets in order, their shares rising and their n_half falling", () => {
    expect(crowd.reach_half.map((r) => r.set)).toEqual(LIST_REACH_SETS.map((s) => s.set));
    for (let i = 1; i < crowd.reach_half.length; i++) {
      expect(crowd.reach_half[i]!.share_of_people).toBeGreaterThan(
        crowd.reach_half[i - 1]!.share_of_people,
      );
      expect(crowd.reach_half[i]!.n_half).toBeLessThanOrEqual(crowd.reach_half[i - 1]!.n_half);
    }
    // TOP_1 is the count 151 of 11,475.
    expect(crowd.reach_half[0]!.share_of_people).toBe(Number((151 / 11475).toFixed(9)));
  });

  it("the example is a crowd of crowd_size, seeded as given", () => {
    expect(crowd.crowd_size).toBe(LIST_CROWD_SIZE);
    expect(crowd.example).toMatchObject({ seed: 1020, n: LIST_CROWD_SIZE });
    expect(crowd.share_without_namesake).toBeGreaterThan(0);
    expect(crowd.share_without_namesake).toBeLessThan(1);
  });
});
