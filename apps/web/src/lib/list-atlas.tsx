import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ListFacts, ListFactsArtefact } from "@name-atlas/contracts";
import {
  assessmentWord,
  fillTemplate,
  formatChance,
  formatCompact,
  formatDate,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatQuantile,
  formatShare,
  parseTemplate,
  pluralForm,
  terminate,
  UI,
} from "./messages.js";
import type { Lang } from "./messages.js";
import { ListAtlasShell } from "./list-atlas-shell.js";
import {
  anchorFor,
  fitTiers,
  linearPosition,
  logPosition,
  niceTicks,
  powersOfTen,
  round1,
} from "./list-atlas-geometry.js";
import { atlasLayout, STRIP_DOT, STRIP_WIDTH } from "./list-atlas-layout.js";
import type { AtlasLayout, ListLayout } from "./list-atlas-layout.js";

/** The spark's row on a 360px phone, in px: its value labels are hung to stay inside it. */
const SPARK_NARROW_PX = 296;

/**
 * The landing atlas, part 1 (TASK-040): three plates about each whole
 * published PESEL list, rendered from `listFacts()`.
 *
 * **This view derives nothing.** Every figure a reader sees is a value the
 * artefact carries, formatted by `messages.ts`: nothing is added, subtracted,
 * averaged, counted or compared here. The only arithmetic is presentation
 * geometry — where a mark sits on an axis, how dots are packed — in
 * `list-atlas-geometry.ts`, laid out once per artefact by
 * `list-atlas-layout.ts` (ADR-0015 §2.5). One kind of number is printed that
 * is not a stored value: the length of one of the artefact's example arrays
 * (plate II's "64 example rooms"), which counts the illustration on the page
 * itself, not anything on a list.
 *
 * The male and female lists are two universes. They are drawn side by side,
 * each on its own axis, every sentence and every heading that carries a figure
 * names its list, and no number on the page is a sum, union or comparison of
 * the two. A plate headline comes in one variant per list, each naming its
 * own list; the list switch picks which one shows. No surname string appears:
 * the examples are unnamed pairs and groups, and the top of a list is "the
 * list's most common surname".
 */

type Side = "male" | "female";
const SIDES: readonly Side[] = ["male", "female"];

type Messages = (typeof UI)[Lang];

function sideWords(t: Messages, side: Side) {
  return side === "male"
    ? {
        label: t.lfListMale,
        listIn: t.lfListInMale,
        title1: t.lfP1TitleMale,
        title3: t.lfP3TitleMale,
        title3Thousand: t.lfP3TitleThousandMale,
        lede3: t.lfP3LedeMale,
        bottomRow: t.lfP1BottomRowMale,
        flagPerson: t.lfP1FlagPersonMale,
        thresholdPeople: t.lfP1ThresholdPeopleMale,
        figure1: t.lfP1FigureMale,
        setSub: t.lfP3SetSubMale,
      }
    : {
        label: t.lfListFemale,
        listIn: t.lfListInFemale,
        title1: t.lfP1TitleFemale,
        title3: t.lfP3TitleFemale,
        title3Thousand: t.lfP3TitleThousandFemale,
        lede3: t.lfP3LedeFemale,
        bottomRow: t.lfP1BottomRowFemale,
        flagPerson: t.lfP1FlagPersonFemale,
        thresholdPeople: t.lfP1ThresholdPeopleFemale,
        figure1: t.lfP1FigureFemale,
        setSub: t.lfP3SetSubFemale,
      };
}

/** A template as React nodes: `{key}` slots, agreeing words and `**emphasis**`. */
function rich(
  template: string,
  slots: Readonly<Record<string, ReactNode>>,
  counts: Readonly<Record<string, number>>,
  lang: Lang,
): ReactNode {
  return parseTemplate(template).map((part, index) => {
    let node: ReactNode;
    if (part.kind === "text") node = part.text;
    else if (part.kind === "slot") node = slots[part.key] ?? null;
    else {
      const n = counts[part.key];
      node = n === undefined ? null : pluralForm(n, part.forms, lang);
    }
    return part.strong ? <b key={index}>{node}</b> : <Fragment key={index}>{node}</Fragment>;
  });
}

/** A figure in a headline or a counter: sans, tabular, resolves once. */
function Num({ children }: { children: ReactNode }) {
  return <span className="lf-n">{children}</span>;
}

/** Positions as inline custom properties; `--x`/`--y` are unitless fractions. */
function at(x: number, y?: number): CSSProperties {
  const style: Record<string, string> = { "--x": String(Number(x.toFixed(4))) };
  if (y !== undefined) style["--y"] = String(Number(y.toFixed(4)));
  return style as CSSProperties;
}

/** A label's tier as the stylesheet reads it: no attribute for tier 0 (always drawn), "none" for never. */
function fitAttr(tier: number | undefined): string | undefined {
  if (tier === undefined || tier < 0) return "none";
  return tier === 0 ? undefined : String(tier);
}

interface RowItem {
  readonly key: string;
  readonly x: number;
  readonly text: string;
  readonly className?: string;
  /** Hang the label this way from its mark, where it fits, instead of centring it. */
  readonly away?: "start" | "end";
}

/**
 * One row of axis labels, each hung from its mark so it stays inside the row,
 * and fitted so none overlaps another or a reserved mark at any row width and
 * text size: a label is drawn only where its row is wide enough, in em, for it
 * (`fitTiers`), and dropped where it never is (presentation only; the figure
 * it names is in the fact card either way).
 */
function Labels({
  items,
  className,
  order,
  reserved = [],
}: {
  items: readonly RowItem[];
  className: string;
  order?: readonly number[];
  reserved?: readonly number[];
}) {
  const fits = fitTiers(
    items.map((item) => ({
      x: item.x,
      chars: [...item.text].length,
      ...(item.away === undefined ? {} : { away: item.away }),
    })),
    order ?? items.map((_, i) => i),
    reserved,
  );
  return (
    <>
      {items.map((item, i) => (
        <span
          key={item.key}
          className={`lf-lab ${className}${item.className === undefined ? "" : ` ${item.className}`}`}
          data-anchor={fits[i]?.anchor}
          data-fit={fitAttr(fits[i]?.tier)}
          style={at(item.x)}
        >
          {item.text}
        </span>
      ))}
    </>
  );
}

