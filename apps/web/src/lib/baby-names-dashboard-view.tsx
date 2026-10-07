import type { CSSProperties, ReactNode } from "react";
import type { BirthSex } from "@name-atlas/truth";
import { buildDashboard, sortOrders } from "./baby-names-dashboard.js";
import type { Dashboard, DashMoment, DashYear } from "./baby-names-dashboard.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import { formatDecimal, formatInteger, formatPercent } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * The year-by-year dashboard (TASK-170): panels around the paid view's chart
 * and table, from `buildDashboard`. Server-rendered with no script: the chart
 * switch and the sort are radio inputs read by CSS `:has()` (`globals.css`,
 * `.bn-metric`, `.bn-grid`); without `:has()` the count chart and the newest-first
 * order stay.
 */

export { buildDashboard };

/** "+12,3%" / "−8,0%" / "0,0%": a change with its sign (a minus sign, not a hyphen). */
export function signedPercent(change: number, lang: Lang): string {
  const text = formatPercent(Math.abs(change), lang, 1);
  return change > 0 ? `+${text}` : change < 0 ? `−${text}` : text;
}

function perMille(perMillion: number, lang: Lang): string {
  return `${formatDecimal(perMillion / 1000, 1, lang)}‰`;
}

function Tile({ label, value, foot }: { label: string; value: string; foot?: string }) {
  return (
    <div className="bn-dash-tile">
      <span className="bn-dash-label">{label}</span>
      <strong className="bn-dash-value">{value}</strong>
      {foot === undefined ? null : <small className="bn-dash-foot">{foot}</small>}
    </div>
  );
}

