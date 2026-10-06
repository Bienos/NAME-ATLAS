import { BIRTH_HISTORY_FIRST_YEAR, stockListOfSex } from "@name-atlas/truth";
import type {
  BirthCountFigure,
  BirthNameFacts,
  BirthSex,
  BirthSexFigures,
  BirthYearFigures,
  GivenNameFacts,
} from "@name-atlas/truth";
import { BABY_NAMES_FIELD, BABY_NAMES_PATHS, BABY_NAMES_SHARE_PATHS } from "./baby-names-config.js";
import {
  BABY_NAMES_SEX_FIELD,
  BABY_NAMES_SEX_PARAM,
  BABY_NAMES_SEX_VALUES,
  DOT_GRID_MAX,
  ladderYears,
  peakOf,
} from "./baby-names-page.js";
import { BABY_NAMES_SHARE_TEXT } from "./baby-names-share-text.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import { formatDate, formatDecimal, formatInteger, formatPercent } from "./messages.js";
import type { Lang } from "./messages.js";
import { fileStem } from "./share-actions.js";

/**
 * What a baby-names share card says (TASK-152): the page's facts for one sex,
 * formatted, and nothing else. `baby-names-share-card.tsx` decides only how a
 * card looks.
 *
 * Every figure is a claim's or a list's stored figure through
 * `packages/truth` (`readBirthNameFacts`, `readGivenNameFacts`); nothing is
 * computed here but formatting and the chart's geometry. Boys and girls are
 * never summed. A figure that is absent is left out, never written as 0: a
 * name below a list's cut-off has no count, no rank and no card for that sex.
 *
 * The free cards carry only what the free view shows (the latest year's
 * count, rank and "1 na N", the direction with its two shares, the register's
 * count). The paid card carries the year-by-year view's figures and is drawn
 * only for an entitled account (`baby-names-share-route.ts`).
 */

export const BABY_CARDS = ["story", "square", "paid"] as const;
export type BabyCardKey = (typeof BABY_CARDS)[number];

export function isBabyCard(value: string): value is BabyCardKey {
  return (BABY_CARDS as readonly string[]).includes(value);
}

export const BABY_CARD_SIZES: Readonly<
  Record<BabyCardKey, { readonly width: number; readonly height: number }>
> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  paid: { width: 1080, height: 1920 },
};

/** The card routes' segment under the page: `/pl/imiona-dla-dziecka/karta/{card}`, `/en/baby-names/card/{card}`. */
export const BABY_CARD_SEGMENT = { pl: "karta", en: "card" } as const;

/** The sheet's choice, as its query carries it: `?card=basic|paid&format=story|square`. */
export const BABY_SHARE_CARD_FIELD = "card";
export const BABY_SHARE_FORMAT_FIELD = "format";
export type BabyShareChoice = "basic" | "paid";
export type BabyShareFormat = "story" | "square";

/** The query that names one sex's result, as the page reads it: `?imie=ZOFIA&sex=girls`. */
export function babyNameQuery(lang: Lang, name: string, sex: BirthSex): URLSearchParams {
  return new URLSearchParams({
    [BABY_NAMES_FIELD[lang]]: name,
    [BABY_NAMES_SEX_FIELD]: BABY_NAMES_SEX_PARAM[sex],
  });
}

/** The page's address for this name and sex: what "Kopiuj link" copies. */
export function babyPagePath(lang: Lang, name: string, sex: BirthSex): string {
  return `${BABY_NAMES_PATHS[lang]}?${babyNameQuery(lang, name, sex).toString()}#sex-${BABY_NAMES_SEX_PARAM[sex]}`;
}

/** One card's image address. */
export function babyCardPath(lang: Lang, card: BabyCardKey, name: string, sex: BirthSex): string {
  return `${BABY_NAMES_PATHS[lang]}/${BABY_CARD_SEGMENT[lang]}/${card}?${babyNameQuery(lang, name, sex).toString()}`;
}

/** The share sheet's address, with a choice when one is made. */
export function babySharePath(
  lang: Lang,
  name: string,
  sex: BirthSex,
  choice: { readonly card?: BabyShareChoice; readonly format?: BabyShareFormat } = {},
): string {
  const query = babyNameQuery(lang, name, sex);
  if (choice.card !== undefined) query.set(BABY_SHARE_CARD_FIELD, choice.card);
  if (choice.format !== undefined) query.set(BABY_SHARE_FORMAT_FIELD, choice.format);
  return `${BABY_NAMES_SHARE_PATHS[lang]}?${query.toString()}`;
}

