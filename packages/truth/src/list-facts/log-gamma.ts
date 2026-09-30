/**
 * Log-gamma and ratios of binomial coefficients, accurate to double precision
 * at the sizes a published list reaches (N about 2 * 10^7), for `list_crowd@1`.
 *
 * `ln Γ(N)` is about 3 * 10^8 there, so subtracting two log-gammas directly
 * would leave only about eight good digits. Everything below therefore works
 * with *differences* `ln Γ(x + d) - ln Γ(x)`, written so that no large terms
 * cancel, or with a compensated sum of `log1p` terms.
 *
 * The stored expectations (`expected_distinct`, `share_without_namesake`)
 * use only the `log1p` sums of {@link logBinomialRatioTable}: those are good
 * to a few units in the last place, which the nine stored decimals of a value
 * near 10^5 need. The Stirling difference is kept for {@link logBinomialRatio}
 * beyond {@link LOG_RATIO_DIRECT_TERMS} factors, where it is good to about
 * 1e-13 relative.
 */

const HALF_LN_TWO_PI = 0.5 * Math.log(2 * Math.PI);

/** Below this argument the Stirling series is shifted upward by the recurrence. */
const STIRLING_MIN = 10;

/**
 * The Stirling tail S(z) = ln Γ(z) - [(z - 1/2) ln z - z + ln(2π)/2], by its
 * asymptotic series up to z^-13. For z >= 10 the first omitted term,
 * 3617 / (122400 z^15), is below 3e-17: double precision.
 */
function stirlingTail(z: number): number {
  const r = 1 / z;
  const r2 = r * r;
  return (
    r *
    (1 / 12 +
      r2 *
        (-1 / 360 +
          r2 *
            (1 / 1260 +
              r2 * (-1 / 1680 + r2 * (1 / 1188 + r2 * (-691 / 360360 + r2 * (1 / 156)))))))
  );
}

/** ln Γ(x) for x > 0. */
export function lnGamma(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) {
    throw new RangeError(`lnGamma is defined here for finite x > 0, got ${x}`);
  }
  // ln Γ(x) = ln Γ(x + s) - ln(x (x + 1) ... (x + s - 1)).
  let shift = 0;
  let z = x;
  while (z < STIRLING_MIN) {
    shift += Math.log(z);
    z += 1;
  }
  return (z - 0.5) * Math.log(z) - z + HALF_LN_TWO_PI + stirlingTail(z) - shift;
}

/**
 * ln Γ(x + d) - ln Γ(x) for x > 0 and d >= 0, without cancelling large terms:
 *
 *   (x - 1/2) log1p(d / x) + d ln(x + d) - d + S(x + d) - S(x)
 *
 * after shifting x up to at least 10 by the recurrence.
 */
export function lnGammaRatio(x: number, d: number): number {
  if (!(x > 0) || !Number.isFinite(x) || !(d >= 0) || !Number.isFinite(d)) {
    throw new RangeError(`lnGammaRatio needs finite x > 0 and d >= 0, got x=${x}, d=${d}`);
  }
  if (d === 0) return 0;
  // Γ(x + d)/Γ(x) = [Γ(x + s + d)/Γ(x + s)] * Π_{i<s} (x + i)/(x + d + i).
  let correction = 0;
  let z = x;
  while (z < STIRLING_MIN) {
    correction -= Math.log1p(d / z);
    z += 1;
  }
  return (
    (z - 0.5) * Math.log1p(d / z) +
    d * Math.log(z + d) -
    d +
    stirlingTail(z + d) -
    stirlingTail(z) +
    correction
  );
}

/**
 * Neumaier's compensated sum: the running total plus the rounding error each
 * addition dropped, so a long sum is good to about one unit in the last place
 * of its result rather than losing one per term.
 */
export class CompensatedSum {
  private total = 0;
  private lost = 0;

  add(term: number): void {
    const next = this.total + term;
    this.lost +=
      Math.abs(this.total) >= Math.abs(term) ? this.total - next + term : term - next + this.total;
    this.total = next;
  }

  get value(): number {
    return this.total + this.lost;
  }
}

/**
 * Up to this many factors, {@link logBinomialRatio} sums `log1p` terms
 * directly instead of using the Stirling difference.
 */
export const LOG_RATIO_DIRECT_TERMS = 2048;

/**
 * ln[ C(total - c, n) / C(total, n) ] for every c = 0 … maxC at one n, as a
 * table indexed by c.
 *
 * The ratio is Π_{j<c} (total - n - j) / (total - j), so entry c is entry
 * c - 1 plus `log1p(-n / (total - c + 1))`: one compensated running sum of
 * same-signed `log1p` terms, no log-gamma and no cancellation. The entry is
 * -Infinity once c > total - n (n people can then no longer avoid all c).
 */
export function logBinomialRatioTable(total: number, n: number, maxC: number): Float64Array {
  for (const [name, value] of [
    ["total", total],
    ["n", n],
    ["maxC", maxC],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(
        `logBinomialRatioTable needs a non-negative integer ${name}, got ${value}`,
      );
    }
  }
  if (n > total || maxC > total) {
    throw new RangeError(
      `logBinomialRatioTable needs n, maxC <= total, got n=${n}, maxC=${maxC}, total=${total}`,
    );
  }
  const table = new Float64Array(maxC + 1);
  const sum = new CompensatedSum();
  for (let c = 1; c <= maxC; c++) {
    if (c > total - n) {
      table.fill(-Infinity, c);
      break;
    }
    sum.add(Math.log1p(-n / (total - c + 1)));
    table[c] = sum.value;
  }
  return table;
}

/**
 * ln[ C(total - c, n) / C(total, n) ]: the log-probability that n people drawn
 * without replacement from `total` include none of a set of `c`.
 *
 * The ratio equals Π_{i<m} (1 - o / (total - i)) with m = min(c, n) and
 * o = max(c, n). Up to `directTerms` factors it is a compensated sum of
 * `log1p` terms; beyond that it is the difference of two brackets,
 * [ln Γ(total - o + 1) - ln Γ(total - o - m + 1)] and
 * [ln Γ(total + 1) - ln Γ(total - m + 1)], each by {@link lnGammaRatio}.
 * Returns -Infinity when c + n > total (the draw cannot avoid the set).
 */
export function logBinomialRatio(
  total: number,
  c: number,
  n: number,
  directTerms: number = LOG_RATIO_DIRECT_TERMS,
): number {
  for (const [name, value] of [
    ["total", total],
    ["c", c],
    ["n", n],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`logBinomialRatio needs a non-negative integer ${name}, got ${value}`);
    }
  }
  if (c > total || n > total) {
    throw new RangeError(
      `logBinomialRatio needs c, n <= total, got c=${c}, n=${n}, total=${total}`,
    );
  }
  if (c === 0 || n === 0) return 0;
  if (c + n > total) return -Infinity;
  const m = Math.min(c, n);
  const o = Math.max(c, n);
  if (m <= directTerms) {
    const sum = new CompensatedSum();
    for (let i = 0; i < m; i++) sum.add(Math.log1p(-o / (total - i)));
    return sum.value;
  }
  return lnGammaRatio(total - o - m + 1, m) - lnGammaRatio(total - m + 1, m);
}
