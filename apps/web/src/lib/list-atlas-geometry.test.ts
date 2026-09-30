import { describe, expect, it } from "vitest";
import {
  anchorFor,
  clamp01,
  crowdLayout,
  dotStackLevels,
  fitsAt,
  fitTiers,
  LABEL_TIERS_EM,
  linearPosition,
  logPosition,
  logPositionIn,
  niceTicks,
  polylinePath,
  powersOfTen,
  roomSeats,
  round1,
  seededRandom,
} from "./list-atlas-geometry.js";

/** TASK-040: presentation geometry only — positions and layouts, never a figure. */

describe("axes", () => {
  it("places counts on a log axis over [1, max]", () => {
    expect(logPosition(1, 100000)).toBe(0);
    expect(logPosition(100000, 100000)).toBe(1);
    expect(logPosition(100, 10000)).toBeCloseTo(0.5, 12);
    expect(logPosition(0, 100)).toBe(0);
    expect(logPosition(10, 1)).toBe(0);
  });

  it("places values on a log axis over [min, max] and a linear one, clamped", () => {
    expect(logPositionIn(1000, 100, 100000)).toBeCloseTo(1 / 3, 12);
    expect(logPositionIn(50, 100, 1000)).toBe(0);
    expect(linearPosition(82, 0, 300)).toBeCloseTo(0.27333, 4);
    expect(linearPosition(400, 0, 300)).toBe(1);
  });

  it("gives round ticks", () => {
    expect(powersOfTen(2, 98387)).toEqual([10, 100, 1000, 10000]);
    expect(niceTicks(300, 3)).toEqual([0, 100, 200, 300]);
    expect(niceTicks(150, 3)).toEqual([0, 50, 100, 150]);
    expect(niceTicks(0)).toEqual([0]);
  });

  it("draws a polyline with y measured upwards", () => {
    expect(
      polylinePath(
        [
          [0, 0],
          [0.5, 1],
        ],
        1000,
        1000,
      ),
    ).toBe("M0 1000L500 0");
  });
});

describe("fitTiers", () => {
  const label = (x: number, chars: number, away?: "start" | "end") => ({
    x,
    chars,
    ...(away === undefined ? {} : { away }),
  });
  // Row widths in em: 300px and 800px at 100% text.
  const TWO = [300 / 16, 800 / 16];

  it("keeps the most important labels first and draws the rest only where they fit", () => {
    // On a 300px row "10 000" at 0.8 and "98 387" hung from the right edge collide.
    const fits = fitTiers([label(0.8, 6), label(1, 6), label(0.4, 3)], [1, 0, 2], [], TWO);
    expect(fits.map((f) => f.tier)).toEqual([1, 0, 0]);
    expect(fits[1]?.anchor).toBe("end");
  });

  it("drops a label everywhere when it collides even on the widest row", () => {
    const fits = fitTiers([label(0.5, 4), label(0.505, 4)], [0, 1], [], TWO);
    expect(fits.map((f) => f.tier)).toEqual([0, -1]);
  });

  it("keeps a label off a reserved mark", () => {
    const fits = fitTiers([label(0.2, 12), label(0.6, 3)], [0, 1], [0.15], [300 / 16]);
    expect(fits.map((f) => f.tier)).toEqual([-1, 0]);
  });

  it("nests the tiers: a label drawn at one width is drawn at every wider one, clear of the rest", () => {
    // A wider row lets the second label in; it can never push out the first.
    const row = [label(0.45, 6), label(0.55, 6), label(0.9, 3)];
    const fits = fitTiers(row, [0, 1, 2], [], LABEL_TIERS_EM);
    expect(fits[0]?.tier).toBe(0);
    expect(fits[1]?.tier).toBeGreaterThan(0);
    // Every pair drawn together at a tier's width is apart there.
    for (const [tier, em] of LABEL_TIERS_EM.entries()) {
      const px = em * 16;
      const drawn = fits
        .map((fit, i) => ({ fit, l: row[i]! }))
        .filter(({ fit }) => fit.tier !== -1 && fit.tier <= tier)
        .map(({ fit, l }) => {
          const w = l.chars * 7.2;
          const at = l.x * px;
          const from = fit.anchor === "start" ? at : fit.anchor === "end" ? at - w : at - w / 2;
          return [from, from + w] as const;
        })
        .sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < drawn.length; i++) {
        expect(drawn[i]![0], `tier ${String(tier)}`).toBeGreaterThanOrEqual(drawn[i - 1]![1]);
      }
    }
  });

  it("fits against text size: a label too long for a phone row at 200% text waits for a wider row", () => {
    // 22 characters of the data face are 158px: wider than the narrowest tier's row.
    const fits = fitTiers([label(0.6, 22)], [0]);
    expect(fits[0]?.tier).toBeGreaterThan(0);
    expect(LABEL_TIERS_EM[fits[0]!.tier]! * 16).toBeGreaterThanOrEqual(22 * 7.2);
  });

  it("hangs a label its preferred way where that fits, and centres it otherwise", () => {
    expect(fitTiers([label(0.5, 3, "start")], [0])[0]?.anchor).toBe("start");
    expect(fitTiers([label(0.99, 3, "start")], [0])[0]?.anchor).toBe("end");
  });

  it("hangs a label from its mark so it stays inside the row", () => {
    expect(anchorFor(0, 3, 300)).toBe("start");
    expect(anchorFor(1, 6, 300)).toBe("end");
    expect(anchorFor(0.5, 6, 300)).toBe("middle");
  });
});