function curvePoint(facts: ListFacts, n: number) {
  return facts.collision.curve.find((point) => point.n === n);
}

function reach(facts: ListFacts, set: "TOP_1" | "TOP_10" | "TOP_100") {
  return facts.crowd.reach_half.find((r) => r.set === set);
}

function expectedAt(facts: ListFacts, n: number) {
  return facts.crowd.expected_distinct.find((e) => e.n === n);
}

// --- plate furniture ------------------------------------------------------

function Plate({
  id,
  number,
  title,
  lede,
  children,
  fact,
  caveat,
  source,
}: {
  id: string;
  number: string;
  title: ReactNode;
  lede: ReactNode;
  children: ReactNode;
  fact: ReactNode;
  caveat: string;
  source: ReactNode;
}) {
  return (
    <article id={id} className="lf-plate" aria-labelledby={`${id}-title`}>
      <span className="lf-crop" aria-hidden="true" />
      <header className="lf-plate-head lf-rv">
        <p className="lf-plate-no">{number}</p>
        <h3 id={`${id}-title`} className="lf-plate-title">
          {title}
        </h3>
        <p className="lf-plate-lede">{lede}</p>
      </header>
      {children}
      <div className="lf-notes">
        <p className="lf-fact">{fact}</p>
        <p className="lf-caveat">{caveat}</p>
      </div>
      {source}
    </article>
  );
}

/**
 * Two variants of one line, each naming its own list; the stylesheet shows
 * the one the list switch has chosen (the male list until the reader picks).
 * Both sit in one grid cell (`.lf-per`), so the line is as tall as the taller
 * variant whichever shows, and flipping lists moves nothing below it.
 */
function PerList({ male, female }: { male: ReactNode; female: ReactNode }) {
  return (
    <span className="lf-per">
      <span data-v="male">{male}</span>
      <span data-v="female">{female}</span>
    </span>
  );
}

/**
 * The snapshot date with its day and month, and its year and "r.", kept
 * together by non-breaking spaces, so a narrow line breaks between the two
 * and never inside either ("20 stycznia 2026 r.", "20 January 2026").
 */
function keptDate(iso: string, lang: Lang): string {
  const words = formatDate(iso, lang).split(" ");
  if (words.length < 3) return words.join("\u00a0");
  return `${words.slice(0, 2).join("\u00a0")} ${words.slice(2).join("\u00a0")}`;
}

function SourceLine({
  facts,
  method,
  lang,
}: {
  facts: ListFactsArtefact;
  method: (list: ListFacts) => string;
  lang: Lang;
}) {
  const t = UI[lang];
  const { male, female } = facts.lists;
  const methods = [...new Set([method(male), method(female)])].join(", ");
  const statuses = [
    ...new Set([male.assessment.confidence_status, female.assessment.confidence_status]),
  ]
    .map((status) => assessmentWord(status, lang))
    .join(", ");
  const date = keptDate(facts.snapshot_date, lang);
  // Both lists are resources of one dataset: one link when they share a page.
  const line =
    male.source.source_page_url === female.source.source_page_url
      ? rich(
          t.lfSource,
          { link: <a href={male.source.source_page_url}>{t.lfSourceName}</a>, date },
          {},
          lang,
        )
      : rich(
          t.lfSourceTwo,
          {
            male: <a href={male.source.source_page_url}>{t.lfListInMale}</a>,
            female: <a href={female.source.source_page_url}>{t.lfListInFemale}</a>,
            date,
          },
          {},
          lang,
        );
  return (
    <p className="lf-source">
      <span>{line}</span>
      <span className="lf-method">
        {fillTemplate(t.lfMethod, { status: statuses, method: methods }, {}, lang)}
      </span>
    </p>
  );
}

// --- plate I: Suwak ---------------------------------------------------------

