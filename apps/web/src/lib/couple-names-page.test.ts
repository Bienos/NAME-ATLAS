import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BirthNameLookup } from "@name-atlas/truth";
import PlPage, { generateMetadata as plMetadata } from "../app/pl/imiona-pary/page.js";
import EnPage, { generateMetadata as enMetadata } from "../app/en/couple-names/page.js";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { COUPLE_NAMES_BANNED, COUPLE_NAMES_PROMPT_VERSION } from "./couple-names-config.js";
import {
  ANNA_MEANING,
  MALGORZATA_MEANING,
  PIOTR_MEANING,
  SAMPLE_PL,
  STORED_READING,
} from "./couple-names-fixture.js";
import { loadCoupleNames } from "./couple-names-page.js";
import type { CoupleNamesDeps } from "./couple-names-page.js";
import { resetCoupleNamesRuntimeForTests } from "./couple-names-runtime.js";
import { COUPLE_NAMES_TEXT } from "./couple-names-text.js";
import { CoupleNamesView } from "./couple-names-view.js";
import type { Lang } from "./messages.js";

/**
 * TASK-156 AC-1 to AC-3, AC-6 to AC-8: the couple first-names page with the
 * flag off, signed out, and signed in for the pairs that can and cannot have
 * a reading. The meaning facts are the committed files' entries for three
 * names (`couple-names-fixture.ts`); nothing here calls a model.
 */

const PAGES = [
  { lang: "pl", Page: PlPage, metadata: plMetadata, path: "/pl/imiona-pary" },
  { lang: "en", Page: EnPage, metadata: enMetadata, path: "/en/couple-names" },
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
  resetAccountsRuntimeForTests();
  resetCoupleNamesRuntimeForTests();
});

const NAMES: Record<string, { id: string; display_name: string }> = {
  MAŁGORZATA: { id: "id-malgorzata", display_name: "MAŁGORZATA" },
  PIOTR: { id: "id-piotr", display_name: "PIOTR" },
  ANNA: { id: "id-anna", display_name: "ANNA" },
  KRZYSZTOF: { id: "id-krzysztof", display_name: "KRZYSZTOF" },
};

function deps(options: { stored?: boolean; available?: boolean } = {}): CoupleNamesDeps & {
  findReading: ReturnType<typeof vi.fn>;
} {
  const findReading = vi.fn((key: { a: { given_name_id: string }; b: { given_name_id: string } }) =>
    Promise.resolve(
      options.stored === true &&
        key.a.given_name_id === "id-malgorzata" &&
        key.b.given_name_id === "id-piotr"
        ? STORED_READING
        : null,
    ),
  );
  return {
    findName: (typed): Promise<BirthNameLookup> => {
      const key = typed.trim().toUpperCase();
      if (key === "LENA") return Promise.resolve({ kind: "HELD" });
      if (key.length > 60) return Promise.resolve({ kind: "INVALID" });
      const name = NAMES[key];
      return Promise.resolve(
        name === undefined ? { kind: "NOT_FOUND" } : { kind: "FOUND", given_name: name },
      );
    },
    readMeaning: (id) =>
      Promise.resolve(
        id === "id-malgorzata"
          ? MALGORZATA_MEANING
          : id === "id-piotr"
            ? PIOTR_MEANING
            : id === "id-anna"
              ? ANNA_MEANING
              : { state: "NO_SOURCE" as const },
      ),
    findReading: findReading as unknown as CoupleNamesDeps["findReading"],
    readingsAvailable: options.available ?? true,
  } as CoupleNamesDeps & { findReading: ReturnType<typeof vi.fn> };
}

