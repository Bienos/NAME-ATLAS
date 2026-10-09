import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { givenNameListFacts, listFacts } from "@name-atlas/truth";
import { AtlasBody, SURNAME_PLATES, atlasMetadata } from "./atlas-page.js";
import { GIVEN_NAME_PLATES } from "./given-name-atlas.js";
import { LIST_FACTS_FIXTURE } from "./list-atlas.fixture.js";
import { formatInteger, UI } from "./messages.js";
import type { CommonList } from "./common-surnames.js";
import { atlasPath } from "./site-links.js";

const LANGS = ["pl", "en"] as const;

/** Rank claims as `loadCommonLists` returns them; invented, for the markup only. */
const COMMON: CommonList[] = [
  {
    comparability_group: "national_male",
    snapshot_date: "2026-01-20",
    items: [
      { display_name: "ABACKI", rank: 1, path: "/pl/nazwisko/abacki" },
      { display_name: "BABACKI", rank: 2, path: "/pl/nazwisko/babacki" },
    ],
  },
  {
    comparability_group: "national_female",
    snapshot_date: "2026-01-20",
    items: [{ display_name: "ABACKA", rank: 1, path: "/pl/nazwisko/abacka" }],
  },
];

/** TASK-178: the Atlas page. */
describe("the Atlas page", () => {
  it("is the header's and the footer's Atlas, with its own metadata in both languages", () => {
    expect(atlasPath("pl")).toBe("/pl/atlas");
    expect(atlasPath("en")).toBe("/en/atlas");
    for (const lang of LANGS) {
      const metadata = atlasMetadata(lang);
      expect(metadata.title).toBe(UI[lang].atMetaTitle);
      expect(metadata.alternates?.canonical).toBe(atlasPath(lang));
      expect(metadata.alternates?.languages).toEqual({ pl: "/pl/atlas", en: "/en/atlas" });
    }
  });

  it("opens with one ledger per part, one figure per list, never summed, then the chapters", () => {
    const facts = listFacts();
    const given = givenNameListFacts();
    for (const lang of LANGS) {
      const html = renderToStaticMarkup(
        createElement(AtlasBody, { facts, given, common: [], lang }),
      );
      const t = UI[lang];
      expect(html).toContain(`<h1 id="at-title" class="at-title">${t.atTitle}</h1>`);
      expect(html.match(/class="at-ledger"/gu)).toHaveLength(2);
      const m = facts.lists.male.summary;
      const f = facts.lists.female.summary;
      expect(html).toContain(`<span class="at-ledger-v">${formatInteger(m.surnames, lang)}</span>`);
      expect(html).toContain(`<span class="at-ledger-v">${formatInteger(f.surnames, lang)}</span>`);
      expect(html).not.toContain(formatInteger(m.surnames + f.surnames, lang));
      expect(html).not.toContain(formatInteger(m.people + f.people, lang));
      const lastBoys = given.sexes.male.years[given.sexes.male.years.length - 1]!;
      const lastGirls = given.sexes.female.years[given.sexes.female.years.length - 1]!;
      expect(html).toContain(
        `<span class="at-ledger-v">${formatInteger(lastBoys.names, lang)}</span>`,
      );
      expect(html).toContain(
        `<span class="at-ledger-v">${formatInteger(lastGirls.names, lang)}</span>`,
      );
      for (const [id] of [...SURNAME_PLATES, ...GIVEN_NAME_PLATES]) {
        expect(html).toContain(`href="#${id}"`);
        expect(html).toContain(`<article id="${id}"`);
      }
      expect(html).toContain(t.atMethodTitle);
      expect(html).toContain(
        lang === "pl" ? 'href="/pl/jak-to-dziala"' : 'href="/en/how-it-works"',
      );
    }
  });

  it("shows the ten most common from the rank claims on plate 01, each linked to its page", () => {
    const html = renderToStaticMarkup(
      createElement(AtlasBody, {
        facts: LIST_FACTS_FIXTURE,
        given: null,
        common: COMMON,
        lang: "pl",
      }),
    );
    expect(html).toContain('href="/pl/nazwisko/abacki"');
    expect(html).toContain('href="/pl/nazwisko/babacki"');
    expect(html).toContain('href="/pl/nazwisko/abacka"');
    expect(html).toContain('<span class="lf-top-rank">2.</span>');
    expect(html).not.toContain(UI.pl.lfTopUnavailable);
    // Without Part II's artefact, no Part II and no chapter for it.
    expect(html).not.toContain('id="gn-title"');
    expect(html).not.toContain('href="#gn-p12"');
  });

  it("falls back to the artefact's three names on plate 01 without rank claims", () => {
    const html = renderToStaticMarkup(
      createElement(AtlasBody, { facts: LIST_FACTS_FIXTURE, given: null, common: [], lang: "en" }),
    );
    expect(html).toContain(UI.en.lfTopUnavailable);
    expect(html).not.toContain('class="lf-top-rank">1.');
  });

  it("says the surname statistics are unavailable without the artefact, and still renders Part II", () => {
    const given = givenNameListFacts();
    const html = renderToStaticMarkup(
      createElement(AtlasBody, { facts: null, given, common: [], lang: "pl" }),
    );
    expect(html).toContain(UI.pl.atUnavailable);
    expect(html).not.toContain('id="lf-title"');
    expect(html).toContain('id="gn-title"');
    expect(html.match(/class="at-ledger"/gu)).toHaveLength(1);
  });
});
