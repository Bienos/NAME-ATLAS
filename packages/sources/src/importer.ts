/**
 * PESEL bulk importer (TASK-004 §6 item 3) — the `BULK_DATASET` pattern of
 * docs/canonical/12 §3.1 / §9.2, over bytes that are already on disk.
 *
 *   verify checksum → decode → parse fail-closed → resolve identity
 *   → [one transaction] source record → surnames → snapshots → values
 *
 * What this module deliberately does NOT do:
 *
 *   - It downloads nothing. Acquisition is manual and outside the process.
 *   - It derives nothing. No rank, share, rarity, total or trend; every
 *     derived column on `distribution_values` is written null
 *     (ARCHITECTURE.md §10 invariant 10).
 *   - It never merges surnames, generates a gender counterpart, folds a
 *     diacritic, or resolves an ambiguity by guessing.
 *   - It writes no zero. A surname absent from a resource produces no row
 *     at all — absence is not zero (ARCHITECTURE.md §10 invariant 4).
 *
 * Two implementer choices, recorded here because TASK-004 §14 left them open:
 *
 *   U-5 → option (a). If ANY row fails to resolve unambiguously the whole
 *         import aborts and writes nothing. In a two-column official file a
 *         quarantine almost certainly means we have misunderstood the
 *         source, and "fail closed" is the standing posture.
 *         Narrowed once, by TASK-010 (D-014, Option C): a row whose ONLY
 *         finding is `MIXED_SCRIPT_REVIEW` is imported with that finding
 *         persisted on the surname, per docs/canonical/13 §10.4 ("do not
 *         reject automatically"). Nothing is mapped or merged; the bytes
 *         are stored verbatim and the flag travels with them.
 *   U-7 → resolution runs as a separate read pass BEFORE the write
 *         transaction, so `resolveSurname`'s READ ONLY guarantee is never
 *         relaxed. The resulting time-of-check/time-of-use gap is closed
 *         safely by the `surnames.canonical_key` UNIQUE constraint: a
 *         concurrent creator makes our insert fail and roll the whole
 *         import back, rather than producing a duplicate identity.
 */
