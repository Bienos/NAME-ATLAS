import { PolonaShapeError } from "./errors.js";
import {
  alwaysNull,
  array,
  boolean,
  count,
  nullableCount,
  nullableString,
  object,
  oneOf,
  parseJson,
  string,
  uuid,
} from "./read.js";
import { classifyPolonaRights, polonaLicence } from "./rights.js";
import type { PolonaRights } from "./rights.js";

/**
 * Polona's object-metadata endpoints, as observed on 2026-09-29 (TASK-031):
 *
 *   GET https://polona.pl/api/library-object-query/digital-objects/{id}/details
 *   GET https://polona.pl/api/library-object-query/digital-objects/{id}/front-office-details
 *   GET https://polona.pl/api/library-object-query/virtual-objects/{id}/front-office-details
 *
 * A search hit's `objectType` attribute decides which applies: a
 * `VIRTUAL_OBJECT` id (an article inside a journal issue, say) answers 404
 * `DIGITAL_OBJECT_NOT_FOUND` on the `digital-objects` paths.
 */

export interface PolonaObjectMetadata {
  readonly title: string | null;
  readonly sequentialDesignation: string | null;
  readonly creator: string | null;
  readonly contributor: string | null;
  readonly date: string | null;
  readonly dateDescriptive: string | null;
  readonly rights: string | null;
  readonly imprint: string | null;
  readonly edition: string | null;
  readonly publisher: string | null;
}

export interface PolonaInstance {
  readonly id: number;
  readonly name: string;
}

export interface PolonaIdentification {
  readonly id: string;
  readonly identificationTypeName: "Prasa";
  readonly title: string;
}

export interface PolonaDigitalObjectDetails {
  readonly uuid: string;
  readonly contextId: string;
  /** The title page's IIIF Image API `info.json`; null on some objects. */
  readonly titlePageImageInfoUrl: string | null;
  readonly shared: boolean;
  readonly rights: PolonaRights;
  readonly licence: {
    readonly id: string;
    readonly baseUrl: string;
    readonly englishName: string;
    readonly downloadable: boolean;
    readonly active: boolean;
    /** Served on every object; Polona does not say what it means. */
    readonly pdnPublicationSuited: boolean;
  };
  readonly creationDate: string;
  readonly version: number;
}

export interface PolonaDigitalObjectFrontOfficeDetails {
  readonly rights: PolonaRights;
  readonly shared: boolean;
  readonly identifications: readonly PolonaIdentification[];
  readonly virtualObjectIds: readonly string[];
  readonly metadata: PolonaObjectMetadata;
  readonly instance: PolonaInstance;
}

export interface PolonaVirtualObjectFrontOfficeDetails {
  readonly rights: PolonaRights;
  readonly shared: boolean;
  readonly parentDigitalObjectId: string;
  readonly parentDigitalObjectShared: boolean;
  readonly metadata: PolonaObjectMetadata;
  readonly instance: PolonaInstance;
}

const METADATA_FIELDS = [
  "title",
  "sequentialDesignation",
  "creator",
  "contributor",
  "date",
  "dateDescriptive",
  "rights",
  "imprint",
  "edition",
  "publisher",
] as const;

const IIIF_INFO_URL = /^https:\/\/polona\.pl\/iiif\/3\/[0-9a-f-]{36}\/info\.json$/;

function metadata(value: unknown, path: string): PolonaObjectMetadata {
  const record = object(value, path, METADATA_FIELDS);
  const out: Record<string, string | null> = {};
  for (const field of METADATA_FIELDS) {
    out[field] = nullableString(record[field], `${path}.${field}`);
  }
  return out as unknown as PolonaObjectMetadata;
}

function instance(value: unknown, path: string): PolonaInstance {
  const record = object(value, path, ["id", "name", "avatarUrl"]);
  string(record["avatarUrl"], `${path}.avatarUrl`);
  return { id: count(record["id"], `${path}.id`), name: string(record["name"], `${path}.name`) };
}

function cover(value: unknown, path: string): void {
  if (value === null) return;
  const record = object(value, path, [
    "id",
    "fileStorageId",
    "downloadUrl",
    "publisherNameAndId",
    "objectVersion",
    "prevFileStorageId",
  ]);
  uuid(record["id"], `${path}.id`);
  string(record["fileStorageId"], `${path}.fileStorageId`);
  string(record["downloadUrl"], `${path}.downloadUrl`);
  for (const field of ["publisherNameAndId", "objectVersion", "prevFileStorageId"]) {
    alwaysNull(record[field], `${path}.${field}`);
  }
}

/**
 * The short licence record both front-office responses carry. Its id and
 * `downloadable` flag must agree with the vocabulary, or the rights it names
 * are not the rights this parser knows.
 */
