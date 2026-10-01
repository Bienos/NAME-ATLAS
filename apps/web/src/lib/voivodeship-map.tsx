"use client";

import { useId, useState } from "react";
import { VOIVODESHIP_VIEWBOX, VOIVODESHIPS } from "./voivodeship-geometry.js";

/**
 * Keys sorted explicitly: an object lists "10" before "02" (integer-like keys
 * first), which would start the keyboard at ŁÓDZKIE. TERC codes follow the
 * alphabetical order of the names, so this is alphabetical — DOLNOŚLĄSKIE first.
 */
const TAB_ORDER = Object.keys(VOIVODESHIPS).sort();

/** One published region, with its figures already formatted by the page. */
export interface MapRegion {
  readonly terc_code: string;
  readonly display_name: string;
  readonly count_text: string;
  readonly share_text: string;
  /** Colour band, 0 (lowest) to 4 (highest). See `voivodeship-map-scale.ts`. */
  readonly band: number;
}

export interface MapLabels {
  /** Accessible name for the whole map. */
  readonly title: string;
  readonly legendTitle: string;
  /** One label per band, lowest first, e.g. "0–4%". */
  readonly bandLabels: readonly string[];
  /** For a voivodeship with no value in the dataset — which is not zero. */
  readonly notListed: string;
  /** Shown in the readout before anything is hovered or focused. */
  readonly hint: string;
}

/**
 * A choropleth of the 16 voivodeships: one ramp, dim to lit, brighter is a larger share
 * (the ramp is validated in `globals.css`). A voivodeship the dataset does not
 * list is drawn in the sunk ground and hatched, never in the dimmest band: an absent cell may
 * be zero, suppressed or out of scope, and the resource does not say which
 * (`docs/sources/pesel-regional.md` item 10), so it must not look like "a
 * little".
 *
 * Hovering, tapping or tabbing to a region fills the readout under the map —
 * the hover layer, readable on a phone and announced to screen readers. The
 * table beside the map stays the complete, exact view.
 */
export function VoivodeshipMap({
  regions,
  labels,
  legend = true,
}: {
  regions: readonly MapRegion[];
  labels: MapLabels;
  /** False when several maps share one legend (the comparison page). */
  legend?: boolean;
}) {
  const hatchId = `hatch-${useId().replace(/:/g, "")}`;
  const [active, setActive] = useState<string | null>(null);
  const byTerc = new Map(regions.map((r) => [r.terc_code, r]));

  function describe(terc: string): string {
    const region = byTerc.get(terc);
    const name = region?.display_name ?? VOIVODESHIPS[terc]?.name ?? terc;
    return region === undefined
      ? `${name}: ${labels.notListed}`
      : `${name}: ${region.share_text} (${region.count_text})`;
  }

  return (
    <figure className="vmap">
      <svg
        viewBox={VOIVODESHIP_VIEWBOX}
        role="group"
        aria-label={labels.title}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <pattern
            id={hatchId}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" className="vmap-none-bg" />
            <line x1="0" y1="0" x2="0" y2="6" className="vmap-none-line" />
          </pattern>
        </defs>
        {TAB_ORDER.map((terc) => {
          const region = byTerc.get(terc);
          const shape = VOIVODESHIPS[terc];
          if (shape === undefined) return null;
          const text = describe(terc);
          return (
            <path
              key={terc}
              d={shape.d}
              className={`vmap-region ${region === undefined ? "vmap-none" : `vmap-b${String(region.band)}`}`}
              fill={region === undefined ? `url(#${hatchId})` : undefined}
              tabIndex={0}
              role="img"
              aria-label={text}
              onMouseEnter={() => setActive(terc)}
              onFocus={() => setActive(terc)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(terc)}
            >
              <title>{text}</title>
            </path>
          );
        })}
        {/* The highlight is a separate, inert outline drawn last, so it sits
            above every neighbour without moving the focused region in the
            DOM — moving it would break the keyboard's tab order. */}
        {active === null || VOIVODESHIPS[active] === undefined ? null : (
          <path d={VOIVODESHIPS[active].d} className="vmap-highlight" aria-hidden="true" />
        )}
      </svg>
      <p className="vmap-readout" aria-live="polite">
        {active === null ? labels.hint : describe(active)}
      </p>
      {legend ? (
        <MapLegend
          title={labels.legendTitle}
          bandLabels={labels.bandLabels}
          notListed={labels.notListed}
        />
      ) : null}
    </figure>
  );
}

/**
 * The legend: the bands, lowest first, and the not-listed swatch. Its own
 * hatch pattern, so it can stand under several maps or none.
 */
export function MapLegend({
  title,
  bandLabels,
  notListed,
}: {
  title: string;
  bandLabels: readonly string[];
  notListed: string;
}) {
  const hatchId = `legend-hatch-${useId().replace(/:/g, "")}`;
  return (
    <div className="vmap-legend">
      <span className="vmap-legend-title">{title}</span>
      <ul>
        {bandLabels.map((label, band) => (
          <li key={label}>
            <svg className="vmap-swatch" viewBox="0 0 12 12" aria-hidden="true">
              <rect width="12" height="12" rx="2" className={`vmap-b${String(band)}`} />
            </svg>
            {label}
          </li>
        ))}
        <li>
          <svg className="vmap-swatch" viewBox="0 0 12 12" aria-hidden="true">
            <defs>
              <pattern
                id={hatchId}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" className="vmap-none-bg" />
                <line x1="0" y1="0" x2="0" y2="6" className="vmap-none-line" />
              </pattern>
            </defs>
            <rect width="12" height="12" rx="2" fill={`url(#${hatchId})`} />
          </svg>
          {notListed}
        </li>
      </ul>
    </div>
  );
}
