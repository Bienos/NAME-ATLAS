import { PolonaShapeError } from "./errors.js";
import {
  alwaysNull,
  array,
  boolean,
  count,
  labels,
  map,
  nullableString,
  object,
  oneOf,
  parseJson,
  string,
  uuid,
} from "./read.js";
import { classifyPolonaRights } from "./rights.js";
import type { PolonaRights } from "./rights.js";

/**
 * Polona's two search endpoints, as observed on 2026-09-29 (TASK-031):
 *
 *   POST https://polona.pl/api/search-service/search/simple?query=…&page=…&pageSize=…&sort=…
 *   POST https://polona.pl/api/search-service/fulltext/polona/fulltext/{page}/{size}?sort=…&query=…
 *
 * Both return the same page envelope. A simple (metadata) hit locates an
 * object; a full-text hit also locates a page and carries OCR snippets.
 */

export type PolonaObjectType = "DIGITAL_OBJECT" | "VIRTUAL_OBJECT";

export interface PolonaField {
  readonly values: readonly string[];
  /** `TEXT` fields are displayed; `SEARCH` fields are the indexed forms. */
  readonly type: "TEXT" | "SEARCH";
}

export type PolonaFieldGroup = Readonly<Record<string, PolonaField>>;

export interface PolonaFacetValue {
  readonly value: string;
  readonly count: number;
}

interface PolonaHitBase {
  readonly objectId: string;
  readonly objectType: PolonaObjectType;
  readonly basicFields: PolonaFieldGroup;
  readonly expandedFields: PolonaFieldGroup;
  readonly hiddenFields: PolonaFieldGroup;
  readonly rights: PolonaRights;
  readonly instanceName: string;
  /** Entries may be null: two objects in the WILK capture carry `[null]`. */
  readonly documentTypes: readonly (string | null)[];
}

export interface PolonaMetadataHit extends PolonaHitBase {
  readonly hasOcrAlto: boolean;
  /** The object's identifier in Polona's previous system, where one exists. */
  readonly idInOldSystem: string | null;
}

export interface PolonaFulltextHit extends PolonaHitBase {
  readonly contentId: string;
  /** As served: `/download/digital-content/{id}`, relative to the API gateway. */
  readonly resourceUrl: string;
  /** The `{id}` in `resourceUrl`: the page's downloadable content, its ALTO file. */
  readonly resourceId: string;
  /**
   * As served, as an integer. Polona does not say what it counts from; the one
   * page traced (docs/sources/polona.md §15) was served as `1005` and
   * downloads as `…_1006_alto.xml`.
   */
  readonly pageNumber: number;
  /** OCR snippets around the match, with the match in `<em>…</em>`, as served. */
  readonly highlights: readonly string[];
}

export interface PolonaSearchPage<Hit> {
  readonly totalElements: number;
  readonly number: number;
  readonly size: number;
  readonly numberOfElements: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
  readonly hits: readonly Hit[];
  readonly facets: Readonly<Record<string, readonly PolonaFacetValue[]>>;
}

export interface ParsePolonaSearchOptions {
  /**
   * Hits deliberately removed from the response before it reached the parser
   * (fixtures only: `withheld_hit_indexes_as_served` in
   * `fixtures/polona/source-manifest.json`). A live response has none, so the
   * default makes `hits.length === numberOfElements` strict.
   */
  readonly withheldHits?: number;
}

const ENVELOPE = [
  "totalElements",
  "number",
  "size",
  "numberOfElements",
  "totalPages",
  "first",
  "last",
  "hits",
  "aggregations",
] as const;

const FIELD_GROUPS = ["basicFields", "expandedFields", "hiddenFields"] as const;

const ATTRIBUTE_SLOTS = [
  "stringArrValues",
  "stringValue",
  "longValue",
  "dateValue",
  "boolValue",
] as const;

type AttributeSlot = (typeof ATTRIBUTE_SLOTS)[number];

const VALUE_TYPE_SLOT: Readonly<Record<string, AttributeSlot>> = {
  STRING: "stringValue",
  BOOL: "boolValue",
  STRING_ARR: "stringArrValues",
};

/** Every attribute observed, with the value type it always had. */
const ATTRIBUTE_VALUE_TYPES: Readonly<Record<string, "STRING" | "BOOL" | "STRING_ARR">> = {
  copyrightProtected: "BOOL",
  documentTypes: "STRING_ARR",
  hasOcrAlto: "BOOL",
  idInOldSystem: "STRING",
  instanceAvatarUrl: "STRING",
  instanceName: "STRING",
  licenseName: "STRING",
  mainContentMimetype: "STRING",
  objectType: "STRING",
  thumbnail: "STRING",
};

