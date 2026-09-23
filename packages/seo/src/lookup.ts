import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import { canonicalSlug } from "./slug.js";
import type { SlugLocale } from "./slug.js";

/**
 * A slug back to exactly one entity (TASK-027, ADR-0010 §2).
 *
 * One indexed exact lookup on `(locale, slug)`. ADR-0009's version tried three
 * readings of the slug and confirmed each candidate by recomputing its slug,
 * because nothing stored the mapping; now something does, and
 * `UNIQUE (locale, slug)` means a stored address can only ever name one entity.
 * `COLLISION` is therefore gone as an outcome: it cannot happen.
 */
export type SlugLookup =
  | { readonly kind: "RESOLVED"; readonly surname_id: string; readonly display_name: string }
  /** A retired address. The caller answers 301 with `current_slug` (§26). */
  | { readonly kind: "MOVED"; readonly current_slug: string }
  | { readonly kind: "UNKNOWN" }
  /** Not in canonical form: a capitalised or padded address is not this page. */
  | { readonly kind: "INVALID" };

export async function lookupSlug(
  db: Kysely<DB>,
  locale: SlugLocale,
  slug: string,
): Promise<SlugLookup> {
  // Next decodes a dynamic route segment before handing it over, so decoding
  // again would turn `%2520` into a space and resolve an address nobody asked
  // for. The value is taken as given.
  if (slug === "" || slug !== canonicalSlug(slug)) return { kind: "INVALID" };

  const row = await db
    .selectFrom("surname_slugs")
    .innerJoin("surnames", "surnames.surname_id", "surname_slugs.surname_id")
    .select([
      "surname_slugs.surname_id as surname_id",
      "surname_slugs.is_current as is_current",
      "surnames.canonical_display as canonical_display",
      "surnames.entity_status as entity_status",
    ])
    .where("surname_slugs.locale", "=", locale)
    .where("surname_slugs.slug", "=", slug)
    .executeTakeFirst();

  if (!row) return { kind: "UNKNOWN" };

  if (row.is_current) {
    // A retired *entity* is not an address either, whatever its slug says.
    if (row.entity_status !== "ACTIVE") return { kind: "UNKNOWN" };
    return {
      kind: "RESOLVED",
      surname_id: row.surname_id,
      display_name: row.canonical_display,
    };
  }

  const current = await db
    .selectFrom("surname_slugs")
    .select(["slug"])
    .where("locale", "=", locale)
    .where("surname_id", "=", row.surname_id)
    .where("is_current", "=", true)
    .executeTakeFirst();

  // A superseded slug whose entity has no current address is not a redirect to
  // nowhere; it is simply gone.
  return current ? { kind: "MOVED", current_slug: current.slug } : { kind: "UNKNOWN" };
}

/** This surname's current address in one locale, or `null` if it has none. */
export async function currentSlugFor(
  db: Kysely<DB>,
  locale: SlugLocale,
  surnameId: string,
): Promise<string | null> {
  const row = await db
    .selectFrom("surname_slugs")
    .select(["slug"])
    .where("locale", "=", locale)
    .where("surname_id", "=", surnameId)
    .where("is_current", "=", true)
    .executeTakeFirst();
  return row?.slug ?? null;
}

/**
 * Current addresses for several surnames in one query, keyed by surname id.
 * A surname with no current address in the locale is absent from the map.
 */
export async function currentSlugsFor(
  db: Kysely<DB>,
  locale: SlugLocale,
  surnameIds: readonly string[],
): Promise<Map<string, string>> {
  if (surnameIds.length === 0) return new Map();
  const rows = await db
    .selectFrom("surname_slugs")
    .select(["surname_id", "slug"])
    .where("locale", "=", locale)
    .where("surname_id", "in", surnameIds)
    .where("is_current", "=", true)
    .execute();
  return new Map(rows.map((r) => [r.surname_id, r.slug]));
}
