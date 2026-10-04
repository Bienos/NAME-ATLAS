import type { DistributionEntry, SurnameResultResponse } from "@name-atlas/contracts";
import {
  archivePeriodLabel,
  assessmentWord,
  changeListLabel,
  coverageWarning,
  formatDate,
  formatInteger,
  formatPercent,
  formatPercentChange,
  partitionLabel,
  UI,
} from "./messages.js";
import type { Lang } from "./messages.js";
import { inDeckOrder, oneInOf, rankOf, sideOf } from "./deck-order.js";
import { mapInputs } from "./voivodeship-map-input.js";

/**
 * What a share card may say (TASK-056), one card per answer in the deck.
 *
 * Pure, and the whole vocabulary of the cards, as `og-facts.ts` is for the page's
 * share image: every figure is one the page prints, read from the validated
 * response in the deck's order (the surname's main list first), and every card
 * carries what the figure means and what it does not, its source and its date.
 * A section that is not ready has no card. `share-card.tsx` decides only how a
 * card looks.
 */

export const SHARE_CARDS = [
  "rarity",
  "neighbours",
  "where",
  "change",
  "other",
  "meaning",
  "print",
  "summary",
] as const;

export type ShareCardKey = (typeof SHARE_CARDS)[number];

export function isShareCard(value: string): value is ShareCardKey {
  return (SHARE_CARDS as readonly string[]).includes(value);
}

export type ShareVisual =
  /** A point on the page's logarithmic rarity scale, 0 (1 in 100) to 1 (1 in 10 million). */
  | { readonly kind: "scale"; readonly at: number; readonly ticks: readonly string[] }
  | {
      readonly kind: "ladder";
      readonly rows: readonly {
        readonly rank: string;
        readonly name: string;
        readonly count: string;
        readonly self: boolean;
      }[];
    }
  /** Map bands 0–4 by TERC code, as the page's map draws them; absent is not listed. */
  | { readonly kind: "map"; readonly bands: Readonly<Record<string, number>> }
  | {
      readonly kind: "line";
      /** Known points, x and y scaled to 0–1 (y up). */
      readonly points: readonly { readonly x: number; readonly y: number }[];
      readonly first: { readonly count: string; readonly year: string };
      readonly last: { readonly count: string; readonly year: string };
    }
  | {
      readonly kind: "pair";
      readonly items: readonly {
        readonly label: string;
        readonly value: string;
        readonly sub: string;
      }[];
    }
  | {
      readonly kind: "quote";
      readonly tag: string;
      readonly text: string;
      readonly ref: string;
    }
  | {
      readonly kind: "periods";
      readonly rows: readonly {
        readonly label: string;
        readonly share: number;
        readonly count: string;
      }[];
      readonly quote: { readonly text: string; readonly ref: string } | null;
    }
  | { readonly kind: "recap"; readonly summary: SummaryFacts };

/**
 * The summary card's whole vocabulary (TASK-060): the page's key figures on one
 * card, for the story-size image and the page's 1200 × 630 preview alike. Every
 * figure is one the page prints, the main list leads, each figure that belongs
 * to a list names it, and a slot whose section is not ready is null: a card
 * never fills a gap.
 */
export interface SummaryFacts {
  readonly surname: string;
  /** "osób" or "people", after each count. */
  readonly countUnit: string;
  /** Each list's count, the main list first; a null count (absent) is never shown as zero. */
  readonly counts: readonly { readonly list: string; readonly value: string }[];
  readonly rarity: {
    readonly figure: string;
    readonly list: string;
    /** "#2", with its caption "miejsce na liście nazwisk". */
    readonly rank: string | null;
    readonly rankCaption: string;
    /** Where the figure sits on the page's logarithmic scale, 0 to 1, and its ticks. */
    readonly at: number;
    readonly ticks: readonly string[];
  } | null;
  readonly where: {
    readonly caption: string;
    readonly region: string;
    readonly share: string;
    readonly list: string;
    readonly bands: Readonly<Record<string, number>>;
  } | null;
  readonly change: {
    readonly caption: string;
    readonly figure: string;
    readonly span: string;
    readonly list: string;
  } | null;
  readonly print: {
    readonly caption: string;
    readonly pages: string;
    readonly unit: string;
  } | null;
  readonly meaning: {
    readonly caption: string;
    readonly gloss: string;
    readonly confidence: string;
    readonly source: string;
  } | null;
  /** The sources and dates of the figures above, not of the meaning (which carries its own). */
  readonly sources: readonly string[];
}

