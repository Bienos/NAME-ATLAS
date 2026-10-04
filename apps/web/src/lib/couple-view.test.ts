import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CouplePicker, CoupleView, couplePath } from "./couple-view.js";
import { coupleNames, nameRow, partOf } from "./couple.js";
import type { NameRow } from "./couple.js";
import { resolved, unresolved } from "./couple-fixture.js";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";

/** TASK-100's view, asserted against rendered markup in both languages. */

const KOWALSKI = resolved({
  id: "01a0b9e3-34f3-7633-a239-2b8596dfc001",
  display: "KOWALSKI",
  counts: [[139_000, "male"]],
  otherForm: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc002", display: "KOWALSKA" },
  meaning: true,
  region: "MAZOWIECKIE",
});
const NOWAK = resolved({
  id: "01a0b9e3-34f3-7633-a239-2b8596dfc003",
  display: "NOWAK",
  counts: [
    [98_387, "male"],
    [99_738, "female"],
  ],
  region: "WIELKOPOLSKIE",
});

function side(slug: string, response: typeof KOWALSKI | null) {
  return {
    slug,
    display: response?.surname?.display_name ?? null,
    response,
    path: response === null ? null : `/pl/nazwisko/${slug}`,
  };
}

/** The list the loader builds, with every joined name off the list. */
function names(): NameRow[] {
  const a = partOf(KOWALSKI)!;
  const b = partOf(NOWAK)!;
  return coupleNames(a, b).map((name) =>
    name === "KOWALSKI"
      ? nameRow(name, KOWALSKI)
      : name === "NOWAK"
        ? nameRow(name, NOWAK)
        : name === "KOWALSKA"
          ? nameRow(
              name,
              resolved({
                id: "01a0b9e3-34f3-7633-a239-2b8596dfc002",
                display: "KOWALSKA",
                counts: [[141_000, "female"]],
              }),
            )
          : nameRow(name, unresolved()),
  );
}

function render(lang: Lang): string {
  return renderToStaticMarkup(
    createElement(CoupleView, {
      a: side("kowalski", KOWALSKI),
      b: side("nowak", NOWAK),
      names: names(),
      lang,
    }),
  );
}

function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ");
}

describe("CoupleView", () => {
  it("renders the six parts in ADR-0035's order, in both languages", () => {
    for (const lang of ["pl", "en"] as const) {
      const html = render(lang);
      const t = UI[lang];
      const order = [
        'id="couple-names"',
        'id="couple-map"',
        'id="couple-count"',
        'id="couple-meaning"',
        'id="couple-bearers"',
        'class="again couple-links"',
      ].map((marker) => html.indexOf(marker));
      expect(
        order.every((index) => index >= 0),
        lang,
      ).toBe(true);
      expect(
        [...order].sort((x, y) => x - y),
        lang,
      ).toEqual(order);
      for (const heading of [
        t.coupleHeading,
        t.coupleNamesHeading,
        t.coupleWhereHeading,
        t.coupleCommonHeading,
        t.coupleMeaningHeading,
        t.coupleBearersHeading,
      ]) {
        expect(html, `${lang}: ${heading}`).toContain(heading);
      }
    }
  });

  it("titles the page with both surnames", () => {
    const html = render("pl");
    expect(text(html)).toContain("Wasze nazwiska razem");
    expect(text(html)).toContain("KOWALSKI & NOWAK");
  });

  it("lists every name once, a joined name off the list as not on it and never with a count", () => {
    const html = render("pl");
    const plain = text(html);
    for (const name of ["KOWALSKI-NOWAK", "NOWAK-KOWALSKI", "KOWALSKA-NOWAK", "NOWAK-KOWALSKA"]) {
      const row = new RegExp(
        `<tr data-kind="NOT_LISTED"><th scope="row">${name}</th><td><span class="absent">Nie ma go na liście PESEL</span></td></tr>`,
        "u",
      );
      expect(html, name).toMatch(row);
    }
    expect(html.match(/<tr data-kind=/gu)).toHaveLength(7);
    expect(plain).toContain("98 387 (mężczyźni)");
    expect(plain).toContain("99 738 (kobiety)");
    // A name off the list is never a zero.
    expect(html).not.toMatch(/data-kind="NOT_LISTED"[^]*?<td>0/u);
    expect(text(render("en"))).toContain("Not on the PESEL list");
  });

  it("shows each surname's own chapters side by side, each with its own id", () => {
    const html = render("pl");
    for (const id of [
      "map-a",
      "map-b",
      "count-a",
      "count-b",
      "meaning-a",
      "meaning-b",
      "bearers-a",
      "bearers-b",
    ]) {
      expect(html.split(`id="${id}"`), id).toHaveLength(2);
    }
    expect(html).toContain("MAZOWIECKIE");
    expect(html).toContain("WIELKOPOLSKIE");
  });

  it("states a meaning's absence for the surname that has none, and shows the other's", () => {
    const html = render("pl");
    expect(html).toContain("SYNTHETIC GLOSS FOR A TEST");
    expect(html).toContain(UI.pl.meaningNoSource);
  });

  it("keeps the bearers' 'not your relative' wording where a surname has bearers", () => {
    // The bearers chapter renders as on the surname page; its caveat is
    // asserted there (`result-view.test.ts`). Here: the chapter is present.
    const html = render("pl");
    expect(html).toContain(UI.pl.bearersNotSearched);
  });

  it("links to each surname's page and to the free comparison of the two", () => {
    const html = render("pl");
    expect(html).toContain('href="/pl/nazwisko/kowalski">KOWALSKI</a>');
    expect(html).toContain('href="/pl/nazwisko/nowak">NOWAK</a>');
    expect(html).toContain(
      `href="/pl/porownaj?a=kowalski&amp;b=nowak">${UI.pl.coupleCompareLink}</a>`,
    );
    expect(render("en")).toContain('href="/en/compare?a=kowalski&amp;b=nowak"');
  });

  it("offers the other language for the same pair", () => {
    expect(render("pl")).toContain('href="/en/couple?a=kowalski&amp;b=nowak"');
    expect(render("en")).toContain('href="/pl/para?a=kowalski&amp;b=nowak"');
  });

  it("says which surname it could not find, and shows no part", () => {
    const html = renderToStaticMarkup(
      createElement(CoupleView, {
        a: side("kowalski", KOWALSKI),
        b: { slug: "zzzz", display: null, response: null, path: null },
        names: [],
        lang: "pl",
      }),
    );
    expect(html).toContain(UI.pl.unresolvedHeading);
    expect(html).toContain("zzzz");
    expect(html).not.toContain('id="couple-names"');
  });
});