const COMMON_ATTRIBUTES = [
  "copyrightProtected",
  "documentTypes",
  "instanceAvatarUrl",
  "instanceName",
  "licenseName",
  "objectType",
] as const;

const RESOURCE_URL = /^\/download\/digital-content\/([0-9a-f-]{36})$/;
const DIGITS = /^[0-9]+$/;

function fieldGroup(value: unknown, path: string): PolonaFieldGroup {
  const group: Record<string, PolonaField> = {};
  for (const [name, raw] of Object.entries(map(value, path))) {
    const at = `${path}.${name}`;
    const field = object(raw, at, ["name", "values", "labels", "type"]);
    if (string(field["name"], `${at}.name`) !== name) {
      throw new PolonaShapeError(
        "unexpected_value",
        `${at}.name`,
        "field name differs from its key",
      );
    }
    const values = array(field["values"], `${at}.values`).map((entry, index) =>
      string(entry, `${at}.values[${index}]`),
    );
    if (values.length === 0) {
      throw new PolonaShapeError("unexpected_value", `${at}.values`, "no field was observed empty");
    }
    labels(field["labels"], `${at}.labels`);
    group[name] = { values, type: oneOf(field["type"], `${at}.type`, ["TEXT", "SEARCH"]) };
  }
  return group;
}

type AttributeValue = string | boolean | readonly (string | null)[];

function attributes(
  value: unknown,
  path: string,
  required: readonly string[],
  optional: readonly string[],
): Readonly<Record<string, AttributeValue>> {
  const record = object(value, path, required, optional);
  const out: Record<string, AttributeValue> = {};
  for (const [name, raw] of Object.entries(record)) {
    const at = `${path}.${name}`;
    const attribute = object(raw, at, ["name", ...ATTRIBUTE_SLOTS, "labels", "type", "valueType"]);
    if (string(attribute["name"], `${at}.name`) !== name) {
      throw new PolonaShapeError(
        "unexpected_value",
        `${at}.name`,
        "attribute name differs from its key",
      );
    }
    const expected = ATTRIBUTE_VALUE_TYPES[name]!;
    oneOf(attribute["valueType"], `${at}.valueType`, [expected]);
    oneOf(attribute["type"], `${at}.type`, ["TEXT"]);
    labels(attribute["labels"], `${at}.labels`);
    const slot = VALUE_TYPE_SLOT[expected]!;
    for (const other of ATTRIBUTE_SLOTS) {
      if (other !== slot) alwaysNull(attribute[other], `${at}.${other}`);
    }
    const rawValue = attribute[slot];
    out[name] =
      expected === "BOOL"
        ? boolean(rawValue, `${at}.${slot}`)
        : expected === "STRING"
          ? string(rawValue, `${at}.${slot}`)
          : array(rawValue, `${at}.${slot}`).map((entry, index) =>
              nullableString(entry, `${at}.${slot}[${index}]`),
            );
  }
  return out;
}

function facets(
  value: unknown,
  path: string,
): Readonly<Record<string, readonly PolonaFacetValue[]>> {
  const out: Record<string, readonly PolonaFacetValue[]> = {};
  for (const [name, raw] of Object.entries(map(value, path))) {
    const at = `${path}.${name}`;
    const facet = object(raw, at, ["values", "labels", "indexTarget", "type"]);
    labels(facet["labels"], `${at}.labels`);
    string(facet["indexTarget"], `${at}.indexTarget`);
    oneOf(facet["type"], `${at}.type`, ["KEYWORD", "BOOLEAN"]);
    out[name] = array(facet["values"], `${at}.values`).map((entry, index) => {
      const bucket = object(entry, `${at}.values[${index}]`, ["value", "count"]);
      return {
        value: string(bucket["value"], `${at}.values[${index}].value`),
        count: count(bucket["count"], `${at}.values[${index}].count`),
      };
    });
  }
  return out;
}

