import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CompensatedSum,
  lnGamma,
  lnGammaRatio,
  logBinomialRatio,
  logBinomialRatioTable,
} from "./log-gamma.js";

/**
 * The log-gamma and binomial-ratio helpers of `list_crowd@1`, checked against
 * exact factorials, reference values and exact BigInt binomials.
 */

function factorial(n: number): bigint {
  let out = 1n;
  for (let i = 2; i <= n; i++) out *= BigInt(i);
  return out;
}

function binomial(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  let out = 1n;
  for (let i = 0; i < k; i++) out = (out * BigInt(n - i)) / BigInt(i + 1);
  return out;
}

/** ln of a positive BigInt, to double precision, however large. */
function lnBig(x: bigint): number {
  const digits = x.toString();
  const head = Number(digits.slice(0, 17));
  return Math.log(head) + (digits.length - Math.min(17, digits.length)) * Math.LN10;
}

describe("lnGamma", () => {
  it("is exact at the small integers and at one half", () => {
    expect(lnGamma(1)).toBeCloseTo(0, 15);
    expect(lnGamma(2)).toBeCloseTo(0, 15);
    expect(lnGamma(0.5)).toBeCloseTo(0.5 * Math.log(Math.PI), 14);
  });

  it("equals ln((x - 1)!) to double precision for x = 1 … 300", () => {
    for (let x = 1; x <= 300; x++) {
      const exact = lnBig(factorial(x - 1));
      expect(Math.abs(lnGamma(x) - exact)).toBeLessThanOrEqual(1e-14 * Math.max(1, exact));
    }
  });

  it("matches reference values", () => {
    // ln(100!) = 363.73937555556349014…, ln(1000!) = 5912.1281784881633488…
    // (40-digit decimal logarithms of the exact factorials).
    expect(lnGamma(101)).toBeCloseTo(363.73937555556347, 11);
    expect(lnGamma(1001)).toBeCloseTo(5912.128178488163, 9);
  });

  it("refuses x <= 0", () => {
    expect(() => lnGamma(0)).toThrow(RangeError);
    expect(() => lnGamma(-1.5)).toThrow(RangeError);
  });
});

describe("lnGammaRatio", () => {
  it("equals ln Γ(x + d) - ln Γ(x) where that difference is well conditioned", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 50, noNaN: true }),
        fc.double({ min: 0, max: 50, noNaN: true }),
        (x, d) => {
          const direct = lnGamma(x + d) - lnGamma(x);
          expect(Math.abs(lnGammaRatio(x, d) - direct)).toBeLessThan(1e-11);
        },
      ),
    );
  });

  it("equals a direct sum of logs at the size of a published list", () => {
    // Γ(x + d)/Γ(x) = x (x + 1) … (x + d - 1) for integer d.
    for (const [x, d] of [
      [21197537, 1],
      [21197537, 50],
      [20000000, 3000],
      [123456, 999],
    ] as const) {
      let direct = 0;
      for (let i = 0; i < d; i++) direct += Math.log(x + i);
      // The direct sum itself carries rounding from d additions.
      expect(Math.abs(lnGammaRatio(x, d) - direct)).toBeLessThanOrEqual(1e-13 * direct);
    }
  });
});

describe("logBinomialRatio", () => {
  it("equals ln[C(N - c, n) / C(N, n)] exactly computed, on both paths", () => {
    for (const total of [1, 7, 30, 64]) {
      for (let c = 0; c <= total; c++) {
        for (let n = 0; n <= total; n++) {
          const num = binomial(total - c, n);
          const exact = num === 0n ? -Infinity : lnBig(num) - lnBig(binomial(total, n));
          for (const directTerms of [Infinity, 0]) {
            const got = logBinomialRatio(total, c, n, directTerms);
            if (exact === -Infinity) expect(got).toBe(-Infinity);
            else expect(Math.abs(got - exact)).toBeLessThan(1e-11);
          }
        }
      }
    }
  });

  it("the log1p sum and the Stirling difference agree at the size of a published list", () => {
    const total = 21197537;
    for (const [c, n] of [
      [2, 1000000],
      [98387, 100],
      [1500, 1000],
      [2000, 2000],
      [30000, 100000],
    ] as const) {
      const direct = logBinomialRatio(total, c, n, Infinity);
      const stirling = logBinomialRatio(total, c, n, 0);
      expect(Math.abs(direct - stirling)).toBeLessThanOrEqual(1e-9 * Math.max(1, -direct));
    }
  });

  it("is 0 for an empty set or an empty draw, and refuses impossible arguments", () => {
    expect(logBinomialRatio(10, 0, 5)).toBe(0);
    expect(logBinomialRatio(10, 5, 0)).toBe(0);
    expect(logBinomialRatio(10, 6, 5)).toBe(-Infinity);
    expect(() => logBinomialRatio(10, 11, 1)).toThrow(RangeError);
    expect(() => logBinomialRatio(10, 1, 1.5)).toThrow(RangeError);
    expect(() => logBinomialRatio(-1, 0, 0)).toThrow(RangeError);
  });
});

describe("CompensatedSum", () => {
  it("keeps what a plain sum drops", () => {
    const cancelling = new CompensatedSum();
    for (const term of [1e100, 1, -1e100]) cancelling.add(term);
    expect(cancelling.value).toBe(1);

    const long = new CompensatedSum();
    let plain = 1;
    long.add(1);
    for (let i = 0; i < 10000; i++) {
      long.add(1e-16);
      plain += 1e-16;
    }
    expect(plain).toBe(1);
    expect(long.value).toBeCloseTo(1 + 1e-12, 15);
  });

  it("is 0 when nothing was added", () => {
    expect(new CompensatedSum().value).toBe(0);
  });
});

describe("logBinomialRatioTable", () => {
  it("entry c equals ln[C(N - c, n) / C(N, n)] exactly computed", () => {
    for (const total of [1, 7, 30, 64]) {
      for (let n = 0; n <= total; n++) {
        const table = logBinomialRatioTable(total, n, total);
        expect(table).toHaveLength(total + 1);
        for (let c = 0; c <= total; c++) {
          const num = binomial(total - c, n);
          const exact = num === 0n ? -Infinity : lnBig(num) - lnBig(binomial(total, n));
          if (exact === -Infinity) expect(table[c]).toBe(-Infinity);
          else expect(Math.abs(table[c]! - exact)).toBeLessThan(1e-11);
        }
      }
    }
  });

  it("agrees with the direct log1p product at the size of a published list", () => {
    const total = 21197537;
    for (const n of [100, 10000, 1000000]) {
      const table = logBinomialRatioTable(total, n, 100000);
      for (const c of [1, 2, 7, 2049, 50000, 100000]) {
        const direct = logBinomialRatio(total, c, n, Infinity);
        expect(Math.abs(table[c]! - direct)).toBeLessThanOrEqual(1e-14 * Math.max(1, -direct));
      }
    }
  });

  it("refuses impossible arguments", () => {
    expect(() => logBinomialRatioTable(10, 11, 1)).toThrow(RangeError);
    expect(() => logBinomialRatioTable(10, 1, 11)).toThrow(RangeError);
    expect(() => logBinomialRatioTable(10, 1.5, 1)).toThrow(RangeError);
    expect(() => logBinomialRatioTable(-1, 0, 0)).toThrow(RangeError);
  });
});