/** Which card the sheet's choice names: the paid card is story-only. */
export function babyCardOf(choice: BabyShareChoice, format: BabyShareFormat): BabyCardKey {
  return choice === "paid" ? "paid" : format;
}

/** The saved file's name, in letters every browser keeps: `zofia-girls-story.png`. */
export function babyCardFileName(name: string, sex: BirthSex, card: BabyCardKey): string {
  return `${fileStem(name)}-${BABY_NAMES_SEX_PARAM[sex]}-${card}.png`;
}

type Query = Readonly<Record<string, string | string[] | undefined>>;

function first(query: Query, key: string): string {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** The name and sex a card or sheet request names; the sex null when the query does not say. */
export function parseBabyShareQuery(
  lang: Lang,
  query: Query,
): {
  readonly typed: string;
  readonly sex: BirthSex | null;
  readonly card: BabyShareChoice;
  readonly format: BabyShareFormat;
} {
  const card = first(query, BABY_SHARE_CARD_FIELD);
  const format = first(query, BABY_SHARE_FORMAT_FIELD);
  return {
    typed: first(query, BABY_NAMES_FIELD[lang]).trim(),
    sex: BABY_NAMES_SEX_VALUES[first(query, BABY_NAMES_SEX_FIELD)] ?? null,
    card: card === "paid" ? "paid" : "basic",
    format: format === "square" ? "square" : "story",
  };
}

// ---------------------------------------------------------------------------
// The free cards
// ---------------------------------------------------------------------------

export interface BabyFreeCardFacts {
  readonly card: "free";
  readonly lang: Lang;
  readonly name: string;
  readonly sex: BirthSex;
  readonly year: number;
  readonly brand: string;
  readonly sectionEyebrow: string;
  /** "IMIĘ DLA DZIEWCZYNKI · ROK 2025" (story); "DZIEWCZYNKA · 2025" (square). */
  readonly eyebrow: string;
  readonly squareEyebrow: string;
  /** The count as the one big number. */
  readonly count: string;
  readonly countLine: string;
  readonly squareCountLines: readonly [string, string];
  readonly rank: { readonly figure: string; readonly of: string; readonly ofShort: string } | null;
  readonly oneIn: {
    readonly figure: string;
    readonly noun: string;
    /** The dots to draw, the first lit; null above `DOT_GRID_MAX`. */
    readonly dots: number | null;
    readonly caption: string;
  } | null;
  readonly direction: {
    readonly word: string;
    /** "4,0% → 3,7% · 2020→2025", or "poniżej progu → 3,7% · 2020→2025". */
    readonly shares: string | null;
    readonly years: string;
  } | null;
  /** "Dziś 360 466 kobiet w Polsce ma to imię", and "14. miejsce z 28 781" when the register ranks it. */
  readonly register: { readonly line: string; readonly rank: string | null } | null;
  readonly source: string;
  readonly sourceSquare: string;
  readonly privacy: string;
  readonly host: string;
}

/**
 * A share in parts per million as "3,7%", display rounding only. A share that
 * would round to 0,0% at one decimal (MYROSLAVA's 275 per million) takes two
 * or three, so a card never reads 0 where the claim carries a figure.
 */
export function formatShare(perMillion: number, lang: Lang): string {
  for (const digits of [1, 2, 3]) {
    const text = formatPercent(perMillion / 1_000_000, lang, digits);
    if (/[1-9]/u.test(text) || perMillion === 0) return text;
  }
  return formatPercent(perMillion / 1_000_000, lang, 3);
}

function figuresOf(facts: BirthNameFacts, sex: BirthSex): BirthSexFigures | null {
  if (facts.state !== "READY") return null;
  return facts.sexes.find((s) => s.sex === sex) ?? null;
}

function registerOf(
  stock: GivenNameFacts,
  sex: BirthSex,
  lang: Lang,
): { readonly line: BabyFreeCardFacts["register"]; readonly date: string | null } {
  const t = BABY_NAMES_SHARE_TEXT[lang];
  const list = stock.state === "READY" ? stockListOfSex(stock.lists, sex) : null;
  if (list === null) return { line: null, date: null };
  return {
    line: {
      line: t.registerLine(formatInteger(list.count.count, lang), sex),
      rank:
        list.rank === null
          ? null
          : t.registerRank(
              formatInteger(list.rank.rank, lang),
              formatInteger(list.rank.universe_size, lang),
            ),
    },
    date: formatDate(list.snapshot_date, lang),
  };
}

/** The free card's facts for one sex, or null when the name has no count on that sex's latest list. */
export function babyFreeCardFacts(input: {
  readonly facts: BirthNameFacts;
  readonly stock: GivenNameFacts;
  readonly sex: BirthSex;
  readonly lang: Lang;
  readonly host: string | null;
}): BabyFreeCardFacts | null {
  const { sex, lang } = input;
  const t = BABY_NAMES_SHARE_TEXT[lang];
  const page = BABY_NAMES_TEXT[lang];
  const figures = figuresOf(input.facts, sex);
  const latest = figures?.latest ?? null;
  if (figures === null || latest === null || latest.count === null) return null;
  const name = input.facts.given_name.display_name;
  const year = latest.birth_year;
  const count = latest.count;
  const trend = figures.trend;
  const register = registerOf(input.stock, sex, lang);
  const oneInFigure = count.one_in === null ? null : formatInteger(count.one_in, lang);
  return {
    card: "free",
    lang,
    name,
    sex,
    year,
    brand: t.brand,
    sectionEyebrow: t.sectionEyebrow,
    eyebrow: t.nameEyebrow(sex, year),
    squareEyebrow: t.squareEyebrow(sex, year),
    count: formatInteger(count.count, lang),
    countLine: t.countLine(sex, year),
    squareCountLines: t.squareCountLines(sex, year),
    rank:
      latest.rank === null
        ? null
        : {
            figure: t.rankFigure(formatInteger(latest.rank.rank, lang)),
            of: t.rankOf(formatInteger(latest.rank.universe_size, lang)),
            ofShort: t.rankOfShort(formatInteger(latest.rank.universe_size, lang)),
          },
    oneIn:
      count.one_in === null || oneInFigure === null
        ? null
        : {
            figure: t.oneIn(oneInFigure),
            noun: t.oneInNoun[sex],
            dots: count.one_in <= DOT_GRID_MAX ? count.one_in : null,
            caption: page.oneInCaption(oneInFigure, sex, year, name),
          },
    direction:
      trend === null
        ? null
        : {
            word: t.directions[trend.direction],
            shares:
              trend.latest_share_per_million === null
                ? null
                : t.sharesLine(
                    trend.earlier_share_per_million === null
                      ? t.belowThreshold
                      : formatShare(trend.earlier_share_per_million, lang),
                    formatShare(trend.latest_share_per_million, lang),
                    trend.earlier_year,
                    trend.latest_year,
                  ),
            years: t.yearsLine(trend.earlier_year, trend.latest_year),
          },
    register: register.line,
    source: t.sourceLine(t.listWord(year), register.date),
    sourceSquare: t.sourceLine(t.listWord(year), null),
    privacy: t.privacyLine,
    host: input.host ?? t.hostFallback,
  };
}

// ---------------------------------------------------------------------------
// The paid card
// ---------------------------------------------------------------------------

export type BabyBarRole = "first" | "peak" | "latest" | "year";

export interface BabyChartBar {
  readonly year: number;
  /**
   * `bar`: a count, its height as a share of the greatest (0 < height ≤ 1).
   * `cutoff`: a stored list the name is not on, drawn as a tick, never a zero
   * bar. `gap`: no list stored for the year.
   */
  readonly kind: "bar" | "cutoff" | "gap";
  readonly height: number;
  readonly role: BabyBarRole;
}

export interface BabyPaidCardFacts {
  readonly card: "paid";
  readonly lang: Lang;
  readonly name: string;
  readonly sex: BirthSex;
  readonly brand: string;
  /** "ROK PO ROKU · 2000–2025" */
  readonly eyebrow: string;
  /** "IMIĘ DLA DZIEWCZYNKI" */
  readonly nameEyebrow: string;
  /** "×4,8" · "częściej niż w 2000 r.", only when both counts exist. */
  readonly times: { readonly figure: string; readonly wording: string } | null;
  readonly bars: readonly BabyChartBar[];
  /** The first year with a count, the peak, the latest: figure and "2017 · najwięcej · 3. miejsce". */
  readonly callouts: readonly {
    readonly figure: string;
    readonly line: string;
    readonly peak: boolean;
  }[];
  readonly ladderHeading: string;
  /** 2000, 2005, …, the latest; the rank "44." or "—" without a rank claim. */
  readonly ladder: readonly {
    readonly year: number;
    readonly rank: string | null;
    readonly latest: boolean;
  }[];
  /** "Numer 1 w 2022, 2023 i 2025 r.", or null when never. */
  readonly topYears: string | null;
  /** "Dziś 360 466 kobiet w Polsce ma to imię." */
  readonly register: string | null;
  readonly source: string;
  readonly privacy: string;
  readonly host: string;
}

interface CountedYear {
  readonly year: BirthYearFigures;
  readonly count: BirthCountFigure;
}

function counted(history: readonly BirthYearFigures[]): CountedYear[] {
  return history.flatMap((year) => (year.count === null ? [] : [{ year, count: year.count }]));
}

/** The paid card's facts for one sex, or null when the name is on no list of that sex since 2000. */
export function babyPaidCardFacts(input: {
  readonly facts: BirthNameFacts;
  readonly stock: GivenNameFacts;
  readonly sex: BirthSex;
  readonly lang: Lang;
  readonly host: string | null;
}): BabyPaidCardFacts | null {
  const { sex, lang } = input;
  const t = BABY_NAMES_SHARE_TEXT[lang];
  const figures = figuresOf(input.facts, sex);
  const history = figures?.history ?? null;
  if (figures === null || history === null) return null;
  const years = counted(history);
  const firstYear = history[0];
  const lastYear = history[history.length - 1];
  const firstCounted = years[0];
  const lastCounted = years[years.length - 1];
  const peak = peakOf(history);
  if (
    firstYear === undefined ||
    lastYear === undefined ||
    firstCounted === undefined ||
    lastCounted === undefined ||
    peak?.count == null
  ) {
    return null;
  }
  const name = input.facts.given_name.display_name;
  const max = Math.max(1, ...years.map((c) => c.count.count));
  const bars: BabyChartBar[] = history.map((year) => {
    if (year.list === null) return { year: year.birth_year, kind: "gap", height: 0, role: "year" };
    if (year.count === null)
      return { year: year.birth_year, kind: "cutoff", height: 0, role: "year" };
    const role: BabyBarRole =
      year.birth_year === peak.birth_year
        ? "peak"
        : year.birth_year === firstCounted.year.birth_year
          ? "first"
          : year.birth_year === lastCounted.year.birth_year
            ? "latest"
            : "year";
    return { year: year.birth_year, kind: "bar", height: year.count.count / max, role };
  });
  // "×N" as the page: the latest ÷ 2000's count, or the inverse with "rzadziej", only when both exist.
  const year2000 = history.find((y) => y.birth_year === BIRTH_HISTORY_FIRST_YEAR);
  let times: BabyPaidCardFacts["times"] = null;
  if (year2000?.count != null && lastYear.count !== null && lastYear !== year2000) {
    const more = lastYear.count.count >= year2000.count.count;
    const factor = more
      ? lastYear.count.count / year2000.count.count
      : year2000.count.count / lastYear.count.count;
    times = {
      figure: t.times(formatDecimal(factor, 1, lang)),
      wording: t.timesWording(more, year2000.birth_year),
    };
  }
  const place = (year: BirthYearFigures): string =>
    year.rank === null ? t.noPlace : t.placeShort(formatInteger(year.rank.rank, lang));
  const callout = (c: CountedYear, isPeak: boolean) => ({
    figure: formatInteger(c.count.count, lang),
    line: t.calloutLine(c.year.birth_year, isPeak, place(c.year)),
    peak: isPeak,
  });
  const byYear = new Map(history.map((y) => [y.birth_year, y]));
  const top = history.filter((y) => y.rank?.rank === 1).map((y) => y.birth_year);
  const register = registerOf(input.stock, sex, lang);
  return {
    card: "paid",
    lang,
    name,
    sex,
    brand: t.brand,
    eyebrow: t.paidEyebrow(firstYear.birth_year, lastYear.birth_year),
    nameEyebrow: t.paidNameEyebrow(sex),
    times,
    bars,
    callouts: [
      callout(firstCounted, false),
      callout({ year: peak, count: peak.count }, true),
      callout(lastCounted, false),
    ],
    ladderHeading: t.ladderHeading,
    ladder: ladderYears(history).map((year) => {
      const rank = byYear.get(year)?.rank ?? null;
      return {
        year,
        rank: rank === null ? null : t.rung(formatInteger(rank.rank, lang)),
        latest: year === lastYear.birth_year,
      };
    }),
    topYears: top.length === 0 ? null : t.topYears(top),
    register: register.line === null ? null : `${register.line.line}.`,
    source: t.sourceLine(t.listsWord(firstYear.birth_year, lastYear.birth_year), register.date),
    privacy: t.privacyLine,
    host: input.host ?? t.hostFallback,
  };
}

export type BabyCardFacts = BabyFreeCardFacts | BabyPaidCardFacts;