function hitBase(
  hit: Readonly<Record<string, unknown>>,
  path: string,
  attrs: Readonly<Record<string, AttributeValue>>,
  objectTypes: readonly PolonaObjectType[],
): PolonaHitBase {
  const expandedFields = fieldGroup(hit["expandedFields"], `${path}.expandedFields`);
  const rightsField = expandedFields["rights"];
  if (rightsField === undefined) {
    throw new PolonaShapeError(
      "missing_field",
      `${path}.expandedFields.rights`,
      "every observed hit carried a rights field",
    );
  }
  if (rightsField.values.length !== 1) {
    throw new PolonaShapeError(
      "unexpected_value",
      `${path}.expandedFields.rights.values`,
      "every observed hit carried exactly one rights value",
    );
  }
  alwaysNull(hit["score"], `${path}.score`);
  return {
    objectId: uuid(hit["objectId"], `${path}.objectId`),
    objectType: oneOf(attrs["objectType"], `${path}.attributes.objectType`, objectTypes),
    basicFields: fieldGroup(hit["basicFields"], `${path}.basicFields`),
    expandedFields,
    hiddenFields: fieldGroup(hit["hiddenFields"], `${path}.hiddenFields`),
    rights: classifyPolonaRights(
      {
        licenceName: attrs["licenseName"] as string,
        copyrightProtected: attrs["copyrightProtected"] as boolean,
        statement: rightsField.values[0]!,
      },
      `${path}.attributes.licenseName`,
    ),
    instanceName: attrs["instanceName"] as string,
    documentTypes: attrs["documentTypes"] as readonly (string | null)[],
  };
}

function metadataHit(value: unknown, path: string): PolonaMetadataHit {
  const hit = object(value, path, ["objectId", "score", "attributes", ...FIELD_GROUPS]);
  const attrs = attributes(
    hit["attributes"],
    `${path}.attributes`,
    [...COMMON_ATTRIBUTES, "hasOcrAlto"],
    ["idInOldSystem", "mainContentMimetype", "thumbnail"],
  );
  return {
    ...hitBase(hit, path, attrs, ["DIGITAL_OBJECT", "VIRTUAL_OBJECT"]),
    hasOcrAlto: attrs["hasOcrAlto"] as boolean,
    idInOldSystem: (attrs["idInOldSystem"] as string | undefined) ?? null,
  };
}

function fulltextHit(value: unknown, path: string): PolonaFulltextHit {
  const hit = object(value, path, [
    "contentId",
    "objectId",
    "resourceUrl",
    "pageNumber",
    "highlights",
    "score",
    "attributes",
    ...FIELD_GROUPS,
  ]);
  const attrs = attributes(hit["attributes"], `${path}.attributes`, COMMON_ATTRIBUTES, []);
  const resourceUrl = string(hit["resourceUrl"], `${path}.resourceUrl`);
  const resource = RESOURCE_URL.exec(resourceUrl);
  if (resource === null) {
    throw new PolonaShapeError(
      "unexpected_value",
      `${path}.resourceUrl`,
      `unexpected resource URL ${JSON.stringify(resourceUrl)}`,
    );
  }
  const pageNumber = string(hit["pageNumber"], `${path}.pageNumber`);
  if (!DIGITS.test(pageNumber)) {
    throw new PolonaShapeError(
      "unexpected_value",
      `${path}.pageNumber`,
      `page number ${JSON.stringify(pageNumber)} is not digits`,
    );
  }
  const highlights = array(hit["highlights"], `${path}.highlights`).map((entry, index) =>
    string(entry, `${path}.highlights[${index}]`),
  );
  if (highlights.length === 0) {
    throw new PolonaShapeError(
      "unexpected_value",
      `${path}.highlights`,
      "every observed full-text hit carried a snippet",
    );
  }
  return {
    ...hitBase(hit, path, attrs, ["DIGITAL_OBJECT"]),
    contentId: uuid(hit["contentId"], `${path}.contentId`),
    resourceUrl,
    resourceId: uuid(resource[1], `${path}.resourceUrl`),
    pageNumber: Number.parseInt(pageNumber, 10),
    highlights,
  };
}

