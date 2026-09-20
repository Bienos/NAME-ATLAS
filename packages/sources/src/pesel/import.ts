/**
 * PESEL national surname importer — a `BULK_DATASET` connector over bytes
 * already on disk (TASK-004 §6 item 3; docs/canonical/12 §3.1, §9.2).
 *
 * The chain it builds, and nothing beyond it:
 *
 *   resource bytes (checksum-pinned)
 *   → Source + RightsProfile   (who published it, on what terms)
 *   → SourceRecord             (this exact resource version, immutable)
 *   → Surname + NameForm       (identity, on TASK-003's tables)
 *   → DistributionSnapshot     (surname-scoped, dated, method-scoped)
 *   → DistributionValue        (national, place_id = null)
 *
 * It produces no EvidenceItem, no Claim, no confidence, no citation, and no
 * derived value of any kind — no rank, share, rarity, rate or trend. Those
 * are reproducible claims and belong to TASK-005 (ARCHITECTURE.md §10
 * invariants 1 and 10).
 *
 * It does not download. Acquisition is manual and outside this process
 * (TASK-004 §4 precondition 7).
 *
 * ## Two phases, and why
 *
 * Phase 1 is a read pass that resolves every row through TASK-003's
 * `resolveSurname`. Phase 2 is a single read-write transaction that writes
 * everything. They are separate because `resolveSurname` runs its queries
 * inside a PostgreSQL `READ ONLY` transaction, and that guarantee is not
 * negotiable — so it is called before the write transaction opens, never
 * inside it (TASK-004 §14 U-7, answer: separate read pass).
 *
 * The gap that creates — a surname could appear between the read pass and
 * the write — is closed by the database, not by a lock: `surnames.canonical_key`
 * is UNIQUE, and phase 2 re-reads the keys it is about to create inside its
 * own transaction. A genuine race therefore ends as a constraint violation
 * that rolls the whole run back, never as a duplicate identity.
 *
 * ## Disposition of quarantined rows
 *
 * A row the resolver cannot attach to exactly one surname aborts the entire
 * run (TASK-004 §14 U-5, answer (a)). A quarantine in a two-column official
 * file almost certainly means this project has misread the source, and "fail
 * closed" is the standing posture (ARCHITECTURE.md §10 invariant 7). The
 * reconciliation report is still produced, with every quarantined row and its
 * reason, so the finding is visible rather than swallowed.
 */
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { detectScripts, resolveSurname } from "@name-atlas/resolver";
import { decodePeselBytes } from "../decode.js";
import { parsePeselFile } from "../parser.js";
import { assertContentHash } from "./checksum.js";
import { PeselImportError } from "./errors.js";
import { mapPeselRows } from "./mapping.js";
import type { MappedPeselRow } from "./mapping.js";
import {
  PESEL_GEOGRAPHY_LEVEL,
  PESEL_SOURCE_REGISTRY,
  peselCoverageNotes,
  peselDatasetVersion,
  peselResource,
  peselUniverseDescription,
} from "./registry.js";
import type { PeselResourceEntry, PeselResourceRole } from "./registry.js";
import { assertIngestionAllowed } from "./rights.js";
import { tallyQuarantineReasons } from "./report.js";
import type { PeselImportReport, QuarantineReason, QuarantinedPeselRow } from "./report.js";

/** The resource-metadata payload stored verbatim as `SourceRecord.raw_payload`. */
export type PeselResourceMetadata = NonNullable<DB["source_records"]["raw_payload"]>;

export interface PeselImportInput {
  /** Which national resource these bytes are. Selects the registry entry. */
  readonly role: PeselResourceRole;
  /** The resource bytes, already on disk. Never fetched by this module. */
  readonly bytes: Uint8Array;
  /**
   * SHA-256 the bytes must hash to. Always explicit: the registry's
   * checksums belong to the full official resources, and the repository's
   * fixtures are excerpts of them (TASK-004 §12 rule 1).
   */
  readonly expectedSha256: string;
  /**
   * The publisher's own resource-metadata response, stored verbatim. For the
   * official resources this is the capture under
   * `docs/sources/acquisition/2026-09-18/metadata/`.
   */
  readonly resourceMetadata: PeselResourceMetadata;
  /** When these bytes were retrieved from the publisher. Never inferred. */
  readonly retrievedAt: Date;
}

