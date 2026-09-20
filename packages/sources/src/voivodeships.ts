/**
 * Seeds the 16 voivodeship `Place` rows from the recorded TERYT TERC
 * correspondence (TASK-011, per D-004 "Preferred").
 *
 * Every code comes from `fixtures/teryt/voivodeship-terc-correspondence.json`,
 * which records the official `TERC_Urzędowy_2026-09-18` register's identity,
 * its `STAN_NA` reference date, the comparison method (exact code-point
 * equality against the 16 `NAZWA` values whose `POW`/`GMI`/`RODZ` are blank)
 * and the archive digest it was checked against. **No code is typed here**,
 * and the file is read at run time rather than transcribed into this module,
 * so a change to the register's recorded facts cannot silently disagree with
 * the seeded rows.
 *
 * Idempotent: a place already carrying a `TERYT` external id is left alone.
 * Nothing is updated, because an update would be a silent re-identification
 * of a place that other rows already reference.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, detectScripts, toNfc } from "@name-atlas/resolver";

/** `provider_key` for TERYT ids in `entity_external_ids` (docs/canonical/11 §20.3). */
export const TERYT_PROVIDER_KEY = "TERYT";

/** ISO 3166-1 alpha-2 for the country these regions belong to. */
const COUNTRY_CODE = "PL";

const CORRESPONDENCE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/teryt/voivodeship-terc-correspondence.json",
);

interface CorrespondenceEntry {
  readonly observed_geography_value: string;
  readonly terc_code: string;
  readonly terc_name: string;
  readonly terc_name_dod: string;
  readonly match: string;
}

interface CorrespondenceFile {
  readonly counts: {
    readonly observed_values: number;
    readonly mapped: number;
    readonly unmapped: number;
  };
  readonly terc_source: {
    readonly register_reference_date: string;
    readonly file_used_sha256: string;
  };
  readonly correspondence: readonly CorrespondenceEntry[];
}

export interface VoivodeshipCorrespondence {
  readonly entries: readonly CorrespondenceEntry[];
  readonly registerReferenceDate: string;
  readonly tercFileSha256: string;
}

/**
 * Reads and checks the correspondence record. Fails closed: 16 entries, all
 * mapped, none unmapped, every one an exact match. A record that no longer
 * says that is not a record to seed from.
 */
export function readVoivodeshipCorrespondence(
  filePath: string = CORRESPONDENCE_PATH,
): VoivodeshipCorrespondence {
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as CorrespondenceFile;
  const entries = parsed.correspondence;
  if (entries.length !== 16 || parsed.counts.mapped !== 16 || parsed.counts.unmapped !== 0) {
    throw new Error(
      `TERC correspondence must map all 16 voivodeships; found ${entries.length} entries, ` +
        `${parsed.counts.mapped} mapped, ${parsed.counts.unmapped} unmapped`,
    );
  }
  for (const entry of entries) {
    if (!/^[0-9]{2}$/u.test(entry.terc_code)) {
      throw new Error(`TERC code ${JSON.stringify(entry.terc_code)} is not two digits`);
    }
    if (entry.match !== "EXACT_STRING_EQUALITY") {
      throw new Error(
        `voivodeship ${entry.observed_geography_value} was matched by ${entry.match}, not exact ` +
          "equality; a looser match may not become a place identity",
      );
    }
    if (entry.terc_name_dod !== "województwo") {
      throw new Error(
        `TERC row for ${entry.terc_code} is a ${entry.terc_name_dod}, not a województwo`,
      );
    }
  }
  return {
    entries,
    registerReferenceDate: parsed.terc_source.register_reference_date,
    tercFileSha256: parsed.terc_source.file_used_sha256,
  };
}

export interface VoivodeshipSeedReport {
  readonly placesCreated: number;
  readonly placesReused: number;
  readonly externalIdsCreated: number;
  readonly namesCreated: number;
  /** TERC code → place id, for every one of the 16. */
  readonly placeIdByTercCode: ReadonlyMap<string, string>;
  /** The observed geography string → place id, which is what an importer needs. */
  readonly placeIdByGeographyValue: ReadonlyMap<string, string>;
}

