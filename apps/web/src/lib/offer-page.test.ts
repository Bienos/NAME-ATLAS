import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL } from "./contact.js";
import { legalDocument, LEGAL_UPDATED } from "./legal-text.js";
import { formatDate, htmlLang } from "./messages.js";
import {
  BABY_NAMES_FULL_TIERS,
  FULL_NAME_COMPARE_TIERS,
  TREE_UNLOCK_TIERS,
} from "@name-atlas/accounts";
import { accountPath } from "./account-paths.js";
import { BABY_NAMES_PATHS } from "./baby-names-config.js";
import { CHECKOUT_TIERS, formatPrice } from "./checkout-config.js";
import { freeWindowFrom, GUEST, OfferView, offerMetadata, tableCell } from "./offer-page.js";
import type { OfferReader } from "./offer-page.js";
import {
  ANSWER_MAX,
  EMPTY_ENQUIRY,
  enquiryMailto,
  mailtoHref,
  offerDocument,
  TABLE_COLUMNS,
  TABLE_ROWS,
  waitlistMailto,
} from "./offer-text.js";
import type { TableRow } from "./offer-text.js";
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
function render(lang: "pl" | "en", reader: OfferReader = GUEST): string {
  return renderToStaticMarkup(createElement(OfferView, { lang, reader })).replaceAll("&amp;", "&");
}

const OPEN = { until: "2026-11-07", lastWeek: false } as const;
const MEMBER: OfferReader = { accounts: true, signedIn: true, tester: false, freeWindow: null };

