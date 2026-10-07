import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComparePicker, ComparisonView, comparePath } from "./compare-view.js";
import { resolved } from "./couple-fixture.js";
import { UI } from "./messages.js";

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
    expect(pl).toContain(
      'href="/en/compare?a=nowak&amp;b=kowalczyk" hrefLang="en" lang="en" aria-label="English">EN</a>',
    );
    const en = renderToStaticMarkup(
      createElement(ComparisonView, { a: side("nowak"), b: side("kowalczyk"), lang: "en" }),
    );
    expect(en).toContain(
      'href="/pl/porownaj?a=nowak&amp;b=kowalczyk" hrefLang="pl" lang="pl" aria-label="Polski">PL</a>',
    );
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

/** TASK-155 — the redesign: same figures, same gates, drawn as plates, bars and odds. */
describe("the redesigned comparison (TASK-155)", () => {
  const nowak = {
    slug: "nowak",
    display: "NOWAK",
    response: resolved({
      id: "01a0b9e3-34f3-7633-a239-2b8596dfc001",
      display: "NOWAK",
      counts: [
        [200_000, "male"],
        [190_000, "female"],
      ],
    }),
    path: "/pl/nazwisko/nowak",
  };
  const zaremba = {
    slug: "zaremba",
    display: "ZAREMBA",
    // On the men's list only: the women's partition is missing on one side.
    response: resolved({
      id: "01a0b9e3-34f3-7633-a239-2b8596dfc002",
      display: "ZAREMBA",
      counts: [[4_000, "male"]],
    }),
    path: "/pl/nazwisko/zaremba",
  };
  const html = (lang: "pl" | "en" = "pl", fullNamesHref: string | null = null) =>
    renderToStaticMarkup(
      createElement(ComparisonView, { a: nowak, b: zaremba, lang, fullNamesHref }),
    );

  it("heads the page with both names as plates and the mark between them", () => {
    const pl = html();
    expect(pl).toMatch(
      /<h1 class="cmp-plates"[^>]*>.*NOWAK.*<span class="cmp-vs"> a <\/span>.*ZAREMBA.*<\/h1>/su,
    );
  });

  it("puts the disclaimer before any figure (AC-1)", () => {
    const pl = html();
    expect(pl.indexOf(UI.pl.compareDisclaimer)).toBeGreaterThan(-1);
    expect(pl.indexOf(UI.pl.compareDisclaimer)).toBeLessThan(pl.indexOf("cmp-bar"));
  });

  it("draws a comparable count as two bars on one scale, the larger full", () => {
    const pl = html();
    expect(pl.match(/class="cmp-bar-fill"/gu)).toHaveLength(2);
    expect(pl).toContain('style="--share:1"');
    expect(pl).toContain("--share:0.02");
    expect(pl).toContain("200 000".replace(" ", " "));
  });

  it("draws nothing for a partition one side lacks, and says why (AC-2)", () => {
    const pl = html();
    // The women's list: NOWAK only. Reason given, no third bar.
    expect(pl).toContain("Tej wartości nie ma dla jednego z nazwisk");
    expect(pl.match(/class="cmp-bar-fill"/gu)).toHaveLength(2);
  });

  it("links both surname pages and offers another comparison with its own field ids", () => {
    const pl = html();
    expect(pl).toContain('href="/pl/nazwisko/nowak">NOWAK</a>');
    expect(pl).toContain('href="/pl/nazwisko/zaremba">ZAREMBA</a>');
    expect(pl).toContain('id="qa-again"');
    expect(pl).toContain('name="qa"');
    expect(pl).not.toContain('id="qa"');
  });

  it("shows the full-name card only where that page exists, with no way to pay", () => {
    expect(html()).not.toContain("cmp-upsell");
    const pl = html("pl", "/pl/porownaj/imie-i-nazwisko");
    expect(pl).toContain('href="/pl/porownaj/imie-i-nazwisko"');
    expect(pl).toContain("15,99 zł");
    expect(pl).toContain("Wkrótce");
    expect(pl).not.toMatch(/checkout|<button[^>]*>Kup/iu);
    expect(html("en", "/en/compare/full-name")).toContain("PLN 15.99");
  });
});

describe("the redesigned picker (TASK-155)", () => {
  const picker = (props: Partial<Parameters<typeof ComparePicker>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(ComparePicker, { lang: "pl", first: "", second: "", error: false, ...props }),
    );

  it("keeps the two fields and the GET to the comparison", () => {
    const html = picker();
    expect(html).toContain('action="/pl/porownaj" method="get"');
    expect(html).toMatch(/<input id="qa"[^>]*name="qa"/u);
    expect(html).toMatch(/<input id="qb"[^>]*name="qb"/u);
    expect(html.indexOf(UI.pl.compareDisclaimer)).toBeLessThan(html.indexOf('id="qa"'));
  });

  it("offers example pairs as comparison addresses", () => {
    expect(picker()).toContain('href="/pl/porownaj?a=nowak&amp;b=kowalski"');
  });

  it("gives the couple picker its own words and none of the extras", () => {
    const html = picker({
      copy: {
        action: "/pl/para",
        otherPath: "/en/couple",
        heading: "Wasze nazwiska razem",
        intro: "x",
        submit: "Pokaż",
      },
      fullNamesHref: "/pl/porownaj/imie-i-nazwisko",
    });
    expect(html).toContain('action="/pl/para"');
    expect(html).not.toContain("cmp-try");
    expect(html).not.toContain("cmp-upsell");
  });
});
