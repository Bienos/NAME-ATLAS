import { describe, expect, it } from "vitest";
// Next's own compiler for a `headers()` rule, so the test matches as Next does.
import { buildCustomRoute } from "next/dist/lib/build-custom-route.js";
import nextConfig from "../../next.config.js";
import {
  SURNAME_CDN_CACHE_RULES,
  SURNAME_IMAGE_CDN_CACHE,
  SURNAME_PAGE_CDN_CACHE,
} from "./surname-cdn-cache.js";

/** The `Vercel-CDN-Cache-Control` value a path gets from next.config, if any. */
async function cdnCacheFor(path: string): Promise<string | undefined> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const values = rules
    .filter((rule) => new RegExp(buildCustomRoute("header", rule).regex).test(path))
    .flatMap((rule) => rule.headers)
    .filter((h) => h.key === "Vercel-CDN-Cache-Control")
    .map((h) => h.value);
  expect(values.length).toBeLessThanOrEqual(1);
  return values[0];
}

describe("surname CDN cache (TASK-181)", () => {
  it("next.config carries the rules after the security headers", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules?.slice(1)).toEqual(SURNAME_CDN_CACHE_RULES);
  });

  it("caches both surname pages for an hour, then a stale day", async () => {
    expect(SURNAME_PAGE_CDN_CACHE).toBe("public, s-maxage=3600, stale-while-revalidate=86400");
    expect(await cdnCacheFor("/pl/nazwisko/kowalski")).toBe(SURNAME_PAGE_CDN_CACHE);
    expect(await cdnCacheFor("/en/surname/kowalski")).toBe(SURNAME_PAGE_CDN_CACHE);
    expect(await cdnCacheFor("/pl/nazwisko/nowak-2")).toBe(SURNAME_PAGE_CDN_CACHE);
  });

  it("caches both Open Graph images for 6 hours, then a stale day", async () => {
    expect(SURNAME_IMAGE_CDN_CACHE).toBe("public, s-maxage=21600, stale-while-revalidate=86400");
    expect(await cdnCacheFor("/pl/nazwisko/kowalski/opengraph-image")).toBe(
      SURNAME_IMAGE_CDN_CACHE,
    );
    expect(await cdnCacheFor("/en/surname/kowalski/opengraph-image")).toBe(SURNAME_IMAGE_CDN_CACHE);
    expect(await cdnCacheFor("/pl/nazwisko/kowalski/opengraph-image-1a2b3c")).toBe(
      SURNAME_IMAGE_CDN_CACHE,
    );
  });

  it("leaves every other route alone", async () => {
    for (const path of [
      "/",
      "/pl/nazwisko",
      "/pl/nazwiska/k",
      "/pl/nazwisko/kowalski/pdf",
      "/pl/nazwisko/kowalski/pelny-raport",
      "/pl/nazwisko/kowalski/pelny-raport/pdf",
      "/pl/nazwisko/kowalski/udostepnij",
      "/pl/nazwisko/kowalski/karta/liczba",
      "/en/surname/kowalski/full-report",
      "/en/surname/kowalski/card/count",
      "/en/surname/kowalski/share",
      "/pl/konto",
      "/api/v1/surname-results",
      "/sitemap.xml",
    ]) {
      expect(await cdnCacheFor(path), path).toBeUndefined();
    }
  });
});
