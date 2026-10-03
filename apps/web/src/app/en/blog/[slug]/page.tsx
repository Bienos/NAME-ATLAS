import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPost, pairedPost } from "../../../../lib/blog.js";
import { blogPosts } from "../../../../lib/blog-posts.js";
import { BlogPostView, blogPostMetadata } from "../../../../lib/blog-page.js";
import { siteOrigin } from "../../../../lib/surname-page.js";

/**
 * `/en/blog/{slug}` — one post (TASK-071). A slug with no post in this
 * language is a 404, including one written only in the other language.
 */

export const dynamic = "force-dynamic";

interface Props {
  readonly params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const posts = blogPosts();
  const post = findPost(posts, "en", (await params).slug);
  return post === null ? {} : blogPostMetadata(post, pairedPost(posts, post));
}

export default async function Page({ params }: Props) {
  const posts = blogPosts();
  const post = findPost(posts, "en", (await params).slug);
  if (post === null) notFound();
  return (
    <BlogPostView post={post} pair={pairedPost(posts, post)} origin={siteOrigin()} posts={posts} />
  );
}
