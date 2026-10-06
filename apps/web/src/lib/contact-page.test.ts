import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { contactFormHref, readContactPrefill } from "./contact.js";
import { ContactView, contactMetadata } from "./contact-page.js";
import { contactPath, SiteFooter } from "./site-footer.js";
import { SECURITY_TXT_EXPIRES, securityTxt } from "./security-txt.js";
import { ComparisonView } from "./compare-view.js";
import { htmlLang } from "./messages.js";

const DAY_MS = 86_400_000;

/** Any e-mail address at all: since 2026-10-06 the site shows none (the owner's request). */
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/u;

describe("contact pages (TASK-047)", () => {
  it("show the form posting to /api/contact, and no address, in each language", () => {
    for (const lang of ["pl", "en"] as const) {
      const html = renderToStaticMarkup(createElement(ContactView, { lang }));
      expect(html).toContain(`<main lang="${htmlLang(lang)}"`);
      expect(html).toContain('action="/api/contact" method="post"');
      expect(html).toContain(`<input type="hidden" name="lang" value="${lang}"/>`);
      expect(html).not.toContain("mailto:");
      expect(html).not.toMatch(EMAIL);
      expect(html).toContain(lang === "pl" ? "<h2>Kontakt</h2>" : "<h2>Contact</h2>");
    }
  });

  it("switch language to the other contact page", () => {
    const pl = renderToStaticMarkup(createElement(ContactView, { lang: "pl" }));
    expect(pl).toContain('href="/en/contact" hrefLang="en" lang="en" aria-label="English">EN</a>');
    const en = renderToStaticMarkup(createElement(ContactView, { lang: "en" }));
    expect(en).toContain('href="/pl/kontakt" hrefLang="pl" lang="pl" aria-label="Polski">PL</a>');
  });

  it("name their own canonical address", () => {
    expect(contactMetadata("pl").alternates?.canonical).toBe("/pl/kontakt");
    expect(contactMetadata("en").alternates?.canonical).toBe("/en/contact");
  });
});

describe("SiteFooter", () => {
  it("keeps the data note and leads to the contact page, not to a bare address", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter, { lang: "pl" }));
    expect(html).toContain("Brak danych jest podany jako brak, nigdy jako zero.");
    expect(html).toContain(`href="${contactPath("pl")}">Kontakt</a>`);
    expect(html).toContain(`class="footer-cta" href="${contactPath("pl")}"`);
    expect(html).not.toContain("mailto:");
  });

  it("groups the site's places and keeps every earlier link", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter, { lang: "en" }));
    for (const href of [
      "/en/offer",
      "/en/compare",
      "/en/how-it-works",
      "/en/blog",
      "/en/privacy",
      "/en/terms",
      "/en/contact",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
    for (const label of [
      "Explore",
      "Read",
      "The site",
      "Follow",
      "Instagram",
      "TikTok",
      "YouTube",
    ]) {
      expect(html).toContain(`>${label}<`);
    }
  });

  it("is the footer the comparison page renders", () => {
    const side = (slug: string) => ({ slug, display: null, response: null, path: null });
    const html = renderToStaticMarkup(
      createElement(ComparisonView, { a: side("nowak"), b: side("kowalczyk"), lang: "en" }),
    );
    expect(html).toContain('href="/en/contact">Contact</a>');
  });
});

describe("the contact form's prefill (2026-10-06)", () => {
  it("rides in the fragment, survives every character, and reads back as it was written", () => {
    const prefill = { topic: "Inne", message: "a b+c\n&=#%?/ żółć" };
    const href = contactFormHref("pl", prefill);
    expect(href.startsWith(`${contactPath("pl")}#`)).toBe(true);
    expect(href.indexOf("#")).toBe(href.lastIndexOf("#"));
    expect(href).not.toContain("?");
    expect(readContactPrefill(href.slice(href.indexOf("#")))).toEqual(prefill);
    expect(readContactPrefill(href.slice(href.indexOf("#") + 1))).toEqual(prefill);
  });

  it("may carry a message alone, and is absent from a plain anchor or no fragment", () => {
    const href = contactFormHref("en", { message: "x" });
    expect(href.startsWith(`${contactPath("en")}#`)).toBe(true);
    expect(readContactPrefill(href.slice(href.indexOf("#")))).toEqual({ message: "x" });
    expect(readContactPrefill("#form")).toBeNull();
    expect(readContactPrefill("")).toBeNull();
  });

  it("leaves the server-rendered form empty: the fragment is read in the browser", () => {
    const html = renderToStaticMarkup(createElement(ContactView, { lang: "pl" }));
    expect(html).toContain('name="message" required="" rows="7" maxLength="5000"></textarea>');
    expect(html).toContain('type="radio" name="topic" checked="" value="Błąd w danych"/>');
  });
});

describe("security.txt (RFC 9116)", () => {
  it("carries the required fields, points Contact at the contact pages, and Canonical only with an origin", () => {
    const body = securityTxt("https://example.test");
    expect(body).toContain(
      "Contact: https://example.test/pl/kontakt\nContact: https://example.test/en/contact\n",
    );
    expect(body).not.toContain("mailto:");
    expect(body).not.toMatch(EMAIL);
    expect(body).toContain(`Expires: ${SECURITY_TXT_EXPIRES}\n`);
    expect(body).toContain("Canonical: https://example.test/.well-known/security.txt\n");
    const bare = securityTxt(null);
    expect(bare).toContain("Contact: /pl/kontakt\n");
    expect(bare).not.toContain("Canonical:");
  });

  it("expires within a year, and not within the next 30 days", () => {
    const left = Date.parse(SECURITY_TXT_EXPIRES) - Date.now();
    expect(left).toBeGreaterThan(30 * DAY_MS);
    expect(left).toBeLessThanOrEqual(366 * DAY_MS);
  });
});
