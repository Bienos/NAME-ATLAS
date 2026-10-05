import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The full-name report (TASK-124, ADR-0041): a frozen report for a first name
 * and a surname together, beside the surname report of 0037.
 *
 * - `reports.given_name_id`: the first name of a `FULL_NAME` report, and null
 *   for every `NAME_ATLAS` report. A check ties the column to the type.
 * - One report per subject and entitlement: the surname alone, or the pair.
 *   NULLS NOT DISTINCT keeps a second surname report from slipping past the
 *   constraint on its null first name.
 * - `report_sections` gains `GIVEN_NAME`, the first-name chapter.
 *
 * The pair is two names, never a person: the report holds no count of people
 * with both (ADR-0032 §7, D-033).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE reports
      ADD COLUMN given_name_id uuid REFERENCES given_names (given_name_id) ON DELETE RESTRICT
  `.execute(db);
  await sql`ALTER TABLE reports DROP CONSTRAINT reports_type_known`.execute(db);
  await sql`
    ALTER TABLE reports
      ADD CONSTRAINT reports_type_known CHECK (report_type IN ('NAME_ATLAS', 'FULL_NAME')),
      ADD CONSTRAINT reports_given_name_for_full_name
        CHECK ((report_type = 'FULL_NAME') = (given_name_id IS NOT NULL))
  `.execute(db);
  await sql`ALTER TABLE reports DROP CONSTRAINT reports_one_per_surname`.execute(db);
  await sql`
    ALTER TABLE reports
      ADD CONSTRAINT reports_one_per_subject
        UNIQUE NULLS NOT DISTINCT (surname_id, given_name_id, report_type, entitlement_kind)
  `.execute(db);

  await sql`ALTER TABLE report_sections DROP CONSTRAINT report_sections_type_known`.execute(db);
  await sql`
    ALTER TABLE report_sections ADD CONSTRAINT report_sections_type_known CHECK (section_type IN (
      'GIVEN_NAME', 'ORIGIN', 'DISTRIBUTION', 'VARIANTS', 'PLACES', 'TIMELINE', 'MIGRATION',
      'ARCHIVES', 'SOURCES', 'LIMITATIONS'
    ))
  `.execute(db);
}

/** Refuses while a full-name report is stored: a down migration must never delete a frozen report. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const held = await sql<{ n: string }>`
    SELECT count(*)::text AS n FROM reports WHERE report_type = 'FULL_NAME'
  `.execute(db);
  if (Number(held.rows[0]?.n ?? "0") > 0) {
    throw new Error("refusing to undo 0039: full-name reports are stored (TASK-124).");
  }
  await sql`ALTER TABLE report_sections DROP CONSTRAINT report_sections_type_known`.execute(db);
  await sql`
    ALTER TABLE report_sections ADD CONSTRAINT report_sections_type_known CHECK (section_type IN (
      'ORIGIN', 'DISTRIBUTION', 'VARIANTS', 'PLACES', 'TIMELINE', 'MIGRATION',
      'ARCHIVES', 'SOURCES', 'LIMITATIONS'
    ))
  `.execute(db);
  await sql`ALTER TABLE reports DROP CONSTRAINT reports_one_per_subject`.execute(db);
  await sql`ALTER TABLE reports DROP CONSTRAINT reports_given_name_for_full_name`.execute(db);
  await sql`ALTER TABLE reports DROP CONSTRAINT reports_type_known`.execute(db);
  await sql`ALTER TABLE reports DROP COLUMN given_name_id`.execute(db);
  await sql`
    ALTER TABLE reports
      ADD CONSTRAINT reports_type_known CHECK (report_type IN ('NAME_ATLAS')),
      ADD CONSTRAINT reports_one_per_surname UNIQUE (surname_id, report_type, entitlement_kind)
  `.execute(db);
}
