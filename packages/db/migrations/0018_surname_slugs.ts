import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The persisted canonical slug (TASK-027, ADR-0010 — resolves D-019).
 *
 * Three invariants are enforced here rather than by convention, because each is
 * a property a URL in a search index depends on:
 *
 *   - `UNIQUE (locale, slug)` makes a collision impossible to *store*. Two
 *     entities cannot share an address, so no request can be ambiguous and the
 *     three-reading confirmation dance ADR-0009 needed disappears.
 *   - `UNIQUE (locale, surname_id) WHERE is_current` makes "exactly one current
 *     address per surname per locale" a database fact rather than something the
 *     backfill has to remember.
 *   - A superseded row **stays**, with `is_current = false`, so a display-form
 *     correction answers the old address with a 301 instead of breaking a link
 *     a crawler already indexed.
 *
 * `locale` is in the key even though today's slug comes from `canonical_display`
 * and is identical in both locales. `docs/canonical/21` §25's ASCII aliases are
 * locale-specific when they arrive, and a table keyed on the slug alone would
 * need another migration over 598,476 surnames to accept them.
 *
 * Migration `0017`'s alphanumeric index is deliberately kept: it leaves the
 * request path, and the backfill uses the same expression to find which
 * entities a slug could belong to.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE surname_slugs (
      surname_slug_id  uuid        PRIMARY KEY,
      locale           text        NOT NULL,
      slug             text        NOT NULL,
      surname_id       uuid        NOT NULL REFERENCES surnames (surname_id),
      is_current       boolean     NOT NULL DEFAULT true,
      created_at       timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT surname_slugs_slug_not_blank
        CHECK (length(slug) > 0),
      CONSTRAINT surname_slugs_slug_no_space
        CHECK (slug !~ '\\s'),
      CONSTRAINT surname_slugs_locale_known
        CHECK (locale IN ('pl', 'en'))
    )
  `.execute(db);

  // One entity per address, per locale. This is the collision guarantee.
  await sql`
    CREATE UNIQUE INDEX surname_slugs_locale_slug_uq
      ON surname_slugs (locale, slug)
  `.execute(db);

  // One current address per entity, per locale. Superseded rows are unlimited.
  await sql`
    CREATE UNIQUE INDEX surname_slugs_current_uq
      ON surname_slugs (locale, surname_id)
      WHERE is_current
  `.execute(db);

  // For "what is this surname's address", used by the sitemap and the page.
  await sql`
    CREATE INDEX surname_slugs_surname_idx
      ON surname_slugs (surname_id)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS surname_slugs`.execute(db);
}
