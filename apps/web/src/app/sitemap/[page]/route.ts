import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { SITEMAP_PAGE_SIZE, sitemapEntries } from "@name-atlas/seo";
import { createLogger } from "@name-atlas/logging";
import { indexingEnabled } from "../../../lib/seo.js";
import { sitemapPageXml } from "../../../lib/sitemap-xml.js";
import { siteOrigin } from "../../../lib/surname-page.js";

/**
 * `/sitemap/{n}.xml` — one page of at most 50,000 URLs (TASK-027, ADR-0010 §3).
 *
 * The page number is 1-based, matching what the index emits. Anything else is a
 * 404 rather than an empty sitemap: a crawler asking for page 9,000 should be
 * told it does not exist, not handed a valid document saying there is nothing
 * there.
 */

export const dynamic = "force-dynamic";

const XML = { "content-type": "application/xml; charset=utf-8" } as const;

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
  let db: ReturnType<typeof createDb> | null = null;
  try {
    db = createDb(createPool(loadDbConfig()));
    const entries = await sitemapEntries(db, "pl", {
      limit: SITEMAP_PAGE_SIZE,
      offset: (index - 1) * SITEMAP_PAGE_SIZE,
    });
    if (entries.length === 0) return new Response("not found", { status: 404 });
    return new Response(sitemapPageXml(origin, "pl", entries), { status: 200, headers: XML });
  } catch (cause: unknown) {
    log.error("sitemap_page_failed", { page: index, cause });
    return new Response("sitemap unavailable", { status: 500 });
  } finally {
    await db?.destroy();
  }
}
