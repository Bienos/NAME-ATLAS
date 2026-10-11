import type { CSSProperties, ReactNode } from "react";
import type { DistributionEntry } from "@name-atlas/contracts";
import { COMPARE_TEXT } from "./compare-text.js";
import { COUPLE_PATHS } from "./couple-config.js";
import { COUPLE_NAMES_PATHS } from "./couple-names-config.js";
import { coverageWarning, formatDate, formatPercent, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { MapLegend, VoivodeshipMap } from "./voivodeship-map.js";
import { mapInputs } from "./voivodeship-map-input.js";

/**
 * The comparison's drawing pieces (TASK-155), shared by the free surname
 * comparison and the full-name comparison. Presentation only: each takes
 * figures a gate in `compare.ts` has already allowed side by side, and draws
 * them; none decides what may be compared. A person's colour is its place in
 * the order (`data-side`), never a meaning.
 */

/** One person's bar: a figure, or the words for its absence (never a zero bar). */
export interface BarRow {
  readonly key: string;
  readonly side: number;
  readonly name: string;
  /** Null: no figure. The row then says `absent` and draws nothing. */
  readonly value: number | null;
  /** The figure as the page writes it. */
  readonly text: string;
  /** A second line under the figure: a rank, a direction. */
  readonly detail?: string | null;
  readonly absent?: string;
}

/**
 * Bars on one shared scale: the longest is the largest figure shown, so a bar
 * is only ever read against the bars beside it. The figure is always written
 * out; the bar itself is hidden from assistive technology.
 */
export function FigureBars({
  rows,
  label,
  drawn = true,
}: {
  rows: readonly BarRow[];
  label: string;
  /** False when the figures may not share a scale (another date): written out, no bars. */
  drawn?: boolean;
}) {
  const max = Math.max(0, ...rows.map((r) => r.value ?? 0));
  return (
    <ul className={drawn ? "cmp-bars" : "cmp-bars cmp-bars-plain"} aria-label={label}>
      {rows.map((row) => (
        <li key={row.key} className="cmp-bar" data-side={row.side}>
          <span className="cmp-bar-name">{row.name}</span>
          {row.value === null ? (
            <span className="cmp-bar-absent">{row.absent ?? "—"}</span>
          ) : (
            <>
              {drawn ? (
                <span className="cmp-bar-track" aria-hidden="true">
                  <span
                    className="cmp-bar-fill"
                    style={{ "--share": String(max > 0 ? row.value / max : 0) } as CSSProperties}
                  />
                </span>
              ) : null}
              <span className="cmp-bar-value">
                {row.text}
                {row.detail ? <small>{row.detail}</small> : null}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

/** "1 na X" figures, large, one per person: a bar would draw the rarer as the longer. */
export function OddsFigures({
  rows,
  lang,
}: {
  rows: readonly { key: string; side: number; name: string; value: string | null }[];
  lang: Lang;
}) {
  const t = UI[lang];
  return (
    <dl className="cmp-odds">
      {rows.map((row) => (
        <div key={row.key} data-side={row.side}>
          <dt>{row.name}</dt>
          <dd>
            {row.value === null ? (
              <span className="cmp-bar-absent">—</span>
            ) : (
              <>
                <span className="cmp-odds-lead">{t.compareOneIn}</span>{" "}
                <span className="cmp-odds-figure">{row.value}</span>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A numbered chapter: the number in the data face, the heading in the display face. */
export function Chapter({
  id,
  n,
  title,
  lang,
  children,
}: {
  id?: string;
  n: number;
  title: string;
  lang: Lang;
  children: ReactNode;
}) {
  return (
    <section id={id} className="cmp-chapter">
      <header className="cmp-chapter-head">
        <span className="cmp-chapter-no" aria-hidden="true">
          {COMPARE_TEXT[lang].chapter(n)}
        </span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

/** The people's names as plates, the mark between each; the heading of the page. */
export function NamePlates({
  names,
  lang,
}: {
  names: readonly { key: string; lines: readonly string[] }[];
  lang: Lang;
}) {
  const versus = COMPARE_TEXT[lang].versus;
  return (
    <h1 className="cmp-plates" data-count={names.length}>
      {names.map((name, i) => (
        <span key={name.key} className="cmp-plate-wrap">
          {i > 0 ? <span className="cmp-vs">{` ${versus} `}</span> : null}
          <span className="cmp-plate" data-side={i}>
            <span className="cmp-plate-letter" aria-hidden="true">
              {String.fromCharCode(65 + i)}
            </span>
            {name.lines.map((line, j) => (
              <span key={j} className="cmp-plate-line">
                {j > 0 ? " " : null}
                {line}
              </span>
            ))}
          </span>
        </span>
      ))}
    </h1>
  );
}

/**
 * The full-name comparison's card (D-049): what it holds and its price, with
 * "Wkrótce" and no way to pay (ADR-0023 §2.5). Only rendered where the page
 * exists.
 */
export function FullNamesCard({ href, lang }: { href: string; lang: Lang }) {
  const t = COMPARE_TEXT[lang].fullNames;
  return (
    <aside className="cmp-upsell" aria-labelledby="cmp-upsell-title">
      <p className="cmp-eyebrow">{t.eyebrow}</p>
      <h2 id="cmp-upsell-title">{t.title}</h2>
      <p>{t.body}</p>
      <p className="cmp-upsell-price">
        <span className="cmp-price">{t.price}</span> <span>{t.once}</span>{" "}
        <span className="cmp-soon">{t.soon}</span>
      </p>
      <p>
        <a className="cmp-upsell-link" href={href}>
          {t.link} →
        </a>
      </p>
    </aside>
  );
}

/** Which couple pages exist now (TASK-180): each is a 404 until its flag is on. */
export interface CoupleLinks {
  /** `COUPLE_REPORT_ENABLED`: the couple surnames page (ADR-0035). */
  readonly report: boolean;
  /** `COUPLE_NAMES_ENABLED` with accounts on: the couple first names page (ADR-0047). */
  readonly names: boolean;
}

export const NO_COUPLE_LINKS: CoupleLinks = { report: false, names: false };

/**
 * The card for couples (TASK-180): a link to each couple page that exists, or
 * nothing at all. `pair` carries the two compared surnames' slugs into the
 * couple surnames page, so it opens on the same two; without it, its picker.
 */
export function CouplesCard({
  links,
  lang,
  pair = null,
}: {
  links: CoupleLinks;
  lang: Lang;
  pair?: readonly [string, string] | null;
}) {
  if (!links.report && !links.names) return null;
  const t = COMPARE_TEXT[lang].couples;
  const reportHref =
    pair === null
      ? COUPLE_PATHS[lang]
      : `${COUPLE_PATHS[lang]}?a=${encodeURIComponent(pair[0])}&b=${encodeURIComponent(pair[1])}`;
  const items = [
    ...(links.report ? [{ key: "report", ...t.surnames, href: reportHref }] : []),
    ...(links.names ? [{ key: "names", ...t.names, href: COUPLE_NAMES_PATHS[lang] }] : []),
  ];
  return (
    <aside className="cmp-upsell cmp-couples" aria-labelledby="cmp-couples-title">
      <p className="cmp-eyebrow">{t.eyebrow}</p>
      <h2 id="cmp-couples-title">{t.title}</h2>
      {items.map((item) => (
        <div key={item.key} className="cmp-couples-item">
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <p>
            <a className="cmp-upsell-link" href={item.href}>
              {item.link} →
            </a>
          </p>
        </div>
      ))}
    </aside>
  );
}

/**
 * Regional breakdowns from one resource: one map per person on **one shared
 * scale** (so a shade means the same share on every map), one legend, each
 * side's coverage warning above its own map, and a table with a column each.
 */
export function DistributionMaps({
  sides,
  lang,
}: {
  sides: readonly { name: string; side: number; entry: DistributionEntry }[];
  lang: Lang;
}) {
  const t = UI[lang];
  const input = mapInputs(
    sides.map((s) => s.entry),
    lang,
  );
  const places = new Map<string, { name: string; shares: (number | undefined)[] }>();
  sides.forEach((side, i) =>
    side.entry.regions.forEach((r) => {
      const place = places.get(r.place_id) ?? {
        name: r.display_name,
        shares: sides.map(() => undefined),
      };
      place.shares[i] = r.share_of_covered;
      places.set(r.place_id, place);
    }),
  );
  const rows = [...places.values()].sort((x, y) => x.name.localeCompare(y.name, "pl"));
  const labels = {
    title: t.mapTitle,
    legendTitle: t.mapLegend,
    bandLabels: input?.bandLabels ?? [],
    notListed: t.mapNotListed,
    hint: t.mapHint,
  };
  return (
    <>
      {input === null ? null : (
        <>
          <div className="compare-maps cmp-maps" data-count={sides.length}>
            {sides.map((side, i) => {
              const warning = coverageWarning(side.entry, lang);
              return (
                <div key={side.name + String(i)} className="cmp-map" data-side={side.side}>
                  <h3>{side.name}</h3>
                  {warning === null ? null : <p className="warning">{warning}</p>}
                  <VoivodeshipMap
                    regions={input.maps[i] ?? []}
                    labels={{ ...labels, title: `${t.mapTitle}: ${side.name}` }}
                    legend={false}
                  />
                </div>
              );
            })}
          </div>
          <MapLegend
            title={labels.legendTitle}
            bandLabels={labels.bandLabels}
            notListed={labels.notListed}
          />
        </>
      )}
      <div className="table-scroll" tabIndex={0} role="region" aria-label={t.regionsHeading}>
        <table className="cmp-table">
          <caption>{t.coveredNote}</caption>
          <thead>
            <tr>
              <th scope="col">{t.regionColumn}</th>
              {sides.map((side, i) => (
                <th scope="col" key={side.name + String(i)}>
                  {side.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                {row.shares.map((share, i) => (
                  <td key={i}>
                    {share === undefined ? t.mapNotListedShort : formatPercent(share, lang)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        {t.snapshotLabel}: {formatDate(sides[0]?.entry.snapshot_date ?? "", lang)}
      </p>
    </>
  );
}
