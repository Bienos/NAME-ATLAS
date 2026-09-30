import { uuidv7 } from "@name-atlas/domain";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { sha256Hex } from "./importer.js";
import type { RightsProfileSeed, RightsReviewStatus } from "./registry.js";

/**
 * Onomastic (meaning/origin) source files (TASK-022, ADR-0008).
 *
 * This module parses and imports a **curated, attributed** file of surname
 * meaning entries. It is deliberately not a connector: nothing here fetches
 * anything, because `docs/canonical/12` line 764 classifies the strongest
 * specialist source (IJP PAN) as **PARTNER P0** — "No production cache without
 * agreement" — and no agreement exists.
 *
 * ADR-0008 §4's four admissibility conditions are enforced **at parse time**,
 * before a single row is written:
 *
 *   1. citable — author or publisher, title, year, and a locator in the work;
 *   2. rights permit the surface — the profile is evaluated by ADR-0007's gate;
 *   3. reliability tier `C_SCHOLARLY_SECONDARY` or better;
 *   4. a stated licence basis — public domain with a reason, a named open
 *      licence, or a licence agreement.
 *
 * A refusal is a result (`AGENTS.md` §9). An entry that cannot be cited is not
 * imported with a lower weight; it is not imported.
 */

/** Tiers admissible for a meaning claim, best first (ADR-0008 §4 condition 3). */
export const ADMISSIBLE_RELIABILITY_TIERS = [
  "A_PRIMARY_OFFICIAL",
  "B_AUTHORITATIVE_INDEX",
  "C_SCHOLARLY_SECONDARY",
] as const;

export type AdmissibleReliabilityTier = (typeof ADMISSIBLE_RELIABILITY_TIERS)[number];

/**
 * How a source is lawfully usable. Every file must state one — "we found it on
 * the web" is not a licence basis.
 */
export type LicenceBasis =
  | { readonly kind: "PUBLIC_DOMAIN"; readonly reason: string }
  | { readonly kind: "OPEN_LICENCE"; readonly licence: string }
  | { readonly kind: "LICENCE_AGREEMENT"; readonly reference: string };

/** `docs/canonical/11` §7.2's formation type, as far as this task needs it. */
export type FormationType =
  "PATRONYMIC" | "TOPONYMIC" | "OCCUPATIONAL" | "DESCRIPTIVE" | "OTHER" | "UNKNOWN";

/** One attributed interpretation of one surname. */
export interface OnomasticEntry {
  /** The surname as the work spells it. Resolved through the normal resolver. */
  readonly surname: string;
  /** The proposed lexical root, if the work proposes one. */
  readonly root_form: string | null;
  /** Language of that root (BCP-47 or a language name as the work gives it). */
  readonly root_language: string | null;
  /** The work's own short gloss. Never rewritten, never marketing prose. */
  readonly literal_gloss: string;
  readonly formation_type: FormationType;
  /** Where in the work this entry is — page, entry number, column. */
  readonly locator: string;
  /** The work's own wording where it matters. Optional. */
  readonly quotation: string | null;
}

/** The work an entry set comes from. */
export interface OnomasticWork {
  /** Stable key for the source row. */
  readonly source_key: string;
  readonly title: string;
  readonly author_or_publisher: string;
  readonly year: number;
  readonly reliability_tier: AdmissibleReliabilityTier;
  readonly licence_basis: LicenceBasis;
  readonly reference_url: string | null;
  readonly rights: RightsProfileSeed;
}

export interface OnomasticSourceFile {
  readonly format_version: 1;
  /**
   * True for a fixture. `importOnomasticSource` refuses a synthetic file unless
   * the caller passes `allowSynthetic` (ADR-0008 §6), so a test fixture full of
   * invented etymology can never become a production claim by mistake.
   */
  readonly synthetic: boolean;
  readonly work: OnomasticWork;
  readonly entries: readonly OnomasticEntry[];
}

export type ParseOutcome =
  | { readonly kind: "PARSED"; readonly file: OnomasticSourceFile }
  | {
      readonly kind: "REFUSED";
      readonly reason_code: string;
      readonly problems: readonly string[];
    };

