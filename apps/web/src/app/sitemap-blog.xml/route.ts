import { blogPosts } from "../../lib/blog-posts.js";
import { indexingEnabled } from "../../lib/seo.js";
import { blogSitemapXml } from "../../lib/sitemap-xml.js";
import { siteOrigin } from "../../lib/surname-page.js";

/**
 * `/sitemap-blog.xml` — the blog's posts (TASK-071). A 404 unless indexing is
 * enabled, `SITE_ORIGIN` is set and there is a post, as `/sitemap/{n}.xml` is
 * for a page that has nothing to list. `/sitemap.xml` names it on the same terms.
 */

export const dynamic = "force-dynamic";

export function GET(): Response {
  const origin = siteOrigin();
  const posts = blogPosts();
  if (origin === null || !indexingEnabled() || posts.length === 0) {
    return new Response("not found", { status: 404 });
  }
  return new Response(blogSitemapXml(origin, posts), {
    status: 200,
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