export interface ShareFacts {
  readonly card: ShareCardKey;
  /** Printed on paper rather than the dusk: the old-print card. */
  readonly paper: boolean;
  readonly eyebrow: string;
  readonly surname: string;
  /** Stated before any figure, as on the page (TASK-012 §3). */
  readonly warning: string | null;
  readonly figure: string | null;
  readonly figureNote: string | null;
  readonly visual: ShareVisual | null;
  readonly explanation: string;
  readonly source: string;
  readonly cta: string;
}

const EXPLAIN = {
  pl: {
    rarity: (x: string, list: string) =>
      `Mniej więcej jedna na ${x} osób z tej listy PESEL (${list}) nosi to nazwisko.`,
    rarityOther: (list: string, x: string) => ` Na drugiej liście (${list}): 1 na ${x}.`,
    whereTop: (region: string) => `Najwięcej: województwo ${region.toLocaleLowerCase("pl")}`,
    where:
      "Udział wśród osób o tym nazwisku zameldowanych na pobyt stały. To adres w rejestrze, nie pochodzenie rodziny.",
    change: (list: string) =>
      `Cała lista zmieniła się w tym czasie o ${list}. Mówimy, co się zmieniło, nie dlaczego.`,
    print: "To wyniki wyszukiwania słowa w każdej odmianie w zbiorach Polony, nie liczba osób.",
    summary: "Każda liczba ma źródło i datę. Listy męska i żeńska nigdy nie są sumowane.",
    page: "s.",
    mostIn: "najczęściej",
    people: "osób",
    cta: "Sprawdź swoje nazwisko",
    interpretation: "interpretacja",
    regionShare: "udział",
    pages: "stron",
  },
  en: {
    rarity: (x: string, list: string) =>
      `Roughly one in ${x} people on this PESEL list (${list}) has this surname.`,
    rarityOther: (list: string, x: string) => ` On the other list (${list}): 1 in ${x}.`,
    whereTop: (region: string) => `Highest share: ${region}`,
    where:
      "Share among people with this surname registered for permanent residence. An address in the register, not where the family comes from.",
    change: (list: string) =>
      `The whole list changed by ${list} over the same years. We say what changed, not why.`,
    print:
      "Search results for the word, in any form, in Polona's collections; not a count of people.",
    summary:
      "Every figure has a source and a date. The men's and women's lists are never added up.",
    page: "p.",
    mostIn: "most common in",
    people: "people",
    cta: "Look up your surname",
    interpretation: "interpretation",
    regionShare: "share",
    pages: "pages",
  },
} as const;

function oneIn(x: number, lang: Lang): string {
  const n = formatInteger(x, lang);
  return lang === "pl" ? `1 na ${n}` : `1 in ${n}`;
}

/** A point on the page's logarithmic rarity scale: 0 is 1 in 100, 1 is 1 in 10 million. */
function rarityScale(x: number, lang: Lang): { at: number; ticks: readonly string[] } {
  return {
    at: Math.min(1, Math.max(0, (Math.log10(x) - 2) / 5)),
    ticks:
      lang === "pl"
        ? ["100", "1 tys.", "10 tys.", "100 tys.", "1 mln", "10 mln"]
        : ["100", "1k", "10k", "100k", "1m", "10m"],
  };
}

/** The map's bands by TERC code, as the page's map draws them; null when a region has no code. */
function regionBands(entry: DistributionEntry, lang: Lang): Record<string, number> | null {
  const input = mapInputs([entry], lang);
  if (input === null) return null;
  const bands: Record<string, number> = {};
  for (const region of input.maps[0] ?? []) bands[region.terc_code] = region.band;
  return bands;
}

function clip(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max
    ? text
    : `${chars
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`;
}

function yearOf(date: string | null): string | null {
  return /\b(1[0-9]{3}|20[0-9]{2})\b/u.exec(date ?? "")?.[1] ?? null;
}

