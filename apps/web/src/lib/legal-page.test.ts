import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalView, legalMetadata } from "./legal-page.js";
import { CONTROLLER_NAME, CONTROLLER_PLACE, legalDocument, legalPath } from "./legal-text.js";
import type { LegalKind } from "./legal-text.js";
import { CONTACT_EMAIL } from "./contact.js";
import { SiteFooter } from "./site-footer.js";
import { htmlLang } from "./messages.js";

const KINDS: readonly LegalKind[] = ["privacy", "terms"];
const LANGS = ["pl", "en"] as const;

describe("legal pages (TASK-046)", () => {
  it("render every section in each language, with the date", () => {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        const html = renderToStaticMarkup(createElement(LegalView, { kind, lang }));
        const doc = legalDocument(kind, lang);
        expect(html).toContain(`<main lang="${htmlLang(lang)}"`);
        expect(html).toContain(`<h2>${doc.title}</h2>`);
        expect(html).toContain('<time dateTime="2026-09-30">');
        for (const s of doc.sections) expect(html).toContain(`<h3>${s.heading}</h3>`);
      }
    }
  });

  it("name the controller and the contact in both documents and languages", () => {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        const text = JSON.stringify(legalDocument(kind, lang));
        expect(text).toContain(CONTROLLER_NAME);
        expect(text).toContain(CONTROLLER_PLACE);
        expect(text).toContain(CONTACT_EMAIL);
      }
    }
  });

  it("have the same sections in Polish and English", () => {
    for (const kind of KINDS) {
      expect(legalDocument(kind, "pl").sections.length).toBe(
        legalDocument(kind, "en").sections.length,
      );
    }
  });

  it("switch language to the same document, and name their canonical address", () => {
    const pl = renderToStaticMarkup(createElement(LegalView, { kind: "privacy", lang: "pl" }));
    expect(pl).toContain('href="/en/privacy" hrefLang="en" lang="en" aria-label="English">EN</a>');
    const en = renderToStaticMarkup(createElement(LegalView, { kind: "terms", lang: "en" }));
    expect(en).toContain('href="/pl/regulamin" hrefLang="pl" lang="pl" aria-label="Polski">PL</a>');
    expect(legalMetadata("privacy", "pl").alternates?.canonical).toBe("/pl/prywatnosc");
    expect(legalMetadata("terms", "en").alternates?.canonical).toBe("/en/terms");
  });

  it("are linked from the footer every page renders", () => {
    for (const lang of LANGS) {
      const html = renderToStaticMarkup(createElement(SiteFooter, { lang }));
      expect(html).toContain(`href="${legalPath("privacy", lang)}"`);
      expect(html).toContain(`href="${legalPath("terms", lang)}"`);
    }
  });

  it("claim no cookies, analytics or accounts the site does not have", () => {
    // If one of these ever appears in the site, the notice must change with it.
    const pl = JSON.stringify(legalDocument("privacy", "pl"));
    expect(pl).toContain("nie zapisuje w przeglądarce plików cookie");
    const en = JSON.stringify(legalDocument("privacy", "en"));
    expect(en).toContain("stores no cookies");
  });
});
