import { afterEach, describe, expect, it, vi } from "vitest";
import type { BlogPost } from "../../lib/blog.js";
import { blogPosts } from "../../lib/blog-posts.js";
import { indexingEnabled, siteOrigin } from "../../lib/seo.js";
import { GET } from "./route.js";

vi.mock("../../lib/blog-posts.js", () => ({ blogPosts: vi.fn(() => []) }));
vi.mock("../../lib/seo.js", () => ({
  indexingEnabled: vi.fn(() => true),
  siteOrigin: vi.fn(() => "https://name-atlas.pl"),
}));

afterEach(() => vi.clearAllMocks());

function post(lang: "pl" | "en", slug: string, title: string): BlogPost {
  return {
    lang,
    slug,
    title,
    description: `${title} — opis`,
    date: "2026-10-01",
    body: [],
    image: null,
  };
}

describe("/llms.txt (TASK-175)", () => {
  it("is a 404 while indexing is disabled", async () => {
    vi.mocked(indexingEnabled).mockReturnValueOnce(false);
    expect(GET().status).toBe(404);
  });

  it("is a 404 without an origin, rather than relative links", async () => {
    vi.mocked(siteOrigin).mockReturnValueOnce(null);
    expect(GET().status).toBe(404);
  });

  it("maps the site with absolute links and lists every post under its language", async () => {
    vi.mocked(blogPosts).mockReturnValueOnce([
      post("pl", "genealogia", "Genealogia [od podstaw]"),
      post("en", "genealogy", "Genealogy"),
    ]);
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const body = await response.text();
    expect(body.startsWith("# Name Atlas\n\n> ")).toBe(true);
    expect(body).toContain("(https://name-atlas.pl/pl/nazwiska)");
    expect(body).toContain("Sitemap](https://name-atlas.pl/sitemap.xml)");
    expect(body).toContain(
      "- [Genealogia \\[od podstaw\\]](https://name-atlas.pl/pl/blog/genealogia): Genealogia [od podstaw] — opis",
    );
    expect(body.indexOf("/pl/blog/genealogia")).toBeLessThan(body.indexOf("## Blog in English"));
    expect(body.indexOf("/en/blog/genealogy")).toBeGreaterThan(body.indexOf("## Blog in English"));
    // Every link is absolute.
    for (const [, href] of body.matchAll(/\]\(([^)]+)\)/gu))
      expect(href).toMatch(/^https:\/\/name-atlas\.pl\//u);
  });
});
