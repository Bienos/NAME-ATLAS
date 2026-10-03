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

describe("the legal texts with the tree (TASK-073, AC-1)", () => {
  it("read as before while the tree is off, with the accounts date", () => {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        expect(legalDocument(kind, lang, true)).toEqual(legalDocument(kind, lang, true, false));
        expect(legalDocument(kind, lang, false, true)).toEqual(legalDocument(kind, lang, false));
      }
      // The later of the document's own date and the accounts variant's (TASK-073 moved the notice's own date past it).
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
    expect(clause?.paragraphs.join(" ")).toContain("Osobę bez roku zgonu traktujemy jako żyjącą");
    expect(clause?.paragraphs.join(" ")).toContain("masz prawo wpisać jej dane");
    const notice = legalDocument("privacy", "en", true, true);
    expect(notice.sections.map((s) => s.heading)).toContain("The family tree");
  });

  it("says what the code does: private, the living hidden from members until opened, kept as long as the account", () => {
    const notice = legalDocument("privacy", "pl", true, true).sections.find(
      (s) => s.heading === "Drzewo rodzinne",
    );
    const text = notice?.paragraphs.join(" ") ?? "";
    expect(text).toContain("prywatne");
    expect(text).toContain("tylko wtedy, gdy im to włączysz");
    expect(text).toContain("tak długo, jak istnieje konto");
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
