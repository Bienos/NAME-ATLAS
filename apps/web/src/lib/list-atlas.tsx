import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import { POLISH_ALPHABET } from "@name-atlas/contracts";
import type {
  CountBand,
  ListEdition,
  ListEditionGap,
  ListFacts,
  ListFactsArtefact,
  NamedSurname,
} from "@name-atlas/contracts";
import {
  assessmentWord,
  fillTemplate,
  formatDate,
  formatInteger,
  formatQuantile,
  formatShare,
  formatSigned,
  parseTemplate,
  pluralForm,
  terminate,
  UI,
} from "./messages.js";
import type { Lang } from "./messages.js";
import { ListAtlasShell } from "./list-atlas-shell.js";
import { ListAtlasSky } from "./list-atlas-sky.js";
import type { SkyList } from "./list-atlas-sky.js";
import {
  columnPath,
  CROWD,
  crowdDot,
  crowdHeight,
  CURVE,
  curvePath,
  curvePoint,
  linearScale,
  logScale,
  RIBBON,
  ribbonPath,
  round4,
  sqrtScale,
  TREND,
  trendColumn,
  vennLayout,
} from "./list-atlas-geometry.js";
import type { CommonList } from "./common-surnames.js";

/**
 * The surname atlas (TASK-040; six plates since TASK-043, seven since
 * TASK-044; eleven since TASK-178, when it moved from the landing to the Atlas
 * page): eleven plates about the two published PESEL surname lists, rendered
 * from `listFacts()`, and plate 01 from the rank claims (`mostCommonSurnames`).
 *
 * **This view derives nothing.** Every figure a reader sees is a value the
 * artefact carries, formatted by `messages.ts`: nothing is added, subtracted,
 * divided, counted or ranked here. The only arithmetic is presentation
 * geometry — where a mark sits, how long a bar is, how far apart two circles
 * are — in `list-atlas-geometry.ts` (ADR-0015 §2.5). Words are chosen from
 * stored values (plate IV's "one in four" when the stored share lies in
 * [0.24, 0.26)), never a new number.
 *
 * The male and female lists are two universes. Each plate is server-rendered
 * for both, every line that carries one list's figures names that list, and
 * the list switch shows one of the two (`list-atlas-shell.tsx`). No number on
 * the page is a sum of the two. Plate VI compares them only as the artefact's
 * `overlap` does: counts of surnames, never of people. Plate VII sets each
 * list beside the earlier editions of its own series (ADR-0019), from the
 * artefact's `editions` and `change`: what changed, never why, and a missing
 * edition drawn as a gap with its reason, never as a value.
 *
 * A surname appears only as one of the artefact's ADR-0018 selections, as its
 * published string, linked to its search answer (ADR-0019 §2.6). No surname is
 * named for its growth: plate VII names only the list's `TOP_3`.
 */

type Side = "male" | "female";
const SIDES: readonly Side[] = ["male", "female"];
type Messages = (typeof UI)[Lang];

/** The male or the female variant of anything. */
function of<T>(side: Side, male: T, female: T): T {
  return side === "male" ? male : female;
}

/** A template as React nodes: `{key}` slots, agreeing words and `**emphasis**`. */
export function rich(
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

/** A figure in a headline or a counter: sans, tabular, in Atlas Blue. */
export function Num({ children }: { children: ReactNode }) {
  return <span className="lf-n">{children}</span>;
}

/** The search's address for a surname as published: `/?surname=…` (ADR-0019 §2.6). */
export function searchHref(published: string, lang: Lang): string {
  const params = new URLSearchParams({ surname: published });
  if (lang === "en") params.set("lang", "en");
  return `/?${params.toString()}`;
}

/** A surname as the source publishes it, linked to its search answer (ADR-0019 §2.6). */
function Name({ surname, lang }: { surname: string; lang: Lang }) {
  return (
    <a className="lf-name" href={searchHref(surname, lang)}>
      {surname}
    </a>
  );
}

/** Custom properties for the stylesheet: positions and scales as unitless fractions. */
export function vars(values: Readonly<Record<string, number>>): CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) style[`--${key}`] = String(round4(value));
  return style as CSSProperties;
}

/**
 * One thing in two variants, one per list, stacked in one grid cell: the
 * stylesheet shows the one the list switch has chosen and hides the other
 * with `visibility`, so the block is as tall as the taller variant and
 * flipping lists moves nothing below it.
 */
export function Alt({
  male,
  female,
  inline = false,
  className,
}: {
  male: ReactNode;
  female: ReactNode;
  inline?: boolean;
  className?: string;
}) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag className={className === undefined ? "lf-alt" : `lf-alt ${className}`}>
      <Tag data-l="male">{male}</Tag>
      <Tag data-l="female">{female}</Tag>
    </Tag>
  );
}

/** Both variants of a block, built from each list. */
function PerList({
  facts,
  render,
  inline,
  className,
}: {
  facts: ListFactsArtefact;
  render: (list: ListFacts, side: Side) => ReactNode;
  inline?: boolean;
  className?: string;
}) {
  return (
    <Alt
      male={render(facts.lists.male, "male")}
      female={render(facts.lists.female, "female")}
      {...(inline === undefined ? {} : { inline })}
      {...(className === undefined ? {} : { className })}
    />
  );
}

/**
 * The snapshot date with its day and month, and its year and "r.", kept
 * together by non-breaking spaces, so a narrow line breaks between the two
 * and never inside either ("20 stycznia 2026 r.", "20 January 2026").
 */
export function keptDate(iso: string, lang: Lang): string {
  const words = formatDate(iso, lang).split(" ");
  if (words.length < 3) return words.join("\u00a0");
  return `${words.slice(0, 2).join("\u00a0")} ${words.slice(2).join("\u00a0")}`;
}

function levelAt(list: ListFacts, q: number) {
  return list.concentration.levels.find((level) => level.q === q) ?? null;
}

// --- plate furniture ------------------------------------------------------

function SourceLine({
  facts,
  methods,
  shared = [],
  editions = false,
  lang,
}: {
  facts: ListFactsArtefact;
  methods: (list: ListFacts) => readonly string[];
  shared?: readonly string[];
  /** Date the line by each list's editions (plate VII) rather than by the snapshot. */
  editions?: boolean;
  lang: Lang;
}) {
  const t = UI[lang];
  const { male, female } = facts.lists;
  const list = [...new Set([...methods(male), ...methods(female), ...shared])].join(", ");
  const statuses = [
    ...new Set([male.assessment.confidence_status, female.assessment.confidence_status]),
  ]
    .map((status) => assessmentWord(status, lang))
    .join(", ");
  const date: ReactNode = editions ? (
    <PerList
      facts={facts}
      inline
      render={(list) => list.editions.items.map((e) => keptDate(e.data_date, lang)).join(", ")}
    />
  ) : (
    keptDate(facts.snapshot_date, lang)
  );
  // Both lists are resources of one dataset: one link when they share a page.
  const line =
    male.source.source_page_url === female.source.source_page_url
      ? rich(
          editions ? t.lfSourceEditions : t.lfSource,
          { link: <a href={male.source.source_page_url}>{t.lfSourceName}</a>, date },
          {},
          lang,
        )
      : rich(
          editions ? t.lfSourceEditionsTwo : t.lfSourceTwo,
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
        {fillTemplate(t.lfMethod, { status: statuses, method: list }, {}, lang)}
      </span>
    </p>
  );
}

export function Plate({
  id,
  number,
  name,
  title,
  lede,
  children,
  foot,
  source,
  lang,
}: {
  id: string;
  number: string;
  name: string;
  title: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
  foot: string;
  source: ReactNode;
  lang: Lang;
}) {
  return (
    <article id={id} className="lf-plate" aria-labelledby={`${id}-title`}>
      <span className="lf-crop" aria-hidden="true" />
      <header className="lf-plate-head lf-rv">
        <p className="lf-plate-no">
          <b>
            {UI[lang].lfPlate} {number}
          </b>{" "}
          · {name}
        </p>
        <h3 id={`${id}-title`} className="lf-plate-title">
          {title}
        </h3>
        {lede === undefined ? null : <div className="lf-plate-lede">{lede}</div>}
      </header>
      {children}
      <div className="lf-foot">
        <p className="lf-foot-note">{foot}</p>
        {source}
      </div>
    </article>
  );
}

