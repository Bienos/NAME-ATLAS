import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  buildListHistogram,
  ListFactsInputError,
  peopleOnTop,
  roundListValue,
} from "./histogram.js";
import {
  listSummary,
  listThreshold,
  medianCountPerPerson,
  medianCountPerSurname,
  personQuantile,
  surnameQuantile,
} from "./summary.js";
import { LIST_SUMMARY_METHOD_VERSION, LIST_SUMMARY_THRESHOLDS } from "../version.js";

/**
 * `list_summary@1` on small synthetic lists whose answers are worked out by
 * hand in the comments, then against a brute force over random lists.
 */

describe("buildListHistogram", () => {
  it("tallies counts into ascending distinct counts with their multiplicities", () => {
    expect(buildListHistogram([5, 2, 2, 10, 3])).toEqual({
      counts: [2, 3, 5, 10],
      multiplicities: [2, 1, 1, 1],
      people: 22,
      surnames: 5,
    });
  });

  it("refuses an empty list and a count that is not a positive integer", () => {
    expect(() => buildListHistogram([])).toThrow(ListFactsInputError);
    expect(() => buildListHistogram([2, 0])).toThrow(ListFactsInputError);
    expect(() => buildListHistogram([2, 2.5])).toThrow(ListFactsInputError);
    expect(() => buildListHistogram([2, -3])).toThrow(ListFactsInputError);
  });
});

describe("peopleOnTop", () => {
  const h = buildListHistogram([5, 9, 9, 1]);

  it("sums the k largest counts; a tie at the boundary cannot change the sum", () => {
    expect(peopleOnTop(h, 1)).toBe(9);
    expect(peopleOnTop(h, 2)).toBe(18);
    expect(peopleOnTop(h, 3)).toBe(23);
    expect(peopleOnTop(h, 4)).toBe(24);
  });

  it("refuses a set larger than the list", () => {
    expect(() => peopleOnTop(h, 5)).toThrow(ListFactsInputError);
    expect(() => peopleOnTop(h, 0)).toThrow(ListFactsInputError);
  });
});

describe("roundListValue", () => {
  it("rounds to nine decimals and never stores -0", () => {
    expect(roundListValue(0.12345678912)).toBe(0.123456789);
    expect(roundListValue(2 / 3)).toBe(0.666666667);
    expect(Object.is(roundListValue(-1e-12), 0)).toBe(true);
  });

  it("refuses a value that is not finite", () => {
    expect(() => roundListValue(Number.NaN)).toThrow(ListFactsInputError);
    expect(() => roundListValue(Number.POSITIVE_INFINITY)).toThrow(ListFactsInputError);
  });
});