/** Resolver outcomes that quarantine a row rather than resolve it. */
const QUARANTINE_REASONS: readonly QuarantineReason[] = [
  "MULTIPLE_EXACT",
  "REVIEW_REQUIRED",
  "EMPTY",
  "EXCEEDS_OPERATIONAL_LIMIT",
  "MALFORMED_CONTROL_CHARACTERS",
];

function isQuarantineReason(status: string): status is QuarantineReason {
  return (QUARANTINE_REASONS as readonly string[]).includes(status);
}

/** One row of the read pass: either it resolved, or it is quarantined. */
type ResolvedRow =
  | { readonly kind: "REUSE"; readonly row: MappedPeselRow; readonly surnameId: string }
  | { readonly kind: "CREATE"; readonly row: MappedPeselRow };

interface ReadPass {
  readonly resolved: readonly ResolvedRow[];
  readonly quarantined: readonly QuarantinedPeselRow[];
}

/**
 * Resolves every mapped row against existing identity, outside any write
 * transaction (see the module note on U-7).
 *
 * A `LOOKUP_FAILED` outcome is an infrastructure failure and aborts the run.
 * It is never recorded as a quarantined row and never treated as "this
 * surname does not exist", which would misreport an outage as data
 * (TASK-004 §10).
 */
async function runReadPass(db: Kysely<DB>, rows: readonly MappedPeselRow[]): Promise<ReadPass> {
  const resolved: ResolvedRow[] = [];
  const quarantined: QuarantinedPeselRow[] = [];

  for (const row of rows) {
    const outcome = await resolveSurname(db, row.raw);
    if (outcome.kind === "LOOKUP_FAILED") {
      throw new PeselImportError(
        "resolver_lookup_failed",
        `surname resolution failed at stage ${outcome.stage}: ${outcome.message}; ` +
          "this is an infrastructure failure, not an unknown surname",
        row.line,
      );
    }

    const resolution = outcome.resolution;
    // The resolver derives the same canonical key from the same string. If
    // the two ever disagree, the importer is using a different normalisation
    // than the resolver — fail closed rather than write a key nothing can
    // look up (TASK-004 AC-10).
    if (resolution.canonical_key !== row.canonicalKey) {
      throw new PeselImportError(
        "resolver_lookup_failed",
        `canonical key disagreement for ${JSON.stringify(row.raw)}: importer produced ` +
          `${JSON.stringify(row.canonicalKey)}, resolver produced ` +
          `${JSON.stringify(resolution.canonical_key)}`,
        row.line,
      );
    }

    const status = resolution.resolution_status;
    if (status === "EXACT" || status === "KNOWN_VARIANT") {
      const surnameId = resolution.resolved_surname_id;
      if (surnameId === null) {
        throw new PeselImportError(
          "resolver_lookup_failed",
          `resolver reported ${status} without a surname id for ${JSON.stringify(row.raw)}`,
          row.line,
        );
      }
      resolved.push({ kind: "REUSE", row, surnameId });
      continue;
    }
    if (status === "UNKNOWN") {
      resolved.push({ kind: "CREATE", row });
      continue;
    }
    if (isQuarantineReason(status)) {
      quarantined.push({
        line: row.line,
        raw: row.raw,
        canonicalKey: row.canonicalKey,
        reason: status,
        candidateSurnameIds: resolution.candidate_surname_ids,
      });
      continue;
    }
    // Unreachable while ResolutionStatus holds. Fail closed rather than
    // silently dropping a row whose outcome this code does not understand.
    throw new PeselImportError(
      "resolver_lookup_failed",
      `unhandled resolution status ${JSON.stringify(String(status))} for ${JSON.stringify(row.raw)}`,
      row.line,
    );
  }

  return { resolved, quarantined };
}

interface RegisteredSource {
  readonly sourceId: string;
  readonly rightsProfileId: string;
}

