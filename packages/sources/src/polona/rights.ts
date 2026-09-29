import { PolonaShapeError } from "./errors.js";

/**
 * Polona's rights vocabulary, exactly as observed on 2026-09-29 (TASK-031),
 * and its mapping onto ADR-0007's dimensions.
 *
 * Every string below was read from a real response in `fixtures/polona/` or,
 * for the one statement only withheld hits carried, from the served capture
 * whose digest `source-manifest.json` records. A value not listed here is
 * rejected, never guessed at: an unknown licence is the case ADR-0007 §1
 * exists for.
 *
 * The meaning of each value is Polona's own, from its FAQ answer "Co oznaczają
 * informacje wyświetlane w polu „Prawa”?" and the licence records' URLs. The
 * quotations and reasoning are in `docs/sources/polona.md` §10–11, whose
 * mapping table `rights.test.ts` holds equal to `POLONA_RIGHTS_MAPPING`.
 */

/** ADR-0007's permission values. Restated because `packages/truth` depends on this package. */
export type PolonaPermission = "ALLOWED" | "CONDITIONAL" | "UNKNOWN" | "PROHIBITED";

export type PolonaLicenceKey =
  "PUBLIC_DOMAIN" | "PROTECTED_NO_LICENCE" | "PROTECTED_LIMITED_LICENCE";

export type PolonaStatementKey =
  | "PUBLIC_DOMAIN"
  | "PROTECTED_READING_ROOMS"
  | "PUBLISHER_CONSENT_NON_COMMERCIAL"
  | "PUBLISHER_CONSENT"
  | "OPAQUE_B12259E5";

/** The free-text rights statements (`rights` field, `metadata.rights`), byte for byte. */
export const POLONA_RIGHTS_STATEMENTS: Readonly<Record<PolonaStatementKey, string>> = {
  PUBLIC_DOMAIN:
    "Domena Publiczna. Wolno zwielokrotniać, zmieniać i rozpowszechniać oraz wykonywać utwór, " +
    "nawet w celach komercyjnych, bez konieczności pytania o zgodę. Wykorzystując utwór należy " +
    "pamiętać o poszanowaniu autorskich praw osobistych Twórcy.",
  PROTECTED_READING_ROOMS:
    "Publikacja chroniona prawem autorskim - reprodukcja cyfrowa dostępna w czytelniach BN i na " +
    "terminalach Academiki",
  PUBLISHER_CONSENT_NON_COMMERCIAL:
    "Publikacja udostępniona za zgodą wydawcy. Całość ani żadna z jej części nie może być " +
    "przetwarzana ani wykorzystywana w celach komercyjnych",
  PUBLISHER_CONSENT: "Publikacja udostępniona za zgodą wydawcy.",
  // Two metadata-search hits carry this UUID where every other hit carries
  // text. Polona does not say what it identifies, so it states nothing.
  OPAQUE_B12259E5: "b12259e5-5746-4e66-bb96-9b2f542c8339",
};

export interface PolonaLicence {
  readonly key: PolonaLicenceKey;
  /** `license.id` */
  readonly id: string;
  /** `license.baseName`, and the `licenseName` attribute on search hits. */
  readonly baseName: string;
  /** `license.baseUrl` */
  readonly baseUrl: string;
  /** `license.translations[code = en].name` */
  readonly englishName: string;
  /** `license.downloadable` */
  readonly downloadable: boolean;
  /** The `copyrightProtected` value every observed object with this licence carried. */
  readonly copyrightProtected: boolean;
  /** The statements observed alongside this licence. `null` (no statement) was observed for all three. */
  readonly statements: readonly PolonaStatementKey[];
}

