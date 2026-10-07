import { afterEach, describe, expect, it, vi } from "vitest";
import { indexingEnabled, siteOrigin } from "../../lib/seo.js";
import { aiSearchAgents, aiTrainingAgents } from "../../lib/ai-crawlers.js";
import { GET } from "./route.js";

vi.mock("../../lib/seo.js", () => ({
  indexingEnabled: vi.fn(),
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

describe("AI crawlers (TASK-175)", () => {
  /** The group that names `agent`, as the lines of one blank-line-separated block. */
  function groupOf(body: string, agent: string): string | undefined {
    return body.split(/\n\n/).find((group) => group.split("\n").includes(`User-agent: ${agent}`));
  }

  it.each([true, false])("refuses every training crawler everything (indexing %s)", async (on) => {
    vi.mocked(indexingEnabled).mockReturnValue(on);
    const body = await GET().text();
    for (const agent of aiTrainingAgents) {
      const group = groupOf(body, agent);
      expect(group, agent).toBeDefined();
      expect(group).toContain("Disallow: /\n");
      expect(group).not.toContain("Allow:");
    }
  });

  it("gives the answer engines the search engines' rules when indexing is enabled", async () => {
    vi.mocked(indexingEnabled).mockReturnValue(true);
    const body = await GET().text();
    for (const agent of aiSearchAgents) {
      const group = groupOf(body, agent);
      expect(group, agent).toBeDefined();
      expect(group).toContain("Allow: /pl/nazwisko/");
      expect(group).toContain("Disallow: /api/");
      expect(group).toContain("Disallow: /?");
      expect(group).not.toMatch(/^Disallow: \/$/mu);
    }
  });

  it("leaves the answer engines to the closed `*` group when indexing is disabled", async () => {
    vi.mocked(indexingEnabled).mockReturnValue(false);
    const body = await GET().text();
    for (const agent of aiSearchAgents) expect(groupOf(body, agent), agent).toBeUndefined();
    expect(body).toContain("User-agent: *\nDisallow: /");
  });

  it("names no crawler as both", () => {
    expect(aiSearchAgents.filter((agent) => aiTrainingAgents.includes(agent))).toEqual([]);
  });
});
