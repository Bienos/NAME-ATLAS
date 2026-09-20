/**
 * PESEL **regional** importer (TASK-011, per D-004 "Preferred").
 *
 *   rights gate → checksum → decode → parse fail-closed → resolve identity
 *   → [one transaction] source record → surnames → voivodeship places
 *   → one surname-scoped snapshot per surname → one value per (surname, voivodeship)
 *
 * Shares the national importer's internals rather than copying them:
 * `ensureRegistry`, `identityRows`, `insertChunked`, `rightsRefusal`,
 * `sha256Hex`. What differs is the file shape, the geography column, and
 * that a value now references a `Place`.
 *
 * What it deliberately does NOT do:
 *
 *   - It derives nothing. No share of the national count, no rank within a
 *     region, no "most common in". Every derived column on
 *     `distribution_values` stays null (ARCHITECTURE.md §10 invariant 10);
 *     `CURRENT_DISTRIBUTION` is a later task's claim.
 *   - It sums nothing: not the two sexes, not the regions into a national
 *     figure, not a region against the national count. The one supported
 *     invariant TASK-008 established is `regional sum ≤ national count`, and
 *     the report states the sum without asserting any relation.
 *   - It writes no zero. An absent (surname, voivodeship) cell produces no
 *     row: it is zero, suppressed, or out of scope, and the difference is
 *     not observable (invariant 4).
 *   - It never maps a geography value it does not recognise. Without a
 *     recorded TERC correspondence there is no `Place` to reference, and a
 *     code is never guessed.
 */
import type { Insertable, Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, resolveSurnamesBulk } from "@name-atlas/resolver";
import { decodePeselBytes } from "./decode.js";
import { PeselSchemaError } from "./errors.js";
import { parsePeselRegionalFile } from "./regional-parser.js";
import type { PeselRegionalSourceRow } from "./regional-schema.js";
import { PESEL_RIGHTS_PROFILE } from "./registry.js";
import type { PeselResourceDescriptor, RightsProfileSeed } from "./registry.js";
import {
  ensureRegistry,
  identityRows,
  insertChunked,
  rightsRefusal,
  sha256Hex,
} from "./importer.js";
import { seedVoivodeshipPlacesIn } from "./voivodeships.js";
import { assertRegionalReconciles, emptyRegionalReport, tallyReasons } from "./import-result.js";
import type {
  FlaggedRow,
  QuarantinedRow,
  RegionalImportOutcome,
  RegionalReconciliationReport,
} from "./import-result.js";

export interface ImportPeselRegionalOptions {
  /** The approved, checksum-pinned regional resource this file claims to be. */
  readonly resource: PeselResourceDescriptor;
  readonly bytes: Uint8Array;
  /** The SHA-256 the caller expects, passed explicitly (a fixture has its own). */
  readonly expectedSha256: string;
  /** The publisher's resource-metadata object, stored verbatim. */
  readonly rawPayload: unknown;
  /** Overridable only so tests can exercise the rights gate. */
  readonly rightsProfile?: RightsProfileSeed;
}

interface DistinctSurname {
  readonly surname: string;
  readonly key: string;
  readonly firstLine: number;
}

/**
 * Distinct surnames by canonical key, and the first repeated
 * (voivodeship, key) cell if any.
 *
 * A surname legitimately appears up to 16 times here — once per voivodeship
 * — so a repeated *surname* is data. A repeated *cell* is schema drift:
 * TASK-008 observed zero in either file.
 */
function collectRegional(rows: readonly PeselRegionalSourceRow[]): {
  readonly distinct: DistinctSurname[];
  readonly duplicateCell: {
    readonly geography: string;
    readonly key: string;
    readonly line: number;
  } | null;
} {
  const byKey = new Map<string, DistinctSurname>();
  const seenCells = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const key = canonicalKey(row.surname);
    // U+0000 cannot occur in either field (validation rejects control
    // characters), so it is a safe separator for the composite cell key.
    const cell = `${row.geography}\u0000${key}`;
    if (seenCells.has(cell)) {
      return { distinct: [], duplicateCell: { geography: row.geography, key, line: index + 2 } };
    }
    seenCells.add(cell);
    if (!byKey.has(key)) {
      byKey.set(key, { surname: row.surname, key, firstLine: index + 2 });
    }
  }
  return { distinct: [...byKey.values()], duplicateCell: null };
}

