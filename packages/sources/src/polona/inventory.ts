import { PolonaShapeError } from "./errors.js";
import { parsePolonaFulltextHit, parsePolonaSearchEnvelope } from "./search.js";
import type { PolonaFacetValue, PolonaFulltextHit } from "./search.js";

/**
 * What Polona holds for one surname (TASK-054, ADR-0024): the requests that
 * ask it, and the summary built from the answers. Pure: the network lives in
 * `fetch.ts`, the database in `@name-atlas/truth`.
 *
 * One surname costs {@link POLONA_INVENTORY_REQUEST_COUNT} requests: a
 * metadata search for the catalogue total and its facets, a full-text search
 * over works that are not copyright-protected for the page total, its facets
 * and the first hits, and one full-text count per period of publication.
 *
 * The query is always the surname in double quotes. Unquoted, Polona reads a
 * hyphen as an operator: `KOWALSKA-NOWAK` matched 507,536 pages, the quoted
 * phrase 3 (observed 2026-10-01).
 */

export const POLONA_API_BASE = "https://polona.pl/api/search-service";

/** Periods of publication the page total is split into. Years inclusive; null is open. */
export const POLONA_PERIODS: readonly {
  readonly from_year: number | null;
  readonly to_year: number | null;
}[] = [
  { from_year: null, to_year: 1799 },
  { from_year: 1800, to_year: 1849 },
  { from_year: 1850, to_year: 1899 },
  { from_year: 1900, to_year: 1918 },
  { from_year: 1919, to_year: 1939 },
  { from_year: 1940, to_year: null },
];

/** How many example hits the full-text request asks for. */
export const POLONA_EXAMPLE_PAGE_SIZE = 10;

/** How many examples a summary keeps, all from public-domain works. */
export const POLONA_EXAMPLES_KEPT = 3;

/** Examples from works dated before this year are preferred: the page's subject is the past. */
export const POLONA_EXAMPLE_PREFER_BEFORE = 1940;

/** How many values each facet keeps, largest first. */
export const POLONA_FACET_VALUES_KEPT = 8;

/** The longest excerpt kept, matching `TRANSCRIPTION_EXCERPT_MAX_CHARS` in `@name-atlas/truth`. */
export const POLONA_EXCERPT_MAX_CHARS = 300;

/** The summary's shape version, stored with it. */
export const POLONA_INVENTORY_VERSION = "polona_inventory@1";

export interface PolonaRequest {
  /** Stable name: `catalogue`, `pages`, or `period:<from>-<to>`. */
  readonly name: string;
  readonly url: string;
  readonly body: string;
}

const PAGES_FILTER = { keywordFilters: { copyright: ["false"] } };

function periodName(period: (typeof POLONA_PERIODS)[number]): string {
  return `period:${String(period.from_year ?? "")}-${String(period.to_year ?? "")}`;
}

/** The surname as Polona is asked for it: quoted, so it is one phrase. */
export function polonaQuery(surname: string): string {
  const clean = surname.replaceAll('"', "").trim();
  if (clean.length === 0) throw new Error("an empty surname cannot be searched");
  return `"${clean}"`;
}

/** Every request one surname's inventory takes, in the order they are sent. */
export function polonaInventoryRequests(surname: string): readonly PolonaRequest[] {
  const q = encodeURIComponent(polonaQuery(surname));
  const fulltext = (size: number): string =>
    `${POLONA_API_BASE}/fulltext/polona/fulltext/0/${String(size)}?sort=RELEVANCE&query=${q}`;
  return [
    {
      name: "catalogue",
      url: `${POLONA_API_BASE}/search/simple?query=${q}&page=0&pageSize=1&sort=RELEVANCE`,
      body: "{}",
    },
    {
      name: "pages",
      url: fulltext(POLONA_EXAMPLE_PAGE_SIZE),
      body: JSON.stringify({ filters: { ...PAGES_FILTER, temporalFilters: null } }),
    },
    ...POLONA_PERIODS.map((period) => ({
      name: periodName(period),
      url: fulltext(1),
      body: JSON.stringify({
        filters: {
          ...PAGES_FILTER,
          temporalFilters: {
            dates: {
              startRange: `${String(period.from_year ?? 1000)}-01-01`,
              endRange: `${String(period.to_year ?? 2100)}-12-31`,
            },
          },
        },
      }),
    })),
  ];
}

export const POLONA_INVENTORY_REQUEST_COUNT = 2 + POLONA_PERIODS.length;

export interface PolonaCount {
  readonly label: string;
  readonly count: number;
}

export interface PolonaPeriodCount {
  readonly from_year: number | null;
  readonly to_year: number | null;
  readonly count: number;
}

export interface PolonaExample {
  readonly object_id: string;
  readonly content_id: string;
  readonly title: string;
  /** The date as the catalogue states it, unparsed; null when it states none. */
  readonly date: string | null;
  readonly page_number: number;
  /** One snippet of the page's text, tags removed, at most {@link POLONA_EXCERPT_MAX_CHARS}. */
  readonly excerpt: string;
  /** The page in Polona's viewer. */
  readonly url: string;
}

