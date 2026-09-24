import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import { canonicalSlug, lookupSlug, surnameRoute } from "@name-atlas/seo";
import type { SlugLookup } from "@name-atlas/seo";
import type { Lang } from "./messages.js";

/**
 * The slug, as the app uses it.
 *
 * The rule itself lives in `@name-atlas/seo` (TASK-027): the backfill that
 * writes every surname's address is a CLI, and two implementations of a slug
 * rule would be two slug rules. This module is the app-shaped surface over it —
 * `Lang` instead of `SlugLocale`, and a `SlugResolution` the page already reads.
 *
 * What changed with ADR-0010: resolution is one indexed lookup on
 * `(locale, slug)` instead of three readings and a confirmation loop, and
 * `COLLISION` is gone as an outcome. `UNIQUE (locale, slug)` means a stored
 * address can only ever name one entity, so an ambiguous request cannot happen.
 * A retired address is answered with a redirect rather than a page.
 */

export { canonicalSlug };

/** `/pl/nazwisko/{slug}` or `/en/surname/{slug}` (§19–§20). */
export function surnamePath(display: string, lang: Lang): string | null {
  const slug = canonicalSlug(display);
  // A display form made only of characters that map to `-` slugs to the empty
  // string, and `/pl/nazwisko/` is not that surname's address — it is no address
  // at all. The caller renders a link only when there is one.
  return surnameRoute(slug, lang === "en" ? "en" : "pl");
}

/** The path a slug string addresses, without consulting the database. */
export function pathForSlug(slug: string, lang: Lang): string | null {
  return surnameRoute(slug, lang === "en" ? "en" : "pl");
}

export type SlugResolution =
  | { readonly kind: "RESOLVED"; readonly surname_id: string; readonly display_name: string }
  | { readonly kind: "MOVED"; readonly current_slug: string }
  | { readonly kind: "UNKNOWN" }
  | { readonly kind: "INVALID" };

export async function resolveSlug(
  db: Kysely<DB>,
  slug: string,
  lang: Lang = "pl",
): Promise<SlugResolution> {
  const outcome: SlugLookup = await lookupSlug(db, lang === "en" ? "en" : "pl", slug);
  return outcome;
}

/**
 * A page component's `[slug]` segment, decoded.
 *
 * Next 16 does not hand a page component the value it hands the rest of the
 * route. `generateMetadata` and the image routes receive the segment decoded;
 * the page receives `encodeURIComponent` of it (`getParamValue` in
 * `next/dist/shared/lib/router/utils/get-dynamic-param.js` encodes what
 * `getDynamicParam` calls "the value that is passed to user code"). An ASCII
 * slug passes through that unchanged, so only surnames with a Polish letter
 * broke: at `/pl/nazwisko/w%C3%B3jcik` the title named WÓJCIK while the page,
 * given `w%C3%B3jcik`, failed the canonical-form check and said there was no
 * surname at that address (found in production, 2026-09-24).
 *
 * One decoding undoes exactly that encoding and gives the page the value its
 * metadata already has. It is not a second decoding of the request:
 * `/pl/nazwisko/a%2520b` still reaches the lookup as `a%20b`, which it refuses.
 */
export function pageSlug(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // Not a value `encodeURIComponent` produced, so there is nothing to undo;
    // the canonical-form check refuses it as given.
    return segment;
  }
}
