/**
 * Famous bearers of a surname, from Wikidata (TASK-073, ADR-0030): the two
 * queries that ask for them, and the summary built from the answers. Pure: the
 * network lives in `fetch.ts`, the database in `@name-atlas/truth`.
 *
 * A bearer is a person (`P31 Q5`) whose family name (`P734`) is an item
 * labelled exactly as the surname, who has an article in at least one
 * Wikipedia, and whose own name ends with the surname. The last test is what
 * makes the match exact: Wikidata often files KOWALSKA under the family-name
 * item "Kowalski", and a double surname such as "Nowak-Michalska" under
 * "Nowak". So the feminine form also asks for its masculine item, and every
 * person is then kept only if their name, as Wikidata labels it, ends with the
 * surname itself.
 *
 * Living people are included (the project owner, 2026-10-03), within ADR-0030
 * §2.4: only people with a Wikipedia article, only what Wikidata states about
 * them in public (name, a one-line description, years), and never anyone on
 * {@link WIKIDATA_EXCLUDED_PEOPLE}.
 */

export const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

/** The summary's shape version, stored with it. */
export const WIKIDATA_BEARERS_VERSION = "wikidata_bearers@1";

/** How many bearers a summary keeps: Polish citizens first, then the most widely written about. */
export const WIKIDATA_BEARERS_KEPT = 20;

/** The longest description kept. Wikidata's own guideline is a short phrase. */
export const WIKIDATA_DESCRIPTION_MAX_CHARS = 200;

/**
 * Classes a family-name item is an instance of (observed 2026-10-03): family
 * name, masculine and feminine family name, double, hyphenated and compound
 * surname. A disambiguation page or a fictional character labelled "Kowalski"
 * is none of these, so its links are never followed.
 */
export const WIKIDATA_FAMILY_NAME_CLASSES: readonly string[] = [
  "Q101352",
  "Q18972245",
  "Q18972207",
  "Q29042997",
  "Q106319018",
  "Q60558422",
];

/**
 * The states whose citizens rank first (ADR-0030 §2.3): Poland and the Polish
 * states before it, as Wikidata records citizenship (`P27`). Labels checked
 * 2026-10-03: Poland, Second Polish Republic, Polish People's Republic,
 * Polish–Lithuanian Commonwealth, Kingdom of Poland (1386–1569) and Kingdom
 * of Poland (1025–1385). Saint Faustyna Kowalska is recorded under the Second
 * Polish Republic, not Q36.
 */
export const WIKIDATA_POLISH_STATES: readonly string[] = [
  "Q36",
  "Q207272",
  "Q211274",
  "Q172107",
  "Q1649871",
  "Q577867",
];

/**
 * People Name Atlas does not show, by their Wikidata id: each one asked to be
 * removed (ADR-0030 §2.5). Add the id and the date of the request; the next
 * load drops them, and the claim is superseded.
 */
export const WIKIDATA_EXCLUDED_PEOPLE: readonly string[] = [];

export class WikidataShapeError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "WikidataShapeError";
  }
}

/** One person, as a summary keeps them. */
export interface WikidataBearer {
  /** The Wikidata id, `Q…`. */
  readonly qid: string;
  /** The name as Wikidata labels the person: Polish, else the default, else English. */
  readonly name: string;
  readonly description_pl: string | null;
  readonly description_en: string | null;
  /** Years as Wikidata states them; null when it states none. */
  readonly born: number | null;
  readonly died: number | null;
  /** Wikimedia sites with a page on the person: how widely they are written about. */
  readonly sitelinks: number;
  /** Whether Wikidata gives Poland, or a Polish state before it, as a citizenship: they rank first (ADR-0030 §2.3). */
  readonly polish_citizen: boolean;
  /** The Polish Wikipedia article, else the English one, else null (an article elsewhere). */
  readonly article_url: string | null;
}

