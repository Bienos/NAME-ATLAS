import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountsVariant } from "./legal-accounts.js";
import { LegalView } from "./legal-page.js";
import {
  ACCOUNTS_LEGAL_UPDATED,
  LEGAL_UPDATED,
  legalDocument,
  legalUpdated,
} from "./legal-text.js";
import type { LegalKind } from "./legal-text.js";

const LANGS = ["pl", "en"] as const;
const KINDS: readonly LegalKind[] = ["privacy", "terms"];

const ON = {
  ACCOUNTS_DATABASE_URL: "postgres://app@host/db",
  RESEND_API_KEY: "re_key",
  ACCOUNTS_MAIL_FROM: "Name Atlas <konto@example.test>",
  SITE_ORIGIN: "https://atlas.example.test",
  CRON_SECRET: "cron-secret",
};

const text = (kind: LegalKind, lang: "pl" | "en", accounts: boolean) =>
  JSON.stringify(legalDocument(kind, lang, accounts));

afterEach(() => vi.unstubAllEnvs());

describe("the notice and the terms without accounts (TASK-062, AC-1)", () => {
  it("are the text as it was: the default is the base, and it still says there are no accounts and no cookies", () => {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        expect(legalDocument(kind, lang, false)).toBe(legalDocument(kind, lang));
      }
    }
    expect(text("privacy", "pl", false)).toContain("Name Atlas nie ma kont ani reklam");
    expect(text("privacy", "pl", false)).toContain("nie zapisuje w przeglądarce plików cookie");
    expect(text("privacy", "en", false)).toContain("Name Atlas has no accounts or advertising");
    expect(text("privacy", "en", false)).toContain("stores no cookies");
  });

  it("keep their own dates", () => {
    expect(legalUpdated("privacy")).toBe(LEGAL_UPDATED.privacy);
    expect(legalUpdated("terms", false)).toBe(LEGAL_UPDATED.terms);
  });
});

