import { readdirSync, readFileSync } from "node:fs";
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

export function blogPosts(directory: string = blogDirectory()): readonly BlogPost[] {
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch (cause: unknown) {
    if ((cause as { code?: string }).code === "ENOENT") return [];
    throw cause;
  }
  return sortPosts(
    names
      .filter((name) => name.endsWith(".md") && name !== "README.md")
      .sort()
      .map((name) => parseBlogFile(name, readFileSync(join(directory, name), "utf8"))),
  );
}
