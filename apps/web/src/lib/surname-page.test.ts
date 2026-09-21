import { describe, expect, it } from "vitest";
import { metadataFor, referrerPath, searchOrigin, siteOrigin } from "./surname-page.js";
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
