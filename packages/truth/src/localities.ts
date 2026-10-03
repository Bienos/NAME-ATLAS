import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type {
  LocalitiesSection,
  LocalityEntry,
  LocalityKind,
  SurfaceEligibilityDto,
} from "@name-atlas/contracts";
import { LOCALITIES_LIMIT } from "@name-atlas/contracts";
import { canonicalKey } from "@name-atlas/resolver";
import { TERYT_RESOURCE_IDS, TERYT_SIMC_PROVIDER_KEY, TERYT_SOURCE_KEY } from "@name-atlas/sources";
import { evaluateSurface } from "./rights.js";
import type { EffectiveRights, Surface } from "./rights.js";
import { LOCALITY_MATCH_METHOD, LOCALITY_MATCH_VERSION } from "./version.js";

/**
 * The localities in the TERYT register whose official name is the surname
 * (TASK-077, ADR-0025 §2.7): a lookup, never a claim.
 *
 * A locality and a surname compare by the resolver's canonical key, which the
 * TERYT importer stores as `place_names.normalized_name` (TASK-039). Only a
 * whole locality is listed, one whose membership is to a gmina; a part of a
 * locality (SIMC's `SYMPOD` ≠ `SYM`) is not. The gmina, powiat and voivodeship
 * come from the memberships the importer wrote, never from a code.
 *
 * The section's state and surface come from `pl_teryt`'s stored rights
 * profile, as the archive section's do from Polona's: the stored profile
 * decides, and nothing here reads `production_status`, which gates the
 * importer only. A shared name is a coincidence in the register
 * (`docs/sources/INVENTORY.md` §4); the contract says so, and so does every
 * surface that shows the list.
 */

/** `reason_code` when the database holds no TERYT SIMC file. */
export const TERYT_NOT_LOADED = "TERYT_NOT_LOADED";

/** Rights for a section whose source is not registered: every dimension unknown, fail closed. */
const NO_RIGHTS_KNOWN: EffectiveRights = {
  automated_access: "UNKNOWN",
  commercial_use: "UNKNOWN",
  redistribution: "UNKNOWN",
  metadata_rights: "UNKNOWN",
  review_status: "LEGAL_REVIEW_REQUIRED",
};

interface RegisterRow {
  name: string;
  publisher: string | null;
  source_type: string;
  homepage: string | null;
  automated_access: string;
  commercial_use: string;
  redistribution: string;
  metadata_rights: string;
  review_status: string;
  attribution_text: string | null;
  terms_version: string | null;
  /** Null when the source is registered but no SIMC file has been imported. */
  source_record_id: string | null;
  source_url: string | null;
  retrieved_at: string | null;
  universe_description: string | null;
}

interface LocalityRow {
  place_id: string;
  name: string;
  kind: string;
  teryt_simc: string;
  reference_date: string;
  gmina: string;
  powiat: string;
  voivodeship: string;
  total: string | number;
}

function emptyLocalities(
  state: "NOT_LOADED" | "RIGHTS_BLOCKED",
  reasonCode: string,
  surface: SurfaceEligibilityDto,
): LocalitiesSection {
  return {
    state,
    reference_date: null,
    places: [],
    total: null,
    confidence: null,
    citation: null,
    reason_code: reasonCode,
    surface,
  };
}

/** The importer writes `TERYT SIMC, wersja urzędowa, STAN_NA <date>`; the date is the register's. */
function referenceDateOf(universeDescription: string | null): string | null {
  const match = /STAN_NA (\d{4}-\d{2}-\d{2})/u.exec(universeDescription ?? "");
  return match?.[1] ?? null;
}

function kindOf(placeType: string): LocalityKind {
  return placeType === "CITY" || placeType === "VILLAGE" ? placeType : "OTHER";
}

/** `pl_teryt`, its stored rights profile and its latest active SIMC file record. */
async function readRegister(db: Kysely<DB>): Promise<RegisterRow | null> {
  const result = await sql<RegisterRow>`
    SELECT src.name, src.publisher, src.source_type::text AS source_type,
           src.homepage_or_reference_url AS homepage,
           rp.automated_access::text AS automated_access,
           rp.commercial_use::text AS commercial_use,
           rp.redistribution::text AS redistribution,
           rp.metadata_rights::text AS metadata_rights,
           rp.review_status::text AS review_status,
           rp.attribution_text, rp.terms_version,
           sr.source_record_id::text AS source_record_id, sr.source_url,
           to_char(sr.retrieved_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS retrieved_at,
           sr.universe_description
      FROM sources src
      JOIN rights_profiles rp ON rp.rights_profile_id = src.default_rights_profile_id
      LEFT JOIN LATERAL (
        SELECT r.source_record_id, r.source_url, r.retrieved_at, r.universe_description
          FROM source_records r
         WHERE r.source_id = src.source_id
           AND r.external_record_id = ${TERYT_RESOURCE_IDS.SIMC}
           AND r.record_status = 'ACTIVE'
         ORDER BY r.retrieved_at DESC
         LIMIT 1
      ) sr ON true
     WHERE src.source_key = ${TERYT_SOURCE_KEY}
     LIMIT 1
  `.execute(db);
  return result.rows[0] ?? null;
}