function frontOfficeRights(
  record: Readonly<Record<string, unknown>>,
  statement: string | null,
): PolonaRights {
  const licence = object(record["license"], "$.license", [
    "id",
    "baseName",
    "downloadable",
    "avatarUrl",
  ]);
  alwaysNull(licence["avatarUrl"], "$.license.avatarUrl");
  const rights = classifyPolonaRights(
    {
      licenceName: string(licence["baseName"], "$.license.baseName"),
      copyrightProtected: boolean(record["copyrightProtected"], "$.copyrightProtected"),
      statement,
    },
    "$.license",
  );
  const known = polonaLicence(rights.licence);
  if (uuid(licence["id"], "$.license.id") !== known.id) {
    throw new PolonaShapeError(
      "inconsistent_rights",
      "$.license.id",
      `${known.key} was only observed with id ${known.id}`,
    );
  }
  if (boolean(licence["downloadable"], "$.license.downloadable") !== known.downloadable) {
    throw new PolonaShapeError(
      "inconsistent_rights",
      "$.license.downloadable",
      `${known.key} was only observed with downloadable=${known.downloadable}`,
    );
  }
  return rights;
}

/** Parses `digital-objects/{id}/details`. */
export function parsePolonaDigitalObjectDetails(text: string): PolonaDigitalObjectDetails {
  const record = object(
    parseJson(text),
    "$",
    [
      "uuid",
      "contextId",
      "titlePage",
      "shared",
      "copyrightProtected",
      "license",
      "copyrightHints",
      "creationDate",
      "deleted",
      "objectName",
      "version",
    ],
    ["copies", "cover"],
  );

  const titlePage = object(record["titlePage"], "$.titlePage", [
    "uuid",
    "label",
    "info",
    "width",
    "height",
    "alternativeTiles",
  ]);
  uuid(titlePage["uuid"], "$.titlePage.uuid");
  nullableString(
    object(titlePage["label"], "$.titlePage.label", ["pl"])["pl"],
    "$.titlePage.label.pl",
  );
  const info = nullableString(titlePage["info"], "$.titlePage.info");
  if (info !== null && !IIIF_INFO_URL.test(info)) {
    throw new PolonaShapeError(
      "unexpected_value",
      "$.titlePage.info",
      `unexpected IIIF URL ${JSON.stringify(info)}`,
    );
  }
  nullableCount(titlePage["width"], "$.titlePage.width");
  nullableCount(titlePage["height"], "$.titlePage.height");
  alwaysNull(titlePage["alternativeTiles"], "$.titlePage.alternativeTiles");

  const licence = object(record["license"], "$.license", [
    "id",
    "digitalObjects",
    "virtualObjects",
    "baseName",
    "baseUrl",
    "downloadable",
    "active",
    "pdnPublicationSuited",
    "translations",
    "avatarUrl",
  ]);
  alwaysNull(licence["digitalObjects"], "$.license.digitalObjects");
  alwaysNull(licence["virtualObjects"], "$.license.virtualObjects");
  alwaysNull(licence["avatarUrl"], "$.license.avatarUrl");
  const rights = classifyPolonaRights(
    {
      licenceName: string(licence["baseName"], "$.license.baseName"),
      copyrightProtected: boolean(record["copyrightProtected"], "$.copyrightProtected"),
      statement: null,
    },
    "$.license",
  );
  const known = polonaLicence(rights.licence);
  const translations = array(licence["translations"], "$.license.translations").map(
    (entry, index) => {
      const at = `$.license.translations[${index}]`;
      const translation = object(entry, at, ["id", "code", "name"]);
      uuid(translation["id"], `${at}.id`);
      return {
        code: oneOf(translation["code"], `${at}.code`, ["en"]),
        name: string(translation["name"], `${at}.name`),
      };
    },
  );
  const englishName = translations.length === 1 ? translations[0]!.name : undefined;
  const observed = {
    id: uuid(licence["id"], "$.license.id"),
    baseUrl: string(licence["baseUrl"], "$.license.baseUrl"),
    englishName,
    downloadable: boolean(licence["downloadable"], "$.license.downloadable"),
  };
  for (const key of ["id", "baseUrl", "englishName", "downloadable"] as const) {
    if (observed[key] !== known[key]) {
      throw new PolonaShapeError(
        "inconsistent_rights",
        `$.license.${key}`,
        `${known.key} was only observed with ${key} ${JSON.stringify(known[key])}, found ${JSON.stringify(observed[key])}`,
      );
    }
  }

  // Empty on every observed object. A hint is a rights statement this parser
  // cannot read, so a non-empty list is refused rather than ignored.
  if (array(record["copyrightHints"], "$.copyrightHints").length !== 0) {
    throw new PolonaShapeError(
      "unexpected_value",
      "$.copyrightHints",
      "no copyright hint was observed",
    );
  }
  if (boolean(record["deleted"], "$.deleted")) {
    throw new PolonaShapeError("unexpected_value", "$.deleted", "no observed object was deleted");
  }
  if (Object.hasOwn(record, "copies")) count(record["copies"], "$.copies");
  if (Object.hasOwn(record, "cover")) cover(record["cover"], "$.cover");
  string(record["objectName"], "$.objectName");

  return {
    uuid: uuid(record["uuid"], "$.uuid"),
    contextId: uuid(record["contextId"], "$.contextId"),
    titlePageImageInfoUrl: info,
    shared: boolean(record["shared"], "$.shared"),
    rights,
    licence: {
      id: known.id,
      baseUrl: known.baseUrl,
      englishName: known.englishName,
      downloadable: known.downloadable,
      active: boolean(licence["active"], "$.license.active"),
      pdnPublicationSuited: boolean(
        licence["pdnPublicationSuited"],
        "$.license.pdnPublicationSuited",
      ),
    },
    creationDate: string(record["creationDate"], "$.creationDate"),
    version: count(record["version"], "$.version"),
  };
}