describe("the offer page (TASK-057, TASK-104, TASK-167, ADR-0037)", () => {
  it("lists every price with its name: free now, the products and packs coming (TASK-167 AC-1)", () => {
    const prices = {
      pl: ["0 zł", "8,99 zł", "15,99 zł", "28,99 zł", "89,99 zł", "199 zł", "800 zł"],
      en: ["PLN 0", "PLN 8.99", "PLN 15.99", "PLN 28.99", "PLN 89.99", "PLN 199", "PLN 800"],
    };
    for (const lang of LANGS) {
      const html = render(lang);
      const doc = offerDocument(lang);
      expect(html).toContain(`<main lang="${htmlLang(lang)}"`);
      const all = [...doc.tiers, ...doc.products];
      expect(all.map((t) => t.price).sort()).toEqual([...prices[lang]].sort());
      expect(doc.tiers.map((t) => t.soon)).toEqual([false, true, true, true, true]);
      for (const item of all) {
        expect(html).toContain(`id="tier-${item.key}">${item.name}</h`);
        expect(html).toContain(`<p class="offer-price">${item.price}</p>`);
      }
      // The names the decisions gave the products (D-045, D-049) match checkout's.
      for (const product of doc.products)
        expect(CHECKOUT_TIERS.find((t) => t.key === product.key)?.name[lang]).toBe(product.name);
      // Free, then five coming: two products and three packs (800 zł keeps its own).
      expect(html.match(new RegExp(`class="offer-status">${doc.soon}</p>`, "gu"))?.length).toBe(6);
      expect(html).toContain(`class="offer-status">${doc.now}</p>`);
      // Accounts are live: the free plan no longer says "coming soon".
      expect(JSON.stringify(doc.tiers[0])).not.toMatch(/wkrótce|coming soon/iu);
      expect(html).toContain(doc.nothingOnSale);
    }
  });

  it("offers no purchase to anyone but a listed tester (TASK-167 AC-3)", () => {
    for (const lang of LANGS) {
      for (const reader of [GUEST, MEMBER, { ...MEMBER, freeWindow: OPEN }]) {
        const html = render(lang, reader);
        expect(html).not.toContain("/api/checkout");
        expect(html).not.toContain('method="post"');
        expect(html).not.toContain(offerDocument(lang).testNote);
      }
    }
  });

  it("gives a listed tester one test-mode form per product, none for 800 zł (AC-4)", () => {
    for (const lang of LANGS) {
      const html = render(lang, { ...MEMBER, tester: true });
      const doc = offerDocument(lang);
      const forms = html.match(
        /<form class="offer-buy"[^>]* action="\/api\/checkout" method="post">/gu,
      );
      expect(forms).toHaveLength(CHECKOUT_TIERS.length);
      for (const tier of CHECKOUT_TIERS) {
        expect(html).toContain(`<input type="hidden" name="tier" value="${tier.key}"/>`);
        expect(html).toContain(doc.buy(formatPrice(tier.amount, lang)));
      }
      expect(html).toContain(`<input type="hidden" name="lang" value="${lang}"/>`);
      expect(html).toContain(doc.testNote);
      // The tester buys instead of joining a waiting list; the 800 zł enquiry stays.
      expect(html).not.toContain(waitlistMailto("smaller", "", lang));
      expect(html).toContain(`href="${enquiryMailto(EMPTY_ENQUIRY, lang)}"`);
    }
  });

  it("shows the baby-names price struck in the free window, else coming (AC-2)", () => {
    for (const lang of LANGS) {
      const doc = offerDocument(lang);
      const price = doc.products[0]?.price ?? "";
      const closed = render(lang, MEMBER);
      expect(closed).not.toContain(`<s>${price}</s>`);
      expect(closed).toContain(`href="${waitlistMailto("babynames", "", lang)}"`);

      const guest = render(lang, { ...GUEST, accounts: true, freeWindow: OPEN });
      expect(guest).toContain(`<s>${price}</s>`);
      expect(guest).toContain(doc.freeToday);
      expect(guest).toContain(doc.freeWindow.signedOut);
      expect(guest).toContain(
        `href="${accountPath(lang, "sign-in", { next: BABY_NAMES_PATHS[lang] })}"`,
      );
      expect(guest).toContain(`href="${accountPath(lang, "sign-up")}"`);

      const member = render(lang, { ...MEMBER, freeWindow: OPEN });
      expect(member).toContain(`href="${BABY_NAMES_PATHS[lang]}"`);
      expect(member).toContain(doc.freeWindow.signedIn);
      expect(member).toContain(`href="${accountPath(lang, "account")}"`);
      // The true end is shown (D-051, TASK-167); "the last week" only when it is.
      expect(member).toContain(doc.freeWindow.when(formatDate("2026-11-07", lang), false));
      const last = render(lang, { ...MEMBER, freeWindow: { ...OPEN, lastWeek: true } });
      expect(last).toContain(doc.freeWindow.when(formatDate("2026-11-07", lang), true));
      expect(member).not.toContain(doc.freeWindow.when(formatDate("2026-11-07", lang), true));
    }
  });

  it("states the window's end as a Warsaw day, and the last week only within 7 days", () => {
    const until = new Date("2026-11-07T23:59:59+01:00");
    expect(freeWindowFrom(null)).toBeNull();
    expect(freeWindowFrom(until, new Date("2026-10-08T12:00:00Z"))).toEqual({
      until: "2026-11-07",
      lastWeek: false,
    });
    expect(freeWindowFrom(until, new Date("2026-11-01T12:00:00Z"))).toEqual({
      until: "2026-11-07",
      lastWeek: true,
    });
  });

  it("leads from a row of prices to every card, and folds each form away (TASK-173)", () => {
    for (const lang of LANGS) {
      const html = render(lang);
      const doc = offerDocument(lang);
      for (const item of [...doc.tiers, ...doc.products]) {
        expect(html).toContain(`href="#tier-${item.key}"`);
        expect(html).toContain(`id="tier-${item.key}"`);
      }
      const folded = html.match(/<details class="offer-ask">/gu) ?? [];
      // Five waiting lists (two products, three packs) and the 800 zł enquiry.
      expect(folded).toHaveLength(6);
      expect(html).toContain(`<summary class="offer-ask-toggle">${doc.waitlist.heading}</summary>`);
      expect(html).toContain(`<summary class="offer-ask-toggle">${doc.enquiry.heading}</summary>`);
    }
  });

  it("draws the table from the entitlement lists (AC-5)", () => {
    const yes = (row: TableRow) =>
      TABLE_COLUMNS.filter((column) => tableCell(row, column, "pl") === true);
    expect(yes("babyFull")).toEqual([...BABY_NAMES_FULL_TIERS]);
    expect(yes("fullnames")).toEqual([...FULL_NAME_COMPARE_TIERS]);
    expect(yes("coupleReport")).toEqual(["couple"]);
    const t = offerDocument("en").table;
    expect(TABLE_COLUMNS.filter((c) => tableCell("tree", c, "en") === t.more)).toEqual([
      ...TREE_UNLOCK_TIERS,
    ]);
    for (const row of ["surname", "compare", "babyTop"] as const)
      expect(yes(row)).toEqual([...TABLE_COLUMNS]);
    for (const lang of LANGS) {
      const html = render(lang);
      for (const row of TABLE_ROWS)
        expect(html).toContain(
          `<th scope="row">${offerDocument(lang).table.rows[row].replaceAll("'", "&#x27;")}</th>`,
        );
    }
  });

  it("without script, offers each form as a prefilled email to the owner (AC-2)", () => {
    for (const lang of LANGS) {
      const html = render(lang);
      const doc = offerDocument(lang);
      for (const tier of ["babynames", "fullnames", "smaller", "couple", "family"] as const)
        expect(html).toContain(`href="${waitlistMailto(tier, "", lang)}"`);
      expect(html).toContain(`href="${enquiryMailto(EMPTY_ENQUIRY, lang)}"`);
      expect(html).toContain(doc.waitlist.fallback);
      expect(html).toContain(doc.enquiry.fallback);
      expect(html).toContain(doc.noDna);
    }
  });

  it("puts the tier in the subject and the reader's words in the body (AC-2)", () => {
    const w = mail(waitlistMailto("smaller", "  Zaremba ", "pl"));
    expect(w.to).toBe(CONTACT_EMAIL);
    expect(w.subject).toBe("Lista oczekujących: Małe poszukiwania (28,99 zł)");
    expect(mail(waitlistMailto("couple", "", "en")).subject).toBe(
      "Waiting list: Couple (PLN 89.99)",
    );
    expect(mail(waitlistMailto("family", "", "pl")).subject).toBe(
      "Lista oczekujących: Przegląd rodziny (199 zł)",
    );
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
    expect(e.subject).toBe("Zapytanie: Badanie genealogiczne (800 zł)");
    expect(e.body).toContain("Imię i nazwisko: Anna Nowak");
    expect(e.body).toContain("Nazwiska w rodzinie, których szukasz: Nowak, Żak");
    expect(e.body).toContain("Miejsca i lata, które znasz: Iława 1890");
    expect(e.body).toContain("Co chcesz odkryć?: Kim był pradziadek?");
    expect(e.body).toContain("Czy masz test DNA? Tak, Y-DNA");

    const en = mail(enquiryMailto(EMPTY_ENQUIRY, "en"));
    expect(en.subject).toBe("Enquiry: Genealogist research (PLN 800)");
    expect(en.body.split("\n").at(-1)).toBe("Do you have a DNA test?");
  });

  it("encodes a space as %20, never +, and caps each answer (AC-2)", () => {
    const href = mailtoHref("a b+c", ["x y"]);
    expect(href).toBe(`mailto:${CONTACT_EMAIL}?subject=a%20b%2Bc&body=x%20y`);
    const long = mail(waitlistMailto("smaller", "x".repeat(ANSWER_MAX + 50), "en"));
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
      for (const label of ["Blog", "Instagram", "TikTok", "Facebook"])
        expect(footer).toContain(`>${label}</a>`);
      expect(footer).not.toContain("YouTube");
      // The blog has its own index since TASK-071; the socials lead to the owner's accounts (TASK-168).
      expect(
        followLinks(lang)
          .filter((l) => l.label !== "Blog")
          .every((l) => l.href.startsWith("https://")),
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
      const genealogy = byKey.get("genealogy")?.items ?? [];
      const unlock = genealogy.at(-1) ?? "";
      expect(unlock).toMatch(/5/u);
      // The packs: the tree unlock and the two products (D-044 §4, D-049 §3), nothing more.
      for (const key of ["smaller", "couple", "family"] as const) {
        const items = byKey.get(key)?.items ?? [];
        expect(items.at(-3)).toBe(unlock);
        expect(items.at(-2)).toContain(doc.products[0]?.price);
        expect(items.at(-2)).toContain(doc.products[1]?.price);
        // "Imiona pary", held by every dearer pack once priced (D-050 §3), as coming.
        expect(items.at(-1)).toMatch(/wkrótce|coming/iu);
      }
      expect(byKey.get("smaller")?.items).toHaveLength(3);
      expect(byKey.get("family")?.items).toHaveLength(3);
      expect(byKey.get("couple")?.items).toHaveLength(4);
      expect(byKey.get("free")?.items.some((line) => /5/u.test(line))).toBe(true);
    }
    const shape = (lang: "pl" | "en") => {
      const doc = offerDocument(lang);
      return [
        doc.tiers.map((t) => [t.key, t.soon, t.items.length, t.note === undefined]),
        doc.products.map((p) => [p.key, p.items.length]),
        doc.faq.items.length,
        doc.pay.steps.length,
      ];
    };
    expect(shape("pl")).toEqual(shape("en"));
  });

  it("is matched by the privacy notice: the forms, the DNA request and a new date (AC-4)", () => {
    // 2026-10-01 for the offer's forms; later changes move it on (TASK-073: 2026-10-03).
    expect(LEGAL_UPDATED.privacy >= "2026-10-01").toBe(true);
    // The offer did not change the terms; the legal review of 2026-10-04 and the
    // contact change of 2026-10-07 did.
    expect(LEGAL_UPDATED.terms).toBe("2026-10-07");
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
