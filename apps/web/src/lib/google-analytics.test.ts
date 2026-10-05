import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CONSENT_COPY,
  CONSENT_DEFAULT,
  GA_MEASUREMENT_ID,
  GA_SCRIPT_URL,
  consentLang,
  gaCounts,
  gaPageParams,
  parseConsent,
} from "./google-analytics.js";
import { LegalView } from "./legal-page.js";
import { legalDocument } from "./legal-text.js";

const HOST = "https://name-atlas-two.vercel.app";

describe("TASK-109 AC-1: Google Analytics never sees a surname", () => {
  it("redacts the address, the title and the referrer", () => {
    expect(
      gaPageParams(`${HOST}/pl/nazwisko/kowalski?view=cards#x`, `${HOST}/?surname=Kowalski`),
    ).toEqual({
      page_location: `${HOST}/pl/nazwisko/[slug]`,
      page_title: "/pl/nazwisko/[slug]",
      page_referrer: `${HOST}/`,
    });
    expect(gaPageParams(`${HOST}/en/surname/nowak/card/rarity`, "")).toEqual({
      page_location: `${HOST}/en/surname/[slug]/card/rarity`,
      page_title: "/en/surname/[slug]/card/rarity",
    });
    expect(gaPageParams(`${HOST}/pl/oferta`, "https://www.google.com/search?q=kowalski")).toEqual({
      page_location: `${HOST}/pl/oferta`,
      page_title: "/pl/oferta",
      page_referrer: "https://www.google.com/search",
    });
  });

  it("sends nothing for an address it cannot read", () => {
    expect(gaPageParams("http://", "")).toBeNull();
  });
});

describe("TASK-109 AC-2: consent first, ads off", () => {
  it("reads only a stored choice it knows", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("yes")).toBeNull();
  });

  it("starts from everything denied", () => {
    expect(Object.values(CONSENT_DEFAULT).every((v) => v === "denied")).toBe(true);
    expect(GA_MEASUREMENT_ID).toBe("G-ZC9D1RK4NN");
  });

  it("speaks the page's language", () => {
    expect(consentLang("/en/surname/nowak")).toBe("en");
    expect(consentLang("/en")).toBe("en");
    expect(consentLang("/")).toBe("pl");
    expect(consentLang("/pl/nazwisko/nowak")).toBe("pl");
    expect(consentLang("/english")).toBe("pl");
  });
});

describe("TASK-109 AC-3: the privacy notice names Google Analytics and lets you change your mind", () => {
  it("says what it is, on what basis, and that the surname is removed", () => {
    const pl = JSON.stringify(legalDocument("privacy", "pl"));
    expect(pl).toContain("Google Analytics");
    expect(pl).toContain("art. 6 ust. 1 lit. a RODO");
    expect(pl).toContain("_ga");
    const en = JSON.stringify(legalDocument("privacy", "en"));
    expect(en).toContain("Article 6(1)(a) GDPR");
    for (const accounts of [true, false]) {
      expect(JSON.stringify(legalDocument("privacy", "pl", accounts))).toContain(
        "Google Ireland Limited",
      );
    }
  });

  it("renders the button that reopens the banner on the privacy page only", () => {
    for (const lang of ["pl", "en"] as const) {
      const html = renderToStaticMarkup(createElement(LegalView, { kind: "privacy", lang }));
      expect(html).toContain(CONSENT_COPY[lang].change);
      const terms = renderToStaticMarkup(createElement(LegalView, { kind: "terms", lang }));
      expect(terms).not.toContain(CONSENT_COPY[lang].change);
    }
  });
});

describe("TASK-114 AC-1: the tag on every page, counting on production only", () => {
  it("names the measurement id in the script every page loads", () => {
    expect(GA_SCRIPT_URL).toBe("https://www.googletagmanager.com/gtag/js?id=G-ZC9D1RK4NN");
  });

  it("counts on production's host and nowhere else", () => {
    expect(gaCounts("name-atlas.pl")).toBe(true);
    for (const host of [
      "localhost",
      "127.0.0.1",
      "staging.name-atlas.pl",
      "name-atlas-two.vercel.app",
      "name-atlas-git-main-bienos.vercel.app",
      "name-atlas.pl.example.com",
    ]) {
      expect(gaCounts(host)).toBe(false);
    }
  });
});

describe("TASK-114 AC-3: the notice and the banner say page views go without cookies", () => {
  it("says the script loads on every page, cookies wait for consent, and names both bases", () => {
    const pl = JSON.stringify(legalDocument("privacy", "pl"));
    expect(pl).toContain("Skrypt Google jest wczytywany na każdej stronie");
    expect(pl).toContain("Google nie zapisuje w przeglądarce plików cookie");
    expect(pl).toContain("wiedzy, które strony są czytane (art. 6 ust. 1 lit. f RODO)");
    expect(pl).toContain("ich podstawą jest Twoja zgoda (art. 6 ust. 1 lit. a RODO)");
    expect(pl).not.toContain("Bez zgody skrypt Google nie jest wczytywany");
    const en = JSON.stringify(legalDocument("privacy", "en"));
    expect(en).toContain("Google's script is loaded on every page");
    expect(en).toContain("Google stores no cookies in your browser");
    expect(en).toContain("knowing which pages are read (Article 6(1)(f) GDPR)");
    expect(en).toContain("their basis is your consent (Article 6(1)(a) GDPR)");
    expect(en).not.toContain("Without consent, Google's script is not loaded");
    for (const accounts of [true, false]) {
      expect(JSON.stringify(legalDocument("privacy", "pl", accounts))).toContain(
        "pliki cookie tylko po Twojej zgodzie",
      );
    }
  });

  it("tells the visitor on the banner that page views are counted without cookies", () => {
    expect(CONSENT_COPY.pl.text).toContain(
      "Bez Twojej zgody Google liczy odsłony bez plików cookie",
    );
    expect(CONSENT_COPY.en.text).toContain(
      "Without your consent Google counts page views without cookies",
    );
  });
});
