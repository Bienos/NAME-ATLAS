import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Seo from "@name-atlas/seo";
import { sitemapEntries } from "@name-atlas/seo";
import { indexingEnabled } from "../../../lib/seo.js";
import { SITEMAP_CACHE_CONTROL } from "../../../lib/sitemap-xml.js";
import { GET } from "./route.js";

/** TASK-127: a sitemap page read from the database is cached; a 404 or an error is not. */

vi.mock("../../../lib/db.js", () => ({ db: vi.fn(() => ({})) }));
vi.mock("../../../lib/seo-surface.js", () => ({
  seoBlockedProfileIds: vi.fn(async () => []),
}));
vi.mock("../../../lib/seo.js", () => ({
  indexingEnabled: vi.fn(() => true),
  siteOrigin: vi.fn(() => "https://name-atlas.pl"),
}));
vi.mock("@name-atlas/seo", async (importOriginal) => ({
  ...(await importOriginal<typeof Seo>()),
  sitemapEntries: vi.fn(async () => [
    {
      surname_id: "01a0b9e3-34f3-7633-a239-2b8596dfc088",
      slug: "nowak",
      display_name: "NOWAK",
      last_modified: "2026-10-01T00:00:00Z",
    },
  ]),
}));

afterEach(() => vi.clearAllMocks());

const get = (page: string) =>
  GET(new Request("https://name-atlas.pl/"), { params: Promise.resolve({ page }) });

describe("/sitemap/{n}.xml caching (TASK-127)", () => {
  it("caches a page it reads from the database", async () => {
    const response = await get("1.xml");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(SITEMAP_CACHE_CONTROL);
    expect(await response.text()).toContain("https://name-atlas.pl/pl/nazwisko/nowak");
  });

  it("never caches a 404 or a failure", async () => {
    expect((await get("x.xml")).headers.get("cache-control")).toBeNull();
    vi.mocked(sitemapEntries).mockResolvedValueOnce([]);
    const empty = await get("9.xml");
    expect(empty.status).toBe(404);
    expect(empty.headers.get("cache-control")).toBeNull();
    vi.mocked(sitemapEntries).mockRejectedValueOnce(new Error("database down"));
    const failed = await get("1.xml");
    expect(failed.status).toBe(500);
    expect(failed.headers.get("cache-control")).toBeNull();
    vi.mocked(indexingEnabled).mockReturnValueOnce(false);
    expect((await get("1.xml")).headers.get("cache-control")).toBeNull();
  });
});
