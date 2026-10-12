/**
 * Vercel's CDN caching for the canonical surname pages and their Open Graph
 * images (TASK-181).
 *
 * Both routes are `force-dynamic`, so without this every request — a reader, a
 * search engine, a link preview — ran the function and the database again. On
 * 2026-10-12 the Vercel account was paused for exceeding the Hobby plan's Fast
 * Origin Transfer (30.09 GB of 10 GB) and Fluid Active CPU (8 h 56 min of 4 h),
 * both of which only function responses count. The image route is the costly
 * one: it draws a 1200×630 PNG each time.
 *
 * `Vercel-CDN-Cache-Control` is read by Vercel's CDN alone, takes priority over
 * the `Cache-Control` Next sends with a dynamic page, and is not forwarded to
 * browsers or crawlers, so neither keeps a copy of its own. The cache key is the
 * full URL, query included, so `?intent=` and `?view=cards` are stored apart
 * from the plain page; `Vary` from Next keeps RSC payloads apart from HTML.
 * Neither route reads or sets a cookie.
 *
 * What a cached copy costs:
 *
 * - An `UNAVAILABLE` answer (a failed read) renders as a 200 and is cached like
 *   any other, hence the page's short hour. The image is held longer: a failed
 *   read draws the generic card, which is never wrong, only less specific.
 * - `page_rendered` (TASK-023 §2.6) is logged only when the CDN asks the
 *   function, not for each view served from the cache.
 */

/** The page: fresh for an hour, then served stale for a day while it is rebuilt. */
export const SURNAME_PAGE_CDN_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

/** The Open Graph image: fresh for 6 hours, as the sitemaps are (TASK-127), then a stale day. */
export const SURNAME_IMAGE_CDN_CACHE = "public, s-maxage=21600, stale-while-revalidate=86400";

const header = (value: string) => [{ key: "Vercel-CDN-Cache-Control", value }];

/**
 * The `next.config.ts` header rules. `:slug` is one segment, so the report,
 * share, card and PDF routes below a surname do not match; the image's segment
 * is matched by prefix because Next may suffix it.
 */
export const SURNAME_CDN_CACHE_RULES = [
  { source: "/pl/nazwisko/:slug", headers: header(SURNAME_PAGE_CDN_CACHE) },
  { source: "/en/surname/:slug", headers: header(SURNAME_PAGE_CDN_CACHE) },
  {
    source: "/pl/nazwisko/:slug/:image(opengraph-image.*)",
    headers: header(SURNAME_IMAGE_CDN_CACHE),
  },
  {
    source: "/en/surname/:slug/:image(opengraph-image.*)",
    headers: header(SURNAME_IMAGE_CDN_CACHE),
  },
];
