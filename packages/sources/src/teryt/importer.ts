/**
 * TERYT TERC + SIMC importer (TASK-039) — the `BULK_DATASET` pattern of
 * docs/canonical/12 §3.1, over bytes already on disk, like the PESEL importer:
 *
 *   gate → checksum → parse and check both files → [one transaction]
 *   file records → row records → places → names → external ids → memberships
 *
 * TERYT is geography infrastructure. Nothing here says anything about a
 * surname, and nothing here is rendered (docs/sources/INVENTORY.md §4,
 * docs/canonical/12 §11.4).
 *
 * The decisions this module implements are TASK-039 §4, item by item.
 */
import type { Insertable, Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, detectScripts } from "@name-atlas/resolver";
import { insertChunked, rightsRefusal, sha256Hex } from "../importer.js";
import { TERYT_PROVIDER_KEY } from "../voivodeships.js";
import { planTerytImport, SIMC_HEADER, TERC_HEADER, TerytSchemaError } from "./plan.js";
import type { QuarantinedTerytRow, TercUnit, TerytFile, TerytPlan } from "./plan.js";

/** `sources.source_key` of TERYT, registered by the TASK-038 catalogue. */
export const TERYT_SOURCE_KEY = "pl_teryt";

/**
 * `provider_key` for SIMC locality ids. TERC codes keep TASK-011's
 * {@link TERYT_PROVIDER_KEY}: a seven-digit SIMC id and a seven-digit TERC
 * gmina code can be the same digits, so they may not share a namespace
 * (TASK-039 §4 item 6, D-023).
 */
export const TERYT_SIMC_PROVIDER_KEY = "TERYT_SIMC";

/** `source_records.external_record_id` of each file. */
export const TERYT_RESOURCE_IDS: Readonly<Record<TerytFile, string>> = {
  TERC: "TERC_Urzedowy",
  SIMC: "SIMC_Urzedowy",
};

const COUNTRY_CODE = "PL";

type ProductionStatus = DB["sources"]["production_status"];
type RightsProfileRow = Pick<DB["rights_profiles"], "automated_access" | "review_status">;

/**
 * Production statuses under which this connector may ingest (TASK-039 §4
 * item 3). `LEGAL_REVIEW_REQUIRED` closes public and paid surfaces, not an
 * internal import that renders nothing — the same line `rightsRefusal`
 * draws for `review_status`. Every other value, including any added later,
 * refuses.
 */
const INGESTIBLE_PRODUCTION_STATUSES: ReadonlySet<ProductionStatus> = new Set<ProductionStatus>([
  "APPROVED",
  "LEGAL_REVIEW_REQUIRED",
]);

export type TerytFailureReason =
  | "SOURCE_NOT_REGISTERED"
  | "RIGHTS_BLOCKED"
  | "PRODUCTION_STATUS_BLOCKED"
  | "CHECKSUM_MISMATCH"
  | "SCHEMA_VIOLATION"
  | "QUARANTINED_ROWS"
  | "REFRESH_NOT_SUPPORTED"
  | "PARTIAL_PRIOR_IMPORT"
  | "EXISTING_PLACE_CONFLICT"
  | "DATABASE_ERROR";

/**
 * The connector's gate: the rights profile through the shared
 * `rightsRefusal`, then the source's production status. Null when ingestion
 * may run.
 */
export function terytGateRefusal(
  productionStatus: ProductionStatus,
  profile: RightsProfileRow,
): { readonly reason: TerytFailureReason; readonly message: string } | null {
  const rights = rightsRefusal(profile);
  if (rights) {
    return { reason: "RIGHTS_BLOCKED", message: rights };
  }
  if (!INGESTIBLE_PRODUCTION_STATUSES.has(productionStatus)) {
    return {
      reason: "PRODUCTION_STATUS_BLOCKED",
      message: `source production_status is ${productionStatus}; ingestion needs APPROVED or LEGAL_REVIEW_REQUIRED`,
    };
  }
  return null;
}

