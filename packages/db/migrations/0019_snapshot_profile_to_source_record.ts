import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Moves the per-resource descriptive text off every snapshot row (TASK-030).
 *
 * Five columns on `distribution_snapshots` describe the **resource**, not the
 * surname, and were stored once per snapshot. Measured on the full register
 * (1,223,015 snapshots over four source records):
 *
 * | column | space | distinct values |
 * |---|---:|---:|
 * | `coverage_notes` | 695 MB | **2** |
 * | `universe_description` | 157 MB | 4 |
 * | `methodology_key` | 60 MB | 4 |
 * | `comparability_group` | 30 MB | 4 |
 * | `dataset_version` | 25 MB | 4 |
 *
 * 967 MB of a 1,162 MB table — 83% — holding at most four strings. The
 * dependency on `source_record_id` was verified before this was written, not
 * assumed: grouping the whole table by source record gave exactly **one**
 * distinct value of every column for all four records.
 *
 * They move to `source_records`, where there are four rows instead of 1.2
 * million. Nullable there, because a source record need not carry a
 * distribution at all — an onomastic work has none.
 *
 * ## What this does not change
 *
 * Nothing about what the product says. The same text reaches the same places
 * through a join the reading queries mostly already had. `docs/canonical/11`
 * §6.2's `DistributionSnapshot` keeps every field it had; this is where they are
 * stored, not what they mean.
 *
 * ## Reclaiming the space
 *
 * `DROP COLUMN` marks a column dead without rewriting the heap, so an existing
 * database keeps its size until `VACUUM FULL` (or `pg_repack`) rewrites the
 * table. A database built by running these migrations from empty never contains
 * the columns and needs neither.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE source_records
      ADD COLUMN dataset_version     text,
      ADD COLUMN universe_description text,
      ADD COLUMN methodology_key     text,
      ADD COLUMN comparability_group text,
      ADD COLUMN coverage_notes      text
  `.execute(db);

  // Backfill. `DISTINCT` is safe because the dependency was verified; if a
  // future resource ever broke it this would raise a cardinality error rather
  // than silently pick one, which is the behaviour we want.
  await sql`
    UPDATE source_records sr
       SET dataset_version      = p.dataset_version,
           universe_description = p.universe_description,
           methodology_key      = p.methodology_key,
           comparability_group  = p.comparability_group,
           coverage_notes       = p.coverage_notes
      FROM (
        SELECT DISTINCT source_record_id, dataset_version, universe_description,
               methodology_key, comparability_group, coverage_notes
          FROM distribution_snapshots
      ) p
     WHERE p.source_record_id = sr.source_record_id
  `.execute(db);

  await sql`
    ALTER TABLE distribution_snapshots
      DROP COLUMN dataset_version,
      DROP COLUMN universe_description,
      DROP COLUMN methodology_key,
      DROP COLUMN comparability_group,
      DROP COLUMN coverage_notes
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  // The columns come back NOT NULL where they were, so reverting cannot leave
  // the table in a shape the pre-0019 code would reject. `universe_description`
  // and `methodology_key` were NOT NULL; `coverage_notes` was not.
  await sql`
    ALTER TABLE distribution_snapshots
      ADD COLUMN dataset_version      text,
      ADD COLUMN universe_description  text,
      ADD COLUMN methodology_key       text,
      ADD COLUMN comparability_group   text,
      ADD COLUMN coverage_notes        text
  `.execute(db);

  await sql`
    UPDATE distribution_snapshots s
       SET dataset_version      = sr.dataset_version,
           universe_description = sr.universe_description,
           methodology_key      = sr.methodology_key,
           comparability_group  = sr.comparability_group,
           coverage_notes       = sr.coverage_notes
      FROM source_records sr
     WHERE sr.source_record_id = s.source_record_id
  `.execute(db);

  // A snapshot whose source record carried no profile cannot be restored to a
  // NOT NULL column. Refusing is right: it means the data did not come from
  // this migration's own `up`, and guessing a description would invent one.
  const orphan = await sql<{ n: string }>`
    SELECT count(*)::text AS n FROM distribution_snapshots
     WHERE universe_description IS NULL OR methodology_key IS NULL
  `.execute(db);
  if (Number(orphan.rows[0]?.n ?? "0") > 0) {
    throw new Error(
      `cannot revert 0019: ${orphan.rows[0]?.n ?? "?"} snapshots have no profile on their ` +
        `source record, so the NOT NULL columns cannot be restored without inventing values`,
    );
  }

  // Only these two were NOT NULL before 0019; `comparability_group`,
  // `coverage_notes` and `dataset_version` were nullable and stay so. Verified
  // against `information_schema` rather than assumed.
  await sql`
    ALTER TABLE distribution_snapshots
      ALTER COLUMN universe_description SET NOT NULL,
      ALTER COLUMN methodology_key      SET NOT NULL
  `.execute(db);

  await sql`
    ALTER TABLE source_records
      DROP COLUMN dataset_version,
      DROP COLUMN universe_description,
      DROP COLUMN methodology_key,
      DROP COLUMN comparability_group,
      DROP COLUMN coverage_notes
  `.execute(db);
}
