/**
 * Presentation geometry for the landing atlas (TASK-040; six plates since
 * TASK-043): where a mark sits on a plate, never what a figure is.
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
