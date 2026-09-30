import { describe, expect, it } from "vitest";
import { listDots } from "./dots.js";
import { buildListHistogram } from "./histogram.js";
import { LIST_DOTS_METHOD_VERSION } from "../version.js";

/** `list_dots@1` on a synthetic list, worked out by hand. */

describe("listDots", () => {
  it("lists each distinct count once, ascending, with how many surnames have it", () => {
    // Counts 5, 2, 40, 5, 3, 2, 5: two surnames of 2, one of 3, three of 5, one of 40.
    const dots = listDots(buildListHistogram([5, 2, 40, 5, 3, 2, 5]));
    expect(dots).toEqual({
      method_version: LIST_DOTS_METHOD_VERSION,
      histogram: [
        { count: 2, surnames: 2 },
        { count: 3, surnames: 1 },
        { count: 5, surnames: 3 },
        { count: 40, surnames: 1 },
      ],
    });
    // 7 surnames; 2·2 + 3 + 3·5 + 40 = 62 people.
    expect(dots.histogram.reduce((sum, d) => sum + d.surnames, 0)).toBe(7);
    expect(dots.histogram.reduce((sum, d) => sum + d.count * d.surnames, 0)).toBe(62);
  });

  it("is the same whatever the file order", () => {
    expect(listDots(buildListHistogram([2, 3, 2]))).toEqual(
      listDots(buildListHistogram([3, 2, 2])),
    );
  });
});
