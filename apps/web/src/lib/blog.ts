import type { Lang } from "./messages.js";

/**
 * The blog's posts (TASK-071): one Markdown file per post and language, parsed
 * here with no dependency. Pure, so the format's rules are testable without a
 * file system; `blog-posts.ts` reads the directory.
 *
 * A post that breaks a rule **throws, naming its file**, so the build fails and
 * the post is never published or half-shown.
 */

export type Inline =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "strong"; readonly text: string }
  | { readonly kind: "em"; readonly text: string }
  | { readonly kind: "code"; readonly text: string }
  /** `href` is `null` when the address was not one this site links to. */
  | { readonly kind: "link"; readonly text: string; readonly href: string | null };

export type Block =
  | { readonly kind: "h2" | "h3" | "p"; readonly inlines: readonly Inline[] }
  | { readonly kind: "ul"; readonly items: readonly (readonly Inline[])[] };

export interface BlogPost {
  readonly title: string;
  readonly description: string;
  /** ISO `YYYY-MM-DD`, the day the owner dates the post. */
  readonly date: string;
  readonly slug: string;
  readonly lang: Lang;
  readonly body: readonly Block[];
}

const KEYS = ["title", "description", "date", "slug", "lang"] as const;
type Key = (typeof KEYS)[number];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const FILE_NAME = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(pl|en)\.md$/u;

/** Whether `value` is a real calendar day written `YYYY-MM-DD`. */
function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const [, y, m, d] = match as unknown as [string, string, string, string];
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(m) - 1 &&
    date.getUTCDate() === Number(d)
  );
}

/**
 * An address a post's link may keep: a path of this site, or `https:`, `http:`
 * or `mailto:`. Anything else (`javascript:`, `data:`, `//host`) is not linked.
 */
export function safeHref(href: string): string | null {
  if (href.startsWith("//")) return null;
  if (href.startsWith("/")) return href;
  return /^(?:https?:\/\/|mailto:)/iu.test(href) ? href : null;
}

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/gu;

/** Text with `**bold**`, `*emphasis*`, `` `code` `` and `[text](address)`; no nesting. */
export function parseInlines(text: string): readonly Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const at = match.index;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    if (match[1] !== undefined && match[2] !== undefined) {
      out.push({ kind: "link", text: match[1], href: safeHref(match[2]) });
    } else if (match[3] !== undefined) {
      out.push({ kind: "strong", text: match[3] });
    } else if (match[4] !== undefined) {
      out.push({ kind: "em", text: match[4] });
    } else if (match[5] !== undefined) {
      out.push({ kind: "code", text: match[5] });
    }
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** The body: `##` and `###` headings, paragraphs and `-` lists, split by blank lines. */
export function parseBody(body: string, fileName: string): readonly Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flush = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "p", inlines: parseInlines(paragraph.join(" ")) });
      paragraph = [];
    }
    if (list.length > 0) {
      blocks.push({ kind: "ul", items: list.map((item) => parseInlines(item)) });
      list = [];
    }
  };
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line === "") {
      flush();
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/u.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      if (level !== 2 && level !== 3) {
        throw new Error(
          `blog post ${fileName}: a heading must be ## or ###, because the title is the page's one h1`,
        );
      }
      flush();
      blocks.push({ kind: level === 2 ? "h2" : "h3", inlines: parseInlines(heading[2]!) });
      continue;
    }
    const item = /^-\s+(.+)$/u.exec(line);
    if (item) {
      if (paragraph.length > 0) flush();
      list.push(item[1]!);
      continue;
    }
    if (list.length > 0) flush();
    paragraph.push(line);
  }
  flush();
  return blocks;
}

/** Splits `---` header from body, then checks every rule of the format. */
export function parseBlogFile(fileName: string, source: string): BlogPost {
  const fail = (reason: string): never => {
    throw new Error(`blog post ${fileName}: ${reason}`);
  };
  const named = FILE_NAME.exec(fileName);
  if (!named) {
    return fail(
      "the file must be named <slug>.pl.md or <slug>.en.md, in lowercase letters, digits and hyphens",
    );
  }
  const text = source.replace(/\r\n?/gu, "\n");
  if (!text.startsWith("---\n")) return fail("it must open with a --- header");
  const end = text.indexOf("\n---\n", 3);
  const closes = end !== -1 ? end : text.endsWith("\n---") ? text.length - 4 : -1;
  if (closes === -1) return fail("the --- header is never closed");
  const header = text.slice(4, closes);
  const body = text.slice(closes + (end !== -1 ? 5 : 4));

  const values = new Map<string, string>();
  for (const line of header.split("\n")) {
    if (line.trim() === "") continue;
    const pair = /^([a-z]+):\s*(.*)$/u.exec(line);
    if (!pair) return fail(`the header line "${line}" is not "key: value"`);
    const key = pair[1]!;
    if (!(KEYS as readonly string[]).includes(key))
      return fail(`the header key "${key}" is not allowed`);
    if (values.has(key)) return fail(`the header key "${key}" is given twice`);
    let value = pair[2]!.trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).trim();
    }
    if (value === "") return fail(`the header key "${key}" is empty`);
    values.set(key, value);
  }
  const get = (key: Key): string => values.get(key) ?? fail(`the header key "${key}" is missing`);

  const slug = get("slug");
  const lang = get("lang");
  const date = get("date");
  if (!SLUG.test(slug))
    return fail(`the slug "${slug}" must be lowercase letters, digits and single hyphens`);
  if (lang !== "pl" && lang !== "en") return fail(`the lang "${lang}" must be pl or en`);
  if (!isIsoDate(date)) return fail(`the date "${date}" must be a real day written YYYY-MM-DD`);
  if (slug !== named[1] || lang !== named[2]) {
    return fail(`its slug and lang (${slug}, ${lang}) must match its file name`);
  }
  const blocks = parseBody(body, fileName);
  if (blocks.length === 0) return fail("it has no body");
  return {
    title: get("title"),
    description: get("description"),
    date,
    slug,
    lang,
    body: blocks,
  };
}

/** Newest first; posts of one day by slug, then language, so the order never varies. */
export function sortPosts(posts: readonly BlogPost[]): readonly BlogPost[] {
  return [...posts].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug) || a.lang.localeCompare(b.lang),
  );
}

export function postsIn(posts: readonly BlogPost[], lang: Lang): readonly BlogPost[] {
  return posts.filter((post) => post.lang === lang);
}

export function findPost(posts: readonly BlogPost[], lang: Lang, slug: string): BlogPost | null {
  return posts.find((post) => post.lang === lang && post.slug === slug) ?? null;
}

/** The same post in the other language, when it exists. */
export function pairedPost(posts: readonly BlogPost[], post: BlogPost): BlogPost | null {
  return findPost(posts, post.lang === "pl" ? "en" : "pl", post.slug);
}
