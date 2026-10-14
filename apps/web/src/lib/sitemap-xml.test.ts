import { describe, expect, it } from "vitest";
import type { BlogPost } from "./blog.js";
import {
  BLOG_SITEMAP_PATH,
  blogSitemapXml,
  escapeXml,
  indexedPageCount,
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

  it("splits at 10,000 URLs, inside the protocol's 50,000 (TASK-128)", () => {
    expect(SITEMAP_PAGE_SIZE).toBe(10_000);
    expect(SITEMAP_PAGE_SIZE).toBeLessThanOrEqual(50_000);
    expect(pageCount(1)).toBe(1);
    expect(pageCount(10_000)).toBe(1);
    expect(pageCount(10_001)).toBe(2);
    // The register's size, which is why an index exists at all.
    expect(pageCount(598_476)).toBe(60);
  });

  it("keeps a full file far below the 15.9 MB the CDN would not store (TASK-128)", () => {
    // A long surname, percent-encoded in both locales' addresses, on every entry.
    const slug = "szczepańska-wiśniewska-żółtkowska";
    const entries = Array.from({ length: SITEMAP_PAGE_SIZE }, (_, i) => ({
      surname_id: `01a0b9e3-34f3-7633-a239-${String(i).padStart(12, "0")}`,
      slug,
      display_name: "SZCZEPAŃSKA-WIŚNIEWSKA-ŻÓŁTKOWSKA",
      last_modified: "2026-10-06T00:00:00Z",
    }));
    const xml = sitemapPageXml("https://name-atlas.pl", "pl", entries);
    expect(xml.match(/<url>/gu)).toHaveLength(SITEMAP_PAGE_SIZE);
    expect(xml).toContain("szczepa%C5%84ska");
    expect(new TextEncoder().encode(xml).length).toBeLessThan(5_000_000);
  });
});

describe("indexedPageCount", () => {
  it("names at most one page, however many URLs there are", () => {
    expect(indexedPageCount(0)).toBe(0);
    expect(indexedPageCount(10_000)).toBe(1);
    expect(indexedPageCount(10_001)).toBe(1);
    expect(indexedPageCount(598_476)).toBe(1);
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
    image: null,
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
