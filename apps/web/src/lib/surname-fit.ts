import { DISPLAY_ADVANCES, DISPLAY_UNITS_PER_EM } from "./display-metrics.js";

/**
 * How wide the surname hero is, so the page can fit it to one line
 * (Visual System §6.3: one line preferred, two at most, never below 32px on
 * mobile or 56px on desktop, never an ellipsis, wrap at a space or hyphen first).
 *
 * Register surnames are capitals, and a capital is wide: at the snapshot's
 * `12vw`, `WOJCIECHOWSKA` needs 416px on a 390px phone and would break inside
 * the word. The snapshot sets this measure as `--surname-em`, and `globals.css`
 * divides the heading's own width by it — the designed size stays the ceiling,
 * so a name that fits is untouched. Measured on the server from the pages'
 * display face (`display-metrics.ts`), so the size is right on first paint: no
 * script, no reflow when the font arrives.
 *
 * Presentation only: nothing here reaches a figure.
 */

/** The snapshot surname's `letter-spacing` in `globals.css`, applied after every character. */
export const SURNAME_TRACKING_EM = -0.04;

/**
 * A character the display face lacks is drawn by a fallback face; count it as
 * an average capital of this one rather than as nothing.
 */
const FALLBACK_ADVANCE_EM = 0.7;

/** The surname's width in em in the pages' display face, tracking included; at least 1. */
export function surnameEm(text: string): number {
  let units = 0;
  let characters = 0;
  for (const character of text.normalize("NFC")) {
    units +=
      DISPLAY_ADVANCES[character.codePointAt(0)!] ?? FALLBACK_ADVANCE_EM * DISPLAY_UNITS_PER_EM;
    characters++;
  }
  return Math.max(1, units / DISPLAY_UNITS_PER_EM + SURNAME_TRACKING_EM * characters);
}
