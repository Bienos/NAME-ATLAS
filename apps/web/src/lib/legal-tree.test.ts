import { describe, expect, it } from "vitest";
import {
  LEGAL_UPDATED,
  legalDocument,
  legalUpdated,
  ACCOUNTS_LEGAL_UPDATED,
  TREE_LEGAL_UPDATED,
} from "./legal-text.js";
import { treeTermsHeading, treeVariant } from "./legal-tree.js";
import type { LegalKind } from "./legal-text.js";

const KINDS: readonly LegalKind[] = ["privacy", "terms"];
const LANGS = ["pl", "en"] as const;

describe("the legal texts with the tree (TASK-076, AC-1)", () => {
  it("read as before while the tree is off, with the accounts date", () => {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        expect(legalDocument(kind, lang, true)).toEqual(legalDocument(kind, lang, true, false));
        expect(legalDocument(kind, lang, false, true)).toEqual(legalDocument(kind, lang, false));
      }
      // The later of the document's own date and the accounts variant's (TASK-073, the well-known bearers, moved the notice's own date past it).
      expect(legalUpdated(kind, true)).toBe(
        ACCOUNTS_LEGAL_UPDATED > LEGAL_UPDATED[kind] ? ACCOUNTS_LEGAL_UPDATED : LEGAL_UPDATED[kind],
      );
      expect(legalUpdated(kind, false, true)).toBe(legalUpdated(kind, false));
    }
  });

  it("gain one section each when the tree is on, the same in both languages, and the tree's date", () => {
    for (const kind of KINDS) {
      const pl = legalDocument(kind, "pl", true, true);
      const en = legalDocument(kind, "en", true, true);
      expect(pl.sections).toHaveLength(legalDocument(kind, "pl", true).sections.length + 1);
      expect(en.sections).toHaveLength(pl.sections.length);
      expect(pl.sections.map((s) => s.paragraphs.length)).toEqual(
        en.sections.map((s) => s.paragraphs.length),
      );
      expect(legalUpdated(kind, true, true)).toBe(TREE_LEGAL_UPDATED);
    }
    const terms = legalDocument("terms", "pl", true, true);
    const clause = terms.sections.find((s) => s.heading === treeTermsHeading("pl"));
    expect(clause).toBeDefined();
    expect(clause?.paragraphs.join(" ")).toContain(
      "Osobę, której nie oznaczysz jako zmarłej, traktujemy jako żyjącą",
    );
    expect(clause?.paragraphs.join(" ")).not.toContain("zaprosisz do drzewa");
    expect(clause?.paragraphs.join(" ")).toContain("masz prawo wpisać jej dane");
    const notice = legalDocument("privacy", "en", true, true);
    expect(notice.sections.map((s) => s.heading)).toContain("The family tree");
  });

  it("says what the code does: private, no members, the invitation's facts, kept as long as the account", () => {
    const notice = legalDocument("privacy", "pl", true, true).sections.find(
      (s) => s.heading === "Drzewo rodzinne",
    );
    const text = notice?.paragraphs.join(" ") ?? "";
    expect(text).toContain("prywatne");
    // No route lets an owner add a member (legal review 2026-10-04, F-12).
    expect(text).not.toContain("tylko wtedy, gdy im to włączysz");
    expect(text).toContain("tak długo, jak istnieje konto");
    expect(text).toContain("miejsce zgonu");
    expect(text).toContain("matka, ojciec, rodzic");
    expect(text).toContain("14 dni");
    expect(text).toContain("18 lat");
    expect(text).toContain("plik JSON");
    expect(text).toContain("trwają tyle co drzewo");
    const en = legalDocument("privacy", "en", true, true).sections.find(
      (s) => s.heading === "The family tree",
    );
    expect(en?.paragraphs.join(" ")).toContain("14 days");
    expect(en?.paragraphs.join(" ")).toContain("a JSON file");
  });

  it("names the tree in the database and mail items, with and without Google", () => {
    for (const google of [false, true]) {
      for (const [lang, oracle, resend] of [
        ["pl", "dane konta i drzew", "zaproszeń do potwierdzenia karty"],
        ["en", "account and tree data", "invitations to confirm a card"],
      ] as const) {
        const items = legalDocument("privacy", lang, true, true, google).sections.flatMap(
          (s) => s.items ?? [],
        );
        expect(items.filter((i) => i.startsWith("Oracle"))).toHaveLength(1);
        expect(items.find((i) => i.startsWith("Oracle"))).toContain(oracle);
        expect(items.filter((i) => i.startsWith("Resend"))).toHaveLength(1);
        expect(items.find((i) => i.startsWith("Resend"))).toContain(resend);
      }
    }
  });

  it("refuses to be applied to a text without the account's sections", () => {
    const bare = legalDocument("terms", "pl");
    expect(() => treeVariant("terms", "pl", bare)).toThrow(/legal-tree/u);
  });

  it("is dated after the accounts variant, so the consent step can compare versions as text", () => {
    expect(TREE_LEGAL_UPDATED > ACCOUNTS_LEGAL_UPDATED).toBe(true);
    expect(TREE_LEGAL_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });
});
