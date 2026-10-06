import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Seo from "@name-atlas/seo";
import { sitemapCount } from "@name-atlas/seo";
import { indexingEnabled, siteOrigin } from "../../lib/seo.js";
import { SITEMAP_CACHE_CONTROL } from "../../lib/sitemap-xml.js";
import { GET } from "./route.js";

/** TASK-127: only the index read from the database is cached at the CDN. */

vi.mock("../../lib/db.js", () => ({ db: vi.fn(() => ({})) }));
vi.mock("../../lib/seo-surface.js", () => ({ seoBlockedProfileIds: vi.fn(async () => []) }));
vi.mock("../../lib/blog-posts.js", () => ({ blogPosts: vi.fn(() => []) }));
vi.mock("../../lib/seo.js", () => ({
  indexingEnabled: vi.fn(() => true),
  siteOrigin: vi.fn(() => "https://name-atlas.pl"),
}));
vi.mock("@name-atlas/seo", async (importOriginal) => ({
  ...(await importOriginal<typeof Seo>()),
  sitemapCount: vi.fn(async () => 120_000),
}));

afterEach(() => vi.clearAllMocks());

describe("/sitemap.xml caching (TASK-127)", () => {
  it("caches the index it reads from the database, stale while it is rebuilt", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(SITEMAP_CACHE_CONTROL);
    expect(SITEMAP_CACHE_CONTROL).toMatch(/s-maxage=\d+/u);
    expect(SITEMAP_CACHE_CONTROL).toMatch(/stale-while-revalidate=\d+/u);
    expect(await response.text()).toContain("https://name-atlas.pl/sitemap/3.xml");
  });

  it("never caches a failure", async () => {
    vi.mocked(sitemapCount).mockRejectedValueOnce(new Error("database down"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBeNull();
  });

  it("does not cache the empty index, so switching the flag takes effect at once", async () => {
    vi.mocked(indexingEnabled).mockReturnValueOnce(false);
    expect((await GET()).headers.get("cache-control")).toBeNull();
    vi.mocked(siteOrigin).mockReturnValueOnce(null);
    expect((await GET()).headers.get("cache-control")).toBeNull();
  });
});
