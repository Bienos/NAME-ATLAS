import { blogPosts } from "../../lib/blog-posts.js";
import { llmsTxt } from "../../lib/llms-txt.js";
import { indexingEnabled, siteOrigin } from "../../lib/seo.js";

/**
 * `/llms.txt` (TASK-175, ADR-0050). A 404 unless indexing is enabled and
 * `SITE_ORIGIN` is set, as `/sitemap-blog.xml` is: a map for models of a site
 * closed to search engines would contradict `robots.txt`, and a relative link
 * would point somewhere different on every host.
 */

export const dynamic = "force-dynamic";

export function GET(): Response {
  const origin = siteOrigin();
  if (origin === null || !indexingEnabled()) {
    return new Response("not found", { status: 404 });
  }
  return new Response(llmsTxt(origin, blogPosts()), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
