import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type { CitationDto } from "@name-atlas/contracts";
import { BIRTH_SEXES } from "@name-atlas/truth";
import type { BirthSex } from "@name-atlas/truth";
import { accountPath } from "./account-paths.js";
import { accountsRuntime } from "./accounts-runtime.js";
import {
  BABY_NAMES_COMPARE_PATHS,
  BABY_NAMES_PATHS,
  babyNamesEnabled,
  readBabyNamesAccess,
} from "./baby-names-config.js";
import {
  BABY_COMPARE_FIELDS,
  babyCompareFigures,
  babyCompareModel,
  babyComparePath,
  parseBabyCompareQuery,
} from "./baby-names-compare-facts.js";
import type { BabyCompareModel, BabyCompareYear } from "./baby-names-compare-facts.js";
import { BABY_NAMES_COMPARE_TEXT } from "./baby-names-compare-text.js";
import {
  BABY_NAMES_SEX_FIELD,
  BABY_NAMES_SEX_PARAM,
  BabyLocked,
  Source,
  YEARS_SHOWN,
  readBabyNamesSession,
  runningBabyNamesDeps,
} from "./baby-names-page.js";
import type { BabyNamesDeps } from "./baby-names-page.js";
import { babyPagePath } from "./baby-names-share-facts.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import { Tabs } from "../design-system/components/index.js";
import { formatInteger } from "./messages.js";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";

/**
 * The comparison (TASK-158, D-044): `/pl/imiona-dla-dziecka/porownaj` and
 * `/en/baby-names/compare`, `?a=<name>&b=<name>&sex=boys|girls`. Two first
 * names of one sex side by side, part of the 8,99 zł view.
 *
 * Gated as the page: a 404 unless the flag and accounts are on; signed out it
 * explains and links to sign-in, which comes back to the page; `noindex`;
 * `private, no-store` from the middleware (`isBabyNamesPath`); in no sitemap.
 * The entitlement (`hasFullView`) is decided before any name is looked up: a
 * signed-in reader without it gets the form, the sex tabs and the page's
 * locked card, and no figure of either name is read (ADR-0023 §2.5: nothing
 * to buy, "Wkrótce").
 *
 * The form is a GET and works without script; the sex tabs and "Zamień drugie
 * imię" are links; the chart is inline SVG from the model. Every figure comes
 * through `baby-names-compare-facts.ts` from the claims; nothing is computed
 * here but geometry.
 */

export const BABY_COMPARE_METADATA: Readonly<Record<Lang, Metadata>> = {
  pl: {
    title: "Porównanie dwóch imion · Imiona dla dziecka · Name Atlas",
    robots: { index: false, follow: false },
  },
  en: {
    title: "Comparing two names · Baby names · Name Atlas",
    robots: { index: false, follow: false },
  },
};

type Query = Readonly<Record<string, string | string[] | undefined>>;

/** Why the two names were not compared: one plain line, then the form. */
export type BabyCompareProblem =
  | {
      readonly reason: "INVALID" | "NOT_FOUND" | "HELD" | "NOT_ON_LIST" | "RIGHTS_BLOCKED";
      readonly name: string;
    }
  | { readonly reason: "SAME" };

export type BabyCompareData =
  | { readonly kind: "signed-out"; readonly lang: Lang; readonly signInHref: string }
  | {
      readonly kind: "signed-in";
      readonly lang: Lang;
      /** The two names as typed (trimmed); "" when absent. */
      readonly a: string;
      readonly b: string;
      readonly sex: BirthSex;
      readonly result:
        /** Without the entitlement: the form and the locked card, nothing read. */
        | { readonly kind: "LOCKED" }
        /** Fewer than two names: the form alone. */
        | { readonly kind: "NONE" }
        | { readonly kind: "PROBLEM"; readonly problem: BabyCompareProblem }
        | { readonly kind: "COMPARISON"; readonly model: BabyCompareModel };
    };