async function seedOne(
  trx: Transaction<DB>,
  entry: CorrespondenceEntry,
  registerReferenceDate: string,
): Promise<{ readonly placeId: string; readonly created: boolean; readonly nameCreated: boolean }> {
  const existing = await trx
    .selectFrom("entity_external_ids")
    .select(["entity_id"])
    .where("provider_key", "=", TERYT_PROVIDER_KEY)
    .where("external_id", "=", entry.terc_code)
    .executeTakeFirst();
  if (existing) {
    return { placeId: existing.entity_id, created: false, nameCreated: false };
  }

  const placeId = uuidv7();
  const display = toNfc(entry.terc_name);
  await trx
    .insertInto("knowledge_entities")
    .values({
      entity_id: placeId,
      entity_type: "PLACE",
      // `SHARED` is the scope docs/canonical/11 §4 assigns Place and
      // PlaceName: a place belongs to no one surname. Public administrative
      // fact, not personal data.
      scope: "SHARED",
      privacy_class: "PUBLIC",
      lifecycle_status: "ACTIVE",
    })
    .execute();
  await trx
    .insertInto("places")
    .values({
      place_id: placeId,
      place_type: "REGION",
      current_display_name: display,
      current_country_code: COUNTRY_CODE,
      // No geometry is available from TERC, and §5.1 forbids giving a region
      // a precise point on no evidence. The CHECK in migration 0010 enforces
      // it; this null is the honest value, not a placeholder.
      centroid: null,
      spatial_precision: "REGION",
      entity_status: "ACTIVE",
    })
    .execute();
  await trx
    .insertInto("entity_external_ids")
    .values({
      entity_external_id: uuidv7(),
      entity_id: placeId,
      provider_key: TERYT_PROVIDER_KEY,
      external_id: entry.terc_code,
      external_url: null,
      // The register's own reference date: what this identification is as of.
      valid_from: registerReferenceDate,
      valid_to: null,
    })
    .execute();

  const nameId = uuidv7();
  await trx
    .insertInto("knowledge_entities")
    .values({
      entity_id: nameId,
      entity_type: "PLACE",
      scope: "SHARED",
      privacy_class: "PUBLIC",
      lifecycle_status: "ACTIVE",
    })
    .execute();
  await trx
    .insertInto("place_names")
    .values({
      place_name_id: nameId,
      place_id: placeId,
      // The official register's own spelling, verbatim.
      name: display,
      normalized_name: canonicalKey(display),
      language_code: "pl",
      script: detectScripts(display).primary_script,
      name_type: "OFFICIAL",
      source_record_id: null,
      created_at: new Date(),
    })
    .execute();

  return { placeId, created: true, nameCreated: true };
}

/**
 * Creates any of the 16 voivodeship places that do not exist yet, in one
 * transaction, and returns the lookup maps a regional importer needs.
 */
export async function seedVoivodeshipPlaces(
  db: Kysely<DB>,
  correspondence: VoivodeshipCorrespondence = readVoivodeshipCorrespondence(),
): Promise<VoivodeshipSeedReport> {
  return db.transaction().execute((trx) => seedVoivodeshipPlacesIn(trx, correspondence));
}

/**
 * The same seeding inside a transaction the caller already owns — what the
 * regional importer uses, so places and values land or roll back together.
 */
export async function seedVoivodeshipPlacesIn(
  trx: Transaction<DB>,
  correspondence: VoivodeshipCorrespondence = readVoivodeshipCorrespondence(),
): Promise<VoivodeshipSeedReport> {
  return (async () => {
    let placesCreated = 0;
    let placesReused = 0;
    let namesCreated = 0;
    const byCode = new Map<string, string>();
    const byValue = new Map<string, string>();

    for (const entry of correspondence.entries) {
      const result = await seedOne(trx, entry, correspondence.registerReferenceDate);
      byCode.set(entry.terc_code, result.placeId);
      byValue.set(entry.observed_geography_value, result.placeId);
      if (result.created) placesCreated += 1;
      else placesReused += 1;
      if (result.nameCreated) namesCreated += 1;
    }

    return {
      placesCreated,
      placesReused,
      externalIdsCreated: placesCreated,
      namesCreated,
      placeIdByTercCode: byCode,
      placeIdByGeographyValue: byValue,
    };
  })();
}
