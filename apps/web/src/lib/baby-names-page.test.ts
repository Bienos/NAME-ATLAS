import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BABY_NAMES_FULL_TIERS } from "@name-atlas/accounts";
import type { PurchaseTier } from "@name-atlas/accounts";
import type { CitationDto } from "@name-atlas/contracts";
import type { BirthNameFacts, BirthNameLookup, BirthSexFigures } from "@name-atlas/truth";
import PlPage, { generateMetadata as plMetadata } from "../app/pl/imiona-dla-dziecka/page.js";
import EnPage, { generateMetadata as enMetadata } from "../app/en/baby-names/page.js";
import { middleware } from "../middleware.js";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { BabyNamesView, loadBabyNames } from "./baby-names-page.js";
import type { BabyNamesDeps } from "./baby-names-page.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import type { Lang } from "./messages.js";

/**
 * TASK-141 AC-1 to AC-4: the baby-names page with the flag off, signed out,
 * signed in without a purchase, and signed in with a 28,99 zł test purchase.
 * The figures below are ZOFIA's and JAKUB's claims on the full 2020 and 2025
 * files (the integration test reads them from a database); here they stand as
 * the reader's output, so the page is tested on what it renders.
 */

const PAGES = [
  { lang: "pl", Page: PlPage, metadata: plMetadata, path: "/pl/imiona-dla-dziecka" },
  { lang: "en", Page: EnPage, metadata: enMetadata, path: "/en/baby-names" },
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
  resetAccountsRuntimeForTests();
});

const cite = (resource: string): CitationDto => ({
  id: `cit-${resource}`,
  title: "Imiona nadawane dzieciom w Polsce",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: null,
  source_type: "OFFICIAL_DATASET",
  locator: `resource:${resource}`,
  url: `https://api.dane.gov.pl/resources/${resource}`,
  attribution: null,
  terms: null,
  retrieved_at: null,
  source_page_url: null,
});

const list = (year: number, sex: "MALE" | "FEMALE") => ({
  list_id: `${sex}-${year}`,
  birth_year: year,
  sex,
  publication_threshold: year <= 2012 ? 5 : 2,
});

function zofia(history: boolean): BirthNameFacts {
  const boys: BirthSexFigures = {
    sex: "MALE",
    latest: { birth_year: 2025, list: list(2025, "MALE"), count: null, rank: null },
    trend: null,
    history: null,
  };
  const girls: BirthSexFigures = {
    sex: "FEMALE",
    latest: {
      birth_year: 2025,
      list: list(2025, "FEMALE"),
      count: { claim_id: "c25", count: 4415, citation: cite("1159538") },
      rank: { claim_id: "r25", rank: 1, universe_size: 939, citation: cite("1159538") },
    },
    trend: {
      claim_id: "t25",
      direction: "STEADY",
      latest_year: 2025,
      earlier_year: 2020,
      window_years: 5,
      change_percent: 10,
      citations: [cite("1159538"), cite("28021")],
    },
    history: history
      ? [
          {
            birth_year: 2000,
            list: list(2000, "FEMALE"),
            count: { claim_id: "c00", count: 2913, citation: cite("21457") },
            rank: { claim_id: "r00", rank: 14, universe_size: 600, citation: cite("21457") },
          },
          // Absent before 2013: below that year's cut-off of 5, never 0.
          { birth_year: 2001, list: list(2001, "FEMALE"), count: null, rank: null },
          {
            birth_year: 2025,
            list: list(2025, "FEMALE"),
            count: { claim_id: "c25", count: 4415, citation: cite("1159538") },
            rank: { claim_id: "r25", rank: 1, universe_size: 939, citation: cite("1159538") },
          },
        ]
      : null,
  };
  return {
    given_name: { id: "zofia", display_name: "ZOFIA" },
    state: "READY",
    sexes: [{ ...boys, history: history ? [] : null }, girls],
  };
}

/** Deps over a fake store of purchases: user id → tiers bought in test mode. */
function deps(bought: Record<string, readonly PurchaseTier[]>): BabyNamesDeps {
  return {
    findName: (typed): Promise<BirthNameLookup> => {
      const key = typed.trim().toUpperCase();
      if (key === "ZOFIA") {
        return Promise.resolve({
          kind: "FOUND",
          given_name: { id: "zofia", display_name: "ZOFIA" },
        });
      }
      if (key === "LENA") return Promise.resolve({ kind: "HELD" });
      return Promise.resolve({ kind: "NOT_FOUND" });
    },
    readFacts: (_name, history) => Promise.resolve(zofia(history)),
    hasFullView: (userId) =>
      Promise.resolve((bought[userId] ?? []).some((t) => BABY_NAMES_FULL_TIERS.includes(t))),
  };
}

