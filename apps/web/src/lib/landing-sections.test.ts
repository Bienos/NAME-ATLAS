import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LANDING_TRIES,
  LandingCompare,
  LandingCue,
  LandingHow,
  LandingOffer,
  LandingPreview,
  LandingTries,
  trySearchPath,
} from "./landing-sections.js";
import type { LandingExample } from "./landing-sections.js";
import { UI } from "./messages.js";
import { offerDocument } from "./offer-text.js";

/** TASK-053: the landing's last two sections. */
describe("the landing's how-it-works and compare sections", () => {
  it("state the three rules and link to the page that explains them, in both languages", () => {
    for (const lang of ["pl", "en"] as const) {
      const html = renderToStaticMarkup(createElement(LandingHow, { lang }));
      expect(UI[lang].landingHowPoints).toHaveLength(3);
      for (const point of UI[lang].landingHowPoints) expect(html).toContain(point);
      expect(html).toContain(
        lang === "pl" ? 'href="/pl/jak-to-dziala"' : 'href="/en/how-it-works"',
      );
    }
  });

  it("send two typed surnames to the comparison, with ids of their own", () => {
    const pl = renderToStaticMarkup(createElement(LandingCompare, { lang: "pl" }));
    expect(pl).toContain('action="/pl/porownaj" method="get"');
    expect(pl).toMatch(/<input id="landing-qa"[^>]* name="qa"\/>/u);
    expect(pl).toMatch(/<input id="landing-qb"[^>]* name="qb"\/>/u);
    expect(pl).not.toContain('id="surname"');
    const en = renderToStaticMarkup(createElement(LandingCompare, { lang: "en" }));
    expect(en).toContain('action="/en/compare" method="get"');
  });

  it("never say a surname tells where a family lives or comes from", () => {
    for (const lang of ["pl", "en"] as const) {
      const t = UI[lang];
      const text = [
        renderToStaticMarkup(createElement(LandingHow, { lang })),
        renderToStaticMarkup(createElement(LandingCompare, { lang })),
        renderToStaticMarkup(createElement(LandingOffer, { lang })),
        renderToStaticMarkup(createElement(LandingTries, { lang })),
        renderToStaticMarkup(createElement(LandingPreview, { example: EXAMPLE, lang })),
        ...t.analysisSteps,
        t.landingHeadline,
        t.landingHeadlineEm,
        t.landingLede,
        t.landingTrust,
        t.previewHeading,
        t.previewLede,
        t.previewShare,
        t.offerHeading,
      ]
        .join(" ")
        .toLowerCase();
      for (const wrong of ["mieszka", "pochodzi z", "lives in", "comes from"]) {
        expect(text, `${lang}: ${wrong}`).not.toContain(wrong);
      }
    }
  });
});

/** A hand-made example: the faces are whatever `deckCards` rendered; here one line each. */
const EXAMPLE: LandingExample = {
  surname: "ZAREMBA",
  deckPath: "/pl/nazwisko/zaremba?view=cards",
  cards: [
    { number: 2, key: "rarity", title: "Rzadkość", face: createElement("p", null, "1 na 1 743") },
    { number: 4, key: "where", title: "Gdzie", face: createElement("p", null, "mazowieckie") },
  ],
};

/** TASK-065: the hero's first tap, the cards before a search, the offer's strip. */
describe("the landing's tries, cue, preview and offer", () => {
  it("offer four surnames as searches, which open their decks, in both languages", () => {
    expect(LANDING_TRIES).toHaveLength(4);
    for (const lang of ["pl", "en"] as const) {
      const html = renderToStaticMarkup(createElement(LandingTries, { lang }));
      for (const surname of LANDING_TRIES) {
        // Markup escapes the query's ampersand.
        expect(html).toContain(`href="${trySearchPath(surname, lang).replace("&", "&amp;")}"`);
        expect(html).toContain(`>${surname}</a>`);
      }
      expect(html).toContain(UI[lang].landingTry);
    }
    expect(trySearchPath("ŻMUDA-TRZEBIATOWSKI", "pl")).toBe("/?surname=%C5%BBMUDA-TRZEBIATOWSKI");
    expect(trySearchPath("NOWAK", "en")).toBe("/?surname=NOWAK&lang=en");
  });

  it("point down the page from the foot of the hero", () => {
    const html = renderToStaticMarkup(
      createElement(LandingCue, { lang: "pl", target: "#preview" }),
    );
    expect(html).toContain('class="landing-cue" href="#preview"');
    expect(html).toContain(UI.pl.landingCue);
  });

  it("show the example's faces as the deck's own cards, numbered, with the way to the whole deck", () => {
    const html = renderToStaticMarkup(
      createElement(LandingPreview, { example: EXAMPLE, lang: "pl" }),
    );
    expect(html).toContain('id="preview"');
    expect(html).toContain(UI.pl.previewHeading);
    expect(html).toContain('dla nazwiska <b lang="pl">ZAREMBA</b>:');
    expect(html.match(/class="dk-card preview-card"/gu)).toHaveLength(2);
    expect(html).toContain('aria-label="Rzadkość"');
    expect(html).toContain(">02</span>");
    expect(html).toContain(">04</span>");
    expect(html).toContain("1 na 1 743");
    expect(html).toContain("mazowieckie");
    expect(html).toContain('href="/pl/nazwisko/zaremba?view=cards"');
    expect(html).toContain(UI.pl.previewShare);
  });

  it("show nothing without an example or without cards", () => {
    expect(renderToStaticMarkup(createElement(LandingPreview, { example: null, lang: "pl" }))).toBe(
      "",
    );
    const empty: LandingExample = { ...EXAMPLE, cards: [] };
    expect(
      renderToStaticMarkup(createElement(LandingPreview, { example: empty, lang: "en" })),
    ).toBe("");
  });

  it("name the tiers with the offer page's own words, status and prices, and link there", () => {
    for (const lang of ["pl", "en"] as const) {
      const html = renderToStaticMarkup(createElement(LandingOffer, { lang }));
      const doc = offerDocument(lang);
      expect(doc.tiers).toHaveLength(3);
      for (const tier of doc.tiers) {
        expect(html).toContain(`<h3>${tier.name}</h3>`);
        expect(html).toContain(`<p class="strip-price">${tier.price}</p>`);
      }
      expect(html).toContain(`<p class="strip-status">${doc.now}</p>`);
      expect(html).toContain(`<p class="strip-status">${doc.soon}</p>`);
      expect(html.match(/class="is-now"/gu)).toHaveLength(1);
      expect(html.match(/class="is-soon"/gu)).toHaveLength(2);
      const offer = lang === "pl" ? "/pl/oferta" : "/en/offer";
      expect(html).toContain(`href="${offer}"`);
      expect(html).toContain(`href="${offer}#tier-family"`);
      expect(html).toContain(doc.lede);
      // Nothing to buy here: no form, no button.
      expect(html).not.toContain("<form");
      expect(html).not.toContain("<button");
    }
  });
});