// --- plate I: the constellation -----------------------------------------------

function skyOf(list: ListFacts): SkyList {
  return {
    counts: list.dots.histogram.map((entry) => entry.count),
    surnames: list.dots.histogram.map((entry) => entry.surnames),
    half: levelAt(list, 0.5)?.surnames ?? null,
    named: list.named_top.items.length,
  };
}

function SkyFigures({ list, side, lang }: { list: ListFacts; side: Side; lang: Lang }) {
  const t = UI[lang];
  const s = list.summary;
  const half = levelAt(list, 0.5);
  const edge = list.bands.ranges.find((band) => band.from === 10) ?? null;
  const items = list.named_top.items;
  return (
    <div className="lf-big">
      <p className="lf-big-fig">
        <span className="lf-big-v">
          <Num>{formatInteger(s.surnames, lang)}</Num>
        </span>
        <span className="lf-big-l">
          {fillTemplate(
            of(side, t.lfP1SurnamesMale, t.lfP1SurnamesFemale),
            {},
            { n: s.surnames },
            lang,
          )}
        </span>
      </p>
      <p className="lf-big-fig">
        <span className="lf-big-v">
          <Num>{formatInteger(s.people, lang)}</Num>
        </span>
        <span className="lf-big-l">
          {fillTemplate(of(side, t.lfP1PeopleMale, t.lfP1PeopleFemale), {}, { n: s.people }, lang)}
        </span>
      </p>
      <ul className="lf-legend">
        {items.length === 0 ? null : (
          <li>
            <i className="lf-key-core" aria-hidden="true" />
            <div>
              {of(side, t.lfP1CoreMale, t.lfP1CoreFemale)}
              {/* Standalone links, one row each, so every name is its own
                  44px target and no row covers another. */}
              <ol className="lf-legend-names">
                {items.map((item) => (
                  <li key={item.key}>
                    <Name surname={item.published} lang={lang} />{" "}
                    <span className="lf-count">{formatInteger(item.count, lang)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </li>
        )}
        {half === null ? null : (
          <li>
            <i className="lf-key-ring" aria-hidden="true" />
            <span>
              {fillTemplate(
                of(side, t.lfP1RingMale, t.lfP1RingFemale),
                { k: formatInteger(half.surnames, lang) },
                { k: half.surnames },
                lang,
              )}
            </span>
          </li>
        )}
        {edge === null ? null : (
          <li>
            <i className="lf-key-dust" aria-hidden="true" />
            <span>
              {fillTemplate(
                t.lfP1Dust,
                {
                  u: formatInteger(list.bands.under_10, lang),
                  edge: formatInteger(edge.from, lang),
                },
                { u: list.bands.under_10, edge: edge.from },
                lang,
              )}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

function PlateSky({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  return (
    <Plate
      id="lf-p02"
      number="02"
      name={t.lfP1Name}
      title={t.lfP1Title}
      foot={t.lfP1Foot}
      lang={lang}
      source={
        <SourceLine
          facts={facts}
          lang={lang}
          methods={(l) => [
            l.summary.method_version,
            l.dots.method_version,
            l.named_top.method_version,
            l.concentration.method_version,
            l.bands.method_version,
          ]}
        />
      }
    >
      <div className="lf-sky-wrap lf-rv">
        <div className="lf-sky-box">
          <Alt
            male={<ListAtlasSky list={skyOf(facts.lists.male)} />}
            female={<ListAtlasSky list={skyOf(facts.lists.female)} />}
          />
        </div>
        <PerList
          facts={facts}
          render={(list, side) => <SkyFigures list={list} side={side} lang={lang} />}
        />
      </div>
    </Plate>
  );
}

// --- plate II: half ---------------------------------------------------------------

function HalfChart({ list, side, lang }: { list: ListFacts; side: Side; lang: Lang }) {
  const t = UI[lang];
  const { people, surnames } = list.summary;
  const levels = list.concentration.levels;
  const edges = [
    { top: 0, bottom: 0 },
    ...levels.map((level) => ({
      top: linearScale(level.people, people),
      bottom: linearScale(level.surnames, surnames),
    })),
    { top: 1, bottom: 1 },
  ];
  return (
    <div className="lf-half">
      <p className="lf-half-total">
        {fillTemplate(
          of(side, t.lfP2PeopleMale, t.lfP2PeopleFemale),
          { n: formatInteger(people, lang) },
          { n: people },
          lang,
        )}
      </p>
      <div className="lf-half-ticks" aria-hidden="true">
        {levels.map((level, i) => (
          <span key={level.q} className="lf-half-tick" style={vars({ x: edges[i + 1]!.top })}>
            {formatQuantile(level.q, lang)}
          </span>
        ))}
      </div>
      <svg
        className="lf-ribbons"
        viewBox={`0 0 ${String(RIBBON.width)} ${String(RIBBON.height)}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect className="lf-bar" x="0" y="0" width={RIBBON.width} height={RIBBON.bar} />
        <rect
          className="lf-bar"
          x="0"
          y={RIBBON.height - RIBBON.bar}
          width={RIBBON.width}
          height={RIBBON.bar}
        />
        {edges.slice(1).map((edge, i) => (
          <path
            key={i}
            className="lf-rib"
            data-k={String(i)}
            d={ribbonPath(edges[i]!.top, edge.top, edges[i]!.bottom, edge.bottom)}
          />
        ))}
      </svg>
      {/* The largest set first: each leader then runs clear of the labels above it. */}
      <ul className="lf-levels">
        {[...levels].reverse().map((level) => (
          <li key={level.q} style={vars({ x: linearScale(level.surnames, surnames) })}>
            {fillTemplate(
              of(side, t.lfP2LevelMale, t.lfP2LevelFemale),
              { k: formatInteger(level.surnames, lang), q: formatQuantile(level.q, lang) },
              { k: level.surnames },
              lang,
            )}
          </li>
        ))}
      </ul>
      <p className="lf-half-total lf-half-total-end">
        {fillTemplate(t.lfP2Surnames, { n: formatInteger(surnames, lang) }, {}, lang)}
      </p>
    </div>
  );
}

function PlateHalf({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const title = (list: ListFacts, side: Side) => {
    const half = levelAt(list, 0.5);
    if (half === null) return t.lfP2Name;
    return rich(
      of(side, t.lfP2TitleMale, t.lfP2TitleFemale),
      { k: <Num>{formatInteger(half.surnames, lang)}</Num> },
      {},
      lang,
    );
  };
  const lede = (list: ListFacts, side: Side) => (
    <p>
      {fillTemplate(
        of(side, t.lfP2LedeMale, t.lfP2LedeFemale),
        { b: formatInteger(list.concentration.beyond_half, lang) },
        { b: list.concentration.beyond_half },
        lang,
      )}
    </p>
  );
  return (
    <Plate
      id="lf-p03"
      number="03"
      name={t.lfP2Name}
      title={<PerList facts={facts} inline render={title} />}
      lede={<PerList facts={facts} render={lede} />}
      foot={t.lfP2Foot}
      lang={lang}
      source={
        <SourceLine
          facts={facts}
          lang={lang}
          methods={(l) => [l.summary.method_version, l.concentration.method_version]}
        />
      }
    >
      <PerList
        facts={facts}
        className="lf-rv"
        render={(list, side) => <HalfChart list={list} side={side} lang={lang} />}
      />
    </Plate>
  );
}

// --- plate III: rarity ------------------------------------------------------------

function bandLabel(band: CountBand, lang: Lang): string {
  const from = formatInteger(band.from, lang);
  if (band.to === null) return `${from}+`;
  if (band.to === band.from) return from;
  return `${from}–${formatInteger(band.to, lang)}`;
}

/** The largest value of each kind across both lists: one scale, so a switch shows real differences. */
function bandScale(facts: ListFactsArtefact) {
  const bands = [...facts.lists.male.bands.ranges, ...facts.lists.female.bands.ranges];
  return {
    surnames: Math.max(...bands.map((band) => band.surnames)),
    people: Math.max(...bands.map((band) => band.people)),
  };
}

function Mirror({
  list,
  scale,
  lang,
}: {
  list: ListFacts;
  scale: { surnames: number; people: number };
  lang: Lang;
}) {
  const t = UI[lang];
  return (
    <ol className="lf-mirror">
      {list.bands.ranges.map((band) => (
        <li
          key={band.from}
          style={vars({
            s: linearScale(band.surnames, scale.surnames),
            p: linearScale(band.people, scale.people),
          })}
        >
          <span className="lf-mb-band">{bandLabel(band, lang)}</span>
          <span className="lf-mb lf-mb-s">
            <i aria-hidden="true" />
            <b>
              <span className="lf-sr">{t.lfP3KeySurnames}: </span>
              {formatInteger(band.surnames, lang)}
            </b>
          </span>
          <span className="lf-mb lf-mb-p">
            <i aria-hidden="true" />
            <b>
              <span className="lf-sr">{t.lfP3KeyPeople}: </span>
              {formatInteger(band.people, lang)}
            </b>
          </span>
        </li>
      ))}
    </ol>
  );
}

function PlateRarity({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const scale = bandScale(facts);
  const title = (list: ListFacts, side: Side) => {
    const two = list.bands.ranges.find((band) => band.from === 2 && band.to === 2);
    if (two === undefined) return t.lfP3Name;
    return rich(
      of(side, t.lfP3TitleMale, t.lfP3TitleFemale),
      { n: <Num>{formatInteger(two.surnames, lang)}</Num> },
      { n: two.surnames },
      lang,
    );
  };
  const lede = (list: ListFacts, side: Side) => {
    const m = list.summary.median_count_per_surname;
    return (
      <p>
        {fillTemplate(
          of(side, t.lfP3LedeMale, t.lfP3LedeFemale),
          { m: formatInteger(m, lang) },
          { m },
          lang,
        )}
      </p>
    );
  };
  return (
    <Plate
      id="lf-p04"
      number="04"
      name={t.lfP3Name}
      title={<PerList facts={facts} inline render={title} />}
      lede={<PerList facts={facts} render={lede} />}
      foot={t.lfP3Foot}
      lang={lang}
      source={
        <SourceLine
          facts={facts}
          lang={lang}
          methods={(l) => [l.summary.method_version, l.bands.method_version]}
        />
      }
    >
      <div className="lf-mirror-wrap lf-rv">
        <div className="lf-mirror-box">
          <ul className="lf-mirror-key" aria-hidden="true">
            <li>
              <i className="lf-key-s" />
              {t.lfP3KeySurnames}
            </li>
            <li>
              <i className="lf-key-p" />
              {t.lfP3KeyPeople}
            </li>
          </ul>
          <PerList
            facts={facts}
            render={(list) => <Mirror list={list} scale={scale} lang={lang} />}
          />
          <p className="lf-axis-note">{t.lfP3Axis} →</p>
        </div>
        <PerList
          facts={facts}
          render={(list) => (
            <div className="lf-omit">
              <p className="lf-kicker">{t.lfP3NoteKicker}</p>
              <p>
                {fillTemplate(
                  t.lfP3Note,
                  { min: formatInteger(list.summary.min_count, lang) },
                  { min: list.summary.min_count },
                  lang,
                )}
              </p>
            </div>
          )}
        />
      </div>
    </Plate>
  );
}

// --- plate IV: endings ------------------------------------------------------------

/**
 * TASK-043's wording rule for plate IV: "one in four" only when the stored
 * share lies in [0.24, 0.26); otherwise the headline states the share. It
 * selects words from a stored value and computes no figure.
 */
export function isOneInFour(share: number): boolean {
  return share >= 0.24 && share < 0.26;
}

function Ending({ ending }: { ending: string }) {
  return <span className="lf-end">-{ending}</span>;
}

const GLYPH = { width: 1000, height: 230, copies: 4 } as const;

function Endings({
  list,
  side,
  maxShare,
  lang,
}: {
  list: ListFacts;
  side: Side;
  maxShare: number;
  lang: Lang;
}) {
  const t = UI[lang];
  const first = list.endings.entries[0];
  const cell = GLYPH.width / GLYPH.copies;
  const copies = Array.from({ length: GLYPH.copies }, (_, i) => cell * i + cell / 2);
  return (
    <div className="lf-ends-wrap">
      {first === undefined ? null : (
        <div className="lf-ends-glyph">
          <svg
            className="lf-glyphs"
            viewBox={`0 0 ${String(GLYPH.width)} ${String(GLYPH.height)}`}
            aria-hidden="true"
          >
            <defs>
              <clipPath id={`lf-glyph-clip-${side}`}>
                <rect
                  className="lf-glyph-sweep"
                  x="0"
                  y="0"
                  width={round4(linearScale(first.share_of_people, 1) * GLYPH.width)}
                  height={GLYPH.height}
                />
              </clipPath>
            </defs>
            <g className="lf-glyph-out">
              {copies.map((x) => (
                <text key={x} x={x} y="170" textAnchor="middle">
                  -{first.ending}
                </text>
              ))}
            </g>
            <g className="lf-glyph-in" clipPath={`url(#lf-glyph-clip-${side})`}>
              {copies.map((x) => (
                <text key={x} x={x} y="170" textAnchor="middle">
                  -{first.ending}
                </text>
              ))}
            </g>
            <line
              className="lf-glyph-tick"
              x1={round4(linearScale(first.share_of_people, 1) * GLYPH.width)}
              x2={round4(linearScale(first.share_of_people, 1) * GLYPH.width)}
              y1="40"
              y2="200"
            />
          </svg>
          <p className="lf-glyph-cap">
            {rich(
              of(side, t.lfP4CaptionMale, t.lfP4CaptionFemale),
              {
                share: formatShare(first.share_of_people, lang),
                p: formatInteger(first.people, lang),
                s: formatInteger(first.surnames, lang),
                ending: <Ending ending={first.ending} />,
              },
              { p: first.people, s: first.surnames },
              lang,
            )}
          </p>
          <p className="lf-glyph-note">{t.lfP4Glyph}</p>
        </div>
      )}
      <div className="lf-ends-list">
        <p className="lf-kicker">{of(side, t.lfP4ListMale, t.lfP4ListFemale)}</p>
        <ol className="lf-endlist">
          {list.endings.entries.map((entry) => (
            <li
              key={entry.ending}
              style={vars({ v: linearScale(entry.share_of_people, maxShare) })}
            >
              <span className="lf-endlist-e">-{entry.ending}</span>
              <span className="lf-endlist-t" aria-hidden="true">
                <i />
              </span>
              <span className="lf-endlist-p">{formatShare(entry.share_of_people, lang)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function PlateEndings({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const maxShare = Math.max(
    ...SIDES.flatMap((side) => facts.lists[side].endings.entries.map((e) => e.share_of_people)),
  );
  const title = (list: ListFacts, side: Side) => {
    const first = list.endings.entries[0];
    if (first === undefined) return t.lfP4Name;
    const quarter = isOneInFour(first.share_of_people);
    return rich(
      quarter
        ? of(side, t.lfP4TitleQuarterMale, t.lfP4TitleQuarterFemale)
        : of(side, t.lfP4TitleShareMale, t.lfP4TitleShareFemale),
      {
        share: <Num>{formatShare(first.share_of_people, lang)}</Num>,
        ending: <Ending ending={first.ending} />,
      },
      {},
      lang,
    );
  };
  return (
    <Plate
      id="lf-p06"
      number="06"
      name={t.lfP4Name}
      title={<PerList facts={facts} inline render={title} />}
      foot={t.lfP4Foot}
      lang={lang}
      source={<SourceLine facts={facts} lang={lang} methods={(l) => [l.endings.method_version]} />}
    >
      <PerList
        facts={facts}
        className="lf-rv"
        render={(list, side) => <Endings list={list} side={side} maxShare={maxShare} lang={lang} />}
      />
    </Plate>
  );
}

// --- plate V: the alphabet --------------------------------------------------------

function isPolish(letter: string): boolean {
  return (POLISH_ALPHABET as readonly string[]).includes(letter);
}

function Alphabet({
  list,
  side,
  maxPeople,
  lang,
}: {
  list: ListFacts;
  side: Side;
  maxPeople: number;
  lang: Lang;
}) {
  const t = UI[lang];
  const { letters, top, rarest_polish: rarest, outside } = list.initials;
  const absent = letters
    .filter((entry) => "absent" in entry && isPolish(entry.letter))
    .map((entry) => entry.letter);
  const rare = letters.find((entry) => entry.letter === rarest);
  return (
    <>
      <ol className="lf-abc" aria-label={of(side, t.lfP5GridMale, t.lfP5GridFemale)}>
        {letters.map((entry) => {
          const foreign = isPolish(entry.letter) ? undefined : "";
          if ("absent" in entry) {
            return (
              <li key={entry.letter} className="lf-abc-cell" data-absent="" data-foreign={foreign}>
                <span className="lf-abc-g">{entry.letter}</span>
                <span className="lf-abc-c">
                  <span aria-hidden="true">—</span>
                  <span className="lf-sr">{t.lfP5AbsentCell}</span>
                </span>
              </li>
            );
          }
          return (
            <li
              key={entry.letter}
              className="lf-abc-cell"
              data-top={entry.letter === top ? "" : undefined}
              data-foreign={foreign}
              style={vars({ s: sqrtScale(entry.people, maxPeople) })}
            >
              <span className="lf-abc-g">{entry.letter}</span>
              <span className="lf-abc-c">{formatInteger(entry.people, lang)}</span>
            </li>
          );
        })}
      </ol>
      <div className="lf-abc-notes">
        {absent.length === 0 ? null : (
          <p>
            {rich(
              of(side, t.lfP5AbsentMale, t.lfP5AbsentFemale),
              { letters: absent.join(", ") },
              { n: absent.length },
              lang,
            )}
          </p>
        )}
        {rare === undefined || "absent" in rare ? null : (
          <p>
            {rich(
              of(side, t.lfP5RarestMale, t.lfP5RarestFemale),
              {
                letter: rare.letter,
                s: formatInteger(rare.surnames, lang),
                p: formatInteger(rare.people, lang),
              },
              { s: rare.surnames, p: rare.people },
              lang,
            )}
          </p>
        )}
        {outside.surnames === 0 ? null : (
          <p>
            {rich(
              of(side, t.lfP5OutsideMale, t.lfP5OutsideFemale),
              {
                s: formatInteger(outside.surnames, lang),
                p: formatInteger(outside.people, lang),
              },
              { s: outside.surnames, p: outside.people },
              lang,
            )}
          </p>
        )}
      </div>
    </>
  );
}

function PlateAlphabet({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const maxPeople = Math.max(
    ...SIDES.flatMap((side) =>
      facts.lists[side].initials.letters.map((entry) => ("absent" in entry ? 0 : entry.people)),
    ),
  );
  const topOf = (list: ListFacts) =>
    list.initials.letters.find((entry) => entry.letter === list.initials.top);
  const title = (list: ListFacts, side: Side) =>
    rich(
      of(side, t.lfP5TitleMale, t.lfP5TitleFemale),
      { letter: <Num>{list.initials.top}</Num> },
      {},
      lang,
    );
  const lede = (list: ListFacts, side: Side) => {
    const top = topOf(list);
    if (top === undefined || "absent" in top) return null;
    return (
      <p>
        {fillTemplate(
          of(side, t.lfP5LedeMale, t.lfP5LedeFemale),
          { p: formatInteger(top.people, lang), letter: top.letter },
          { p: top.people },
          lang,
        )}
      </p>
    );
  };
  return (
    <Plate
      id="lf-p07"
      number="07"
      name={t.lfP5Name}
      title={<PerList facts={facts} inline render={title} />}
      lede={<PerList facts={facts} render={lede} />}
      foot={t.lfP5Foot}
      lang={lang}
      source={<SourceLine facts={facts} lang={lang} methods={(l) => [l.initials.method_version]} />}
    >
      <PerList
        facts={facts}
        className="lf-rv"
        render={(list, side) => (
          <Alphabet list={list} side={side} maxPeople={maxPeople} lang={lang} />
        )}
      />
    </Plate>
  );
}

// --- plate VI: two lists ----------------------------------------------------------

/** The Venn diagram's scale: the larger circle's radius, in SVG units. */
const VENN_RADIUS = 150;

function Venn({ facts }: { facts: ListFactsArtefact }) {
  const { male, female } = facts.lists;
  const v = vennLayout(male.summary.surnames, female.summary.surnames, facts.overlap.both);
  const pad = 4;
  const r1 = v.r1 * VENN_RADIUS;
  const r2 = v.r2 * VENN_RADIUS;
  const c1 = pad + r1;
  const c2 = c1 + v.d * VENN_RADIUS;
  const width = c2 + r2 + pad;
  const height = 2 * Math.max(r1, r2) + 2 * pad;
  const cy = height / 2;
  return (
    <svg
      className="lf-venn"
      viewBox={`0 0 ${String(round4(width))} ${String(round4(height))}`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="lf-venn-clip">
          <circle cx={round4(c1)} cy={round4(cy)} r={round4(r1)} />
        </clipPath>
      </defs>
      <circle className="lf-venn-m" cx={round4(c1)} cy={round4(cy)} r={round4(r1)} />
      <circle className="lf-venn-f" cx={round4(c2)} cy={round4(cy)} r={round4(r2)} />
      <circle
        className="lf-venn-lens"
        clipPath="url(#lf-venn-clip)"
        cx={round4(c2)}
        cy={round4(cy)}
        r={round4(r2)}
      />
    </svg>
  );
}

function Hyphenated({ list, side, lang }: { list: ListFacts; side: Side; lang: Lang }) {
  const t = UI[lang];
  const h = list.hyphenated;
  return (
    <div className="lf-hyphen">
      <p className="lf-kicker">{t.lfP6HyphenKicker}</p>
      {h.top === null ? (
        <p>{of(side, t.lfP6HyphenNoneMale, t.lfP6HyphenNoneFemale)}</p>
      ) : (
        <>
          <p className="lf-hyphen-name">
            <Name surname={h.top.published} lang={lang} />
          </p>
          <p>
            {fillTemplate(
              of(side, t.lfP6HyphenTopMale, t.lfP6HyphenTopFemale),
              { c: formatInteger(h.top.count, lang) },
              { c: h.top.count },
              lang,
            )}
          </p>
        </>
      )}
      <p>
        {fillTemplate(
          of(side, t.lfP6HyphenCountMale, t.lfP6HyphenCountFemale),
          { s: formatInteger(h.surnames, lang), p: formatInteger(h.people, lang) },
          { s: h.surnames, p: h.people },
          lang,
        )}
      </p>
    </div>
  );
}

function PlateTwoLists({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const o = facts.overlap;
  const named = (surname: NamedSurname | null, template: string, key: "m" | "f") =>
    surname === null
      ? null
      : rich(
          template,
          {
            name: <Name surname={surname.published} lang={lang} />,
            [key]: formatInteger(surname.count, lang),
          },
          { [key]: surname.count },
          lang,
        );
  const both =
    o.on_both_top === null
      ? null
      : rich(
          t.lfP6OnBoth,
          {
            name: <Name surname={o.on_both_top.male.published} lang={lang} />,
            m: formatInteger(o.on_both_top.male.count, lang),
            f: formatInteger(o.on_both_top.female.count, lang),
          },
          { m: o.on_both_top.male.count, f: o.on_both_top.female.count },
          lang,
        );
  const sentences = [
    both,
    named(o.one_list_top.female, t.lfP6FemaleOnly, "f"),
    named(o.one_list_top.male, t.lfP6MaleOnly, "m"),
    t.lfP6Why,
  ].filter((sentence) => sentence !== null);
  return (
    <Plate
      id="lf-p08"
      number="08"
      name={t.lfP6Name}
      title={rich(
        t.lfP6Title,
        { b: <Num>{formatInteger(o.both, lang)}</Num> },
        { b: o.both },
        lang,
      )}
      lede={
        <p>
          {sentences.map((sentence, i) => (
            <Fragment key={i}>
              {i === 0 ? null : " "}
              {sentence}
            </Fragment>
          ))}
        </p>
      }
      foot={t.lfP6Foot}
      lang={lang}
      source={
        <SourceLine
          facts={facts}
          lang={lang}
          methods={(l) => [l.summary.method_version, l.hyphenated.method_version]}
          shared={[o.method_version]}
        />
      }
    >
      <div className="lf-venn-wrap lf-rv">
        <div className="lf-venn-box">
          <Venn facts={facts} />
          <dl className="lf-venn-figs">
            <div data-part="male">
              <dt>{t.lfP6MaleOnlyLabel}</dt>
              <dd>{formatInteger(o.male_only, lang)}</dd>
            </div>
            <div data-part="both">
              <dt>{t.lfP6BothLabel}</dt>
              <dd>{formatInteger(o.both, lang)}</dd>
            </div>
            <div data-part="female">
              <dt>{t.lfP6FemaleOnlyLabel}</dt>
              <dd>{formatInteger(o.female_only, lang)}</dd>
            </div>
          </dl>
        </div>
        <PerList
          facts={facts}
          render={(list, side) => <Hyphenated list={list} side={side} lang={lang} />}
        />
      </div>
    </Plate>
  );
}

// --- plate VII: change over time -------------------------------------------------

/** The year of an ISO date, as written: a slice of the stored string, never a new figure. */
function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

type Slot =
  | { readonly kind: "edition"; readonly edition: ListEdition; readonly end: boolean }
  | { readonly kind: "gap"; readonly gap: ListEditionGap; readonly of: ListEdition | undefined };

/**
 * The list's editions and gaps in date order, for layout: a merge of two
 * lists the contract already holds in ascending order. The first and the last
 * edition, which `change` compares, are marked `end`.
 */
function slotsOf(list: ListFacts): Slot[] {
  const { items, gaps } = list.editions;
  const slots: Slot[] = [];
  let g = 0;
  items.forEach((edition, i) => {
    for (; g < gaps.length && gaps[g]!.data_date < edition.data_date; g++) {
      const gap = gaps[g]!;
      slots.push({ kind: "gap", gap, of: items.find((e) => e.resource_id === gap.duplicate_of) });
    }
    slots.push({ kind: "edition", edition, end: i === 0 || i === items.length - 1 });
  });
  for (; g < gaps.length; g++) {
    const gap = gaps[g]!;
    slots.push({ kind: "gap", gap, of: items.find((e) => e.resource_id === gap.duplicate_of) });
  }
  return slots;
}

/** The largest edition across both lists: one scale, so a switch shows real differences. */
function editionScale(facts: ListFactsArtefact): number {
  return Math.max(
    ...SIDES.flatMap((side) => facts.lists[side].editions.items.map((e) => e.surnames)),
  );
}

function gapNote(slot: Extract<Slot, { kind: "gap" }>, lang: Lang): string {
  const t = UI[lang];
  if (slot.of === undefined) return t.lfP7GapShort;
  return fillTemplate(
    t.lfP7Gap,
    { date: keptDate(slot.gap.data_date, lang), of: keptDate(slot.of.data_date, lang) },
    {},
    lang,
  );
}

/** A gap's outline height in the chart box: low, so it is never read as a count. */
const TREND_GAP_HEIGHT = 28;

/**
 * One column per edition, and per gap a low dashed outline on the baseline, so a
 * gap never reads as a value. Drawn only; the table carries the figures.
 */
function TrendChart({ slots, max, lang }: { slots: readonly Slot[]; max: number; lang: Lang }) {
  return (
    <div className="lf-trend-fig" aria-hidden="true">
      <svg
        className="lf-trend"
        viewBox={`0 0 ${String(TREND.width)} ${String(TREND.height)}`}
        aria-hidden="true"
      >
        {slots.map((slot, i) => {
          const column = trendColumn(i, slots.length);
          if (slot.kind === "gap") {
            return (
              <rect
                key={slot.gap.data_date}
                className="lf-trend-gap"
                x={column.x}
                y={TREND.height - TREND_GAP_HEIGHT}
                width={column.width}
                height={TREND_GAP_HEIGHT}
                fill="none"
              />
            );
          }
          return (
            <path
              key={slot.edition.data_date}
              className="lf-trend-bar"
              data-end={slot.end ? "" : undefined}
              style={vars({ i })}
              d={columnPath(column, linearScale(slot.edition.surnames, max))}
            />
          );
        })}
        <line
          className="lf-trend-base"
          x1="0"
          x2={TREND.width}
          y1={TREND.height}
          y2={TREND.height}
        />
      </svg>
      <ol className="lf-trend-years">
        {slots.map((slot) =>
          slot.kind === "gap" ? (
            <li key={slot.gap.data_date} data-gap="">
              {yearOf(slot.gap.data_date)}
              <span>{UI[lang].lfP7GapShort}</span>
            </li>
          ) : (
            <li key={slot.edition.data_date} data-end={slot.end ? "" : undefined}>
              {yearOf(slot.edition.data_date)}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

function TrendTable({ slots, side, lang }: { slots: readonly Slot[]; side: Side; lang: Lang }) {
  const t = UI[lang];
  return (
    <table className="lf-trend-table">
      <caption className="lf-sr">{of(side, t.lfP7TableMale, t.lfP7TableFemale)}</caption>
      <thead>
        <tr>
          <th scope="col">{t.lfP7ColEdition}</th>
          <th scope="col">{t.lfP7ColSurnames}</th>
          <th scope="col">{of(side, t.lfP7ColPeopleMale, t.lfP7ColPeopleFemale)}</th>
        </tr>
      </thead>
      <tbody>
        {slots.map((slot) =>
          slot.kind === "gap" ? (
            <tr key={slot.gap.data_date} data-gap="">
              <th scope="row">{keptDate(slot.gap.data_date, lang)}</th>
              <td colSpan={2}>{gapNote(slot, lang)}</td>
            </tr>
          ) : (
            <tr key={slot.edition.data_date} data-end={slot.end ? "" : undefined}>
              <th scope="row">{keptDate(slot.edition.data_date, lang)}</th>
              <td>{formatInteger(slot.edition.surnames, lang)}</td>
              <td>{formatInteger(slot.edition.people, lang)}</td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}

function Changes({ list, side, lang }: { list: ListFacts; side: Side; lang: Lang }) {
  const t = UI[lang];
  const c = list.change;
  const first = yearOf(c.first_data_date);
  const last = yearOf(c.last_data_date);
  const added = c.on_last_not_first;
  const gone = c.on_first_not_last;
  // `top3_first_counts` follows `named_top.items` key by key (the contract
  // refuses anything else); a pair that did not match would name nothing.
  const top = list.named_top.items.flatMap((item, i) => {
    const entry = c.top3_first_counts[i];
    return entry?.key === item.key ? [{ item, first: entry.count_first }] : [];
  });
  return (
    <div className="lf-trend-facts">
      <div className="lf-big">
        <p className="lf-big-fig">
          <span className="lf-big-v">
            <Num>{formatInteger(added.surnames, lang)}</Num>
          </span>
          <span className="lf-big-l">
            {fillTemplate(
              of(side, t.lfP7NewMale, t.lfP7NewFemale),
              { first, last, p: formatInteger(added.people, lang) },
              { s: added.surnames, p: added.people },
              lang,
            )}
          </span>
        </p>
        <p className="lf-big-fig">
          <span className="lf-big-v">
            <Num>{formatInteger(gone.surnames, lang)}</Num>
          </span>
          <span className="lf-big-l">
            {fillTemplate(
              of(side, t.lfP7GoneMale, t.lfP7GoneFemale),
              { first, last, p: formatInteger(gone.people_on_first, lang) },
              { s: gone.surnames, p: gone.people_on_first },
              lang,
            )}
          </span>
        </p>
        <p className="lf-trend-zero">{t.lfP7NotZero}</p>
      </div>
      {top.length === 0 ? null : (
        <div className="lf-trend-top">
          <p className="lf-kicker">
            {fillTemplate(of(side, t.lfP7TopMale, t.lfP7TopFemale), { first, last }, {}, lang)}
          </p>
          <ol className="lf-trend-names">
            {top.map(({ item, first: count }) => (
              <li key={item.key}>
                <Name surname={item.published} lang={lang} />
                <span className="lf-count">
                  {count === null
                    ? fillTemplate(t.lfP7TopAbsent, { first }, {}, lang)
                    : formatInteger(count, lang)}
                  {"\u00a0→\u00a0"}
                  {formatInteger(item.count, lang)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="lf-trend-ten">
        {fillTemplate(
          c.top10_unchanged
            ? of(side, t.lfP7Top10Male, t.lfP7Top10Female)
            : of(side, t.lfP7Top10ChangedMale, t.lfP7Top10ChangedFemale),
          { first },
          {},
          lang,
        )}
      </p>
    </div>
  );
}

function PlateChange({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const max = editionScale(facts);
  const title = (list: ListFacts, side: Side) => {
    const c = list.change;
    const years = { first: yearOf(c.first_data_date), last: yearOf(c.last_data_date) };
    const sf = formatInteger(c.surnames_first, lang);
    const sl = formatInteger(c.surnames_last, lang);
    // The words follow the sign of the stored difference; nothing is subtracted here.
    if (c.surnames_delta > 0) {
      return rich(
        of(side, t.lfP7TitleMoreMale, t.lfP7TitleMoreFemale),
        { ...years, d: <Num>{formatInteger(c.surnames_delta, lang)}</Num> },
        { d: c.surnames_delta },
        lang,
      );
    }
    if (c.surnames_delta < 0) {
      return rich(
        of(side, t.lfP7TitleFewerMale, t.lfP7TitleFewerFemale),
        { ...years, sl: <Num>{sl}</Num>, sf: <Num>{sf}</Num> },
        {},
        lang,
      );
    }
    return rich(
      of(side, t.lfP7TitleSameMale, t.lfP7TitleSameFemale),
      { ...years, sl: <Num>{sl}</Num> },
      {},
      lang,
    );
  };
  const lede = (list: ListFacts, side: Side) => {
    const c = list.change;
    return (
      <p>
        {fillTemplate(
          of(side, t.lfP7LedeMale, t.lfP7LedeFemale),
          {
            from: keptDate(c.first_data_date, lang),
            to: keptDate(c.last_data_date, lang),
            pf: formatInteger(c.people_first, lang),
            pl: formatInteger(c.people_last, lang),
            pd: formatSigned(c.people_delta, lang),
          },
          {},
          lang,
        )}
      </p>
    );
  };
  return (
    <Plate
      id="lf-p11"
      number="11"
      name={t.lfP7Name}
      title={<PerList facts={facts} inline render={title} />}
      lede={<PerList facts={facts} render={lede} />}
      foot={t.lfP7Foot}
      lang={lang}
      source={
        <SourceLine
          facts={facts}
          lang={lang}
          editions
          methods={(l) => [
            l.editions.method_version,
            l.change.method_version,
            l.named_top.method_version,
          ]}
        />
      }
    >
      <PerList
        facts={facts}
        className="lf-rv"
        render={(list, side) => {
          const slots = slotsOf(list);
          return (
            <div className="lf-trend-wrap">
              <div className="lf-trend-box">
                <TrendChart slots={slots} max={max} lang={lang} />
                <TrendTable slots={slots} side={side} lang={lang} />
              </div>
              <Changes list={list} side={side} lang={lang} />
            </div>
          );
        }}
      />
    </Plate>
  );
}

// --- the section ------------------------------------------------------------------

// --- plate 01: the most common surnames (TASK-178) --------------------------------

/** The rank claims' list for one side, matched by its comparability group. */
function commonFor(common: readonly CommonList[], side: Side): CommonList | null {
  const group = of(side, "national_male", "national_female");
  return common.find((list) => list.comparability_group === group) ?? null;
}

function TopList({
  list,
  ranks,
  side,
  lang,
}: {
  list: ListFacts;
  ranks: CommonList | null;
  side: Side;
  lang: Lang;
}) {
  const t = UI[lang];
  const named = new Map(list.named_top.items.map((item) => [item.published, item.count]));
  const max = list.summary.max_count;
  const th = list.summary.thresholds;
  const fifty = th[th.length - 1] ?? null;
  const top = list.named_top.items[0] ?? null;
  return (
    <div className="lf-top-wrap lf-rv">
      <div>
        {ranks === null ? (
          <>
            <p className="lf-top-note">{t.lfTopUnavailable}</p>
            <ol className="lf-top-list" aria-label={of(side, t.lfTopListMale, t.lfTopListFemale)}>
              {list.named_top.items.map((item) => (
                <li key={item.key} style={vars({ w: linearScale(item.count, max) })}>
                  <span className="lf-top-rank" aria-hidden="true">
                    ·
                  </span>
                  <span className="lf-top-name">
                    <Name surname={item.published} lang={lang} />
                    <i className="lf-top-bar" aria-hidden="true" />
                  </span>
                  <span className="lf-count">{formatInteger(item.count, lang)}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <ol className="lf-top-list" aria-label={of(side, t.lfTopListMale, t.lfTopListFemale)}>
            {ranks.items.map((item) => {
              const count = named.get(item.display_name) ?? null;
              return (
                <li
                  key={`${item.display_name}-${String(item.rank)}`}
                  style={count === null ? undefined : vars({ w: linearScale(count, max) })}
                >
                  <span className="lf-top-rank">{String(item.rank)}.</span>
                  <span className="lf-top-name">
                    <a className="lf-name" href={item.path}>
                      {item.display_name}
                    </a>
                    {count === null ? null : <i className="lf-top-bar" aria-hidden="true" />}
                  </span>
                  {count === null ? null : (
                    <span className="lf-count">{formatInteger(count, lang)}</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="lf-big">
        {fifty === null ? null : (
          <p className="lf-big-fig">
            <span className="lf-big-v">
              <Num>{formatInteger(fifty.surnames, lang)}</Num>
            </span>
            <span className="lf-big-l">
              {fillTemplate(
                of(side, t.lfTopThresholdMale, t.lfTopThresholdFemale),
                { k: formatInteger(fifty.at_least, lang), p: formatInteger(fifty.people, lang) },
                { n: fifty.surnames, p: fifty.people },
                lang,
              )}
            </span>
          </p>
        )}
        {top === null ? null : (
          <p className="lf-big-fig">
            <span className="lf-big-v">
              <Num>{formatInteger(top.count, lang)}</Num>
            </span>
            <span className="lf-big-l">
              {rich(
                of(side, t.lfTopShareMale, t.lfTopShareFemale),
                { name: <Name surname={top.published} lang={lang} /> },
                {},
                lang,
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function PlateTop({
  facts,
  common,
  lang,
}: {
  facts: ListFactsArtefact;
  common: readonly CommonList[];
  lang: Lang;
}) {
  const t = UI[lang];
  const title = (list: ListFacts) => {
    const [a, b, c] = list.named_top.items;
    if (a === undefined || b === undefined || c === undefined) {
      return list.named_top.items.map((item, i) => (
        <Fragment key={item.key}>
          {i > 0 ? ", " : null}
          <Name surname={item.published} lang={lang} />
        </Fragment>
      ));
    }
    return rich(
      t.lfTopTitle,
      {
        a: <Name surname={a.published} lang={lang} />,
        b: <Name surname={b.published} lang={lang} />,
        c: <Name surname={c.published} lang={lang} />,
      },
      {},
      lang,
    );
  };
  return (
    <Plate
      id="lf-p01"
      number="01"
      name={t.lfTopName}
      title={<PerList facts={facts} inline render={title} />}
      lede={
        <PerList
          facts={facts}
          render={(_list, side) => <p>{of(side, t.lfTopLedeMale, t.lfTopLedeFemale)}</p>}
        />
      }
      foot={t.lfTopFoot}
      lang={lang}
      source={
        <SourceLine
          facts={facts}
          lang={lang}
          methods={(l) => [l.summary.method_version, l.named_top.method_version]}
        />
      }
    >
      <PerList
        facts={facts}
        render={(list, side) => (
          <TopList list={list} ranks={commonFor(common, side)} side={side} lang={lang} />
        )}
      />
    </Plate>
  );
}

// --- plate 05: the thresholds ladder (TASK-178) -----------------------------------

/** The threshold the headline names: at least 10 000 bearers, else the second-highest rung. */
function headlineThreshold(list: ListFacts) {
  const th = list.summary.thresholds;
  return th.find((t) => t.at_least === 10000) ?? th[th.length - 2] ?? th[0] ?? null;
}

function Ladder({ list, side, lang }: { list: ListFacts; side: Side; lang: Lang }) {
  const t = UI[lang];
  const max = list.summary.thresholds[0]?.surnames ?? 0;
  const hi = headlineThreshold(list);
  return (
    <ol className="lf-ladder" aria-label={of(side, t.lfThListMale, t.lfThListFemale)}>
      {list.summary.thresholds.map((th) => (
        <li
          key={th.at_least}
          data-hi={hi !== null && th.at_least === hi.at_least ? "" : undefined}
          style={vars({ w: logScale(th.surnames, max) })}
        >
          <span className="lf-ladder-k">
            {fillTemplate(
              t.lfThRow,
              { k: formatInteger(th.at_least, lang) },
              { k: th.at_least },
              lang,
            )}
          </span>
          <span className="lf-ladder-track">
            <i aria-hidden="true" />
          </span>
          <span className="lf-ladder-s">
            {fillTemplate(
              t.lfThSurnames,
              { n: formatInteger(th.surnames, lang) },
              { n: th.surnames },
              lang,
            )}
          </span>
          <span className="lf-ladder-p">
            {fillTemplate(
              of(side, t.lfThPeopleMale, t.lfThPeopleFemale),
              { p: formatInteger(th.people, lang) },
              { p: th.people },
              lang,
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

function PlateThresholds({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const title = (list: ListFacts, side: Side) => {
    const hi = headlineThreshold(list);
    if (hi === null) return t.lfThName;
    return rich(
      of(side, t.lfThTitleMale, t.lfThTitleFemale),
      { n: <Num>{formatInteger(hi.surnames, lang)}</Num>, k: formatInteger(hi.at_least, lang) },
      { n: hi.surnames },
      lang,
    );
  };
  return (
    <Plate
      id="lf-p05"
      number="05"
      name={t.lfThName}
      title={<PerList facts={facts} inline render={title} />}
      lede={
        <PerList
          facts={facts}
          render={(_list, side) => <p>{of(side, t.lfThLedeMale, t.lfThLedeFemale)}</p>}
        />
      }
      foot={t.lfThFoot}
      lang={lang}
      source={<SourceLine facts={facts} lang={lang} methods={(l) => [l.summary.method_version]} />}
    >
      <div className="lf-ladder-wrap lf-rv">
        <PerList
          facts={facts}
          render={(list, side) => <Ladder list={list} side={side} lang={lang} />}
        />
      </div>
    </Plate>
  );
}

// --- plate 09: shared surnames, the "birthday problem" (TASK-178) ---------------

function CollisionChart({
  list,
  birthday,
  lang,
}: {
  list: ListFacts;
  birthday: ListFactsArtefact["birthday_reference"];
  lang: Lang;
}) {
  const t = UI[lang];
  const c = list.collision;
  const first = c.curve[0];
  const last = c.curve[c.curve.length - 1];
  if (first === undefined || last === undefined) return null;
  const mark = curvePoint(c.n_half, c.p_at_n_half, first.n, last.n);
  const bday = curvePoint(birthday.n_half, birthday.p_at_n_half, first.n, last.n);
  const ticks = c.curve.filter((point) => point.n % 50 === 0);
  return (
    <div className="lf-col-fig" aria-hidden="true">
      <svg
        className="lf-col"
        viewBox={`0 0 ${String(CURVE.width)} ${String(CURVE.height + 40)}`}
        aria-hidden="true"
      >
        <line className="lf-col-grid" x1="0" x2={CURVE.width} y1={mark.y} y2={mark.y} />
        <path className="lf-col-curve" d={curvePath(c.curve)} />
        <line
          className="lf-col-stem lf-col-b"
          x1={bday.x}
          x2={bday.x}
          y1={bday.y}
          y2={CURVE.height}
        />
        <circle className="lf-col-dot lf-col-b" cx={bday.x} cy={bday.y} r="7" />
        <text className="lf-col-label lf-col-b" x={bday.x + 12} y={bday.y - 10}>
          {fillTemplate(
            t.lfColMarkBirthday,
            { b: formatInteger(birthday.n_half, lang), p: formatShare(birthday.p_at_n_half, lang) },
            { b: birthday.n_half },
            lang,
          )}
        </text>
        <line
          className="lf-col-stem lf-col-n"
          x1={mark.x}
          x2={mark.x}
          y1={mark.y}
          y2={CURVE.height}
        />
        <circle className="lf-col-dot lf-col-n" cx={mark.x} cy={mark.y} r="8" />
        <text className="lf-col-label lf-col-n" x={mark.x + 14} y={mark.y + 6}>
          {fillTemplate(
            t.lfColMarkSurname,
            { n: formatInteger(c.n_half, lang), p: formatShare(c.p_at_n_half, lang) },
            { n: c.n_half },
            lang,
          )}
        </text>
        <line className="lf-col-base" x1="0" x2={CURVE.width} y1={CURVE.height} y2={CURVE.height} />
        {ticks.map((point) => {
          const { x } = curvePoint(point.n, 0, first.n, last.n);
          return (
            <text key={point.n} className="lf-col-tick" x={x} y={CURVE.height + 22}>
              {formatInteger(point.n, lang)}
            </text>
          );
        })}
        <text className="lf-col-axis" x={CURVE.width / 2} y={CURVE.height + 38}>
          {t.lfColAxis}
        </text>
      </svg>
    </div>
  );
}

function CollisionFigures({ list, side, lang }: { list: ListFacts; side: Side; lang: Lang }) {
  const t = UI[lang];
  const c = list.collision;
  return (
    <div className="lf-big">
      <p className="lf-big-fig">
        <span className="lf-big-v">
          <Num>{formatInteger(c.n_half, lang)}</Num>
        </span>
        <span className="lf-big-l">
          {fillTemplate(t.lfColStatHalf, { p: formatShare(c.p_at_n_half, lang) }, {}, lang)}
        </span>
      </p>
      <p className="lf-big-fig">
        <span className="lf-big-v">
          <Num>
            {fillTemplate(t.lfColOneIn, { k: formatInteger(c.pair_one_in, lang) }, {}, lang)}
          </Num>
        </span>
        <span className="lf-big-l">{of(side, t.lfColStatPairMale, t.lfColStatPairFemale)}</span>
      </p>
    </div>
  );
}

function PlateCollision({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const b = facts.birthday_reference;
  const title = (list: ListFacts, side: Side) =>
    rich(
      of(side, t.lfColTitleMale, t.lfColTitleFemale),
      { n: <Num>{formatInteger(list.collision.n_half, lang)}</Num> },
      { n: list.collision.n_half },
      lang,
    );
  const lede = fillTemplate(
    t.lfColLede,
    { b: formatInteger(b.n_half, lang) },
    { b: b.n_half },
    lang,
  );
  const foot = (list: ListFacts) => {
    const first = list.collision.curve[0];
    const last = list.collision.curve[list.collision.curve.length - 1];
    return fillTemplate(
      t.lfColFoot,
      {
        from: formatInteger(first?.n ?? 0, lang),
        to: formatInteger(last?.n ?? 0, lang),
      },
      {},
      lang,
    );
  };
  return (
    <Plate
      id="lf-p09"
      number="09"
      name={t.lfColName}
      title={<PerList facts={facts} inline render={title} />}
      lede={<p>{lede}</p>}
      foot={foot(facts.lists.male)}
      lang={lang}
      source={
        <SourceLine facts={facts} lang={lang} methods={(l) => [l.collision.method_version]} />
      }
    >
      <div className="lf-col-wrap lf-rv">
        <PerList
          facts={facts}
          render={(list) => <CollisionChart list={list} birthday={b} lang={lang} />}
        />
        <div>
          <PerList
            facts={facts}
            render={(list, side) => <CollisionFigures list={list} side={side} lang={lang} />}
          />
          <p className="lf-col-birthday">
            <Num>{formatInteger(b.n_half, lang)}</Num>{" "}
            {fillTemplate(
              t.lfColStatBirthday,
              { p: formatShare(b.p_at_n_half, lang) },
              { b: b.n_half },
              lang,
            )}
          </p>
        </div>
      </div>
    </Plate>
  );
}

// --- plate 10: a crowd of a thousand (TASK-178) -------------------------------------

/** The expected number of different surnames, rounded to a whole number for reading. */
function aboutInteger(value: number, lang: Lang): string {
  return formatInteger(Math.round(value), lang);
}

function CrowdGrid({ list, side }: { list: ListFacts; side: Side }) {
  const ex = list.crowd.example;
  const groups = ex.group_sizes;
  const id = `lf-cr-${side}`;
  let k = 0;
  const dots: { cx: number; cy: number; g: number }[] = [];
  groups.forEach((size, g) => {
    for (let i = 0; i < size; i++) dots.push({ ...crowdDot(k++), g });
  });
  const height = crowdHeight(ex.n);
  return (
    <svg
      className="lf-cr"
      viewBox={`0 0 ${String(CROWD.cols * CROWD.cell)} ${String(height)}`}
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width={CROWD.cell} height={CROWD.cell} patternUnits="userSpaceOnUse">
          <circle
            className="lf-cr-single"
            cx={CROWD.cell / 2}
            cy={CROWD.cell / 2}
            r={CROWD.radius * 0.75}
          />
        </pattern>
      </defs>
      <rect width={CROWD.cols * CROWD.cell} height={height} fill={`url(#${id})`} />
      {dots.map((dot, i) => (
        <circle
          key={i}
          className="lf-cr-dot"
          data-odd={dot.g % 2 === 1 ? "" : undefined}
          cx={dot.cx}
          cy={dot.cy}
          r={CROWD.radius}
        />
      ))}
    </svg>
  );
}

function CrowdFigures({ list, side, lang }: { list: ListFacts; side: Side; lang: Lang }) {
  const t = UI[lang];
  const cr = list.crowd;
  const reach = Object.fromEntries(cr.reach_half.map((r) => [r.set, r]));
  const top = list.named_top.items[0] ?? null;
  const t1 = reach["TOP_1"];
  const t10 = reach["TOP_10"];
  const t100 = reach["TOP_100"];
  return (
    <div className="lf-cr-figs">
      <p className="lf-kicker">{t.lfCrLadderKicker}</p>
      <ol className="lf-ladder lf-ladder-cr">
        {cr.expected_distinct.map((entry) => (
          <li key={entry.n} style={vars({ w: linearScale(entry.value, entry.n) })}>
            <span className="lf-ladder-k">
              {fillTemplate(t.lfCrLadderRow, { n: formatInteger(entry.n, lang) }, {}, lang)}
            </span>
            <span className="lf-ladder-track">
              <i aria-hidden="true" />
            </span>
            <span className="lf-ladder-s">
              {fillTemplate(t.lfCrLadderValue, { d: aboutInteger(entry.value, lang) }, {}, lang)}
            </span>
          </li>
        ))}
      </ol>
      {t1 === undefined || t10 === undefined || t100 === undefined ? null : (
        <div className="lf-omit lf-cr-reach">
          <p className="lf-kicker">{t.lfCrReachKicker}</p>
          {top === null ? null : (
            <p>
              {rich(
                of(side, t.lfCrReachTop1Male, t.lfCrReachTop1Female),
                {
                  name: <Name surname={top.published} lang={lang} />,
                  n: <b>{formatInteger(t1.n_half, lang)}</b>,
                  s: formatShare(t1.share_of_people, lang),
                },
                { n: t1.n_half },
                lang,
              )}
            </p>
          )}
          <p>
            {rich(
              t.lfCrReachTop10,
              {
                n: <b>{formatInteger(t10.n_half, lang)}</b>,
                s: formatShare(t10.share_of_people, lang),
              },
              { n: t10.n_half },
              lang,
            )}
          </p>
          <p>
            {rich(
              t.lfCrReachTop100,
              {
                n: <b>{formatInteger(t100.n_half, lang)}</b>,
                s: formatShare(t100.share_of_people, lang),
              },
              { n: t100.n_half },
              lang,
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function PlateCrowd({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const title = (list: ListFacts, side: Side) => {
    const expected = list.crowd.expected_distinct.find((e) => e.n === list.crowd.crowd_size);
    return rich(
      of(side, t.lfCrTitleMale, t.lfCrTitleFemale),
      {
        n: formatInteger(list.crowd.crowd_size, lang),
        d: <Num>{expected === undefined ? "" : aboutInteger(expected.value, lang)}</Num>,
      },
      {},
      lang,
    );
  };
  const lede = (list: ListFacts) => {
    const largest = list.crowd.example.group_sizes[0] ?? 0;
    return (
      <p>
        {rich(
          t.lfCrLede,
          {
            s: <b>{formatShare(list.crowd.share_without_namesake, lang)}</b>,
            g: formatInteger(largest, lang),
          },
          { g: largest },
          lang,
        )}
      </p>
    );
  };
  return (
    <Plate
      id="lf-p10"
      number="10"
      name={t.lfCrName}
      title={<PerList facts={facts} inline render={title} />}
      lede={<PerList facts={facts} render={lede} />}
      foot={t.lfCrFoot}
      lang={lang}
      source={
        <SourceLine
          facts={facts}
          lang={lang}
          methods={(l) => [l.crowd.method_version, l.named_top.method_version]}
        />
      }
    >
      <div className="lf-cr-wrap lf-rv">
        <div className="lf-cr-box">
          <PerList facts={facts} render={(list, side) => <CrowdGrid list={list} side={side} />} />
          <PerList
            facts={facts}
            render={(list) => (
              <p className="lf-axis-note">
                {fillTemplate(
                  t.lfCrExample,
                  {
                    d: formatInteger(list.crowd.example.distinct, lang),
                    w: formatInteger(list.crowd.example.without_namesake, lang),
                  },
                  { w: list.crowd.example.without_namesake },
                  lang,
                )}
              </p>
            )}
          />
        </div>
        <PerList
          facts={facts}
          render={(list, side) => <CrowdFigures list={list} side={side} lang={lang} />}
        />
      </div>
    </Plate>
  );
}

/**
 * The surname atlas: Part I of the Atlas page (TASK-178). No facts, no
 * section: when `listFacts()` failed the page renders without it rather than
 * with figures from anywhere else. `common` is the rank claims' lists for
 * plate 01, empty when the database did not answer.
 */
export function ListAtlas({
  facts,
  common = [],
  lang,
}: {
  facts: ListFactsArtefact | null;
  common?: readonly CommonList[];
  lang: Lang;
}) {
  if (facts === null) return null;
  const t: Messages = UI[lang];
  const date = keptDate(facts.snapshot_date, lang);
  const head = (
    <header className="lf-head">
      <div className="lf-head-title">
        <p className="lf-eyebrow">
          {fillTemplate(t.lfEyebrowAtlas, { year: facts.snapshot_date.slice(0, 4) }, {}, lang)}
        </p>
        <h2 id="lf-title" className="lf-title">
          {t.lfTitle}
        </h2>
      </div>
      <div className="lf-head-text">
        <p className="lf-lede">{fillTemplate(t.lfLede, { date }, {}, lang)}</p>
        <p className="lf-scope">{terminate(fillTemplate(t.lfScope, { date }, {}, lang))}</p>
      </div>
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
      <PlateTop facts={facts} common={common} lang={lang} />
      <PlateSky facts={facts} lang={lang} />
      <PlateHalf facts={facts} lang={lang} />
      <PlateRarity facts={facts} lang={lang} />
      <PlateThresholds facts={facts} lang={lang} />
      <PlateEndings facts={facts} lang={lang} />
      <PlateAlphabet facts={facts} lang={lang} />
      <PlateTwoLists facts={facts} lang={lang} />
      <PlateCollision facts={facts} lang={lang} />
      <PlateCrowd facts={facts} lang={lang} />
      <PlateChange facts={facts} lang={lang} />
    </ListAtlasShell>
  );
}
