import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ListFactsInputError } from "./histogram.js";
import { PersonIndex, drawPeopleWithoutReplacement, mulberry32, uniformIndex } from "./random.js";

/**
 * The seeded draws behind the example rooms and the example crowd. The
 * reference outputs were produced by an independent Python implementation of
 * mulberry32; seed 0 starts with 0.26642920868471265 * 2^32, the commonly
 * quoted first value.
 */

describe("mulberry32", () => {
  it("reproduces the reference outputs", () => {
    const take = (seed: number) => {
      const next = mulberry32(seed);
      return Array.from({ length: 5 }, () => next());
    };
    expect(take(0)).toEqual([1144304738, 1416247, 958946056, 627933444, 2007157716]);
    expect(take(1)).toEqual([2693262067, 11749833, 2265367787, 4213581821, 4159151403]);
    expect(take(20260120)).toEqual([321397991, 3926121383, 1516628489, 3930628127, 4155268312]);
  });

  it("refuses a seed that is not an unsigned 32-bit integer", () => {
    expect(() => mulberry32(-1)).toThrow(RangeError);
    expect(() => mulberry32(2 ** 32)).toThrow(RangeError);
    expect(() => mulberry32(1.5)).toThrow(RangeError);
  });
});

describe("uniformIndex", () => {
  it("stays in [0, n) for any seed and n", () => {
    fc.assert(
      fc.property(fc.nat(), fc.integer({ min: 1, max: 2 ** 32 }), (seed, n) => {
        const next = mulberry32(seed);
        for (let i = 0; i < 20; i++) {
          const x = uniformIndex(next, n);
          expect(Number.isInteger(x) && x >= 0 && x < n).toBe(true);
        }
      }),
    );
  });

  it("rejects the incomplete top block instead of folding it in", () => {
    // n = 3: 2^32 mod 3 = 1, so 2^32 - 1 is the one rejected output.
    const outputs = [2 ** 32 - 1, 5];
    const next = () => outputs.shift() ?? 0;
    expect(uniformIndex(next, 3)).toBe(2);
    expect(outputs).toEqual([]);
  });
});

describe("PersonIndex and drawPeopleWithoutReplacement", () => {
  it("maps each person to the row that holds them", () => {
    const index = new PersonIndex([2, 3, 1]);
    expect(index.people).toBe(6);
    expect([0, 1, 2, 3, 4, 5].map((p) => index.rowOf(p))).toEqual([0, 0, 1, 1, 1, 2]);
  });

  it("drawing everyone yields each row exactly its count, then refuses", () => {
    const counts = [4, 1, 3, 2];
    const draw = drawPeopleWithoutReplacement(new PersonIndex(counts), mulberry32(9));
    const tally = [0, 0, 0, 0];
    for (let i = 0; i < 10; i++) tally[draw()]! += 1;
    expect(tally).toEqual(counts);
    expect(() => draw()).toThrow(ListFactsInputError);
  });

  it("refuses an empty list or a non-positive count", () => {
    expect(() => new PersonIndex([])).toThrow(ListFactsInputError);
    expect(() => new PersonIndex([2, 0])).toThrow(ListFactsInputError);
  });
});