export interface TerytFileInput {
  /** The CSV member's bytes (not the zip), already read from disk. */
  readonly bytes: Uint8Array;
  /**
   * The SHA-256 these bytes must have. Passed explicitly because a fixture is
   * an excerpt with its own checksum; presenting it as the full file's would
   * be a false provenance claim.
   */
  readonly expectedSha256: string;
  /** Stored verbatim as the file record's `raw_payload`. Never synthesised here. */
  readonly rawPayload: unknown;
  readonly retrievedAt: string;
  readonly sourceUrl: string;
}

export interface ImportTerytOptions {
  readonly terc: TerytFileInput;
  readonly simc: TerytFileInput;
}

export interface TerytReconciliationReport {
  readonly tercRowsRead: number;
  readonly simcRowsRead: number;
  readonly tercReferenceDate: string | null;
  readonly simcReferenceDate: string | null;
  readonly voivodeshipsCreated: number;
  readonly voivodeshipsReused: number;
  readonly powiatsCreated: number;
  readonly gminasCreated: number;
  /** TERC RODZ 4, 5, 8 and 9 rows: recorded, not places (§4 item 4). */
  readonly gminaComponentsNotPlaces: number;
  readonly localitiesCreated: number;
  /** Of `localitiesCreated`, those whose SYMPOD is another locality. */
  readonly partsOfLocalities: number;
  readonly localitiesByPlaceType: Readonly<Record<string, number>>;
  readonly placesCreated: number;
  readonly namesCreated: number;
  readonly externalIdsCreated: number;
  readonly membershipsCreated: number;
  readonly sourceRecordsCreated: number;
}

export type TerytImportOutcome =
  | {
      readonly kind: "IMPORTED";
      readonly fileRecordIds: Readonly<Record<TerytFile, string>>;
      readonly report: TerytReconciliationReport;
    }
  | {
      readonly kind: "ALREADY_IMPORTED";
      readonly fileRecordIds: Readonly<Record<TerytFile, string>>;
    }
  | {
      readonly kind: "FAILED";
      readonly reason: TerytFailureReason;
      readonly message: string;
      readonly quarantined: readonly QuarantinedTerytRow[];
      readonly cause?: unknown;
    };

/** Every row is accounted for, and every place has its name, id and parent. */
export function assertTerytReconciles(report: TerytReconciliationReport): void {
  const checks: [string, number, number][] = [
    [
      "TERC rows",
      report.tercRowsRead,
      report.voivodeshipsCreated +
        report.voivodeshipsReused +
        report.powiatsCreated +
        report.gminasCreated +
        report.gminaComponentsNotPlaces,
    ],
    ["SIMC rows", report.simcRowsRead, report.localitiesCreated],
    [
      "places",
      report.placesCreated,
      report.voivodeshipsCreated +
        report.powiatsCreated +
        report.gminasCreated +
        report.localitiesCreated,
    ],
    ["names", report.namesCreated, report.placesCreated],
    ["external ids", report.externalIdsCreated, report.placesCreated],
    [
      "memberships",
      report.membershipsCreated,
      report.powiatsCreated + report.gminasCreated + report.localitiesCreated,
    ],
    ["source records", report.sourceRecordsCreated, 2 + report.tercRowsRead + report.simcRowsRead],
    [
      "localities by type",
      report.localitiesCreated,
      Object.values(report.localitiesByPlaceType).reduce((a, b) => a + b, 0),
    ],
  ];
  for (const [what, actual, expected] of checks) {
    if (actual !== expected) {
      throw new Error(`TERYT import does not reconcile: ${what} ${actual} ≠ ${expected}`);
    }
  }
}

/** Raised inside the transaction to roll it back with a typed outcome. */
class TerytAbort extends Error {
  constructor(
    readonly reason: TerytFailureReason,
    message: string,
  ) {
    super(message);
  }
}

function failed(
  reason: TerytFailureReason,
  message: string,
  quarantined: readonly QuarantinedTerytRow[] = [],
  cause?: unknown,
): TerytImportOutcome {
  return {
    kind: "FAILED",
    reason,
    message,
    quarantined,
    ...(cause === undefined ? {} : { cause }),
  };
}

interface NewPlace {
  readonly placeType: DB["places"]["place_type"];
  readonly precision: DB["places"]["spatial_precision"];
  readonly name: string;
  readonly providerKey: string;
  readonly externalId: string;
  readonly validFrom: string;
  readonly sourceRecordId: string;
}

