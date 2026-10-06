import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import {
  CanonicalSurnamePage,
  canonicalPathFor,
  languageAlternates,
  metadataFor,
  referrerPath,
  searchOrigin,
  siteOrigin,
} from "./surname-page.js";
import type { PageAnswer } from "./surname-page.js";

// The result body is tested in result-view.test.ts; the page's head and
// breadcrumb are what is tested here.
vi.mock("./result-view.js", () => ({ Result: () => null }));

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

describe("TASK-123 AC-3: hreflang between the surname's two addresses", () => {
  const answer = (otherLangPath: string | null): PageAnswer => ({
    kind: "RESULT",
    response: { status: "RESOLVED", surname: { display_name: "NOWAK" } } as SurnameResultResponse,
    display: "NOWAK",
    slug: "nowak",
    otherLangPath,
    gates: { seoSurfaceAllowed: false, privacyPublic: true },
  });

  it("declares pl, en and x-default from either page, reciprocally", () => {
    const fromPl = languageAlternates(
      answer("/en/surname/nowak"),
      "pl",
      "https://a.test/pl/nazwisko/nowak",
      "https://a.test",
    );
    expect(fromPl).toEqual({
      pl: "https://a.test/pl/nazwisko/nowak",
      en: "https://a.test/en/surname/nowak",
      "x-default": "https://a.test/pl/nazwisko/nowak",
    });
    const fromEn = languageAlternates(
      answer("/pl/nazwisko/nowak"),
      "en",
      "https://a.test/en/surname/nowak",
      "https://a.test",
    );
    expect(fromEn).toEqual(fromPl);
  });

  it("declares nothing without the other address, or without a result", () => {
    expect(languageAlternates(answer(null), "pl", "/pl/nazwisko/nowak", null)).toBeNull();
    expect(languageAlternates({ kind: "UNAVAILABLE" }, "pl", "/x", null)).toBeNull();
  });

  it("reaches the page's metadata, and leaves the canonical and robots as they were", () => {
    const m = metadataFor(answer("/en/surname/nowak"), "pl", "nowak");
    expect(m.alternates).toEqual({
      canonical: "/pl/nazwisko/nowak",
      languages: {
        pl: "/pl/nazwisko/nowak",
        en: "/en/surname/nowak",
        "x-default": "/pl/nazwisko/nowak",
      },
    });
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.title).toBe("Nazwisko NOWAK | Name Atlas");
    expect(metadataFor(answer(null), "pl", "nowak").alternates).toEqual({
      canonical: "/pl/nazwisko/nowak",
    });
  });
});

describe("TASK-123: the surname page's breadcrumb and JSON-LD", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const render = () =>
    renderToStaticMarkup(
      createElement(CanonicalSurnamePage, {
        answer: {
          kind: "RESULT",
          // Read only by the mocked body and the deck, which has no card for it.
          response: {} as SurnameResultResponse,
          display: "NOWAK",
          slug: "nowak",
          otherLangPath: null,
          gates: { seoSurfaceAllowed: false, privacyPublic: true },
        },
        lang: "pl",
        slug: "nowak",
        intent: "default",
        origin: "https://a.test",
      }),
    );

  it("shows the breadcrumb the JSON-LD names", () => {
    vi.stubEnv("SITE_ORIGIN", "https://a.test");
    const html = render();
    expect(html).toMatch(
      /<nav class="breadcrumbs" aria-label="Ścieżka nawigacyjna"><ol><li><a href="\/">Name Atlas<\/a><\/li><li><a href="\/pl\/nazwiska">Nazwiska<\/a><\/li><li aria-current="page">Nazwisko NOWAK<\/li><\/ol><\/nav>/u,
    );
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gu)];
    expect(scripts).toHaveLength(1);
    const graph = (
      JSON.parse(scripts[0]?.[1] ?? "{}") as { "@graph": { itemListElement?: unknown }[] }
    )["@graph"];
    expect(graph[1]?.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Name Atlas", item: "https://a.test/" },
      { "@type": "ListItem", position: 2, name: "Nazwiska", item: "https://a.test/pl/nazwiska" },
      {
        "@type": "ListItem",
        position: 3,
        name: "Nazwisko NOWAK",
        item: "https://a.test/pl/nazwisko/nowak",
      },
    ]);
  });

  it("emits no JSON-LD without SITE_ORIGIN, though the request has a host", () => {
    vi.stubEnv("SITE_ORIGIN", "");
    expect(render()).not.toContain("application/ld+json");
  });
});