import { createHash } from "node:crypto";
import type { Insertable, Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import {
  canonicalKey,
  detectScripts,
  resolveSurnamesBulk,
  toNfc,
  CANONICAL_KEY_VERSION,
  NORMALIZATION_VERSION,
} from "@name-atlas/resolver";
import { decodePeselBytes } from "./decode.js";
import { PeselSchemaError } from "./errors.js";
import { parsePeselFile } from "./parser.js";
import type { PeselSourceRow } from "./schema.js";
import { PESEL_RIGHTS_PROFILE, PESEL_SOURCE, PESEL_SOURCE_KEY } from "./registry.js";
import type { PeselResourceDescriptor, RightsProfileSeed } from "./registry.js";
import { assertReconciles, emptyReport, tallyReasons } from "./import-result.js";
import type {
  FlaggedRow,
  ImportOutcome,
  QuarantinedRow,
  ReconciliationReport,
} from "./import-result.js";

export interface ImportPeselOptions {
  /** The approved, checksum-pinned resource this file claims to be. */
  readonly resource: PeselResourceDescriptor;
  /** The file's bytes, already read from disk. */
  readonly bytes: Uint8Array;
  /**
   * The SHA-256 the caller expects these bytes to have.
   *
   * Passed explicitly rather than read from the descriptor, because a test
   * fixture is a 22-row EXCERPT of the official resource and therefore has
   * its own, different checksum. Presenting a fixture's checksum as the
   * resource's would be a false provenance claim (TASK-004 §12 rule 1).
   */
  readonly expectedSha256: string;
  /**
   * The publisher's own resource-metadata object, stored verbatim as
   * `source_records.raw_payload`. Never synthesised by this module.
   */
  readonly rawPayload: unknown;
  /** Overridable only so tests can exercise the rights gate. */
  readonly rightsProfile?: RightsProfileSeed;
}

/** Computes the lowercase hex SHA-256 of the given bytes. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * The hard rights gate (docs/canonical/12 §6.4; ARCHITECTURE.md §10
 * invariant 13). Returns a refusal message, or null when ingestion may run.
 *
 * Note what is NOT a blocker here: `commercial_use = UNKNOWN` and
 * `review_status = LEGAL_REVIEW_REQUIRED` are the PESEL profile's real
 * values and must not stop an internal import. They close the *paid
 * surface* gate, which is a different gate on a different surface.
 */
export function rightsRefusal(profile: RightsProfileSeed): string | null {
  if (profile.automated_access === "PROHIBITED") {
    return "rights profile forbids automated access (automated_access = PROHIBITED)";
  }
  if (profile.review_status === "BLOCKED") {
    return "rights profile is BLOCKED pending review";
  }
  return null;
}

/** One distinct source string and the rows that carry it. */
interface DistinctSurname {
  readonly surname: string;
  readonly key: string;
  readonly firstLine: number;
}

/** What the read pass concluded about one distinct source string. */
interface ResolvedIdentity {
  readonly surnameId: string | null;
  readonly created: boolean;
}

function collectDistinct(rows: readonly PeselSourceRow[]): {
  distinct: DistinctSurname[];
  duplicate: { key: string; first: string; second: string } | null;
} {
  const byKey = new Map<string, DistinctSurname>();
  for (const [index, row] of rows.entries()) {
    const key = canonicalKey(row.surname);
    const existing = byKey.get(key);
    if (existing) {
      // Two rows in one official file sharing a canonical key is a change in
      // the source's shape, not data to reconcile. Fail closed.
      return {
        distinct: [],
        duplicate: { key, first: existing.surname, second: row.surname },
      };
    }
    byKey.set(key, { surname: row.surname, key, firstLine: index + 2 });
  }
  return { distinct: [...byKey.values()], duplicate: null };
}

/**
 * Creates the canonical identity for one attested source string: one
 * `Surname` plus one `NameForm` recording that this exact spelling was
 * attested by an official source.
 *
 * `canonical_display` and `form` hold the source string exactly as read
 * (NFC only) — a trailing space, a standalone combining mark, an embedded
 * slash and a non-Latin script all survive verbatim (AC-05).
 */
/** Rows of at most this many per INSERT (TASK-013). */
export const INSERT_CHUNK = 1_000;

export async function insertChunked<T extends keyof DB>(
  trx: Transaction<DB>,
  table: T,
  rows: readonly Parameters<ReturnType<Transaction<DB>["insertInto"]>["values"]>[0][],
): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await trx
      .insertInto(table)
      .values(rows.slice(i, i + INSERT_CHUNK) as never)
      .execute();
  }
}

export interface IdentityRows {
  readonly surnameId: string;
  readonly entities: readonly Insertable<DB["knowledge_entities"]>[];
  readonly surname: Insertable<DB["surnames"]>;
  readonly nameForm: Insertable<DB["name_forms"]>;
}

/**
 * The rows for a brand-new identity: a Surname, its one CANONICAL NameForm
 * and their two knowledge entities. Built here, inserted in chunks by the
 * caller (TASK-013). Nothing about the rows changed with batching — the
 * display is NFC only, the key is the resolver's, the flags are as detected.
 */
export function identityRows(sourceString: string): IdentityRows {
  const surnameId = uuidv7();
  const nameFormId = uuidv7();
  const display = toNfc(sourceString);
  const key = canonicalKey(sourceString);
  const detection = detectScripts(display);
  const script = detection.primary_script;
  return {
    surnameId,
    entities: [
      {
        entity_id: surnameId,
        entity_type: "SURNAME",
        scope: "SURNAME_LEVEL",
        privacy_class: "PUBLIC",
        lifecycle_status: "ACTIVE",
      },
      {
        entity_id: nameFormId,
        entity_type: "NAME_FORM",
        scope: "SURNAME_LEVEL",
        privacy_class: "PUBLIC",
        lifecycle_status: "ACTIVE",
      },
    ],
    surname: {
      surname_id: surnameId,
      canonical_display: display,
      canonical_key: key,
      canonical_key_version: CANONICAL_KEY_VERSION,
      primary_script: script,
      primary_locale: null,
      entity_status: "ACTIVE",
      merged_into_surname_id: null,
      // The §10.4 review/security flag, written exactly as detected
      // (TASK-010). False for every single-script row.
      mixed_script: detection.mixed_script,
      script_confusable_flag: detection.script_confusable_flag,
    },
    nameForm: {
      name_form_id: nameFormId,
      surname_id: surnameId,
      form: display,
      unicode_nfc: display,
      search_key: key,
      normalization_version: NORMALIZATION_VERSION,
      script,
      language_code: null,
      // ATTESTED, not DERIVED: an official register recorded this exact
      // spelling. Nothing here is generated (AC-11, AC-13).
      form_type: "CANONICAL",
      attestation_status: "ATTESTED",
    },
  };
}

