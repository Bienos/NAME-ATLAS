import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBlogFile, sortPosts } from "./blog.js";
import type { BlogPost } from "./blog.js";

/**
 * The blog's posts, read from `src/content/blog/` (TASK-071), relative to the
 * app's directory like the share card's fonts (`og-card.tsx`), so `next.config.ts`
 * lists the folder for the routes that read it.
 *
 * Every `.md` file there except `README.md` is a post, and one that breaks a
 * rule throws (see `blog.ts`). A directory that does not exist is no posts.
 */
export function blogDirectory(): string {
  return join(process.cwd(), "src", "content", "blog");
}

/** The app's `public/` folder, where feature images live (TASK-075). */
export function publicDirectory(): string {
  return join(process.cwd(), "public");
}

export interface BlogPostsOptions {
  /**
   * When set, each post's feature image must exist under this folder, or the
   * post throws (TASK-075). The build's check (`scripts/check-blog-content.ts`)
   * and the tests pass it. Pages do not: on Vercel `public/` is served by the
   * platform and is not in the function's files, so a page cannot look.
   */
  readonly publicDir?: string;
}

export function blogPosts(
  directory: string = blogDirectory(),
  options: BlogPostsOptions = {},
): readonly BlogPost[] {
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch (cause: unknown) {
    if ((cause as { code?: string }).code === "ENOENT") return [];
    throw cause;
  }
  const posts = names
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .sort()
    .map((name) => {
      const post = parseBlogFile(name, readFileSync(join(directory, name), "utf8"));
      const { publicDir } = options;
      if (publicDir !== undefined && post.image !== null) {
        if (!existsSync(join(publicDir, post.image.src))) {
          throw new Error(`blog post ${name}: the image ${post.image.src} is not in public/`);
        }
      }
      return post;
    });
  return sortPosts(posts);
}
