import { describe, expect, it } from "vitest";
import {
  clamp01,
  columnPath,
  countsByRank,
  lensArea,
  linearScale,
  RIBBON,
  ribbonPath,
  round4,
  skyDotRadius,
  skyPoint,
  sqrtScale,
  TREND,
  trendColumn,
  vennLayout,
} from "./list-atlas-geometry.js";

describe("scales", () => {
  it("maps a value onto [0, 1] and never outside it", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(linearScale(5, 10)).toBe(0.5);
    expect(linearScale(20, 10)).toBe(1);
    expect(linearScale(5, 0)).toBe(0);
    expect(linearScale(0, 10)).toBe(0);
    expect(sqrtScale(25, 100)).toBe(0.5);
    expect(round4(0.123456)).toBe(0.1235);
  });
});

describe("the sky (plate I)", () => {
  it("lays the dots out by rank, most common at the centre, deterministically", () => {
    expect(skyPoint(0, 1000).r).toBe(0);
    let previous = -1;
    for (const rank of [0, 1, 9, 99, 999]) {
      const { r } = skyPoint(rank, 1000);
      expect(r).toBeGreaterThan(previous);
      expect(r).toBeLessThanOrEqual(1);
      previous = r;
    }
    expect(skyPoint(999, 1000).r).toBeGreaterThan(0.99);
    expect(skyPoint(123, 1000)).toEqual(skyPoint(123, 1000));
    expect(skyPoint(0, 0)).toEqual({ r: 0, a: -Math.PI / 2 });
  });

  it("grows a dot with its count", () => {
    expect(skyDotRadius(100, 1)).toBeGreaterThan(skyDotRadius(2, 1));
    expect(skyDotRadius(100, 1)).toBeGreaterThan(skyDotRadius(100, 0.5));
  });

  it("expands a histogram into one count per surname, most common first", () => {
    const byRank = countsByRank([2, 5, 40], [3, 2, 1]);
    expect([...byRank]).toEqual([40, 5, 5, 2, 2, 2]);
    expect(countsByRank([], []).length).toBe(0);
  });
});

describe("the ribbons (plate II)", () => {
  it("joins a stretch of the people bar to a stretch of the surnames bar", () => {
    const path = ribbonPath(0.1, 0.5, 0.01, 0.2);
    expect(path.startsWith("M100 0 H500 ")).toBe(true);
    expect(path).toContain(`V${String(RIBBON.height)} H10 `);
    expect(path).toContain("200 182");
    expect(path.endsWith("Z")).toBe(true);
  });

  it("keeps every point inside the drawing box", () => {
    const xs = [...ribbonPath(-0.5, 1.5, -1, 2).matchAll(/[MHC ](-?\d+(?:\.\d+)?)/gu)].map((m) =>
      Number(m[1]),
    );
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(RIBBON.width);
    }
  });
});

describe("the two circles (plate VI)", () => {
  it("measures the shared area of two circles", () => {
    expect(lensArea(1, 1, 2)).toBe(0);
    expect(lensArea(1, 0.5, 0.2)).toBeCloseTo(Math.PI * 0.25, 12);
    expect(lensArea(1, 1, 0)).toBeCloseTo(Math.PI, 12);
    expect(lensArea(1, 1, 1)).toBeCloseTo((2 * Math.PI) / 3 - Math.sqrt(3) / 2, 12);
  });

  it("draws areas in the ratio of the sets, and their overlap in the ratio of the shared part", () => {
    const [a, b, both] = [408182, 420082, 229788];
    const v = vennLayout(a, b, both);
    expect(v.r2).toBe(1);
    expect((v.r1 / v.r2) ** 2).toBeCloseTo(a / b, 12);
    expect(v.d).toBeGreaterThan(v.r2 - v.r1);
    expect(v.d).toBeLessThan(v.r1 + v.r2);
    expect(lensArea(v.r1, v.r2, v.d) / (Math.PI * v.r2 ** 2)).toBeCloseTo(both / b, 9);
  });

  it("stays finite with empty or disjoint sets", () => {
    expect(vennLayout(0, 0, 0)).toEqual({ r1: 0, r2: 0, d: 0 });
    const apart = vennLayout(10, 10, 0);
    expect(apart.d).toBeCloseTo(2, 9);
  });
});

describe("the editions chart (plate VII)", () => {
  it("gives each of n slots an equal, centred column inside the box", () => {
    const columns = [0, 1, 2, 3, 4, 5, 6].map((i) => trendColumn(i, 7));
    expect(columns[0]!.x).toBeGreaterThan(0);
    const last = columns[6]!;
    expect(last.x + last.width).toBeLessThan(TREND.width);
    for (const column of columns) expect(column.width).toBe(columns[0]!.width);
    expect(round4(columns[1]!.x - columns[0]!.x)).toBe(round4(TREND.width / 7));
  });

  it("stands a column on the baseline, as tall as its fraction of the plot", () => {
    const column = trendColumn(0, 1);
    const path = columnPath(column, 1);
    expect(path.startsWith(`M${String(column.x)} ${String(TREND.height)}`)).toBe(true);
    const ys = [...path.matchAll(/[VQ]\s*[\d.]+\s+([\d.]+)|V([\d.]+)/gu)].map((m) =>
      Number(m[1] ?? m[2]),
    );
    expect(Math.min(...ys)).toBe(TREND.top);
    expect(columnPath(column, 0)).toBe("");
    expect(columnPath(column, -1)).toBe("");
  });
});