/** The share card's facts, or null when its section is not ready or the surname did not resolve. */
export function shareFacts(
  given: SurnameResultResponse,
  card: ShareCardKey,
  lang: Lang,
): ShareFacts | null {
  if (given.status !== "RESOLVED" || given.surname === null) return null;
  const response = inDeckOrder(given);
  const surname = response.surname?.display_name ?? given.surname.display_name;
  const t = UI[lang];
  const e = EXPLAIN[lang];
  const base = { card, paper: false, surname, warning: null, cta: e.cta };

  switch (card) {
    case "rarity": {
      if (response.rarity?.state !== "READY") return null;
      const entries = response.rarity.entries.filter((x) => oneInOf(x) !== null);
      const [lead, other] = entries;
      if (lead === undefined) return null;
      const x = oneInOf(lead) as number;
      const rank = rankOf(lead);
      const list = partitionLabel(lead.comparability_group, lang) ?? "";
      const otherX = other === undefined ? null : oneInOf(other);
      return {
        ...base,
        eyebrow: t.deckRarity,
        figure: oneIn(x, lang),
        figureNote:
          rank === null ? null : `#${formatInteger(rank, lang)} ${t.rankCaption} · ${list}`,
        visual: { kind: "scale", ...rarityScale(x, lang) },
        explanation:
          e.rarity(formatInteger(x, lang), list) +
          (otherX === null || other === undefined
            ? ""
            : e.rarityOther(
                partitionLabel(other.comparability_group, lang) ?? "",
                formatInteger(otherX, lang),
              )),
        source: `${lead.citation.publisher ?? lead.citation.title} · ${formatDate(lead.snapshot_date, lang)}`,
      };
    }

    case "neighbours": {
      if (response.neighbours?.state !== "READY") return null;
      const [list] = response.neighbours.lists;
      const self = list?.entries.find((x) => x.is_self);
      if (list === undefined || self === undefined) return null;
      return {
        ...base,
        eyebrow: t.neighboursHeading,
        figure: `#${formatInteger(self.rank, lang)}`,
        figureNote: partitionLabel(list.comparability_group, lang),
        visual: {
          kind: "ladder",
          rows: list.entries.map((x) => ({
            rank: `#${formatInteger(x.rank, lang)}`,
            name: x.surname.display_name,
            count: formatInteger(x.count, lang),
            self: x.is_self,
          })),
        },
        explanation: t.neighboursNote,
        source: `PESEL · ${formatDate(list.snapshot_date, lang)}`,
      };
    }

    case "where": {
      if (response.distribution?.state !== "READY") return null;
      const [entry] = response.distribution.entries;
      if (entry === undefined) return null;
      const top = [...entry.regions].sort((a, b) => b.share_of_covered - a.share_of_covered)[0];
      if (top === undefined) return null;
      const bands = regionBands(entry, lang);
      return {
        ...base,
        eyebrow: t.deckWhere,
        warning: coverageWarning(entry, lang),
        figure: formatPercent(top.share_of_covered, lang),
        figureNote: e.whereTop(top.display_name),
        visual: bands === null ? null : { kind: "map", bands },
        explanation: e.where,
        source: `${entry.citation.publisher ?? entry.citation.title} · ${formatDate(entry.snapshot_date, lang)}`,
      };
    }

    case "change": {
      if (response.change?.state !== "READY") return null;
      const [entry] = response.change.entries;
      if (entry === undefined) return null;
      const known = entry.points.flatMap((p) => (p.status === "KNOWN" ? [p] : []));
      const first = known[0];
      const last = known.at(-1);
      if (first === undefined || last === undefined || known.length < 2) return null;
      const t0 = Date.parse(first.data_date);
      const t1 = Date.parse(last.data_date);
      const counts = known.map((p) => p.count);
      const lo = Math.min(...counts);
      const hi = Math.max(...counts);
      const span = hi - lo || 1;
      const { summary } = entry;
      return {
        ...base,
        eyebrow: t.deckChange,
        figure: formatPercentChange(summary.count_change_percent, lang),
        figureNote: `${changeListLabel(entry.list, lang)}: ${formatInteger(summary.first.count, lang)} → ${formatInteger(summary.last.count, lang)}`,
        visual: {
          kind: "line",
          points: known.map((p) => ({
            x: (Date.parse(p.data_date) - t0) / (t1 - t0 || 1),
            y: (p.count - lo) / span,
          })),
          first: { count: formatInteger(first.count, lang), year: first.data_date.slice(0, 4) },
          last: { count: formatInteger(last.count, lang), year: last.data_date.slice(0, 4) },
        },
        explanation: e.change(formatPercentChange(summary.list_change_percent, lang)),
        source: `${entry.citation.publisher ?? entry.citation.title} · ${formatDate(summary.first.data_date, lang)} – ${formatDate(summary.last.data_date, lang)}`,
      };
    }

    case "other": {
      const other = response.other_form;
      if (other === null || response.rarity?.state !== "READY") return null;
      const own = response.rarity.entries.find(
        (x) => sideOf(x.comparability_group) !== sideOf(other.comparability_group),
      );
      const ownRank = own === undefined ? null : rankOf(own);
      if (own === undefined || ownRank === null) return null;
      return {
        ...base,
        eyebrow: t.otherFormHeading,
        surname: `${surname} · ${other.surname.display_name}`,
        figure: null,
        figureNote: null,
        visual: {
          kind: "pair",
          items: [
            {
              label: `${partitionLabel(own.comparability_group, lang) ?? ""} · ${surname}`,
              value: formatInteger(own.numerator, lang),
              sub: `#${formatInteger(ownRank, lang)} ${t.rankCaption}`,
            },
            {
              label: `${partitionLabel(other.comparability_group, lang) ?? ""} · ${other.surname.display_name}`,
              value: formatInteger(other.count, lang),
              sub: `#${formatInteger(other.rank, lang)} ${t.rankCaption}`,
            },
          ],
        },
        explanation: t.otherFormNote,
        source: `PESEL · ${formatDate(other.snapshot_date, lang)}`,
      };
    }

    case "meaning": {
      if (response.meaning?.state !== "AVAILABLE") return null;
      const [lead] = response.meaning.interpretations;
      if (lead === undefined) return null;
      const conflicting = response.meaning.confidence === "CONFLICTING";
      return {
        ...base,
        eyebrow: t.deckMeaning,
        figure: null,
        figureNote: null,
        visual: {
          kind: "quote",
          tag: `${e.interpretation} · ${String(lead.work.year)}`,
          text: `„${clip(lead.literal_gloss, 220)}”`,
          ref: `${lead.work.author_or_publisher}, ${clip(lead.work.title, 70)}, ${String(lead.work.year)}`,
        },
        explanation: conflicting
          ? `${t.meaningInterpretationNote} ${t.meaningConflictNote}`
          : t.meaningInterpretationNote,
        source: `${lead.work.author_or_publisher} · ${String(lead.work.year)} · ${lead.locator}`,
      };
    }

    case "print": {
      const archive = response.archive;
      if (archive?.state !== "READY" || archive.pages === null || archive.pages === 0) return null;
      if (archive.searched_on === null) return null;
      const largest = Math.max(1, ...archive.pages_by_period.map((p) => p.count));
      const example = archive.examples[0];
      const year = example === undefined ? null : yearOf(example.date);
      return {
        ...base,
        paper: true,
        eyebrow: t.deckPrint,
        figure: formatInteger(archive.pages, lang),
        figureNote: t.deckPrintPages,
        visual: {
          kind: "periods",
          rows: archive.pages_by_period.map((p) => ({
            label: archivePeriodLabel(p, lang),
            share: p.count / largest,
            count: formatInteger(p.count, lang),
          })),
          quote:
            example === undefined
              ? null
              : {
                  text: `„${clip(example.excerpt, 140)}”`,
                  ref: `${clip(example.title, 70)}${year === null ? "" : `, ${year}`}, ${e.page} ${String(example.page_number)}`,
                },
        },
        explanation: e.print,
        source: `${archive.citation?.attribution ?? "Polona"} · ${formatDate(archive.searched_on, lang)}`,
      };
    }

    case "summary": {
      const summary = summaryFacts(given, lang);
      if (summary === null) return null;
      return {
        ...base,
        eyebrow: t.deckEnd,
        figure: null,
        figureNote: null,
        visual: { kind: "recap", summary },
        explanation: e.summary,
        source: [
          ...summary.sources,
          ...(summary.meaning === null ? [] : [summary.meaning.source]),
        ].join(" · "),
      };
    }
  }
}

