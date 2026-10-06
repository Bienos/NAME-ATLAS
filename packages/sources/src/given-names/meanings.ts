import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { canonicalKey } from "@name-atlas/resolver";
import {
  ensureOnomasticWork,
  onomasticContentHash,
  parseOnomasticWork,
  storeOnomasticRecord,
} from "../onomastics.js";
import type {
  ImportOnomasticOptions,
  ImportOnomasticOutcome,
  OnomasticWork,
} from "../onomastics.js";

/**
 * First-name meaning files (TASK-147, ADR-0045, D-046).
 *
 * A curated file of what one public-domain work states about first names: the
 * language a name comes from and, where the work gives one, its meaning. It
 * is cited the way a surname meaning file is (ADR-0008 §4), and imported the
 * same way, as one source record holding the whole file. A work's first-name
 * file is its own record, `{source_key}:{year}:given-names`, so it never
 * replaces the work's surname file.
 *
 * D-046 allows two things written by the project, and nothing else:
 *
 * - `origin.code`, a fixed code for the language the work names, so two works
 *   can be compared. The work's own words stand beside it in `as_printed`.
 * - `translation`, a literal Polish translation of a gloss written in another
 *   language, always marked as Name Atlas's. The parser refuses one marked as
 *   anyone else's, and one with no gloss to translate.
 *
 * Everything else is the work's own text, quoted with its page.
 */

/** The languages of origin the works name, as compared (BCP-47 / ISO 639). */
export const GIVEN_NAME_ORIGIN_CODES = ["he", "arc", "grc", "la", "gem", "sla", "lt"] as const;
export type GivenNameOriginCode = (typeof GIVEN_NAME_ORIGIN_CODES)[number];

/** The only translator a file may name (D-046 §2). */
export const GIVEN_NAME_TRANSLATOR = "Name Atlas";

/** The `kind` a first-name meaning file states, so it is never read as a surname file. */
export const GIVEN_NAME_MEANINGS_KIND = "GIVEN_NAME_MEANINGS";

export interface GivenNameOrigin {
  readonly code: GivenNameOriginCode;
  /** The work's own words for the language, e.g. "z greckich" or "Gr.". */
  readonly as_printed: string;
}

export interface GivenNameTranslation {
  readonly language: "pl";
  readonly text: string;
  readonly by: typeof GIVEN_NAME_TRANSLATOR;
}

/** What one work states about one first name. */
export interface GivenNameMeaningEntry {
  /** The name as the PESEL lists spell it; matched by its canonical key. */
  readonly given_name: string;
  /** The name as the work prints it (1933 or English spelling). */
  readonly printed_form: string;
  readonly origin: GivenNameOrigin | null;
  /** The work's own meaning, in its own words and language. */
  readonly literal_gloss: string | null;
  readonly translation: GivenNameTranslation | null;
  /** Where in the work: page, or index line and page. */
  readonly locator: string;
  /** The work's sentence or line, verbatim. */
  readonly quotation: string;
}

export interface GivenNameMeaningFile {
  readonly format_version: 1;
  readonly kind: typeof GIVEN_NAME_MEANINGS_KIND;
  /** A fixture; refused at import unless the caller allows it (ADR-0008 §6). */
  readonly synthetic: boolean;
  readonly work: OnomasticWork;
  readonly entries: readonly GivenNameMeaningEntry[];
}

