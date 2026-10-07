import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { resolved, unresolved } from "./couple-fixture.js";
import { cardsFor, submissions } from "./family-surnames-state.js";
import type { Card, Entry, Outcome } from "./family-surnames-state.js";
import { FamilyCard, FamilyCards } from "./family-surnames-view.js";
import { FamilySurnamesForm } from "./family-surnames-client.js";
import { FAMILY_SURNAMES_PATHS, familySurnamesMetadata } from "./family-surnames-page.js";
import { formatDate, UI } from "./messages.js";
import { Population, Result } from "./result-view.js";

/**
 * TASK-169's rendering criteria (§11), asserted against rendered markup in the
 * `node` environment, as TASK-017's view tests are: AC-06, AC-09, AC-11,
 * AC-13, AC-14 and AC-15. Every response comes from `couple-fixture.ts`, which
 * parses it with the contract first.
 */

const NOWAK_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc201";
const KOWAL_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc202";

const result = (response: SurnameResultResponse): Outcome => ({ kind: "RESULT", response });
const typed = (surname: string, label: Entry["label"] = null): Entry => ({ surname, label });

function cards(pairs: readonly (readonly [Entry, Outcome])[]): Card[] {
  return cardsFor(
    submissions(pairs.map(([e]) => e)),
    pairs.map(([, o]) => o),
  );
}

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("AC-06 and AC-14 — the inputs", () => {
  for (const lang of ["pl", "en"] as const) {
    const markup = html(createElement(FamilySurnamesForm, { lang }));
    const t = UI[lang];

    it(`${lang}: every surname input has autocomplete off and a neutral name`, () => {
      const inputs = [...markup.matchAll(/<input[^>]*>/gu)].map((m) => m[0]);
      expect(inputs.length).toBeGreaterThan(0);
      inputs.forEach((input, i) => {
        expect(input).toMatch(/autocomplete="off"/iu);
        expect(input).toContain(`name="surname-${String(i + 1)}"`);
      });
    });

    it(`${lang}: the prompt is the generic one, never the mother's maiden name`, () => {
      expect(t.familyInputLabel).toBe(
        lang === "pl" ? "Nazwisko z Twojej rodziny" : "A surname from your family",
      );
      expect(markup).toContain(`>${t.familyInputLabel}</label>`);
      for (const phrase of ["rodowe", "panieńsk", "maiden", "nazwisko matki"]) {
        expect(markup.toLowerCase()).not.toContain(phrase);
      }
    });

    it(`${lang}: each input offers the four labels, optional, and no free-text label`, () => {
      const selects = [...markup.matchAll(/<select[\s\S]*?<\/select>/gu)].map((m) => m[0]);
      const inputs = [...markup.matchAll(/<input[^>]*>/gu)];
      expect(selects).toHaveLength(inputs.length);
      const expected =
        lang === "pl"
          ? ["Twoje nazwisko", "Strona ojca", "Strona matki", "Inne"]
          : ["Your surname", "Father's side", "Mother's side", "Other"];
      for (const select of selects) {
        const options = [...select.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/gu)];
        expect(options.map((o) => o[1])).toEqual(["", "SELF", "FATHER", "MOTHER", "OTHER"]);
        expect(options.slice(1).map((o) => o[2]?.replace(/&#x27;/gu, "'"))).toEqual(expected);
        expect(options[0]?.[2]).toBe(t.familyNoLabel);
      }
      // The only text fields are the surnames themselves.
      expect(markup).not.toMatch(/<textarea/u);
      expect(inputs.every((m) => /name="surname-\d"/u.test(m[0]))).toBe(true);
    });

    it(`${lang}: is not a form, so nothing can be submitted into the URL`, () => {
      expect(markup).not.toMatch(/<form\b/u);
      expect(markup).not.toMatch(/type="submit"/u);
    });
  }
});

describe("AC-09 — every count carries its scope and date, as on the surname page", () => {
  const nowak = resolved({
    id: NOWAK_ID,
    display: "NOWAK",
    counts: [
      [100000, "male"],
      [90000, "female"],
    ],
  });
  for (const lang of ["pl", "en"] as const) {
    it(`${lang}: the card's count chapter is the surname page's own`, () => {
      const [card] = cards([[typed("Nowak"), result(nowak)]]);
      if (card === undefined) throw new Error("no card");
      const markup = html(createElement(FamilyCard, { card, lang }));
      if (nowak.population === null) throw new Error("fixture");
      const chapter = html(
        createElement(Population, {
          section: nowak.population,
          surname: "NOWAK",
          number: 1,
          next: null,
          lang,
        }),
      );
      // Each count's claim — statement, assessment, source, scope and date — is
      // the one the full page renders …
      const page = html(createElement(Result, { response: nowak, lang }));
      const claims = [...chapter.matchAll(/<article class="claim">[\s\S]*?<\/article>/gu)];
      expect(claims).toHaveLength(2);
      for (const claim of claims) expect(page).toContain(claim[0]);
      // … is the card's, under an id of its own (a page may hold four cards).
      const id = /^<section id="([^"]+)"/u.exec(chapter)?.[1] ?? "";
      expect(id).not.toBe("");
      expect(markup).toContain(chapter.replace(`id="${id}"`, `id="count-id-${NOWAK_ID}"`));
      expect(markup).toContain(formatDate("2026-01-20", lang));
      expect(markup).toContain("PESEL");
    });
  }

  it("a surname with no count says so, never a zero", () => {
    const none = resolved({ id: KOWAL_ID, display: "KOWAL", counts: [] });
    const [card] = cards([[typed("Kowal"), result(none)]]);
    if (card === undefined) throw new Error("no card");
    const markup = html(createElement(FamilyCard, { card, lang: "pl" }));
    expect(markup).toContain('class="absent"');
    expect(markup).not.toMatch(/>0</u);
    expect(markup).not.toMatch(/\b0 (?:osób|people)/u);
  });
});

