import type { ReactNode } from "react";
import type {
  GivenNameListFactsArtefact,
  GivenNameListSexFacts,
  GivenNameListYear,
  NumberOneRun,
} from "@name-atlas/contracts";
import { assessmentWord, fillTemplate, formatInteger, formatShare, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { Alt, Num, Plate, rich, vars } from "./list-atlas.js";
import { ListAtlasShell } from "./list-atlas-shell.js";
import {
  columnPath,
  linearScale,
  TREND,
  trendColumn,
  YEARS,
  yearLine,
  yearX,
  yearY,
} from "./list-atlas-geometry.js";

/**
 * Part II of the Atlas page (TASK-178, ADR-0051): six plates about the
 * first-name lists of dataset 219, one list per year of birth and sex,
 * rendered from `givenNameListFacts()`.
 *
 * **This view derives nothing.** Every figure a reader sees is a value the
 * artefact carries, formatted by `messages.ts`; the only arithmetic is
 * presentation geometry (`list-atlas-geometry.ts`). The boys' and the girls'
 * lists are two universes: each plate is server-rendered for both, the
 * switch shows one, and no figure is a sum of the two or of two years. A
 * first name appears only as one of ADR-0051 §2.4's selections, as published.
 *
 * The boys' lists take the shell's `male` variant and the girls' its
 * `female` variant, so the switch's stylesheet works unchanged.
 */

type Side = "male" | "female";
const SIDES: readonly Side[] = ["male", "female"];

function of<T>(side: Side, boys: T, girls: T): T {
  return side === "male" ? boys : girls;
}

function sexOf(facts: GivenNameListFactsArtefact, side: Side): GivenNameListSexFacts {
  return of(side, facts.sexes.male, facts.sexes.female);
}

function PerSex({
  facts,
  render,
  inline,
}: {
  facts: GivenNameListFactsArtefact;
  render: (sex: GivenNameListSexFacts, side: Side) => ReactNode;
  inline?: boolean;
}) {
  return (
    <Alt
      male={render(facts.sexes.male, "male")}
      female={render(facts.sexes.female, "female")}
      {...(inline === undefined ? {} : { inline })}
    />
  );
}

function first(sex: GivenNameListSexFacts): GivenNameListYear {
  return sex.years[0] as GivenNameListYear;
}

function last(sex: GivenNameListSexFacts): GivenNameListYear {
  return sex.years[sex.years.length - 1] as GivenNameListYear;
}

/** The year the publisher's threshold changed, with both thresholds; null when it never did. */
function thresholdBreak(
  years: readonly GivenNameListYear[],
): { readonly year: number; readonly before: number; readonly after: number } | null {
  for (let i = 1; i < years.length; i++) {
    const prev = years[i - 1];
    const year = years[i];
    if (
      prev !== undefined &&
      year !== undefined &&
      prev.publication_threshold !== year.publication_threshold
    ) {
      return {
        year: year.birth_year,
        before: prev.publication_threshold,
        after: year.publication_threshold,
      };
    }
  }
  return null;
}

/** The longest run of years with one number-one name; the earlier one on a tie. */
function longestRun(runs: readonly NumberOneRun[]): NumberOneRun | null {
  let best: NumberOneRun | null = null;
  for (const run of runs) if (best === null || run.years > best.years) best = run;
  return best;
}

/** "2000–2015", or "2024" for a run of one year: the stored years, written. */
function runSpan(run: NumberOneRun): string {
  return run.from_year === run.to_year
    ? String(run.from_year)
    : `${String(run.from_year)}–${String(run.to_year)}`;
}

function GnSource({ facts, lang }: { facts: GivenNameListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  return (
    <p className="lf-source">
      <span>
        {rich(
          t.gnSource,
          {
            link: <a href={facts.source_page_url}>{t.gnSourceName}</a>,
            from: String(facts.first_year),
            to: String(facts.last_year),
            list: <Alt inline male={t.gnListBoys} female={t.gnListGirls} />,
          },
          {},
          lang,
        )}
      </span>
      <span className="lf-method">
        {fillTemplate(
          t.lfMethod,
          {
            status: assessmentWord(facts.assessment.confidence_status, lang),
            method: facts.pipeline_version,
          },
          {},
          lang,
        )}
      </span>
    </p>
  );
}

/** The years under a chart: one slot each, every fifth one written. */
function YearAxis({ years }: { years: readonly number[] }) {
  return (
    <ol className="lf-trend-years gn-years" aria-hidden="true">
      {years.map((year) => (
        <li key={year}>{year % 5 === 0 ? String(year) : ""}</li>
      ))}
    </ol>
  );
}

/** One value per year as a line, its first and last values written beside the ends. */
function YearLine({
  years,
  values,
  format,
  className,
}: {
  years: readonly number[];
  values: readonly number[];
  format: (value: number) => string;
  className: string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const head = values[0];
  const tail = values[values.length - 1];
  if (head === undefined || tail === undefined) return null;
  const n = values.length;
  return (
    <div className={`gn-line-fig ${className}`} aria-hidden="true">
      <svg
        className="gn-line"
        viewBox={`0 0 ${String(YEARS.width)} ${String(YEARS.height)}`}
        aria-hidden="true"
      >
        <polyline className="gn-line-path" points={yearLine(values, min, max)} />
        <circle className="gn-line-dot" cx={yearX(0, n)} cy={yearY(head, min, max)} r="5" />
        <circle
          className="gn-line-dot gn-line-end"
          cx={yearX(n - 1, n)}
          cy={yearY(tail, min, max)}
          r="6"
        />
        <text className="gn-line-label" x={yearX(0, n) + 12} y={yearY(head, min, max) - 12}>
          {format(head)}
        </text>
        <text
          className="gn-line-label gn-line-label-end"
          x={yearX(n - 1, n) - 14}
          y={yearY(tail, min, max) - 12}
          textAnchor="end"
        >
          {format(tail)}
        </text>
      </svg>
      <YearAxis years={years} />
    </div>
  );
}

/** A figure with its label, in the plates' big-figure form. */
function Fig({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <p className="lf-big-fig">
      <span className="lf-big-v">
        <Num>{value}</Num>
      </span>
      <span className="lf-big-l">{label}</span>
    </p>
  );
}

// --- plate 12: how many names --------------------------------------------------

function NamesBars({ sex, lang }: { sex: GivenNameListSexFacts; lang: Lang }) {
  const t = UI[lang];
  const years = sex.years;
  const max = Math.max(...years.map((y) => y.names));
  const brk = thresholdBreak(years);
  const brkIndex = brk === null ? -1 : years.findIndex((y) => y.birth_year === brk.year);
  const lastThreshold = last(sex).publication_threshold;
  return (
    <div className="gn-bars-fig" aria-hidden="true">
      <svg
        className="gn-bars"
        viewBox={`0 0 ${String(TREND.width)} ${String(TREND.height)}`}
        aria-hidden="true"
      >
        {years.map((year, i) => {
          const column = trendColumn(i, years.length);
          return (
            <path
              key={year.birth_year}
              className="gn-bar"
              data-dim={year.publication_threshold === lastThreshold ? undefined : ""}
              d={columnPath(column, linearScale(year.names, max))}
            />
          );
        })}
        {brkIndex > 0 ? (
          <line
            className="gn-break"
            x1={trendColumn(brkIndex, years.length).x - 2}
            x2={trendColumn(brkIndex, years.length).x - 2}
            y1="0"
            y2={TREND.height}
          />
        ) : null}
        <line
          className="lf-trend-base"
          x1="0"
          x2={TREND.width}
          y1={TREND.height}
          y2={TREND.height}
        />
      </svg>
      {brk === null ? null : (
        <p className="gn-break-note">
          {fillTemplate(
            t.gnP12Break,
            {
              yt: String(brk.year),
              t2: formatInteger(brk.after, lang),
              t1: formatInteger(brk.before, lang),
            },
            {},
            lang,
          )}
        </p>
      )}
      <YearAxis years={years.map((y) => y.birth_year)} />
    </div>
  );
}

function PlateNames({ facts, lang }: { facts: GivenNameListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const title = (sex: GivenNameListSexFacts, side: Side) => {
    const f = first(sex);
    const l = last(sex);
    return rich(
      of(side, t.gnP12TitleBoys, t.gnP12TitleGirls),
      {
        y1: String(l.birth_year),
        y0: String(f.birth_year),
        n: <Num>{formatInteger(l.names, lang)}</Num>,
        m: formatInteger(f.names, lang),
      },
      { n: l.names },
      lang,
    );
  };
  const lede = (sex: GivenNameListSexFacts) => {
    const brk = thresholdBreak(sex.years);
    return (
      <p>
        {brk === null
          ? t.gnP12LedePlain
          : fillTemplate(
              t.gnP12Lede,
              {
                yt: String(brk.year),
                t2: formatInteger(brk.after, lang),
                t1: formatInteger(brk.before, lang),
              },
              {},
              lang,
            )}
      </p>
    );
  };
  const brk = thresholdBreak(facts.sexes.male.years);
  const foot =
    brk === null ? t.gnP12FootPlain : fillTemplate(t.gnP12Foot, { yt: String(brk.year) }, {}, lang);
  return (
    <Plate
      id="gn-p12"
      number="12"
      name={t.gnP12Name}
      title={<PerSex facts={facts} inline render={title} />}
      lede={<PerSex facts={facts} render={lede} />}
      foot={foot}
      lang={lang}
      source={<GnSource facts={facts} lang={lang} />}
    >
      <div className="gn-wrap lf-rv">
        <div className="gn-box">
          <p className="lf-kicker">{t.gnP12ChartNames}</p>
          <PerSex facts={facts} render={(sex) => <NamesBars sex={sex} lang={lang} />} />
          <p className="lf-kicker gn-kicker-2">
            <Alt inline male={t.gnP12ChartChildrenBoys} female={t.gnP12ChartChildrenGirls} />
          </p>
          <PerSex
            facts={facts}
            render={(sex) => (
              <YearLine
                className="gn-children"
                years={sex.years.map((y) => y.birth_year)}
                values={sex.years.map((y) => y.children)}
                format={(v) => formatInteger(v, lang)}
              />
            )}
          />
        </div>
        <PerSex
          facts={facts}
          render={(sex, side) => {
            const f = first(sex);
            const l = last(sex);
            return (
              <div className="lf-big">
                <Fig
                  value={formatInteger(l.names, lang)}
                  label={fillTemplate(
                    of(side, t.gnP12StatNamesBoys, t.gnP12StatNamesGirls),
                    { y: String(l.birth_year) },
                    { n: l.names },
                    lang,
                  )}
                />
                <Fig
                  value={formatInteger(l.children, lang)}
                  label={fillTemplate(
                    of(side, t.gnP12StatChildrenBoys, t.gnP12StatChildrenGirls),
                    {},
                    { k: l.children },
                    lang,
                  )}
                />
                <Fig
                  value={formatInteger(f.children, lang)}
                  label={fillTemplate(
                    of(side, t.gnP12StatFirstBoys, t.gnP12StatFirstGirls),
                    { y: String(f.birth_year) },
                    { k: f.children },
                    lang,
                  )}
                />
              </div>
            );
          }}
        />
      </div>
    </Plate>
  );
}

// --- plate 13: number one --------------------------------------------------------

/** How many colours the strip cycles through; each run's name is written beside it anyway. */
const RUN_COLOURS = 6;

function RunStrip({ sex, lang }: { sex: GivenNameListSexFacts; lang: Lang }) {
  const t = UI[lang];
  const from = first(sex).birth_year;
  const to = last(sex).birth_year;
  const total = to - from + 1;
  const width = 1000;
  const x = (year: number) => ((year - from) / total) * width;
  return (
    <div className="gn-runs-fig">
      <svg className="gn-runs" viewBox={`0 0 ${String(width)} 110`} aria-hidden="true">
        {sex.number_one.map((run, i) => {
          const w = x(run.to_year + 1) - x(run.from_year);
          return (
            <g key={`${run.published}-${String(run.from_year)}`}>
              <rect
                className="gn-run"
                data-c={i % RUN_COLOURS}
                x={x(run.from_year) + 1}
                y="20"
                width={Math.max(0, w - 2)}
                height="52"
                rx="4"
              />
              {w >= 110 ? (
                <text
                  className="gn-run-label"
                  x={x(run.from_year) + w / 2}
                  y="52"
                  textAnchor="middle"
                >
                  {run.published}
                </text>
              ) : null}
            </g>
          );
        })}
        {sex.years
          .filter((y) => y.birth_year % 5 === 0)
          .map((y) => (
            <text key={y.birth_year} className="gn-run-year" x={x(y.birth_year) + 2} y="100">
              {String(y.birth_year)}
            </text>
          ))}
      </svg>
      <ol className="gn-run-legend">
        {sex.number_one.map((run, i) => (
          <li key={`${run.published}-${String(run.from_year)}`}>
            <i data-c={i % RUN_COLOURS} aria-hidden="true" />
            {fillTemplate(
              t.gnP13Run,
              { name: run.published, span: runSpan(run), n: formatInteger(run.years, lang) },
              { n: run.years },
              lang,
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlateNumberOne({ facts, lang }: { facts: GivenNameListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const title = (sex: GivenNameListSexFacts, side: Side) => {
    const run = longestRun(sex.number_one);
    if (run === null) return t.gnP13Name;
    return rich(
      of(side, t.gnP13TitleBoys, t.gnP13TitleGirls),
      {
        name: <b className="gn-name">{run.published}</b>,
        n: <Num>{formatInteger(run.years, lang)}</Num>,
        span: runSpan(run),
      },
      { n: run.years },
      lang,
    );
  };
  const years = { y0: String(facts.first_year), y1: String(facts.last_year) };
  return (
    <Plate
      id="gn-p13"
      number="13"
      name={t.gnP13Name}
      title={<PerSex facts={facts} inline render={title} />}
      lede={
        <PerSex
          facts={facts}
          render={(_sex, side) => (
            <p>{fillTemplate(of(side, t.gnP13LedeBoys, t.gnP13LedeGirls), years, {}, lang)}</p>
          )}
        />
      }
      foot={t.gnP13Foot}
      lang={lang}
      source={<GnSource facts={facts} lang={lang} />}
    >
      <div className="gn-wrap lf-rv">
        <div className="gn-box">
          <p className="lf-kicker">{t.gnP13Chart}</p>
          <PerSex facts={facts} render={(sex) => <RunStrip sex={sex} lang={lang} />} />
        </div>
        <PerSex
          facts={facts}
          render={(sex, side) => {
            const f = first(sex);
            const l = last(sex);
            const always = sex.always_top10;
            return (
              <div className="lf-big">
                {always.length === 0 ? (
                  <p className="lf-big-l">{fillTemplate(t.gnP13StatAlwaysNone, years, {}, lang)}</p>
                ) : (
                  <Fig
                    value={always.join(", ")}
                    label={fillTemplate(
                      always.length === 1 ? t.gnP13StatAlwaysOne : t.gnP13StatAlwaysMany,
                      years,
                      {},
                      lang,
                    )}
                  />
                )}
                <Fig
                  value={`${formatShare(f.top.share, lang)} → ${formatShare(l.top.share, lang)}`}
                  label={fillTemplate(
                    of(side, t.gnP13StatShareBoys, t.gnP13StatShareGirls),
                    { ...years, a: f.top.published, b: l.top.published },
                    {},
                    lang,
                  )}
                />
              </div>
            );
          }}
        />
      </div>
    </Plate>
  );
}

// --- plate 14: the ten -------------------------------------------------------------

function PlateTen({ facts, lang }: { facts: GivenNameListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const years = { y0: String(facts.first_year), y1: String(facts.last_year) };
  const title = (sex: GivenNameListSexFacts, side: Side) =>
    rich(
      of(side, t.gnP14TitleBoys, t.gnP14TitleGirls),
      {
        ...years,
        s1: <Num>{formatShare(last(sex).top10_share, lang)}</Num>,
        s0: formatShare(first(sex).top10_share, lang),
      },
      {},
      lang,
    );
  const lede = (sex: GivenNameListSexFacts, side: Side) => (
    <p>
      {rich(
        of(side, t.gnP14LedeBoys, t.gnP14LedeGirls),
        {
          ...years,
          h1: <b>{formatInteger(last(sex).half_names, lang)}</b>,
          h0: <b>{formatInteger(first(sex).half_names, lang)}</b>,
        },
        {},
        lang,
      )}
    </p>
  );
  return (
    <Plate
      id="gn-p14"
      number="14"
      name={t.gnP14Name}
      title={<PerSex facts={facts} inline render={title} />}
      lede={<PerSex facts={facts} render={lede} />}
      foot={t.gnP14Foot}
      lang={lang}
      source={<GnSource facts={facts} lang={lang} />}
    >
      <div className="gn-wrap lf-rv">
        <div className="gn-box">
          <p className="lf-kicker">
            <Alt inline male={t.gnP14ChartShareBoys} female={t.gnP14ChartShareGirls} />
          </p>
          <PerSex
            facts={facts}
            render={(sex) => (
              <YearLine
                className="gn-share"
                years={sex.years.map((y) => y.birth_year)}
                values={sex.years.map((y) => y.top10_share)}
                format={(v) => formatShare(v, lang)}
              />
            )}
          />
          <p className="lf-kicker gn-kicker-2">
            <Alt inline male={t.gnP14ChartHalfBoys} female={t.gnP14ChartHalfGirls} />
          </p>
          <PerSex
            facts={facts}
            render={(sex) => (
              <YearLine
                className="gn-half"
                years={sex.years.map((y) => y.birth_year)}
                values={sex.years.map((y) => y.half_names)}
                format={(v) => formatInteger(v, lang)}
              />
            )}
          />
        </div>
        <PerSex
          facts={facts}
          render={(sex, side) => {
            const f = first(sex);
            const l = last(sex);
            return (
              <div className="lf-big">
                <Fig
                  value={`${formatShare(f.top10_share, lang)} → ${formatShare(l.top10_share, lang)}`}
                  label={fillTemplate(t.gnP14StatShare, years, {}, lang)}
                />
                <Fig
                  value={`${formatInteger(f.half_names, lang)} → ${formatInteger(l.half_names, lang)}`}
                  label={fillTemplate(
                    of(side, t.gnP14StatHalfBoys, t.gnP14StatHalfGirls),
                    years,
                    {},
                    lang,
                  )}
                />
                <Fig
                  value={`${formatShare(f.top.share, lang)} → ${formatShare(l.top.share, lang)}`}
                  label={fillTemplate(t.gnP14StatTop, years, {}, lang)}
                />
              </div>
            );
          }}
        />
      </div>
    </Plate>
  );
}

// --- plate 15: the first year and the last, side by side -------------------------

function TopTen({
  sex,
  era,
  lang,
}: {
  sex: GivenNameListSexFacts;
  era: "first" | "last";
  lang: Lang;
}) {
  const t = UI[lang];
  const items = era === "first" ? sex.top_first : sex.top_last;
  const year = era === "first" ? first(sex) : last(sex);
  const max = items[0]?.count ?? 0;
  const always = new Set(sex.always_top10);
  return (
    <div className="gn-ten" data-era={era}>
      <p className="lf-kicker">
        {fillTemplate(t.gnP15Year, { y: String(year.birth_year) }, {}, lang)}
      </p>
      <ol className="lf-top-list">
        {items.map((item, i) => (
          <li key={item.published} style={vars({ w: linearScale(item.count, max) })}>
            <span className="lf-top-rank">{String(i + 1)}.</span>
            <span className="lf-top-name">
              <span className={always.has(item.published) ? "gn-name gn-always" : "gn-name"}>
                {item.published}
              </span>
              <i className="lf-top-bar" aria-hidden="true" />
            </span>
            <span className="lf-count">{formatInteger(item.count, lang)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlateFirstLast({ facts, lang }: { facts: GivenNameListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const years = { y0: String(facts.first_year), y1: String(facts.last_year) };
  const title = (sex: GivenNameListSexFacts) => {
    const always = sex.always_top10;
    if (always.length === 0) return fillTemplate(t.gnP15TitleNone, years, {}, lang);
    return rich(
      always.length === 1 ? t.gnP15TitleOne : t.gnP15TitleMany,
      { ...years, names: <b className="gn-name">{always.join(", ")}</b> },
      {},
      lang,
    );
  };
  return (
    <Plate
      id="gn-p15"
      number="15"
      name={fillTemplate(t.gnP15Name, years, {}, lang)}
      title={<PerSex facts={facts} inline render={title} />}
      lede={
        <PerSex
          facts={facts}
          render={(_sex, side) => <p>{of(side, t.gnP15LedeBoys, t.gnP15LedeGirls)}</p>}
        />
      }
      foot={fillTemplate(t.gnP15Foot, years, {}, lang)}
      lang={lang}
      source={<GnSource facts={facts} lang={lang} />}
    >
      <div className="gn-two lf-rv">
        <PerSex facts={facts} render={(sex) => <TopTen sex={sex} era="first" lang={lang} />} />
        <PerSex facts={facts} render={(sex) => <TopTen sex={sex} era="last" lang={lang} />} />
      </div>
    </Plate>
  );
}

// --- plate 16: new names ---------------------------------------------------------

function PlateNew({ facts, lang }: { facts: GivenNameListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const years = { y0: String(facts.first_year), y1: String(facts.last_year) };
  const brk = thresholdBreak(facts.sexes.male.years);
  const th = {
    yt: String(brk?.year ?? facts.first_year),
    t2: formatInteger(brk?.after ?? last(facts.sexes.male).publication_threshold, lang),
    t1: formatInteger(brk?.before ?? first(facts.sexes.male).publication_threshold, lang),
  };
  const title = (sex: GivenNameListSexFacts) =>
    rich(
      t.gnP16Title,
      { ...years, n: <Num>{formatInteger(sex.change.on_last_not_first, lang)}</Num> },
      { n: sex.change.on_last_not_first },
      lang,
    );
  const lede = (sex: GivenNameListSexFacts) => (
    <p>
      {fillTemplate(
        t.gnP16Lede,
        {
          ...years,
          ...th,
          m: formatInteger(sex.change.on_first_not_last, lang),
          b: formatInteger(sex.change.on_both, lang),
        },
        { m: sex.change.on_first_not_last, b: sex.change.on_both },
        lang,
      )}
    </p>
  );
  return (
    <Plate
      id="gn-p16"
      number="16"
      name={t.gnP16Name}
      title={<PerSex facts={facts} inline render={title} />}
      lede={<PerSex facts={facts} render={lede} />}
      foot={t.gnP16Foot}
      lang={lang}
      source={<GnSource facts={facts} lang={lang} />}
    >
      <PerSex
        facts={facts}
        render={(sex) => (
          <div className="gn-change lf-rv">
            <p className="lf-big-fig" data-era="first">
              <span className="lf-big-v">
                <Num>{formatInteger(sex.change.on_first_not_last, lang)}</Num>
              </span>
              <span className="lf-big-l">
                {fillTemplate(t.gnP16OnlyFirst, { ...years, t2: th.t2 }, {}, lang)}
              </span>
            </p>
            <p className="lf-big-fig">
              <span className="lf-big-v">
                <Num>{formatInteger(sex.change.on_both, lang)}</Num>
              </span>
              <span className="lf-big-l">{t.gnP16Both}</span>
            </p>
            <p className="lf-big-fig" data-era="last">
              <span className="lf-big-v">
                <Num>{formatInteger(sex.change.on_last_not_first, lang)}</Num>
              </span>
              <span className="lf-big-l">
                {fillTemplate(t.gnP16OnlyLast, { ...years, t1: th.t1 }, {}, lang)}
              </span>
            </p>
          </div>
        )}
      />
    </Plate>
  );
}

// --- plate 17: the first letter and the -a ending ---------------------------------

function PlateLetter({ facts, lang }: { facts: GivenNameListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const years = { y0: String(facts.first_year), y1: String(facts.last_year) };
  const title = (sex: GivenNameListSexFacts, side: Side) => {
    const f = first(sex);
    const l = last(sex);
    return side === "male"
      ? rich(
          t.gnP17TitleBoys,
          {
            ...years,
            s1: <Num>{formatShare(l.top_letter.share, lang)}</Num>,
            l1: <b className="gn-name">{l.top_letter.letter}</b>,
            l0: f.top_letter.letter,
            s0: formatShare(f.top_letter.share, lang),
          },
          {},
          lang,
        )
      : rich(
          t.gnP17TitleGirls,
          {
            ...years,
            s1: <Num>{formatShare(l.ends_a_share, lang)}</Num>,
            s0: formatShare(f.ends_a_share, lang),
          },
          {},
          lang,
        );
  };
  const letters = (sex: GivenNameListSexFacts) =>
    [...new Set(sex.years.map((y) => y.top_letter.letter))].join(", ");
  return (
    <Plate
      id="gn-p17"
      number="17"
      name={t.gnP17Name}
      title={<PerSex facts={facts} inline render={title} />}
      lede={
        <PerSex
          facts={facts}
          render={(_sex, side) => <p>{of(side, t.gnP17LedeBoys, t.gnP17LedeGirls)}</p>}
        />
      }
      foot={t.gnP17Foot}
      lang={lang}
      source={<GnSource facts={facts} lang={lang} />}
    >
      <div className="gn-wrap lf-rv">
        <div className="gn-box">
          <p className="lf-kicker">
            <Alt inline male={t.gnP17ChartEndsBoys} female={t.gnP17ChartEndsGirls} />
          </p>
          <PerSex
            facts={facts}
            render={(sex) => (
              <YearLine
                className="gn-ends"
                years={sex.years.map((y) => y.birth_year)}
                values={sex.years.map((y) => y.ends_a_share)}
                format={(v) => formatShare(v, lang)}
              />
            )}
          />
          <p className="lf-kicker gn-kicker-2">
            <PerSex
              facts={facts}
              inline
              render={(sex) =>
                fillTemplate(t.gnP17ChartLetter, { letters: letters(sex) }, {}, lang)
              }
            />
          </p>
          <PerSex
            facts={facts}
            render={(sex) => (
              <YearLine
                className="gn-letter"
                years={sex.years.map((y) => y.birth_year)}
                values={sex.years.map((y) => y.top_letter.share)}
                format={(v) => formatShare(v, lang)}
              />
            )}
          />
        </div>
        <PerSex
          facts={facts}
          render={(sex, side) => {
            const f = first(sex);
            const l = last(sex);
            return (
              <div className="lf-big">
                <Fig
                  value={l.top_letter.letter}
                  label={fillTemplate(
                    of(side, t.gnP17StatLetterBoys, t.gnP17StatLetterGirls),
                    { y: String(l.birth_year), s: formatShare(l.top_letter.share, lang) },
                    {},
                    lang,
                  )}
                />
                <Fig
                  value={`${formatShare(f.ends_a_share, lang)} → ${formatShare(l.ends_a_share, lang)}`}
                  label={fillTemplate(t.gnP17StatEnds, years, {}, lang)}
                />
              </div>
            );
          }}
        />
      </div>
    </Plate>
  );
}

/** The plates of Part II, in order, for the chapter nav. */
export const GIVEN_NAME_PLATES = [
  ["gn-p12", "12", "gnP12Name"],
  ["gn-p13", "13", "gnP13Name"],
  ["gn-p14", "14", "gnP14Name"],
  ["gn-p15", "15", "gnP15Name"],
  ["gn-p16", "16", "gnP16Name"],
  ["gn-p17", "17", "gnP17Name"],
] as const;

/**
 * Part II of the Atlas page. No facts, no part: when `givenNameListFacts()`
 * failed the page renders without it rather than with figures from anywhere
 * else.
 */
export function GivenNameAtlas({
  facts,
  lang,
}: {
  facts: GivenNameListFactsArtefact | null;
  lang: Lang;
}) {
  if (facts === null) return null;
  const t = UI[lang];
  const years = { from: String(facts.first_year), to: String(facts.last_year) };
  const head = (
    <header className="lf-head">
      <div className="lf-head-title">
        <p className="lf-eyebrow">
          {fillTemplate(
            t.gnEyebrow,
            { ...years, n: formatInteger(GIVEN_NAME_PLATES.length, lang) },
            { n: GIVEN_NAME_PLATES.length },
            lang,
          )}
        </p>
        <h2 id="gn-title" className="lf-title">
          {t.gnTitle}
        </h2>
      </div>
      <div className="lf-head-text">
        <p className="lf-lede">{fillTemplate(t.gnLede, years, {}, lang)}</p>
        <p className="lf-scope">{t.gnScope}</p>
      </div>
    </header>
  );
  return (
    <ListAtlasShell
      name="gn-list"
      className="gn"
      labelledBy="gn-title"
      labels={{
        group: t.gnSwitchLabel,
        male: t.gnSwitchBoys,
        female: t.gnSwitchGirls,
        note: t.lfSwitchNote,
      }}
      head={head}
    >
      <PlateNames facts={facts} lang={lang} />
      <PlateNumberOne facts={facts} lang={lang} />
      <PlateTen facts={facts} lang={lang} />
      <PlateFirstLast facts={facts} lang={lang} />
      <PlateNew facts={facts} lang={lang} />
      <PlateLetter facts={facts} lang={lang} />
    </ListAtlasShell>
  );
}

export { SIDES as GIVEN_NAME_SIDES, sexOf };