/**
 * Imports one regional resource version. Returns a typed outcome in every
 * case; nothing is written unless the whole import succeeds.
 */
export async function importPeselRegionalResource(
  db: Kysely<DB>,
  options: ImportPeselRegionalOptions,
): Promise<RegionalImportOutcome> {
  const { resource, bytes, expectedSha256, rawPayload } = options;
  const profile = options.rightsProfile ?? PESEL_RIGHTS_PROFILE;
  const blank = emptyRegionalReport(resource.resource_id);

  // 1. Rights gate — before the file is looked at.
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

  // 2. Checksum — before parsing.
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

  // 3. Decode and parse with the regional validator.
  let rows: PeselRegionalSourceRow[];
  try {
    rows = parsePeselRegionalFile(decodePeselBytes(bytes));
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

  // 4. A repeated (voivodeship, surname) cell is schema drift.
  const { distinct, duplicateCell } = collectRegional(rows);
  if (duplicateCell) {
    return {
      kind: "FAILED",
      reason: "DUPLICATE_CANONICAL_KEY",
      message:
        `line ${duplicateCell.line}: voivodeship ${JSON.stringify(duplicateCell.geography)} ` +
        `repeats canonical key ${JSON.stringify(duplicateCell.key)}; one cell per ` +
        "(surname, voivodeship) is the confirmed shape",
      quarantined: [],
      report: null,
    };
  }

  // 5. Read pass: one bulk resolution, mixed-script rows flagged not refused.
  const identities = new Map<string, { readonly surnameId: string | null }>();
  const quarantined: QuarantinedRow[] = [];
  const mixedScriptRows: FlaggedRow[] = [];
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
      mixedScriptRows.push({ line: entry.firstLine, surname: entry.surname });
    }
    if (status === "EXACT" || status === "KNOWN_VARIANT") {
      identities.set(entry.key, { surnameId: outcome.resolution.resolved_surname_id });
    } else if (status === "UNKNOWN") {
      identities.set(entry.key, { surnameId: null });
    } else {
      quarantined.push({ line: entry.firstLine, surname: entry.surname, reason: status });
    }
  }

  if (quarantined.length > 0) {
    return {
      kind: "FAILED",
      reason: "UNRESOLVED_ROWS",
      message:
        `${quarantined.length} row(s) could not be resolved unambiguously; ` +
        "import aborted without writing (TASK-004 §14 U-5 option (a))",
      quarantined,
      report: {
        ...blank,
        rowsRead: rows.length,
        rowsQuarantined: quarantined.length,
        quarantinedByReason: tallyReasons(quarantined),
      },
    };
  }

  // 6. Write pass: one transaction for the whole resource.
  return db.transaction().execute(async (trx) => {
    const sourceId = await ensureRegistry(trx, profile);

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
        record_type: "API_OBJECT",
        source_url: resource.official_source_url,
        raw_payload: JSON.stringify(rawPayload),
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

    // --- Places: the 16 voivodeships, from the recorded TERC correspondence.
    // Inside this transaction, so places and values land or roll back together.
    const places = await seedVoivodeshipPlacesIn(trx);

    // --- Identities, created only where they do not exist yet.
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
    await insertChunked(trx, "knowledge_entities", newEntities);
    await insertChunked(trx, "surnames", newSurnames);
    await insertChunked(trx, "name_forms", newForms);

    // --- One surname-scoped snapshot per surname (docs/canonical/11 §6.1),
    //     one value per (surname, voivodeship) cell with its place.
    const snapshotIdByKey = new Map<string, string>();
    const newSnapshots: Insertable<DB["distribution_snapshots"]>[] = [];
    for (const entry of distinct) {
      const surnameId = surnameIdByKey.get(entry.key);
      if (!surnameId) {
        throw new Error(`no identity resolved for canonical key ${JSON.stringify(entry.key)}`);
      }
      const snapshotId = uuidv7();
      snapshotIdByKey.set(entry.key, snapshotId);
      newSnapshots.push({
        distribution_snapshot_id: snapshotId,
        surname_id: surnameId,
        source_id: sourceId,
        source_record_id: sourceRecordId,
        as_of_date: resource.data_date,
        dataset_version: `${resource.resource_id}@${actualSha256.slice(0, 12)}`,
        geography_level: "REGION",
        universe_description: resource.universe_description,
        // Not verified for the regional universe either; U-6's published-
        // universe denominator is a derived claim input, not a source fact.
        universe_size: null,
        // The counts live in the values below. One source fact, one place.
        surname_total_count: null,
        methodology_key: resource.methodology_key,
        comparability_group: resource.comparability_group,
        // Carries the registered-residence restriction and the residual.
        coverage_notes: resource.coverage_notes,
      });
    }
    await insertChunked(trx, "distribution_snapshots", newSnapshots);

    const referencedPlaces = new Set<string>();
    let regionalCountSum = 0;
    const newValues: Insertable<DB["distribution_values"]>[] = [];
    for (const row of rows) {
      const key = canonicalKey(row.surname);
      const snapshotId = snapshotIdByKey.get(key);
      const placeId = places.placeIdByGeographyValue.get(row.geography);
      if (!snapshotId) {
        throw new Error(`no snapshot for canonical key ${JSON.stringify(key)}`);
      }
      if (!placeId) {
        // Unreachable while the parser's closed value set holds; a place that
        // is missing anyway is a refusal, never a null place_id on a regional
        // value (docs/canonical/11 §6.2: null means national).
        throw new Error(
          `no voivodeship place for geography value ${JSON.stringify(row.geography)}`,
        );
      }
      referencedPlaces.add(placeId);
      regionalCountSum += row.count;
      newValues.push({
        distribution_value_id: uuidv7(),
        distribution_snapshot_id: snapshotId,
        place_id: placeId,
        // The publisher's own string, kept beside the resolved place so the
        // mapping stays auditable (docs/canonical/11 §6.2).
        source_geography_key: row.geography,
        count: BigInt(row.count),
        population_denominator: null,
        surname_share: null,
        population_rate: null,
        rank: null,
        derivation_version: null,
      });
    }
    await insertChunked(trx, "distribution_values", newValues);

    // --- Reported, not asserted: how many of these surnames have no national
    //     row at all. TASK-008 observed zero; a non-zero count is a finding.
    const nationalKeys = await trx
      .selectFrom("distribution_snapshots as s")
      .innerJoin("surnames as sn", "sn.surname_id", "s.surname_id")
      .select(["sn.canonical_key"])
      .where("s.geography_level", "=", "NATIONAL")
      .distinct()
      .execute();
    const nationalKeySet = new Set(nationalKeys.map((row) => row.canonical_key));
    const surnamesWithoutNationalRow = distinct.filter(
      (entry) => !nationalKeySet.has(entry.key),
    ).length;

    const report: RegionalReconciliationReport = {
      resourceId: resource.resource_id,
      rowsRead: rows.length,
      rowsImported: rows.length,
      rowsQuarantined: 0,
      quarantinedByReason: {},
      surnamesCreated,
      surnamesReused,
      snapshotsWritten: newSnapshots.length,
      valuesWritten: newValues.length,
      placesReferenced: referencedPlaces.size,
      mixedScriptRows,
      regionalCountSum,
      surnamesWithoutNationalRow,
    };
    assertRegionalReconciles(report);

    return {
      kind: "IMPORTED" as const,
      sourceRecordId,
      supersededSourceRecordId: previous?.source_record_id ?? null,
      report,
    };
  });
}
