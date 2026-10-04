import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL } from "./contact.js";
import { legalDocument, LEGAL_UPDATED } from "./legal-text.js";
import { htmlLang } from "./messages.js";
import { OfferView, offerMetadata } from "./offer-page.js";
import {
  ANSWER_MAX,
  EMPTY_ENQUIRY,
  enquiryMailto,
  mailtoHref,
  offerDocument,
  waitlistMailto,
} from "./offer-text.js";
import { SiteFooter } from "./site-footer.js";
import { SiteNav } from "./site-nav.js";
import { followLinks, offerPath } from "./site-links.js";

const LANGS = ["pl", "en"] as const;

/** The subject and body a `mailto:` carries, decoded. */
function mail(href: string): { to: string; subject: string; body: string } {
  const url = new URL(href);
  return {
    to: url.pathname,
    subject: url.searchParams.get("subject") ?? "",
    body: url.searchParams.get("body") ?? "",
  };
}

/** Markup with `&amp;` written back to `&`, so a rendered `href` compares to the string that built it. */
function render(lang: "pl" | "en"): string {
  return renderToStaticMarkup(createElement(OfferView, { lang })).replaceAll("&amp;", "&");
}

describe("the offer page (TASK-057, ADR-0026)", () => {
  it("shows three tiers with their prices, the paid two as coming (AC-1)", () => {
    const prices = { pl: ["0 zł", "29,99 zł", "499 zł"], en: ["PLN 0", "PLN 29.99", "PLN 499"] };
    for (const lang of LANGS) {
      const html = render(lang);
      const doc = offerDocument(lang);
      expect(html).toContain(`<main lang="${htmlLang(lang)}"`);
      expect(doc.tiers.map((t) => t.price)).toEqual(prices[lang]);
      expect(doc.tiers.map((t) => t.soon)).toEqual([false, true, true]);
      for (const tier of doc.tiers) {
        expect(html).toContain(`<h2 id="tier-${tier.key}">${tier.name}</h2>`);
        expect(html).toContain(`<p class="offer-price">${tier.price}</p>`);
      }
      expect(html.match(new RegExp(`<p class="offer-status">${doc.soon}</p>`, "gu"))?.length).toBe(
        2,
      );
      expect(html).toContain(doc.nothingOnSale);
    }
  });

  it("has no way to buy anything (AC-1)", () => {
    for (const lang of LANGS) {
      const html = render(lang).toLowerCase();
      for (const word of ["kup", "zamów", "zapłać", "buy", "checkout", "pay now", "stripe"]) {
        expect(html, `${lang}: ${word}`).not.toContain(word);
      }
    }
  });

  it("without script, offers each form as a prefilled email to the owner (AC-2)", () => {
    for (const lang of LANGS) {
      const html = render(lang);
      const doc = offerDocument(lang);
      expect(html).toContain(`href="${waitlistMailto("", lang)}"`);
      expect(html).toContain(`href="${enquiryMailto(EMPTY_ENQUIRY, lang)}"`);
      expect(html).toContain(doc.waitlist.fallback);
      expect(html).toContain(doc.enquiry.fallback);
      expect(html).toContain(doc.noDna);
    }
  });

  it("puts the tier in the subject and the reader's words in the body (AC-2)", () => {
    const w = mail(waitlistMailto("  Zaremba ", "pl"));
    expect(w.to).toBe(CONTACT_EMAIL);
    expect(w.subject).toBe("Lista oczekujących: Nazwisko i rodzina (29,99 zł)");
    expect(w.body.split("\n").at(-1)).toBe("Nazwisko, które Cię interesuje: Zaremba");

    const e = mail(
      enquiryMailto(
        {
          name: "Anna Nowak",
          surnames: "Nowak, Żak",
          places: "Iława 1890",
          goal: "Kim był pradziadek?",
          dna: "y",
        },
        "pl",
      ),
    );
    expect(e.to).toBe(CONTACT_EMAIL);
    expect(e.subject).toBe("Zapytanie: Genealogia z DNA (499 zł)");
    expect(e.body).toContain("Imię i nazwisko: Anna Nowak");
    expect(e.body).toContain("Nazwiska w rodzinie, których szukasz: Nowak, Żak");
    expect(e.body).toContain("Miejsca i lata, które znasz: Iława 1890");
    expect(e.body).toContain("Co chcesz odkryć?: Kim był pradziadek?");
    expect(e.body).toContain("Czy masz test DNA? Tak, Y-DNA");

    const en = mail(enquiryMailto(EMPTY_ENQUIRY, "en"));
    expect(en.subject).toBe("Enquiry: Genealogy with DNA (PLN 499)");
    expect(en.body.split("\n").at(-1)).toBe("Do you have a DNA test?");
  });

  it("encodes a space as %20, never +, and caps each answer (AC-2)", () => {
    const href = mailtoHref("a b+c", ["x y"]);
    expect(href).toBe(`mailto:${CONTACT_EMAIL}?subject=a%20b%2Bc&body=x%20y`);
    const long = mail(waitlistMailto("x".repeat(ANSWER_MAX + 50), "en"));
    expect(long.body).toContain(`: ${"x".repeat(ANSWER_MAX)}`);
    expect(long.body).not.toContain("x".repeat(ANSWER_MAX + 1));
  });

  it("is linked from the header and the footer, and the footer carries the blog and socials (AC-3)", () => {
    for (const lang of LANGS) {
      const nav = renderToStaticMarkup(
        createElement(SiteNav, { lang, otherPath: "/", current: "offer" }),
      );
      expect(nav).toContain(`href="${offerPath(lang)}" aria-current="page"`);
      const footer = renderToStaticMarkup(createElement(SiteFooter, { lang }));
      expect(footer).toContain(`href="${offerPath(lang)}"`);
      for (const label of ["Blog", "Instagram", "TikTok", "YouTube"])
        expect(footer).toContain(`>${label}</a>`);
      // The blog has its own index since TASK-071; the three social links still lead home.
      expect(
        followLinks(lang)
          .filter((l) => l.label !== "Blog")
          .every((l) => l.href === (lang === "en" ? "/?lang=en" : "/")),
      ).toBe(true);
    }
    expect(offerMetadata("en").alternates?.canonical).toBe("/en/offer");
    expect(render("pl")).toContain('href="/en/offer" hrefLang="en"');
  });

  it("names nobody but the owner: the genealogy partner stays unnamed (ADR-0026 §2.4)", () => {
    for (const lang of LANGS) {
      expect(JSON.stringify(offerDocument(lang)).toLowerCase()).not.toContain("legacy");
    }
  });

  it("is matched by the privacy notice: the forms, the DNA request and a new date (AC-4)", () => {
    // 2026-10-01 for the offer's forms; later changes move it on (TASK-073: 2026-10-03).
    expect(LEGAL_UPDATED.privacy >= "2026-10-01").toBe(true);
    // The offer did not change the terms; the legal review of 2026-10-04 did.
    expect(LEGAL_UPDATED.terms).toBe("2026-10-04");
    const pl = JSON.stringify(legalDocument("privacy", "pl"));
    expect(pl).toContain("Formularze na stronie oferty niczego nie wysyłają do serwisu");
    expect(pl).toContain("Nie wysyłaj nam wyników testu DNA");
    expect(pl).toContain("art. 6 ust. 1 lit. b RODO");
    const en = JSON.stringify(legalDocument("privacy", "en"));
    expect(en).toContain("The forms on the offer page send nothing to the site");
    expect(en).toContain("Do not send us DNA results");
    expect(en).toContain("Article 6(1)(b) GDPR");
  });
});
