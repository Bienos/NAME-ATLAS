import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import type { RightsProfileSeed } from "../registry.js";
import { POLONA_API_BASE, polonaQuery } from "./inventory.js";
import type { PolonaInventory } from "./inventory.js";
import type { FetchedPolonaInventory } from "./fetch.js";

/**
 * Polona in the source registry, and one surname's inventory as a source
 * record (TASK-054, ADR-0024).
 *
 * Kept out of the source catalogue (`catalogue.ts` says why): its rights are
 * the owner's decision of 2026-10-01, recorded in ADR-0024, not a catalogue
 * classification.
 */

export const POLONA_SOURCE_KEY = "pl_polona";

/** The external id of a surname's inventory record: one line per surname, superseded on change. */
export function polonaInventoryRecordId(surnameId: string): string {
  return `polona-inventory:${surnameId}`;
}

/**
 * The source default (D-021 item 4, ADR-0024 §2.3): every dimension allowed,
 * attribution required. An object's own licence tightens it (ADR-0007 §6,
 * `POLONA_RIGHTS_MAPPING`), so a protected work's text and scans stay refused.
 */
export const POLONA_RIGHTS_PROFILE: RightsProfileSeed = {
  // Shown on the page beside the source; the terms have no version name worth showing.
  terms_version: null,
  terms_hash: null,
  checked_at: "2026-10-01T00:00:00Z",
  metadata_rights: "ALLOWED",
  image_rights: "ALLOWED",
  transcription_rights: "ALLOWED",
  database_rights: "ALLOWED",
  automated_access: "ALLOWED",
  commercial_use: "ALLOWED",
  redistribution: "ALLOWED",
  local_cache: "ALLOWED",
  attribution_required: true,
  attribution_text: "Polona, Biblioteka Narodowa",
  source_owner: "Biblioteka Narodowa",
  rights_url: "https://polona.pl/static/polona/polona-regulamin",
  contact_required: false,
  review_status: "APPROVED",
  valid_from: "2026-10-01",
  valid_to: null,
  notes:
    "D-021 items 1 and 4, decided by the project owner on 2026-10-01 (ADR-0024): automated " +
    "access to search, object records, OCR and IIIF is allowed and what is retrieved may be " +
    "kept; the source default allows every dimension, and each object's licence tightens it. " +
    "Polona's terms do not address automated access; this is the owner's judgement, recorded " +
    "as such, not a confirmation from Biblioteka Narodowa (ppa@bn.org.pl).",
};

export const POLONA_SOURCE = {
  source_key: POLONA_SOURCE_KEY,
  name: "Polona",
  publisher: "Biblioteka Narodowa",
  source_type: "DIGITAL_LIBRARY",
  granularity: "DOCUMENT",
  geographic_scope: ["PL"],
  temporal_from: null,
  temporal_to: null,
  methodology_notes:
    "Biblioteka Cyfrowa Polona, the National Library's digital library. Name Atlas reads its " +
    "published search API: the catalogue search, and the full-text search of works that are " +
    "not copyright-protected (TASK-031, TASK-054). A match is a word in the catalogue or in a " +
    "page's OCR text, in any inflected form; it is not a verified occurrence of the surname.",
  authority_tier: "B_AUTHORITATIVE_INDEX",
  production_status: "APPROVED",
  homepage_or_reference_url: "https://polona.pl/",
} as const;

/** The registry row's id, inserting the source and its rights profile on first use. */
export async function ensurePolonaSource(db: Kysely<DB>): Promise<string> {
  return db.transaction().execute(async (trx) => {
    const found = await trx
      .selectFrom("sources")
      .select("source_id")
      .where("source_key", "=", POLONA_SOURCE_KEY)
      .executeTakeFirst();
    if (found) return found.source_id;

    const rightsProfileId = uuidv7();
    const r = POLONA_RIGHTS_PROFILE;
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
        review_status: r.review_status,
        valid_from: r.valid_from,
        valid_to: r.valid_to,
        notes: r.notes,
      })
      .execute();
    const sourceId = uuidv7();
    const s = POLONA_SOURCE;
    await trx
      .insertInto("sources")
      .values({
        source_id: sourceId,
        parent_source_id: null,
        source_key: s.source_key,
        name: s.name,
        publisher: s.publisher,
        source_type: s.source_type,
        granularity: s.granularity,
        geographic_scope: [...s.geographic_scope],
        temporal_from: s.temporal_from,
        temporal_to: s.temporal_to,
        methodology_notes: s.methodology_notes,
        authority_tier: s.authority_tier,
        default_rights_profile_id: rightsProfileId,
        production_status: s.production_status,
        homepage_or_reference_url: s.homepage_or_reference_url,
      })
      .execute();
    return sourceId;
  });
}

/** sha256 of the summary alone, so the same answer on another day is the same record. */
export function polonaInventoryHash(inventory: PolonaInventory): string {
  return createHash("sha256").update(JSON.stringify(inventory)).digest("hex");
}

export type StoredPolonaInventory =
  | { readonly status: "STORED"; readonly source_record_id: string }
  | { readonly status: "UNCHANGED"; readonly source_record_id: string };

/**
 * Stores one surname's inventory as a `source_records` row.
 *
 * The same summary as the surname's active record only refreshes that record's
 * `retrieved_at`: it was read again, and said the same. A different summary is
 * a new record that supersedes the old one, which is marked `UPDATED`.
 */
export async function storePolonaInventory(
  db: Kysely<DB>,
  input: {
    readonly sourceId: string;
    readonly surnameId: string;
    readonly fetched: FetchedPolonaInventory;
  },
): Promise<StoredPolonaInventory> {
  const { sourceId, surnameId, fetched } = input;
  const externalId = polonaInventoryRecordId(surnameId);
  const hash = polonaInventoryHash(fetched.inventory);
  return db.transaction().execute(async (trx) => {
    const active = await trx
      .selectFrom("source_records")
      .select(["source_record_id", "content_hash"])
      .where("source_id", "=", sourceId)
      .where("external_record_id", "=", externalId)
      .where("record_status", "=", "ACTIVE")
      .execute();
    if (active.length > 1) {
      throw new Error(`${String(active.length)} active Polona records for ${externalId}`);
    }
    const current = active[0];
    if (current && current.content_hash === hash) {
      await trx
        .updateTable("source_records")
        .set({ retrieved_at: new Date(fetched.retrieved_at) })
        .where("source_record_id", "=", current.source_record_id)
        .execute();
      return { status: "UNCHANGED", source_record_id: current.source_record_id };
    }
    if (current) {
      await trx
        .updateTable("source_records")
        .set({ record_status: "UPDATED" })
        .where("source_record_id", "=", current.source_record_id)
        .execute();
    }
    const sourceRecordId = uuidv7();
    await trx
      .insertInto("source_records")
      .values({
        source_record_id: sourceRecordId,
        source_id: sourceId,
        external_record_id: externalId,
        external_parent_id: null,
        record_type: "INDEX_ENTRY",
        source_url: `${POLONA_API_BASE}/search/simple?query=${encodeURIComponent(
          polonaQuery(fetched.inventory.surname),
        )}`,
        raw_payload: JSON.stringify({
          inventory: fetched.inventory,
          response_sha256: fetched.response_sha256,
        }),
        raw_text_ref: null,
        content_hash: hash,
        retrieved_at: new Date(fetched.retrieved_at),
        source_modified_at: null,
        rights_profile_id: null,
        record_status: "ACTIVE",
        supersedes_source_record_id: current?.source_record_id ?? null,
      })
      .execute();
    return { status: "STORED", source_record_id: sourceRecordId };
  });
}
