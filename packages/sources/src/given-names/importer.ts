/**
 * Imports one PESEL given-name list (ADR-0032, TASK-078), with TASK-004's
 * posture:
 *
 *   rights gate → checksum → decode → parse fail-closed → classify
 *   → [one transaction] source record → given names → counts
 *
 * It downloads nothing and derives nothing: no rank, no share, no total.
 * A placeholder row ("BRAK DANYCH") is read, counted and reported, never made
 * a name. A one-character or abbreviated form is stored verbatim and flagged.
 * Identical bytes for a resource already imported are a no-op; a different
 * version supersedes the active record, never rewrites it.
 */
import type { Insertable, Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, detectScripts, toNfc, CANONICAL_KEY_VERSION } from "@name-atlas/resolver";
import { decodePeselBytes } from "../decode.js";
import { PeselSchemaError } from "../errors.js";
import { insertChunked, rightsRefusal, sha256Hex } from "../importer.js";
import type { RightsProfileSeed } from "../registry.js";
import { parseGivenNameFile } from "./parser.js";
import {
  GIVEN_NAME_PLACEHOLDERS,
  GIVEN_NAMES_RIGHTS_PROFILE,
  GIVEN_NAMES_SOURCE,
  GIVEN_NAMES_SOURCE_KEY,
  needsFormReview,
} from "./registry.js";
import type { GivenNameResourceDescriptor } from "./registry.js";

export interface ImportGivenNamesOptions {
  readonly resource: GivenNameResourceDescriptor;
  readonly bytes: Uint8Array;
  /** Passed explicitly: a fixture is an excerpt with its own checksum (TASK-004 §12 rule 1). */
  readonly expectedSha256: string;
  /** The publisher's resource object, stored verbatim as `raw_payload`. */
  readonly rawPayload: unknown;
  /** Overridable only so tests can exercise the rights gate. */
  readonly rightsProfile?: RightsProfileSeed;
}

export interface GivenNameImportReport {
  readonly resourceId: string;
  readonly rowsRead: number;
  /** People on every row read, placeholders included. */
  readonly peopleRead: number;
  readonly namesImported: number;
  readonly namesCreated: number;
  readonly namesReused: number;
  readonly namesFlagged: number;
  /** The placeholder rows, with their counts, in file order. */
  readonly placeholders: readonly { readonly marker: string; readonly count: number }[];
}

export type GivenNameImportOutcome =
  | {
      readonly kind: "IMPORTED";
      readonly sourceRecordId: string;
      readonly report: GivenNameImportReport;
    }
  | {
      readonly kind: "ALREADY_IMPORTED";
      readonly sourceRecordId: string;
      readonly report: GivenNameImportReport;
    }
  | {
      readonly kind: "FAILED";
      readonly reason:
        "RIGHTS_BLOCKED" | "CHECKSUM_MISMATCH" | "SCHEMA_VIOLATION" | "DUPLICATE_CANONICAL_KEY";
      readonly message: string;
    };

