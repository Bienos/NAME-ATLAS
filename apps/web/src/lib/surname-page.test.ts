import { describe, expect, it } from "vitest";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import {
  canonicalPathFor,
  metadataFor,
  referrerPath,
  searchOrigin,
  siteOrigin,
} from "./surname-page.js";
import type { PageAnswer } from "./surname-page.js";

/** TASK-023 §2.6 and TASK-024 AC-4 — pure helpers of the canonical page. */
describe("searchOrigin", () => {
  it("recognises a result page in either locale", () => {
    expect(searchOrigin("/pl/nazwisko/nowak")).toBe("result_page");
    expect(searchOrigin("/en/surname/nowak")).toBe("result_page");
  });
  it("recognises the home page and everything else", () => {
    expect(searchOrigin("/")).toBe("home");
    expect(searchOrigin("/?lang=en")).toBe("home");
    expect(searchOrigin("external")).toBe("external");
    expect(searchOrigin(null)).toBe("direct");
  });
});

describe("referrerPath", () => {
  it("returns only the path, never the query, for a same-origin referrer", () => {
    expect(referrerPath("https://a.test/pl/nazwisko/nowak?x=1", "https://a.test")).toBe(
      "/pl/nazwisko/nowak",
    );
  });
  it("labels a foreign origin external without keeping any of it", () => {
    expect(referrerPath("https://other.test/some/path?q=NOWAK", "https://a.test")).toBe("external");
  });
  it("returns null for an unparseable referrer", () => {
    expect(referrerPath("not a url", "https://a.test")).toBeNull();
  });
});

describe("siteOrigin", () => {
  it("reads SITE_ORIGIN and strips a trailing slash; null when unset", () => {
    expect(siteOrigin({})).toBeNull();
    expect(siteOrigin({ SITE_ORIGIN: "https://a.test/" })).toBe("https://a.test");
  });
});

describe("metadataFor", () => {
  it("is noindex, follow for every answer while indexing is disabled", () => {
    const answers: PageAnswer[] = [
      { kind: "UNKNOWN", slug: "x" },
      { kind: "INVALID_SLUG" },
      { kind: "UNAVAILABLE" },
      { kind: "MOVED", current_slug: "nowak" },
    ];
    for (const a of answers) {
      const m = metadataFor(a, "pl", "x");
      expect(m.robots).toEqual({ index: false, follow: true });
    }
  });
});

describe("canonicalPathFor", () => {
  // Only `kind` and `slug` are read, so the response is not built out here.
  const result = (slug: string, display: string): PageAnswer => ({
    kind: "RESULT",
    response: {} as SurnameResultResponse,
    display,
    slug,
    otherLangPath: null,
    gates: { seoSurfaceAllowed: false, privacyPublic: true },
  });

  it("uses the stored slug, so a collision suffix survives", () => {
    // TEST COLLISION's display form slugs to `test-collision`, which belongs to
    // the other surname of the pair; its own address carries a suffix.
    expect(canonicalPathFor(result("test-collision-0a1b2c3d", "TEST COLLISION"), "pl", "x")).toBe(
      "/pl/nazwisko/test-collision-0a1b2c3d",
    );
    expect(canonicalPathFor(result("łuczak", "ŁUCZAK"), "en", "x")).toBe("/en/surname/%C5%82uczak");
  });

  it("falls back to the requested address only when nothing resolved", () => {
    expect(canonicalPathFor({ kind: "UNKNOWN", slug: "nowakk" }, "pl", "nowakk")).toBe(
      "/pl/nazwisko/nowakk",
    );
  });
});
