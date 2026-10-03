import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  findPost,
  pairedPost,
  parseBlogFile,
  parseInlines,
  postsIn,
  safeHref,
  sortPosts,
} from "./blog.js";
import type { BlogPost } from "./blog.js";
import { blogPosts } from "./blog-posts.js";
import {
  articleJsonLd,
  BlogIndexView,
  blogIndexMetadata,
  BlogPostView,
  blogPostMetadata,
} from "./blog-page.js";
import { formatDate, htmlLang, UI } from "./messages.js";
import { SiteFooter } from "./site-footer.js";
import { SITE_PREVIEW_IMAGE } from "./site-metadata.js";
import { blogPath, followLinks } from "./site-links.js";

/**
 * TASK-071. Every post below is a TEST FIXTURE, written for these tests and
 * never shipped: no file is added to `src/content/blog/`.
 */

const LANGS = ["pl", "en"] as const;

function file(header: Record<string, string>, body = "Fixture paragraph."): string {
  const lines = Object.entries(header).map(([k, v]) => `${k}: ${v}`);
  return ["---", ...lines, "---", "", body, ""].join("\n");
}

const HEADER = {
  title: "Fixture post",
  description: "A fixture for the tests.",
  date: "2026-10-03",
  slug: "fixture-post",
  lang: "pl",
};

const ok = (body?: string, name = "fixture-post.pl.md", header = HEADER) =>
  parseBlogFile(name, file(header, body));

function post(slug: string, lang: "pl" | "en", date: string, title = slug): BlogPost {
  return {
    title,
    description: `About ${slug}`,
    date,
    slug,
    lang,
    body: [{ kind: "p", inlines: [{ kind: "text", text: "Fixture." }] }],
  };
}

describe("the post format (AC-1)", () => {
  it("parses a well-formed file", () => {
    const p = ok("First line\nsame paragraph.\n\n## Part\n\n### Smaller\n\n- one\n- two");
    expect(p).toMatchObject({
      title: "Fixture post",
      description: "A fixture for the tests.",
      date: "2026-10-03",
      slug: "fixture-post",
      lang: "pl",
    });
    expect(p.body.map((b) => b.kind)).toEqual(["p", "h2", "h3", "ul"]);
    expect(p.body[0]).toEqual({
      kind: "p",
      inlines: [{ kind: "text", text: "First line same paragraph." }],
    });
    expect(p.body[3]).toMatchObject({ kind: "ul", items: [[{ text: "one" }], [{ text: "two" }]] });
  });

  it("accepts quoted values and CRLF line ends", () => {
    const p = parseBlogFile(
      "fixture-post.pl.md",
      file({ ...HEADER, title: '"Quoted: with a colon"' }).replaceAll("\n", "\r\n"),
    );
    expect(p.title).toBe("Quoted: with a colon");
  });

  it("refuses every broken rule, naming the file", () => {
    const { title: _t, ...noTitle } = HEADER;
    const cases: readonly [string, string][] = [
      ["fixture-post.pl.md", file(noTitle)],
      ["fixture-post.pl.md", file({ ...HEADER, author: "x" })],
      ["fixture-post.pl.md", file(HEADER).replace("title:", "title: A\ntitle:")],
      ["fixture-post.pl.md", file({ ...HEADER, title: "" })],
      ["fixture-post.pl.md", file({ ...HEADER, date: "2026-02-30" })],
      ["fixture-post.pl.md", file({ ...HEADER, date: "3 October 2026" })],
      ["fixture-post.pl.md", file({ ...HEADER, slug: "Fixture_Post" })],
      ["fixture-post.de.md", file({ ...HEADER, lang: "de" })],
      ["other-name.pl.md", file(HEADER)],
      ["fixture-post.en.md", file(HEADER)],
      ["Fixture Post.md", file(HEADER)],
      ["fixture-post.pl.md", file(HEADER, "# A top heading")],
      ["fixture-post.pl.md", file(HEADER, "#### Too deep")],
      ["fixture-post.pl.md", file(HEADER, "")],
      ["fixture-post.pl.md", "no header at all"],
      ["fixture-post.pl.md", "---\ntitle: x\n"],
    ];
    for (const [name, source] of cases) {
      expect(() => parseBlogFile(name, source), source).toThrow(`blog post ${name}:`);
    }
  });
});