function searchPage<Hit>(
  text: string,
  options: ParsePolonaSearchOptions,
  envelope: { readonly extra: readonly string[]; readonly hitsMayBeNull: boolean },
  hit: (value: unknown, path: string) => Hit,
): PolonaSearchPage<Hit> {
  const page = object(parseJson(text), "$", [...ENVELOPE, ...envelope.extra]);
  // Served as null by the simple search, and never served by the full-text one.
  if (envelope.extra.includes("timeAggregations")) {
    alwaysNull(page["timeAggregations"], "$.timeAggregations");
  }

  const numberOfElements = count(page["numberOfElements"], "$.numberOfElements");
  const size = count(page["size"], "$.size");
  if (numberOfElements > size) {
    throw new PolonaShapeError(
      "hit_count_mismatch",
      "$.numberOfElements",
      `${numberOfElements} exceeds the page size ${size}`,
    );
  }

  let hits: Hit[];
  if (page["hits"] === null && envelope.hitsMayBeNull) {
    // Observed once: the simple search answered a zero-hit query with `null`.
    hits = [];
  } else {
    hits = array(page["hits"], "$.hits").map((entry, index) => hit(entry, `$.hits[${index}]`));
  }
  const withheld = options.withheldHits ?? 0;
  if (hits.length + withheld !== numberOfElements) {
    throw new PolonaShapeError(
      "hit_count_mismatch",
      "$.hits",
      `${hits.length} hits and ${withheld} withheld, but numberOfElements is ${numberOfElements}`,
    );
  }

  return {
    totalElements: count(page["totalElements"], "$.totalElements"),
    number: count(page["number"], "$.number"),
    size,
    numberOfElements,
    totalPages: count(page["totalPages"], "$.totalPages"),
    first: boolean(page["first"], "$.first"),
    last: boolean(page["last"], "$.last"),
    hits,
    facets: facets(page["aggregations"], "$.aggregations"),
  };
}

/** Parses a response from `search-service/search/simple` (metadata search). */
export function parsePolonaSimpleSearch(
  text: string,
  options: ParsePolonaSearchOptions = {},
): PolonaSearchPage<PolonaMetadataHit> {
  return searchPage(
    text,
    options,
    { extra: ["timeAggregations"], hitsMayBeNull: true },
    metadataHit,
  );
}

/** Parses a response from `search-service/fulltext/polona/fulltext/{page}/{size}` (OCR search). */
export function parsePolonaFulltextSearch(
  text: string,
  options: ParsePolonaSearchOptions = {},
): PolonaSearchPage<PolonaFulltextHit> {
  return searchPage(text, options, { extra: [], hitsMayBeNull: false }, fulltextHit);
}

/**
 * A search response's envelope, with its hits left unparsed (TASK-054).
 *
 * The archive loader needs a page's total and facets even when one of its hits
 * carries a licence or statement the vocabulary has not met: refusing the
 * whole page for one hit would lose the counts that are the point of the
 * search. The envelope is checked exactly as the full parsers check it, and
 * each hit is then parsed on its own with {@link parsePolonaFulltextHit} or
 * {@link parsePolonaMetadataHit}, so a hit that fails closed is skipped and
 * never quoted (ADR-0024 §2.7).
 */
export interface PolonaSearchEnvelope {
  readonly totalElements: number;
  readonly facets: Readonly<Record<string, readonly PolonaFacetValue[]>>;
  readonly rawHits: readonly unknown[];
}

export function parsePolonaSearchEnvelope(
  text: string,
  kind: "simple" | "fulltext",
): PolonaSearchEnvelope {
  const extra = kind === "simple" ? ["timeAggregations"] : [];
  const page = object(parseJson(text), "$", [...ENVELOPE, ...extra]);
  if (kind === "simple") alwaysNull(page["timeAggregations"], "$.timeAggregations");
  const numberOfElements = count(page["numberOfElements"], "$.numberOfElements");
  const size = count(page["size"], "$.size");
  if (numberOfElements > size) {
    throw new PolonaShapeError(
      "hit_count_mismatch",
      "$.numberOfElements",
      `${numberOfElements} exceeds the page size ${size}`,
    );
  }
  const rawHits = page["hits"] === null && kind === "simple" ? [] : array(page["hits"], "$.hits");
  if (rawHits.length !== numberOfElements) {
    throw new PolonaShapeError(
      "hit_count_mismatch",
      "$.hits",
      `${rawHits.length} hits, but numberOfElements is ${numberOfElements}`,
    );
  }
  return {
    totalElements: count(page["totalElements"], "$.totalElements"),
    facets: facets(page["aggregations"], "$.aggregations"),
    rawHits,
  };
}

/** One full-text hit, parsed and its rights classified, failing closed. */
export function parsePolonaFulltextHit(value: unknown, path = "$"): PolonaFulltextHit {
  return fulltextHit(value, path);
}

/** One metadata hit, parsed and its rights classified, failing closed. */
export function parsePolonaMetadataHit(value: unknown, path = "$"): PolonaMetadataHit {
  return metadataHit(value, path);
}
