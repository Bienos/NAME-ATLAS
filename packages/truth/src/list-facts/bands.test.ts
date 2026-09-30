import { describe, expect, it } from "vitest";
import { listBands } from "./bands.js";
import { buildListHistogram } from "./histogram.js";
import { LIST_BANDS_METHOD_VERSION } from "../version.js";

/** `list_bands@1` on a synthetic list with a surname at each band edge, worked out by hand. */

describe("listBands", () => {
  it("puts each count in its band, edges included, and stores the surnames under 10", () => {
    const counts = [2, 2, 3, 9, 10, 99, 100, 999, 1000, 9999, 10000, 50000];
    expect(listBands(buildListHistogram(counts))).toEqual({
      method_version: LIST_BANDS_METHOD_VERSION,
      ranges: [
        { from: 2, to: 2, surnames: 2, people: 4 },
        { from: 3, to: 9, surnames: 2, people: 12 },
        { from: 10, to: 99, surnames: 2, people: 109 },
        { from: 100, to: 999, surnames: 2, people: 1099 },
        { from: 1000, to: 9999, surnames: 2, people: 10999 },
        { from: 10000, to: null, surnames: 2, people: 60000 },
      ],
      // The 2 band and the 3–9 band: 2 + 2.
      under_10: 4,
    });
  });

  it("keeps an empty band as a band with no surnames, and adds up to the list", () => {
    const bands = listBands(buildListHistogram([2, 5, 5, 11]));
    expect(bands.ranges.map((b) => [b.surnames, b.people])).toEqual([
      [1, 2],
      [2, 10],
      [1, 11],
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(bands.under_10).toBe(3);
    expect(bands.ranges.reduce((sum, b) => sum + b.people, 0)).toBe(23);
  });
});
