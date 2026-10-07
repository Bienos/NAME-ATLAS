import type { CitationDto } from "@name-atlas/contracts";
import { stockListOfSex } from "@name-atlas/truth";
import type {
  BirthNameFacts,
  BirthSex,
  BirthSexFigures,
  BirthYearFigures,
  GivenNameFacts,
} from "@name-atlas/truth";
import { BABY_NAMES_COMPARE_PATHS } from "./baby-names-config.js";
import { BABY_NAMES_COMPARE_TEXT } from "./baby-names-compare-text.js";
import {
  BABY_NAMES_SEX_FIELD,
  BABY_NAMES_SEX_PARAM,
  BABY_NAMES_SEX_VALUES,
  ladderYears,
} from "./baby-names-page.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import { formatDate, formatInteger, formatPercent } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * What the comparison says (TASK-156, D-044): two first names of one sex,
 * each from its own page facts, formatted and set side by side. Pure: no
 * database, no rendering. `baby-names-compare-page.tsx` decides only how it
 * looks.
 *
 * Every figure is a claim's or a list's stored figure through
 * `packages/truth` (`readBirthNameFacts` on the PAID surface with the
 * history, `readGivenNameFacts` with `stockListOfSex`); nothing is computed
 * here but formatting. One sex at a time: nothing is summed across the two
 * names or across the sexes. An absence is never 0: a year the name is below
 * the list's cut-off reads "< N", a year with no stored list "—", a missing
 * rank "—", a name not on the register one plain line.
 */

/** The comparison's query: `?a=<name>&b=<name>&sex=boys|girls`, the surname comparison's `a`/`b`. */
export const BABY_COMPARE_FIELDS = { a: "a", b: "b" } as const;

type Query = Readonly<Record<string, string | string[] | undefined>>;

