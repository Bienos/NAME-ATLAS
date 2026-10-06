import type { SitemapEntry } from "@name-atlas/seo";
import { SITEMAP_PAGE_SIZE, surnameRoute } from "@name-atlas/seo";
import type { SlugLocale } from "@name-atlas/seo";
import { pairedPost } from "./blog.js";
import type { BlogPost } from "./blog.js";
import { blogPostPath } from "./site-links.js";

/**
 * Sitemap serialisation (TASK-027, ADR-0010 §3).
 *
 * Pure, so the escaping and the paging arithmetic are testable without a
 * database or a request.
 */

/** XML's five predefined entities. A surname can legitimately contain `&`. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

/** How many sitemap pages `total` URLs need. Zero URLs need zero pages. */
export function pageCount(total: number): number {
  return Math.ceil(total / SITEMAP_PAGE_SIZE);
}

/**
 * The sitemap index. 598,476 surnames cannot be one sitemap — the protocol caps
 * a file at 50,000 URLs — so the root document names the pages.
 *
 * An index with no pages is valid and is what an alpha correctly serves.
 *
 * `extra` names further sitemaps by path, after the surname pages: the blog's
 * (TASK-071) when it has posts. Without it the document is as it always was.
 */
export function sitemapIndexXml(
  origin: string,
  pages: number,
  extra: readonly string[] = [],
): string {
  const entries = [
    ...Array.from({ length: pages }, (_, i) => `/sitemap/${String(i + 1)}.xml`),
    ...extra,
  ].map((path) => `  <sitemap><loc>${escapeXml(`${origin}${path}`)}</loc></sitemap>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</sitemapindex>",
    "",
  ].join("\n");
}

/**
 * One sitemap page.
 *
 * Both locales' addresses for a surname are the same page's translations, so
 * each URL carries `xhtml:link rel="alternate"` for the other — `docs/canonical/21`
 * §20. No `priority`, and no `changefreq`: both are hints Google has said it
 * ignores, and inventing a number for them would be decoration.
 */
export function sitemapPageXml(
  origin: string,
  locale: SlugLocale,
  entries: readonly SitemapEntry[],
): string {
  const other: SlugLocale = locale === "pl" ? "en" : "pl";
  const urls = entries.flatMap((entry) => {
    const path = surnameRoute(entry.slug, locale);
    const alternate = surnameRoute(entry.slug, other);
    if (path === null) return [];
    return [
      "  <url>",
      `    <loc>${escapeXml(`${origin}${path}`)}</loc>`,
      `    <lastmod>${escapeXml(entry.last_modified)}</lastmod>`,
      ...(alternate === null
        ? []
        : [
            `    <xhtml:link rel="alternate" hreflang="${other}" href="${escapeXml(`${origin}${alternate}`)}"/>`,
            `    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(`${origin}${path}`)}"/>`,
          ]),
      "  </url>",
    ];
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/**
 * Vercel's CDN caching for the sitemaps that read the database (TASK-127):
 * `/sitemap.xml` and `/sitemap/{n}.xml`, on a 200 only.
 *
 * Each took 7–14 s on production (TASK-126's merged PR) and listed the same
 * claims for hours or months at a time, so a crawler should not wait for the
 * database on every fetch. Fresh for 6 hours; for a further 24 the stale copy
 * is served at once while the CDN rebuilds it in the background. Vercel's CDN
 * reads `s-maxage` and `stale-while-revalidate`; a browser or crawler does not
 * keep a copy of its own.
 *
 * Errors and 404s carry no such header, so a failure is never cached, and the
 * responses with nothing to read (no `SITE_ORIGIN`, `SEO_INDEXING_ENABLED`
 * unset) are not cached either: switching the flag is a redeployment and must
 * take effect at once, as `robots.txt`'s five minutes do.
 */
export const SITEMAP_CACHE_CONTROL = "public, s-maxage=21600, stale-while-revalidate=86400";

/** The headers of a sitemap read from the database. */
export const CACHED_SITEMAP_HEADERS = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": SITEMAP_CACHE_CONTROL,
} as const;

/** Where the blog's sitemap is served (TASK-071). */
export const BLOG_SITEMAP_PATH = "/sitemap-blog.xml";

/**
 * The blog's sitemap (TASK-071): every post, its `lastmod` the post's date, and
 * `hreflang` alternates when the post exists in both languages.
 */
export function blogSitemapXml(origin: string, posts: readonly BlogPost[]): string {
  const urls = posts.flatMap((post) => {
    const path = `${origin}${blogPostPath(post.lang, post.slug)}`;
    const pair = pairedPost(posts, post);
    return [
      "  <url>",
      `    <loc>${escapeXml(path)}</loc>`,
      `    <lastmod>${escapeXml(post.date)}</lastmod>`,
      ...(pair === null
        ? []
        : [
            `    <xhtml:link rel="alternate" hreflang="${pair.lang}" href="${escapeXml(`${origin}${blogPostPath(pair.lang, pair.slug)}`)}"/>`,
            `    <xhtml:link rel="alternate" hreflang="${post.lang}" href="${escapeXml(path)}"/>`,
          ]),
      "  </url>",
    ];
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

export { SITEMAP_PAGE_SIZE };
