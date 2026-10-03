import type { Metadata } from "next";
import { blogPosts } from "../../../lib/blog-posts.js";
import { BlogIndexView, blogIndexMetadata } from "../../../lib/blog-page.js";

/** `/en/blog` — the blog's index (TASK-071). Dynamic so `SEO_INDEXING_ENABLED` is read per request. */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return blogIndexMetadata("en");
}

export default function Page() {
  return <BlogIndexView lang="en" posts={blogPosts()} />;
}
