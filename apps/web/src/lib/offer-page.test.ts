import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { legalDocument, LEGAL_UPDATED } from "./legal-text.js";
import { htmlLang } from "./messages.js";
import { OfferView, offerMetadata } from "./offer-page.js";
import {
  ANSWER_MAX,
  contactHref,
  EMPTY_ENQUIRY,
  enquiryHref,
  offerDocument,
  waitlistHref,
} from "./offer-text.js";
import { SiteFooter } from "./site-footer.js";
import { SiteNav } from "./site-nav.js";
import { contactPath, followLinks, offerPath } from "./site-links.js";

const LANGS = ["pl", "en"] as const;

/**
 * What a form's link hands the contact form, decoded: the page, the topic, and
 * the message as its first line (the subject) and the lines after the blank one.
 */
function mail(href: string): { page: string; topic: string; subject: string; body: string } {
  const at = href.indexOf("#");
  const params = new URLSearchParams(href.slice(at + 1));
  const message = params.get("message") ?? "";
  const [subject = "", ...rest] = message.split("\n");
  return {
    page: href.slice(0, at),
    topic: params.get("topic") ?? "",
    subject,
    body: rest.slice(1).join("\n"),
  };
}

/** Markup with `&amp;` written back to `&`, so a rendered `href` compares to the string that built it. */
function render(lang: "pl" | "en"): string {
  return renderToStaticMarkup(createElement(OfferView, { lang })).replaceAll("&amp;", "&");
}

describe("the offer page (TASK-057, TASK-104, ADR-0037)", () => {
  it("shows five tiers with their prices, the paid four as coming (TASK-104 AC-1)", () => {
    const prices = {
      pl: ["0 zł", "28,99 zł", "89,99 zł", "199 zł", "800 zł"],
      en: ["PLN 0", "PLN 28.99", "PLN 89.99", "PLN 199", "PLN 800"],
    };
    for (const lang of LANGS) {
      const html = render(lang);
      const doc = offerDocument(lang);
      expect(html).toContain(`<main lang="${htmlLang(lang)}"`);
      expect(doc.tiers.map((t) => t.price)).toEqual(prices[lang]);
      expect(doc.tiers.map((t) => t.soon)).toEqual([false, true, true, true, true]);
      for (const tier of doc.tiers) {
        expect(html).toContain(`<h2 id="tier-${tier.key}">${tier.name}</h2>`);
        expect(html).toContain(`<p class="offer-price">${tier.price}</p>`);
      }
      expect(html.match(new RegExp(`<p class="offer-status">${doc.soon}</p>`, "gu"))?.length).toBe(
        4,
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

  it("without script, offers each form as a link to the contact form with the message prefilled, and shows no address (AC-2)", () => {
    for (const lang of LANGS) {
      const html = render(lang);
      const doc = offerDocument(lang);
      for (const tier of ["smaller", "couple", "family"] as const)
        expect(html).toContain(`href="${waitlistHref(tier, "", lang)}"`);
      expect(html).toContain(`href="${enquiryHref(EMPTY_ENQUIRY, lang)}"`);
      expect(html).toContain(doc.waitlist.fallback);
      expect(html).toContain(doc.enquiry.fallback);
      expect(html).toContain(doc.noDna);
      expect(html).toContain(`<a href="${contactPath(lang)}">${doc.writeYourself}</a>`);
      expect(html).not.toContain("mailto:");
      expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/u);
    }
  });

  it("puts the tier in the subject and the reader's words in the body, under the form's last topic (AC-2)", () => {
    const w = mail(waitlistHref("smaller", "  Zaremba ", "pl"));
    expect(w.page).toBe(contactPath("pl"));
    expect(w.topic).toBe("Inne");
    expect(w.subject).toBe("Lista oczekujących: Małe poszukiwania (28,99 zł)");
    expect(mail(waitlistHref("couple", "", "en")).subject).toBe("Waiting list: Couple (PLN 89.99)");
    expect(mail(waitlistHref("family", "", "pl")).subject).toBe(
      "Lista oczekujących: Przegląd rodziny (199 zł)",
    );
    expect(w.body.split("\n").at(-1)).toBe("Nazwisko, które Cię interesuje: Zaremba");

    const e = mail(
      enquiryHref(
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
    expect(e.page).toBe(contactPath("pl"));
    expect(e.topic).toBe("Inne");
    expect(e.subject).toBe("Zapytanie: Badanie genealogiczne (800 zł)");
    expect(e.body).toContain("Imię i nazwisko: Anna Nowak");
    expect(e.body).toContain("Nazwiska w rodzinie, których szukasz: Nowak, Żak");
    expect(e.body).toContain("Miejsca i lata, które znasz: Iława 1890");
    expect(e.body).toContain("Co chcesz odkryć?: Kim był pradziadek?");
    expect(e.body).toContain("Czy masz test DNA? Tak, Y-DNA");

    const en = mail(enquiryHref(EMPTY_ENQUIRY, "en"));
    expect(en.page).toBe(contactPath("en"));
    expect(en.topic).toBe("Something else");
    expect(en.subject).toBe("Enquiry: Genealogist research (PLN 800)");
    expect(en.body.split("\n").at(-1)).toBe("Do you have a DNA test?");
  });

  it("hands the message over in one fragment, nothing for the server, and caps each answer (AC-2)", () => {
    const href = contactHref("pl", "a b+c", ["x y"]);
    expect(href.startsWith(`${contactPath("pl")}#`)).toBe(true);
    expect(href.indexOf("#")).toBe(href.lastIndexOf("#"));
    expect(href).not.toContain("?");
    expect(mail(href)).toEqual({
      page: "/pl/kontakt",
      topic: "Inne",
      subject: "a b+c",
      body: "x y",
    });
    const long = mail(waitlistHref("smaller", "x".repeat(ANSWER_MAX + 50), "en"));
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

  it("lists only what the owner confirmed, the same in both languages (ADR-0037 §2)", () => {
    for (const lang of LANGS) {
      const doc = offerDocument(lang);
      const byKey = new Map(doc.tiers.map((t) => [t.key, t]));
      const unlock = byKey.get("smaller")?.items[0] ?? "";
      expect(unlock).toMatch(/5/u);
      // Any paid tier unlocks the tree (D-025); 28,99 zł and 199 zł hold nothing else confirmed.
      for (const key of ["smaller", "couple", "family", "genealogy"] as const)
        expect(byKey.get(key)?.items.at(-1)).toBe(unlock);
      expect(byKey.get("smaller")?.items).toHaveLength(1);
      expect(byKey.get("family")?.items).toHaveLength(1);
      expect(byKey.get("couple")?.items).toHaveLength(2);
      expect(byKey.get("free")?.note).toMatch(/5/u);
    }
    const shape = (lang: "pl" | "en") =>
      offerDocument(lang).tiers.map((t) => [t.key, t.soon, t.items.length, t.note === undefined]);
    expect(shape("pl")).toEqual(shape("en"));
  });

  it("is matched by the privacy notice: the forms, the DNA request and a new date (AC-4)", () => {
    // 2026-10-01 for the offer's forms; later changes move it on (TASK-073: 2026-10-03).
    expect(LEGAL_UPDATED.privacy >= "2026-10-01").toBe(true);
    // The offer did not change the terms; the legal review of 2026-10-04 did, then the
    // withdrawal of the controller's name, place and address on 2026-10-06.
    expect(LEGAL_UPDATED.terms).toBe("2026-10-06");
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
