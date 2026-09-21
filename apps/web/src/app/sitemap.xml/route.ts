import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { sitemapCount } from "@name-atlas/seo";
import { createLogger } from "@name-atlas/logging";
import { indexingEnabled } from "../../lib/seo.js";
import { pageCount, sitemapIndexXml } from "../../lib/sitemap-xml.js";
import { siteOrigin } from "../../lib/surname-page.js";

/**
 * `/sitemap.xml` — the sitemap index (TASK-027, ADR-0010 §3).
 *
 * Empty while `SEO_INDEXING_ENABLED` is unset, and empty today even when it is
 * set, because `docs/canonical/21` §42 wants two substantive value families and
 * only `CURRENT_STATS` can be produced from the data in this repository. An
 * empty sitemap index is valid XML and an honest statement: nothing here has
 * been cleared for indexing.
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
  let db: ReturnType<typeof createDb> | null = null;
  try {
    db = createDb(createPool(loadDbConfig()));
    const total = await sitemapCount(db, "pl");
    return new Response(sitemapIndexXml(origin, pageCount(total)), { status: 200, headers: XML });
  } catch (cause: unknown) {
    log.error("sitemap_index_failed", { cause });
    // A 500 is right: an empty sitemap would tell a crawler we publish nothing.
    return new Response("sitemap unavailable", { status: 500 });
  } finally {
    await db?.destroy();
  }
}
