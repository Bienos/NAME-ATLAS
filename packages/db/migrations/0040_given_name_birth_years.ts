import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * First names given to children, by year of birth (ADR-0042, TASK-135),
 * beside ADR-0032's tables and with the same `given_names` identity.
 *
 * - `given_name_birth_lists`: one published list, a year of birth and a sex,
 *   in one source record. The 2000–2019 file holds forty such lists; each
 *   yearly file holds one. It carries the publisher's cut-off for its year
 *   (5 to 2012, 2 from 2013), so an absent name can be said to be below it,
 *   and the list's own rows and children, read from the file.
 * - `given_name_birth_counts`: the publisher's count for one given name on
 *   one list. No zero is stored: an absent name has no row.
 *
 * Lists of different years or sexes are never summed; each carries its own
 * comparability group. A list belongs to its source record: a superseded
 * record's lists stay, and a reader takes the ACTIVE record's.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE given_name_birth_lists (
      given_name_birth_list_id  uuid PRIMARY KEY,
      source_record_id          uuid     NOT NULL REFERENCES source_records (source_record_id),
      birth_year                smallint NOT NULL,
      sex                       text     NOT NULL,
      -- The publisher's cut-off for the year: a lower count is never on the list.
      publication_threshold     smallint NOT NULL,
      -- Read from the file: every row of the list, placeholders included.
      row_count                 integer  NOT NULL,
      people_sum                integer  NOT NULL,
      comparability_group       text     NOT NULL,
      created_at                timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT given_name_birth_lists_one_per_record UNIQUE (source_record_id, birth_year, sex),
      CONSTRAINT given_name_birth_lists_year_known CHECK (birth_year BETWEEN 2000 AND 2100),
      CONSTRAINT given_name_birth_lists_sex_known CHECK (sex IN ('MALE', 'FEMALE')),
      CONSTRAINT given_name_birth_lists_threshold_published CHECK (publication_threshold >= 2),
      CONSTRAINT given_name_birth_lists_rows_positive CHECK (row_count > 0),
      CONSTRAINT given_name_birth_lists_people_positive CHECK (people_sum > 0),
      CONSTRAINT given_name_birth_lists_group_not_blank CHECK (length(comparability_group) > 0)
    )
  `.execute(db);

  await sql`
    CREATE TABLE given_name_birth_counts (
      given_name_birth_count_id  uuid    PRIMARY KEY,
      given_name_birth_list_id   uuid    NOT NULL
                                   REFERENCES given_name_birth_lists (given_name_birth_list_id),
      given_name_id              uuid    NOT NULL REFERENCES given_names (given_name_id),
      count                      integer NOT NULL,
      created_at                 timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT given_name_birth_counts_one_per_list
        UNIQUE (given_name_birth_list_id, given_name_id),
      -- The lowest cut-off the publisher has used; the importer holds each list to its own.
      CONSTRAINT given_name_birth_counts_published_minimum CHECK (count >= 2)
    )
  `.execute(db);
  // A name's series across the years.
  await sql`
    CREATE INDEX given_name_birth_counts_given_name_idx ON given_name_birth_counts (given_name_id)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS given_name_birth_counts`.execute(db);
  await sql`DROP TABLE IF EXISTS given_name_birth_lists`.execute(db);
}