describe("§10 — each card shows its own state", () => {
  const mix = cards([
    [typed("Nowak", "SELF"), result(resolved({ id: NOWAK_ID, display: "NOWAK" }))],
    [typed("Zzyzx", "MOTHER"), result(unresolved())],
    [typed("Kowal"), { kind: "ERROR" }],
    [typed("Lis"), { kind: "RATE_LIMITED" }],
  ]);
  const markup = html(createElement(FamilyCards, { cards: mix, lang: "pl" }));
  const t = UI.pl;

  it("renders one card per input, in input order", () => {
    const order = [...markup.matchAll(/class="family-typed">([^<]*)</gu)].map((m) => m[1]);
    expect(order).toEqual(["Nowak", "Zzyzx", "Kowal", "Lis"]);
    expect(markup.match(/<article class="family-card"/gu)).toHaveLength(4);
  });

  it("an unresolved surname is not found, never zero people, and an error is not 'unknown'", () => {
    const parts = markup.split('<article class="family-card"').slice(1);
    expect(parts[1]).toContain(t.unresolvedHeading);
    expect(parts[2]).toContain(t.unavailableHeading);
    expect(parts[2]).not.toContain(t.unresolvedHeading);
    expect(parts[2]).toContain(t.familyRetry);
    expect(parts[3]).toContain(t.familyRateLimitedHeading);
    expect(parts[3]).toContain(t.familyRetry);
    expect(parts[0]).not.toContain(t.familyRetry);
    expect(parts[1]).not.toContain(t.familyRetry);
  });

  it("an invalid input shows the validation message on its own card only", () => {
    const two = cards([
      [typed("!!"), { kind: "INVALID" }],
      [typed("Nowak"), result(resolved({ id: NOWAK_ID, display: "NOWAK" }))],
    ]);
    const parts = html(createElement(FamilyCards, { cards: two, lang: "pl" }))
      .split('<article class="family-card"')
      .slice(1);
    expect(parts[0]).toContain(t.invalidHeading);
    expect(parts[0]).toContain(t.invalidBody);
    expect(parts[1]).not.toContain(t.invalidHeading);
  });

  it("shows the label beside what was typed, from memory only", () => {
    expect(markup).toContain(`Nowak</span> (${t.familyLabelSelf})`);
    expect(markup).toContain(`Zzyzx</span> (${t.familyLabelMother})`);
  });
});