/** One list's slide rule: surnames above, counts in the middle, people below. */
function Sheet({ facts, side, lang }: { facts: ListFacts; side: Side; lang: Lang }) {
  const t = UI[lang];
  const w = sideWords(t, side);
  const s = facts.summary;
  const max = s.max_count;
  const x = (count: number) => logPosition(count, max);
  const xs = x(s.median_count_per_surname);
  const xp = x(s.median_count_per_person);

  // Entries are looked up by their key and ordered here, never read by position.
  const surnameQuantiles = [...s.surname_quantiles].sort((a, b) => a.q - b.q);
  const personQuantiles = [...s.person_quantiles].sort((a, b) => a.q - b.q);
  // A person quantile at the list's largest count sits on the count axis's own
  // end tick; drawn there it would suggest some people carry a surname more
  // common still. The fact stays in the figure's label.
  const personTicks = personQuantiles.filter((q) => q.count < max);
  const topX = surnameQuantiles.map((q) => x(q.count));
  const bottomX = personTicks.map((q) => x(q.count));
  const counts = [s.min_count, ...powersOfTen(s.min_count, max), max];
  const countX = counts.map(x);
  const rungs = [...s.thresholds]
    .sort((a, b) => a.at_least - b.at_least)
    .filter((r) => r.at_least > s.min_count && r.at_least <= max);
  const rungX = rungs.map((r) => x(r.at_least));
  // Rung labels only on a wide screen (the stylesheet hides the rungs on a
  // phone), where the row has room, clear of the typical surname's stem, round
  // thresholds first; the list below carries them all.
  const rungOrder = rungs
    .map((r, i) => ({ i, rank: [1000, 100, 10000].indexOf(r.at_least) }))
    .sort((a, b) => (a.rank < 0 ? 99 : a.rank) - (b.rank < 0 ? 99 : b.rank) || b.i - a.i)
    .map((o) => o.i);

  const quantileText = (template: string, list: typeof s.surname_quantiles) =>
    list
      .map((q) =>
        fillTemplate(
          template,
          { q: formatQuantile(q.q, lang), c: formatInteger(q.count, lang) },
          { c: q.count },
          lang,
        ),
      )
      .join("; ");
  const label = fillTemplate(
    w.figure1,
    {
      min: formatInteger(s.min_count, lang),
      max: formatInteger(max, lang),
      s: formatInteger(s.median_count_per_surname, lang),
      p: formatInteger(s.median_count_per_person, lang),
      surnames: quantileText(t.lfP1FigureSurnameQuantile, surnameQuantiles),
      people: quantileText(t.lfP1FigurePersonQuantile, personQuantiles),
    },
    { s: s.median_count_per_surname },
    lang,
  );

  const flagSide = (fx: number) => (fx > 0.5 ? "end" : "start");
  const personFlag = rich(
    w.flagPerson,
    { p: <b>{formatInteger(s.median_count_per_person, lang)}</b> },
    {},
    lang,
  );
  const X = (fx: number) => round1(fx * 1000);

  return (
    <div className="lf-sheet lf-rv" data-l={side}>
      <div className="lf-sheet-head">
        <p className="lf-label">{w.label}</p>
        <p className="lf-axis-note">{t.lfP1AxisNote}</p>
      </div>
      <p className="lf-row-cap">{t.lfP1TopRow}</p>
      <div className="lf-scale" role="img" aria-label={label}>
        <div className="lf-plot">
          <svg
            className="lf-scale-lines"
            viewBox="0 0 1000 190"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <line className="lf-rule" x1={0} x2={1000} y1={26} y2={26} />
            {topX.map((fx, i) => (
              <line
                key={`t${String(i)}`}
                className="lf-qtick"
                x1={X(fx)}
                x2={X(fx)}
                y1={19}
                y2={26}
              />
            ))}
            <line className="lf-axis" x1={X(x(s.min_count))} x2={1000} y1={92} y2={92} />
            {countX.map((fx, i) => (
              <line
                key={`c${String(i)}`}
                className="lf-ctick"
                x1={X(fx)}
                x2={X(fx)}
                y1={88}
                y2={97}
              />
            ))}
            {rungX.map((fx, i) => (
              <line
                key={`r${String(i)}`}
                className="lf-rung"
                x1={X(fx)}
                x2={X(fx)}
                y1={70}
                y2={92}
              />
            ))}
            <path
              className="lf-arc"
              d={`M${String(X(xs))} 52C${String(X(xs))} 96 ${String(X(xp))} 80 ${String(X(xp))} 124`}
              pathLength={1}
            />
            <line className="lf-stem lf-stem-top" x1={X(xs)} x2={X(xs)} y1={34} y2={92} />
            <line className="lf-stem lf-stem-bottom" x1={X(xp)} x2={X(xp)} y1={92} y2={128} />
            <line className="lf-rule" x1={0} x2={1000} y1={164} y2={164} />
            {bottomX.map((fx, i) => (
              <line
                key={`b${String(i)}`}
                className="lf-qtick"
                x1={X(fx)}
                x2={X(fx)}
                y1={164}
                y2={171}
              />
            ))}
          </svg>
          <span className="lf-omitted" style={at(x(s.min_count))} />
          <Labels
            className="lf-lab-top"
            items={surnameQuantiles.map((q, i) => ({
              key: `tq${String(q.q)}`,
              x: topX[i] ?? 0,
              text: formatQuantile(q.q, lang),
            }))}
          />
          <span className="lf-flag lf-flag-top" data-side={flagSide(xs)} style={at(xs)}>
            {rich(
              t.lfP1FlagSurname,
              { s: <b>{formatInteger(s.median_count_per_surname, lang)}</b> },
              { s: s.median_count_per_surname },
              lang,
            )}
          </span>
          <Labels
            className="lf-lab-rung"
            order={rungOrder}
            reserved={[xs]}
            items={rungs.map((r, i) => ({
              key: `r${String(r.at_least)}`,
              x: rungX[i] ?? 0,
              text: fillTemplate(
                t.lfP1Rung,
                { t: formatInteger(r.at_least, lang), n: formatInteger(r.surnames, lang) },
                { n: r.surnames },
                lang,
              ),
            }))}
          />
          <span className="lf-dot lf-dot-surname" style={at(xs)} />
          <span className="lf-dot lf-dot-person" style={at(xp)} />
          <span className="lf-dot lf-dot-max" style={at(1)} />
          <Labels
            className="lf-lab-count"
            reserved={[xp]}
            order={[counts.length - 1, 0, ...counts.slice(1, -1).map((_, i) => i + 1)]}
            items={counts.map((c, i) => ({
              key: `c${String(c)}`,
              x: countX[i] ?? 0,
              text: formatInteger(c, lang),
            }))}
          />
          <span className="lf-flag lf-flag-bottom" data-side={flagSide(xp)} style={at(xp)}>
            <span className="lf-flag-full">{personFlag}</span>
            <b className="lf-flag-short">{formatInteger(s.median_count_per_person, lang)}</b>
          </span>
          <Labels
            className="lf-lab-bottom"
            items={personTicks.map((q, i) => ({
              key: `bq${String(q.q)}`,
              x: bottomX[i] ?? 0,
              text: formatQuantile(q.q, lang),
              // Under the typical person's flag, a label hangs away from the
              // flag's side, so a flag wrapping deep (large text) never covers it.
              ...(q.count === s.median_count_per_person
                ? { away: flagSide(xp) === "end" ? ("start" as const) : ("end" as const) }
                : {}),
            }))}
          />
        </div>
      </div>
      <p className="lf-row-cap">{w.bottomRow}</p>
      {/* Where the sheet is too narrow for the flag's sentence (a small phone,
          large text), the flag keeps its number and the sentence moves here. */}
      <p className="lf-row-cap lf-row-cap-flag" aria-hidden="true">
        <i className="lf-key lf-key-typical" />
        <span>{personFlag}</span>
      </p>
      <ul className="lf-legend" aria-hidden="true">
        <li>
          <i className="lf-key lf-key-omitted" />
          {t.lfP1Omitted}
        </li>
        <li>
          <i className="lf-key lf-key-max" />
          {`${formatInteger(max, lang)}: ${t.lfP1Max}`}
        </li>
        <li>
          <i className="lf-key lf-key-arc" />
          {t.lfP1Arc}
        </li>
      </ul>
      <div className="lf-clubs">
        <p className="lf-clubs-head">{t.lfP1ThresholdsHeading}</p>
        <dl>
          {rungs.map((r) => (
            <div key={r.at_least}>
              <dt>
                {fillTemplate(
                  t.lfP1ThresholdAtLeast,
                  { t: formatInteger(r.at_least, lang) },
                  { t: r.at_least },
                  lang,
                )}
              </dt>
              <dd className="lf-clubs-n">
                {fillTemplate(
                  t.lfP1ThresholdSurnames,
                  { n: formatInteger(r.surnames, lang) },
                  { n: r.surnames },
                  lang,
                )}
              </dd>
              <dd>
                {fillTemplate(
                  w.thresholdPeople,
                  { p: formatInteger(r.people, lang) },
                  { p: r.people },
                  lang,
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function PlateSuwak({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const { male, female } = facts.lists;
  const title = (side: Side) => {
    const s = facts.lists[side].summary;
    return rich(
      sideWords(t, side).title1,
      {
        s: <Num>{formatInteger(s.median_count_per_surname, lang)}</Num>,
        p: <Num>{formatInteger(s.median_count_per_person, lang)}</Num>,
      },
      { s: s.median_count_per_surname },
      lang,
    );
  };
  const fact = rich(
    t.lfP1Fact,
    {
      sm: formatInteger(male.summary.median_count_per_surname, lang),
      sf: formatInteger(female.summary.median_count_per_surname, lang),
      pm: formatInteger(male.summary.median_count_per_person, lang),
      pf: formatInteger(female.summary.median_count_per_person, lang),
      nm: formatInteger(male.summary.people, lang),
      nf: formatInteger(female.summary.people, lang),
      rm: formatInteger(male.summary.surnames, lang),
      rf: formatInteger(female.summary.surnames, lang),
      xm: formatInteger(male.summary.max_count, lang),
      xf: formatInteger(female.summary.max_count, lang),
    },
    {
      sm: male.summary.median_count_per_surname,
      sf: female.summary.median_count_per_surname,
      nm: male.summary.people,
      nf: female.summary.people,
      rm: male.summary.surnames,
      rf: female.summary.surnames,
      xf: female.summary.max_count,
    },
    lang,
  );
  return (
    <Plate
      id="lf-p1"
      number={t.lfP1No}
      title={<PerList male={title("male")} female={title("female")} />}
      lede={t.lfP1Lede}
      fact={fact}
      caveat={t.lfP1Caveat}
      source={<SourceLine facts={facts} method={(l) => l.summary.method_version} lang={lang} />}
    >
      <div className="lf-sheets">
        {SIDES.map((side) => (
          <Sheet key={side} facts={facts.lists[side]} side={side} lang={lang} />
        ))}
      </div>
    </Plate>
  );
}

// --- plate II: Sala -------------------------------------------------------

/** The shared-surname curve P(n), its half line and node, and the birthday reference. */
function Curve({
  facts,
  layout,
  side,
  birthdayN,
  birthdayHalf,
  lang,
}: {
  facts: ListFacts;
  layout: ListLayout;
  side: Side;
  birthdayN: number;
  /** The birthday model's chance at its own n: a model constant, drawn on the half line. */
  birthdayHalf: number;
  lang: Lang;
}) {
  const t = UI[lang];
  const c = facts.collision;
  const { first, last, path } = layout.curve;
  const fx = (n: number) => linearPosition(n, 0, last);
  const half = curvePoint(facts, c.n_half);
  const birthday = curvePoint(facts, birthdayN);
  const birthdayP = birthdayHalf;
  const ticks = niceTicks(last, 3).filter((n) => n !== c.n_half && n !== birthdayN);
  const labels: RowItem[] = [
    { n: c.n_half, className: "lf-lab-half" },
    { n: birthdayN, className: "lf-lab-bday" },
    ...ticks.map((n) => ({ n })),
  ].map((l) => ({ key: `x${String(l.n)}`, x: fx(l.n), text: formatInteger(l.n, lang), ...l }));
  const aria = fillTemplate(
    t.lfP2CurveFigure,
    {
      list: sideWords(t, side).listIn,
      from: formatInteger(first, lang),
      to: formatInteger(last, lang),
      n: formatInteger(c.n_half, lang),
      p: formatChance(c.p_at_n_half, lang),
      bn: formatInteger(birthdayN, lang),
      p23: birthday === undefined ? "" : formatChance(birthday.p, lang),
    },
    {},
    lang,
  );
  const X = (n: number) => round1(fx(n) * 1000);
  return (
    <div className="lf-curve" role="img" aria-label={aria}>
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <line className="lf-grid" x1={0} x2={1000} y1={0} y2={0} />
        <line className="lf-grid lf-grid-half" x1={0} x2={1000} y1={500} y2={500} />
        <line className="lf-axis" x1={0} x2={1000} y1={1000} y2={1000} />
        <line
          className="lf-bday-line"
          x1={X(birthdayN)}
          x2={X(birthdayN)}
          y1={1000}
          y2={round1((1 - birthdayP) * 1000)}
        />
        <path className="lf-curve-line" d={path} pathLength={1} />
        {half === undefined ? null : (
          <line
            className="lf-drop"
            x1={X(c.n_half)}
            x2={X(c.n_half)}
            y1={round1((1 - half.p) * 1000)}
            y2={1000}
          />
        )}
      </svg>
      <span className="lf-ylab" style={at(0, 1)}>
        {formatPercent(1, lang, 0)}
      </span>
      <span className="lf-ylab lf-ylab-end" style={at(1, 0.5)}>
        {formatPercent(0.5, lang, 0)}
      </span>
      <span className="lf-node lf-node-bday" style={at(fx(birthdayN), birthdayP)} />
      <span className="lf-node-lab lf-node-lab-bday" style={at(fx(birthdayN), birthdayP)}>
        {t.lfP2BirthdayTick}
      </span>
      {birthday === undefined ? null : (
        <>
          <span className="lf-node lf-node-p23" style={at(fx(birthdayN), birthday.p)} />
          <span className="lf-node-lab lf-node-lab-p23" style={at(fx(birthdayN), birthday.p)}>
            {formatChance(birthday.p, lang)}
          </span>
        </>
      )}
      {half === undefined ? null : (
        <span className="lf-node lf-node-half" style={at(fx(c.n_half), half.p)} />
      )}
      <Labels className="lf-lab-x" items={labels} />
      <span className="lf-xnote">{t.lfP2XAxis}</span>
    </div>
  );
}

/**
 * The example rooms as dots on the curve's own n axis: where each room's first
 * pair arrived. The picture has a short label; the values themselves are a
 * list a screen reader can step through (a label reading out every room would
 * not be).
 */
function Strip({
  facts,
  layout,
  height,
  side,
  lang,
}: {
  facts: ListFacts;
  layout: ListLayout;
  /** Shared by both columns so they line up (`AtlasLayout.stripHeight`). */
  height: number;
  side: Side;
  lang: Lang;
}) {
  const t = UI[lang];
  const { xs, levels, half } = layout.strip;
  const list = sideWords(t, side).listIn;
  return (
    <div className="lf-strip">
      <div role="img" aria-label={fillTemplate(t.lfP2StripFigure, { list }, {}, lang)}>
        <svg
          viewBox={`0 0 ${String(STRIP_WIDTH)} ${String(height)}`}
          aria-hidden="true"
          focusable="false"
        >
          <line className="lf-strip-half" x1={half} x2={half} y1={0} y2={height} />
          {xs.map((x, i) => (
            <circle
              key={i}
              className={i === 0 ? "lf-room-dot lf-room-dot-this" : "lf-room-dot"}
              cx={round1(x)}
              cy={round1(height - 3 - STRIP_DOT / 2 - (levels[i] ?? 0) * STRIP_DOT)}
              r={STRIP_DOT / 2 - 2}
              style={{ "--i": String(i) } as CSSProperties}
            />
          ))}
        </svg>
      </div>
      <ul className="lf-sr" aria-label={fillTemplate(t.lfP2StripList, { list }, {}, lang)}>
        {facts.collision.example_rooms.first_pair_at.map((n, i) => (
          <li key={i}>{formatInteger(n, lang)}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The first example room in detail: seats filling in order until the first
 * shared surname. A line after seat `n_half` ties the one draw back to the
 * list's answer: that many people give the chance the plate leads with.
 */
function Room({
  facts,
  layout,
  side,
  lang,
}: {
  facts: ListFacts;
  layout: ListLayout;
  side: Side;
  lang: Lang;
}) {
  const t = UI[lang];
  const c = facts.collision;
  const [a, b] = c.example_rooms.showcase_pair;
  const room = layout.room;
  const halfSlots = { n: formatInteger(c.n_half, lang), p: formatChance(c.p_at_n_half, lang) };
  // The line and its label appear as seat n_half fills (`--i`, as the seats).
  const seatDelay = { "--i": String(c.n_half) } as CSSProperties;
  const aria = [
    fillTemplate(
      t.lfP2RoomFigure,
      {
        list: sideWords(t, side).listIn,
        a: formatInteger(a, lang),
        b: formatInteger(b, lang),
      },
      { b },
      lang,
    ),
    ...(room.half === null
      ? []
      : [fillTemplate(t.lfP2RoomHalfFigure, halfSlots, { n: c.n_half }, lang)]),
  ].join(" ");
  return (
    <div className="lf-room-wrap">
      <div className="lf-room" role="img" aria-label={aria}>
        <svg
          viewBox={`0 0 ${String(room.width)} ${String(room.height)}`}
          style={{ "--b": String(b) } as CSSProperties}
          aria-hidden="true"
          focusable="false"
        >
          <path className="lf-wall" d={room.wall} />
          <path className="lf-door" d={room.door} />
          {room.seats.map((seat, i) =>
            i < b ? (
              <circle
                key={i}
                className={i === a - 1 || i === b - 1 ? "lf-seat lf-seat-pair" : "lf-seat"}
                cx={seat.x}
                cy={seat.y}
                r={i === a - 1 || i === b - 1 ? 3.8 : 3}
                style={{ "--i": String(i) } as CSSProperties}
              />
            ) : (
              <rect
                key={i}
                className="lf-seat-empty"
                x={seat.x - 3}
                y={seat.y - 3}
                width={6}
                height={6}
              />
            ),
          )}
          <path className="lf-pair-line" d={room.pair} pathLength={1} />
          {room.half === null ? null : (
            <path className="lf-room-half" d={room.half.path} style={seatDelay} />
          )}
        </svg>
      </div>
      {room.half === null ? null : (
        <p className="lf-room-note" aria-hidden="true">
          <span style={{ ...at(0, 1 - room.half.y), ...seatDelay }}>
            <i className="lf-key lf-key-half" />
            <span>
              {rich(
                t.lfP2RoomHalf,
                { ...halfSlots, n: <b>{halfSlots.n}</b> },
                { n: c.n_half },
                lang,
              )}
            </span>
          </span>
        </p>
      )}
    </div>
  );
}

function PlateSala({
  facts,
  layout,
  lang,
}: {
  facts: ListFactsArtefact;
  layout: AtlasLayout;
  lang: Lang;
}) {
  const t = UI[lang];
  const { male, female } = facts.lists;
  const bn = facts.birthday_reference.n_half;
  const bp = formatChance(facts.birthday_reference.p_at_n_half, lang);
  const p23m = curvePoint(male, bn);
  const p23f = curvePoint(female, bn);
  const lede = rich(
    t.lfP2Lede,
    {
      om: <b>{formatInteger(male.collision.pair_one_in, lang)}</b>,
      of: <b>{formatInteger(female.collision.pair_one_in, lang)}</b>,
    },
    {},
    lang,
  );
  const main = rich(
    t.lfP2Fact,
    {
      nm: formatInteger(male.collision.n_half, lang),
      nf: formatInteger(female.collision.n_half, lang),
      pm: formatChance(male.collision.p_at_n_half, lang),
      pf: formatChance(female.collision.p_at_n_half, lang),
      qm: formatChance(male.collision.p_before_n_half, lang),
      qf: formatChance(female.collision.p_before_n_half, lang),
      om: formatInteger(male.collision.pair_one_in, lang),
      of: formatInteger(female.collision.pair_one_in, lang),
    },
    { nm: male.collision.n_half, nf: female.collision.n_half },
    lang,
  );
  const comparison =
    p23m === undefined || p23f === undefined
      ? null
      : rich(
          t.lfP2FactBirthday,
          {
            bn: formatInteger(bn, lang),
            bp,
            p23m: formatChance(p23m.p, lang),
            p23f: formatChance(p23f.p, lang),
          },
          { bn },
          lang,
        );
  const caveat = fillTemplate(t.lfP2Caveat, { bn: formatInteger(bn, lang) }, {}, lang);
  return (
    <Plate
      id="lf-p2"
      number={t.lfP2No}
      title={t.lfP2Title}
      lede={lede}
      fact={
        <>
          {main}
          {comparison === null ? null : <> {comparison}</>}
        </>
      }
      caveat={caveat}
      source={<SourceLine facts={facts} method={(l) => l.collision.method_version} lang={lang} />}
    >
      <div className="lf-cols">
        {SIDES.map((side) => {
          const list = facts.lists[side];
          const c = list.collision;
          const p23 = curvePoint(list, bn);
          const [a, b] = c.example_rooms.showcase_pair;
          const rooms = c.example_rooms.first_pair_at.length;
          return (
            <div key={side} className="lf-col lf-rv" data-l={side}>
              <p className="lf-label">{sideWords(t, side).label}</p>
              <p className="lf-answer">
                <span className="lf-big">
                  <Num>{formatInteger(c.n_half, lang)}</Num>
                </span>
                <span className="lf-answer-text">
                  {rich(
                    t.lfP2Answer,
                    { p: <b>{formatChance(c.p_at_n_half, lang)}</b> },
                    { n: c.n_half },
                    lang,
                  )}
                </span>
              </p>
              <Curve
                facts={list}
                layout={layout[side]}
                side={side}
                birthdayN={bn}
                birthdayHalf={facts.birthday_reference.p_at_n_half}
                lang={lang}
              />
              <p className="lf-model">{t.lfP2Model}</p>
              <Strip
                facts={list}
                layout={layout[side]}
                height={layout.stripHeight}
                side={side}
                lang={lang}
              />
              <p className="lf-caption lf-caption-strip">
                {rich(
                  t.lfP2StripCaption,
                  { rooms: formatInteger(rooms, lang), n: formatInteger(c.n_half, lang) },
                  { rooms, n: c.n_half },
                  lang,
                )}
              </p>
              <Room facts={list} layout={layout[side]} side={side} lang={lang} />
              <ul className="lf-legend lf-legend-room" aria-hidden="true">
                <li>
                  <i className="lf-key lf-key-seat" />
                  {t.lfP2LegendSeat}
                </li>
                <li>
                  <i className="lf-key lf-key-empty" />
                  {t.lfP2LegendEmpty}
                </li>
                <li>
                  <i className="lf-key lf-key-pair" />
                  {t.lfP2LegendPair}
                </li>
              </ul>
              <p className="lf-caption">
                {fillTemplate(
                  t.lfP2RoomCaption,
                  { a: formatInteger(a, lang), b: formatInteger(b, lang) },
                  {},
                  lang,
                )}
              </p>
              {p23 === undefined ? null : (
                <p className="lf-caption lf-caption-bday">
                  {fillTemplate(
                    t.lfP2Birthday,
                    { bn: formatInteger(bn, lang), bp, p23: formatChance(p23.p, lang) },
                    { bn },
                    lang,
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Plate>
  );
}

// --- plate III: Tłum --------------------------------------------------------

/**
 * The example crowd's own counts. Only the draw's distinct surnames and its
 * people without a namesake: its largest group is left out, because one
 * draw's largest group set beside the other list's invites a comparison the
 * lists' facts do not support (the caveat says the two draws are not
 * comparable).
 */
function exampleText(list: ListFacts, lang: Lang): string {
  const e = list.crowd.example;
  return fillTemplate(
    UI[lang].lfP3Example,
    { d: formatInteger(e.distinct, lang), w: formatInteger(e.without_namesake, lang) },
    { d: e.distinct, w: e.without_namesake },
    lang,
  );
}

/** The example crowd: one dot per person, shared-surname groups seated together and joined. */
function Crowd({
  facts,
  layout,
  side,
  lang,
}: {
  facts: ListFacts;
  layout: ListLayout;
  side: Side;
  lang: Lang;
}) {
  const t = UI[lang];
  const e = facts.crowd.example;
  const { size, loners, members, links } = layout.crowd;
  const aria = fillTemplate(
    t.lfP3CrowdFigure,
    {
      n: formatInteger(e.n, lang),
      list: sideWords(t, side).listIn,
      example: exampleText(facts, lang),
    },
    { n: e.n },
    lang,
  );
  const ring = (d: string, i: number, className: string, key: string) =>
    d === "" ? null : (
      <path key={key} className={className} d={d} style={{ "--i": String(i) } as CSSProperties} />
    );
  return (
    <div className="lf-crowd" role="img" aria-label={aria}>
      <svg viewBox={`0 0 ${String(size)} ${String(size)}`} aria-hidden="true" focusable="false">
        {loners.map((d, i) => ring(d, i, "lf-person", `l${String(i)}`))}
        {links.map(([x1, y1, x2, y2], i) => (
          <line key={i} className="lf-link" x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} />
        ))}
        {members.map((d, i) => ring(d, i, "lf-person lf-person-shared", `m${String(i)}`))}
      </svg>
    </div>
  );
}

/** Expected different surnames against crowd size, both axes logarithmic. */
function Spark({
  facts,
  layout,
  side,
  lang,
}: {
  facts: ListFacts;
  layout: ListLayout;
  side: Side;
  lang: Lang;
}) {
  const t = UI[lang];
  const { points, line, reference } = layout.spark;
  const aria = fillTemplate(
    t.lfP3SparkFigure,
    {
      list: sideWords(t, side).listIn,
      values: points
        .map((p) =>
          fillTemplate(
            t.lfP3SparkPoint,
            { n: formatInteger(p.n, lang), d: formatDecimal(p.value, 1, lang) },
            { n: p.n },
            lang,
          ),
        )
        .join("; "),
    },
    {},
    lang,
  );
  return (
    <div className="lf-spark" role="img" aria-label={aria}>
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="lf-spark-ref" d={reference} />
        <path className="lf-spark-line" d={line} pathLength={1} />
      </svg>
      {/* Values alternate above and below the line, counting from its end, so
          neighbours never share a row; the line rises to the right, so a label
          below a point hangs to its right, where the line is not. */}
      {points.map((p, i) => (
        <Fragment key={p.n}>
          <span
            className={
              p.n === facts.crowd.crowd_size
                ? "lf-node lf-node-spark lf-node-now"
                : "lf-node lf-node-spark"
            }
            style={at(p.x, p.y)}
          />
          <span
            className="lf-spark-val"
            data-anchor={
              (points.length - 1 - i) % 2 === 1
                ? "below"
                : anchorFor(p.x, formatDecimal(p.value, 0, lang).length, SPARK_NARROW_PX)
            }
            style={at(p.x, p.y)}
          >
            {formatDecimal(p.value, 0, lang)}
          </span>
        </Fragment>
      ))}
      <Labels
        className="lf-lab-x"
        order={[points.length - 1, 0, ...points.slice(1, -1).map((_, i) => i + 1)]}
        items={points.map((p) => ({
          key: `n${String(p.n)}`,
          x: p.x,
          text: formatCompact(p.n, lang),
        }))}
      />
    </div>
  );
}

const REACH_SETS = [
  { set: "TOP_100", key: "lfP3SetTop100" },
  { set: "TOP_10", key: "lfP3SetTop10" },
  { set: "TOP_1", key: "lfP3SetTop1" },
] as const;

/** How many people until someone from a set, with even chance: a queue three abreast. */
function Lanes({
  facts,
  side,
  scaleMax,
  lang,
}: {
  facts: ListFacts;
  side: Side;
  scaleMax: number;
  lang: Lang;
}) {
  const t = UI[lang];
  const w = sideWords(t, side);
  const pitch = 10;
  const columns = Math.max(1, Math.ceil(scaleMax / 3));
  const width = columns * pitch;
  const ticks = niceTicks(scaleMax, 3);
  return (
    <div className="lf-lanes">
      {REACH_SETS.map(({ set, key }) => {
        const r = reach(facts, set);
        if (r === undefined) return null;
        const dots: string[] = [];
        for (let i = 0; i < r.n_half - 1; i++) {
          dots.push(
            `M${String(Math.floor(i / 3) * pitch + pitch / 2)} ${String((i % 3) * pitch + pitch / 2)}h0`,
          );
        }
        const lastX = Math.floor((r.n_half - 1) / 3) * pitch + pitch / 2;
        const lastY = ((r.n_half - 1) % 3) * pitch + pitch / 2;
        return (
          <div key={set} className="lf-lane">
            <p className="lf-lane-head">
              <span className="lf-lane-label">{t[key]}</span>
              <span className="lf-lane-n">
                <Num>{formatInteger(r.n_half, lang)}</Num>
              </span>
            </p>
            <p className="lf-lane-sub">
              {fillTemplate(
                w.setSub,
                {
                  s: formatShare(r.share_of_people, lang),
                  n: formatInteger(r.n_half, lang),
                  p: formatChance(r.p_at_n_half, lang),
                },
                { n: r.n_half },
                lang,
              )}
            </p>
            <svg
              className="lf-queue"
              viewBox={`0 0 ${String(width)} ${String(3 * pitch)}`}
              aria-hidden="true"
              focusable="false"
            >
              <line className="lf-queue-rule" x1={0} x2={width} y1={3 * pitch} y2={3 * pitch} />
              <path className="lf-queue-dots" d={dots.join("")} />
              <path className="lf-queue-last" d={`M${String(lastX)} ${String(lastY)}h0`} />
            </svg>
          </div>
        );
      })}
      <div className="lf-queue-axis" aria-hidden="true">
        <Labels
          className="lf-lab-x"
          items={ticks.map((n) => ({
            key: `q${String(n)}`,
            x: Math.min(1, (Math.ceil(n / 3) * pitch) / width),
            text: formatInteger(n, lang),
          }))}
        />
      </div>
      <p className="lf-xnote-static">{t.lfP3QueueAxis}</p>
    </div>
  );
}

function PlateTlum({
  facts,
  layout,
  lang,
}: {
  facts: ListFactsArtefact;
  layout: AtlasLayout;
  lang: Lang;
}) {
  const t = UI[lang];
  const { male, female } = facts.lists;
  // Each list's sentence carries its own crowd size, its own figure and its own
  // name. Without its figure (no expectation stored at the crowd size) the
  // headline is the plate's name instead: never a sentence with a blank in it.
  const title = (side: Side) => {
    const list = facts.lists[side];
    const w = sideWords(t, side);
    const d = expectedAt(list, list.crowd.crowd_size);
    if (d === undefined) return t.lfP3Short;
    const shown = <Num>{formatDecimal(d.value, 0, lang)}</Num>;
    // The word agrees with the number as shown (rounded for display only).
    const counts = { d: Number(d.value.toFixed(0)) };
    return list.crowd.crowd_size === 1000
      ? rich(w.title3Thousand, { d: shown }, counts, lang)
      : rich(w.title3, { c: formatInteger(list.crowd.crowd_size, lang), d: shown }, counts, lang);
  };
  const lede = (side: Side) => {
    const c = facts.lists[side].crowd.crowd_size;
    return rich(sideWords(t, side).lede3, { c: formatInteger(c, lang) }, { c }, lang);
  };
  // A shared presentation scale, not a figure: both lists' queues are drawn on
  // one axis long enough for the longer queue, so a dot means one person in
  // either column. The ticks are round numbers (`niceTicks`); nothing prints
  // this maximum, and nothing compares the lists with it (ADR-0015 §2.5).
  const reachMax = Math.max(
    ...SIDES.flatMap((side) => facts.lists[side].crowd.reach_half.map((r) => r.n_half)),
  );
  const dm = expectedAt(male, male.crowd.crowd_size);
  const df = expectedAt(female, female.crowd.crowd_size);
  // A sentence whose figure is missing is left out, never printed blank or as zero.
  const distinct =
    dm === undefined || df === undefined
      ? null
      : rich(
          t.lfP3FactDistinct,
          {
            cm: formatInteger(male.crowd.crowd_size, lang),
            cf: formatInteger(female.crowd.crowd_size, lang),
            dm: formatDecimal(dm.value, 1, lang),
            df: formatDecimal(df.value, 1, lang),
          },
          { cm: male.crowd.crowd_size, cf: female.crowd.crowd_size },
          lang,
        );
  const alone = fillTemplate(
    t.lfP3FactAlone,
    {
      sm: formatShare(male.crowd.share_without_namesake, lang),
      sf: formatShare(female.crowd.share_without_namesake, lang),
    },
    {},
    lang,
  );
  // Top 100, top 10, the top surname: each as the male list's, then the female list's.
  const [a1, a2, b1, b2, c1, c2] = REACH_SETS.flatMap(({ set }) => [
    reach(male, set)?.n_half,
    reach(female, set)?.n_half,
  ]);
  const reachSentence =
    a1 === undefined ||
    a2 === undefined ||
    b1 === undefined ||
    b2 === undefined ||
    c1 === undefined ||
    c2 === undefined
      ? null
      : fillTemplate(
          t.lfP3FactReach,
          {
            a1: formatInteger(a1, lang),
            a2: formatInteger(a2, lang),
            b1: formatInteger(b1, lang),
            b2: formatInteger(b2, lang),
            c1: formatInteger(c1, lang),
            c2: formatInteger(c2, lang),
          },
          { a2, b2, c2 },
          lang,
        );
  const fact = (
    <>
      {distinct === null ? null : <>{distinct} </>}
      {alone}
      {reachSentence === null ? null : ` ${reachSentence}`}
    </>
  );
  return (
    <Plate
      id="lf-p3"
      number={t.lfP3No}
      title={<PerList male={title("male")} female={title("female")} />}
      lede={<PerList male={lede("male")} female={lede("female")} />}
      fact={fact}
      caveat={t.lfP3Caveat}
      source={<SourceLine facts={facts} method={(l) => l.crowd.method_version} lang={lang} />}
    >
      <ul className="lf-legend lf-legend-crowd" aria-hidden="true">
        <li className="lf-chip">{t.lfP3LegendDot}</li>
        <li>
          <i className="lf-key lf-key-person" />
          {t.lfP3LegendAlone}
        </li>
        <li>
          <i className="lf-key lf-key-shared" />
          {t.lfP3LegendShared}
        </li>
      </ul>
      <div className="lf-cols">
        {SIDES.map((side) => {
          const list = facts.lists[side];
          const d = expectedAt(list, list.crowd.crowd_size);
          return (
            <div key={side} className="lf-col lf-rv" data-l={side}>
              <p className="lf-label">{sideWords(t, side).label}</p>
              <div className="lf-counters">
                {d === undefined ? null : (
                  <p>
                    <span className="lf-mid">
                      <Num>{formatDecimal(d.value, 1, lang)}</Num>
                    </span>
                    <span className="lf-counter-text">
                      {fillTemplate(
                        t.lfP3Distinct,
                        { c: formatInteger(list.crowd.crowd_size, lang) },
                        { c: list.crowd.crowd_size },
                        lang,
                      )}
                    </span>
                  </p>
                )}
                <p>
                  <span className="lf-mid">
                    <Num>{formatShare(list.crowd.share_without_namesake, lang)}</Num>
                  </span>
                  <span className="lf-counter-text">{t.lfP3Alone}</span>
                </p>
              </div>
              <Crowd facts={list} layout={layout[side]} side={side} lang={lang} />
              <p className="lf-caption lf-caption-crowd">{exampleText(list, lang)}</p>
            </div>
          );
        })}
      </div>
      <h4 className="lf-sub">{t.lfP3SparkTitle}</h4>
      <ul className="lf-legend" aria-hidden="true">
        <li>
          <i className="lf-key lf-key-line" />
          {t.lfP3SparkLine}
        </li>
        <li>
          <i className="lf-key lf-key-ref" />
          {t.lfP3SparkRef}
        </li>
      </ul>
      <div className="lf-cols">
        {SIDES.map((side) => (
          <div key={side} className="lf-col lf-rv" data-l={side}>
            <p className="lf-label">{sideWords(t, side).label}</p>
            <Spark facts={facts.lists[side]} layout={layout[side]} side={side} lang={lang} />
            <p className="lf-xnote-static">{t.lfP3SparkAxis}</p>
          </div>
        ))}
      </div>
      <h4 className="lf-sub">{t.lfP3LanesTitle}</h4>
      <p className="lf-sub-lede">{t.lfP3LanesLede}</p>
      <div className="lf-cols">
        {SIDES.map((side) => (
          <div key={side} className="lf-col lf-rv" data-l={side}>
            <p className="lf-label">{sideWords(t, side).label}</p>
            <Lanes facts={facts.lists[side]} side={side} scaleMax={reachMax} lang={lang} />
          </div>
        ))}
      </div>
    </Plate>
  );
}

// --- the section ----------------------------------------------------------

/**
 * The atlas section. No facts, no section: when `listFacts()` failed the page
 * renders without it rather than with figures from anywhere else.
 */
export function ListAtlas({ facts, lang }: { facts: ListFactsArtefact | null; lang: Lang }) {
  if (facts === null) return null;
  const t = UI[lang];
  const layout = atlasLayout(facts);
  const plates = [
    { id: "lf-p1", number: t.lfP1No, short: t.lfP1Short },
    { id: "lf-p2", number: t.lfP2No, short: t.lfP2Short },
    { id: "lf-p3", number: t.lfP3No, short: t.lfP3Short },
  ];
  const head = (
    <header className="lf-head">
      <div className="lf-head-text">
        <p className="lf-eyebrow">{t.lfEyebrow}</p>
        <h2 id="lf-title" className="lf-title">
          {t.lfTitle}
        </h2>
        <p className="lf-lede">{t.lfLede}</p>
        <p className="lf-scope">
          {terminate(
            fillTemplate(t.lfScope, { date: keptDate(facts.snapshot_date, lang) }, {}, lang),
          )}
        </p>
      </div>
      <nav className="lf-index" aria-label={t.lfIndexLabel}>
        <ol>
          {plates.map((plate) => (
            <li key={plate.id}>
              <a href={`#${plate.id}`}>
                <span className="lf-index-no">{plate.number}</span>
                <span className="lf-index-name">{plate.short}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
  return (
    <ListAtlasShell
      labelledBy="lf-title"
      labels={{
        group: t.lfSwitchLabel,
        male: t.lfSwitchMale,
        female: t.lfSwitchFemale,
        note: t.lfSwitchNote,
      }}
      head={head}
    >
      <PlateSuwak facts={facts} lang={lang} />
      <PlateSala facts={facts} layout={layout} lang={lang} />
      <PlateTlum facts={facts} layout={layout} lang={lang} />
    </ListAtlasShell>
  );
}
