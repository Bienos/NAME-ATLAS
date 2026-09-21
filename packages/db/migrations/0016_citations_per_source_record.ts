import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * One citation per (claim, source record), not one per claim (TASK-022).
 *
 * `0004` created `citations_claim_uq` as `UNIQUE (claim_id)`, and its own comment
 * scoped that to the data of the task creating it: "One citation per claim **in
 * this task's data**; re-derivation must not add a second." Every claim TASK-005
 * through TASK-012 derives rests on exactly one resource version, so one
 * citation per claim and one per source record were the same thing.
 *
 * `SURNAME_MEANING` breaks that coincidence. ADR-0008 §5 keeps competing
 * onomastic interpretations inside one claim so a disagreement can be assessed
 * `CONFLICTING` rather than split into two claims that each look confident
 * alone — and a claim supported by two works must cite **both**. Publishing a
 * CONFLICTING reading while citing only one side of it would misrepresent the
 * evidence, which is the failure ADR-0008 exists to prevent.
 *
 * The index is therefore widened to `(claim_id, source_record_id)`. This
 * **preserves** the property `0004` wanted — re-deriving over the same evidence
 * still cannot add a second citation for the same record — and only stops the
 * index forbidding a legitimately multi-sourced claim. Every existing row
 * satisfies the new index, because each currently has a distinct `claim_id`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS citations_claim_uq`.execute(db);
  await sql`
    CREATE UNIQUE INDEX citations_claim_source_record_uq
      ON citations (claim_id, source_record_id)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS citations_claim_source_record_uq`.execute(db);
  // Restoring the narrower index fails if a multi-sourced claim exists, which
  // is correct: the data would no longer fit the constraint being restored.
  await sql`CREATE UNIQUE INDEX citations_claim_uq ON citations (claim_id)`.execute(db);
}