const FORMATION_TYPES: readonly string[] = [
  "PATRONYMIC",
  "TOPONYMIC",
  "OCCUPATIONAL",
  "DESCRIPTIVE",
  "OTHER",
  "UNKNOWN",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonBlank(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function parseLicenceBasis(value: unknown, problems: string[]): LicenceBasis | null {
  if (!isRecord(value)) {
    problems.push("work.licence_basis is missing");
    return null;
  }
  const kind = nonBlank(value["kind"]);
  switch (kind) {
    case "PUBLIC_DOMAIN": {
      const reason = nonBlank(value["reason"]);
      if (!reason) {
        // "It is old" is not a reason. The reason has to be statable.
        problems.push("work.licence_basis.reason is required for PUBLIC_DOMAIN");
        return null;
      }
      return { kind: "PUBLIC_DOMAIN", reason };
    }
    case "OPEN_LICENCE": {
      const licence = nonBlank(value["licence"]);
      if (!licence) {
        problems.push("work.licence_basis.licence must name the licence");
        return null;
      }
      return { kind: "OPEN_LICENCE", licence };
    }
    case "LICENCE_AGREEMENT": {
      const reference = nonBlank(value["reference"]);
      if (!reference) {
        problems.push("work.licence_basis.reference must identify the agreement");
        return null;
      }
      return { kind: "LICENCE_AGREEMENT", reference };
    }
    default:
      problems.push(`work.licence_basis.kind is not a stated basis: ${String(kind)}`);
      return null;
  }
}

function parseWork(value: unknown, problems: string[]): OnomasticWork | null {
  if (!isRecord(value)) {
    problems.push("work is missing");
    return null;
  }
  const sourceKey = nonBlank(value["source_key"]);
  const title = nonBlank(value["title"]);
  const author = nonBlank(value["author_or_publisher"]);
  const year = value["year"];
  const tier = nonBlank(value["reliability_tier"]);

  if (!sourceKey) problems.push("work.source_key is required");
  if (!title) problems.push("work.title is required (ADR-0008 §4: citable)");
  if (!author) problems.push("work.author_or_publisher is required (ADR-0008 §4: citable)");
  if (typeof year !== "number" || !Number.isInteger(year)) {
    problems.push("work.year is required and must be an integer (ADR-0008 §4: citable)");
  }
  if (!tier || !(ADMISSIBLE_RELIABILITY_TIERS as readonly string[]).includes(tier)) {
    problems.push(
      `work.reliability_tier must be one of ${ADMISSIBLE_RELIABILITY_TIERS.join(", ")} ` +
        `(ADR-0008 §4 condition 3); got ${String(tier)}`,
    );
  }

  const licence = parseLicenceBasis(value["licence_basis"], problems);
  const rights = value["rights"];
  if (!isRecord(rights)) problems.push("work.rights (a rights profile) is required");

  if (
    !sourceKey ||
    !title ||
    !author ||
    typeof year !== "number" ||
    !tier ||
    !licence ||
    !isRecord(rights)
  ) {
    return null;
  }

  return {
    source_key: sourceKey,
    title,
    author_or_publisher: author,
    year,
    reliability_tier: tier as AdmissibleReliabilityTier,
    licence_basis: licence,
    reference_url: nonBlank(value["reference_url"]),
    rights: rights as unknown as RightsProfileSeed,
  };
}

function parseEntry(value: unknown, index: number, problems: string[]): OnomasticEntry | null {
  if (!isRecord(value)) {
    problems.push(`entries[${index}] is not an object`);
    return null;
  }
  const surname = nonBlank(value["surname"]);
  const gloss = nonBlank(value["literal_gloss"]);
  const locator = nonBlank(value["locator"]);
  const formation = nonBlank(value["formation_type"]) ?? "UNKNOWN";

  if (!surname) problems.push(`entries[${index}].surname is required`);
  if (!gloss) problems.push(`entries[${index}].literal_gloss is required`);
  // A citation without a locator cannot be checked by a reader, which is the
  // whole point of citing it.
  if (!locator) problems.push(`entries[${index}].locator is required (ADR-0008 §4: citable)`);
  if (!FORMATION_TYPES.includes(formation)) {
    problems.push(`entries[${index}].formation_type is not recognised: ${formation}`);
  }
  if (!surname || !gloss || !locator || !FORMATION_TYPES.includes(formation)) return null;

  return {
    surname,
    root_form: nonBlank(value["root_form"]),
    root_language: nonBlank(value["root_language"]),
    literal_gloss: gloss,
    formation_type: formation as FormationType,
    locator,
    quotation: nonBlank(value["quotation"]),
  };
}

/**
 * Parses an onomastic source file, refusing anything inadmissible.
 *
 * Collects **every** problem rather than stopping at the first, because the
 * person fixing a source file needs the whole list.
 */
export function parseOnomasticSource(raw: unknown): ParseOutcome {
  const problems: string[] = [];

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
  if (typeof raw["synthetic"] !== "boolean") {
    problems.push("synthetic must be stated explicitly, true or false (ADR-0008 §6)");
  }

  const work = parseWork(raw["work"], problems);
  const rawEntries = raw["entries"];
  const entries: OnomasticEntry[] = [];

  if (!Array.isArray(rawEntries)) {
    problems.push("entries must be an array");
  } else if (rawEntries.length === 0) {
    problems.push("entries is empty; an import that adds nothing is a mistake, not a no-op");
  } else {
    rawEntries.forEach((entry, index) => {
      const parsed = parseEntry(entry, index, problems);
      if (parsed) entries.push(parsed);
    });
  }

  if (problems.length > 0 || !work) {
    return { kind: "REFUSED", reason_code: "INADMISSIBLE_SOURCE", problems };
  }

  return {
    kind: "PARSED",
    file: {
      format_version: 1,
      synthetic: raw["synthetic"] === true,
      work,
      entries,
    },
  };
}

/** Lowercase hex SHA-256, so a source record pins the exact bytes it parsed. */
export function onomasticContentHash(bytes: Uint8Array): string {
  return sha256Hex(bytes);
}

export interface ImportOnomasticOptions {
  readonly bytes: Uint8Array;
  /** Where the file came from, recorded verbatim on the source record. */
  readonly sourceUrl?: string | null;
  readonly retrievedAt?: Date;
  /** ADR-0008 §6. Only a test passes this. */
  readonly allowSynthetic?: boolean;
}

export type ImportOnomasticOutcome =
  | {
      readonly kind: "IMPORTED";
      readonly source_id: string;
      readonly source_record_id: string;
      readonly entries: number;
    }
  | {
      readonly kind: "ALREADY_IMPORTED";
      readonly source_id: string;
      readonly source_record_id: string;
    }
  | {
      readonly kind: "REFUSED";
      readonly reason_code: string;
      readonly problems: readonly string[];
    };

async function ensureWork(trx: Transaction<DB>, work: OnomasticWork): Promise<string> {
  const existing = await trx
    .selectFrom("sources")
    .select(["source_id"])
    .where("source_key", "=", work.source_key)
    .executeTakeFirst();
  if (existing) return existing.source_id;

  const rightsProfileId = uuidv7();
  const r = work.rights;
  await trx
    .insertInto("rights_profiles")
    .values({
      rights_profile_id: rightsProfileId,
      terms_version: r.terms_version,
      terms_hash: r.terms_hash,
      checked_at: r.checked_at,
      metadata_rights: r.metadata_rights,
      image_rights: r.image_rights,
      transcription_rights: r.transcription_rights,
      database_rights: r.database_rights,
      automated_access: r.automated_access,
      commercial_use: r.commercial_use,
      redistribution: r.redistribution,
      local_cache: r.local_cache,
      attribution_required: r.attribution_required,
      attribution_text: r.attribution_text,
      source_owner: r.source_owner,
      rights_url: r.rights_url,
      contact_required: r.contact_required,
      review_status: r.review_status as RightsReviewStatus,
      valid_from: r.valid_from,
      valid_to: r.valid_to,
      notes: r.notes,
    })
    .execute();

  const sourceId = uuidv7();
  await trx
    .insertInto("sources")
    .values({
      source_id: sourceId,
      parent_source_id: null,
      source_key: work.source_key,
      name: work.title,
      publisher: work.author_or_publisher,
      // A dictionary or scholarly work, not an official dataset.
      source_type: "DICTIONARY",
      granularity: "SURNAME",
      geographic_scope: ["PL"],
      temporal_from: null,
      temporal_to: null,
      methodology_notes: licenceNote(work),
      authority_tier: work.reliability_tier,
      default_rights_profile_id: rightsProfileId,
      production_status: productionStatusFor(work),
      homepage_or_reference_url: work.reference_url,
    })
    .execute();

  return sourceId;
}

/** The licence basis, recorded on the source in the work's own terms. */
export function licenceNote(work: OnomasticWork): string {
  const basis = work.licence_basis;
  const stated =
    basis.kind === "PUBLIC_DOMAIN"
      ? `public domain — ${basis.reason}`
      : basis.kind === "OPEN_LICENCE"
        ? `open licence — ${basis.licence}`
        : `licence agreement — ${basis.reference}`;
  return `${work.author_or_publisher}, ${work.title} (${work.year}). Licence basis: ${stated}.`;
}

/**
 * A work whose rights review is unresolved is `LEGAL_REVIEW_REQUIRED` here too.
 * The value is not decorative: ADR-0007's gate reads the rights profile, and
 * this column is what an operator looks at.
 */
function productionStatusFor(
  work: OnomasticWork,
): "APPROVED" | "LEGAL_REVIEW_REQUIRED" | "BLOCKED" {
  switch (work.rights.review_status) {
    case "APPROVED":
    case "CONDITIONAL":
      return "APPROVED";
    case "BLOCKED":
      return "BLOCKED";
    default:
      return "LEGAL_REVIEW_REQUIRED";
  }
}

/**
 * Imports one onomastic source file version.
 *
 * Everything in one transaction, and idempotent on identical bytes: the same
 * file imported twice yields `ALREADY_IMPORTED` rather than a second record.
 *
 * Note what this does **not** do: it does not create evidence or claims. That
 * is `deriveSurnameMeaning`'s job, which keeps storage and derivation apart the
 * same way the PESEL importer does (`ARCHITECTURE.md` §10 invariant 10).
 */
export async function importOnomasticSource(
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

  const parsed = parseOnomasticSource(raw);
  if (parsed.kind === "REFUSED") return parsed;

  if (parsed.file.synthetic && options.allowSynthetic !== true) {
    // ADR-0008 §6. The flag is the whole safety property: a fixture of invented
    // etymology cannot reach a reader by accident.
    return {
      kind: "REFUSED",
      reason_code: "SYNTHETIC_SOURCE_NOT_ALLOWED",
      problems: [
        "this file is marked synthetic; pass allowSynthetic to import it, which only a test does",
      ],
    };
  }

  const contentHash = onomasticContentHash(options.bytes);
  const retrievedAt = options.retrievedAt ?? new Date();

  return db.transaction().execute(async (trx) => {
    const sourceId = await ensureWork(trx, parsed.file.work);

    const existing = await trx
      .selectFrom("source_records")
      .select(["source_record_id"])
      .where("source_id", "=", sourceId)
      .where("content_hash", "=", contentHash)
      .executeTakeFirst();
    if (existing) {
      return {
        kind: "ALREADY_IMPORTED" as const,
        source_id: sourceId,
        source_record_id: existing.source_record_id,
      };
    }

    const sourceRecordId = uuidv7();
    await trx
      .insertInto("source_records")
      .values({
        source_record_id: sourceRecordId,
        source_id: sourceId,
        external_record_id: `${parsed.file.work.source_key}:${parsed.file.work.year}`,
        external_parent_id: null,
        record_type: "ARTICLE",
        source_url: options.sourceUrl ?? parsed.file.work.reference_url,
        // The file itself is the payload: every entry the claims rest on is
        // here verbatim, so a claim can always be traced to the exact text.
        raw_payload: raw as never,
        raw_text_ref: null,
        content_hash: contentHash,
        retrieved_at: retrievedAt,
        source_modified_at: null,
        rights_profile_id: null,
        record_status: "ACTIVE",
        supersedes_source_record_id: null,
      })
      .execute();

    return {
      kind: "IMPORTED" as const,
      source_id: sourceId,
      source_record_id: sourceRecordId,
      entries: parsed.file.entries.length,
    };
  });
}