/**
 * Whole localities whose official name has the surname's canonical key, in a
 * fixed order (cities, villages, the rest; then voivodeship, powiat, gmina,
 * name, id), at most {@link LOCALITIES_LIMIT}, each with the count of all of
 * them. Memberships closed on a later date are not followed. A place with
 * several official names that share the key is still one place.
 */
async function readLocalities(db: Kysely<DB>, key: string): Promise<LocalityRow[]> {
  const result = await sql<LocalityRow>`
    SELECT p.place_id::text AS place_id,
           p.current_display_name AS name,
           p.place_type::text AS kind,
           eid.external_id AS teryt_simc,
           to_char(eid.valid_from, 'YYYY-MM-DD') AS reference_date,
           g.current_display_name AS gmina,
           pw.current_display_name AS powiat,
           w.current_display_name AS voivodeship,
           count(*) OVER () AS total
      FROM places p
      JOIN entity_external_ids eid
        ON eid.entity_id = p.place_id AND eid.provider_key = ${TERYT_SIMC_PROVIDER_KEY}
      JOIN administrative_memberships m1
        ON m1.child_place_id = p.place_id AND m1.valid_to IS NULL
      JOIN places g ON g.place_id = m1.parent_place_id AND g.place_type = 'MUNICIPALITY'
      JOIN administrative_memberships m2
        ON m2.child_place_id = g.place_id AND m2.valid_to IS NULL
      JOIN places pw ON pw.place_id = m2.parent_place_id AND pw.place_type = 'COUNTY_DISTRICT'
      JOIN administrative_memberships m3
        ON m3.child_place_id = pw.place_id AND m3.valid_to IS NULL
      JOIN places w ON w.place_id = m3.parent_place_id AND w.place_type = 'REGION'
     WHERE EXISTS (
             SELECT 1 FROM place_names pn
              WHERE pn.place_id = p.place_id
                AND pn.normalized_name = ${key}
                AND pn.name_type = 'OFFICIAL'
           )
       AND p.spatial_precision = 'LOCALITY'
       AND p.entity_status = 'ACTIVE'
     ORDER BY CASE p.place_type WHEN 'CITY' THEN 0 WHEN 'VILLAGE' THEN 1 ELSE 2 END,
              w.current_display_name, pw.current_display_name, g.current_display_name,
              p.current_display_name, p.place_id
     LIMIT ${LOCALITIES_LIMIT}
  `.execute(db);
  return result.rows;
}

/**
 * The localities section for a resolved surname, gated on TERYT's own rights
 * and independent of the register's (the archive section's reasoning).
 */
export async function localitiesSectionFor(
  db: Kysely<DB>,
  displayName: string,
  surface: Surface,
): Promise<LocalitiesSection> {
  const register = await readRegister(db);
  if (register === null) {
    return emptyLocalities(
      "NOT_LOADED",
      TERYT_NOT_LOADED,
      evaluateSurface(NO_RIGHTS_KNOWN, surface),
    );
  }
  const rights: EffectiveRights = {
    automated_access: register.automated_access,
    commercial_use: register.commercial_use,
    redistribution: register.redistribution,
    metadata_rights: register.metadata_rights,
    review_status: register.review_status,
  };
  const eligibility = evaluateSurface(rights, surface);
  if (register.source_record_id === null) {
    return emptyLocalities("NOT_LOADED", TERYT_NOT_LOADED, eligibility);
  }
  if (eligibility.decision === "BLOCKED") {
    return emptyLocalities("RIGHTS_BLOCKED", eligibility.reason_code, eligibility);
  }

  const rows = await readLocalities(db, canonicalKey(displayName));
  const referenceDate = rows[0]?.reference_date ?? referenceDateOf(register.universe_description);
  if (referenceDate === null) {
    // The file record does not say which register state it is: no date, no answer.
    return emptyLocalities("NOT_LOADED", TERYT_NOT_LOADED, eligibility);
  }
  const places: LocalityEntry[] = rows.map((r) => ({
    place: { id: r.place_id, name: r.name, kind: kindOf(r.kind), teryt_simc: r.teryt_simc },
    gmina: r.gmina,
    powiat: r.powiat,
    voivodeship: r.voivodeship,
  }));
  return {
    state: "READY",
    reference_date: referenceDate,
    places,
    total: rows.length === 0 ? 0 : Number(rows[0]?.total ?? places.length),
    confidence: {
      status: "VERIFIED",
      methodology_code: `${LOCALITY_MATCH_METHOD}@${LOCALITY_MATCH_VERSION}`,
    },
    citation: {
      id: register.source_record_id,
      title: register.name,
      publisher: register.publisher,
      publication_date: referenceDate,
      source_type: register.source_type,
      locator: register.universe_description,
      url: register.source_url,
      attribution: register.attribution_text,
      terms: register.terms_version,
      retrieved_at: register.retrieved_at,
      source_page_url: register.homepage,
    },
    reason_code: null,
    surface: eligibility,
  };
}