describe("inline text and links (AC-2)", () => {
  it("parses bold, emphasis, code and links", () => {
    expect(parseInlines("a **b** *c* `d` [e](/f)")).toEqual([
      { kind: "text", text: "a " },
      { kind: "strong", text: "b" },
      { kind: "text", text: " " },
      { kind: "em", text: "c" },
      { kind: "text", text: " " },
      { kind: "code", text: "d" },
      { kind: "text", text: " " },
      { kind: "link", text: "e", href: "/f" },
    ]);
  });

  it("keeps only addresses this site links to", () => {
    for (const href of [
      "/pl/oferta",
      "https://example.org",
      "http://example.org",
      "mailto:a@b.pl",
    ]) {
      expect(safeHref(href)).toBe(href);
    }
    for (const href of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,x",
      "//evil.test",
      "vbscript:x",
    ]) {
      expect(safeHref(href)).toBeNull();
    }
  });

  it("renders HTML in a post as text and an unsafe link without an href", () => {
    const p = ok(
      "<script>alert(1)</script> <b>x</b>\n\n[bad](javascript:alert(1)) [good](https://example.org)",
    );
    const html = renderToStaticMarkup(
      createElement(BlogPostView, { post: p, pair: null, origin: null }),
    );
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("bad");
    expect(html).toContain('<a href="https://example.org">good</a>');
  });
});

