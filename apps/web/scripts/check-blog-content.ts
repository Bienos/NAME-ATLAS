/**
 * Checks the blog's posts before `next build` (TASK-075):
 *
 *   tsx scripts/check-blog-content.ts      (run by `pnpm build` in apps/web)
 *
 * The blog's routes are rendered per request, so `next build` never parses a
 * post. This parses every one, with each feature image required to exist in
 * `public/`, and exits non-zero on the first broken post, naming its file.
 */
import { blogDirectory, blogPosts, publicDirectory } from "../src/lib/blog-posts.js";

try {
  const posts = blogPosts(blogDirectory(), { publicDir: publicDirectory() });
  const images = posts.filter((post) => post.image !== null).length;
  console.log(
    `blog: ${String(posts.length)} posts checked, ${String(images)} with a feature image`,
  );
} catch (cause: unknown) {
  console.error(cause instanceof Error ? cause.message : cause);
  process.exit(1);
}