/** Parses `digital-objects/{id}/front-office-details`. */
export function parsePolonaDigitalObjectFrontOfficeDetails(
  text: string,
): PolonaDigitalObjectFrontOfficeDetails {
  const record = object(parseJson(text), "$", [
    "license",
    "copyrightProtected",
    "shared",
    "identifications",
    "virtualObjects",
    "cover",
    "metadata",
    "instance",
    "publisherInstanceId",
  ]);
  const meta = metadata(record["metadata"], "$.metadata");
  cover(record["cover"], "$.cover");
  nullableCount(record["publisherInstanceId"], "$.publisherInstanceId");

  const identifications = array(record["identifications"], "$.identifications").map(
    (entry, index) => {
      const at = `$.identifications[${index}]`;
      const identification = object(entry, at, ["id", "identificationTypeName", "metadata"]);
      const identMeta = object(identification["metadata"], `${at}.metadata`, [
        "title",
        "sequentialDesignation",
      ]);
      alwaysNull(identMeta["sequentialDesignation"], `${at}.metadata.sequentialDesignation`);
      return {
        id: uuid(identification["id"], `${at}.id`),
        identificationTypeName: oneOf(
          identification["identificationTypeName"],
          `${at}.identificationTypeName`,
          ["Prasa"],
        ),
        title: string(identMeta["title"], `${at}.metadata.title`),
      };
    },
  );

  const virtualObjectIds = array(record["virtualObjects"], "$.virtualObjects").map(
    (entry, index) => {
      const at = `$.virtualObjects[${index}]`;
      const virtualObject = object(entry, at, ["id", "metadata"]);
      const voMeta = object(virtualObject["metadata"], `${at}.metadata`, [
        "title",
        "sequentialDesignation",
        "pageScope",
        "contentOf",
      ]);
      string(voMeta["title"], `${at}.metadata.title`);
      alwaysNull(voMeta["sequentialDesignation"], `${at}.metadata.sequentialDesignation`);
      alwaysNull(voMeta["pageScope"], `${at}.metadata.pageScope`);
      string(voMeta["contentOf"], `${at}.metadata.contentOf`);
      return uuid(virtualObject["id"], `${at}.id`);
    },
  );

  return {
    rights: frontOfficeRights(record, meta.rights),
    shared: boolean(record["shared"], "$.shared"),
    identifications,
    virtualObjectIds,
    metadata: meta,
    instance: instance(record["instance"], "$.instance"),
  };
}

/** Parses `virtual-objects/{id}/front-office-details`. */
export function parsePolonaVirtualObjectFrontOfficeDetails(
  text: string,
): PolonaVirtualObjectFrontOfficeDetails {
  const record = object(parseJson(text), "$", [
    "license",
    "parentDigitalObjectShared",
    "shared",
    "copyrightProtected",
    "publicSharingPriority",
    "identifications",
    "parentDigitalObject",
    "cover",
    "metadata",
    "instance",
    "publisherInstanceId",
  ]);
  const meta = metadata(record["metadata"], "$.metadata");
  alwaysNull(record["cover"], "$.cover");
  alwaysNull(record["publisherInstanceId"], "$.publisherInstanceId");
  boolean(record["publicSharingPriority"], "$.publicSharingPriority");
  if (array(record["identifications"], "$.identifications").length !== 0) {
    throw new PolonaShapeError(
      "unexpected_value",
      "$.identifications",
      "no virtual object was observed with an identification",
    );
  }
  const parent = object(record["parentDigitalObject"], "$.parentDigitalObject", ["id", "metadata"]);
  const parentMeta = object(parent["metadata"], "$.parentDigitalObject.metadata", [
    "title",
    "sequentialDesignation",
  ]);
  nullableString(parentMeta["title"], "$.parentDigitalObject.metadata.title");
  nullableString(
    parentMeta["sequentialDesignation"],
    "$.parentDigitalObject.metadata.sequentialDesignation",
  );

  return {
    rights: frontOfficeRights(record, meta.rights),
    shared: boolean(record["shared"], "$.shared"),
    parentDigitalObjectId: uuid(parent["id"], "$.parentDigitalObject.id"),
    parentDigitalObjectShared: boolean(
      record["parentDigitalObjectShared"],
      "$.parentDigitalObjectShared",
    ),
    metadata: meta,
    instance: instance(record["instance"], "$.instance"),
  };
}