describe("ordering, pairs and the directory (AC-3)", () => {
  it("orders newest first, then by slug", () => {
    const sorted = sortPosts([
      post("b", "pl", "2026-10-01"),
      post("c", "pl", "2026-10-02"),
      post("a", "pl", "2026-10-01"),
    ]);
    expect(sorted.map((p) => p.slug)).toEqual(["c", "a", "b"]);
  });

  it("pairs a post with the other language's by slug", () => {
    const posts = [
      post("a", "pl", "2026-10-01"),
      post("a", "en", "2026-10-01"),
      post("b", "pl", "2026-10-01"),
    ];
    expect(pairedPost(posts, posts[0]!)).toBe(posts[1]);
    expect(pairedPost(posts, posts[2]!)).toBeNull();
    expect(findPost(posts, "en", "b")).toBeNull();
    expect(postsIn(posts, "pl").map((p) => p.slug)).toEqual(["a", "b"]);
  });

  it("reads a directory, skipping its README, and treats a missing one as no posts", () => {
    const dir = mkdtempSync(join(tmpdir(), "blog-"));
    try {
      writeFileSync(join(dir, "README.md"), "not a post");
      writeFileSync(
        join(dir, "older.pl.md"),
        file({ ...HEADER, slug: "older", date: "2026-09-01" }),
      );
      writeFileSync(join(dir, "newer.en.md"), file({ ...HEADER, slug: "newer", lang: "en" }));
      expect(blogPosts(dir).map((p) => `${p.slug}.${p.lang}`)).toEqual(["newer.en", "older.pl"]);
      writeFileSync(join(dir, "broken.pl.md"), "---\ntitle: x\n---\n\nbody\n");
      expect(() => blogPosts(dir)).toThrow("blog post broken.pl.md:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expect(blogPosts(join(tmpdir(), "no-such-blog-directory-071"))).toEqual([]);
  });

  it("ships no post: the content folder holds only its README", () => {
    expect(blogPosts()).toEqual([]);
  });
});

describe("the index (AC-4)", () => {
  it("lists only its own language's posts, with dates and links", () => {
    const posts = sortPosts([
      post("a", "pl", "2026-10-01", "Tytuł A"),
      post("b", "en", "2026-10-02", "Title B"),
    ]);
    const pl = renderToStaticMarkup(createElement(BlogIndexView, { lang: "pl", posts }));
    expect(pl).toContain(`<main lang="${htmlLang("pl")}"`);
    expect(pl).toContain('<a href="/pl/blog/a">Tytuł A</a>');
    expect(pl).toContain(`<time dateTime="2026-10-01">${formatDate("2026-10-01", "pl")}</time>`);
    expect(pl).toContain("About a");
    expect(pl).not.toContain("Title B");
    expect(pl).toContain('href="/en/blog" hrefLang="en"');
  });

  it("says there are no posts yet in each language", () => {
    for (const lang of LANGS) {
      const html = renderToStaticMarkup(createElement(BlogIndexView, { lang, posts: [] }));
      expect(html).toContain(UI[lang].blogEmpty);
      expect(html).not.toContain("blog-list");
    }
  });
});

describe("a post's page (AC-5)", () => {
  it("renders title, date, body and the way back, with no header place marked", () => {
    const p = ok("Hello **world**.\n\n## Part");
    const html = renderToStaticMarkup(
      createElement(BlogPostView, { post: p, pair: null, origin: null }),
    );
    expect(html).toContain('<h1 class="page-title">Fixture post</h1>');
    expect(html).toContain("Hello <strong>world</strong>.");
    expect(html).toContain("<h2>Part</h2>");
    expect(html).toContain(`<a href="/pl/blog">${UI.pl.blogBack}</a>`);
    expect(html).not.toContain('aria-current="page"');
  });

  it("switches language to the paired post, or to the other index", () => {
    const pl = post("a", "pl", "2026-10-01");
    const en = post("a", "en", "2026-10-01");
    const paired = renderToStaticMarkup(
      createElement(BlogPostView, { post: pl, pair: en, origin: null }),
    );
    expect(paired).toContain('href="/en/blog/a" hrefLang="en"');
    const alone = renderToStaticMarkup(
      createElement(BlogPostView, { post: pl, pair: null, origin: null }),
    );
    expect(alone).toContain('href="/en/blog" hrefLang="en"');
  });
});

describe("metadata (AC-6)", () => {
  it("gives the index its canonical address and says index only with the flag on", () => {
    for (const lang of LANGS) {
      expect(blogIndexMetadata(lang, false).alternates?.canonical).toBe(blogPath(lang));
      expect(blogIndexMetadata(lang, false).robots).toEqual({ index: false, follow: true });
      expect(blogIndexMetadata(lang, true).robots).toEqual({ index: true, follow: true });
    }
  });

  it("lists only the languages a post exists in, and describes it as an article", () => {
    const pl = post("a", "pl", "2026-10-01");
    const en = post("a", "en", "2026-10-01");
    const alone = blogPostMetadata(pl, null, false);
    expect(alone.alternates).toEqual({ canonical: "/pl/blog/a", languages: { pl: "/pl/blog/a" } });
    expect(alone.robots).toEqual({ index: false, follow: true });
    expect(blogPostMetadata(pl, en, true).alternates?.languages).toEqual({
      pl: "/pl/blog/a",
      en: "/en/blog/a",
    });
    expect(blogPostMetadata(pl, en, true).robots).toEqual({ index: true, follow: true });
    expect(alone.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-10-01",
      url: "/pl/blog/a",
      images: [SITE_PREVIEW_IMAGE],
    });
  });
});

describe("structured data (AC-7)", () => {
  it("is JSON with the post's facts and no author", () => {
    const data = JSON.parse(
      articleJsonLd(post("a", "en", "2026-10-01", "Title"), "https://x.test"),
    ) as Record<string, unknown>;
    expect(data).toMatchObject({
      "@type": "Article",
      headline: "Title",
      datePublished: "2026-10-01",
      inLanguage: "en",
      mainEntityOfPage: "https://x.test/en/blog/a",
    });
    expect(data).not.toHaveProperty("author");
    expect(JSON.parse(articleJsonLd(post("a", "en", "2026-10-01"), null))).not.toHaveProperty(
      "mainEntityOfPage",
    );
  });

  it("cannot be closed by a title", () => {
    const hostile = post("a", "pl", "2026-10-01", "</script><script>alert(1)</script>");
    const json = articleJsonLd(hostile, null);
    expect(json).not.toContain("<");
    expect((JSON.parse(json) as { headline: string }).headline).toBe(hostile.title);
    const html = renderToStaticMarkup(
      createElement(BlogPostView, { post: hostile, pair: null, origin: null }),
    );
    expect(html.match(/<script/gu)?.length).toBe(1);
  });
});

describe("the footer (AC-8)", () => {
  it("leads Blog to the blog in the reader's language and leaves the socials as they were", () => {
    for (const lang of LANGS) {
      expect(followLinks(lang)[0]).toEqual({ label: "Blog", href: blogPath(lang) });
      const footer = renderToStaticMarkup(createElement(SiteFooter, { lang }));
      expect(footer).toContain(`<a href="${blogPath(lang)}">Blog</a>`);
    }
    expect(blogPath("pl")).toBe("/pl/blog");
    expect(blogPath("en")).toBe("/en/blog");
    expect(
      followLinks("pl")
        .slice(1)
        .map((l) => l.href),
    ).toEqual(["/", "/", "/"]);
    expect(
      followLinks("en")
        .slice(1)
        .map((l) => l.href),
    ).toEqual(["/?lang=en", "/?lang=en", "/?lang=en"]);
  });
});
