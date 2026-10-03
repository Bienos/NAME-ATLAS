import type { Metadata } from "next";
import { blogPosts } from "../../../lib/blog-posts.js";
import { BlogIndexView, blogIndexMetadata } from "../../../lib/blog-page.js";

/** `/pl/blog` — the blog's index (TASK-071). Dynamic so `SEO_INDEXING_ENABLED` is read per request. */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return blogIndexMetadata("pl");
}

export default function Page() {
  return <BlogIndexView lang="pl" posts={blogPosts()} />;
}