/** Four tiles the free view does not carry: the total, the years on the list, the best rank, the latest change. */
export function DashSummary({ dash, lang }: { dash: Dashboard; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const first = dash.years[0]!.year;
  const latest = dash.years[dash.years.length - 1]!.year;
  return (
    <div className="bn-dash-tiles" data-dash="summary">
      <Tile
        label={t.dashTotal(first)}
        value={formatInteger(dash.total, lang)}
        {...(dash.totalPartial ? { foot: t.dashAtLeast } : {})}
      />
      <Tile
        label={t.dashYearsOnList}
        value={t.dashOf(
          formatInteger(dash.yearsListed, lang),
          formatInteger(dash.yearsStored, lang),
        )}
        foot={t.dashRisesFallsValue(
          formatInteger(dash.rises, lang),
          formatInteger(dash.falls, lang),
        )}
      />
      {dash.best === null ? null : (
        <Tile
          label={t.dashBest}
          value={formatInteger(dash.best.rank, lang)}
          foot={t.dashBestYears(dash.best.years.join(", "))}
        />
      )}
      <Tile
        label={t.dashChange(latest - 1, latest)}
        value={dash.latestChange === null ? "—" : signedPercent(dash.latestChange.change, lang)}
        {...(dash.latestChange === null ? { foot: t.dashNoChange } : {})}
      />
    </div>
  );
}

function momentText(m: DashMoment, dash: Dashboard, lang: Lang): [string, string] {
  const t = BABY_NAMES_TEXT[lang];
  switch (m.kind) {
    case "FIRST_LISTED": {
      const y = dash.years.find((d) => d.year === m.year)!;
      return [
        t.momentFirst(m.fromStart),
        t.momentFirstDesc(
          formatInteger(y.count ?? 0, lang),
          y.rank === null ? "—" : formatInteger(y.rank, lang),
        ),
      ];
    }
    case "TOP_TEN":
      return [t.momentTopTen, t.momentTopTenDesc(formatInteger(m.rank, lang))];
    case "NUMBER_ONE":
      return [t.momentNumberOne, t.momentNumberOneDesc(m.years)];
    case "PEAK":
      return [t.momentPeak, t.momentPeakDesc(formatInteger(m.count, lang))];
    case "BIGGEST_RISE":
      return [t.momentRise, t.momentRiseDesc(signedPercent(m.change, lang))];
    case "LAST_LISTED":
      return [t.momentLast, t.momentLastDesc];
  }
}

export function Moments({ dash, lang }: { dash: Dashboard; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  return (
    <div className="bn-dash-panel" data-dash="moments">
      <h4 className="bn-tile-heading">{t.momentsHeading}</h4>
      <ol className="bn-moments">
        {dash.moments.map((m) => {
          const [title, desc] = momentText(m, dash, lang);
          return (
            <li key={`${m.kind}-${m.year}`} data-moment={m.kind}>
              <span className="bn-moment-year">{m.year}</span>
              <span>
                <strong>{title}</strong>
                <small>{desc}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const SHARE = { width: 640, height: 160, bottom: 22, top: 8 } as const;

/** The share of the list's children, ‰, one bar a year; a cut-off tick where the name is not on the list; a gap for no list. */
function ShareChart({ dash, sex, lang }: { dash: Dashboard; sex: BirthSex; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const years = dash.years;
  const first = years[0]!;
  const last = years[years.length - 1]!;
  const max = Math.max(1, ...years.map((y) => y.sharePerMillion ?? 0));
  const slot = SHARE.width / years.length;
  const barWidth = Math.max(2, slot * 0.62);
  const plot = SHARE.height - SHARE.bottom - SHARE.top;
  const base = SHARE.top + plot;
  const x = (i: number) => i * slot + (slot - barWidth) / 2;
  return (
    <svg
      className="bn-share-chart"
      viewBox={`0 0 ${SHARE.width} ${SHARE.height}`}
      role="img"
      aria-label={t.shareChartLabel(sex, first.year, last.year)}
    >
      <line className="bn-chart-axis" x1={0} x2={SHARE.width} y1={base} y2={base} />
      {years.map((y, i) => {
        if (y.state === "NO_LIST") return null;
        if (y.sharePerMillion === null) {
          return (
            <line
              key={y.year}
              className="bn-chart-cutoff"
              x1={x(i)}
              x2={x(i) + barWidth}
              y1={base + 5}
              y2={base + 5}
            >
              <title>{`${y.year}: ${t.cutoffTick}`}</title>
            </line>
          );
        }
        const h = Math.max(1, (y.sharePerMillion / max) * plot);
        return (
          <rect
            key={y.year}
            className="bn-share-bar"
            data-share-year={y.year}
            x={x(i)}
            y={base - h}
            width={barWidth}
            height={h}
          >
            <title>{`${y.year}: ${perMille(y.sharePerMillion, lang)}`}</title>
          </rect>
        );
      })}
      <text className="bn-share-label" x={x(0)} y={SHARE.height - 5} textAnchor="start">
        {first.year}
      </text>
      <text
        className="bn-share-label"
        x={x(years.length - 1) + barWidth}
        y={SHARE.height - 5}
        textAnchor="end"
      >
        {last.year}
      </text>
    </svg>
  );
}

/** The count chart and the share chart, switched by two radio inputs without script. */
export function ChartSwitch({
  dash,
  sex,
  lang,
  children,
}: {
  dash: Dashboard;
  sex: BirthSex;
  lang: Lang;
  children?: ReactNode;
}) {
  const t = BABY_NAMES_TEXT[lang];
  const id = `bn-metric-${sex.toLowerCase()}`;
  return (
    <div className="bn-metric" data-dash="metric">
      <input
        className="bn-metric-input bn-metric-count-input"
        type="radio"
        name={id}
        id={`${id}-count`}
        defaultChecked
      />
      <label htmlFor={`${id}-count`}>{t.metricCount}</label>
      <input
        className="bn-metric-input bn-metric-share-input"
        type="radio"
        name={id}
        id={`${id}-share`}
      />
      <label htmlFor={`${id}-share`}>{t.metricShare}</label>
      <div className="bn-metric-count">{children}</div>
      <div className="bn-metric-share">
        <ShareChart dash={dash} sex={sex} lang={lang} />
      </div>
    </div>
  );
}

function yoyLevel(change: number): string {
  const a = Math.abs(change);
  const step = a >= 0.3 ? 3 : a >= 0.1 ? 2 : 1;
  return `${change >= 0 ? "up" : "down"}-${step}`;
}

function yoyText(y: DashYear, lang: Lang): string {
  const t = BABY_NAMES_TEXT[lang];
  if (y.state === "NO_LIST") return t.noYearList;
  if (y.state === "BELOW") return t.belowThreshold;
  if (y.change === null) return t.yoyNone;
  return `${signedPercent(y.change, lang)} (${y.change >= 0 ? t.yoyRise : t.yoyFall})`;
}

export function YearOnYear({ dash, lang }: { dash: Dashboard; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const first = dash.years[0]!.year;
  const last = dash.years[dash.years.length - 1]!.year;
  return (
    <div className="bn-dash-panel" data-dash="yoy">
      <h4 className="bn-tile-heading">{t.yoyHeading}</h4>
      <p className="note">{t.yoyNote}</p>
      <ul className="bn-yoy" style={{ "--bn-yoy-n": dash.years.length } as CSSProperties}>
        {dash.years.map((y) => {
          const text = t.yoyTileLabel(y.year, yoyText(y, lang));
          const level =
            y.state === "NO_LIST"
              ? "nolist"
              : y.state === "BELOW"
                ? "below"
                : y.change === null
                  ? "none"
                  : yoyLevel(y.change);
          return (
            <li
              key={y.year}
              className={`bn-yoy-tile bn-yoy-${level}`}
              data-yoy={y.year}
              title={text}
            >
              <span className="visually-hidden">{text}</span>
            </li>
          );
        })}
      </ul>
      <p className="bn-yoy-ends" aria-hidden="true">
        <span>{first}</span>
        <span>{last}</span>
      </p>
      <dl className="bn-yoy-records">
        <div>
          <dt>{t.yoyBiggestRise}</dt>
          <dd>
            {dash.biggestRise === null
              ? "—"
              : `${dash.biggestRise.year} · ${signedPercent(dash.biggestRise.change!, lang)}`}
          </dd>
        </div>
        <div>
          <dt>{t.yoyBiggestFall}</dt>
          <dd>
            {dash.biggestFall === null
              ? "—"
              : `${dash.biggestFall.year} · ${signedPercent(dash.biggestFall.change!, lang)}`}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function Decades({ dash, lang }: { dash: Dashboard; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const max = Math.max(1, ...dash.decades.map((d) => d.sum));
  return (
    <div className="bn-dash-panel" data-dash="decades">
      <h4 className="bn-tile-heading">{t.decadesHeading}</h4>
      <p className="note">{t.decadesNote}</p>
      <ul className="bn-decades">
        {dash.decades.map((d) => (
          <li key={d.from} data-decade={d.from}>
            <span className="bn-decade-head">
              <span>{`${d.from}–${d.to}`}</span>
              <span>
                {d.partial && d.sum > 0 ? `${t.dashAtLeast} ` : ""}
                {formatInteger(d.sum, lang)}
              </span>
            </span>
            <span className="bn-meter" aria-hidden="true">
              <span style={{ width: `${(d.sum / max) * 100}%` }} />
            </span>
            <small>
              {t.decadeFoot(
                d.averageRank === null ? null : formatInteger(d.averageRank, lang),
                formatInteger(d.yearsListed, lang),
                formatInteger(d.yearsStored, lang),
              )}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SORTS = ["year", "count", "rank", "change"] as const;

/** Every year in one grid, ordered by the checked radio (CSS `order`); no script, no table reordering in the DOM. */
export function YearGrid({ dash, sex, lang }: { dash: Dashboard; sex: BirthSex; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const id = `bn-sort-${sex.toLowerCase()}`;
  const orders = sortOrders(dash.years);
  const peak = Math.max(1, ...dash.years.map((y) => y.count ?? 0));
  const label = { year: t.sortYear, count: t.sortCount, rank: t.sortRank, change: t.sortChange };
  return (
    <div className="bn-dash-panel bn-grid" data-dash="grid">
      <h4 className="bn-tile-heading">{t.gridHeading}</h4>
      <p className="note">{t.gridNote}</p>
      <span className="bn-sort-by" aria-hidden="true">
        {t.sortBy}
      </span>
      {SORTS.map((k, i) => (
        <span key={k} className="bn-sort-pair">
          <input
            className={`bn-sort-input bn-sort-${k}`}
            type="radio"
            name={id}
            id={`${id}-${k}`}
            {...(i === 0 ? { defaultChecked: true } : {})}
          />
          <label htmlFor={`${id}-${k}`}>
            <span className="visually-hidden">{`${t.sortBy}: `}</span>
            {label[k]}
          </label>
        </span>
      ))}
      <div className="bn-grid-scroll">
        <div className="bn-grid-row bn-grid-head" aria-hidden="true">
          <span>{t.yearColumn}</span>
          <span>{t.countColumn}</span>
          <span>{t.rankColumn}</span>
          <span>{t.gridShare}</span>
          <span>{t.gridChange}</span>
          <span>{t.gridBar}</span>
        </div>
        <ol className="bn-grid-rows">
          {dash.years.map((y) => {
            const o = orders.get(y.year)!;
            const style = {
              "--o-year": o.year,
              "--o-count": o.count,
              "--o-rank": o.rank,
              "--o-change": o.change,
            } as CSSProperties;
            const cells =
              y.state === "LISTED" ? (
                <>
                  <span>{formatInteger(y.count!, lang)}</span>
                  <span>
                    {y.rank === null ? "—" : formatInteger(y.rank, lang)}
                    {y.rankMove === null || y.rankMove === 0 ? null : (
                      <small className={y.rankMove > 0 ? "bn-up" : "bn-down"}>
                        {` ${y.rankMove > 0 ? "▲" : "▼"}${formatInteger(Math.abs(y.rankMove), lang)}`}
                      </small>
                    )}
                  </span>
                  <span>
                    {y.sharePerMillion === null ? "—" : perMille(y.sharePerMillion, lang)}
                  </span>
                  <span className={y.change === null ? "" : y.change >= 0 ? "bn-up" : "bn-down"}>
                    {y.change === null ? "—" : signedPercent(y.change, lang)}
                  </span>
                  <span className="bn-grid-bar" aria-hidden="true">
                    <span style={{ width: `${(y.count! / peak) * 100}%` }} />
                  </span>
                </>
              ) : (
                <span className="bn-grid-wide baby-below">
                  {y.state === "NO_LIST"
                    ? t.noYearList
                    : `< ${formatInteger(y.threshold ?? 0, lang)} · ${t.belowThreshold}`}
                </span>
              );
            return (
              <li key={y.year} className="bn-grid-row" style={style} data-grid-year={y.year}>
                <span className="bn-grid-year">{y.year}</span>
                {cells}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
