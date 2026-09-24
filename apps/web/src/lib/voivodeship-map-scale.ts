/**
 * The map's colour classes: five equal-width bands of `share_of_covered`,
 * starting at zero, with a round band width.
 *
 * Presentation only. The shares are the claim's own values, rendered as they
 * came; binning them into five shades derives no fact, and the table beside
 * the map carries every exact figure.
 *
 * The band width is the smallest "nice" percentage that lets five bands reach
 * the largest share, so the darkest shade is always in use and a legend label
 * reads "4–8%" rather than "3.7–7.4%".
 */
export const MAP_CLASS_COUNT = 5;

/** Candidate band widths, in percentage points. */
const NICE_STEPS = [0.5, 1, 2, 3, 4, 5, 10, 15, 20] as const;

export interface MapScale {
  /** Band width as a fraction, e.g. 0.04 for 4 percentage points. */
  readonly step: number;
  /** Lower bound of each band, as a fraction. */
  readonly bounds: readonly number[];
}

export function mapScale(shares: readonly number[]): MapScale {
  const maxPct = Math.max(0, ...shares) * 100;
  // Past the largest step (a share above 100% cannot occur) the largest step is used.
  const stepPct: number = NICE_STEPS.find((s) => s * MAP_CLASS_COUNT >= maxPct) ?? 20;
  const step = stepPct / 100;
  return { step, bounds: Array.from({ length: MAP_CLASS_COUNT }, (_, i) => i * step) };
}

/** The band a share falls in: `[i·step, (i+1)·step)`, the top band closed. */
export function mapClass(scale: MapScale, share: number): number {
  return Math.min(MAP_CLASS_COUNT - 1, Math.max(0, Math.floor(share / scale.step + 1e-9)));
}
