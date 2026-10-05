import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The frozen surname report (TASK-119, M5's first step; `docs/canonical/11`
 * §26, `docs/canonical/23` RPT-001).
 *
 * - `reports`: one logical report per surname, type and entitlement. The only
 *   entitlement is `INTERNAL_TEST`: a report built by an operator's command,
 *   never sold (the owner's decision of 2026-10-05; nothing in this schema can
 *   record a paid report).
 * - `report_versions`: an immutable snapshot, numbered from 1, holding the
 *   validated PAID-surface response with the coverage, DiscoveryIndex and
 *   eligibility it was read with (`rendered_payload`).
 * - `report_sections`: `docs/canonical/11` §26.3's section types, in order.
 * - `report_claim_references`: the claims behind each section (§26.4), so a
 *   report can always say which claims support it.
 *
 * Versions, sections and claim references can never be updated or deleted:
 * a trigger refuses, so a rebuilt report is a new version and an old one stays
 * as it was. Every reference is ON DELETE RESTRICT; claims are superseded, not
 * deleted, so the claims a version cites remain.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE reports (
      report_id        uuid PRIMARY KEY,
      surname_id       uuid NOT NULL REFERENCES surnames (surname_id) ON DELETE RESTRICT,
      report_type      text NOT NULL,
      entitlement_kind text NOT NULL,
      status           text NOT NULL,
      created_at       timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT reports_type_known CHECK (report_type IN ('NAME_ATLAS')),
      CONSTRAINT reports_internal_test_only CHECK (entitlement_kind = 'INTERNAL_TEST'),
      CONSTRAINT reports_status_known CHECK (status IN ('DRAFT', 'READY', 'SUPERSEDED', 'WITHDRAWN')),
      CONSTRAINT reports_one_per_surname UNIQUE (surname_id, report_type, entitlement_kind)
    )
  `.execute(db);
  await sql`
    CREATE TABLE report_versions (
      report_version_id           uuid PRIMARY KEY,
      report_id                   uuid NOT NULL REFERENCES reports (report_id) ON DELETE RESTRICT,
      version_number              integer NOT NULL,
      report_schema_version       text NOT NULL,
      coverage_assessment_version text NOT NULL,
      discovery_index_version     text NOT NULL,
      eligibility_policy_version  text NOT NULL,
      eligibility_state           text NOT NULL,
      rendered_payload            jsonb NOT NULL,
      generated_at                timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT report_versions_number_positive CHECK (version_number >= 1),
      CONSTRAINT report_versions_number_unique UNIQUE (report_id, version_number),
      CONSTRAINT report_versions_eligibility_known CHECK (
        eligibility_state IN ('ELIGIBLE', 'INSUFFICIENT_MEANINGFUL_CONTENT', 'RIGHTS_BLOCKED')
      )
    )
  `.execute(db);
  await sql`
    CREATE TABLE report_sections (
      report_section_id          uuid PRIMARY KEY,
      report_version_id          uuid NOT NULL REFERENCES report_versions (report_version_id) ON DELETE RESTRICT,
      section_type               text NOT NULL,
      sequence_number            integer NOT NULL,
      title_payload              jsonb NOT NULL,
      body_payload               jsonb NOT NULL,
      section_confidence_summary jsonb NOT NULL,
      CONSTRAINT report_sections_type_known CHECK (section_type IN (
        'ORIGIN', 'DISTRIBUTION', 'VARIANTS', 'PLACES', 'TIMELINE', 'MIGRATION',
        'ARCHIVES', 'SOURCES', 'LIMITATIONS'
      )),
      CONSTRAINT report_sections_sequence_unique UNIQUE (report_version_id, sequence_number),
      CONSTRAINT report_sections_type_unique UNIQUE (report_version_id, section_type)
    )
  `.execute(db);
  await sql`
    CREATE TABLE report_claim_references (
      report_section_id uuid NOT NULL REFERENCES report_sections (report_section_id) ON DELETE RESTRICT,
      claim_id          uuid NOT NULL REFERENCES claims (claim_id) ON DELETE RESTRICT,
      presentation_role text NOT NULL,
      sequence          integer NOT NULL,
      PRIMARY KEY (report_section_id, sequence),
      CONSTRAINT report_claim_references_role_known CHECK (
        presentation_role IN ('HERO', 'SUPPORT', 'FOOTNOTE', 'LIMITATION')
      ),
      CONSTRAINT report_claim_references_claim_once UNIQUE (report_section_id, claim_id)
    )
  `.execute(db);
  await sql`CREATE INDEX report_claim_references_claim_idx ON report_claim_references (claim_id)`.execute(
    db,
  );

  await sql`
    CREATE FUNCTION refuse_report_change() RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'a report version is immutable: % on % refused', TG_OP, TG_TABLE_NAME
          USING ERRCODE = 'restrict_violation';
      END
      $$
  `.execute(db);
  for (const table of ["report_versions", "report_sections", "report_claim_references"]) {
    await sql`
      CREATE TRIGGER ${sql.raw(`${table}_immutable`)}
        BEFORE UPDATE OR DELETE ON ${sql.table(table)}
        FOR EACH ROW EXECUTE FUNCTION refuse_report_change()
    `.execute(db);
  }
}

/** Refuses while any report is stored: a down migration must never delete a frozen report. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const held = await sql<{ n: string }>`SELECT count(*)::text AS n FROM reports`.execute(db);
  if (Number(held.rows[0]?.n ?? "0") > 0) {
    throw new Error("refusing to undo 0037: reports are stored (TASK-119).");
  }
  await sql`DROP TABLE report_claim_references`.execute(db);
  await sql`DROP TABLE report_sections`.execute(db);
  await sql`DROP TABLE report_versions`.execute(db);
  await sql`DROP TABLE reports`.execute(db);
  await sql`DROP FUNCTION refuse_report_change()`.execute(db);
}
