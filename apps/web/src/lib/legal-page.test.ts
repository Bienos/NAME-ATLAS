import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalView, legalMetadata } from "./legal-page.js";
import {
  CONTROLLER_NAME,
  CONTROLLER_PLACE,
  LEGAL_UPDATED,
  legalDocument,
  legalPath,
} from "./legal-text.js";
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
        expect(html).toContain(`<time dateTime="${LEGAL_UPDATED[kind]}">`);
        for (const s of doc.sections) expect(html).toContain(`<h3>${s.heading}</h3>`);
      }
    }
  });

  it("state the base text's facts and required elements in both languages (legal review 2026-10-04)", () => {
    const privacy = {
      pl: JSON.stringify(legalDocument("privacy", "pl")),
      en: JSON.stringify(legalDocument("privacy", "en")),
    };
    const terms = {
      pl: JSON.stringify(legalDocument("terms", "pl")),
      en: JSON.stringify(legalDocument("terms", "en")),
    };
    expect(privacy.pl).toContain("wybrany temat");
    expect(privacy.en).toContain("the topic you choose");
    expect(privacy.pl).toContain("Zgłoś błąd");
    expect(privacy.en).toContain("Report a problem");
    expect(privacy.pl).toContain("prawo do przenoszenia danych");
    expect(privacy.en).toContain("data portability");
    expect(privacy.pl).toContain("organu nadzorczego w kraju, w którym mieszkasz");
    expect(privacy.en).toContain("the authority where you live");
    expect(privacy.pl).toContain("Czy musisz podać dane");
    expect(privacy.en).toContain("Whether you must give data");
    expect(terms.pl).toContain("treści o charakterze bezprawnym");
    expect(terms.en).toContain("unlawful content");
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

  it("claim no cookies or accounts the site does not have, and name the analytics it has", () => {
    // If one of these ever appears in the site, the notice must change with it.
    // Vercel Web Analytics arrived with #58; the notice names it (TASK-058).
    const pl = JSON.stringify(legalDocument("privacy", "pl"));
    expect(pl).toContain("nie zapisuje w przeglądarce plików cookie");
    expect(pl).toContain("Vercel Web Analytics");
    expect(pl).toContain("zastępuje w nim nazwisko oznaczeniem [slug]");
    expect(pl).not.toContain("zewnętrznych narzędzi analitycznych");
    const en = JSON.stringify(legalDocument("privacy", "en"));
    expect(en).toContain("stores no cookies");
    expect(en).toContain("Vercel Web Analytics");
    expect(en).toContain("replaces the surname in it with [slug]");
    expect(en).not.toContain("third-party analytics");
  });

  it("name Vercel Speed Insights, what it records, the surname's removal and how long it is shown", () => {
    const pl = JSON.stringify(legalDocument("privacy", "pl"));
    expect(pl).toContain("mierzy, też bez nazwiska i bez plików cookie, Vercel Speed Insights");
    expect(pl).toContain("zastępuje w adresie i we wzorcu nazwisko oznaczeniem [slug]");
    expect(pl).toContain("z ostatnich 7 dni");
    expect(pl).toContain("pomiary szybkości stron (Vercel Speed Insights)");
    const en = JSON.stringify(legalDocument("privacy", "en"));
    expect(en).toContain("also without the surname and without cookies, by Vercel Speed Insights");
    expect(en).toContain("replaces the surname in the address and in the pattern with [slug]");
    expect(en).toContain("for the last 7 days");
    expect(en).toContain("page speed measurements (Vercel Speed Insights)");
  });
});