async function ensureGivenNameSource(
  trx: Transaction<DB>,
  profile: RightsProfileSeed,
): Promise<string> {
  const existing = await trx
    .selectFrom("sources")
    .select("source_id")
    .where("source_key", "=", GIVEN_NAMES_SOURCE_KEY)
    .executeTakeFirst();
  if (existing) return existing.source_id;
  const rightsProfileId = uuidv7();
  await trx
    .insertInto("rights_profiles")
    .values({
      rights_profile_id: rightsProfileId,
      terms_version: profile.terms_version,
      terms_hash: profile.terms_hash,
      checked_at: profile.checked_at,
      metadata_rights: profile.metadata_rights,
      image_rights: profile.image_rights,
      transcription_rights: profile.transcription_rights,
      database_rights: profile.database_rights,
      automated_access: profile.automated_access,
      commercial_use: profile.commercial_use,
      redistribution: profile.redistribution,
      local_cache: profile.local_cache,
      attribution_required: profile.attribution_required,
      attribution_text: profile.attribution_text,
      source_owner: profile.source_owner,
      rights_url: profile.rights_url,
      contact_required: profile.contact_required,
      review_status: profile.review_status,
      valid_from: profile.valid_from,
      valid_to: profile.valid_to,
      notes: profile.notes,
    })
    .execute();
  const sourceId = uuidv7();
  await trx
    .insertInto("sources")
    .values({
      source_id: sourceId,
      parent_source_id: null,
      source_key: GIVEN_NAMES_SOURCE.source_key,
      name: GIVEN_NAMES_SOURCE.name,
      publisher: GIVEN_NAMES_SOURCE.publisher,
      source_type: GIVEN_NAMES_SOURCE.source_type,
      granularity: GIVEN_NAMES_SOURCE.granularity,
      geographic_scope: [...GIVEN_NAMES_SOURCE.geographic_scope],
      temporal_from: GIVEN_NAMES_SOURCE.temporal_from,
      temporal_to: GIVEN_NAMES_SOURCE.temporal_to,
      methodology_notes: GIVEN_NAMES_SOURCE.methodology_notes,
      authority_tier: GIVEN_NAMES_SOURCE.authority_tier,
      default_rights_profile_id: rightsProfileId,
      production_status: GIVEN_NAMES_SOURCE.production_status,
      homepage_or_reference_url: GIVEN_NAMES_SOURCE.homepage_or_reference_url,
    })
    .execute();
  return sourceId;
}

