import { afterEach, describe, expect, it, vi } from "vitest";
import { indexingEnabled } from "../../lib/seo.js";
import { siteOrigin } from "../../lib/surname-page.js";
import { GET } from "./route.js";

vi.mock("../../lib/seo.js", () => ({
  indexingEnabled: vi.fn(),
}));
vi.mock("../../lib/surname-page.js", () => ({
  siteOrigin: vi.fn(() => "https://name-atlas.pl"),
}));

afterEach(() => vi.clearAllMocks());

describe("preview crawlers and search indexing", () => {
  it("allows sharing crawlers while keeping the closed search policy", async () => {
    vi.mocked(indexingEnabled).mockReturnValue(false);
    const body = await GET().text();
    const [preview, search] = body.split(/\n\n/);
    expect(preview).toContain("User-agent: facebookexternalhit");
    expect(preview).toContain("User-agent: WhatsApp");
    expect(preview).toContain("Allow: /");
    expect(preview).toContain("Disallow: /api/");
    expect(preview).toContain("Disallow: /?");
    expect(preview).not.toMatch(/User-agent: (Googlebot|bingbot|\*)/i);
    expect(search).toContain("User-agent: *\nDisallow: /");
    expect(search).not.toContain("Allow:");
    expect(search).not.toContain("Sitemap:");
  });

  it("preserves the enabled search policy and public sitemap", async () => {
    vi.mocked(indexingEnabled).mockReturnValue(true);
    const body = await GET().text();
    const search = body.split(/\n\n/)[1];
    expect(search).toContain("User-agent: *");
    expect(search).toContain("Disallow: /?");
    expect(search).toContain("Disallow: /api/");
    expect(body).toContain("Sitemap: https://name-atlas.pl/sitemap.xml");
  });

  it("does not invent a sitemap origin when none is configured", async () => {
    vi.mocked(indexingEnabled).mockReturnValue(true);
    vi.mocked(siteOrigin).mockReturnValueOnce(null);
    expect(await GET().text()).not.toContain("Sitemap:");
  });
});
