import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComparisonView, comparePath } from "./compare-view.js";

/** The compare page's language switch. */
describe("comparePath", () => {
  it("points each language at the other's route with the same slugs", () => {
    expect(comparePath("nowak", "kowalczyk", "en")).toBe("/en/compare?a=nowak&b=kowalczyk");
    expect(comparePath("nowak", "kowalczyk", "pl")).toBe("/pl/porownaj?a=nowak&b=kowalczyk");
  });

  it("encodes what came from the query string", () => {
    expect(comparePath("łuczak", 'x"&c=1', "en")).toBe("/en/compare?a=%C5%82uczak&b=x%22%26c%3D1");
  });
});

describe("ComparisonView masthead", () => {
  const side = (slug: string) => ({ slug, display: null, response: null, path: null });

  it("offers the other language for the same pair", () => {
    const pl = renderToStaticMarkup(
      createElement(ComparisonView, { a: side("nowak"), b: side("kowalczyk"), lang: "pl" }),
    );
    expect(pl).toContain('href="/en/compare?a=nowak&amp;b=kowalczyk">English</a>');
    const en = renderToStaticMarkup(
      createElement(ComparisonView, { a: side("nowak"), b: side("kowalczyk"), lang: "en" }),
    );
    expect(en).toContain('href="/pl/porownaj?a=nowak&amp;b=kowalczyk">Polski</a>');
  });
});

describe("ComparisonView surname links", () => {
  it("links each surname to its stored address, collision suffix included", () => {
    // Of two surnames that share a slug, the backfill gives one a suffix
    // (ADR-0010 §2). Rebuilding the address from the display form would drop
    // it and open the other surname of the pair.
    const html = renderToStaticMarkup(
      createElement(ComparisonView, {
        a: {
          slug: "test-collision-0a1b2c3d",
          display: "TEST COLLISION",
          response: null,
          path: "/pl/nazwisko/test-collision-0a1b2c3d",
        },
        b: { slug: "nowak", display: "NOWAK", response: null, path: null },
        lang: "pl",
      }),
    );
    expect(html).toContain('href="/pl/nazwisko/test-collision-0a1b2c3d">TEST COLLISION</a>');
    // No stored address, no link: never one guessed from the display form.
    expect(html).not.toContain('href="/pl/nazwisko/nowak"');
  });
});