export interface WikidataBearers {
  readonly version: typeof WIKIDATA_BEARERS_VERSION;
  /** The surname as the register writes it. */
  readonly surname: string;
  /** The family-name labels asked for. */
  readonly labels: readonly string[];
  /** People whose name is exactly the surname, with a Wikipedia article, after exclusions. */
  readonly total: number;
  /** Of those, how many have a date of death in Wikidata. */
  readonly with_death_date: number;
  /** The first {@link WIKIDATA_BEARERS_KEPT}: Polish citizens first, then most sitelinks. */
  readonly bearers: readonly WikidataBearer[];
}

// ---------------------------------------------------------------------------
// The surname as Wikidata labels it
// ---------------------------------------------------------------------------

function titleWord(word: string): string {
  const lower = word.toLocaleLowerCase("pl");
  return lower.charAt(0).toLocaleUpperCase("pl") + lower.slice(1);
}

/** "ŻMUDA-TRZEBIATOWSKI" → "Żmuda-Trzebiatowski": how Wikidata writes a Polish surname. */
export function wikidataSurnameLabel(surname: string): string {
  const clean = surname.trim().replace(/\s+/gu, " ");
  if (clean.length === 0) throw new Error("an empty surname cannot be searched");
  return clean
    .split(" ")
    .map((word) => word.split("-").map(titleWord).join("-"))
    .join(" ");
}

/** The masculine form of a feminine -ska/-cka/-dzka part, or the part unchanged. */
function masculinePart(part: string): string {
  return part.replace(/(sk|ck|dzk)a$/u, "$1i");
}

/**
 * The family-name labels to ask for: the surname, and for a feminine
 * -ska/-cka/-dzka form also its masculine item, which is where Wikidata files
 * many women. ADR-0025's other-form rule (`ADJECTIVAL_SKI_CKI_DZKI`), applied
 * to each part of a double surname.
 */
export function wikidataFamilyNameLabels(surname: string): readonly string[] {
  const label = wikidataSurnameLabel(surname);
  const masculine = label.split("-").map(masculinePart).join("-");
  return masculine === label ? [label] : [label, masculine];
}

function sparqlString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/** The first query: every person filed under one of the labels, with a Wikipedia article. */
export function wikidataBearersQuery(labels: readonly string[]): string {
  const values = labels
    .flatMap((label) => ["pl", "mul", "en"].map((lang) => `${sparqlString(label)}@${lang}`))
    .join(" ");
  const classes = WIKIDATA_FAMILY_NAME_CLASSES.map((q) => `wd:${q}`).join(" ");
  const polishStates = WIKIDATA_POLISH_STATES.map((q) => `wd:${q}`).join(", ");
  return [
    "SELECT ?person (MAX(?links) AS ?sitelinks) (MIN(YEAR(?b)) AS ?born) (MIN(YEAR(?d)) AS ?died)",
    "       (SAMPLE(?pc) AS ?polish)",
    "       (SAMPLE(?pl) AS ?label_pl) (SAMPLE(?mul) AS ?label_mul) (SAMPLE(?en) AS ?label_en) WHERE {",
    `  VALUES ?label { ${values} }`,
    `  VALUES ?cls { ${classes} }`,
    "  ?fn rdfs:label ?label ; wdt:P31 ?cls .",
    "  ?person wdt:P734 ?fn ; wdt:P31 wd:Q5 ; wikibase:sitelinks ?links .",
    '  FILTER EXISTS { ?a schema:about ?person ; schema:isPartOf/wikibase:wikiGroup "wikipedia" . }',
    "  OPTIONAL { ?person wdt:P569 ?b }",
    "  OPTIONAL { ?person wdt:P570 ?d }",
    `  OPTIONAL { ?person wdt:P27 ?pc FILTER(?pc IN (${polishStates})) }`,
    '  OPTIONAL { ?person rdfs:label ?pl FILTER(LANG(?pl) = "pl") }',
    '  OPTIONAL { ?person rdfs:label ?mul FILTER(LANG(?mul) = "mul") }',
    '  OPTIONAL { ?person rdfs:label ?en FILTER(LANG(?en) = "en") }',
    "} GROUP BY ?person",
  ].join("\n");
}