export interface PolonaInventory {
  readonly version: typeof POLONA_INVENTORY_VERSION;
  readonly surname: string;
  readonly query: string;
  /** Catalogue records matching the query, of every licence. */
  readonly catalogue_records: number;
  readonly catalogue_by_category: readonly PolonaCount[];
  readonly catalogue_public_domain: number;
  /** Pages of works that are not copyright-protected on which the word appears. */
  readonly pages: number;
  readonly pages_by_period: readonly PolonaPeriodCount[];
  /** Pages whose work's date falls in no period: undated, or the periods do not cover it. */
  readonly pages_outside_periods: number;
  readonly pages_by_place: readonly PolonaCount[];
  readonly pages_by_language: readonly PolonaCount[];
  readonly examples: readonly PolonaExample[];
  /** Full-text hits not quoted because their rights did not classify as public domain. */
  readonly examples_withheld: number;
}

function top(values: readonly PolonaFacetValue[] | undefined): PolonaCount[] {
  return [...(values ?? [])]
    .filter((v) => v.count > 0 && v.value.trim().length > 0)
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, POLONA_FACET_VALUES_KEPT)
    .map((v) => ({ label: v.value.trim(), count: v.count }));
}

/** A snippet as plain text: tags removed, whitespace collapsed, cut at a word. */
export function polonaExcerpt(highlight: string): string {
  const text = highlight
    .replace(/<\/?em>/gu, "")
    .replace(/<[^>]*>/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (text.length <= POLONA_EXCERPT_MAX_CHARS) return text;
  const cut = text.slice(0, POLONA_EXCERPT_MAX_CHARS - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > POLONA_EXCERPT_MAX_CHARS / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function isHistorical(example: PolonaExample): boolean {
  const year = /\b(1[0-9]{3})\b/u.exec(example.date ?? "")?.[1];
  return year !== undefined && Number(year) < POLONA_EXAMPLE_PREFER_BEFORE;
}

function firstValue(hit: PolonaFulltextHit, group: "basicFields" | "hiddenFields", name: string) {
  return hit[group][name]?.values[0]?.trim() || null;
}

function example(hit: PolonaFulltextHit): PolonaExample | null {
  if (hit.rights.licence !== "PUBLIC_DOMAIN") return null;
  const title = firstValue(hit, "basicFields", "title");
  const highlight = hit.highlights[0];
  if (title === null || highlight === undefined) return null;
  const excerpt = polonaExcerpt(highlight);
  if (excerpt.length === 0) return null;
  return {
    object_id: hit.objectId,
    content_id: hit.contentId,
    title,
    date:
      firstValue(hit, "basicFields", "dateDescriptive") ?? firstValue(hit, "hiddenFields", "date"),
    page_number: hit.pageNumber,
    excerpt,
    // The viewer counts scans from zero, the search from one: `page=121`
    // opened the scan the search calls page 122 (checked 2026-10-01).
    url: `https://polona.pl/item-view/${hit.objectId}?page=${String(Math.max(0, hit.pageNumber - 1))}`,
  };
}

/**
 * Builds the summary from the responses, keyed by request name.
 *
 * Throws {@link PolonaShapeError} when an envelope does not parse, so nothing
 * half-read is stored. A hit that fails closed is only withheld from the
 * examples, and counted as withheld.
 */
export function summarisePolonaInventory(
  surname: string,
  responses: Readonly<Record<string, string>>,
): PolonaInventory {
  const body = (name: string): string => {
    const text = responses[name];
    if (text === undefined) {
      throw new PolonaShapeError("missing_field", `$responses.${name}`, `no response for ${name}`);
    }
    return text;
  };
  const catalogue = parsePolonaSearchEnvelope(body("catalogue"), "simple");
  const pages = parsePolonaSearchEnvelope(body("pages"), "fulltext");
  const periods = POLONA_PERIODS.map((period) => ({
    from_year: period.from_year,
    to_year: period.to_year,
    count: parsePolonaSearchEnvelope(body(periodName(period)), "fulltext").totalElements,
  }));

  const candidates: PolonaExample[] = [];
  let withheld = 0;
  pages.rawHits.forEach((raw, index) => {
    let parsed: PolonaFulltextHit;
    try {
      parsed = parsePolonaFulltextHit(raw, `$.pages.hits[${String(index)}]`);
    } catch (error) {
      if (error instanceof PolonaShapeError) {
        withheld += 1;
        return;
      }
      throw error;
    }
    const kept = example(parsed);
    if (kept === null) {
      withheld += 1;
      return;
    }
    candidates.push(kept);
  });
  // Older works first, then Polona's relevance order (the sort is stable).
  const examples = [...candidates]
    .sort((a, b) => Number(!isHistorical(a)) - Number(!isHistorical(b)))
    .slice(0, POLONA_EXAMPLES_KEPT);

  const inPeriods = periods.reduce((sum, p) => sum + p.count, 0);
  const publicDomain =
    catalogue.facets["license"]?.find((v) => v.value === "Domena Publiczna")?.count ?? 0;
  return {
    version: POLONA_INVENTORY_VERSION,
    surname,
    query: polonaQuery(surname),
    catalogue_records: catalogue.totalElements,
    catalogue_by_category: top(catalogue.facets["category"]),
    catalogue_public_domain: publicDomain,
    pages: pages.totalElements,
    pages_by_period: periods,
    pages_outside_periods: Math.max(0, pages.totalElements - inPeriods),
    pages_by_place: top(pages.facets["publishPlace"]),
    pages_by_language: top(pages.facets["language"]),
    examples,
    examples_withheld: withheld,
  };
}