async function render(
  lang: Lang,
  query: Record<string, string>,
  session: { userId: string } | null,
  d: CoupleNamesDeps = deps(),
): Promise<string> {
  const data = await loadCoupleNames({ lang, query, session, deps: d });
  return renderToStaticMarkup(createElement(CoupleNamesView, { data }))
    .replace(/&#x27;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&");
}

const text = (html: string) => html.replace(/<[^>]+>/gu, " ");

describe("the couple first-names pages (TASK-156)", () => {
  it("answer 404 with the flag unset or not exactly 1, with empty metadata (AC-1)", async () => {
    for (const value of [undefined, "0", "true", " 1"]) {
      vi.stubEnv("COUPLE_NAMES_ENABLED", value);
      for (const { lang, Page, metadata } of PAGES) {
        await expect(
          Page({ searchParams: Promise.resolve({}) }),
          `${lang} ${String(value)}`,
        ).rejects.toMatchObject({ digest: expect.stringContaining("404") as unknown });
        expect(metadata(), lang).toEqual({});
      }
    }
  });

  it("answer 404 with the flag on but accounts off, and are noindex when on (AC-1, AC-7)", async () => {
    vi.stubEnv("COUPLE_NAMES_ENABLED", "1");
    vi.stubEnv("ACCOUNTS_DATABASE_URL", undefined);
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("GOOGLE_CLIENT_ID", undefined);
    resetAccountsRuntimeForTests();
    for (const { lang, Page, metadata } of PAGES) {
      await expect(Page({ searchParams: Promise.resolve({}) }), lang).rejects.toMatchObject({
        digest: expect.stringContaining("404") as unknown,
      });
      expect(metadata().robots, lang).toEqual({ index: false, follow: false });
    }
  });

  it("signed out: explain, link to sign-in and back; no form, no meaning (AC-1)", async () => {
    for (const [lang, signIn] of [
      ["pl", "/pl/konto/zaloguj?next=%2Fpl%2Fimiona-pary"],
      ["en", "/en/account/sign-in?next=%2Fen%2Fcouple-names"],
    ] as const) {
      const html = await render(lang, { a: "Małgorzata", b: "Piotr" }, null);
      expect(html, lang).toContain(COUPLE_NAMES_TEXT[lang].signedOut);
      expect(html, lang).toContain(`href="${signIn}"`);
      expect(html, lang).not.toContain("<form");
      expect(html, lang).not.toContain("pearl");
    }
  });

  it("signed in, nothing typed: the two fields and nothing else", async () => {
    const html = await render("pl", {}, { userId: "u1" });
    expect(html).toContain('action="/pl/imiona-pary"');
    expect(html).toContain('name="a"');
    expect(html).toContain('name="b"');
    expect(html).not.toContain("couple-names-side");
    expect(html).not.toContain("couple-reading");
  });

  it("says which name was not found, is held, or is missing, per field", async () => {
    const t = COUPLE_NAMES_TEXT.pl;
    expect(await render("pl", { a: "Zzqx", b: "Piotr" }, { userId: "u1" })).toContain(
      t.notFound("Zzqx"),
    );
    expect(await render("pl", { a: "Lena", b: "" }, { userId: "u1" })).toContain(t.held);
    expect(await render("pl", { a: "Lena", b: "" }, { userId: "u1" })).toContain(t.empty);
    const html = await render("pl", { a: "Zzqx", b: "Piotr" }, { userId: "u1" });
    expect(html).not.toContain("couple-names-side");
  });

  it("two names with quoted meanings and no stored reading: both meaning blocks from the claims, then the button (AC-2, AC-6)", async () => {
    const html = await render("pl", { a: "małgorzata", b: "Piotr" }, { userId: "u1" });
    expect(html).toContain("MAŁGORZATA i PIOTR");
    expect(html).toContain('data-name="MAŁGORZATA"');
    expect(html).toContain('data-name="PIOTR"');
    expect(html).toContain("<h3>Pochodzenie i znaczenie</h3>");
    expect(html).toContain("greckie („Gr.”)");
    expect(html).toContain("„pearl”<br/>przekład Name Atlas: „perła”");
    expect(html).toContain("„rock”<br/>przekład Name Atlas: „skała”");
    expect(html).toContain("Charlotte M. Yonge, History of Christian Names (1884)");
    expect(html).toContain("Ocena: Prawdopodobne");
    expect(html).toContain("History of Christian Names, Charlotte M. Yonge");
    expect(html).toContain('data-reading="OFFER"');
    expect(html).toContain('action="/api/couple-names"');
    expect(html).toContain('name="a" value="MAŁGORZATA"');
    expect(html).toContain('name="b" value="PIOTR"');
    expect(html).toContain(COUPLE_NAMES_TEXT.pl.readingButton);
    expect(html).toContain("/pl/imiona-dla-dziecka?imie=MA%C5%81GORZATA");
  });

  it("shows a stored reading as is, in the page's language, with the model and the date; no button (AC-2)", async () => {
    const d = deps({ stored: true });
    const pl = await render("pl", { a: "Małgorzata", b: "Piotr" }, { userId: "u1" }, d);
    expect(pl).toContain('data-reading="STORED"');
    expect(pl).toContain(COUPLE_NAMES_TEXT.pl.readingNote("test-model-2026"));
    expect(text(pl)).toContain("Yonge czyta Małgorzatę jako perłę");
    expect(pl).toContain("Napisane 6 października 2026 r.");
    expect(pl).not.toContain('action="/api/couple-names"');
    expect(pl).not.toContain("Your names come from the same language");
    const en = await render("en", { a: "Małgorzata", b: "Piotr" }, { userId: "u1" }, d);
    expect(text(en)).toContain("Your names come from the same language");
    expect(en).not.toContain("Yonge czyta");
    // The pair is looked up the same way round whichever way it was typed.
    await render("pl", { a: "Piotr", b: "Małgorzata" }, { userId: "u1" }, d);
    for (const call of d.findReading.mock.calls as [
      { a: { given_name_id: string }; b: { given_name_id: string }; prompt_version: string },
    ][]) {
      expect(call[0].a.given_name_id).toBe("id-malgorzata");
      expect(call[0].b.given_name_id).toBe("id-piotr");
      expect(call[0].prompt_version).toBe(COUPLE_NAMES_PROMPT_VERSION);
    }
  });

  it("a name with an origin only, or no source: its block, the reason, and no button (AC-3)", async () => {
    const t = COUPLE_NAMES_TEXT.pl;
    const d = deps();
    const anna = await render("pl", { a: "Anna", b: "Piotr" }, { userId: "u1" }, d);
    expect(anna).toContain('data-reading="NEEDS"');
    expect(anna).toContain(t.readingMissing("ANNA", "ORIGIN_ONLY"));
    expect(anna).toContain("hebrajskie („pochodzenia hebrajskiego”)");
    expect(anna).not.toContain('action="/api/couple-names"');
    expect(d.findReading).not.toHaveBeenCalled();
    const none = await render("pl", { a: "Krzysztof", b: "Piotr" }, { userId: "u1" }, d);
    expect(none).toContain(t.readingMissing("KRZYSZTOF", "NO_SOURCE"));
    expect(none).toContain("Znaczenie imienia: żadne dzieło, które wolno nam cytować");
    expect(none).toContain('data-reading="NEEDS"');
    const both = await render("en", { a: "Anna", b: "Krzysztof" }, { userId: "u1" }, d);
    expect(both).toContain(COUPLE_NAMES_TEXT.en.readingMissing("ANNA", "ORIGIN_ONLY"));
    expect(both).toContain(COUPLE_NAMES_TEXT.en.readingMissing("KRZYSZTOF", "NO_SOURCE"));
  });

  it("the same name twice: shown once, and the reading is offered all the same", async () => {
    const html = await render("pl", { a: "Piotr", b: "piotr" }, { userId: "u1" });
    expect(html).toContain(COUPLE_NAMES_TEXT.pl.sameName);
    expect(html.match(/data-name="/gu)?.length).toBe(1);
    expect(html).toContain('data-reading="OFFER"');
  });

  it("without a key: the meanings, and that readings are unavailable; no button (AC-8)", async () => {
    const html = await render(
      "pl",
      { a: "Małgorzata", b: "Piotr" },
      { userId: "u1" },
      deps({ available: false }),
    );
    expect(html).toContain("„pearl”");
    expect(html).toContain('data-reading="UNAVAILABLE"');
    expect(html).toContain(COUPLE_NAMES_TEXT.pl.readingUnavailable);
    expect(html).not.toContain('action="/api/couple-names"');
  });

  it("shows the route's word on its way back", async () => {
    const t = COUPLE_NAMES_TEXT.pl;
    for (const [status, line] of [
      ["failed", t.statusFailed],
      ["limit", t.statusLimit],
      ["unavailable", t.statusUnavailable],
    ] as const) {
      const html = await render(
        "pl",
        { a: "Małgorzata", b: "Piotr", reading: status },
        { userId: "u1" },
      );
      expect(html, status).toContain(`<p role="alert">${line}</p>`);
    }
  });

  it("has none of the banned patterns on the rendered page, with a stored reading too (AC-7)", async () => {
    const d = deps({ stored: true });
    for (const lang of ["pl", "en"] as const) {
      const queries: Record<string, string>[] = [
        {},
        { a: "Małgorzata", b: "Piotr" },
        { a: "Anna", b: "Krzysztof" },
        { a: "Zzqx", b: "Lena" },
      ];
      for (const query of queries) {
        const lower = text(await render(lang, query, { userId: "u1" }, d)).toLowerCase();
        for (const pattern of COUPLE_NAMES_BANNED) {
          expect(lower, `${lang} ${JSON.stringify(query)}: ${String(pattern)}`).not.toMatch(
            pattern,
          );
        }
      }
      const lower = text(await render(lang, {}, null)).toLowerCase();
      for (const pattern of COUPLE_NAMES_BANNED) expect(lower, lang).not.toMatch(pattern);
    }
    expect(SAMPLE_PL).not.toMatch(/\d/u);
  });
});