describe("dotStackLevels", () => {
  it("stacks overlapping dots and leaves separate ones on the baseline", () => {
    expect(dotStackLevels([10, 12, 14, 100], 10)).toEqual([0, 1, 2, 0]);
    expect(dotStackLevels([50, 10, 11], 5)).toEqual([0, 0, 1]);
  });
});

describe("crowdLayout", () => {
  const sizes = [11, 6, 5, 4, 4, 3, 3, ...new Array<number>(40).fill(2)];
  const layout = crowdLayout(1000, sizes, 20261120);

  it("draws exactly one dot per person", () => {
    expect(layout.points).toHaveLength(1000);
    const keys = new Set(layout.points.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`));
    expect(keys.size).toBe(1000);
  });

  it("seats every group whole, joined by a tree of links between neighbours", () => {
    sizes.forEach((size, g) => {
      expect(layout.group.filter((x) => x === g)).toHaveLength(size);
    });
    const members = sizes.reduce((a, b) => a + b, 0);
    expect(layout.group.filter((x) => x === -1)).toHaveLength(1000 - members);
    // A tree over each group: one link fewer than its members.
    expect(layout.links).toHaveLength(members - sizes.length);
    for (const [a, b] of layout.links) {
      expect(layout.group[a]).toBe(layout.group[b]);
      const pa = layout.points[a]!;
      const pb = layout.points[b]!;
      expect(Math.hypot(pa.x - pb.x, pa.y - pb.y)).toBeCloseTo(1, 6);
    }
  });

  it("is deterministic: the same draw always gives the same picture", () => {
    expect(crowdLayout(1000, sizes, 20261120)).toEqual(layout);
  });
});

describe("roomSeats", () => {
  it("has enough seats in rows of twelve, never fewer than ten rows", () => {
    expect(roomSeats(98).seats).toHaveLength(120);
    expect(roomSeats(157).rows).toBe(14);
    expect(roomSeats(157).seats).toHaveLength(168);
    const [first, sixth, seventh] = [0, 5, 6].map((i) => roomSeats(98).seats[i]!);
    expect(first).toEqual({ x: 0, y: 0 });
    expect(sixth).toEqual({ x: 5, y: 0 });
    // The aisle: the second block starts two columns further on.
    expect(seventh).toEqual({ x: 8, y: 0 });
  });
});

describe("small helpers", () => {
  it("clamps to [0, 1]", () => {
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.37)).toBe(0.37);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(1.5)).toBe(1);
  });

  it("rounds a coordinate to one decimal", () => {
    expect(round1(12.34)).toBe(12.3);
    expect(round1(12.35)).toBe(12.4);
    expect(round1(-3.26)).toBe(-3.3);
    expect(round1(7)).toBe(7);
  });

  it("scatters marks with a seeded generator: the same seed, the same sequence, in [0, 1)", () => {
    const a = seededRandom(20261120);
    const b = seededRandom(20261120);
    const c = seededRandom(20261121);
    const first = Array.from({ length: 1000 }, () => a());
    expect(Array.from({ length: 1000 }, () => b())).toEqual(first);
    expect(Array.from({ length: 1000 }, () => c())).not.toEqual(first);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    // Pinned: if the generator drifted, every drawn crowd would move.
    expect(seededRandom(0)()).toBeCloseTo(0.26642920868471265, 15);
  });
});

describe("fitsAt", () => {
  it("tells whether a label hung from its mark stays inside the row", () => {
    // Three characters of the data face: 21.6px.
    expect(fitsAt(0.574, 3, 316, "start")).toBe(true);
    expect(fitsAt(0.97, 3, 316, "start")).toBe(false);
    expect(fitsAt(0.97, 3, 316, "end")).toBe(true);
    expect(fitsAt(0.03, 3, 316, "end")).toBe(false);
    expect(fitsAt(0.5, 3, 316, "middle")).toBe(true);
    expect(fitsAt(0.01, 3, 316, "middle")).toBe(false);
  });
});