describe("AC-10 — the cards are the cards and nothing else", () => {
  it("renders exactly the notice and each card as it renders alone", () => {
    const pair = cards([
      [
        typed("Kowal"),
        result(resolved({ id: KOWAL_ID, display: "KOWAL", counts: [[50, "male"]] })),
      ],
      [
        typed("Nowak"),
        result(resolved({ id: NOWAK_ID, display: "NOWAK", counts: [[99999, "male"]] })),
      ],
    ]);
    const together = html(createElement(FamilyCards, { cards: pair, lang: "pl" }));
    const alone = pair.map((card) => html(createElement(FamilyCard, { card, lang: "pl" })));
    expect(together).toBe(
      `<div class="family-results"><p class="family-notice" role="note">${UI.pl.familyNotice}</p>${alone.join("")}</div>`,
    );
  });
});

describe("AC-11 — the notice", () => {
  it("is shown in the page's language whenever there is a card", () => {
    const one = cards([[typed("Zzyzx"), result(unresolved())]]);
    expect(UI.pl.familyNotice).toBe(
      "Każdy wynik opisuje nazwisko jako całość — wszystkie osoby, które je noszą — a nie Twoich krewnych.",
    );
    expect(UI.en.familyNotice).toBe(
      "Each result describes the surname as a whole — everyone who carries it — not your relatives.",
    );
    for (const lang of ["pl", "en"] as const) {
      expect(html(createElement(FamilyCards, { cards: one, lang }))).toContain(
        UI[lang].familyNotice,
      );
      const loading = cards([[typed("Nowak"), { kind: "LOADING" }]]);
      expect(html(createElement(FamilyCards, { cards: loading, lang }))).toContain(
        UI[lang].familyNotice,
      );
    }
  });

  it("is absent only when there is no card", () => {
    expect(html(createElement(FamilyCards, { cards: [], lang: "pl" }))).toBe("");
  });
});

describe("AC-15 — a resolved card links to the full page, and nothing is on offer", () => {
  for (const lang of ["pl", "en"] as const) {
    it(`${lang}: links through the search to the surname's own page`, () => {
      const [card] = cards([
        [typed("nowak"), result(resolved({ id: NOWAK_ID, display: "NOWAK" }))],
      ]);
      if (card === undefined) throw new Error("no card");
      const markup = html(createElement(FamilyCard, { card, lang }));
      const target = lang === "pl" ? "/?surname=NOWAK" : "/?surname=NOWAK&amp;lang=en";
      expect(markup).toContain(
        `<a href="${target}">${UI[lang].familyFullPage.replace("'", "&#x27;")}</a>`,
      );
    });
  }

  it("carries no offer, price, checkout, share action or share card", () => {
    const all = cards([
      [typed("Nowak"), result(resolved({ id: NOWAK_ID, display: "NOWAK", meaning: true }))],
      [typed("Zzyzx"), result(unresolved())],
    ]);
    for (const lang of ["pl", "en"] as const) {
      const markup =
        html(createElement(FamilyCards, { cards: all, lang })) +
        html(createElement(FamilySurnamesForm, { lang }));
      expect(markup).not.toMatch(
        /oferta|\/offer|checkout|zł|PLN|€|\$|udostępnij|\/share|karta\//iu,
      );
      expect(markup).not.toMatch(/<form\b/u);
    }
  });
});

describe("AC-13 — never indexed, and no surname in an address", () => {
  it("both routes are noindex", () => {
    for (const lang of ["pl", "en"] as const) {
      expect(familySurnamesMetadata(lang).robots).toEqual({ index: false, follow: false });
    }
  });

  it("the routes carry no surname and no query", () => {
    expect(FAMILY_SURNAMES_PATHS).toEqual({
      pl: "/pl/nazwiska-w-rodzinie",
      en: "/en/family-surnames",
    });
  });
});
