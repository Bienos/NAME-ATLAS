import type { CSSProperties } from "react";
import { formatInteger, UI } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * A rarity figure on an Atlas Thread (Visual System §8): one line, a tick per
 * power of ten, and a point where this surname's "1 in X" sits.
 *
 * Presentation only. The point is the claim's own X on a fixed logarithmic
 * axis, and the ticks are the axis's own labels — 1 in 100 to 1 in 10 million —
 * not thresholds and not categories. Nothing here calls a surname "rare" or
 * "common"; the ends of the line only say which way is which. Every figure is
 * stated in words beside it, so the scale is never needed to read a value
 * (§12: "never require the visual alone to understand values").
 */

/** 1 in 100: no published PESEL surname is more common than about 1 in 215. */
const MIN_EXPONENT = 2;
/** Past 1 in 10 million: two people in a 21-million list is about 1 in 10.6 million. */
const MAX_EXPONENT = 7.2;
const TICKS = [2, 3, 4, 5, 6, 7] as const;

function position(exponent: number): number {
  const clamped = Math.min(MAX_EXPONENT, Math.max(MIN_EXPONENT, exponent));
  return ((clamped - MIN_EXPONENT) / (MAX_EXPONENT - MIN_EXPONENT)) * 100;
}

function tickLabel(exponent: number, lang: Lang): string {
  if (exponent >= 6) {
    const millions = formatInteger(10 ** (exponent - 6), lang);
    return lang === "pl" ? `${millions} mln` : `${millions}M`;
  }
  if (exponent >= 3) {
    const thousands = formatInteger(10 ** (exponent - 3), lang);
    return lang === "pl" ? `${thousands} tys.` : `${thousands}k`;
  }
  return formatInteger(10 ** exponent, lang);
}

export function RarityScale({
  oneIn,
  figure,
  lang,
}: {
  /** The claim's X. */
  oneIn: number;
  /** The same figure in words, e.g. "około 1 na 22 551", for the accessible name. */
  figure: string;
  lang: Lang;
}) {
  const t = UI[lang];
  const at = position(Math.log10(oneIn));
  return (
    <figure
      className="rscale"
      role="img"
      aria-label={`${t.scaleLabel}: ${figure}`}
      style={{ "--pos": `${at.toFixed(2)}%` } as CSSProperties}
    >
      <div className="rscale-track">
        {TICKS.map((exponent) => (
          <span
            key={exponent}
            className={`rscale-tick${exponent % 2 === 1 ? " rscale-tick-minor" : ""}`}
            style={{ "--at": `${position(exponent).toFixed(2)}%` } as CSSProperties}
          >
            <span className="rscale-tick-label">{tickLabel(exponent, lang)}</span>
          </span>
        ))}
        <span className="rscale-fill" />
        <span className="rscale-point" />
      </div>
      <div className="rscale-ends">
        <span>← {t.scaleCommon}</span>
        <span>{t.scaleRare} →</span>
      </div>
    </figure>
  );
}