/**
 * Seeds the PESEL `Source` and its `RightsProfile` if they do not exist, and
 * returns the existing pair if they do. Idempotent by `sources.source_key`.
 *
 * An existing `RightsProfile` is never updated: the canonical model makes it
 * versioned and immutable once applied (docs/canonical/11 §9.4), so changed
 * terms are a new profile created by whichever task records the change — not
 * an UPDATE here that would silently rewrite the terms a stored record was
 * ingested under.
 */
async function registerSource(trx: Transaction<DB>): Promise<RegisteredSource> {
  const { source, rights } = PESEL_SOURCE_REGISTRY;

  const existing = await trx
    .selectFrom("sources")
    .select(["source_id", "default_rights_profile_id"])
    .where("source_key", "=", source.source_key)
    .executeTakeFirst();

  if (existing) {
    return {
      sourceId: existing.source_id,
      rightsProfileId: existing.default_rights_profile_id,
    };
  }

  const rightsProfileId = uuidv7();
  await trx
    .insertInto("rights_profiles")
    .values({
      rights_profile_id: rightsProfileId,
      terms_version: rights.terms_version,
      terms_hash: rights.terms_hash,
      checked_at: rights.checked_at,
      metadata_rights: rights.metadata_rights,
      image_rights: rights.image_rights,
      transcription_rights: rights.transcription_rights,
      database_rights: rights.database_rights,
      automated_access: rights.automated_access,
      commercial_use: rights.commercial_use,
      redistribution: rights.redistribution,
      local_cache: rights.local_cache,
      attribution_required: rights.attribution_required,
      attribution_text: rights.attribution_text,
      source_owner: rights.source_owner,
      rights_url: rights.rights_url,
      contact_required: rights.contact_required,
      review_status: rights.review_status,
      valid_from: rights.valid_from,
      valid_to: rights.valid_to,
      notes: rights.notes,
    })
    .execute();

  const sourceId = uuidv7();
  await trx
    .insertInto("sources")
    .values({
      source_id: sourceId,
      parent_source_id: null,
      source_key: source.source_key,
      name: source.name,
      publisher: source.publisher,
      source_type: source.source_type,
      granularity: source.granularity,
      geographic_scope: [...source.geographic_scope],
      temporal_from: source.temporal_from,
      temporal_to: source.temporal_to,
      methodology_notes: source.methodology_notes,
      authority_tier: source.authority_tier,
      default_rights_profile_id: rightsProfileId,
      production_status: source.production_status,
      homepage_or_reference_url: source.homepage_or_reference_url,
    })
    .execute();

  return { sourceId, rightsProfileId };
}

/** Looks up an already-imported record for these exact bytes. */
async function findImportedRecord(
  db: Kysely<DB> | Transaction<DB>,
  externalRecordId: string,
  contentHash: string,
): Promise<string | null> {
  const row = await db
    .selectFrom("source_records")
    .innerJoin("sources", "sources.source_id", "source_records.source_id")
    .select("source_records.source_record_id as source_record_id")
    .where("sources.source_key", "=", PESEL_SOURCE_REGISTRY.source.source_key)
    .where("source_records.external_record_id", "=", externalRecordId)
    .where("source_records.content_hash", "=", contentHash)
    .executeTakeFirst();
  return row?.source_record_id ?? null;
}

function emptyReport(
  disposition: PeselImportReport["disposition"],
  resource: PeselResourceEntry,
  contentHash: string,
  overrides: Partial<PeselImportReport> = {},
): PeselImportReport {
  return {
    disposition,
    resourceRole: resource.role,
    externalRecordId: resource.resource_id,
    contentHash,
    rowsRead: 0,
    rowsImported: 0,
    rowsQuarantined: 0,
    rowsRolledBack: 0,
    quarantinedByReason: {},
    quarantined: [],
    surnamesCreated: 0,
    surnamesReused: 0,
    snapshotsWritten: 0,
    valuesWritten: 0,
    sourceRecordId: null,
    supersededSourceRecordId: null,
    ...overrides,
  };
}