/** Buffers every row of one import, inserted parents-first in chunks. */
class Rows {
  readonly entities: Insertable<DB["knowledge_entities"]>[] = [];
  readonly records: Insertable<DB["source_records"]>[] = [];
  readonly places: Insertable<DB["places"]>[] = [];
  readonly names: Insertable<DB["place_names"]>[] = [];
  readonly externalIds: Insertable<DB["entity_external_ids"]>[] = [];
  readonly memberships: Insertable<DB["administrative_memberships"]>[] = [];

  place(p: NewPlace): string {
    const placeId = uuidv7();
    const nameId = uuidv7();
    for (const id of [placeId, nameId]) {
      // `SHARED` / `PUBLIC`, as TASK-011 seeds a voivodeship: a place belongs
      // to no one surname, and an administrative register is public fact.
      this.entities.push({
        entity_id: id,
        entity_type: "PLACE",
        scope: "SHARED",
        privacy_class: "PUBLIC",
        lifecycle_status: "ACTIVE",
      });
    }
    this.places.push({
      place_id: placeId,
      place_type: p.placeType,
      current_display_name: p.name,
      current_country_code: COUNTRY_CODE,
      // Neither register carries geometry; §5.1 forbids a point on no evidence.
      centroid: null,
      spatial_precision: p.precision,
      entity_status: "ACTIVE",
    });
    this.names.push({
      place_name_id: nameId,
      place_id: placeId,
      name: p.name,
      normalized_name: canonicalKey(p.name),
      language_code: "pl",
      script: detectScripts(p.name).primary_script,
      name_type: "OFFICIAL",
      source_record_id: p.sourceRecordId,
    });
    this.externalIds.push({
      entity_external_id: uuidv7(),
      entity_id: placeId,
      provider_key: p.providerKey,
      external_id: p.externalId,
      external_url: null,
      valid_from: p.validFrom,
      valid_to: null,
    });
    return placeId;
  }

  membership(child: string, parent: string, validFrom: string, sourceRecordId: string): void {
    this.memberships.push({
      membership_id: uuidv7(),
      child_place_id: child,
      parent_place_id: parent,
      membership_type: "ADMINISTRATIVE",
      valid_from: validFrom,
      valid_to: null,
      source_record_id: sourceRecordId,
      // Parsed from an official file by machine; nobody reviewed it.
      verification_status: "MACHINE_EXTRACTED",
    });
  }
}

const TERC_PLACE: Record<
  Exclude<TercUnit["level"], "COMPONENT">,
  { placeType: NewPlace["placeType"]; precision: NewPlace["precision"] }
> = {
  // TASK-011's values for a voivodeship, kept so a place made here and one
  // made by its seeder are the same kind of row.
  VOIVODESHIP: { placeType: "REGION", precision: "REGION" },
  POWIAT: { placeType: "COUNTY_DISTRICT", precision: "REGION" },
  GMINA: { placeType: "MUNICIPALITY", precision: "MUNICIPALITY" },
};

