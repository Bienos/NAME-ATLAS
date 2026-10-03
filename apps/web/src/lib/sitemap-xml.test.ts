import { describe, expect, it } from "vitest";
import type { BlogPost } from "./blog.js";
import {
  BLOG_SITEMAP_PATH,
  blogSitemapXml,
  escapeXml,
  pageCount,
  SITEMAP_PAGE_SIZE,
  sitemapIndexXml,
  sitemapPageXml,
} from "./sitemap-xml.js";

const ORIGIN = "https://example.test";

const entry = (slug: string) => ({
  surname_id: `id-${slug}`,
  slug,
  display_name: slug.toUpperCase(),
  last_modified: "2026-09-21T10:00:00Z",
});

describe("escapeXml", () => {
  it("escapes all five predefined entities", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  it("escapes the ampersand a real surname can contain", () => {
    // Escaping `&` after `<` would double-escape; asserting the order matters.
    expect(escapeXml("a&b<c")).toBe("a&amp;b&lt;c");
    expect(escapeXml("&amp;")).toBe("&amp;amp;");
  });
});

describe("pageCount", () => {
  it("needs no pages for no URLs", () => {
    // An alpha with nothing cleared for indexing. A single empty page would
    // claim we publish something.
    expect(pageCount(0)).toBe(0);
  });

  it("splits at the protocol's 50,000 limit", () => {
    expect(SITEMAP_PAGE_SIZE).toBe(50_000);
    expect(pageCount(1)).toBe(1);
    expect(pageCount(50_000)).toBe(1);
    expect(pageCount(50_001)).toBe(2);
    // The register's size, which is why an index exists at all.
    expect(pageCount(598_476)).toBe(12);
  });
});

describe("sitemapIndexXml", () => {
  it("is valid and empty when there is nothing to publish", () => {
    const xml = sitemapIndexXml(ORIGIN, 0);
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("</sitemapindex>");
    expect(xml).not.toContain("<sitemap>");
  });

  it("names one-based pages, matching what the page route accepts", () => {
    const xml = sitemapIndexXml(ORIGIN, 2);
    expect(xml).toContain(`<loc>${ORIGIN}/sitemap/1.xml</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/sitemap/2.xml</loc>`);
    expect(xml).not.toContain("/sitemap/0.xml");
  });
});

describe("sitemapPageXml", () => {
  it("emits an absolute, percent-encoded URL per entry", () => {
    const xml = sitemapPageXml(ORIGIN, "pl", [entry("nowak"), entry("łuczak")]);
    expect(xml).toContain(`<loc>${ORIGIN}/pl/nazwisko/nowak</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/pl/nazwisko/%C5%82uczak</loc>`);
  });

  it("carries the claim date as lastmod, never a fabricated one", () => {
    expect(sitemapPageXml(ORIGIN, "pl", [entry("nowak")])).toContain(
      "<lastmod>2026-09-21T10:00:00Z</lastmod>",
    );
  });

  it("declares the other locale as an alternate (§20)", () => {
    const xml = sitemapPageXml(ORIGIN, "pl", [entry("nowak")]);
    expect(xml).toContain(`hreflang="en" href="${ORIGIN}/en/surname/nowak"`);
    expect(xml).toContain(`hreflang="pl" href="${ORIGIN}/pl/nazwisko/nowak"`);
  });

  it("carries no priority or changefreq", () => {
    // Both are hints Google has said it ignores. A number invented for them
    // would be decoration claiming to be information.
    const xml = sitemapPageXml(ORIGIN, "pl", [entry("nowak")]);
    expect(xml).not.toContain("priority");
    expect(xml).not.toContain("changefreq");
  });

  it("skips an entry whose slug yields no route rather than emitting a bare prefix", () => {
    const xml = sitemapPageXml(ORIGIN, "pl", [{ ...entry("nowak"), slug: "" }]);
    expect(xml).not.toContain("<url>");
  });
});

describe("the blog's sitemap (TASK-071)", () => {
  const post = (slug: string, lang: "pl" | "en", date: string): BlogPost => ({
    title: slug,
    description: slug,
    date,
    slug,
    lang,
    body: [{ kind: "p", inlines: [{ kind: "text", text: "x" }] }],
  });

  it("is named by the index only when asked, and the index is otherwise unchanged (AC-9)", () => {
    expect(sitemapIndexXml(ORIGIN, 2, [])).toBe(sitemapIndexXml(ORIGIN, 2));
    const xml = sitemapIndexXml(ORIGIN, 1, [BLOG_SITEMAP_PATH]);
    expect(xml).toContain(`<loc>${ORIGIN}/sitemap/1.xml</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/sitemap-blog.xml</loc>`);
    expect(sitemapIndexXml(ORIGIN, 0, [BLOG_SITEMAP_PATH])).toContain(
      `<loc>${ORIGIN}/sitemap-blog.xml</loc>`,
    );
  });

  it("lists each post with its date, and the language pair as alternates (AC-9)", () => {
    const posts = [
      post("a", "pl", "2026-10-02"),
      post("a", "en", "2026-10-02"),
      post("b", "pl", "2026-10-01"),
    ];
    const xml = blogSitemapXml("https://x.test/?a=1&b=2", posts);
    expect(xml).toContain("<loc>https://x.test/?a=1&amp;b=2/pl/blog/a</loc>");
    expect(xml).toContain("<lastmod>2026-10-02</lastmod>");
    expect(xml).toContain('hreflang="en" href="https://x.test/?a=1&amp;b=2/en/blog/a"');
    const b = xml.slice(xml.indexOf("/pl/blog/b"));
    expect(b.slice(0, b.indexOf("</url>"))).not.toContain("xhtml:link");
    expect(xml.match(/<url>/gu)?.length).toBe(3);
  });
});