/**
 * The summary's facts, or null when the surname did not resolve or the page
 * has nothing ready to say. Pure: `share-card.tsx` and `og-card.tsx` decide
 * only how it looks.
 */
export function summaryFacts(given: SurnameResultResponse, lang: Lang): SummaryFacts | null {
  if (given.status !== "RESOLVED" || given.surname === null) return null;
  const response = inDeckOrder(given);
  const surname = response.surname?.display_name ?? given.surname.display_name;
  const t = UI[lang];
  const e = EXPLAIN[lang];

  const counts: { list: string; value: string }[] = [];
  const dates = new Set<string>();
  if (response.population?.state === "READY") {
    for (const o of response.population.observations) {
      if (o.value.value === null) continue;
      counts.push({
        list: partitionLabel(o.comparability_group, lang) ?? t.navCount,
        value: formatInteger(o.value.value, lang),
      });
      dates.add(o.snapshot_date);
    }
  }

  let rarity: SummaryFacts["rarity"] = null;
  if (response.rarity?.state === "READY") {
    const lead = response.rarity.entries.find((x) => oneInOf(x) !== null);
    const x = lead === undefined ? null : oneInOf(lead);
    if (lead !== undefined && x !== null) {
      const rank = rankOf(lead);
      rarity = {
        figure: oneIn(x, lang),
        list: partitionLabel(lead.comparability_group, lang) ?? "",
        rank: rank === null ? null : `#${formatInteger(rank, lang)}`,
        rankCaption: t.rankCaption,
        ...rarityScale(x, lang),
      };
    }
  }

  let where: SummaryFacts["where"] = null;
  const distribution =
    response.distribution?.state === "READY" ? response.distribution.entries[0] : undefined;
  if (distribution?.coverage_state === "READY") {
    const top = [...distribution.regions].sort(
      (a, b) => b.share_of_covered - a.share_of_covered,
    )[0];
    const bands = regionBands(distribution, lang);
    if (top !== undefined && bands !== null) {
      where = {
        caption: e.mostIn,
        region: lang === "pl" ? top.display_name.toLocaleLowerCase("pl") : top.display_name,
        share: formatPercent(top.share_of_covered, lang),
        list: partitionLabel(distribution.comparability_group, lang) ?? "",
        bands,
      };
    }
  }

  let change: SummaryFacts["change"] = null;
  const changeEntry = response.change?.state === "READY" ? response.change.entries[0] : undefined;
  if (changeEntry !== undefined) {
    const { summary } = changeEntry;
    change = {
      caption: t.deckChange,
      figure: formatPercentChange(summary.count_change_percent, lang),
      span: `${summary.first.data_date.slice(0, 4)} → ${summary.last.data_date.slice(0, 4)}`,
      list: changeListLabel(changeEntry.list, lang),
    };
  }

  const archive = response.archive;
  const print =
    archive?.state === "READY" && archive.pages !== null && archive.pages > 0
      ? { caption: t.deckPrint, pages: formatInteger(archive.pages, lang), unit: e.pages }
      : null;

  const lead =
    response.meaning?.state === "AVAILABLE" ? response.meaning.interpretations[0] : undefined;
  const meaning =
    lead === undefined
      ? null
      : {
          caption: t.deckMeaning,
          gloss: `„${clip(lead.literal_gloss, 110)}”`,
          confidence: assessmentWord(response.meaning?.confidence ?? "INSUFFICIENT_DATA", lang),
          source: `${lead.work.author_or_publisher} ${String(lead.work.year)}`,
        };

  if (
    counts.length === 0 &&
    rarity === null &&
    where === null &&
    change === null &&
    print === null &&
    meaning === null
  ) {
    return null;
  }

  const sources = [...dates].map((d) => `PESEL ${formatDate(d, lang)}`);
  if (print !== null && archive?.state === "READY" && archive.searched_on !== null) {
    sources.push(`Polona ${formatDate(archive.searched_on, lang)}`);
  }

  return { surname, countUnit: e.people, counts, rarity, where, change, print, meaning, sources };
}

