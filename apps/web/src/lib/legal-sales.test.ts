import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConsentField } from "./checkout-section.js";
import { OPERATOR_NIP } from "./contact.js";
import { legalDocument, legalUpdated, SALES_LEGAL_UPDATED } from "./legal-text.js";

/** TASK-182 — the owner's NIP, and what a real sale adds to the terms and the notice. */

const text = (doc: unknown) => JSON.stringify(doc);

describe("the operator's NIP (TASK-182)", () => {
  it("is a valid NIP", () => {
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const digits = [...OPERATOR_NIP].map(Number);
    const sum = weights.reduce((acc, w, i) => acc + w * (digits[i] ?? 0), 0);
    expect(OPERATOR_NIP).toMatch(/^\d{10}$/u);
    expect(sum % 11).toBe(digits[9]);
  });

  it("is in both documents, in both languages, with or without accounts", () => {
    for (const kind of ["terms", "privacy"] as const) {
      for (const lang of ["pl", "en"] as const) {
        expect(text(legalDocument(kind, lang)), `${kind} ${lang}`).toContain(OPERATOR_NIP);
        expect(text(legalDocument(kind, lang, true, true, true))).toContain(OPERATOR_NIP);
      }
    }
  });
});

describe("the sales variant (TASK-182)", () => {
  it("is absent until checkout runs live", () => {
    expect(text(legalDocument("terms", "pl", true, true, true))).not.toContain('"Zakupy"');
    expect(text(legalDocument("privacy", "en", true, true, true))).not.toContain("Stripe");
  });

  it("adds the purchases section after the account's, in both languages", () => {
    const pl = legalDocument("terms", "pl", true, true, true, true);
    const headings = pl.sections.map((s) => s.heading);
    expect(headings.indexOf("Zakupy")).toBe(headings.indexOf("Konto") + 1);
    const terms = text(pl);
    expect(terms).toContain(`NIP ${OPERATOR_NIP}`);
    expect(terms).toContain("art. 38 ust. 1 pkt 13");
    expect(terms).toContain("w ciągu 14 dni");
    expect(terms).toContain("jednorazowa płatność");
    const en = legalDocument("terms", "en", true, false, false, true);
    expect(en.sections.map((s) => s.heading)).toContain("Purchases");
    expect(legalUpdated("terms", true, false, false, true)).toBe(SALES_LEGAL_UPDATED);
  });

  it("adds the purchase data and Stripe as a processor to the notice", () => {
    for (const lang of ["pl", "en"] as const) {
      const doc = legalDocument("privacy", lang, true, true, true, true);
      const processors = doc.sections.find((s) => s.items?.some((i) => i.startsWith("Vercel")));
      expect(processors?.items?.at(-1)).toMatch(/^Stripe Payments Europe, Limited/u);
      expect(
        doc.sections.filter((s) => s.heading === (lang === "pl" ? "Zakupy" : "Purchases")),
      ).toHaveLength(1);
    }
  });
});

describe("the buy form's terms link (TASK-182)", () => {
  it("points at the terms in the reader's language", () => {
    expect(renderToStaticMarkup(createElement(ConsentField, { lang: "pl" }))).toContain(
      'href="/pl/regulamin"',
    );
    expect(renderToStaticMarkup(createElement(ConsentField, { lang: "en" }))).toContain(
      'href="/en/terms"',
    );
  });
});