export const POLONA_LICENCES: readonly PolonaLicence[] = [
  {
    key: "PUBLIC_DOMAIN",
    id: "18b9d0e1-9bc5-46de-a879-99ad28bf7142",
    baseName: "Domena Publiczna",
    baseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    englishName: "Public Domain Mark 1.0",
    downloadable: true,
    copyrightProtected: false,
    statements: ["PUBLIC_DOMAIN"],
  },
  {
    key: "PROTECTED_NO_LICENCE",
    id: "3a99f116-91e7-48e7-88f8-bdffbd746a54",
    baseName: "Zawartość chroniona - brak licencji",
    baseUrl: "http://www.europeana.eu/rights/rr-r/",
    englishName: "Rights Reserved - Restricted Access",
    downloadable: false,
    copyrightProtected: true,
    statements: ["PROTECTED_READING_ROOMS"],
  },
  {
    key: "PROTECTED_LIMITED_LICENCE",
    id: "c94dc431-97bc-418f-aa2d-57c7ebffda1f",
    baseName: "Zawartość chroniona - licencja ograniczona",
    baseUrl: "https://www.europeana.eu/pl/rights/rr-r",
    englishName: "Rights Reserved - Limited Access",
    downloadable: false,
    copyrightProtected: false,
    statements: ["PUBLISHER_CONSENT_NON_COMMERCIAL", "PUBLISHER_CONSENT", "OPAQUE_B12259E5"],
  },
];

export interface PolonaRights {
  readonly licence: PolonaLicenceKey;
  readonly copyrightProtected: boolean;
  readonly statement: PolonaStatementKey | null;
}

export interface PolonaRightsObservation {
  readonly licenceName: string;
  readonly copyrightProtected: boolean;
  readonly statement: string | null;
}

export function polonaLicence(key: PolonaLicenceKey): PolonaLicence {
  const licence = POLONA_LICENCES.find((candidate) => candidate.key === key);
  if (licence === undefined) throw new Error(`no Polona licence ${key}`);
  return licence;
}

/**
 * Reads the rights an object states, failing closed.
 *
 * Three things are refused: a licence name never observed, a statement never
 * observed, and a combination never observed (a public-domain licence on a
 * `copyrightProtected` object, say). The last is refused because Polona states
 * the meaning of each value, not of every pairing, and a pairing it never
 * served has no stated meaning.
 */
export function classifyPolonaRights(
  observed: PolonaRightsObservation,
  path: string,
): PolonaRights {
  const licence = POLONA_LICENCES.find((candidate) => candidate.baseName === observed.licenceName);
  if (licence === undefined) {
    throw new PolonaShapeError(
      "unknown_licence",
      path,
      `licence ${JSON.stringify(observed.licenceName)} is not in the observed vocabulary`,
    );
  }
  if (observed.copyrightProtected !== licence.copyrightProtected) {
    throw new PolonaShapeError(
      "inconsistent_rights",
      path,
      `${licence.key} was only observed with copyrightProtected=${licence.copyrightProtected}`,
    );
  }
  if (observed.statement === null) {
    return {
      licence: licence.key,
      copyrightProtected: observed.copyrightProtected,
      statement: null,
    };
  }
  const statement = (Object.keys(POLONA_RIGHTS_STATEMENTS) as PolonaStatementKey[]).find(
    (key) => POLONA_RIGHTS_STATEMENTS[key] === observed.statement,
  );
  if (statement === undefined) {
    throw new PolonaShapeError(
      "unknown_rights_statement",
      path,
      `rights statement ${JSON.stringify(observed.statement)} is not in the observed vocabulary`,
    );
  }
  if (!licence.statements.includes(statement)) {
    throw new PolonaShapeError(
      "inconsistent_rights",
      path,
      `statement ${statement} was never observed with licence ${licence.key}`,
    );
  }
  return { licence: licence.key, copyrightProtected: observed.copyrightProtected, statement };
}

/**
 * One row of the mapping table: what an observed (licence, statement) pair
 * means in ADR-0007's terms. `statement: "ANY"` covers every statement the
 * licence was observed with, including none.
 */
export interface PolonaRightsMappingRow {
  readonly licence: PolonaLicenceKey;
  readonly statement: PolonaStatementKey | "NONE" | "ANY";
  readonly metadata_rights: PolonaPermission;
  readonly transcription_rights: PolonaPermission;
  readonly image_rights: PolonaPermission;
  readonly commercial_use: PolonaPermission;
  readonly redistribution: PolonaPermission;
  readonly attribution_required: boolean;
}