async function writePlan(
  trx: Transaction<DB>,
  sourceId: string,
  options: ImportTerytOptions,
  plan: TerytPlan,
  hashes: Readonly<Record<TerytFile, string>>,
): Promise<TerytImportOutcome> {
  // --- §4 item 9: same bytes, a different state, or half an import --------
  const prior = await trx
    .selectFrom("source_records")
    .select(["source_record_id", "external_record_id", "content_hash"])
    .where("source_id", "=", sourceId)
    .where("external_record_id", "in", [TERYT_RESOURCE_IDS.TERC, TERYT_RESOURCE_IDS.SIMC])
    .execute();
  if (prior.length > 0) {
    const same = (file: TerytFile) =>
      prior.find(
        (r) => r.external_record_id === TERYT_RESOURCE_IDS[file] && r.content_hash === hashes[file],
      );
    const terc = same("TERC");
    const simc = same("SIMC");
    if (terc && simc && prior.length === 2) {
      return {
        kind: "ALREADY_IMPORTED",
        fileRecordIds: { TERC: terc.source_record_id, SIMC: simc.source_record_id },
      };
    }
    const changed = prior.some(
      (r) =>
        (r.external_record_id === TERYT_RESOURCE_IDS.TERC && r.content_hash !== hashes.TERC) ||
        (r.external_record_id === TERYT_RESOURCE_IDS.SIMC && r.content_hash !== hashes.SIMC),
    );
    if (changed) {
      throw new TerytAbort(
        "REFRESH_NOT_SUPPORTED",
        "a different TERYT file state is already imported; applying a new register state is a later task",
      );
    }
    throw new TerytAbort("PARTIAL_PRIOR_IMPORT", "only one of TERC and SIMC is already imported");
  }

  // --- §4 item 9: the only places this importer may meet are TASK-011's ----
  const existing = await trx
    .selectFrom("entity_external_ids")
    .innerJoin("places", "places.place_id", "entity_external_ids.entity_id")
    .select([
      "entity_external_ids.provider_key",
      "entity_external_ids.external_id",
      "places.place_id",
      "places.place_type",
      "places.current_display_name",
    ])
    .where("entity_external_ids.provider_key", "in", [TERYT_PROVIDER_KEY, TERYT_SIMC_PROVIDER_KEY])
    .execute();
  const unknownIds = await trx
    .selectFrom("entity_external_ids")
    .select(["external_id"])
    .where("provider_key", "in", [TERYT_PROVIDER_KEY, TERYT_SIMC_PROVIDER_KEY])
    .where("entity_id", "not in", trx.selectFrom("places").select("place_id"))
    .execute();
  const strangers = [
    ...existing.filter(
      (e) => !(e.provider_key === TERYT_PROVIDER_KEY && /^[0-9]{2}$/u.test(e.external_id)),
    ),
    ...unknownIds,
  ];
  if (strangers.length > 0) {
    throw new TerytAbort(
      "EXISTING_PLACE_CONFLICT",
      `${strangers.length} TERYT id(s) other than a TASK-011 voivodeship already exist, e.g. ` +
        JSON.stringify(strangers[0]?.external_id),
    );
  }
  const voivodeships = new Map(existing.map((e) => [e.external_id, e]));

  const rows = new Rows();
  const now = new Date();

  const fileRecordIds = { TERC: uuidv7(), SIMC: uuidv7() };
  const datasetVersion = (file: TerytFile) =>
    `${TERYT_RESOURCE_IDS[file]}@${hashes[file].slice(0, 12)}`;
  for (const file of ["TERC", "SIMC"] as const) {
    const input = file === "TERC" ? options.terc : options.simc;
    const date = file === "TERC" ? plan.tercReferenceDate : plan.simcReferenceDate;
    rows.records.push({
      source_record_id: fileRecordIds[file],
      source_id: sourceId,
      external_record_id: TERYT_RESOURCE_IDS[file],
      external_parent_id: null,
      record_type: "API_OBJECT",
      source_url: input.sourceUrl,
      raw_payload: JSON.stringify(input.rawPayload),
      raw_text_ref: null,
      content_hash: hashes[file],
      retrieved_at: input.retrievedAt,
      source_modified_at: null,
      dataset_version: datasetVersion(file),
      universe_description: `TERYT ${file}, wersja urzędowa, STAN_NA ${String(date)}`,
      methodology_key: null,
      comparability_group: null,
      coverage_notes:
        "Official Polish administrative geography. Not evidence of where a surname originated " +
        "(docs/sources/INVENTORY.md §4).",
      rights_profile_id: null,
      record_status: "ACTIVE",
      supersedes_source_record_id: null,
    });
  }

  const rowRecord = (
    file: TerytFile,
    id: string,
    header: readonly string[],
    line: TercUnit["source"],
  ) => {
    const recordId = uuidv7();
    const input = file === "TERC" ? options.terc : options.simc;
    rows.records.push({
      source_record_id: recordId,
      source_id: sourceId,
      external_record_id: `${file}:${id}`,
      external_parent_id: datasetVersion(file),
      record_type: "DATA_ROW",
      source_url: input.sourceUrl,
      raw_payload: JSON.stringify({
        line: line.line,
        text: line.text,
        fields: Object.fromEntries(header.map((h, i) => [h, line.fields[i]])),
      }),
      raw_text_ref: null,
      content_hash: sha256Hex(new TextEncoder().encode(line.text)),
      retrieved_at: input.retrievedAt,
      source_modified_at: null,
      dataset_version: null,
      universe_description: null,
      methodology_key: null,
      comparability_group: null,
      coverage_notes: null,
      rights_profile_id: null,
      record_status: "ACTIVE",
      supersedes_source_record_id: null,
    });
    return recordId;
  };

  // --- TERC ---------------------------------------------------------------
  let voivodeshipsCreated = 0;
  let voivodeshipsReused = 0;
  let powiatsCreated = 0;
  let gminasCreated = 0;
  let components = 0;
  const placeIdByTerc = new Map<string, string>();
  const created: {
    readonly unit: TercUnit;
    readonly placeId: string;
    readonly recordId: string;
  }[] = [];
  for (const unit of plan.tercUnits) {
    const recordId = rowRecord("TERC", unit.code, TERC_HEADER, unit.source);
    if (unit.level === "COMPONENT") {
      components += 1;
      continue;
    }
    if (unit.level === "VOIVODESHIP") {
      const found = voivodeships.get(unit.code);
      if (found) {
        // §4 item 7: reuse only the same place, never re-identify one.
        if (found.current_display_name !== unit.name || found.place_type !== "REGION") {
          throw new TerytAbort(
            "EXISTING_PLACE_CONFLICT",
            `voivodeship ${unit.code} is stored as ${JSON.stringify(found.current_display_name)} ` +
              `(${found.place_type}); TERC says ${JSON.stringify(unit.name)}`,
          );
        }
        placeIdByTerc.set(unit.code, found.place_id);
        voivodeshipsReused += 1;
        continue;
      }
      voivodeshipsCreated += 1;
    } else if (unit.level === "POWIAT") {
      powiatsCreated += 1;
    } else {
      gminasCreated += 1;
    }
    const placeId = rows.place({
      ...TERC_PLACE[unit.level],
      name: unit.name,
      providerKey: TERYT_PROVIDER_KEY,
      externalId: unit.code,
      validFrom: unit.referenceDate,
      sourceRecordId: recordId,
    });
    placeIdByTerc.set(unit.code, placeId);
    created.push({ unit, placeId, recordId });
  }
  // Parents are linked in a second pass, so the file's order does not matter.
  for (const { unit, placeId, recordId } of created) {
    if (unit.parentCode === null) continue;
    const parent = placeIdByTerc.get(unit.parentCode);
    if (!parent) {
      // The plan checked every parent against the file.
      throw new Error(`TERC ${unit.code}: parent ${unit.parentCode} was not planned`);
    }
    rows.membership(placeId, parent, unit.referenceDate, recordId);
  }

  // --- SIMC ---------------------------------------------------------------
  // A part of a locality may precede its parent in the file, so places are
  // made first and parents linked in a second pass.
  const placeIdBySym = new Map<string, string>();
  const recordIdBySym = new Map<string, string>();
  const byPlaceType: Record<string, number> = {};
  for (const locality of plan.localities) {
    const recordId = rowRecord("SIMC", locality.sym, SIMC_HEADER, locality.source);
    recordIdBySym.set(locality.sym, recordId);
    placeIdBySym.set(
      locality.sym,
      rows.place({
        placeType: locality.placeType,
        precision: "LOCALITY",
        name: locality.name,
        providerKey: TERYT_SIMC_PROVIDER_KEY,
        externalId: locality.sym,
        validFrom: locality.referenceDate,
        sourceRecordId: recordId,
      }),
    );
    byPlaceType[locality.placeType] = (byPlaceType[locality.placeType] ?? 0) + 1;
  }
  let partsOfLocalities = 0;
  for (const locality of plan.localities) {
    const child = placeIdBySym.get(locality.sym);
    const parent =
      locality.parent.kind === "GMINA"
        ? placeIdByTerc.get(locality.parent.code)
        : placeIdBySym.get(locality.parent.sym);
    const recordId = recordIdBySym.get(locality.sym);
    if (!child || !parent || !recordId) {
      throw new Error(`SIMC ${locality.sym}: its parent was not planned`);
    }
    if (locality.parent.kind === "LOCALITY") partsOfLocalities += 1;
    rows.membership(child, parent, locality.referenceDate, recordId);
  }

  // Parents before children, every table in chunks, one transaction.
  await insertChunked(trx, "knowledge_entities", rows.entities);
  await insertChunked(trx, "source_records", rows.records);
  await insertChunked(trx, "places", rows.places);
  await insertChunked(
    trx,
    "place_names",
    rows.names.map((n) => ({ ...n, created_at: now })),
  );
  await insertChunked(trx, "entity_external_ids", rows.externalIds);
  await insertChunked(trx, "administrative_memberships", rows.memberships);

  const report: TerytReconciliationReport = {
    tercRowsRead: plan.tercRowsRead,
    simcRowsRead: plan.simcRowsRead,
    tercReferenceDate: plan.tercReferenceDate,
    simcReferenceDate: plan.simcReferenceDate,
    voivodeshipsCreated,
    voivodeshipsReused,
    powiatsCreated,
    gminasCreated,
    gminaComponentsNotPlaces: components,
    localitiesCreated: plan.localities.length,
    partsOfLocalities,
    localitiesByPlaceType: byPlaceType,
    placesCreated: rows.places.length,
    namesCreated: rows.names.length,
    externalIdsCreated: rows.externalIds.length,
    membershipsCreated: rows.memberships.length,
    sourceRecordsCreated: rows.records.length,
  };
  assertTerytReconciles(report);
  return { kind: "IMPORTED", fileRecordIds, report };
}