export async function importGivenNameResource(
  db: Kysely<DB>,
  options: ImportGivenNamesOptions,
): Promise<GivenNameImportOutcome> {
  const { resource, bytes, expectedSha256, rawPayload } = options;
  const profile = options.rightsProfile ?? GIVEN_NAMES_RIGHTS_PROFILE;

  const refusal = rightsRefusal(profile);
  if (refusal) return { kind: "FAILED", reason: "RIGHTS_BLOCKED", message: refusal };

  const actualSha256 = sha256Hex(bytes);
  if (actualSha256 !== expectedSha256) {
    return {
      kind: "FAILED",
      reason: "CHECKSUM_MISMATCH",
      message: `expected sha256 ${expectedSha256}, got ${actualSha256}`,
    };
  }

  let rows;
  try {
    rows = parseGivenNameFile(decodePeselBytes(bytes), resource);
  } catch (cause: unknown) {
    if (cause instanceof PeselSchemaError) {
      return { kind: "FAILED", reason: "SCHEMA_VIOLATION", message: cause.message };
    }
    throw cause;
  }

  // Classify. Two rows sharing a key would merge two counts into one name:
  // a shape change, refused rather than guessed.
  const placeholders: { marker: string; count: number }[] = [];
  const names: { name: string; key: string; count: number; flagged: boolean }[] = [];
  const lineOfKey = new Map<string, { line: number; name: string }>();
  for (const row of rows) {
    if (GIVEN_NAME_PLACEHOLDERS.has(row.name)) {
      placeholders.push({ marker: row.name, count: row.count });
      continue;
    }
    const key = canonicalKey(row.name);
    const seen = lineOfKey.get(key);
    if (seen) {
      return {
        kind: "FAILED",
        reason: "DUPLICATE_CANONICAL_KEY",
        message:
          `lines ${seen.line} and ${row.line} share canonical key ${JSON.stringify(key)}: ` +
          `${JSON.stringify(seen.name)} and ${JSON.stringify(row.name)}`,
      };
    }
    lineOfKey.set(key, { line: row.line, name: row.name });
    names.push({ name: row.name, key, count: row.count, flagged: needsFormReview(row.name) });
  }

  const report = (created: number, reused: number): GivenNameImportReport => ({
    resourceId: resource.resource_id,
    rowsRead: rows.length,
    peopleRead: rows.reduce((sum, r) => sum + r.count, 0),
    namesImported: created + reused,
    namesCreated: created,
    namesReused: reused,
    namesFlagged: names.filter((n) => n.flagged).length,
    placeholders,
  });

  return db.transaction().execute(async (trx) => {
    const sourceId = await ensureGivenNameSource(trx, profile);

    const already = await trx
      .selectFrom("source_records")
      .select("source_record_id")
      .where("source_id", "=", sourceId)
      .where("external_record_id", "=", resource.resource_id)
      .where("content_hash", "=", actualSha256)
      .executeTakeFirst();
    if (already) {
      return {
        kind: "ALREADY_IMPORTED" as const,
        sourceRecordId: already.source_record_id,
        report: { ...report(0, 0), namesImported: 0 },
      };
    }

    const previous = await trx
      .selectFrom("source_records")
      .select("source_record_id")
      .where("source_id", "=", sourceId)
      .where("external_record_id", "=", resource.resource_id)
      .where("record_status", "=", "ACTIVE")
      .orderBy("retrieved_at", "desc")
      .executeTakeFirst();

    const sourceRecordId = uuidv7();
    await trx
      .insertInto("source_records")
      .values({
        source_record_id: sourceRecordId,
        source_id: sourceId,
        external_record_id: resource.resource_id,
        external_parent_id: null,
        record_type: "API_OBJECT",
        source_url: resource.official_source_url,
        raw_payload: JSON.stringify(rawPayload),
        raw_text_ref: null,
        content_hash: actualSha256,
        retrieved_at: resource.retrieved_at,
        source_modified_at: resource.portal_modified_at,
        dataset_version: `${resource.resource_id}@${actualSha256.slice(0, 12)}`,
        universe_description: resource.universe_description,
        methodology_key: resource.methodology_key,
        comparability_group: resource.comparability_group,
        coverage_notes: resource.coverage_notes,
        rights_profile_id: null,
        record_status: "ACTIVE",
        supersedes_source_record_id: previous?.source_record_id ?? null,
      })
      .execute();
    if (previous) {
      await trx
        .updateTable("source_records")
        .set({ record_status: "UPDATED" })
        .where("source_record_id", "=", previous.source_record_id)
        .execute();
    }

    // Identity: reuse what exists, create the rest.
    const existing = new Map<string, string>();
    const keys = names.map((n) => n.key);
    for (let i = 0; i < keys.length; i += 1000) {
      const found = await trx
        .selectFrom("given_names")
        .select(["given_name_id", "canonical_key"])
        .where("canonical_key", "in", keys.slice(i, i + 1000))
        .execute();
      for (const f of found) existing.set(f.canonical_key, f.given_name_id);
    }
    const entities: Insertable<DB["knowledge_entities"]>[] = [];
    const created: Insertable<DB["given_names"]>[] = [];
    const counts: Insertable<DB["given_name_counts"]>[] = [];
    for (const n of names) {
      let id = existing.get(n.key);
      if (id === undefined) {
        id = uuidv7();
        entities.push({
          entity_id: id,
          entity_type: "GIVEN_NAME",
          scope: "SHARED",
          privacy_class: "PUBLIC",
          lifecycle_status: "ACTIVE",
        });
        created.push({
          given_name_id: id,
          // The register's own spelling, verbatim (NFC only, as surnames are stored).
          canonical_display: toNfc(n.name),
          canonical_key: n.key,
          canonical_key_version: CANONICAL_KEY_VERSION,
          primary_script: detectScripts(n.name).primary_script,
          form_review: n.flagged ? "INITIAL_OR_ABBREVIATION" : null,
        });
      }
      counts.push({
        given_name_count_id: uuidv7(),
        given_name_id: id,
        source_record_id: sourceRecordId,
        count: n.count,
      });
    }
    await insertChunked(trx, "knowledge_entities", entities);
    await insertChunked(trx, "given_names", created);
    await insertChunked(trx, "given_name_counts", counts);

    return {
      kind: "IMPORTED" as const,
      sourceRecordId,
      report: report(created.length, names.length - created.length),
    };
  });
}
