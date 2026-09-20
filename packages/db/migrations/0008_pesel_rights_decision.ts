import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * D-007 resolved (2026-09-20): the PESEL rights profile records the project
 * owner's decision to rely on the dataset-level CC0 1.0 declaration and the
 * statutory right to re-use public sector information.
 *
 * `ensureRegistry` in the importer seeds a RightsProfile only when the
 * Source does not exist yet, so a database populated before this decision
 * still carries the earlier posture (`commercial_use = UNKNOWN`,
 * `review_status = LEGAL_REVIEW_REQUIRED`). This migration brings that row
 * to the same values `packages/sources/src/registry.ts` now seeds, so a
 * fresh database and a populated one agree. Data only; no schema change.
 *
 * A judgement, recorded as one. `down()` restores the earlier posture.
 */

const NOTES =
  "Licence is stated at DATASET level (license_name = 'CC0 1.0', dataset 1681); resource-level " +
  "metadata carries no licence attribute. D-007 resolved by the project owner on 2026-09-20: " +
  "rely on the dataset-level CC0 1.0 declaration — dane.gov.pl attaches licences at dataset " +
  "level, resources being files within a dataset — together with the statutory right to " +
  "re-use public sector information (ustawa o otwartych danych). This is the project owner's " +
  "judgement, recorded as such, not a publisher confirmation; a confirmation, if obtained, " +
  "would be recorded here and would change nothing unless it contradicted this posture.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    UPDATE rights_profiles rp
       SET commercial_use = 'ALLOWED',
           redistribution = 'ALLOWED',
           review_status  = 'APPROVED',
           checked_at     = '2026-09-20T00:00:00Z',
           valid_from     = '2026-09-20',
           notes          = ${NOTES}
      FROM sources s
     WHERE s.default_rights_profile_id = rp.rights_profile_id
       AND s.source_key = 'pl_pesel_surnames'
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    UPDATE rights_profiles rp
       SET commercial_use = 'UNKNOWN',
           redistribution = 'UNKNOWN',
           review_status  = 'LEGAL_REVIEW_REQUIRED',
           checked_at     = '2026-09-19T00:00:00Z',
           valid_from     = '2026-09-19',
           notes          = 'Reverted by 0008 down(): posture before the D-007 decision of 2026-09-20.'
      FROM sources s
     WHERE s.default_rights_profile_id = rp.rights_profile_id
       AND s.source_key = 'pl_pesel_surnames'
  `.execute(db);
}