async function render(
  lang: Lang,
  query: Record<string, string>,
  session: { userId: string } | null,
  bought: Record<string, readonly PurchaseTier[]> = {},
): Promise<string> {
  const data = await loadBabyNames({ lang, query, session, deps: deps(bought) });
  // Entities back to characters, so the copy can be matched as written.
  return renderToStaticMarkup(createElement(BabyNamesView, { data }))
    .replace(/&#x27;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&");
}

describe("the baby-names pages (TASK-141)", () => {
  it("answer 404 with the flag unset or not exactly 1, with empty metadata (AC-1)", async () => {
    for (const value of [undefined, "0", "true", " 1"]) {
      vi.stubEnv("BABY_NAMES_ENABLED", value);
      for (const { lang, Page, metadata } of PAGES) {
        await expect(
          Page({ searchParams: Promise.resolve({}) }),
          `${lang} ${String(value)}`,
        ).rejects.toMatchObject({ digest: expect.stringContaining("404") as unknown });
        expect(metadata(), lang).toEqual({});
      }
    }
  });

  it("answer 404 with the flag on but accounts off, and are noindex when on (AC-1)", async () => {
    vi.stubEnv("BABY_NAMES_ENABLED", "1");
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

  it("are sent private, no-store, on or off (AC-1)", () => {
    for (const { path } of PAGES) {
      const response = middleware(new NextRequest(`https://name-atlas.pl${path}?imie=Zofia`));
      expect(response.headers.get("cache-control"), path).toBe("private, no-store");
    }
  });

  it("signed out: explain, name the source, link to sign-in and back; no figure (AC-2)", async () => {
    for (const [lang, signIn] of [
      ["pl", "/pl/konto/zaloguj?next=%2Fpl%2Fimiona-dla-dziecka"],
      ["en", "/en/account/sign-in?next=%2Fen%2Fbaby-names"],
    ] as const) {
      const html = await render(lang, { imie: "Zofia", name: "Zofia" }, null);
      const t = BABY_NAMES_TEXT[lang];
      expect(html, lang).toContain(t.signedOut);
      expect(html, lang).toContain("dane.gov.pl");
      expect(html, lang).toContain(`href="${signIn}"`);
      expect(html, lang).not.toContain("4415");
      expect(html, lang).not.toContain("4 415");
      expect(html, lang).not.toContain("<form");
    }
  });

  it("marks its own header link as the current page (TASK-143)", async () => {
    vi.stubEnv("BABY_NAMES_ENABLED", "1");
    vi.stubEnv("ACCOUNTS_DATABASE_URL", "postgres://app:pw@127.0.0.1:1/db");
    vi.stubEnv("RESEND_API_KEY", "re_key");
    vi.stubEnv("ACCOUNTS_MAIL_FROM", "Name Atlas <konto@example.test>");
    vi.stubEnv("SITE_ORIGIN", "https://atlas.example.test");
    vi.stubEnv("CRON_SECRET", "cron-secret");
    for (const [lang, href] of [
      ["pl", "/pl/imiona-dla-dziecka"],
      ["en", "/en/baby-names"],
    ] as const) {
      const html = await render(lang, {}, null);
      expect(html, lang).toContain(`class="nav-babyNames" href="${href}" aria-current="page"`);
    }
  });

  it("signed in, no purchase: the latest year by sex, the trend and its basis, and the locked card (AC-3, AC-4)", async () => {
    const html = await render("pl", { imie: "zofia" }, { userId: "u1" });
    const t = BABY_NAMES_TEXT.pl;
    expect(html).toContain('action="/pl/imiona-dla-dziecka"');
    expect(html).toContain('name="imie"');
    expect(html).toContain("ZOFIA");
    // Girls: 4 415 children, rank 1 of 939, steady, each with its source and year.
    expect(html).toMatch(/data-figure="count">4\s415</u);
    expect(html).toContain(`data-figure="rank">${t.rankOf("1", "939")}<`);
    expect(html).toContain('data-direction="STEADY"');
    expect(html).toContain(t.childrenIn(2025));
    expect(html).toContain(t.trendBasis(2025, 2020, 10));
    expect(html).toContain("zasób 1159538");
    expect(html).toContain("zasób 28021");
    // Boys: not on the 2025 list, below its cut-off of 2, never 0.
    expect(html).toContain(t.belowCutoff(2025, "2"));
    expect(html).not.toMatch(/data-figure="count">0</u);
    // The paid view is locked: the 8,99 zł tier, "Wkrótce", no button or link to buy.
    expect(html).toContain(t.lockedTier);
    expect(html).toContain("8,99 zł");
    expect(html).toContain(t.soon);
    expect(html).not.toContain(t.historyHeading + "<");
    const locked = html.slice(
      html.indexOf("baby-locked"),
      html.indexOf("</section>", html.indexOf("baby-locked")),
    );
    expect(locked).not.toMatch(/<button|<a /u);
    // Only the search form's own button is on the page.
    expect(html.match(/<button/gu)).toHaveLength(1);
  });

  it("signed in with a 28,99 zł test purchase: every year, with cut-offs; no locked card (AC-4)", async () => {
    const bought = { u2: ["smaller"] as const };
    const html = await render("en", { name: "Zofia" }, { userId: "u2" }, bought);
    const t = BABY_NAMES_TEXT.en;
    expect(html).toContain(`<h2>${t.historyHeading}</h2>`);
    expect(html).toContain('data-year="2000"');
    expect(html).toMatch(/<td>2,913<\/td><td>14 of 600<\/td><td class="baby-ref">\[1\]<\/td>/u);
    expect(html).toContain(t.rankOf("14", "600"));
    // 2001: absent, so below that year's cut-off of 5.
    expect(html).toMatch(
      /data-year="2001"><th scope="row">2001<\/th><td colspan="2" class="baby-below">&lt; 5<\/td>/iu,
    );
    expect(html).toContain("resource 21457");
    expect(html).not.toContain("baby-locked");
  });

  it("checks the tier, not any purchase: only 8,99, 28,99, 89,99 and 199 zł open the history (AC-3)", async () => {
    for (const tier of ["babynames", "smaller", "couple", "family"] as const) {
      const html = await render("pl", { imie: "Zofia" }, { userId: "u" }, { u: [tier] });
      expect(html, tier).toContain('data-year="2000"');
    }
    // Another reader's purchase does not open it.
    const other = await render("pl", { imie: "Zofia" }, { userId: "u3" }, { u4: ["smaller"] });
    expect(other).not.toContain('data-year="2000"');
    expect(other).toContain(BABY_NAMES_TEXT.pl.soon);
  });

  it("says plainly when a name is on no list, holds back a flagged form, and asks for a name", async () => {
    const t = BABY_NAMES_TEXT.pl;
    expect(await render("pl", { imie: "Qwxyzzy" }, { userId: "u" })).toContain(
      t.notFound("Qwxyzzy"),
    );
    expect(await render("pl", { imie: "Lena" }, { userId: "u" })).toContain(t.held);
    const empty = await render("pl", {}, { userId: "u" });
    expect(empty).toContain("<form");
    expect(empty).not.toContain("ZOFIA");
  });
});

describe("loadBabyNames", () => {
  it("does not read a name's figures for a signed-out reader", async () => {
    const readFacts = vi.fn();
    const data = await loadBabyNames({
      lang: "pl",
      query: { imie: "Zofia" },
      session: null,
      deps: { ...deps({}), readFacts },
    });
    expect(data.kind).toBe("signed-out");
    expect(readFacts).not.toHaveBeenCalled();
  });

  it("asks for the history only when the account holds a tier that includes it", async () => {
    const readFacts = vi.fn((_n: unknown, history: boolean) => Promise.resolve(zofia(history)));
    for (const [bought, history] of [
      [{}, false],
      [{ u: ["babynames"] }, true],
      [{ u: ["smaller"] }, true],
    ] as const) {
      await loadBabyNames({
        lang: "en",
        query: { name: "Zofia" },
        session: { userId: "u" },
        deps: { ...deps(bought), readFacts },
      });
      expect(readFacts).toHaveBeenLastCalledWith({ id: "zofia", display_name: "ZOFIA" }, history);
    }
  });
});