function first(query: Query, key: string): string {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** The two names as typed (trimmed; "" when absent) and the sex, null when the query does not say. */
export function parseBabyCompareQuery(query: Query): {
  readonly a: string;
  readonly b: string;
  readonly sex: BirthSex | null;
} {
  return {
    a: first(query, BABY_COMPARE_FIELDS.a).trim(),
    b: first(query, BABY_COMPARE_FIELDS.b).trim(),
    sex: BABY_NAMES_SEX_VALUES[first(query, BABY_NAMES_SEX_FIELD)] ?? null,
  };
}

/**
 * The comparison's address. An empty or omitted name is left out, so the
 * "Zamień drugie imię" link carries `a` and `sex` alone and lands on the form
 * with the second field empty.
 */
export function babyComparePath(
  lang: Lang,
  parts: { readonly a?: string; readonly b?: string; readonly sex: BirthSex },
  fragment?: string,
): string {
  const query = new URLSearchParams();
  if (parts.a !== undefined && parts.a !== "") query.set(BABY_COMPARE_FIELDS.a, parts.a);
  if (parts.b !== undefined && parts.b !== "") query.set(BABY_COMPARE_FIELDS.b, parts.b);
  query.set(BABY_NAMES_SEX_FIELD, BABY_NAMES_SEX_PARAM[parts.sex]);
  return `${BABY_NAMES_COMPARE_PATHS[lang]}?${query.toString()}${fragment === undefined ? "" : `#${fragment}`}`;
}

/** One sex's figures with the history the comparison needs. */
export type BabyCompareFigures = BirthSexFigures & {
  readonly latest: BirthYearFigures;
  readonly history: readonly BirthYearFigures[];
};

/**
 * The sex's figures a comparison can use: the facts READY, this sex's latest
 * list stored, the history read, and a count on at least one of its lists.
 * Null otherwise: the name is on no list of this sex, and is not compared.
 */
export function babyCompareFigures(
  facts: BirthNameFacts,
  sex: BirthSex,
): BabyCompareFigures | null {
  if (facts.state !== "READY") return null;
  const figures = facts.sexes.find((s) => s.sex === sex);
  if (figures === undefined || figures.latest === null || figures.history === null) return null;
  if (!figures.history.some((y) => y.count !== null)) return null;
  return { ...figures, latest: figures.latest, history: figures.history };
}

/** One name in one year, as the chart, the ladder and the table show it. */
export interface BabyCompareYear {
  readonly year: number;
  /** A count claim; a stored list the name is below ("< N"); no stored list ("—"). */
  readonly kind: "count" | "cutoff" | "none";
  /** The count, for the bar's height; null unless a count claim. */
  readonly count: number | null;
  /** "4 415", "< 5" or "—". */
  readonly text: string;
  /** "44", or null for "—": no rank claim. */
  readonly rank: string | null;
}

export interface BabyCompareRow {
  readonly year: number;
  readonly a: BabyCompareYear;
  readonly b: BabyCompareYear;
  /** The count claims' citations for this year, each source once. */
  readonly citations: readonly CitationDto[];
}

export interface BabyCompareSide {
  readonly name: string;
  /** "2025 · 1. z 939", or "2025 · poniżej progu". */
  readonly head: string;
  /** "4 415", or "< 2" when below the latest list's cut-off. */
  readonly latestCount: string;
  /** "3,7%"; null without a share. */
  readonly share: string | null;
  /** The direction word, its two years and the two shares it was decided on; null without a trend claim. */
  readonly direction: {
    readonly word: string;
    readonly years: string;
    readonly shares: string | null;
  } | null;
  /** "2022, 2023, 2025", or the "in no year" line. */
  readonly topYears: string;
  /** The register's list of this sex; "blocked" when the rights refuse it; null when the name is on no list. */
  readonly register:
    | { readonly count: string; readonly rank: string | null; readonly asOf: string }
    | "blocked"
    | null;
}

export interface BabyCompareModel {
  readonly lang: Lang;
  readonly sex: BirthSex;
  readonly latestYear: number;
  readonly a: BabyCompareSide;
  readonly b: BabyCompareSide;
  /** 2000, 2005, …, the latest year: the chart's and the ladder's years. */
  readonly years: readonly number[];
  /** Every year of the history, newest first. */
  readonly rows: readonly BabyCompareRow[];
}

/** A share in parts per million as "3,7%": display rounding only. */
function formatShare(perMillion: number, lang: Lang): string {
  return formatPercent(perMillion / 1_000_000, lang);
}

function yearOf(figures: BirthYearFigures | undefined, lang: Lang): BabyCompareYear {
  const t = BABY_NAMES_COMPARE_TEXT[lang];
  const year = figures?.birth_year ?? 0;
  if (figures === undefined || figures.list === null) {
    return { year, kind: "none", count: null, text: "—", rank: null };
  }
  if (figures.count === null) {
    return {
      year,
      kind: "cutoff",
      count: null,
      text: t.below(formatInteger(figures.list.publication_threshold, lang)),
      rank: null,
    };
  }
  return {
    year,
    kind: "count",
    count: figures.count.count,
    text: formatInteger(figures.count.count, lang),
    rank: figures.rank === null ? null : formatInteger(figures.rank.rank, lang),
  };
}

/** Each source record once. */
function distinct(citations: readonly CitationDto[]): CitationDto[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = `${c.title}|${c.locator ?? c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sideOf(
  name: string,
  figures: BabyCompareFigures,
  stock: GivenNameFacts,
  sex: BirthSex,
  lang: Lang,
): BabyCompareSide {
  const t = BABY_NAMES_COMPARE_TEXT[lang];
  const page = BABY_NAMES_TEXT[lang];
  const latest = figures.latest;
  const rankOf = (rank: { rank: number; universe_size: number }) =>
    t.rankOf(formatInteger(rank.rank, lang), formatInteger(rank.universe_size, lang));
  const head =
    latest.count === null
      ? t.headBelow(latest.birth_year)
      : t.headRank(latest.birth_year, latest.rank === null ? "—" : rankOf(latest.rank));
  const latestCount =
    latest.count === null
      ? latest.list === null
        ? "—"
        : t.below(formatInteger(latest.list.publication_threshold, lang))
      : formatInteger(latest.count.count, lang);
  const share =
    latest.count === null || latest.count.share_per_million === null
      ? null
      : formatShare(latest.count.share_per_million, lang);
  const trend = figures.trend;
  const direction =
    trend === null
      ? null
      : {
          word: page.directions[trend.direction],
          years: t.directionYears(trend.earlier_year, trend.latest_year),
          shares:
            trend.latest_share_per_million === null
              ? null
              : t.sharesArrow(
                  trend.earlier_share_per_million === null
                    ? page.belowThreshold
                    : formatShare(trend.earlier_share_per_million, lang),
                  formatShare(trend.latest_share_per_million, lang),
                ),
        };
  const top = figures.history.filter((y) => y.rank?.rank === 1).map((y) => y.birth_year);
  const list = stock.state === "READY" ? stockListOfSex(stock.lists, sex) : null;
  const register =
    stock.state === "RIGHTS_BLOCKED"
      ? "blocked"
      : list === null
        ? null
        : {
            count: t.registerCount(formatInteger(list.count.count, lang), sex),
            rank: list.rank === null ? null : rankOf(list.rank),
            asOf: formatDate(list.snapshot_date, lang),
          };
  return {
    name,
    head,
    latestCount,
    share,
    direction,
    topYears: top.length === 0 ? t.noTopYears : top.join(", "),
    register,
  };
}

/**
 * The comparison from each name's figures on one sex's lists. Both histories
 * come from the same stored lists, so the years match; a year one side lacks
 * reads "—" for that side.
 */
export function babyCompareModel(input: {
  readonly lang: Lang;
  readonly sex: BirthSex;
  readonly a: {
    readonly name: string;
    readonly figures: BabyCompareFigures;
    readonly stock: GivenNameFacts;
  };
  readonly b: {
    readonly name: string;
    readonly figures: BabyCompareFigures;
    readonly stock: GivenNameFacts;
  };
}): BabyCompareModel {
  const { lang, sex } = input;
  const byYearA = new Map(input.a.figures.history.map((y) => [y.birth_year, y]));
  const byYearB = new Map(input.b.figures.history.map((y) => [y.birth_year, y]));
  const allYears = [...new Set([...byYearA.keys(), ...byYearB.keys()])].sort((x, y) => x - y);
  const rows: BabyCompareRow[] = allYears
    .map((year) => {
      const fa = byYearA.get(year);
      const fb = byYearB.get(year);
      return {
        year,
        a: { ...yearOf(fa, lang), year },
        b: { ...yearOf(fb, lang), year },
        citations: distinct(
          [fa?.count?.citation ?? null, fb?.count?.citation ?? null].filter(
            (c): c is CitationDto => c !== null,
          ),
        ),
      };
    })
    .reverse();
  const latestYear = Math.max(input.a.figures.latest.birth_year, input.b.figures.latest.birth_year);
  const longer =
    input.a.figures.history.length >= input.b.figures.history.length
      ? input.a.figures.history
      : input.b.figures.history;
  return {
    lang,
    sex,
    latestYear,
    a: sideOf(input.a.name, input.a.figures, input.a.stock, sex, lang),
    b: sideOf(input.b.name, input.b.figures, input.b.stock, sex, lang),
    years: ladderYears(longer),
    rows,
  };
}
