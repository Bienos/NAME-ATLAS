import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
import { blogPosts, publicDirectory } from "./blog-posts.js";
import {
  articleJsonLd,
  BlogIndexView,
  blogIndexMetadata,
  BlogPostView,
  blogPostMetadata,
  keepSuffixes,
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
    image: null,
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
      { kind: "link", text: "e", href: "/f", inlines: [{ kind: "text", text: "e" }] },
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

  it("parses every shipped post, and no shipped link is one the renderer would drop", () => {
    // With the images required to exist in public/, as the build's check does (TASK-075).
    const posts = blogPosts(undefined, { publicDir: publicDirectory() });
    expect(posts.length).toBeGreaterThan(0);
    const links = posts.flatMap((p) =>
      p.body.flatMap((b) => (b.kind === "ul" ? b.items.flat() : b.inlines)),
    );
    expect(links.filter((n) => n.kind === "link" && n.href === null)).toEqual([]);
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
    expect(pl).toContain('<a class="blog-card-link" href="/pl/blog/a">Tytuł A</a>');
    expect(pl).toContain(`<time dateTime="2026-10-01">${formatDate("2026-10-01", "pl")}</time>`);
    expect(pl).toContain("About a");
    expect(pl).not.toContain("Title B");
    expect(pl).toContain('href="/en/blog" hrefLang="en"');
  });

  it("says there are no posts yet in each language", () => {
    for (const lang of LANGS) {
      const html = renderToStaticMarkup(createElement(BlogIndexView, { lang, posts: [] }));
      expect(html).toContain(UI[lang].blogEmpty);
      expect(html).not.toContain("blog-cards");
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
  it("leads Blog to the blog in the reader's language and the socials to the owner's accounts", () => {
    for (const lang of LANGS) {
      expect(followLinks(lang)[0]).toEqual({ label: "Blog", href: blogPath(lang) });
      const footer = renderToStaticMarkup(createElement(SiteFooter, { lang }));
      expect(footer).toContain(`<a href="${blogPath(lang)}">Blog</a>`);
    }
    expect(blogPath("pl")).toBe("/pl/blog");
    expect(blogPath("en")).toBe("/en/blog");
    // The socials lead to the owner's accounts, the same in both languages (TASK-168).
    const socials = [
      "https://www.instagram.com/nameatlas_/",
      "https://www.tiktok.com/@nameatlas_",
      "https://www.facebook.com/profile.php?id=61595400800918",
    ];
    expect(
      followLinks("pl")
        .slice(1)
        .map((l) => l.href),
    ).toEqual(socials);
    expect(
      followLinks("en")
        .slice(1)
        .map((l) => l.href),
    ).toEqual(socials);
  });
});

describe("suffixes stay on one line (TASK-072)", () => {
  const html = (node: ReturnType<typeof keepSuffixes>) =>
    renderToStaticMarkup(createElement("p", null, node));

  it("wraps a suffix written on its own, and leaves a hyphen inside a word", () => {
    expect(html(keepSuffixes("co znaczą -ski, -czyk i -uk"))).toBe(
      '<p>co znaczą <span class="nobreak">-ski</span>, <span class="nobreak">-czyk</span> i <span class="nobreak">-uk</span></p>',
    );
    expect(keepSuffixes("Kowalska-Nowak, 1545-1563")).toBe("Kowalska-Nowak, 1545-1563");
    expect(html(keepSuffixes("-owa i -ówna"))).toContain('<span class="nobreak">-ówna</span>');
  });

  it("applies to a post's title, headings, text and the index", () => {
    const p = ok("## -ak i -czyk\n\nNazwiska na **-ski** i [-wicz](/pl).", "fixture-post.pl.md", {
      ...HEADER,
      title: "Fixture -czyk",
    });
    const page = renderToStaticMarkup(
      createElement(BlogPostView, { post: p, pair: null, origin: null }),
    );
    expect(page).toContain(
      '<h1 class="page-title">Fixture <span class="nobreak">-czyk</span></h1>',
    );
    expect(page).toContain(
      '<h2><span class="nobreak">-ak</span> i <span class="nobreak">-czyk</span></h2>',
    );
    expect(page).toContain('<strong><span class="nobreak">-ski</span></strong>');
    expect(page).toContain('<a href="/pl"><span class="nobreak">-wicz</span></a>');
    const index = renderToStaticMarkup(createElement(BlogIndexView, { lang: "pl", posts: [p] }));
    expect(index).toContain('Fixture <span class="nobreak">-czyk</span></a>');
    expect(index).toContain('class="blog-card-link"');
  });
});

describe("feature images (TASK-075)", () => {
  const IMG = { image: "/images/blog/fixture-post.webp", imageAlt: "A fixture picture." };
  const withImage = () => ok(undefined, "fixture-post.pl.md", { ...HEADER, ...IMG });

  it("parse to src and alt, and to null without them (AC-1)", () => {
    expect(withImage().image).toEqual({ src: IMG.image, alt: IMG.imageAlt });
    expect(ok().image).toBeNull();
  });

  it("refuse a missing alt, a stray alt and a bad path, naming the file (AC-1)", () => {
    const bad: readonly Record<string, string>[] = [
      { image: IMG.image },
      { imageAlt: IMG.imageAlt },
      { ...IMG, image: "/images/other/fixture-post.webp" },
      { ...IMG, image: "/images/blog/../secret.webp" },
      { ...IMG, image: "https://example.org/images/blog/x.webp" },
      { ...IMG, image: "/images/blog/nested/x.webp" },
      { ...IMG, image: "/images/blog/x.gif" },
      { ...IMG, image: "images/blog/x.webp" },
    ];
    for (const extra of bad) {
      expect(
        () => parseBlogFile("fixture-post.pl.md", file({ ...HEADER, ...extra })),
        JSON.stringify(extra),
      ).toThrow("blog post fixture-post.pl.md:");
    }
  });

  it("must exist in public/ when the caller asks, as the build's check does (AC-2)", () => {
    const content = mkdtempSync(join(tmpdir(), "blog-content-"));
    const pub = mkdtempSync(join(tmpdir(), "blog-public-"));
    try {
      writeFileSync(join(content, "fixture-post.pl.md"), file({ ...HEADER, ...IMG }));
      expect(() => blogPosts(content, { publicDir: pub })).toThrow(
        "blog post fixture-post.pl.md: the image /images/blog/fixture-post.webp is not in public/",
      );
      expect(blogPosts(content)).toHaveLength(1);
      mkdirSync(join(pub, "images", "blog"), { recursive: true });
      writeFileSync(join(pub, "images", "blog", "fixture-post.webp"), "");
      expect(blogPosts(content, { publicDir: pub })[0]?.image?.src).toBe(IMG.image);
    } finally {
      rmSync(content, { recursive: true, force: true });
      rmSync(pub, { recursive: true, force: true });
    }
  });

  it("render with their alt in the post's hero and the index card (AC-3)", () => {
    const p = withImage();
    const page = renderToStaticMarkup(
      createElement(BlogPostView, { post: p, pair: null, origin: null }),
    );
    expect(page).toContain('<figure class="blog-hero">');
    expect(page).toContain(`alt="${IMG.imageAlt}"`);
    expect(page).toContain("%2Fimages%2Fblog%2Ffixture-post.webp");
    const index = renderToStaticMarkup(createElement(BlogIndexView, { lang: "pl", posts: [p] }));
    expect(index).toContain('<figure class="blog-card-image">');
    expect(index).toContain(`alt="${IMG.imageAlt}"`);
  });

  it("fall back to a drawn card and no hero when a post has none (AC-3)", () => {
    const p = ok();
    const index = renderToStaticMarkup(createElement(BlogIndexView, { lang: "pl", posts: [p] }));
    expect(index).toContain('class="blog-card-image blog-image-fallback" aria-hidden="true"');
    expect(index).not.toContain("<img");
    const page = renderToStaticMarkup(
      createElement(BlogPostView, { post: p, pair: null, origin: null }),
    );
    expect(page).not.toContain("blog-hero");
    expect(page).not.toContain("<img");
  });

  it("are the post's og:image and JSON-LD image, with the site cover as the fallback (AC-4)", () => {
    const p = withImage();
    expect(blogPostMetadata(p, null, false).openGraph?.images).toEqual([
      { url: IMG.image, alt: IMG.imageAlt },
    ]);
    expect(blogPostMetadata(ok(), null, false).openGraph?.images).toEqual([SITE_PREVIEW_IMAGE]);
    const ld = (post: BlogPost, origin: string | null) =>
      (JSON.parse(articleJsonLd(post, origin)) as { image: string }).image;
    expect(ld(p, "https://x.test")).toBe(`https://x.test${IMG.image}`);
    expect(ld(ok(), "https://x.test")).toBe(`https://x.test${SITE_PREVIEW_IMAGE.url}`);
    expect(ld(p, null)).toBe(IMG.image);
  });
});

describe("the post page's layout (TASK-075)", () => {
  const body = (faq: string, sources: string) =>
    `Intro.\n\n## Part\n\nText.\n\n## ${faq}\n\n### A question?\n\nAn answer.\n\n## ${sources}\n\n- [A source](https://example.org)`;

  it("sets the FAQ and the sources apart, in both languages (AC-5)", () => {
    const pl = ok(body("Najczęstsze pytania", "Źródła"));
    const en = parseBlogFile(
      "fixture-post.en.md",
      file({ ...HEADER, lang: "en" }, body("Frequently asked questions", "Sources")),
    );
    for (const p of [pl, en]) {
      const html = renderToStaticMarkup(
        createElement(BlogPostView, { post: p, pair: null, origin: null }),
      );
      expect(html.match(/<section class="blog-section">/gu)?.length).toBe(2);
      expect(html).toContain('<section class="blog-section blog-faq">');
      expect(html).toContain('<section class="blog-section blog-sources">');
    }
  });

  it("lists the other posts in the same language under the post (AC-5)", () => {
    const posts = sortPosts([
      post("a", "pl", "2026-10-03"),
      post("b", "pl", "2026-10-02"),
      post("c", "en", "2026-10-01"),
    ]);
    const html = renderToStaticMarkup(
      createElement(BlogPostView, { post: posts[0]!, pair: null, origin: null, posts }),
    );
    const more = html.slice(html.indexOf('class="blog-more"'));
    expect(more).toContain(UI.pl.blogMore);
    expect(more).toContain('href="/pl/blog/b"');
    expect(more).not.toContain('href="/pl/blog/a"');
    expect(more).not.toContain("/en/blog/c");
    const alone = renderToStaticMarkup(
      createElement(BlogPostView, { post: posts[2]!, pair: null, origin: null, posts }),
    );
    expect(alone).not.toContain("blog-more");
  });

  it("carries one call to action, with the site's one search form, on each page (AC-5)", () => {
    for (const lang of LANGS) {
      const p = parseBlogFile(`fixture-post.${lang}.md`, file({ ...HEADER, lang }));
      for (const html of [
        renderToStaticMarkup(
          createElement(BlogPostView, { post: p, pair: null, origin: null, posts: [p] }),
        ),
        renderToStaticMarkup(createElement(BlogIndexView, { lang, posts: [p] })),
      ]) {
        expect(html.match(/class="blog-cta"/gu)?.length).toBe(1);
        expect(html.match(/id="surname"/gu)?.length).toBe(1);
        expect(html).toContain(UI[lang].blogCtaTitle);
        expect(html).toContain(UI[lang].blogCtaBody);
      }
    }
  });
});

describe("emphasis inside a link's text (TASK-075)", () => {
  it("renders as emphasis, not as asterisks", () => {
    const p = ok(
      "- Zgusta, [*Names* 46(4)](https://example.org), 1998.\n\n[**bold** link](javascript:x)",
    );
    const html = renderToStaticMarkup(
      createElement(BlogPostView, { post: p, pair: null, origin: null }),
    );
    expect(html).toContain('<a href="https://example.org"><em>Names</em> 46(4)</a>');
    expect(html).not.toContain("*Names*");
    expect(html).toContain("<strong>bold</strong> link");
    expect(html).not.toContain("javascript:");
  });
});
