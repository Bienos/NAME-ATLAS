/**
 * `@name-atlas/seo` — the slug rule, the collision suffix, and what a sitemap
 * may list (ADR-0009, ADR-0010; `docs/canonical/21`).
 *
 * A package rather than a module inside `apps/web` because the backfill that
 * writes every surname's slug is a CLI, and two implementations of a slug rule
 * would be two slug rules.
 */
export {
  canonicalSlug,
  shortSlugId,
  SHORT_SLUG_ID_LENGTH,
  slugFor,
  SLUG_LOCALES,
  suffixedSlug,
  surnameRoute,
} from "./slug.js";
export type { SlugLocale } from "./slug.js";
export { backfillSlugs } from "./backfill.js";
export type { BackfillReport } from "./backfill.js";
export { currentSlugFor, currentSlugsFor, lookupSlug } from "./lookup.js";
export type { SlugLookup } from "./lookup.js";
export { SITEMAP_PAGE_SIZE, sitemapCount, sitemapEntries } from "./sitemap.js";
export type { SitemapEntry } from "./sitemap.js";
