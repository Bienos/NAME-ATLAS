import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LANDING_TRIES,
  LandingExpect,
  LandingSteps,
  LandingTools,
  LandingTreeLine,
  LandingTries,
  LandingWhat,
  Scatter,
  trySearchPath,
} from "./landing-sections.js";
import type { LandingExample } from "./landing-sections.js";
import { formatInteger, UI } from "./messages.js";

const LANGS = ["pl", "en"] as const;

/** A hand-made example: the face is whatever `deckCards` rendered; here one line. */
const EXAMPLE: LandingExample = {
  surname: "ZAREMBA",
  deckPath: "/pl/nazwisko/zaremba?view=cards",
  cards: [
    { number: 1, key: "hello", title: "Liczba osób", face: createElement("p", null, "6 064") },
  ],
};

/** TASK-178: the four sections below the hero. */
describe("the landing's four sections", () => {
  it("say what Name Atlas is and why, with the three promises and the way to how it works", () => {
    for (const lang of LANGS) {
      const t = UI[lang];
      const html = renderToStaticMarkup(createElement(LandingWhat, { lang }));
      expect(html).toContain('id="what"');
      expect(html).toContain(t.ldWhatEyebrow);
      expect(html).toContain(`<span class="visually-hidden">${t.ldWhatTitle}</span>`);
      expect(t.ldWhatParagraphs).toHaveLength(3);
      // Markup escapes an apostrophe.
      const esc = (value: string) => value.replace(/'/gu, "&#x27;");
      for (const paragraph of t.ldWhatParagraphs) expect(html).toContain(esc(paragraph));
      expect(t.ldPromises).toHaveLength(3);
      for (const [title, body] of t.ldPromises) {
        expect(html).toContain(`<h3>${esc(title)}</h3>`);
        expect(html).toContain(esc(body));
      }
      expect(html).toContain(
        lang === "pl" ? 'href="/pl/jak-to-dziala"' : 'href="/en/how-it-works"',
      );
    }
  });

  it("say how to use it in three numbered steps, then the surnames to try", () => {
    for (const lang of LANGS) {
      const t = UI[lang];
      const html = renderToStaticMarkup(createElement(LandingSteps, { lang }));
      expect(html).toContain('id="how"');
      expect(t.ldSteps).toHaveLength(3);
      expect(html.match(/<span class="ld-k">0[123]<\/span>/gu)).toHaveLength(3);
      for (const [title, body] of t.ldSteps) {
        expect(html).toContain(`<h3>${title}</h3>`);
        expect(html).toContain(body.replace(/'/gu, "&#x27;"));
      }
      expect(html).toContain('class="landing-try"');
      expect(html).toContain(t.ldHowLede);
    }
  });

  it("offer four surnames as searches, which open their decks, in both languages", () => {
    expect(LANDING_TRIES).toHaveLength(4);
    for (const lang of LANGS) {
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

  it("say what to expect: six questions, each with what answers it, and one real card", () => {
    for (const lang of LANGS) {
      const t = UI[lang];
      const html = renderToStaticMarkup(createElement(LandingExpect, { example: EXAMPLE, lang }));
      expect(html).toContain('id="expect"');
      expect(html).toContain(t.pitchEyebrow);
      expect(t.pitchAnswers).toHaveLength(6);
      for (const [question, answer] of t.pitchAnswers) {
        expect(html).toContain(`<h3>${question}</h3>`);
        expect(html).toContain(`<p>${answer.replace(/'/gu, "&#x27;")}</p>`);
      }
      expect(html).toContain(t.pitchNote);
      // The card is the deck's own face, numbered, with the way to the whole deck.
      expect(html.match(/class="dk-card preview-card ld-card"/gu)).toHaveLength(1);
      expect(html).toContain('aria-label="Liczba osób"');
      expect(html).toContain(">01</span>");
      expect(html).toContain("6 064");
      expect(html).toContain('href="/pl/nazwisko/zaremba?view=cards"');
      expect(html).toContain(t.ldExampleNote.replace(/'/gu, "&#x27;"));
    }
  });

  it("leave the card out, and nothing else, without an example", () => {
    for (const example of [null, { ...EXAMPLE, cards: [] }]) {
      const html = renderToStaticMarkup(createElement(LandingExpect, { example, lang: "en" }));
      expect(html).toContain('id="expect"');
      expect(html).not.toContain("ld-card");
      expect(html).not.toContain("?view=cards");
      expect(html).toContain(UI.en.pitchNote);
    }
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

  it("never say a surname tells where a family lives or comes from", () => {
    for (const lang of LANGS) {
      const t = UI[lang];
      const text = [
        renderToStaticMarkup(createElement(LandingWhat, { lang })),
        renderToStaticMarkup(createElement(LandingSteps, { lang })),
        renderToStaticMarkup(createElement(LandingExpect, { example: EXAMPLE, lang })),
        renderToStaticMarkup(createElement(LandingTools, { figures: null, lang })),
        ...t.analysisSteps,
        t.landingHeadline,
        t.landingHeadlineEm,
        t.landingLede,
        t.landingTrust,
      ]
        .join(" ")
        .toLowerCase();
      for (const wrong of ["mieszka", "pochodzi z", "lives in", "comes from"]) {
        expect(text, `${lang}: ${wrong}`).not.toContain(wrong);
      }
    }
  });
});

describe("the landing's tool tiles (TASK-178)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("link the Atlas, featured, with one figure per surname list and never their sum", () => {
    const figures = { male: 408_182, female: 420_082 };
    for (const lang of LANGS) {
      const t = UI[lang];
      const html = renderToStaticMarkup(createElement(LandingTools, { figures, lang }));
      expect(html).toContain('id="tools"');
      expect(html).toContain(`href="${lang === "pl" ? "/pl/atlas" : "/en/atlas"}"`);
      expect(html).toContain('class="ld-tile ld-tile-feat"');
      expect(html).toContain(`<b>${formatInteger(figures.male, lang)}</b>`);
      expect(html).toContain(`<b>${formatInteger(figures.female, lang)}</b>`);
      expect(html).not.toContain(formatInteger(figures.male + figures.female, lang));
      expect(html).toContain(t.ldTileAtlasTitle);
      expect(html).toContain(lang === "pl" ? 'href="/pl/porownaj"' : 'href="/en/compare"');
      expect(html).toContain(
        lang === "pl" ? 'href="/pl/nazwiska-w-rodzinie"' : 'href="/en/family-surnames"',
      );
      expect(html).toContain(lang === "pl" ? 'href="/pl/oferta"' : 'href="/en/offer"');
      // Nothing to buy here: no form, no button, no price.
      expect(html).not.toContain("<form");
      expect(html).not.toContain("<button");
      expect(html).not.toMatch(/\d zł/u);
    }
  });

  it("show no figures without the artefact, and no tree or baby-names tile while those are off", () => {
    const html = renderToStaticMarkup(createElement(LandingTools, { figures: null, lang: "pl" }));
    expect(html).not.toContain("ld-tile-figs");
    expect(html).not.toContain("/pl/drzewo-rodzinne");
    expect(html).not.toContain("/pl/imiona-dla-dziecka");
  });

  it("add the tree's tile when the tree is on", () => {
    vi.stubEnv("ACCOUNTS_DATABASE_URL", "postgres://app@host/db");
    vi.stubEnv("SITE_ORIGIN", "https://atlas.example.test");
    vi.stubEnv("CRON_SECRET", "c");
    vi.stubEnv("RESEND_API_KEY", "re");
    vi.stubEnv("ACCOUNTS_MAIL_FROM", "a@example.test");
    vi.stubEnv("FAMILY_TREE_ENABLED", "1");
    const html = renderToStaticMarkup(createElement(LandingTools, { figures: null, lang: "en" }));
    expect(html).toContain('href="/en/family-tree"');
    expect(html).toContain(UI.en.ldTileTreeTitle);
  });
});

describe("the family tree's way in on the landing (TASK-084)", () => {
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

  it("is absent while the tree is off", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    expect(renderToStaticMarkup(createElement(LandingTreeLine, { lang: "pl" }))).toBe("");
  });

  it("leads to sign-in that returns to the tree", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    vi.stubEnv("FAMILY_TREE_ENABLED", "1");
    const line = renderToStaticMarkup(createElement(LandingTreeLine, { lang: "pl" }));
    expect(line).toContain('href="/pl/konto/zaloguj?next=%2Fpl%2Fkonto%2Fdrzewa"');
  });
});