/** Ensures the PESEL Source and its RightsProfile exist. Idempotent. */
export async function ensureRegistry(
  trx: Transaction<DB>,
  profile: RightsProfileSeed,
): Promise<string> {
  const existing = await trx
    .selectFrom("sources")
    .select(["source_id"])
    .where("source_key", "=", PESEL_SOURCE_KEY)
    .executeTakeFirst();
  if (existing) {
    return existing.source_id;
  }

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
      source_key: PESEL_SOURCE.source_key,
      name: PESEL_SOURCE.name,
      publisher: PESEL_SOURCE.publisher,
      source_type: PESEL_SOURCE.source_type,
      granularity: PESEL_SOURCE.granularity,
      geographic_scope: [...PESEL_SOURCE.geographic_scope],
      temporal_from: PESEL_SOURCE.temporal_from,
      temporal_to: PESEL_SOURCE.temporal_to,
      methodology_notes: PESEL_SOURCE.methodology_notes,
      authority_tier: PESEL_SOURCE.authority_tier,
      default_rights_profile_id: rightsProfileId,
      production_status: PESEL_SOURCE.production_status,
      homepage_or_reference_url: PESEL_SOURCE.homepage_or_reference_url,
    })
    .execute();

  return sourceId;
}

/**
 * Imports one PESEL resource version.
 *
 * Returns a typed outcome in every case, including failure. Nothing is
 * written unless the whole import succeeds: the database work happens in a
 * single transaction, so either the source record, every identity row,
 * every snapshot and every value land, or none do.
 */
