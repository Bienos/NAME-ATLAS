import { describe, expect, it } from "vitest";
import { stepCard, swipeStep } from "./studio-viewer.js";

/** The studio's cards switched in place: which card a step or a swipe leads to. */

const KEYS = ["summary", "rarity", "where"];

describe("the studio's card switch", () => {
  it("steps to the neighbour and stops at either end", () => {
    expect(stepCard(KEYS, "summary", 1)).toBe("rarity");
    expect(stepCard(KEYS, "rarity", -1)).toBe("summary");
    expect(stepCard(KEYS, "where", 1)).toBe("where");
    expect(stepCard(KEYS, "summary", -1)).toBe("summary");
    expect(stepCard(KEYS, "horoscope", 1)).toBe("summary");
  });

  it("reads a long, flat swipe as a step and anything else as none", () => {
    expect(swipeStep(-80, 10)).toBe(1);
    expect(swipeStep(80, -10)).toBe(-1);
    expect(swipeStep(-30, 0)).toBeNull();
    expect(swipeStep(-80, 70)).toBeNull();
  });
});