interface WriteOutcome {
  readonly sourceRecordId: string;
  readonly supersededSourceRecordId: string | null;
  readonly surnamesCreated: number;
  readonly surnamesReused: number;
  readonly snapshotsWritten: number;
  readonly valuesWritten: number;
}

/**
 * Writes the whole run inside one transaction: the SourceRecord, every
 * identity row, every snapshot and every value. Either all of it lands or
 * none of it does (TASK-004 AC-21).
 */
async function writeImport(
  trx: Transaction<DB>,
  resource: PeselResourceEntry,
  input: PeselImportInput,
  contentHash: string,
  resolved: readonly ResolvedRow[],
): Promise<WriteOutcome> {
  const { sourceId, rightsProfileId } = await registerSource(trx);

  // Re-check the EFFECTIVE stored rights inside the transaction. The
  // pre-flight gate read the registry entry; this reads what the database
  // actually holds, which is what a later legal review would have changed.
  const stored = await trx
    .selectFrom("rights_profiles")
    .select(["automated_access", "review_status"])
    .where("rights_profile_id", "=", rightsProfileId)
    .executeTakeFirstOrThrow();
  assertIngestionAllowed(stored, `stored RightsProfile ${rightsProfileId}`);

  // Supersession: a previously ACTIVE record for this resource whose bytes
  // differ is marked UPDATED and pointed at by the new record. The old row's
  // payload is never rewritten (TASK-004 AC-22, §9 invariant 8).
  const previous = await trx
    .selectFrom("source_records")
    .select(["source_record_id"])
    .where("source_id", "=", sourceId)
    .where("external_record_id", "=", resource.resource_id)
    .where("record_status", "=", "ACTIVE")
    .orderBy("source_record_id")
    .executeTakeFirst();

  const sourceRecordId = uuidv7();
  await trx
    .insertInto("source_records")
    .values({
      source_record_id: sourceRecordId,
      source_id: sourceId,
      external_record_id: resource.resource_id,
      external_parent_id: PESEL_SOURCE_REGISTRY.dataset_id,
      record_type: "DATA_ROW",
      source_url: resource.csv_download_url,
      raw_payload: input.resourceMetadata,
      // No object storage exists, so the bytes themselves cannot be
      // preserved — only identified, by the checksum above plus the URL and
      // the payload. Recorded as a deviation from docs/canonical/12 §9.2's
      // "store raw file + metadata", acknowledged by the project owner
      // (TASK-004 §14 U-3), and left null rather than faked.
      raw_text_ref: null,
      content_hash: contentHash,
      retrieved_at: input.retrievedAt,
      source_modified_at: resource.portal_modified_at,
      // Null means "use the Source default". No resource-level rights
      // evidence exists, so there is no override to record.
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

  // Re-read, inside this transaction, the keys the read pass said do not
  // exist. Uses the keys the shared `canonicalKey` already produced — not a
  // second normalisation (TASK-004 §13).
  const keysToCreate = resolved
    .filter((entry): entry is Extract<ResolvedRow, { kind: "CREATE" }> => entry.kind === "CREATE")
    .map((entry) => entry.row.canonicalKey);

  const appeared = new Map<string, string>();
  if (keysToCreate.length > 0) {
    const rows = await trx
      .selectFrom("surnames")
      .select(["surname_id", "canonical_key"])
      .where("canonical_key", "in", keysToCreate)
      .execute();
    for (const row of rows) {
      appeared.set(row.canonical_key, row.surname_id);
    }
  }

  let surnamesCreated = 0;
  let surnamesReused = 0;
  const surnameIdByLine = new Map<number, string>();

  for (const entry of resolved) {
    if (entry.kind === "REUSE") {
      surnameIdByLine.set(entry.row.line, entry.surnameId);
      surnamesReused += 1;
      continue;
    }

    const raced = appeared.get(entry.row.canonicalKey);
    if (raced !== undefined) {
      // Created between the read pass and this transaction. Reuse it — the
      // UNIQUE constraint is what makes this safe rather than a lock.
      surnameIdByLine.set(entry.row.line, raced);
      surnamesReused += 1;
      continue;
    }

    const surnameId = uuidv7();
    await trx
      .insertInto("knowledge_entities")
      .values({
        entity_id: surnameId,
        entity_type: "SURNAME",
        scope: "SURNAME_LEVEL",
        privacy_class: "PUBLIC",
        lifecycle_status: "ACTIVE",
      })
      .execute();
    await trx
      .insertInto("surnames")
      .values({
        surname_id: surnameId,
        canonical_display: entry.row.display,
        canonical_key: entry.row.canonicalKey,
        canonical_key_version: entry.row.canonicalKeyVersion,
        primary_script: entry.row.script,
        primary_locale: null,
        entity_status: "ACTIVE",
        merged_into_surname_id: null,
      })
      .execute();

    // One NameForm per created Surname: the honest record that this exact
    // spelling was attested by an official source. ATTESTED, not DERIVED or
    // GENERATED_CANDIDATE — nothing was generated (TASK-004 AC-11, AC-13).
    const nameFormId = uuidv7();
    await trx
      .insertInto("knowledge_entities")
      .values({
        entity_id: nameFormId,
        entity_type: "NAME_FORM",
        scope: "SURNAME_LEVEL",
        privacy_class: "PUBLIC",
        lifecycle_status: "ACTIVE",
      })
      .execute();
    await trx
      .insertInto("name_forms")
      .values({
        name_form_id: nameFormId,
        surname_id: surnameId,
        form: entry.row.display,
        unicode_nfc: entry.row.display,
        search_key: entry.row.searchKey,
        normalization_version: entry.row.normalizationVersion,
        script: entry.row.script,
        language_code: null,
        form_type: "CANONICAL",
        attestation_status: "ATTESTED",
      })
      .execute();

    surnameIdByLine.set(entry.row.line, surnameId);
    appeared.set(entry.row.canonicalKey, surnameId);
    surnamesCreated += 1;
  }

  // --- snapshots and values ---------------------------------------------
  const universeDescription = peselUniverseDescription(resource);
  const coverageNotes = peselCoverageNotes(resource);
  const datasetVersion = peselDatasetVersion(resource);

  let snapshotsWritten = 0;
  let valuesWritten = 0;

  for (const entry of resolved) {
    const surnameId = surnameIdByLine.get(entry.row.line);
    if (surnameId === undefined) {
      throw new PeselImportError(
        "database_failure",
        `no surname was resolved or created for line ${String(entry.row.line)}`,
        entry.row.line,
      );
    }

    const snapshotId = uuidv7();
    await trx
      .insertInto("distribution_snapshots")
      .values({
        distribution_snapshot_id: snapshotId,
        surname_id: surnameId,
        source_id: sourceId,
        source_record_id: sourceRecordId,
        // The PESEL reference date — what the data describes. Never the
        // portal timestamp, never retrieved_at (TASK-004 AC-06).
        as_of_date: resource.data_date,
        dataset_version: datasetVersion,
        geography_level: PESEL_GEOGRAPHY_LEVEL,
        universe_description: universeDescription,
        // No verified PESEL living-population denominator exists, and
        // docs/canonical/11 §6.1 stores one only if methodologically valid
        // (TASK-004 §14 U-6).
        universe_size: null,
        // Left null deliberately: with exactly one national value per
        // snapshot, a snapshot-level total would be a second copy of that
        // value's count, and the count belongs where §6.2 puts it.
        surname_total_count: null,
        methodology_key: resource.methodology_key,
        comparability_group: resource.comparability_group,
        coverage_notes: coverageNotes,
      })
      .execute();
    snapshotsWritten += 1;

    await trx
      .insertInto("distribution_values")
      .values({
        distribution_value_id: uuidv7(),
        distribution_snapshot_id: snapshotId,
        // National aggregate. `places` does not exist and a national count is
        // never extrapolated into a region (docs/canonical/12 §9.8).
        place_id: null,
        source_geography_key: null,
        // The source's own Liczba, unchanged.
        count: entry.row.count,
        population_denominator: null,
        // This task stores; it does not derive (docs/canonical/11 §6.2).
        surname_share: null,
        population_rate: null,
        rank: null,
        derivation_version: null,
      })
      .execute();
    valuesWritten += 1;
  }

  return {
    sourceRecordId,
    supersededSourceRecordId: previous?.source_record_id ?? null,
    surnamesCreated,
    surnamesReused,
    snapshotsWritten,
    valuesWritten,
  };
}

/**
 * Imports one PESEL national resource from bytes already on disk.
 *
 * Order of operations is itself part of the contract: the rights gate runs
 * before the bytes are touched, the checksum before they are decoded, and
 * the parse before any database write — so a refusal, a changed resource or
 * schema drift each stop the run with nothing written.
 */
export async function importPeselResource(
  db: Kysely<DB>,
  input: PeselImportInput,
): Promise<PeselImportReport> {
  const resource = peselResource(input.role);

  // 1. Rights hard gate, on the registry entry, before any file or database
  //    access (docs/canonical/12 §6.4; TASK-004 AC-08).
  assertIngestionAllowed(
    PESEL_SOURCE_REGISTRY.rights,
    `registry RightsProfile for ${PESEL_SOURCE_REGISTRY.source.source_key}`,
  );

  // 2. Content pinning, before decoding or parsing (TASK-004 AC-20, §10).
  const contentHash = assertContentHash(input.bytes, input.expectedSha256);

  // 3. Idempotency. These exact bytes already imported means nothing to do —
  //    not a failure, and not a reason to parse the file again (AC-18).
  const alreadyImported = await findImportedRecord(db, resource.resource_id, contentHash);
  if (alreadyImported !== null) {
    return emptyReport("ALREADY_IMPORTED", resource, contentHash, {
      sourceRecordId: alreadyImported,
    });
  }

  // 4. Decode and parse through the existing validator, unchanged. Any schema
  //    drift raises PeselSchemaError and aborts the whole run (AC-01, AC-03,
  //    AC-20).
  const text = decodePeselBytes(input.bytes);
  const parsed = parsePeselFile(text);
  const rows = mapPeselRows(parsed);

  // 5. Read pass through TASK-003's resolver, outside any write transaction.
  const { resolved, quarantined } = await runReadPass(db, rows);

  if (quarantined.length > 0) {
    // Answer to §14 U-5: abort the whole run. Nothing was written — the write
    // transaction never opened — and every quarantined row is reported.
    return emptyReport("ABORTED_QUARANTINE", resource, contentHash, {
      rowsRead: rows.length,
      rowsQuarantined: quarantined.length,
      rowsRolledBack: rows.length - quarantined.length,
      quarantinedByReason: tallyQuarantineReasons(quarantined),
      quarantined,
    });
  }

  // 6. One transaction per resource: all of it, or none of it (AC-21).
  const outcome = await db
    .transaction()
    .execute((trx) => writeImport(trx, resource, input, contentHash, resolved));

  return {
    disposition: "IMPORTED",
    resourceRole: resource.role,
    externalRecordId: resource.resource_id,
    contentHash,
    rowsRead: rows.length,
    rowsImported: outcome.valuesWritten,
    rowsQuarantined: 0,
    rowsRolledBack: rows.length - outcome.valuesWritten,
    quarantinedByReason: {},
    quarantined: [],
    surnamesCreated: outcome.surnamesCreated,
    surnamesReused: outcome.surnamesReused,
    snapshotsWritten: outcome.snapshotsWritten,
    valuesWritten: outcome.valuesWritten,
    sourceRecordId: outcome.sourceRecordId,
    supersededSourceRecordId: outcome.supersededSourceRecordId,
  };
}

/**
 * Row counts of every table an import can touch, for the zero-write
 * assertions TASK-004 §11 items 11, 14 and 16 require. Eight tables: the
 * three identity tables, the two registry tables, and the three this
 * migration added.
 */
export interface IngestionRowCounts {
  readonly knowledge_entities: number;
  readonly surnames: number;
  readonly name_forms: number;
  readonly rights_profiles: number;
  readonly sources: number;
  readonly source_records: number;
  readonly distribution_snapshots: number;
  readonly distribution_values: number;
}

const COUNTED_TABLES = [
  "knowledge_entities",
  "surnames",
  "name_forms",
  "rights_profiles",
  "sources",
  "source_records",
  "distribution_snapshots",
  "distribution_values",
] as const;

export async function countIngestionRows(db: Kysely<DB>): Promise<IngestionRowCounts> {
  const counts: Record<string, number> = {};
  for (const table of COUNTED_TABLES) {
    const row = await db
      .selectFrom(table)
      .select((eb) => eb.fn.countAll<string>().as("n"))
      .executeTakeFirstOrThrow();
    counts[table] = Number(row.n);
  }
  return counts as unknown as IngestionRowCounts;
}

/**
 * Asserts the TASK-004 §9 data-integrity invariants as queries against the
 * database, returning the name of every invariant that failed.
 *
 * Deliberately a query per invariant rather than a code review: §11 says a
 * test that asserts a column exists is not a test of an invariant.
 */
export async function checkIngestionInvariants(db: Kysely<DB>): Promise<string[]> {
  const failures: string[] = [];
  const check = async (name: string, query: string): Promise<void> => {
    const result = await sql<{
      n: string;
    }>`SELECT count(*)::text AS n FROM (${sql.raw(query)}) AS violations`.execute(db);
    const n = Number(result.rows[0]?.n ?? "0");
    if (n > 0) {
      failures.push(`${name}: ${String(n)} violating row(s)`);
    }
  };

  // 1. Every snapshot is surname-scoped and points at a real surname.
  await check(
    "1_snapshot_surname_scoped",
    `SELECT 1 FROM distribution_snapshots s
       LEFT JOIN surnames n ON n.surname_id = s.surname_id
      WHERE s.surname_id IS NULL OR n.surname_id IS NULL`,
  );
  // 2. Every value is the national aggregate of a national snapshot.
  await check(
    "2_values_national_only",
    `SELECT 1 FROM distribution_values v
       JOIN distribution_snapshots s
         ON s.distribution_snapshot_id = v.distribution_snapshot_id
      WHERE v.place_id IS NOT NULL OR s.geography_level <> 'NATIONAL'`,
  );
  // 3. No count is 0, 1, negative or null.
  await check(
    "3_counts_above_suppression_floor",
    `SELECT 1 FROM distribution_values WHERE count IS NULL OR count < 2`,
  );
  // 4. No derived field is populated by this task.
  await check(
    "4_no_derived_fields",
    `SELECT 1 FROM distribution_values
      WHERE surname_share IS NOT NULL
         OR population_rate IS NOT NULL
         OR rank IS NOT NULL
         OR derivation_version IS NOT NULL`,
  );
  // 5. canonical_key is unique. (The UNIQUE constraint guarantees it; this
  //    query proves the constraint is actually in force.)
  await check(
    "5_canonical_key_unique",
    `SELECT 1 FROM surnames GROUP BY canonical_key HAVING count(*) > 1`,
  );
  // 7. Every content hash is lowercase hex SHA-256, unique per version.
  await check(
    "7_content_hash_shape",
    `SELECT 1 FROM source_records WHERE content_hash !~ '^[0-9a-f]{64}$'`,
  );
  await check(
    "7_content_hash_unique_per_version",
    `SELECT 1 FROM source_records
      GROUP BY source_id, external_record_id, content_hash HAVING count(*) > 1`,
  );
  // 8. Supersession forms no cycle and nothing supersedes itself.
  await check(
    "8_no_self_supersession",
    `SELECT 1 FROM source_records WHERE supersedes_source_record_id = source_record_id`,
  );
  await check(
    "8_no_supersession_cycle",
    `WITH RECURSIVE chain(start_id, current_id, depth) AS (
       SELECT source_record_id, supersedes_source_record_id, 1
         FROM source_records
        WHERE supersedes_source_record_id IS NOT NULL
       UNION ALL
       SELECT c.start_id, r.supersedes_source_record_id, c.depth + 1
         FROM chain c
         JOIN source_records r ON r.source_record_id = c.current_id
        WHERE r.supersedes_source_record_id IS NOT NULL AND c.depth < 64
     )
     SELECT 1 FROM chain WHERE current_id = start_id`,
  );
  // 9. as_of_date is the source's data date, never the retrieval date.
  await check(
    "9_as_of_date_is_not_retrieval_date",
    `SELECT 1 FROM distribution_snapshots s
       JOIN source_records r ON r.source_record_id = s.source_record_id
      WHERE s.as_of_date IS NULL OR s.as_of_date = (r.retrieved_at AT TIME ZONE 'UTC')::date`,
  );
  // 10. Exactly one value per snapshot.
  await check(
    "10_one_value_per_snapshot",
    `SELECT 1 FROM distribution_snapshots s
       LEFT JOIN distribution_values v
         ON v.distribution_snapshot_id = s.distribution_snapshot_id
      GROUP BY s.distribution_snapshot_id HAVING count(v.distribution_value_id) <> 1`,
  );
  // 11. No two snapshots for the same (surname, source record).
  await check(
    "11_one_snapshot_per_surname_and_record",
    `SELECT 1 FROM distribution_snapshots
      GROUP BY surname_id, source_record_id HAVING count(*) > 1`,
  );
  // 12. Every primary key is a UUID version 7.
  //     Version nibble is the 13th hex digit of the canonical text form.
  await check(
    "12_uuidv7_primary_keys",
    `SELECT 1 FROM (
       SELECT entity_id::text AS id FROM knowledge_entities
       UNION ALL SELECT surname_id::text FROM surnames
       UNION ALL SELECT name_form_id::text FROM name_forms
       UNION ALL SELECT rights_profile_id::text FROM rights_profiles
       UNION ALL SELECT source_id::text FROM sources
       UNION ALL SELECT source_record_id::text FROM source_records
       UNION ALL SELECT distribution_snapshot_id::text FROM distribution_snapshots
       UNION ALL SELECT distribution_value_id::text FROM distribution_values
     ) AS ids WHERE substring(id from 15 for 1) <> '7'`,
  );
  // 13. Every source's default rights profile exists.
  await check(
    "13_source_rights_profile_exists",
    `SELECT 1 FROM sources s
       LEFT JOIN rights_profiles p ON p.rights_profile_id = s.default_rights_profile_id
      WHERE p.rights_profile_id IS NULL`,
  );

  return failures;
}

/**
 * Invariant 6 checked in TypeScript, because it compares stored values
 * against the resolver's own functions rather than against SQL: every
 * `name_forms.search_key` must equal `canonicalKey(form)` and every
 * `normalization_version` the resolver's own constant. Invariant 5's second
 * half (`canonicalKey(canonical_display) = canonical_key`) is checked the
 * same way.
 *
 * Takes the two functions as arguments so the caller passes the resolver's
 * real ones and this module cannot quietly substitute a copy.
 */
export async function checkNormalisationInvariants(
  db: Kysely<DB>,
  keyOf: (value: string) => string,
  normalizationVersion: string,
): Promise<string[]> {
  const failures: string[] = [];

  const surnames = await db
    .selectFrom("surnames")
    .select(["canonical_display", "canonical_key", "canonical_key_version"])
    .execute();
  for (const row of surnames) {
    if (keyOf(row.canonical_display) !== row.canonical_key) {
      failures.push(`5_canonical_key_matches_display: ${JSON.stringify(row.canonical_display)}`);
    }
    if (row.canonical_key_version !== normalizationVersion) {
      failures.push(`5_canonical_key_version: ${JSON.stringify(row.canonical_display)}`);
    }
  }

  const forms = await db
    .selectFrom("name_forms")
    .select(["form", "search_key", "normalization_version", "script"])
    .execute();
  for (const row of forms) {
    if (keyOf(row.form) !== row.search_key) {
      failures.push(`6_search_key_matches_form: ${JSON.stringify(row.form)}`);
    }
    if (row.normalization_version !== normalizationVersion) {
      failures.push(`6_normalization_version: ${JSON.stringify(row.form)}`);
    }
    if (row.script !== detectScripts(row.form).primary_script) {
      failures.push(`6_script_matches_form: ${JSON.stringify(row.form)}`);
    }
  }

  return failures;
}
