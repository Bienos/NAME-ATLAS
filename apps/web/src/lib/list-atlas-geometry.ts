/**
 * Presentation geometry for the landing atlas (TASK-040; six plates since
 * TASK-043, seven since TASK-044): where a mark sits on a plate, never what a
 * figure is.
 *
 * Every function here turns numbers that `listFacts()` already carries into
 * positions, scales and sizes. None of them returns a figure a reader is
 * shown: the plates print the artefact's own values, formatted by
 * `messages.ts`, and use these only to place them (ADR-0015 §2.5: "Positions
 * and scales are presentation geometry").
 *
 * Deterministic on purpose: the same artefact always draws the same picture,
 * so a server render, a redraw after a list switch and a screenshot agree.
 */

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** `value` on a linear scale from 0 to `max`, as a fraction; 0 when there is no scale. */
export function linearScale(value: number, max: number): number {
  if (!(max > 0) || !(value > 0)) return 0;
  return clamp01(value / max);
}

/** `value` on a square-root scale from 0 to `max`: a mark whose area grows with the value. */
export function sqrtScale(value: number, max: number): number {
  return Math.sqrt(linearScale(value, max));
}

/** A fraction for a CSS custom property or an SVG attribute: at most four decimals. */
export function round4(x: number): number {
  return Number(x.toFixed(4));
}

// --- plate I: the constellation -----------------------------------------------

/** The golden angle, so consecutive ranks never line up into spokes. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Where the surname at `rank` (0 = the list's most common) of `n` sits in the
 * sky: its distance from the centre as a fraction of the radius, on a log
 * scale of rank, and its angle on a golden-angle spiral. No randomness: the
 * same list always draws the same sky.
 */
export function skyPoint(rank: number, n: number): { readonly r: number; readonly a: number } {
  const r = n > 0 ? clamp01(Math.log(rank + 1) / Math.log(n + 1)) : 0;
  return { r, a: rank * GOLDEN_ANGLE - Math.PI / 2 };
}

/** A dot's radius in px for a surname with `count` bearers, in a sky `scale` of its full size. */
export function skyDotRadius(count: number, scale: number): number {
  return (0.35 + 0.021 * Math.sqrt(Math.max(0, count))) * Math.max(0.5, scale);
}

/**
 * The counts of a `dots` histogram (ascending by count) in rank order, most
 * common first: one entry per surname. Used only to place the dots.
 */
export function countsByRank(counts: readonly number[], surnames: readonly number[]): Uint32Array {
  let n = 0;
  for (const s of surnames) n += s;
  const out = new Uint32Array(n);
  let rank = n - 1;
  for (let i = 0; i < counts.length; i++) {
    const count = counts[i] ?? 0;
    const k = surnames[i] ?? 0;
    for (let j = 0; j < k; j++) out[rank--] = count;
  }
  return out;
}

// --- plate II: half -------------------------------------------------------------

/** The ribbons' drawing box: a people bar on top, a surnames bar below. */
export const RIBBON = { width: 1000, height: 200, bar: 18 } as const;

/**
 * One ribbon of plate II: the part of the people bar from `top0` to `top1`
 * (fractions of the list's people) joined to the part of the surnames bar from
 * `bottom0` to `bottom1` (fractions of its surnames), as an SVG path in the
 * {@link RIBBON} box.
 */
export function ribbonPath(top0: number, top1: number, bottom0: number, bottom1: number): string {
  const { width: w, height: h, bar } = RIBBON;
  const x = (f: number) => round4(clamp01(f) * w);
  const yTop = bar;
  const yBottom = h - bar;
  const mid = (yTop + yBottom) / 2;
  return [
    `M${x(top0)} 0`,
    `H${x(top1)}`,
    `V${yTop}`,
    `C${x(top1)} ${mid} ${x(bottom1)} ${mid} ${x(bottom1)} ${yBottom}`,
    `V${h}`,
    `H${x(bottom0)}`,
    `V${yBottom}`,
    `C${x(bottom0)} ${mid} ${x(top0)} ${mid} ${x(top0)} ${yTop}`,
    "Z",
  ].join(" ");
}

// --- plate VI: two lists --------------------------------------------------------

/** The area two circles of radii r1 and r2 share when their centres are d apart. */
export function lensArea(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const c = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return a + b - c;
}

export interface VennLayout {
  /** Radii, the larger circle's being 1. */
  readonly r1: number;
  readonly r2: number;
  /** Distance between the centres, in the same unit. */
  readonly d: number;
}

/**
 * An area-proportional two-circle diagram: circle areas in the ratio of `a`
 * to `b`, their overlap in the ratio of `both`. The distance is found by
 * bisection (the shared area falls as the centres move apart). Geometry only:
 * the figures it is drawn from are printed beside it.
 */
export function vennLayout(a: number, b: number, both: number): VennLayout {
  const big = Math.max(a, b);
  if (!(big > 0)) return { r1: 0, r2: 0, d: 0 };
  const r1 = Math.sqrt(Math.max(0, a) / big);
  const r2 = Math.sqrt(Math.max(0, b) / big);
  const target = (Math.PI * Math.max(0, both)) / big;
  let lo = Math.abs(r1 - r2);
  let hi = r1 + r2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (lensArea(r1, r2, mid) > target) lo = mid;
    else hi = mid;
  }
  return { r1, r2, d: (lo + hi) / 2 };
}