/** TASK-100 §3.4: no word that judges the couple, in the page's messages or on the page. */
describe("the couple report's wording", () => {
  const BANNED = [
    "pasujecie",
    "pasują",
    "dopasowanie",
    "zgodność",
    "match",
    "compatible",
    "compatibility",
    "made for each other",
    "♥",
    "❤",
  ];

  it("has none of the banned words, and no percentage, in its messages", () => {
    for (const lang of ["pl", "en"] as const) {
      const messages = Object.entries(UI[lang]).filter(([key]) => key.startsWith("couple"));
      expect(messages.length, lang).toBeGreaterThan(0);
      for (const [key, value] of messages) {
        const lower = String(value).toLocaleLowerCase(lang);
        for (const word of BANNED) expect(lower, `${lang}.${key}: ${word}`).not.toContain(word);
        expect(lower, `${lang}.${key}: %`).not.toContain("%");
      }
    }
  });

  it("has none of the banned words on the rendered page or the picker", () => {
    for (const lang of ["pl", "en"] as const) {
      const pages = [
        render(lang),
        renderToStaticMarkup(
          createElement(CouplePicker, { lang, first: "", second: "", error: false }),
        ),
      ];
      for (const html of pages) {
        const lower = text(html).toLocaleLowerCase(lang);
        for (const word of BANNED) expect(lower, `${lang}: ${word}`).not.toContain(word);
      }
    }
  });
});

describe("CouplePicker", () => {
  it("is the comparison's picker with the couple's title, action and address", () => {
    const pl = renderToStaticMarkup(
      createElement(CouplePicker, { lang: "pl", first: "", second: "", error: false }),
    );
    expect(pl).toContain(UI.pl.coupleHeading);
    expect(pl).toContain('action="/pl/para"');
    expect(pl).toContain(`>${UI.pl.coupleAction}</button>`);
    expect(pl).toContain('href="/en/couple"');
    const en = renderToStaticMarkup(
      createElement(CouplePicker, { lang: "en", first: "", second: "", error: false }),
    );
    expect(en).toContain('action="/en/couple"');
  });
});

describe("couplePath", () => {
  it("encodes what came from the query string", () => {
    expect(couplePath("nowak", "kowalski", "pl")).toBe("/pl/para?a=nowak&b=kowalski");
    expect(couplePath("łuczak", 'x"&c=1', "en")).toBe("/en/couple?a=%C5%82uczak&b=x%22%26c%3D1");
  });
});