describe("list_summary@1 on a hand-computed list", () => {
  // Counts 2, 2, 3, 5, 10: R = 5 surnames, N = 22 people.
  const h = buildListHistogram([10, 2, 5, 2, 3]);

  it("median per surname is the ceil(R/2)-th smallest count", () => {
    // ceil(5/2) = 3rd smallest of 2, 2, 3, 5, 10.
    expect(medianCountPerSurname(h)).toBe(3);
    // R = 4: ceil(4/2) = 2nd smallest of 2, 3, 4, 9: the lower median.
    expect(medianCountPerSurname(buildListHistogram([9, 4, 3, 2]))).toBe(3);
  });

  it("median per person is the largest c with at least half the people on counts >= c", () => {
    // Count >= 10 holds 10 of 22 (< half); count >= 5 holds 15 (>= 11).
    expect(medianCountPerPerson(h)).toBe(5);
    // Exactly half counts: 2, 2, 4 has N = 8 and count >= 4 holds 4 = 8/2.
    expect(medianCountPerPerson(buildListHistogram([2, 2, 4]))).toBe(4);
  });

  it("thresholds count surnames and people at or above each level", () => {
    expect(listThreshold(h, 2)).toEqual({ at_least: 2, surnames: 5, people: 22 });
    expect(listThreshold(h, 5)).toEqual({ at_least: 5, surnames: 2, people: 15 });
    expect(listThreshold(h, 10)).toEqual({ at_least: 10, surnames: 1, people: 10 });
    expect(listThreshold(h, 11)).toEqual({ at_least: 11, surnames: 0, people: 0 });
  });

  it("surname quantiles: smallest c with a share of surnames at or below c of at least q", () => {
    // Shares of surnames at or below 2, 3, 5, 10: 2/5, 3/5, 4/5, 5/5.
    expect(surnameQuantile(h, 0.5)).toBe(3);
    expect(surnameQuantile(h, 0.9)).toBe(10);
    expect(surnameQuantile(h, 0.999)).toBe(10);
  });

  it("person quantiles: smallest c with a share of people at or below c of at least q", () => {
    // People at or below 2, 3, 5, 10: 4, 7, 12, 22 of 22.
    expect(personQuantile(h, 0.5)).toBe(5);
    expect(personQuantile(h, 0.9)).toBe(10);
  });

  it("decides a quantile boundary exactly, not in floating point", () => {
    // Nine surnames of count 2 and one of 7: exactly 9/10 are at or below 2.
    const tenth = buildListHistogram([2, 2, 2, 2, 2, 2, 2, 2, 2, 7]);
    expect(surnameQuantile(tenth, 0.9)).toBe(2);
    expect(surnameQuantile(tenth, 0.999)).toBe(7);
    expect(() => surnameQuantile(tenth, 0.12345)).toThrow(ListFactsInputError);
  });

  it("assembles the summary with its method version", () => {
    const summary = listSummary(h);
    expect(summary).toMatchObject({
      method_version: LIST_SUMMARY_METHOD_VERSION,
      people: 22,
      surnames: 5,
      max_count: 10,
      min_count: 2,
      median_count_per_surname: 3,
      median_count_per_person: 5,
    });
    expect(summary.thresholds.map((t) => t.at_least)).toEqual(LIST_SUMMARY_THRESHOLDS);
    expect(summary.surname_quantiles).toEqual([
      { q: 0.5, count: 3 },
      { q: 0.9, count: 10 },
      { q: 0.99, count: 10 },
      { q: 0.999, count: 10 },
    ]);
    expect(summary.person_quantiles).toEqual([
      { q: 0.5, count: 5 },
      { q: 0.9, count: 10 },
      { q: 0.99, count: 10 },
      { q: 0.999, count: 10 },
    ]);
  });
});

describe("list_summary@1 against a brute force", () => {
  const list = fc.array(fc.integer({ min: 1, max: 60 }), { minLength: 1, maxLength: 150 });
  const q = fc.constantFrom(0.5, 0.9, 0.99, 0.999, 0.25, 0.001, 1);

  it("medians agree with their definitions over the sorted rows", () => {
    fc.assert(
      fc.property(list, (counts) => {
        const h = buildListHistogram(counts);
        const sorted = [...counts].sort((a, b) => a - b);
        const n = counts.reduce((a, b) => a + b, 0);
        expect(medianCountPerSurname(h)).toBe(sorted[Math.ceil(sorted.length / 2) - 1]);
        const onOrAbove = (c: number) => counts.filter((x) => x >= c).reduce((a, b) => a + b, 0);
        const upper = Math.max(...counts.filter((c) => 2 * onOrAbove(c) >= n));
        expect(medianCountPerPerson(h)).toBe(upper);
      }),
    );
  });

  it("quantiles agree with their definitions, and thresholds never grow with the level", () => {
    fc.assert(
      fc.property(list, q, (counts, quantile) => {
        const h = buildListHistogram(counts);
        const r = counts.length;
        const n = counts.reduce((a, b) => a + b, 0);
        const t = Math.round(quantile * 1000);
        const candidates = [...new Set(counts)].sort((a, b) => a - b);
        const bySurname = candidates.find(
          (c) => counts.filter((x) => x <= c).length * 1000 >= t * r,
        );
        const byPerson = candidates.find(
          (c) => counts.filter((x) => x <= c).reduce((a, b) => a + b, 0) * 1000 >= t * n,
        );
        expect(surnameQuantile(h, quantile)).toBe(bySurname);
        expect(personQuantile(h, quantile)).toBe(byPerson);

        const levels = LIST_SUMMARY_THRESHOLDS.map((level) => listThreshold(h, level));
        for (let i = 1; i < levels.length; i++) {
          expect(levels[i]!.surnames).toBeLessThanOrEqual(levels[i - 1]!.surnames);
          expect(levels[i]!.people).toBeLessThanOrEqual(levels[i - 1]!.people);
        }
        expect(listThreshold(h, 1)).toEqual({ at_least: 1, surnames: r, people: n });
      }),
    );
  });
});