/** The second query: descriptions and articles for the people a summary keeps. */
export function wikidataDetailsQuery(qids: readonly string[]): string {
  for (const qid of qids) {
    if (!/^Q[1-9][0-9]*$/u.test(qid)) throw new Error(`not a Wikidata id: ${qid}`);
  }
  return [
    "SELECT ?person (SAMPLE(?dpl) AS ?description_pl) (SAMPLE(?den) AS ?description_en)",
    "       (SAMPLE(?plw) AS ?plwiki) (SAMPLE(?enw) AS ?enwiki) WHERE {",
    `  VALUES ?person { ${qids.map((q) => `wd:${q}`).join(" ")} }`,
    '  OPTIONAL { ?person schema:description ?dpl FILTER(LANG(?dpl) = "pl") }',
    '  OPTIONAL { ?person schema:description ?den FILTER(LANG(?den) = "en") }',
    "  OPTIONAL { ?plw schema:about ?person ; schema:isPartOf <https://pl.wikipedia.org/> }",
    "  OPTIONAL { ?enw schema:about ?person ; schema:isPartOf <https://en.wikipedia.org/> }",
    "} GROUP BY ?person",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Reading the answers
// ---------------------------------------------------------------------------

type Binding = Readonly<Record<string, { readonly value?: unknown } | undefined>>;

function bindingsOf(text: string, what: string): readonly Binding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new WikidataShapeError(what, "not JSON");
  }
  const bindings = (parsed as { results?: { bindings?: unknown } } | null)?.results?.bindings;
  if (!Array.isArray(bindings)) {
    throw new WikidataShapeError(`${what}.results.bindings`, "missing or not an array");
  }
  return bindings as readonly Binding[];
}

function text(b: Binding, key: string): string | null {
  const value = b[key]?.value;
  if (value === undefined) return null;
  if (typeof value !== "string") throw new WikidataShapeError(key, "not a string");
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function integer(b: Binding, key: string, path: string): number | null {
  const raw = text(b, key);
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isInteger(n))
    throw new WikidataShapeError(`${path}.${key}`, `not an integer: ${raw}`);
  return n;
}

function qidOf(b: Binding, path: string): string {
  const uri = text(b, "person");
  const qid = /^http:\/\/www\.wikidata\.org\/entity\/(Q[1-9][0-9]*)$/u.exec(uri ?? "")?.[1];
  if (qid === undefined) throw new WikidataShapeError(`${path}.person`, "not a Wikidata entity");
  return qid;
}

/** A name without Wikipedia's disambiguation: "Piotr Nowak (piłkarz)" → "Piotr Nowak". */
function bareName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/u, "").trim();
}

/** Whether a person's name ends with the surname as a whole word. */
export function nameEndsWithSurname(name: string, surname: string): boolean {
  const n = bareName(name).toLocaleLowerCase("pl");
  const s = wikidataSurnameLabel(surname).toLocaleLowerCase("pl");
  return n === s || n.endsWith(` ${s}`);
}

function shorten(description: string | null): string | null {
  if (description === null) return null;
  return description.length <= WIKIDATA_DESCRIPTION_MAX_CHARS
    ? description
    : `${description.slice(0, WIKIDATA_DESCRIPTION_MAX_CHARS - 1).trimEnd()}…`;
}

function qidNumber(qid: string): number {
  return Number(qid.slice(1));
}

export interface WikidataCandidate {
  readonly qid: string;
  readonly name: string;
  readonly born: number | null;
  readonly died: number | null;
  readonly sitelinks: number;
  readonly polish_citizen: boolean;
}

/**
 * The people the first answer names whose own name is the surname, minus the
 * excluded: Polish citizens first, then most sitelinks, then by id, so the
 * order is stable. A Polish reader is asking (the owner, 2026-10-03). A Polish
 * Wikipedia article was tried first and does not do it: 361 of NOWAK's 491
 * people have one, an American astronaut among them.
 */