// --- plate VII: change over time ------------------------------------------------

/**
 * The editions chart's drawing box: one slot per edition (or gap) across the
 * width, each column a fraction `bar` of its slot, standing on the baseline
 * with its top corners rounded. Scaled uniformly, so corners and dashes keep
 * their shape at any width.
 */
export const TREND = { width: 700, height: 220, top: 6, bar: 0.56, radius: 6 } as const;

export interface TrendColumn {
  /** Left edge, in the {@link TREND} box. */
  readonly x: number;
  readonly width: number;
}

/** Slot `i` of `n` in the {@link TREND} box: its column, centred in the slot. */
export function trendColumn(i: number, n: number): TrendColumn {
  const slot = TREND.width / Math.max(1, n);
  const width = slot * TREND.bar;
  return { x: round4(i * slot + (slot - width) / 2), width: round4(width) };
}

/**
 * A column `h` tall (a fraction of the plot's height, from `linearScale`) on
 * the baseline of the {@link TREND} box, top corners rounded, as an SVG path.
 * Empty for a column of no height.
 */
export function columnPath(column: TrendColumn, h: number): string {
  const height = clamp01(h) * (TREND.height - TREND.top);
  if (!(height > 0)) return "";
  const r = Math.min(TREND.radius, column.width / 2, height);
  const base = TREND.height;
  const x0 = column.x;
  const x1 = column.x + column.width;
  const y = base - height;
  const n = (v: number) => String(round4(v));
  return [
    `M${n(x0)} ${n(base)}`,
    `V${n(y + r)}`,
    `Q${n(x0)} ${n(y)} ${n(x0 + r)} ${n(y)}`,
    `H${n(x1 - r)}`,
    `Q${n(x1)} ${n(y)} ${n(x1)} ${n(y + r)}`,
    `V${n(base)}`,
    "Z",
  ].join(" ");
}

// --- plates 05, 09 and 10 (TASK-178) --------------------------------------------

/**
 * `value` on a logarithmic scale from 1 to `max`, as a fraction: a ladder whose
 * rungs differ by orders of magnitude keeps every rung visible. 0 for a value
 * of 1 or less.
 */
export function logScale(value: number, max: number): number {
  if (!(max > 1) || !(value > 1)) return 0;
  return clamp01(Math.log(value) / Math.log(max));
}

/** The shared-surname curve's drawing box (plate 09). */
export const CURVE = { width: 1000, height: 360 } as const;

/** A point of the curve: `n` on the x axis between `nMin` and `nMax`, `p` up the y axis. */
export function curvePoint(
  n: number,
  p: number,
  nMin: number,
  nMax: number,
): { readonly x: number; readonly y: number } {
  const span = nMax - nMin;
  const x = span > 0 ? ((n - nMin) / span) * CURVE.width : 0;
  return { x: round4(x), y: round4(CURVE.height - clamp01(p) * CURVE.height) };
}

/** The curve as an SVG path through its stored points, in their stored order. */
export function curvePath(points: readonly { readonly n: number; readonly p: number }[]): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return "";
  return points
    .map((point, i) => {
      const { x, y } = curvePoint(point.n, point.p, first.n, last.n);
      return `${i === 0 ? "M" : "L"}${String(x)} ${String(y)}`;
    })
    .join(" ");
}

/** The crowd's grid (plate 10): `cols` dots to a row, `cell` units apart. */
export const CROWD = { cols: 50, cell: 20, radius: 6 } as const;

/** Where the k-th person of the crowd sits: row by row, left to right. */
export function crowdDot(k: number): { readonly cx: number; readonly cy: number } {
  const col = k % CROWD.cols;
  const row = Math.floor(k / CROWD.cols);
  return { cx: CROWD.cell / 2 + col * CROWD.cell, cy: CROWD.cell / 2 + row * CROWD.cell };
}

/** The grid's height in drawing units for `n` people. */
export function crowdHeight(n: number): number {
  return Math.ceil(n / CROWD.cols) * CROWD.cell;
}

// --- Part II (TASK-178): a line over the years --------------------------------

/** The year charts' drawing box. */
export const YEARS = { width: 1000, height: 220 } as const;

/** The i-th of n years as an x position across the box. */
export function yearX(i: number, n: number): number {
  return n <= 1 ? 0 : round4((i / (n - 1)) * YEARS.width);
}

/** A value between `min` and `max` as a y position up the box, with a little headroom. */
export function yearY(value: number, min: number, max: number): number {
  const span = max - min;
  const t = span > 0 ? clamp01((value - min) / span) : 0.5;
  return round4(YEARS.height - 12 - t * (YEARS.height - 24));
}

/** A polyline through one value per year. */
export function yearLine(values: readonly number[], min: number, max: number): string {
  return values
    .map((value, i) => `${String(yearX(i, values.length))},${String(yearY(value, min, max))}`)
    .join(" ");
}
