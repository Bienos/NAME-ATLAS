import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { TruthInvariantError } from "./derive.js";
import { resolveEffectiveRights } from "./rights.js";
import type { FullRights, RightsLayer } from "./rights.js";

/**
 * Loading the effective rights position for a piece of evidence
 * (`docs/canonical/12` §6.1, ADR-0007 §6).
 *
 * The precedence chain is:
 *
 *     DigitalAsset rights  overrides
 *     SourceRecord rights  overrides
 *     Source default rights
 *
 * and a child may only be **more** restrictive. The fold that enforces that is
 * `resolveEffectiveRights`; this module's job is to read the layers that exist
 * in the database and hand them over in the right order.
 *
 * `source_records.rights_profile_id` has existed since migration 0003 and has
 * never been written: PESEL's rights are uniform across the resource, so the
 * source default is the whole story. It becomes load-bearing for a digital
 * library, where `docs/canonical/12` §16.4 says rights differ per object.
 *
 * The asset layer is a parameter rather than a table read. `digital_assets` is
 * not built (TASK-021 §3) because nothing writes to it yet, but the precedence
 * is complete and testable all the same: a caller holding object-level rights
 * from a connector response passes them here.
 */

const PROFILE_COLUMNS = [
  "rp.metadata_rights",
  "rp.transcription_rights",
  "rp.image_rights",
  "rp.database_rights",
  "rp.automated_access",
  "rp.commercial_use",
  "rp.redistribution",
  "rp.review_status",
  "rp.attribution_required",
  "rp.attribution_text",
  "rp.source_owner",
  "rp.rights_url",
] as const;

export interface RightsLoadRequest {
  readonly source_id: string;
  /** Optional: the record whose profile may tighten the source default. */
  readonly source_record_id?: string | null;
  /** Optional: object-level rights a connector read from the asset itself. */
  readonly asset?: RightsLayer | null;
}

export async function loadEffectiveRights(
  db: Kysely<DB>,
  request: RightsLoadRequest,
): Promise<FullRights> {
  const base = await db
    .selectFrom("sources as src")
    .innerJoin("rights_profiles as rp", "rp.rights_profile_id", "src.default_rights_profile_id")
    .select(PROFILE_COLUMNS)
    .where("src.source_id", "=", request.source_id)
    .executeTakeFirst();

  if (!base) {
    throw new TruthInvariantError(
      "MISSING_RIGHTS_PROFILE",
      `source ${request.source_id} has no reachable rights profile`,
    );
  }

  let record: RightsLayer | null = null;
  if (request.source_record_id != null) {
    const row = await db
      .selectFrom("source_records as sr")
      .innerJoin("rights_profiles as rp", "rp.rights_profile_id", "sr.rights_profile_id")
      .select(PROFILE_COLUMNS)
      .where("sr.source_record_id", "=", request.source_record_id)
      .executeTakeFirst();
    // No row is the ordinary case: the column is nullable and the record
    // simply inherits. It is not an error and must not fail closed to
    // PROHIBITED, which would block a source whose rights are perfectly clear.
    record = row ?? null;
  }

  return resolveEffectiveRights(base, record, request.asset);
}
