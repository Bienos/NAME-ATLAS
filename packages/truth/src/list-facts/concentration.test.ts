import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { concentrationLevel, listConcentration } from "./concentration.js";
import { buildListHistogram } from "./histogram.js";
import { LIST_CONCENTRATION_METHOD_VERSION } from "../version.js";

/** `list_concentration@1` on synthetic lists worked out by hand, then a brute force. */

describe("listConcentration", () => {
  it("finds the fewest most common surnames carrying each share of the people", () => {
    // 40, 25, 20, 3, 2: N = 90. q = 0.1 needs 9 → 40 (1 surname). q = 0.5 needs 45 →
    // 40 + 25 = 65 (2). q = 0.9 needs 81 → 40 + 25 + 20 = 85 (3). Beyond half: 5 − 2 = 3.
    expect(listConcentration(buildListHistogram([3, 40, 2, 25, 20]))).toEqual({
      method_version: LIST_CONCENTRATION_METHOD_VERSION,
      levels: [
        { q: 0.1, surnames: 1, people: 40 },
        { q: 0.5, surnames: 2, people: 65 },
        { q: 0.9, surnames: 3, people: 85 },
      ],
      beyond_half: 3,
    });
  });

  it("counts a share reached exactly as reached, and ties do not change the answer", () => {
    // Four surnames of 10: N = 40. q = 0.5 needs 20 → exactly 20 after 2 surnames.
    expect(listConcentration(buildListHistogram([10, 10, 10, 10]))).toEqual({
      method_version: LIST_CONCENTRATION_METHOD_VERSION,
      levels: [
        { q: 0.1, surnames: 1, people: 10 },
        { q: 0.5, surnames: 2, people: 20 },
        { q: 0.9, surnames: 4, people: 40 },
      ],
      beyond_half: 2,
    });
  });

  it("reaches a share exactly on the boundary, decided in integers", () => {
    // Ten surnames of 3: N = 30. q = 0.1 is exactly 3 people (one surname) and q = 0.9
    // exactly 27 (nine): 3 × 1000 >= 100 × 30 and 27 × 1000 >= 900 × 30, with no float.
    const histogram = buildListHistogram(Array<number>(10).fill(3));
    expect(concentrationLevel(histogram, 0.1)).toEqual({ q: 0.1, surnames: 1, people: 3 });
    expect(concentrationLevel(histogram, 0.9)).toEqual({ q: 0.9, surnames: 9, people: 27 });
    // N = 9 (5 + 4): half is 4.5, and 5 people are at least that.
    expect(concentrationLevel(buildListHistogram([4, 5]), 0.5)).toEqual({
      q: 0.5,
      surnames: 1,
      people: 5,
    });
  });

  it("agrees with sorting every surname and counting up", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 2, max: 60 }), { minLength: 1, maxLength: 80 }),
        (c) => {
          const sorted = [...c].sort((a, b) => b - a);
          const total = c.reduce((a, b) => a + b, 0);
          for (const [q, tenths] of [
            [0.1, 1],
            [0.5, 5],
            [0.9, 9],
          ] as const) {
            let k = 0;
            let people = 0;
            while (people * 10 < tenths * total) people += sorted[k++]!;
            expect(concentrationLevel(buildListHistogram(c), q)).toEqual({
              q,
              surnames: k,
              people,
            });
          }
        },
      ),
    );
  });
});
