import type { SitemapEntry } from "@name-atlas/seo";
import { SITEMAP_PAGE_SIZE, surnameRoute } from "@name-atlas/seo";
import type { SlugLocale } from "@name-atlas/seo";

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
 */
export function sitemapIndexXml(origin: string, pages: number): string {
  const entries = Array.from(
    { length: pages },
    (_, i) =>
      `  <sitemap><loc>${escapeXml(`${origin}/sitemap/${String(i + 1)}.xml`)}</loc></sitemap>`,
  );
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

export { SITEMAP_PAGE_SIZE };
