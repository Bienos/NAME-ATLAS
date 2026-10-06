import { db as sharedDb } from "../../../lib/db.js";
import { SITEMAP_PAGE_SIZE, sitemapEntries } from "@name-atlas/seo";
import { createLogger } from "@name-atlas/logging";
import { indexingEnabled, siteOrigin } from "../../../lib/seo.js";
import { CACHED_SITEMAP_HEADERS, sitemapPageXml } from "../../../lib/sitemap-xml.js";
import { seoBlockedProfileIds } from "../../../lib/seo-surface.js";

/**
 * `/sitemap/{n}.xml` — one page of at most 50,000 URLs (TASK-027, ADR-0010 §3).
 *
 * The page number is 1-based, matching what the index emits. Anything else is a
 * 404 rather than an empty sitemap: a crawler asking for page 9,000 should be
 * told it does not exist, not handed a valid document saying there is nothing
 * there.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
): Promise<Response> {
  const { page } = await params;
  const match = /^(\d{1,4})\.xml$/u.exec(page);
  const index = match ? Number(match[1]) : NaN;
  if (!Number.isInteger(index) || index < 1) {
    return new Response("not found", { status: 404 });
  }

  const origin = siteOrigin();
  if (origin === null || !indexingEnabled()) {
    return new Response("not found", { status: 404 });
  }

  const log = createLogger({ service: "web", base: { route: "/sitemap/[page]" } });
  try {
    const db = sharedDb();
    const entries = await sitemapEntries(db, "pl", {
      limit: SITEMAP_PAGE_SIZE,
      offset: (index - 1) * SITEMAP_PAGE_SIZE,
      seoBlockedProfileIds: await seoBlockedProfileIds(db),
    });
    if (entries.length === 0) return new Response("not found", { status: 404 });
    // Cached at the CDN (TASK-127); a 404 or an error above is not.
    return new Response(sitemapPageXml(origin, "pl", entries), {
      status: 200,
      headers: CACHED_SITEMAP_HEADERS,
    });
  } catch (cause: unknown) {
    log.error("sitemap_page_failed", { page: index, cause });
    return new Response("sitemap unavailable", { status: 500 });
  }
}
