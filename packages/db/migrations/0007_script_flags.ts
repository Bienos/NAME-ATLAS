import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Script review flags on `surnames` (TASK-010, resolving D-014 as Option C).
 *
 * `docs/canonical/13` §10.4: Latin + Cyrillic lookalike characters get a
 * "review/security flag. Do not reject automatically; historical/OCR text
 * can genuinely contain mixed scripts." Until now the importer *did* reject:
 * a mixed-script row resolved `REVIEW_REQUIRED`, was quarantined, and TASK-004
 * U-5(a) aborted the whole resource — which is how two rows (`HODŽIЌ`,
 * `ЌATOVIЌ`, each carrying U+040C among Latin letters) kept the entire female
 * national resource out of the database.
 *
 * These two columns are where the flag lives once the row is stored. They
 * mirror the resolver's `ScriptDetection` fields of the same names, written
 * exactly as detected — never a mapping, never a correction. The check
 * constraint records the only relation between them: a confusable pair is a
 * kind of mixed script, so the second implies the first.
 *
 * The default `false` is a fact for every existing row, not an assumption:
 * the importer refused mixed-script rows before this migration, so no
 * production-written surname is mixed-script. Test seeding never validates,
 * but a test database is rebuilt from scratch.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE surnames
      ADD COLUMN mixed_script           boolean NOT NULL DEFAULT false,
      ADD COLUMN script_confusable_flag boolean NOT NULL DEFAULT false,
      ADD CONSTRAINT surnames_confusable_implies_mixed
        CHECK (NOT script_confusable_flag OR mixed_script)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // Dropping the columns drops the finding. Rows imported under TASK-010 stay
  // stored; only the record that they were flagged is lost, which is the
  // honest description of what reverting this migration does.
  await sql`
    ALTER TABLE surnames
      DROP CONSTRAINT IF EXISTS surnames_confusable_implies_mixed,
      DROP COLUMN IF EXISTS script_confusable_flag,
      DROP COLUMN IF EXISTS mixed_script
  `.execute(db);
}
