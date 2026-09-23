import type { DistributionEntry } from "@name-atlas/contracts";
import { formatInteger, formatPercent } from "./messages.js";
import type { Lang } from "./messages.js";
import type { MapRegion } from "./voivodeship-map.js";
import { mapClass, mapScale } from "./voivodeship-map-scale.js";

/** A band edge as whole or half percentage points: "4%", "2,5%". */
function bandEdge(fraction: number, lang: Lang): string {
  const pct = Math.round(fraction * 1000) / 10;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  return `${lang === "pl" ? text.replace(".", ",") : text}%`;
}

/**
 * Map input for one or more distribution entries **on one shared scale**, or
 * null when any region of any entry lacks a TERC code — such a region could not
 * be placed, and leaving it off would draw it as "not listed", which the data
 * contradicts; the table is then the whole view.
 *
 * One entry gives the surname page its map. Two give the comparison page two
 * maps whose shades mean the same shares — the only way side-by-side maps can
 * be read against each other. The caller passes only entries that may be
 * compared (same comparability group and date); this function does not decide
 * that.
 */
export function mapInputs(
  entries: readonly DistributionEntry[],
  lang: Lang,
): { maps: MapRegion[][]; bandLabels: string[] } | null {
  if (entries.some((e) => e.regions.some((r) => r.terc_code === null))) return null;
  const scale = mapScale(entries.flatMap((e) => e.regions.map((r) => r.share_of_covered)));
  return {
    maps: entries.map((entry) =>
      entry.regions.map((r) => ({
        terc_code: r.terc_code as string,
        display_name: r.display_name,
        count_text: formatInteger(r.count, lang),
        share_text: formatPercent(r.share_of_covered, lang),
        band: mapClass(scale, r.share_of_covered),
      })),
    ),
    bandLabels: scale.bounds.map(
      (lo) => `${bandEdge(lo, lang)}–${bandEdge(lo + scale.step, lang)}`,
    ),
  };
}