/** What the comparison shows, from the session and the query; no rendering, no cookie. */
export async function loadBabyCompare(input: {
  readonly lang: Lang;
  readonly query: Query;
  readonly session: { readonly userId: string } | null;
  readonly deps: BabyNamesDeps;
}): Promise<BabyCompareData> {
  const { lang, session, deps } = input;
  if (session === null) {
    return {
      kind: "signed-out",
      lang,
      signInHref: accountPath(lang, "sign-in", { next: BABY_NAMES_PATHS[lang] }),
    };
  }
  const parsed = parseBabyCompareQuery(input.query);
  const sex = parsed.sex ?? "MALE";
  const base = { kind: "signed-in", lang, a: parsed.a, b: parsed.b, sex } as const;
  // The entitlement first: without it nothing below is read.
  const { full, paid } = await readBabyNamesAccess(deps, session.userId);
  if (!full) return { ...base, result: { kind: "LOCKED" } };
  if (parsed.a === "" || parsed.b === "") return { ...base, result: { kind: "NONE" } };
  const [lookupA, lookupB] = await Promise.all([deps.findName(parsed.a), deps.findName(parsed.b)]);
  if (lookupA.kind !== "FOUND") {
    return {
      ...base,
      result: { kind: "PROBLEM", problem: { reason: lookupA.kind, name: parsed.a } },
    };
  }
  if (lookupB.kind !== "FOUND") {
    return {
      ...base,
      result: { kind: "PROBLEM", problem: { reason: lookupB.kind, name: parsed.b } },
    };
  }
  if (lookupA.given_name.id === lookupB.given_name.id) {
    return { ...base, result: { kind: "PROBLEM", problem: { reason: "SAME" } } };
  }
  const [factsA, stockA, factsB, stockB] = await Promise.all([
    deps.readFacts(lookupA.given_name, true, paid),
    deps.readStock(lookupA.given_name),
    deps.readFacts(lookupB.given_name, true, paid),
    deps.readStock(lookupB.given_name),
  ]);
  for (const [facts, name] of [
    [factsA, lookupA.given_name.display_name],
    [factsB, lookupB.given_name.display_name],
  ] as const) {
    if (facts.state === "RIGHTS_BLOCKED") {
      return { ...base, result: { kind: "PROBLEM", problem: { reason: "RIGHTS_BLOCKED", name } } };
    }
  }
  const figuresA = babyCompareFigures(factsA, sex);
  const figuresB = babyCompareFigures(factsB, sex);
  if (figuresA === null) {
    const problem = { reason: "NOT_ON_LIST", name: lookupA.given_name.display_name } as const;
    return { ...base, result: { kind: "PROBLEM", problem } };
  }
  if (figuresB === null) {
    const problem = { reason: "NOT_ON_LIST", name: lookupB.given_name.display_name } as const;
    return { ...base, result: { kind: "PROBLEM", problem } };
  }
  const model = babyCompareModel({
    lang,
    sex,
    a: { name: lookupA.given_name.display_name, figures: figuresA, stock: stockA },
    b: { name: lookupB.given_name.display_name, figures: figuresB, stock: stockB },
  });
  return { ...base, result: { kind: "COMPARISON", model } };
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

type SignedIn = Extract<BabyCompareData, { kind: "signed-in" }>;

/** The two sexes as tabs: in-page links that keep both names, the current one marked (`aria-current`). */
function SexTabs({ data }: { data: SignedIn }) {
  const t = BABY_NAMES_TEXT[data.lang];
  return (
    <Tabs className="atlas-tabs bn-tabs" aria-label={t.tabsLabel}>
      {BIRTH_SEXES.map((sex) => (
        <a
          key={sex}
          role="tab"
          className="bn-tab"
          href={babyComparePath(data.lang, { a: data.a, b: data.b, sex })}
          aria-selected={sex === data.sex}
          aria-current={sex === data.sex ? "true" : undefined}
          data-sex={sex}
        >
          {t.sex[sex]}
        </a>
      ))}
    </Tabs>
  );
}

/** The form: two names and the sex, a GET; the second field takes focus when only the first is given. */
function CompareForm({ data }: { data: SignedIn }) {
  const t = BABY_NAMES_COMPARE_TEXT[data.lang];
  const page = BABY_NAMES_TEXT[data.lang];
  return (
    <form
      className="compare-form baby-form bnc-form"
      action={BABY_NAMES_COMPARE_PATHS[data.lang]}
      method="get"
    >
      <div className="bnc-field">
        <label htmlFor="bnc-a">{t.firstName}</label>
        <input
          id="bnc-a"
          name={BABY_COMPARE_FIELDS.a}
          type="text"
          defaultValue={data.a.slice(0, 80)}
          placeholder={page.placeholder}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="words"
        />
      </div>
      <div className="bnc-field">
        <label htmlFor="bnc-b">{t.secondName}</label>
        <input
          id="bnc-b"
          name={BABY_COMPARE_FIELDS.b}
          type="text"
          defaultValue={data.b.slice(0, 80)}
          placeholder={t.placeholderSecond}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="words"
          autoFocus={data.a !== "" && data.b === ""}
        />
      </div>
      <input type="hidden" name={BABY_NAMES_SEX_FIELD} value={BABY_NAMES_SEX_PARAM[data.sex]} />
      <button type="submit">{t.submit}</button>
    </form>
  );
}

function Problem({
  problem,
  lang,
  sex,
}: {
  problem: BabyCompareProblem;
  lang: Lang;
  sex: BirthSex;
}) {
  const t = BABY_NAMES_COMPARE_TEXT[lang];
  const line =
    problem.reason === "SAME"
      ? t.same
      : problem.reason === "INVALID"
        ? t.invalid(problem.name)
        : problem.reason === "NOT_FOUND"
          ? t.notFound(problem.name)
          : problem.reason === "HELD"
            ? t.held(problem.name)
            : problem.reason === "RIGHTS_BLOCKED"
              ? t.rightsBlocked(problem.name)
              : t.notOnList(problem.name, sex);
  return (
    <p className="note bnc-problem" data-problem={problem.reason}>
      {line}
    </p>
  );
}

/** A figure cell: the count, or "< N" for a year below the cut-off, or "—". */
function cellText(year: BabyCompareYear): ReactNode {
  return year.kind === "cutoff" ? <span className="baby-below">{year.text}</span> : year.text;
}

/** The two value columns: the latest count, the share, the direction, the years at no. 1, the register. */
function Columns({ model }: { model: BabyCompareModel }) {
  const t = BABY_NAMES_COMPARE_TEXT[model.lang];
  const page = BABY_NAMES_TEXT[model.lang];
  const sides = [model.a, model.b] as const;
  const latest = model.rows[0];
  const directionYears = model.a.direction?.years ?? model.b.direction?.years ?? null;
  const row = (
    label: ReactNode,
    cell: (side: (typeof sides)[number], key: "a" | "b") => ReactNode,
    name: string,
  ) => (
    <div className="bnc-row" data-row={name}>
      <dt className="bnc-label">{label}</dt>
      {sides.map((side, i) => (
        <dd key={side.name} className="bnc-cell" data-side={i === 0 ? "a" : "b"}>
          {cell(side, i === 0 ? "a" : "b")}
        </dd>
      ))}
    </div>
  );
  return (
    <section className="bnc-columns bn-tile" aria-label={t.columnsLabel}>
      <div className="bnc-heads">
        {sides.map((side, i) => (
          <div key={side.name} className="bnc-head" data-side={i === 0 ? "a" : "b"}>
            <h2 className="bnc-name">{side.name}</h2>
            <p className="atlas-eyebrow bn-eyebrow bnc-head-rank" data-figure="head">
              {side.head}
            </p>
          </div>
        ))}
      </div>
      <dl className="bnc-facts">
        {row(
          t.inYear(model.latestYear),
          (side, key) => (
            <strong className="bnc-big" data-figure={`count-${key}`}>
              {latest === undefined ? side.latestCount : cellText(latest[key])}
            </strong>
          ),
          "count",
        )}
        {row(
          t.share,
          (side, key) => (
            <span data-figure={`share-${key}`}>{side.share ?? "—"}</span>
          ),
          "share",
        )}
        {row(
          <>
            {t.direction}
            {directionYears === null ? null : (
              <>
                <br />
                <small className="bnc-sub">{directionYears}</small>
              </>
            )}
          </>,
          (side, key) =>
            side.direction === null ? (
              <span data-figure={`direction-${key}`} data-direction="NONE">
                {t.noDirection}
              </span>
            ) : (
              <>
                <span data-figure={`direction-${key}`}>{side.direction.word}</span>
                {side.direction.shares === null ? null : (
                  <>
                    <br />
                    <small className="bnc-sub" data-figure={`shares-${key}`}>
                      {side.direction.shares}
                    </small>
                  </>
                )}
              </>
            ),
          "direction",
        )}
        {row(
          t.topYears,
          (side, key) => (
            <span data-figure={`top-${key}`}>{side.topYears}</span>
          ),
          "top",
        )}
        {row(
          t.bears,
          (side, key) =>
            side.register === "blocked" ? (
              <span className="bnc-muted">{page.rightsBlocked}</span>
            ) : side.register === null ? (
              <span className="bnc-muted" data-figure={`register-${key}`} data-register="none">
                {page.registerNone}
              </span>
            ) : (
              <>
                <span data-figure={`register-${key}`}>{side.register.count}</span>
                <br />
                <small className="bnc-sub">
                  {side.register.rank === null
                    ? page.registerAsOf(side.register.asOf)
                    : side.register.rank}
                </small>
              </>
            ),
          "register",
        )}
      </dl>
      <p className="note bnc-register-note">{t.registerNote}</p>
    </section>
  );
}

const CHART = { width: 640, height: 200, bottom: 26, top: 8 } as const;

/**
 * Two bars a year for 2000, 2005, …, the latest: heights from the counts
 * against the greater of the two names' peaks in those years; a year the name
 * is below the cut-off is a tick, a year with no list a gap, never a zero
 * bar. The two series in the Brand System's chart colours; no amber, since
 * no peak is marked. Inline SVG from the model, no library.
 */
function CompareChart({ model }: { model: BabyCompareModel }) {
  const t = BABY_NAMES_COMPARE_TEXT[model.lang];
  const byYear = new Map(model.rows.map((r) => [r.year, r]));
  const years = model.years;
  const first = years[0];
  if (first === undefined) return null;
  const entries = years.map((year) => byYear.get(year));
  const max = Math.max(
    1,
    ...entries.flatMap((r) => (r === undefined ? [] : [r.a.count ?? 0, r.b.count ?? 0])),
  );
  const slot = CHART.width / years.length;
  const barWidth = Math.max(2, slot * 0.26);
  const gap = Math.max(2, slot * 0.06);
  const plotHeight = CHART.height - CHART.bottom - CHART.top;
  const baseline = CHART.top + plotHeight;
  const x = (i: number, side: "a" | "b") =>
    i * slot + slot / 2 - gap / 2 - barWidth + (side === "b" ? barWidth + gap : 0);
  const bar = (year: BabyCompareYear | undefined, i: number, side: "a" | "b") => {
    if (year === undefined || year.kind === "none") return null;
    if (year.kind === "cutoff") {
      return (
        <line
          key={`${side}-${year.year}`}
          className="bn-chart-cutoff"
          data-year={year.year}
          data-side={side}
          data-bar="cutoff"
          x1={x(i, side)}
          x2={x(i, side) + barWidth}
          y1={baseline + 5}
          y2={baseline + 5}
        >
          <title>{`${year.year}: ${t.cutoffTick}`}</title>
        </line>
      );
    }
    const height = Math.max(1, ((year.count ?? 0) / max) * plotHeight);
    return (
      <rect
        key={`${side}-${year.year}`}
        className={`bnc-bar bnc-bar-${side}`}
        data-year={year.year}
        data-side={side}
        data-bar="count"
        x={x(i, side)}
        y={baseline - height}
        width={barWidth}
        height={height}
      >
        <title>{`${year.year}: ${year.text}`}</title>
      </rect>
    );
  };
  return (
    <svg
      className="bn-chart bnc-chart"
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      role="img"
      aria-label={t.chartLabel(model.a.name, model.b.name, model.sex, first, model.latestYear)}
      data-bars={entries.reduce(
        (n, r) => n + (r?.a.kind === "count" ? 1 : 0) + (r?.b.kind === "count" ? 1 : 0),
        0,
      )}
    >
      <line className="bn-chart-axis" x1={0} x2={CHART.width} y1={baseline} y2={baseline} />
      {entries.map((r, i) => bar(r?.a, i, "a"))}
      {entries.map((r, i) => bar(r?.b, i, "b"))}
      {years.map((year, i) => (
        <text
          key={`label-${year}`}
          className="bn-chart-label"
          x={i * slot + slot / 2}
          y={CHART.height - 6}
          textAnchor="middle"
        >
          {year}
        </text>
      ))}
    </svg>
  );
}

/** The chart's figures and the ladder share one shape: a row a name, a column a year. */
function YearGrid({
  model,
  caption,
  cell,
  className,
}: {
  model: BabyCompareModel;
  caption: string;
  cell: (year: BabyCompareYear | undefined) => ReactNode;
  className: string;
}) {
  const byYear = new Map(model.rows.map((r) => [r.year, r]));
  return (
    <table className={`bnc-grid ${className}`}>
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <td />
          {model.years.map((year) => (
            <th
              key={year}
              scope="col"
              data-year={year}
              aria-current={year === model.latestYear ? "true" : undefined}
            >
              {year}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(["a", "b"] as const).map((side) => (
          <tr key={side} data-side={side}>
            <th scope="row" className={`bnc-series bnc-series-${side}`}>
              {model[side].name}
            </th>
            {model.years.map((year) => (
              <td key={year} data-year={year} data-side={side}>
                {cell(byYear.get(year)?.[side])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartTile({ model }: { model: BabyCompareModel }) {
  const t = BABY_NAMES_COMPARE_TEXT[model.lang];
  const citations: CitationDto[] = [];
  const seen = new Set<string>();
  for (const year of model.years) {
    for (const c of model.rows.find((r) => r.year === year)?.citations ?? []) {
      const key = `${c.title}|${c.locator ?? c.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push(c);
      }
    }
  }
  return (
    <section className="bn-tile bnc-chart-tile" aria-label={t.chartHeading(model.sex)}>
      <h3 className="bn-tile-heading bnc-heading">{t.chartHeading(model.sex)}</h3>
      <p className="bnc-legend" aria-hidden="true">
        <span className="bnc-legend-a">{model.a.name}</span>
        <span className="bnc-legend-b">{model.b.name}</span>
      </p>
      <CompareChart model={model} />
      <YearGrid
        model={model}
        caption={t.figuresLabel}
        className="bnc-figures"
        cell={(year) => (year === undefined ? "—" : cellText(year))}
      />
      <p className="bnc-note">
        {t.chartNote(model.sex, formatInteger(model.rows.length, model.lang))}
      </p>
      {citations.length === 0 ? null : <Source citations={citations} lang={model.lang} />}
    </section>
  );
}

/** The rank in 2000, 2005, …, the latest, for both names; "—" without a rank claim. */
function LadderTile({ model }: { model: BabyCompareModel }) {
  const t = BABY_NAMES_COMPARE_TEXT[model.lang];
  return (
    <section className="bn-tile bnc-ladder-tile" aria-label={t.ladderHeading}>
      <h3 className="bn-tile-heading bnc-heading">{t.ladderHeading}</h3>
      <YearGrid
        model={model}
        caption={t.ladderLabel(model.a.name, model.b.name)}
        className="bnc-ladder"
        cell={(year) =>
          year === undefined || year.rank === null ? (
            <span className="bnc-rank" data-rank="none">
              —
            </span>
          ) : (
            <span className="bnc-rank" data-rank={year.rank}>
              {year.rank}.
            </span>
          )
        }
      />
    </section>
  );
}

/** The year table for both names, newest first: six rows open, the rest behind `<details>`; the sources numbered once. */
function YearTable({ model }: { model: BabyCompareModel }) {
  const t = BABY_NAMES_COMPARE_TEXT[model.lang];
  const sources: CitationDto[] = [];
  const indexOf = (c: CitationDto): number => {
    const found = sources.findIndex((s) => s.locator === c.locator && s.title === c.title);
    if (found !== -1) return found + 1;
    sources.push(c);
    return sources.length;
  };
  const caption = `${t.tableHeading}: ${model.a.name} · ${model.b.name}`;
  const head = (
    <thead>
      <tr>
        <th scope="col" rowSpan={2}>
          {t.yearColumn}
        </th>
        <th scope="col" colSpan={2} className="bnc-series-a">
          {model.a.name}
        </th>
        <th scope="col" colSpan={2} className="bnc-series-b">
          {model.b.name}
        </th>
        <th scope="col" rowSpan={2}>
          {t.sourceLine}
        </th>
      </tr>
      <tr>
        <th scope="col">{t.childrenColumn}</th>
        <th scope="col">{t.placeColumn}</th>
        <th scope="col">{t.childrenColumn}</th>
        <th scope="col">{t.placeColumn}</th>
      </tr>
    </thead>
  );
  const cells = (year: BabyCompareYear) =>
    year.kind === "none" ? (
      <td colSpan={2} className="bnc-muted">
        {t.noYearList}
      </td>
    ) : year.kind === "cutoff" ? (
      <td colSpan={2} className="baby-below">
        {year.text}
      </td>
    ) : (
      <>
        <td>{year.text}</td>
        <td>{year.rank === null ? "—" : year.rank}</td>
      </>
    );
  // Built in order, so the folded rows' sources are numbered after the open ones.
  const rows = model.rows.map((row) => {
    const refs = row.citations.map(indexOf);
    return (
      <tr key={row.year} data-year={row.year}>
        <th scope="row">{row.year}</th>
        {cells(row.a)}
        {cells(row.b)}
        <td className="baby-ref">{refs.length === 0 ? "" : `[${refs.join(", ")}]`}</td>
      </tr>
    );
  });
  const open = rows.slice(0, YEARS_SHOWN);
  const folded = rows.slice(YEARS_SHOWN);
  return (
    <section className="baby-history bn-history bnc-history" aria-label={caption}>
      <h3 className="bn-tile-heading bnc-heading">{t.tableHeading}</h3>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
        <table className="bn-table bnc-table">
          <caption className="visually-hidden">{caption}</caption>
          {head}
          <tbody>{open}</tbody>
        </table>
      </div>
      {folded.length === 0 ? null : (
        <details className="atlas-accordion bn-details">
          <summary>{t.allYears(formatInteger(model.rows.length, model.lang))}</summary>
          <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
            <table className="bn-table bnc-table">
              {head}
              <tbody>{folded}</tbody>
            </table>
          </div>
        </details>
      )}
      <ul className="baby-sources note bn-sources">
        {sources.map((c, i) => (
          <li key={`${c.locator ?? ""}-${i}`}>
            [{i + 1}] <Source citations={[c]} lang={model.lang} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Comparison({ data, model }: { data: SignedIn; model: BabyCompareModel }) {
  const t = BABY_NAMES_COMPARE_TEXT[data.lang];
  return (
    <div className="bnc-result" data-compare={`${model.a.name}|${model.b.name}`}>
      <Columns model={model} />
      <ChartTile model={model} />
      <LadderTile model={model} />
      <YearTable model={model} />
      <p className="bnc-swap">
        {/* Only `a` and `sex`: the form comes back with the second field empty and focused. */}
        <a
          className="bnc-swap-link"
          href={babyComparePath(data.lang, { a: model.a.name, sex: data.sex }, "bnc-b")}
          data-swap=""
        >
          {t.swapSecond}
        </a>
      </p>
    </div>
  );
}

export function BabyCompareView({ data }: { data: BabyCompareData }) {
  const { lang } = data;
  const t = BABY_NAMES_COMPARE_TEXT[lang];
  const page = BABY_NAMES_TEXT[lang];
  const other: Lang = lang === "pl" ? "en" : "pl";
  const back =
    data.kind === "signed-in" && data.a !== ""
      ? { href: babyPagePath(lang, data.a, data.sex), label: t.back(data.a.slice(0, 40)) }
      : { href: BABY_NAMES_PATHS[lang], label: t.backToPage };
  return (
    <SiteShell
      lang={lang}
      otherPath={BABY_NAMES_COMPARE_PATHS[other]}
      world={{ mode: "quiet" }}
      current="babyNames"
      mainClassName="baby-names atlas-v1 bn-compare-page"
    >
      <nav className="bnc-top" aria-label={t.title}>
        <a className="bns-back bnc-back" href={back.href}>
          <span aria-hidden="true">‹ </span>
          {back.label}
        </a>
        <p className="atlas-eyebrow bnc-eyebrow">
          {t.eyebrow(data.kind === "signed-in" ? data.sex : "MALE")}
        </p>
      </nav>
      <h1 className="bns-title bnc-title">{t.title}</h1>
      {data.kind === "signed-out" ? (
        <>
          <p>{t.signedOut}</p>
          <p>
            <a className="baby-sign-in" href={data.signInHref}>
              {page.signIn}
            </a>
          </p>
        </>
      ) : (
        <>
          <SexTabs data={data} />
          <CompareForm data={data} />
          <div className="baby-result bnc-body" aria-live="polite">
            {data.result.kind === "LOCKED" ? <BabyLocked lang={lang} /> : null}
            {data.result.kind === "PROBLEM" ? (
              <Problem problem={data.result.problem} lang={lang} sex={data.sex} />
            ) : null}
            {data.result.kind === "COMPARISON" ? (
              <Comparison data={data} model={data.result.model} />
            ) : null}
          </div>
          <p className="bns-footer bnc-footer">{t.footer}</p>
        </>
      )}
    </SiteShell>
  );
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

export function babyCompareMetadata(lang: Lang): Metadata {
  return babyNamesEnabled() ? BABY_COMPARE_METADATA[lang] : {};
}

/** The route's page: a 404 when off; reads the session cookie, loads, renders. */
export async function BabyCompareRoute({
  lang,
  searchParams,
}: {
  readonly lang: Lang;
  readonly searchParams: Promise<Query>;
}) {
  if (!babyNamesEnabled()) notFound();
  const accounts = accountsRuntime();
  if (accounts === null) notFound();
  const query = await searchParams;
  const session = await readBabyNamesSession(accounts);
  const data = await loadBabyCompare({
    lang,
    query,
    session,
    deps: runningBabyNamesDeps(accounts.pool),
  });
  return <BabyCompareView data={data} />;
}
