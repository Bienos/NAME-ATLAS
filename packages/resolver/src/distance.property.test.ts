import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { damerauLevenshtein, hasAdjacentTransposition } from "./distance.js";

/**
 * TASK-015 stage 9, property-based.
 *
 * These properties exist because a hand-written dynamic-programming recurrence
 * is easy to get subtly wrong in a way that unit tests on chosen pairs miss.
 * The first version of `damerauLevenshtein` advanced its transposition
 * bookkeeping one step too early and reported `kowalskii` against `kowalski` as
 * distance **0** — a wrong answer that would have silently corrupted the recall
 * measurements the threshold table is derived from. The metric properties below
 * fail on that bug from any direction.
 */

/** Short strings over a small alphabet: dense in edits, so collisions are found. */
const wordLike = fc.stringMatching(/^[a-eł]{0,7}$/u);

describe("damerauLevenshtein is a metric on strings", () => {
  it("is zero exactly for equal strings", () => {
    fc.assert(
      fc.property(wordLike, wordLike, (a, b) => {
        expect(damerauLevenshtein(a, b) === 0).toBe(a === b);
      }),
      { numRuns: 500 },
    );
  });

  it("is symmetric", () => {
    fc.assert(
      fc.property(wordLike, wordLike, (a, b) => {
        expect(damerauLevenshtein(a, b)).toBe(damerauLevenshtein(b, a));
      }),
      { numRuns: 500 },
    );
  });

  it("satisfies the triangle inequality", () => {
    fc.assert(
      fc.property(wordLike, wordLike, wordLike, (a, b, c) => {
        expect(damerauLevenshtein(a, c)).toBeLessThanOrEqual(
          damerauLevenshtein(a, b) + damerauLevenshtein(b, c),
        );
      }),
      { numRuns: 500 },
    );
  });

  it("is bounded below by the length difference and above by the longer length", () => {
    fc.assert(
      fc.property(wordLike, wordLike, (a, b) => {
        const d = damerauLevenshtein(a, b);
        const la = [...a].length;
        const lb = [...b].length;
        expect(d).toBeGreaterThanOrEqual(Math.abs(la - lb));
        expect(d).toBeLessThanOrEqual(Math.max(la, lb));
      }),
      { numRuns: 500 },
    );
  });

  it("charges exactly one edit for one appended character", () => {
    // The specific shape the original bug got wrong.
    fc.assert(
      fc.property(wordLike, fc.constantFrom("a", "b", "ł"), (a, extra) => {
        expect(damerauLevenshtein(a + extra, a)).toBe(1);
      }),
      { numRuns: 300 },
    );
  });

  it("charges exactly one edit for one adjacent transposition", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-eł]{2,7}$/u), fc.nat({ max: 6 }), (word, offset) => {
        const chars = [...word];
        const i = offset % (chars.length - 1);
        if (chars[i] === chars[i + 1]) return;
        const swapped = [...chars];
        const left = swapped[i]!;
        swapped[i] = swapped[i + 1]!;
        swapped[i + 1] = left;
        const other = swapped.join("");
        expect(damerauLevenshtein(word, other)).toBe(1);
        expect(hasAdjacentTransposition(word, other)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
});

describe("hasAdjacentTransposition agrees with the distance function", () => {
  it("implies a distance of exactly one", () => {
    fc.assert(
      fc.property(wordLike, wordLike, (a, b) => {
        if (hasAdjacentTransposition(a, b)) {
          expect(damerauLevenshtein(a, b)).toBe(1);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it("is symmetric", () => {
    fc.assert(
      fc.property(wordLike, wordLike, (a, b) => {
        expect(hasAdjacentTransposition(a, b)).toBe(hasAdjacentTransposition(b, a));
      }),
      { numRuns: 500 },
    );
  });
});