export type GivenNameMeaningParseOutcome =
  | { readonly kind: "PARSED"; readonly file: GivenNameMeaningFile }
  | {
      readonly kind: "REFUSED";
      readonly reason_code: string;
      readonly problems: readonly string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonBlank(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function parseOrigin(value: unknown, at: string, problems: string[]): GivenNameOrigin | null {
  if (value === null || value === undefined) return null;
  const x = isRecord(value) ? value : {};
  const code = nonBlank(x["code"]);
  const asPrinted = nonBlank(x["as_printed"]);
  if (code === null || !(GIVEN_NAME_ORIGIN_CODES as readonly string[]).includes(code)) {
    problems.push(
      `${at}.origin.code must be one of ${GIVEN_NAME_ORIGIN_CODES.join(", ")}; got ${String(code)}`,
    );
  }
  if (asPrinted === null) problems.push(`${at}.origin.as_printed (the work's words) is required`);
  if (code === null || asPrinted === null) return null;
  return { code: code as GivenNameOriginCode, as_printed: asPrinted };
}

function parseTranslation(
  value: unknown,
  at: string,
  problems: string[],
): GivenNameTranslation | null {
  if (value === null || value === undefined) return null;
  const x = isRecord(value) ? value : {};
  const text = nonBlank(x["text"]);
  if (x["language"] !== "pl") problems.push(`${at}.translation.language must be "pl"`);
  if (text === null) problems.push(`${at}.translation.text is required`);
  if (x["by"] !== GIVEN_NAME_TRANSLATOR) {
    // D-046 §2: the one thing the project writes is marked as its own.
    problems.push(`${at}.translation.by must be "${GIVEN_NAME_TRANSLATOR}" (D-046 §2)`);
  }
  if (x["language"] !== "pl" || text === null || x["by"] !== GIVEN_NAME_TRANSLATOR) return null;
  return { language: "pl", text, by: GIVEN_NAME_TRANSLATOR };
}

function parseEntry(
  value: unknown,
  index: number,
  problems: string[],
): GivenNameMeaningEntry | null {
  const at = `entries[${index}]`;
  if (!isRecord(value)) {
    problems.push(`${at} is not an object`);
    return null;
  }
  const before = problems.length;
  const givenName = nonBlank(value["given_name"]);
  const printedForm = nonBlank(value["printed_form"]);
  const locator = nonBlank(value["locator"]);
  const quotation = nonBlank(value["quotation"]);
  const gloss = nonBlank(value["literal_gloss"]);
  const origin = parseOrigin(value["origin"], at, problems);
  const translation = parseTranslation(value["translation"], at, problems);

  if (givenName === null) problems.push(`${at}.given_name is required`);
  if (printedForm === null) problems.push(`${at}.printed_form is required`);
  if (locator === null) problems.push(`${at}.locator is required (ADR-0008 §4: citable)`);
  if (quotation === null) problems.push(`${at}.quotation (the work's words) is required`);
  if (origin === null && gloss === null && value["origin"] == null) {
    problems.push(`${at} states neither an origin nor a meaning`);
  }
  if (value["translation"] != null && gloss === null) {
    problems.push(`${at}.translation has no gloss to translate`);
  }
  if (
    problems.length > before ||
    givenName === null ||
    printedForm === null ||
    locator === null ||
    quotation === null
  ) {
    return null;
  }
  return {
    given_name: givenName,
    printed_form: printedForm,
    origin,
    literal_gloss: gloss,
    translation,
    locator,
    quotation,
  };
}

/** Parses a first-name meaning file, collecting every problem. */
export function parseGivenNameMeaningFile(raw: unknown): GivenNameMeaningParseOutcome {
  if (!isRecord(raw)) {
    return { kind: "REFUSED", reason_code: "NOT_AN_OBJECT", problems: ["file is not an object"] };
  }
  if (raw["format_version"] !== 1) {
    return {
      kind: "REFUSED",
      reason_code: "UNSUPPORTED_FORMAT_VERSION",
      problems: [`format_version must be 1; got ${String(raw["format_version"])}`],
    };
  }
  const problems: string[] = [];
  if (raw["kind"] !== GIVEN_NAME_MEANINGS_KIND) {
    problems.push(`kind must be "${GIVEN_NAME_MEANINGS_KIND}"`);
  }
  if (typeof raw["synthetic"] !== "boolean") {
    problems.push("synthetic must be stated explicitly, true or false (ADR-0008 §6)");
  }
  const work = parseOnomasticWork(raw["work"], problems);

  const entries: GivenNameMeaningEntry[] = [];
  const rawEntries = raw["entries"];
  if (!Array.isArray(rawEntries)) {
    problems.push("entries must be an array");
  } else if (rawEntries.length === 0) {
    problems.push("entries is empty; an import that adds nothing is a mistake, not a no-op");
  } else {
    const seen = new Map<string, number>();
    rawEntries.forEach((value, index) => {
      const entry = parseEntry(value, index, problems);
      if (entry === null) return;
      // One entry per name per work: a work's statements about a name are
      // one piece of evidence, quoted together.
      const key = canonicalKey(entry.given_name);
      const first = seen.get(key);
      if (first !== undefined) {
        problems.push(`entries[${index}] repeats entries[${first}] (${entry.given_name})`);
        return;
      }
      seen.set(key, index);
      entries.push(entry);
    });
  }

  if (problems.length > 0 || work === null) {
    return { kind: "REFUSED", reason_code: "INADMISSIBLE_SOURCE", problems };
  }
  return {
    kind: "PARSED",
    file: {
      format_version: 1,
      kind: GIVEN_NAME_MEANINGS_KIND,
      synthetic: raw["synthetic"] === true,
      work,
      entries,
    },
  };
}

/** The source record id of a work's first-name file, apart from its surname file's. */
export function givenNameMeaningRecordId(work: OnomasticWork): string {
  return `${work.source_key}:${String(work.year)}:given-names`;
}

/**
 * Imports one version of a first-name meaning file, in one transaction.
 * Identical bytes are `ALREADY_IMPORTED`; a new version of the same work's
 * first-name file replaces the earlier one, which becomes `UPDATED`. Stores
 * only: `deriveGivenNameMeaning` writes the claims.
 */
export async function importGivenNameMeanings(
  db: Kysely<DB>,
  options: ImportOnomasticOptions,
): Promise<ImportOnomasticOutcome> {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(options.bytes).toString("utf8"));
  } catch (cause: unknown) {
    return {
      kind: "REFUSED",
      reason_code: "NOT_JSON",
      problems: [cause instanceof Error ? cause.message : String(cause)],
    };
  }
  const parsed = parseGivenNameMeaningFile(raw);
  if (parsed.kind === "REFUSED") return parsed;
  if (parsed.file.synthetic && options.allowSynthetic !== true) {
    return {
      kind: "REFUSED",
      reason_code: "SYNTHETIC_SOURCE_NOT_ALLOWED",
      problems: [
        "this file is marked synthetic; pass allowSynthetic to import it, which only a test does",
      ],
    };
  }

  const { work } = parsed.file;
  return db.transaction().execute(async (trx) => {
    const sourceId = await ensureOnomasticWork(trx, work, "GIVEN_NAME");
    return storeOnomasticRecord(trx, {
      sourceId,
      externalRecordId: givenNameMeaningRecordId(work),
      raw,
      contentHash: onomasticContentHash(options.bytes),
      sourceUrl: options.sourceUrl ?? work.reference_url,
      retrievedAt: options.retrievedAt ?? new Date(),
      entries: parsed.file.entries.length,
    });
  });
}