/** The card a deck card shares: its own image, or the summary for one without (the surname, the catalogue). */
export function shareCardFor(deckKey: string): ShareCardKey {
  if (deckKey === "catalogue") return "print";
  return isShareCard(deckKey) ? deckKey : "summary";
}

/** The image's address beside the surname's page: `/pl/nazwisko/{slug}/karta/{card}`. */
export function shareCardPath(pagePath: string, card: ShareCardKey, lang: Lang): string {
  return `${pagePath}/${lang === "en" ? "card" : "karta"}/${card}`;
}

/** The card's marked preview (TASK-093): `/pl/nazwisko/{slug}/karta/{card}/podglad`. */
export function sharePreviewPath(pagePath: string, card: ShareCardKey, lang: Lang): string {
  return `${shareCardPath(pagePath, card, lang)}/${lang === "en" ? "preview" : "podglad"}`;
}

/** Every card of the surname in one PDF (TASK-107): `/pl/nazwisko/{slug}/pdf`. */
export function surnamePdfPath(pagePath: string): string {
  return `${pagePath}/pdf`;
}

/** The share studio (TASK-093, ADR-0034): `/pl/nazwisko/{slug}/udostepnij?card={card}`. */
export function studioPath(pagePath: string, lang: Lang, card: ShareCardKey | null = null): string {
  const path = `${pagePath}/${lang === "en" ? "share" : "udostepnij"}`;
  return card === null ? path : `${path}?card=${card}`;
}