/**
 * Imports one TERC file and one SIMC file of the same register state.
 *
 * Returns a typed outcome in every case. Nothing is written unless the whole
 * import succeeds.
 */
export async function importTerytRegisters(
  db: Kysely<DB>,
  options: ImportTerytOptions,
): Promise<TerytImportOutcome> {
  // 1. The gate, from the registry as stored — before any file is read.
  const source = await db
    .selectFrom("sources")
    .innerJoin(
      "rights_profiles",
      "rights_profiles.rights_profile_id",
      "sources.default_rights_profile_id",
    )
    .select([
      "sources.source_id",
      "sources.production_status",
      "rights_profiles.automated_access",
      "rights_profiles.review_status",
    ])
    .where("sources.source_key", "=", TERYT_SOURCE_KEY)
    .executeTakeFirst();
  if (!source) {
    return failed(
      "SOURCE_NOT_REGISTERED",
      `source ${TERYT_SOURCE_KEY} is not registered; run pnpm seed:sources first`,
    );
  }
  const refusal = terytGateRefusal(source.production_status, source);
  if (refusal) {
    return failed(refusal.reason, refusal.message);
  }

  // 2. Checksums, before parsing.
  const hashes = { TERC: sha256Hex(options.terc.bytes), SIMC: sha256Hex(options.simc.bytes) };
  for (const file of ["TERC", "SIMC"] as const) {
    const expected = (file === "TERC" ? options.terc : options.simc).expectedSha256;
    if (hashes[file] !== expected) {
      return failed(
        "CHECKSUM_MISMATCH",
        `${file}: expected sha256 ${expected}, got ${hashes[file]}`,
      );
    }
  }

  // 3. Parse and check both files. Any quarantine aborts before a write.
  let plan: TerytPlan;
  try {
    plan = planTerytImport(options.terc.bytes, options.simc.bytes);
  } catch (cause: unknown) {
    if (cause instanceof TerytSchemaError) {
      return failed("SCHEMA_VIOLATION", cause.message, [], cause);
    }
    throw cause;
  }
  if (plan.quarantined.length > 0) {
    return failed(
      "QUARANTINED_ROWS",
      `${plan.quarantined.length} row(s) quarantined; import aborted without writing`,
      plan.quarantined,
    );
  }

  // 4. One transaction.
  try {
    return await db
      .transaction()
      .execute((trx) => writePlan(trx, source.source_id, options, plan, hashes));
  } catch (cause: unknown) {
    if (cause instanceof TerytAbort) {
      return failed(cause.reason, cause.message);
    }
    return failed(
      "DATABASE_ERROR",
      cause instanceof Error ? cause.message : String(cause),
      [],
      cause,
    );
  }
}
