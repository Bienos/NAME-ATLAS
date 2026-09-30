import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import { POLISH_ALPHABET } from "@name-atlas/contracts";
import type { CountBand, ListFacts, ListFactsArtefact, NamedSurname } from "@name-atlas/contracts";
import {
  assessmentWord,
  fillTemplate,
  formatDate,
  formatInteger,
  formatQuantile,
  formatShare,
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
  linearScale,
  RIBBON,
  ribbonPath,
  round4,
  sqrtScale,
  vennLayout,
} from "./list-atlas-geometry.js";

/**
 * The landing atlas (TASK-040; six plates since TASK-043): six plates about
 * the two published PESEL surname lists, rendered from `listFacts()`, and a
 * coda.
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
 * `overlap` does: counts of surnames, never of people.
 *
 * A surname appears only as one of the artefact's ADR-0018 selections, as its
 * published string, and as text: never a link, because production's search
 * cannot answer most surnames yet (TASK-043 §2.5).
 */

type Side = "male" | "female";
const SIDES: readonly Side[] = ["male", "female"];
type Messages = (typeof UI)[Lang];

/** The male or the female variant of anything. */
function of<T>(side: Side, male: T, female: T): T {
  return side === "male" ? male : female;
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

/** A figure in a headline or a counter: sans, tabular, in Atlas Blue. */
function Num({ children }: { children: ReactNode }) {
  return <span className="lf-n">{children}</span>;
}

/** A surname as the source publishes it: text, never a link (ADR-0018 §2.5). */
function Name({ surname }: { surname: string }) {
  return <span className="lf-name">{surname}</span>;
}

/** Custom properties for the stylesheet: positions and scales as unitless fractions. */
function vars(values: Readonly<Record<string, number>>): CSSProperties {
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
function Alt({
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
function keptDate(iso: string, lang: Lang): string {
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
  lang,
}: {
  facts: ListFactsArtefact;
  methods: (list: ListFacts) => readonly string[];
  shared?: readonly string[];
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
        {fillTemplate(t.lfMethod, { status: statuses, method: list }, {}, lang)}
      </span>
    </p>
  );
}

function Plate({
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
            <span>
              {of(side, t.lfP1CoreMale, t.lfP1CoreFemale)}{" "}
              {items.map((item, index) => (
                <Fragment key={item.key}>
                  {index === 0 ? null : " · "}
                  <Name surname={item.published} />{" "}
                  <span className="lf-count">{formatInteger(item.count, lang)}</span>
                </Fragment>
              ))}
            </span>
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
      id="lf-p1"
      number="I"
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
      id="lf-p2"
      number="II"
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
      id="lf-p3"
      number="III"
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
      id="lf-p4"
      number="IV"
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
      id="lf-p5"
      number="V"
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
            <Name surname={h.top.published} />
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
          { name: <Name surname={surname.published} />, [key]: formatInteger(surname.count, lang) },
          { [key]: surname.count },
          lang,
        );
  const both =
    o.on_both_top === null
      ? null
      : rich(
          t.lfP6OnBoth,
          {
            name: <Name surname={o.on_both_top.male.published} />,
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
      id="lf-p6"
      number="VI"
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

// --- the coda ---------------------------------------------------------------------

function Coda({ facts, lang }: { facts: ListFactsArtefact; lang: Lang }) {
  const t = UI[lang];
  const [day = "", month = ""] = formatDate(facts.snapshot_date, lang).split(" ");
  return (
    <div className="lf-coda lf-rv">
      <div>
        <p className="lf-kicker">{t.lfCodaKicker}</p>
        <h3 className="lf-coda-title">{t.lfCodaTitle}</h3>
        <p className="lf-coda-body">
          {fillTemplate(t.lfCodaBody, { date: keptDate(facts.snapshot_date, lang) }, {}, lang)}
        </p>
        <p className="lf-state">{assessmentWord("INSUFFICIENT_DATA", lang)}</p>
      </div>
      <div className="lf-stamps" aria-hidden="true">
        <span className="lf-stamp">
          <span>
            {t.lfCodaEdition}
            <b>{facts.snapshot_date.slice(0, 4)}</b>
            {`${day}\u00a0${month}`}
          </span>
        </span>
        <span className="lf-stamp-link" />
        <span className="lf-stamp lf-stamp-next">
          <span>
            {t.lfCodaNext}
            <b>—</b>
            {t.lfCodaEdition}
          </span>
        </span>
      </div>
    </div>
  );
}

// --- the section ------------------------------------------------------------------

/**
 * The atlas section. No facts, no section: when `listFacts()` failed the page
 * renders without it rather than with figures from anywhere else.
 */
export function ListAtlas({ facts, lang }: { facts: ListFactsArtefact | null; lang: Lang }) {
  if (facts === null) return null;
  const t: Messages = UI[lang];
  const date = keptDate(facts.snapshot_date, lang);
  const head = (
    <header className="lf-head">
      <div className="lf-head-title">
        <p className="lf-eyebrow">
          {fillTemplate(t.lfEyebrow, { year: facts.snapshot_date.slice(0, 4) }, {}, lang)}
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
      <PlateSky facts={facts} lang={lang} />
      <PlateHalf facts={facts} lang={lang} />
      <PlateRarity facts={facts} lang={lang} />
      <PlateEndings facts={facts} lang={lang} />
      <PlateAlphabet facts={facts} lang={lang} />
      <PlateTwoLists facts={facts} lang={lang} />
      <Coda facts={facts} lang={lang} />
    </ListAtlasShell>
  );
}