/**
 * The mapping table (TASK-031 §8 item 11).
 *
 * `ALLOWED` appears only where Polona grants the use in words, and
 * `PROHIBITED` only where it withholds it in words. Everything else is
 * `UNKNOWN`: Polona states no licence for its catalogue metadata at all, and
 * for the limited licence it forbids commercial use without saying what
 * non-commercial reuse, if any, is permitted.
 */
export const POLONA_RIGHTS_MAPPING: readonly PolonaRightsMappingRow[] = [
  {
    licence: "PUBLIC_DOMAIN",
    statement: "ANY",
    metadata_rights: "UNKNOWN",
    transcription_rights: "ALLOWED",
    image_rights: "ALLOWED",
    commercial_use: "ALLOWED",
    redistribution: "ALLOWED",
    attribution_required: true,
  },
  {
    licence: "PROTECTED_NO_LICENCE",
    statement: "ANY",
    metadata_rights: "UNKNOWN",
    transcription_rights: "PROHIBITED",
    image_rights: "PROHIBITED",
    commercial_use: "UNKNOWN",
    redistribution: "UNKNOWN",
    attribution_required: false,
  },
  {
    licence: "PROTECTED_LIMITED_LICENCE",
    statement: "PUBLISHER_CONSENT_NON_COMMERCIAL",
    metadata_rights: "UNKNOWN",
    transcription_rights: "UNKNOWN",
    image_rights: "UNKNOWN",
    commercial_use: "PROHIBITED",
    redistribution: "UNKNOWN",
    attribution_required: false,
  },
  {
    licence: "PROTECTED_LIMITED_LICENCE",
    statement: "PUBLISHER_CONSENT",
    metadata_rights: "UNKNOWN",
    transcription_rights: "UNKNOWN",
    image_rights: "UNKNOWN",
    commercial_use: "PROHIBITED",
    redistribution: "UNKNOWN",
    attribution_required: false,
  },
  {
    licence: "PROTECTED_LIMITED_LICENCE",
    statement: "OPAQUE_B12259E5",
    metadata_rights: "UNKNOWN",
    transcription_rights: "UNKNOWN",
    image_rights: "UNKNOWN",
    commercial_use: "UNKNOWN",
    redistribution: "UNKNOWN",
    attribution_required: false,
  },
  {
    licence: "PROTECTED_LIMITED_LICENCE",
    statement: "NONE",
    metadata_rights: "UNKNOWN",
    transcription_rights: "UNKNOWN",
    image_rights: "UNKNOWN",
    commercial_use: "UNKNOWN",
    redistribution: "UNKNOWN",
    attribution_required: false,
  },
];

/**
 * The object-level rights layer an object's observed rights produce, in the
 * field names of ADR-0007's `RightsLayer`, so `packages/truth` can evaluate
 * it without this package depending on that one.
 *
 * `attribution_text` stays null: Polona's public-domain rule names what an
 * attribution must contain (author and title), not a text to display.
 */
export interface PolonaRightsLayer {
  readonly metadata_rights: PolonaPermission;
  readonly transcription_rights: PolonaPermission;
  readonly image_rights: PolonaPermission;
  readonly commercial_use: PolonaPermission;
  readonly redistribution: PolonaPermission;
  readonly attribution_required: boolean;
  readonly attribution_text: null;
  readonly rights_url: string;
}

export function polonaRightsLayer(rights: PolonaRights): PolonaRightsLayer {
  const statement = rights.statement ?? "NONE";
  const row = POLONA_RIGHTS_MAPPING.find(
    (candidate) =>
      candidate.licence === rights.licence &&
      (candidate.statement === "ANY" || candidate.statement === statement),
  );
  if (row === undefined) {
    throw new Error(`no mapping row for ${rights.licence} with statement ${statement}`);
  }
  return {
    metadata_rights: row.metadata_rights,
    transcription_rights: row.transcription_rights,
    image_rights: row.image_rights,
    commercial_use: row.commercial_use,
    redistribution: row.redistribution,
    attribution_required: row.attribution_required,
    attribution_text: null,
    rights_url: polonaLicence(rights.licence).baseUrl,
  };
}
