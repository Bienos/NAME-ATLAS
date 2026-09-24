/**
 * Dynamic surname sizing — visual system §6.3.
 *
 * The principal surname is sized by its grapheme clusters, never by code
 * units, so `DOG̈AN` (a base letter plus a standalone combining mark) counts
 * as five, not six:
 *
 *   ≤ 10 graphemes  full display size
 *   11–16           reduced ~12%
 *   17–22           reduced ~25%
 *   23+             fitted to the available width
 *
 * The CSS that consumes these values also fits every tier to the container
 * width, so a name never overflows on a narrow screen, and it holds the
 * minimum size (32 px mobile, 56 px desktop). Wrapping, when it happens, is
 * left to the browser at spaces and hyphens first; the name is never
 * truncated with an ellipsis.
 */

export interface SurnameSizing {
  /** Grapheme clusters in the displayed name. */
  readonly graphemes: number;
  /** Multiplier applied to the full display size. */
  readonly scale: number;
  /** True from 23 graphemes: the width-fitting rule, not a tier, decides. */
  readonly fitted: boolean;
}

export function countGraphemes(value: string): number {
  if (typeof Intl.Segmenter === "function") {
    let count = 0;
    for (const _ of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)) {
      count += 1;
    }
    return count;
  }
  return Array.from(value).length;
}

export function surnameSizing(value: string): SurnameSizing {
  const graphemes = countGraphemes(value);
  if (graphemes <= 10) {
    return { graphemes, scale: 1, fitted: false };
  }
  if (graphemes <= 16) {
    return { graphemes, scale: 0.88, fitted: false };
  }
  if (graphemes <= 22) {
    return { graphemes, scale: 0.75, fitted: false };
  }
  return { graphemes, scale: 0.75, fitted: true };
}

/** The sizing as the CSS custom properties the display components read. */
export function surnameSizingStyle(value: string): Record<string, string> {
  const sizing = surnameSizing(value);
  return {
    "--surname-scale": String(sizing.scale),
    "--surname-graphemes": String(Math.max(sizing.graphemes, 1)),
  };
}