export function exactBearers(
  surname: string,
  bearersResponse: string,
  excluded: readonly string[] = WIKIDATA_EXCLUDED_PEOPLE,
): readonly WikidataCandidate[] {
  const out: WikidataCandidate[] = [];
  const seen = new Set<string>();
  for (const [i, b] of bindingsOf(bearersResponse, "bearers").entries()) {
    const path = `bearers.results.bindings[${String(i)}]`;
    const qid = qidOf(b, path);
    if (seen.has(qid)) throw new WikidataShapeError(path, `${qid} appears twice`);
    seen.add(qid);
    const name = text(b, "label_pl") ?? text(b, "label_mul") ?? text(b, "label_en");
    if (name === null || !nameEndsWithSurname(name, surname)) continue;
    if (excluded.includes(qid)) continue;
    const sitelinks = integer(b, "sitelinks", path);
    if (sitelinks === null || sitelinks < 1) {
      throw new WikidataShapeError(`${path}.sitelinks`, "missing or below one");
    }
    out.push({
      qid,
      name: bareName(name),
      born: integer(b, "born", path),
      died: integer(b, "died", path),
      sitelinks,
      polish_citizen: polishCitizen(b, path),
    });
  }
  return out.sort(
    (a, b) =>
      Number(b.polish_citizen) - Number(a.polish_citizen) ||
      b.sitelinks - a.sitelinks ||
      qidNumber(a.qid) - qidNumber(b.qid),
  );
}

/** Whether the answer gives a Polish state as the person's citizenship; any other value is refused. */
function polishCitizen(b: Binding, path: string): boolean {
  const value = text(b, "polish");
  if (value === null) return false;
  const qid = /^http:\/\/www\.wikidata\.org\/entity\/(Q[1-9][0-9]*)$/u.exec(value)?.[1];
  if (qid === undefined || !WIKIDATA_POLISH_STATES.includes(qid)) {
    throw new WikidataShapeError(`${path}.polish`, `not a Polish state: ${value}`);
  }
  return true;
}

/** The people a summary keeps: the ids the details query is asked for. */
export function keptBearers(
  candidates: readonly WikidataCandidate[],
): readonly WikidataCandidate[] {
  return candidates.slice(0, WIKIDATA_BEARERS_KEPT);
}

function wikipediaUrl(value: string | null, host: string, path: string): string | null {
  if (value === null) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WikidataShapeError(path, "not a URL");
  }
  if (url.protocol !== "https:" || url.host !== host) {
    throw new WikidataShapeError(path, `not an article on ${host}`);
  }
  return url.toString();
}

/**
 * The summary of one surname's two answers. `detailsResponse` is null when
 * the first answer kept nobody, since there is nothing to ask about.
 */
export function summariseWikidataBearers(
  surname: string,
  bearersResponse: string,
  detailsResponse: string | null,
  excluded: readonly string[] = WIKIDATA_EXCLUDED_PEOPLE,
): WikidataBearers {
  const candidates = exactBearers(surname, bearersResponse, excluded);
  const kept = keptBearers(candidates);
  const details = new Map<string, Binding>();
  if (kept.length > 0) {
    if (detailsResponse === null) {
      throw new WikidataShapeError("details", "missing while bearers were kept");
    }
    for (const [i, b] of bindingsOf(detailsResponse, "details").entries()) {
      details.set(qidOf(b, `details.results.bindings[${String(i)}]`), b);
    }
  }
  return {
    version: WIKIDATA_BEARERS_VERSION,
    surname,
    labels: wikidataFamilyNameLabels(surname),
    total: candidates.length,
    with_death_date: candidates.filter((c) => c.died !== null).length,
    bearers: kept.map((c) => {
      const d = details.get(c.qid);
      if (d === undefined) throw new WikidataShapeError("details", `no row for ${c.qid}`);
      const pl = wikipediaUrl(text(d, "plwiki"), "pl.wikipedia.org", `details.${c.qid}.plwiki`);
      const en = wikipediaUrl(text(d, "enwiki"), "en.wikipedia.org", `details.${c.qid}.enwiki`);
      return {
        ...c,
        description_pl: shorten(text(d, "description_pl")),
        description_en: shorten(text(d, "description_en")),
        article_url: pl ?? en,
      };
    }),
  };
}
