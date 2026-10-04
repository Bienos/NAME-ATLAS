import { describe, expect, it } from "vitest";
import { GOOGLE_LEGAL_UPDATED, legalDocument, legalUpdated } from "./legal-text.js";

const LANGS = ["pl", "en"] as const;
const HEADING = { pl: "Logowanie przez Google", en: "Signing in with Google" } as const;

describe("the privacy notice with Google sign-in (TASK-084)", () => {
  it("says nothing of Google until Google is configured", () => {
    for (const lang of LANGS) {
      // The base text already names Google as the mailbox's provider; the variant's own words are absent.
      const text = JSON.stringify(legalDocument("privacy", lang, true, false, false));
      expect(text, lang).not.toContain(HEADING[lang]);
      expect(text, lang).not.toContain("Google Ireland");
    }
  });

  it("adds its section after the account's and Google to who processes data", () => {
    for (const lang of LANGS) {
      const doc = legalDocument("privacy", lang, true, false, true);
      const headings = doc.sections.map((s) => s.heading);
      const at = headings.indexOf(HEADING[lang]);
      expect(at, lang).toBeGreaterThan(0);
      expect(headings[at - 1], lang).toMatch(/^(Konto: po co|The account: why)/u);
      const processors = doc.sections.find((s) =>
        (s.items ?? []).some((i) => i.startsWith("Oracle")),
      );
      expect(
        processors?.items?.some((i) => i.startsWith("Google Ireland Limited")),
        lang,
      ).toBe(true);
    }
  });

  it("is in the notice with the tree on too, and only with accounts on", () => {
    const withTree = legalDocument("privacy", "pl", true, true, true);
    expect(withTree.sections.map((s) => s.heading)).toContain(HEADING.pl);
    expect(JSON.stringify(legalDocument("privacy", "pl", false, false, true))).not.toContain(
      HEADING.pl,
    );
  });

  it("leaves the terms and their accepted version alone", () => {
    for (const lang of LANGS) {
      expect(legalDocument("terms", lang, true, false, true)).toEqual(
        legalDocument("terms", lang, true, false, false),
      );
    }
    expect(legalUpdated("terms", true, false, true)).toBe(legalUpdated("terms", true));
    expect(legalUpdated("privacy", true, false, true)).toBe(GOOGLE_LEGAL_UPDATED);
    expect(legalUpdated("privacy", false, false, true)).toBe(legalUpdated("privacy"));
  });
});
