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
  const side = (slug: string) => ({ slug, display: null, response: null });

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
