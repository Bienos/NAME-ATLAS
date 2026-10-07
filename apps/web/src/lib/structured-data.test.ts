import { describe, expect, it } from "vitest";
import {
  jsonLd,
  organizationId,
  publisher,
  siteGraph,
  surnamePageGraph,
  websiteId,
} from "./structured-data.js";
import { surnameCrumbs } from "./surname-page.js";

/** TASK-123 AC-5: the site's and the surname page's structured data. */

const ORIGIN = "https://atlas.example.test";

describe("siteGraph", () => {
  it("names the Organization and the WebSite with stable ids and absolute URLs", () => {
    const graph = siteGraph(ORIGIN)["@graph"] as Record<string, unknown>[];
    expect(graph.map((node) => node["@type"])).toEqual(["Organization", "WebSite"]);
    expect(graph[0]).toMatchObject({
      "@id": `${ORIGIN}/#organization`,
      url: `${ORIGIN}/`,
      logo: { url: `${ORIGIN}/apple-icon.png` },
      sameAs: [
        "https://www.instagram.com/nameatlas_/",
        "https://www.tiktok.com/@nameatlas_",
        "https://www.facebook.com/profile.php?id=61595400800918",
      ],
    });
    expect(graph[1]).toMatchObject({
      "@id": websiteId(ORIGIN),
      publisher: { "@id": organizationId(ORIGIN) },
    });
    // §78–§81: nothing the page cannot back.
    expect(JSON.stringify(graph)).not.toMatch(/SearchAction|FAQPage|Person|Product|Dataset/u);
  });
});

describe("surnamePageGraph", () => {
  it("is a WebPage and the BreadcrumbList of the visible crumbs", () => {
    const path = "/pl/nazwisko/%C5%82uczak";
    const crumbs = surnameCrumbs("ŁUCZAK", "pl", path);
    // The Polish breadcrumb passes through the surname directory (TASK-129).
    expect(crumbs).toEqual([
      { name: "Name Atlas", path: "/" },
      { name: "Nazwiska", path: "/pl/nazwiska" },
      { name: "Nazwisko ŁUCZAK", path },
    ]);
    const graph = surnamePageGraph({
      origin: ORIGIN,
      path,
      name: "Nazwisko ŁUCZAK",
      description: "D",
      lang: "pl",
      crumbs,
    })["@graph"] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({
      "@type": "WebPage",
      url: `${ORIGIN}${path}`,
      inLanguage: "pl",
      isPartOf: { "@id": websiteId(ORIGIN) },
      breadcrumb: { "@id": `${ORIGIN}${path}#breadcrumb` },
    });
    expect(graph[1]).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Name Atlas", item: `${ORIGIN}/` },
        { position: 2, name: "Nazwiska", item: `${ORIGIN}/pl/nazwiska` },
        { position: 3, name: "Nazwisko ŁUCZAK", item: `${ORIGIN}${path}` },
      ],
    });
    // §76: a surname is not a person.
    expect(JSON.stringify(graph)).not.toContain('"Person"');
  });

  it("starts the English breadcrumb at the English landing page, with no directory step", () => {
    expect(surnameCrumbs("NOWAK", "en", "/en/surname/nowak")).toEqual([
      { name: "Name Atlas", path: "/?lang=en" },
      { name: "Surname NOWAK", path: "/en/surname/nowak" },
    ]);
  });

  it("names a directory page a CollectionPage when asked", () => {
    const graph = surnamePageGraph({
      origin: ORIGIN,
      path: "/pl/nazwiska",
      name: "Nazwiska od A do Ż",
      description: "D",
      lang: "pl",
      crumbs: [{ name: "Name Atlas", path: "/" }],
      type: "CollectionPage",
    })["@graph"] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({ "@type": "CollectionPage", url: `${ORIGIN}/pl/nazwiska` });
  });
});

describe("publisher and jsonLd", () => {
  it("points at the Organization only when the origin is known", () => {
    expect(publisher(ORIGIN)).toMatchObject({ "@id": organizationId(ORIGIN) });
    expect(publisher(null)).not.toHaveProperty("@id");
  });

  it("cannot be closed by a value", () => {
    const text = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("<");
    expect((JSON.parse(text) as { name: string }).name).toContain("</script>");
  });
});
