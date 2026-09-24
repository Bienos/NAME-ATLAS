import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { MAP_CLASS_COUNT, mapClass, mapScale } from "./voivodeship-map-scale.js";

describe("mapScale", () => {
  it("picks the smallest round band width that lets five bands reach the largest share", () => {
    // NOWAK's largest regional share in the real register is WIELKOPOLSKIE at ~18.5%.
    expect(mapScale([0.185, 0.02]).step).toBeCloseTo(0.04);
    expect(mapScale([0.5, 0.5]).step).toBeCloseTo(0.1);
    expect(mapScale([1]).step).toBeCloseTo(0.2);
    expect(mapScale([0.021]).step).toBeCloseTo(0.005);
  });

  it("starts at zero with five equal bands", () => {
    const scale = mapScale([0.185]);
    expect(scale.bounds).toHaveLength(MAP_CLASS_COUNT);
    expect(scale.bounds[0]).toBe(0);
    expect(scale.bounds[4]).toBeCloseTo(0.16);
  });
});

describe("mapClass", () => {
  it("puts a share on a band edge into the band that starts there", () => {
    const scale = mapScale([0.2]);
    expect(mapClass(scale, 0.04)).toBe(1);
    expect(mapClass(scale, 0.0399)).toBe(0);
    expect(mapClass(scale, 0.2)).toBe(4);
  });

  it("places every share of any distribution inside its band, and the largest in the top half", () => {
    // Shares as the real data has them: counts over their own sum, across at
    // most the 16 voivodeships — so the largest share is always >= 1/16.
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 2, max: 100_000 }), { minLength: 1, maxLength: 16 }),
        (counts) => {
          const total = counts.reduce((a, b) => a + b, 0);
          const shares = counts.map((c) => c / total);
          const scale = mapScale(shares);
          for (const share of shares) {
            const band = mapClass(scale, share);
            expect(band).toBeGreaterThanOrEqual(0);
            expect(band).toBeLessThan(MAP_CLASS_COUNT);
            expect(share).toBeGreaterThanOrEqual(scale.bounds[band]! - 1e-9);
          }
          // Each band width is at most double the next smaller one, so the
          // largest share always lands in band 2 or above: the ramp is used.
          expect(mapClass(scale, Math.max(...shares))).toBeGreaterThanOrEqual(2);
        },
      ),
    );
  });
});