describe("the notice and the terms with accounts (AC-2)", () => {
  it("no longer say there are no accounts or cookies, and say what an account holds", () => {
    for (const lang of LANGS) {
      const privacy = text("privacy", lang, true);
      expect(privacy).not.toContain("nie ma kont ani reklam");
      expect(privacy).not.toContain("has no accounts or advertising");
      expect(privacy).not.toContain(
        "nie zapisuje w przeglądarce plików cookie ani podobnych danych.",
      );
      for (const word of [
        "SHA-256",
        "scrypt",
        "HttpOnly",
        "SameSite=Lax",
        "Resend",
        "Data Privacy Framework",
      ]) {
        expect(privacy, `${lang} ${word}`).toContain(word);
      }
      expect(privacy).toContain("8");
      expect(privacy.toLowerCase()).toMatch(/30/u);
    }
  });

  it("add two sections to the notice and one to the terms, in both languages alike", () => {
    for (const lang of LANGS) {
      const base = legalDocument("privacy", lang).sections.length;
      expect(legalDocument("privacy", lang, true).sections).toHaveLength(base + 2);
      const terms = legalDocument("terms", lang).sections.length;
      expect(legalDocument("terms", lang, true).sections).toHaveLength(terms + 1);
    }
    for (const kind of KINDS) {
      expect(legalDocument(kind, "pl", true).sections.length).toBe(
        legalDocument(kind, "en", true).sections.length,
      );
    }
  });

  it("keep every heading unique and every section non-empty", () => {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        const sections = legalDocument(kind, lang, true).sections;
        const headings = sections.map((s) => s.heading);
        expect(new Set(headings).size, `${kind} ${lang}`).toBe(headings.length);
        for (const section of sections) {
          expect(
            section.paragraphs.length + (section.items?.length ?? 0),
            section.heading,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("name Resend among the processors, and update the database item rather than adding a second", () => {
    for (const lang of LANGS) {
      const processors = legalDocument("privacy", lang, true).sections.find((s) =>
        (s.items ?? []).some((item) => item.startsWith("Resend")),
      );
      const items = processors?.items ?? [];
      expect(items.filter((item) => item.startsWith("Oracle"))).toHaveLength(1);
      expect(items.find((item) => item.startsWith("Oracle"))).toMatch(/konta|account/u);
      expect(items.filter((item) => item.startsWith("Resend"))).toHaveLength(1);
    }
  });

  it("say what the backups are not claimed to do: nothing about a deleted account's stay in one", () => {
    for (const lang of LANGS) {
      const privacy = text("privacy", lang, true).toLowerCase();
      expect(privacy).not.toMatch(/kopi[ae] zapasow|backup/u);
    }
  });

  it("show the later of their own date and the accounts variant's", () => {
    // Both documents changed again after the accounts variant (TASK-073; the legal
    // review of 2026-10-04): they show the later date. The version a reader accepts
    // with the tree off stays ACCOUNTS_LEGAL_UPDATED, so that the tree's consent
    // step still compares as later (`legal-tree.test.ts`; D-041).
    expect(legalUpdated("privacy", true)).toBe(LEGAL_UPDATED.privacy);
    expect(LEGAL_UPDATED.privacy > ACCOUNTS_LEGAL_UPDATED).toBe(true);
    expect(legalUpdated("terms", true)).toBe(LEGAL_UPDATED.terms);
    expect(LEGAL_UPDATED.terms > ACCOUNTS_LEGAL_UPDATED).toBe(true);
    expect(ACCOUNTS_LEGAL_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it("say what the code does: the cookie's name and lifetime, when hashes and sessions go, and what an account needs", () => {
    const pl = text("privacy", "pl", true);
    const en = text("privacy", "en", true);
    for (const privacy of [pl, en]) {
      expect(privacy).toContain("__Host-na_session");
      expect(privacy).toContain("400");
    }
    expect(pl).toContain("najpóźniej w ciągu doby");
    expect(en).toContain("within a day at the latest");
    expect(pl).not.toContain("kasujemy po godzinie");
    expect(pl).toContain("7 dni po wygaśnięciu");
    expect(en).toContain("7 days after they expire");
    expect(pl).toContain("ustawienia nowego hasła");
    expect(en).toContain("set a new password");
    expect(pl).toContain("musisz podać adres e-mail i ustawić hasło");
    expect(en).toContain("you must give an email address and set a password");
    expect(pl).toContain("identyfikator konta");
    expect(en).toContain("the account's identifier");
  });

  it("fail loudly, rather than publish a notice that no longer matches, when a section it changes is gone", () => {
    for (const lang of LANGS) {
      const base = legalDocument("privacy", lang);
      expect(() => accountsVariant("privacy", lang, { ...base, sections: [] })).toThrow(
        /legal-accounts/u,
      );
      const terms = legalDocument("terms", lang);
      expect(() => accountsVariant("terms", lang, { ...terms, sections: [] })).toThrow(
        /legal-accounts/u,
      );
    }
  });
});

describe("the legal pages follow the gate", () => {
  const render = (kind: LegalKind, lang: "pl" | "en") =>
    renderToStaticMarkup(createElement(LegalView, { kind, lang }));

  it("show the base text and its date while accounts are off", () => {
    const html = render("privacy", "pl");
    expect(html).toContain("Name Atlas nie ma kont ani reklam");
    expect(html).toContain(`dateTime="${LEGAL_UPDATED.privacy}"`);
  });

  it("show the accounts variant and its date once all five variables are set", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    for (const kind of KINDS) {
      const html = render(kind, "en");
      expect(html).toContain(`dateTime="${legalUpdated(kind, true)}"`);
    }
    expect(render("privacy", "pl")).toContain("Resend");
    expect(render("terms", "pl")).toContain("<h3>Konto</h3>");
  });

  it("go back to the base text when one variable is missing", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    vi.stubEnv("CRON_SECRET", "");
    expect(render("privacy", "en")).toContain("Name Atlas has no accounts or advertising");
  });
});
