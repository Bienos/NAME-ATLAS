import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LANDING_TRIES,
  LandingCompare,
  LandingHow,
  LandingOffer,
  LandingPitch,
  LandingTree,
  LandingTreeLine,
  LandingTries,
  Scatter,
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
        renderToStaticMarkup(createElement(LandingPitch, { example: EXAMPLE, lang })),
        ...t.analysisSteps,
        t.landingHeadline,
        t.landingHeadlineEm,
        t.landingLede,
        t.landingTrust,
        t.pitchHeading,
        t.pitchLede,
        t.pitchNote,
        t.previewLede,
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

/** TASK-065: the second screen (what you get, the surnames to try, the cards) and the offer's strip. */
describe("the landing's second screen and offer", () => {
  it("offer four surnames as searches, which open their decks, in both languages", () => {
    expect(LANDING_TRIES).toHaveLength(4);
    for (const lang of ["pl", "en"] as const) {
      const html = renderToStaticMarkup(createElement(LandingTries, { lang }));
      for (const surname of LANDING_TRIES) {
        // Markup escapes the query's ampersand.
        expect(html).toContain(`href="${trySearchPath(surname, lang).replace("&", "&amp;")}"`);
        // The link is named by the whole surname; its letters are flaps, hidden from readers.
        expect(html).toContain(`aria-label="${surname}"`);
        expect(html).toContain(`style="--i:${String(surname.length - 1)}" aria-hidden="true">`);
      }
      expect(html).toContain(UI[lang].landingTry);
    }
    expect(trySearchPath("ŻMUDA-TRZEBIATOWSKI", "pl")).toBe("/?surname=%C5%BBMUDA-TRZEBIATOWSKI");
    expect(trySearchPath("NOWAK", "en")).toBe("/?surname=NOWAK&lang=en");
  });

  it("say what a search gives, in both languages: six questions, each with what answers it", () => {
    for (const lang of ["pl", "en"] as const) {
      const t = UI[lang];
      const html = renderToStaticMarkup(createElement(LandingPitch, { example: null, lang }));
      expect(html).toContain('id="pitch"');
      expect(html).toContain(t.pitchEyebrow);
      // The heading's text, once and whole, then its letters for the motion.
      expect(html).toContain(`<span class="visually-hidden">${t.pitchHeading}</span>`);
      expect(t.pitchAnswers).toHaveLength(6);
      for (const [question, answer] of t.pitchAnswers) {
        expect(html).toContain(`<h3>${question}</h3>`);
        // Markup escapes an apostrophe.
        expect(html).toContain(`<p>${answer.replace(/'/gu, "&#x27;")}</p>`);
      }
      expect(html).toContain(t.pitchNote);
      // The surnames to try are part of the screen; no cards without an example.
      expect(html).toContain('class="landing-try"');
      expect(html).not.toContain("preview-cards");
    }
  });

  it("show the example's faces as the deck's own cards, numbered, with the way to the whole deck", () => {
    const html = renderToStaticMarkup(
      createElement(LandingPitch, { example: EXAMPLE, lang: "pl" }),
    );
    expect(html).toContain('dla nazwiska <span lang="pl">ZAREMBA</span>:');
    expect(html.match(/class="dk-card preview-card"/gu)).toHaveLength(2);
    expect(html).toContain('aria-label="Rzadkość"');
    expect(html).toContain(">02</span>");
    expect(html).toContain(">04</span>");
    expect(html).toContain("1 na 1 743");
    expect(html).toContain("mazowieckie");
    expect(html).toContain('href="/pl/nazwisko/zaremba?view=cards"');
  });

  it("keep a scattered text whole for readers, and give each letter a start of its own", () => {
    const html = renderToStaticMarkup(createElement(Scatter, { text: "Każde nazwisko" }));
    expect(html).toContain('<span class="visually-hidden">Każde nazwisko</span>');
    expect(html).toContain('<span class="scatter" aria-hidden="true">');
    expect(html.match(/class="scatter-word"/gu)).toHaveLength(2);
    expect(html.match(/class="scatter-letter"/gu)).toHaveLength(13);
    expect(html).toMatch(/style="--i:0;--dx:[-\d]+px;--dy:[-\d]+px;--r:[-\d]+deg"/u);
    // The same start on every render: the server's and the browser's agree.
    expect(renderToStaticMarkup(createElement(Scatter, { text: "Każde nazwisko" }))).toBe(html);
  });

  it("deal the cards face down, each with a back that says only whose deck it is", () => {
    const html = renderToStaticMarkup(
      createElement(LandingPitch, { example: EXAMPLE, lang: "pl" }),
    );
    expect(html.match(/class="flip" style="--i:\d"/gu)).toHaveLength(2);
    expect(html.match(/class="flip-back" aria-hidden="true"/gu)).toHaveLength(2);
    expect(html).toContain('<span class="flip-back-name">ZAREMBA</span>');
  });

  it("leave the cards out, and nothing else, when the example has none", () => {
    const empty: LandingExample = { ...EXAMPLE, cards: [] };
    const html = renderToStaticMarkup(createElement(LandingPitch, { example: empty, lang: "en" }));
    expect(html).toContain('id="pitch"');
    expect(html).not.toContain("pitch-cards");
    expect(html).not.toContain(UI.en.previewLede);
    expect(html).not.toContain("?view=cards");
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

describe("the family tree's ways in on the landing (TASK-084)", () => {
  const ON = {
    ACCOUNTS_DATABASE_URL: "postgres://app@host/db",
    SITE_ORIGIN: "https://atlas.example.test",
    CRON_SECRET: "c",
    RESEND_API_KEY: "re",
    ACCOUNTS_MAIL_FROM: "a@example.test",
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("are absent while the tree is off", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    expect(renderToStaticMarkup(createElement(LandingTree, { lang: "pl" }))).toBe("");
    expect(renderToStaticMarkup(createElement(LandingTreeLine, { lang: "pl" }))).toBe("");
  });

  it("lead to sign-in that returns to the tree, and to Google when it is configured", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    vi.stubEnv("FAMILY_TREE_ENABLED", "1");
    const line = renderToStaticMarkup(createElement(LandingTreeLine, { lang: "pl" }));
    expect(line).toContain('href="/pl/konto/zaloguj?next=%2Fpl%2Fkonto%2Fdrzewa"');
    const noGoogle = renderToStaticMarkup(createElement(LandingTree, { lang: "pl" }));
    expect(noGoogle).not.toContain("/api/account/google");
    for (const point of UI.pl.landingTreePoints) expect(noGoogle).toContain(point);

    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    const html = renderToStaticMarkup(createElement(LandingTree, { lang: "en" }));
    expect(html.replaceAll("&amp;", "&")).toContain(
      'href="/api/account/google?lang=en&next=%2Fen%2Faccount%2Ftrees"',
    );
    expect(html).toContain(UI.en.landingTreeGoogle);
    expect(html).toContain('href="/en/family-tree"');
  });
});