export async function importPeselResource(
  db: Kysely<DB>,
  options: ImportPeselOptions,
): Promise<ImportOutcome> {
  const { resource, bytes, expectedSha256, rawPayload } = options;
  const profile = options.rightsProfile ?? PESEL_RIGHTS_PROFILE;
  const blank = emptyReport(resource.resource_id);

  // 1. Rights gate — before the file is even looked at.
  const refusal = rightsRefusal(profile);
  if (refusal) {
    return {
      kind: "FAILED",
      reason: "RIGHTS_BLOCKED",
      message: refusal,
      quarantined: [],
      report: null,
    };
  }

  // 2. Checksum — before parsing. Changed bytes are a finding to report,
  //    never something to import.
  const actualSha256 = sha256Hex(bytes);
  if (actualSha256 !== expectedSha256) {
    return {
      kind: "FAILED",
      reason: "CHECKSUM_MISMATCH",
      message: `expected sha256 ${expectedSha256}, got ${actualSha256}`,
      quarantined: [],
      report: null,
    };
  }

  // 3. Decode and parse, reusing TASK-002's validator unchanged.
  let rows: PeselSourceRow[];
  try {
    rows = parsePeselFile(decodePeselBytes(bytes));
  } catch (cause: unknown) {
    if (cause instanceof PeselSchemaError) {
      return {
        kind: "FAILED",
        reason: "SCHEMA_VIOLATION",
        message: cause.message,
        quarantined: [],
        report: null,
        cause,
      };
    }
    throw cause;
  }

  // 4. Duplicate canonical keys within one file are schema drift.
  const { distinct, duplicate } = collectDistinct(rows);
  if (duplicate) {
    return {
      kind: "FAILED",
      reason: "DUPLICATE_CANONICAL_KEY",
      message:
        `two rows share canonical key ${JSON.stringify(duplicate.key)}: ` +
        `${JSON.stringify(duplicate.first)} and ${JSON.stringify(duplicate.second)}`,
      quarantined: [],
      report: null,
    };
  }

  // 5. Read pass: resolve every distinct string through the TASK-003
  //    resolver (U-7). No writes happen here.
  const identities = new Map<string, ResolvedIdentity>();
  const quarantined: QuarantinedRow[] = [];
  const mixedScriptRows: FlaggedRow[] = [];
  // One READ ONLY transaction for every distinct string (TASK-013), through
  // the resolver's own bulk entry point — the same validation, keying and
  // T0/T1 classification as `resolveSurname`, fetched in lists.
  // An authoritative register's own row is evidence of what the register
  // says, so a mixed-script value is resolved on its exact key and its
  // finding is carried along, not refused (TASK-010, canonical 13 §10.4).
  const outcomes = await resolveSurnamesBulk(
    db,
    distinct.map((entry) => entry.surname),
    { mixedScript: "RESOLVE_FLAGGED" },
  );
  for (const [index, entry] of distinct.entries()) {
    const outcome = outcomes[index];
    if (outcome === undefined) {
      throw new Error(`bulk resolution returned no outcome for line ${entry.firstLine}`);
    }
    if (outcome.kind === "LOOKUP_FAILED") {
      // Infrastructure failure, never "this surname is unknown".
      return {
        kind: "FAILED",
        reason: "RESOLVER_LOOKUP_FAILED",
        message: `resolver lookup failed at ${outcome.stage}: ${outcome.message}`,
        quarantined: [],
        report: null,
        cause: outcome.cause,
      };
    }
    const status = outcome.resolution.resolution_status;
    if (outcome.resolution.validation_status === "MIXED_SCRIPT_REVIEW") {
      // Recorded once per distinct value, at its first line — the same
      // grain as a quarantine — so the report says exactly which rows
      // carry the flag.
      mixedScriptRows.push({ line: entry.firstLine, surname: entry.surname });
    }
    if (status === "EXACT" || status === "KNOWN_VARIANT") {
      identities.set(entry.key, {
        surnameId: outcome.resolution.resolved_surname_id,
        created: false,
      });
    } else if (status === "UNKNOWN") {
      identities.set(entry.key, { surnameId: null, created: true });
    } else {
      // MULTIPLE_EXACT, REVIEW_REQUIRED, or any validation-stage status.
      // Never resolved by guessing, never silently dropped.
      quarantined.push({ line: entry.firstLine, surname: entry.surname, reason: status });
    }
  }

  if (quarantined.length > 0) {
    const report: ReconciliationReport = {
      ...blank,
      rowsRead: rows.length,
      rowsImported: 0,
      rowsQuarantined: quarantined.length,
      quarantinedByReason: tallyReasons(quarantined),
    };
    return {
      kind: "FAILED",
      reason: "UNRESOLVED_ROWS",
      message:
        `${quarantined.length} row(s) could not be resolved unambiguously; ` +
        "import aborted without writing (TASK-004 §14 U-5 option (a))",
      quarantined,
      report,
    };
  }

  // 6. Write pass: one transaction for the whole resource.
  try {
    return await db.transaction().execute(async (trx) => {
      const sourceId = await ensureRegistry(trx, profile);

      // Already imported? Identical bytes for this resource are a no-op.
      const alreadyImported = await trx
        .selectFrom("source_records")
        .select(["source_record_id"])
        .where("source_id", "=", sourceId)
        .where("external_record_id", "=", resource.resource_id)
        .where("content_hash", "=", actualSha256)
        .executeTakeFirst();
      if (alreadyImported) {
        return {
          kind: "ALREADY_IMPORTED" as const,
          sourceRecordId: alreadyImported.source_record_id,
          report: { ...blank, rowsRead: rows.length },
        };
      }

      // A different version of the same resource is superseded, never
      // rewritten (ARCHITECTURE.md §10 invariant 6).
      const previous = await trx
        .selectFrom("source_records")
        .select(["source_record_id"])
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
          // The payload stored is the publisher's resource object; the CSV
          // is its csv_download_url representation (ADR-0003).
          record_type: "API_OBJECT",
          source_url: resource.official_source_url,
          raw_payload: JSON.stringify(rawPayload),
          // No object storage exists; the bytes are identified by
          // content_hash + source_url + raw_payload (TASK-004 §14 U-3).
          raw_text_ref: null,
          content_hash: actualSha256,
          retrieved_at: resource.retrieved_at,
          source_modified_at: resource.portal_modified_at,
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

      // Identity: create only what does not exist yet.
      let surnamesCreated = 0;
      let surnamesReused = 0;
      const surnameIdByKey = new Map<string, string>();
      const newEntities: Insertable<DB["knowledge_entities"]>[] = [];
      const newSurnames: Insertable<DB["surnames"]>[] = [];
      const newForms: Insertable<DB["name_forms"]>[] = [];
      for (const entry of distinct) {
        const identity = identities.get(entry.key);
        if (identity?.surnameId) {
          surnameIdByKey.set(entry.key, identity.surnameId);
          surnamesReused += 1;
          continue;
        }
        const built = identityRows(entry.surname);
        surnameIdByKey.set(entry.key, built.surnameId);
        newEntities.push(...built.entities);
        newSurnames.push(built.surname);
        newForms.push(built.nameForm);
        surnamesCreated += 1;
      }
      // Parents before children, each table in chunks, all in this one
      // transaction. A canonical-key collision with a concurrent writer
      // still fails the whole resource here (U-7).
      await insertChunked(trx, "knowledge_entities", newEntities);
      await insertChunked(trx, "surnames", newSurnames);
      await insertChunked(trx, "name_forms", newForms);

      // Distribution: one surname-scoped snapshot per row, and exactly one
      // national value per snapshot (place_id null). Every derived column
      // stays null — this task stores, it does not derive.
      // Buffered per table and inserted in chunks (TASK-013); one snapshot
      // and one value per row, exactly as before.
      const newSnapshots: Insertable<DB["distribution_snapshots"]>[] = [];
      const newValues: Insertable<DB["distribution_values"]>[] = [];
      for (const row of rows) {
        const key = canonicalKey(row.surname);
        const surnameId = surnameIdByKey.get(key);
        if (!surnameId) {
          throw new Error(`no identity resolved for canonical key ${JSON.stringify(key)}`);
        }
        const snapshotId = uuidv7();
        newSnapshots.push({
          distribution_snapshot_id: snapshotId,
          surname_id: surnameId,
          source_id: sourceId,
          source_record_id: sourceRecordId,
          // The PESEL reference date — never the portal timestamp and
          // never retrieved_at.
          as_of_date: resource.data_date,
          dataset_version: `${resource.resource_id}@${actualSha256.slice(0, 12)}`,
          geography_level: "NATIONAL",
          universe_description: resource.universe_description,
          // Denominator not verified; storing one would be invention
          // (TASK-004 §14 U-6).
          universe_size: null,
          // The national count lives in the single DistributionValue
          // below. Writing it here too would give one source fact two
          // places to drift apart.
          surname_total_count: null,
          methodology_key: resource.methodology_key,
          comparability_group: resource.comparability_group,
          coverage_notes: resource.coverage_notes,
        });
        newValues.push({
          distribution_value_id: uuidv7(),
          distribution_snapshot_id: snapshotId,
          // National aggregate (docs/canonical/11 §6.2).
          place_id: null,
          source_geography_key: null,
          count: BigInt(row.count),
          population_denominator: null,
          surname_share: null,
          population_rate: null,
          rank: null,
          derivation_version: null,
        });
      }
      await insertChunked(trx, "distribution_snapshots", newSnapshots);
      await insertChunked(trx, "distribution_values", newValues);
      const snapshotsWritten = newSnapshots.length;
      const valuesWritten = newValues.length;

      const report: ReconciliationReport = {
        resourceId: resource.resource_id,
        rowsRead: rows.length,
        rowsImported: rows.length,
        rowsQuarantined: 0,
        quarantinedByReason: {},
        surnamesCreated,
        surnamesReused,
        snapshotsWritten,
        valuesWritten,
        mixedScriptRows,
      };
      assertReconciles(report);

      return {
        kind: "IMPORTED" as const,
        sourceRecordId,
        supersededSourceRecordId: previous?.source_record_id ?? null,
        report,
      };
    });
  } catch (cause: unknown) {
    return {
      kind: "FAILED",
      reason: "DATABASE_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      quarantined: [],
      report: null,
      cause,
    };
  }
}
