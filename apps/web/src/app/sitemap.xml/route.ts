import { db as sharedDb } from "../../lib/db.js";
import { sitemapCount } from "@name-atlas/seo";
import { createLogger } from "@name-atlas/logging";
import { indexingEnabled, siteOrigin } from "../../lib/seo.js";
import { seoBlockedProfileIds } from "../../lib/seo-surface.js";
import {
  BLOG_SITEMAP_PATH,
  CACHED_SITEMAP_HEADERS,
  pageCount,
  sitemapIndexXml,
} from "../../lib/sitemap-xml.js";
import { blogPosts } from "../../lib/blog-posts.js";

/**
 * `/sitemap.xml` — the sitemap index (TASK-027, ADR-0010 §3).
 *
 * Empty while `SEO_INDEXING_ENABLED` is unset: an empty sitemap index is valid
 * XML and an honest statement that nothing has been cleared for indexing. With
 * the flag on, it names one page per 50,000 surnames that `@name-atlas/seo`'s
 * query lists (only pages that serve `index`, TASK-126) and the blog's sitemap.
 */

export const dynamic = "force-dynamic";

const XML = { "content-type": "application/xml; charset=utf-8" } as const;

export async function GET(): Promise<Response> {
  const origin = siteOrigin();
  // A sitemap must carry absolute URLs, and a `Host` header is not a safe basis
  // for one that a crawler will treat as canonical.
  if (origin === null) return new Response(sitemapIndexXml("", 0), { status: 200, headers: XML });
  if (!indexingEnabled()) {
    return new Response(sitemapIndexXml(origin, 0), { status: 200, headers: XML });
  }

  const log = createLogger({ service: "web", base: { route: "/sitemap.xml" } });
  try {
    const db = sharedDb();
    const total = await sitemapCount(db, "pl", {
      seoBlockedProfileIds: await seoBlockedProfileIds(db),
    });
    // The blog's sitemap (TASK-071), only when it has a post to list.
    const extra = blogPosts().length > 0 ? [BLOG_SITEMAP_PATH] : [];
    // Cached at the CDN (TASK-127): only this response reads the database.
    return new Response(sitemapIndexXml(origin, pageCount(total), extra), {
      status: 200,
      headers: CACHED_SITEMAP_HEADERS,
    });
  } catch (cause: unknown) {
    log.error("sitemap_index_failed", { cause });
    // A 500 is right: an empty sitemap would tell a crawler we publish nothing.
    return new Response("sitemap unavailable", { status: 500 });
  }
}
