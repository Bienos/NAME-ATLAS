import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The minimum `Place` foundation, voivodeship scope only (TASK-011, per
 * D-004 "Preferred").
 *
 * `docs/canonical/11` §6.2 requires `DistributionValue.place_id` to
 * reference a `Place`, null only for a national aggregate, and §20.3 / §32
 * require external IDs through one shared table rather than a column per
 * provider. `docs/canonical/12` §11 makes locally ingested TERYT the
 * canonical Polish place-ID backbone. Until now none of that existed, which
 * is why no regional value could be stored at all.
 *
 * Deliberately the smallest subset that lets a regional value reference
 * something canonical:
 *
 * - `places` — §5.1's fields, minus what no evidence supports. `centroid`
 *   exists and is **left null**: §5.1 says "a place must not receive a
 *   precise coordinate if evidence supports only a region", and the TERC
 *   register carries no geometry. `spatial_precision` says `REGION` for the
 *   same reason.
 * - `place_names` — §5.2, for the official TERC name. One row per place
 *   here; historical and exonym forms are a later task's business.
 * - `entity_external_ids` — §20.3's shared table, `UNIQUE (provider_key,
 *   external_id)`, so `TERYT` `02` identifies exactly one place forever.
 *
 * Out of scope on purpose (TASK-011 §4): powiat, gmina and locality places,
 * SIMC, GeoNames ids, geometry, `administrative_memberships`.
 *
 * `entity_type` gains `PLACE`. Per the constraint D-011 recorded and this
 * migration respects: an enum value added in a transaction may not be *used*
 * in that same transaction, so no place row is inserted here. The 16
 * voivodeships are seeded by `@name-atlas/sources`'s seeder, from the
 * checksum-recorded TERC correspondence, never from memory.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'PLACE'`.execute(db);

  await sql`
    CREATE TYPE place_type AS ENUM (
      'COUNTRY',
      'REGION',
      'PROVINCE_STATE',
      'COUNTY_DISTRICT',
      'MUNICIPALITY',
      'CITY',
      'VILLAGE',
      'PARISH',
      'HISTORICAL_TERRITORY',
      'OTHER'
    )
  `.execute(db);
  await sql`
    CREATE TYPE spatial_precision AS ENUM
      ('EXACT_POINT', 'LOCALITY', 'MUNICIPALITY', 'REGION', 'COUNTRY', 'APPROXIMATE', 'UNKNOWN')
  `.execute(db);
  await sql`
    CREATE TYPE place_status AS ENUM ('ACTIVE', 'HISTORICAL_ONLY', 'MERGED', 'DISPUTED')
  `.execute(db);
  await sql`
    CREATE TYPE place_name_type AS ENUM (
      'CURRENT',
      'HISTORICAL',
      'OFFICIAL',
      'EXONYM',
      'ENDONYM',
      'PARISH_FORM',
      'TRANSCRIPTION',
      'OTHER'
    )
  `.execute(db);

  // --- places (docs/canonical/11 §5.1) ------------------------------------
  await sql`
    CREATE TABLE places (
      place_id             uuid PRIMARY KEY REFERENCES knowledge_entities (entity_id),
      place_type           place_type        NOT NULL,
      current_display_name text              NOT NULL,
      current_country_code text,
      centroid             geography(Point, 4326),
      spatial_precision    spatial_precision NOT NULL,
      entity_status        place_status      NOT NULL,
      created_at           timestamptz       NOT NULL DEFAULT now(),
      updated_at           timestamptz       NOT NULL DEFAULT now(),
      CONSTRAINT places_display_name_not_blank
        CHECK (length(btrim(current_display_name)) > 0),
      CONSTRAINT places_country_code_iso3166
        CHECK (current_country_code IS NULL OR current_country_code ~ '^[A-Z]{2}$'),
      -- §5.1: a region may not carry a precise point. Enforced, not trusted:
      -- a centroid is only admissible at a precision that can support one.
      CONSTRAINT places_region_has_no_precise_point
        CHECK (centroid IS NULL OR spatial_precision IN ('EXACT_POINT', 'LOCALITY'))
    )
  `.execute(db);

  // --- place_names (docs/canonical/11 §5.2) -------------------------------
  await sql`
    CREATE TABLE place_names (
      place_name_id   uuid PRIMARY KEY REFERENCES knowledge_entities (entity_id),
      place_id        uuid            NOT NULL REFERENCES places (place_id),
      name            text            NOT NULL,
      normalized_name text            NOT NULL,
      language_code   text,
      script          text            NOT NULL,
      name_type       place_name_type NOT NULL,
      source_record_id uuid REFERENCES source_records (source_record_id),
      created_at      timestamptz     NOT NULL DEFAULT now(),
      CONSTRAINT place_names_name_not_blank CHECK (length(btrim(name)) > 0),
      CONSTRAINT place_names_normalized_not_blank CHECK (length(normalized_name) > 0),
      CONSTRAINT place_names_script_iso15924 CHECK (script ~ '^[A-Z][a-z]{3}$')
    )
  `.execute(db);
  await sql`CREATE INDEX place_names_place_id_idx ON place_names (place_id)`.execute(db);
  await sql`CREATE INDEX place_names_normalized_idx ON place_names (normalized_name)`.execute(db);

  // --- entity_external_ids (docs/canonical/11 §20.3) ----------------------
  // One table for TERYT, Wikidata, GeoNames, Getty TGN, OSM and whatever
  // comes later — not a column per provider. The UNIQUE constraint is the
  // point: a provider's id names exactly one entity.
  await sql`
    CREATE TABLE entity_external_ids (
      entity_external_id uuid PRIMARY KEY,
      entity_id          uuid        NOT NULL REFERENCES knowledge_entities (entity_id),
      provider_key       text        NOT NULL,
      external_id        text        NOT NULL,
      external_url       text,
      valid_from         date,
      valid_to           date,
      created_at         timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT entity_external_ids_provider_not_blank
        CHECK (length(btrim(provider_key)) > 0),
      CONSTRAINT entity_external_ids_external_id_not_blank
        CHECK (length(btrim(external_id)) > 0),
      CONSTRAINT entity_external_ids_validity_ordered
        CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to),
      CONSTRAINT entity_external_ids_provider_id_unique UNIQUE (provider_key, external_id)
    )
  `.execute(db);
  await sql`
    CREATE INDEX entity_external_ids_entity_id_idx ON entity_external_ids (entity_id)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS entity_external_ids`.execute(db);
  await sql`DROP TABLE IF EXISTS place_names`.execute(db);
  await sql`DROP TABLE IF EXISTS places`.execute(db);
  await sql`DROP TYPE IF EXISTS place_name_type`.execute(db);
  await sql`DROP TYPE IF EXISTS place_status`.execute(db);
  await sql`DROP TYPE IF EXISTS spatial_precision`.execute(db);
  await sql`DROP TYPE IF EXISTS place_type`.execute(db);
  // `entity_type` keeps 'PLACE': PostgreSQL cannot remove an enum value.
  // Harmless once no row carries it (same as 0005 and 0009).
}
