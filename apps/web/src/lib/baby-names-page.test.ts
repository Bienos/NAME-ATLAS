import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BABY_NAMES_FULL_TIERS } from "@name-atlas/accounts";
import type { PurchaseTier } from "@name-atlas/accounts";
import type { CitationDto } from "@name-atlas/contracts";
import type {
  BirthNameFacts,
  BirthNameLookup,
  BirthSexFigures,
  GivenNameFacts,
  GivenNameListFacts,
} from "@name-atlas/truth";
import PlPage, { generateMetadata as plMetadata } from "../app/pl/imiona-dla-dziecka/page.js";
import EnPage, { generateMetadata as enMetadata } from "../app/en/baby-names/page.js";
import { middleware } from "../middleware.js";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { BabyNamesView, loadBabyNames } from "./baby-names-page.js";
import type { BabyNamesDeps } from "./baby-names-page.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import { formatInteger } from "./messages.js";
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

const registerCite = (resource: string): CitationDto => ({
  ...cite(resource),
  title: "Lista imion występujących w rejestrze PESEL",
});

const registerList = (
  sex: "male" | "female",
  people: number,
  rank: number | null,
  universe: number,
): GivenNameListFacts => {
  const resource = sex === "male" ? "1159669" : "1159670";
  const conf = { status: "HIGH", methodology_code: "x@1" };
  return {
    comparability_group: `pesel_given_names_2026_first_${sex}`,
    snapshot_date: "2026-01-20",
    count: {
      claim_id: `p-${sex}`,
      count: people,
      confidence: conf,
      citation: registerCite(resource),
    },
    rank:
      rank === null
        ? null
        : {
            claim_id: `k-${sex}`,
            rank,
            universe_size: universe,
            ties_policy: "shared",
            confidence: conf,
            citation: registerCite(resource),
          },
  };
};

/** Zofia in both register lists, with different counts so a sum would show. */
const ZOFIA_STOCK: GivenNameFacts = {
  given_name: { id: "zofia", display_name: "ZOFIA" },
  state: "READY",
  lists: [registerList("female", 321456, 12, 28781), registerList("male", 77, null, 46197)],
};

/** A rare name: one list only. */
const RARA_STOCK: GivenNameFacts = {
  given_name: { id: "rara", display_name: "RARA" },
  state: "READY",
  lists: [registerList("female", 5, 9000, 28781)],
};

const NO_STOCK = (id: string): GivenNameFacts => ({
  given_name: { id, display_name: id.toUpperCase() },
  state: "UNAVAILABLE",
  lists: [],
});

const STORED_LISTS = [list(2024, "MALE"), list(2025, "MALE"), list(2025, "FEMALE")];

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
      for (const id of ["TYMON", "RARA", "NIKT"]) {
        if (key === id) {
          return Promise.resolve({
            kind: "FOUND",
            given_name: { id: id.toLowerCase(), display_name: id },
          });
        }
      }
      if (key === "LENA") return Promise.resolve({ kind: "HELD" });
      return Promise.resolve({ kind: "NOT_FOUND" });
    },
    readFacts: (name, history) => {
      if (name.id === "rara" || name.id === "nikt") {
        return Promise.resolve({
          given_name: name,
          state: "NOT_ON_ANY_LIST",
          sexes: [],
        } satisfies BirthNameFacts);
      }
      return Promise.resolve({ ...zofia(history), given_name: name });
    },
    readStock: (name) =>
      Promise.resolve(
        name.id === "zofia" ? ZOFIA_STOCK : name.id === "rara" ? RARA_STOCK : NO_STOCK(name.id),
      ),
    readLists: () => Promise.resolve(STORED_LISTS),
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

describe("the register's count beside the birth-year figures (TASK-145)", () => {
  const field = { pl: "imie", en: "name" } as const;

  /** The register block inside one sex's section. */
  const block = (html: string, sex: "MALE" | "FEMALE"): string => {
    const start = html.indexOf(`data-register="${sex}"`);
    expect(start).toBeGreaterThan(-1);
    return html.slice(start, html.indexOf("</section>", start));
  };

  const occurrences = (html: string, text: string): number => html.split(text).length - 1;

  it("ZOFIA: each sex's own register list with its count, N of M, date and source; no sum (AC-1, AC-4)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(lang, { [field[lang]]: "zofia" }, { userId: "u" });
      const t = BABY_NAMES_TEXT[lang];
      const women = block(html, "FEMALE");
      const men = block(html, "MALE");
      const n = (v: number) => formatInteger(v, lang);
      expect(women, lang).toContain(`data-figure="register-count">${n(321456)}<`);
      expect(women, lang).toContain(`data-figure="register-rank">${t.rankOf("12", n(28781))}<`);
      expect(women, lang).toContain(
        t.registerAsOf(lang === "pl" ? "20 stycznia 2026 r." : "20 January 2026"),
      );
      expect(women, lang).toContain(lang === "pl" ? "zasób 1159670" : "resource 1159670");
      expect(women, lang).toContain("Lista imion występujących w rejestrze PESEL");
      expect(men, lang).toContain('data-figure="register-count">77<');
      expect(men, lang).toContain(lang === "pl" ? "zasób 1159669" : "resource 1159669");
      // No rank claim for the men's list: no rank figure, never a 0.
      expect(men, lang).not.toContain("register-rank");
      // The birth-year figure is as before, and no sum of any two figures appears.
      expect(html, lang).toContain(`data-figure="count">${n(4415)}<`);
      for (const sum of ["321533", "321 533", "321,533", "325871", "325 871", "325,871"]) {
        expect(html, sum).not.toContain(sum);
      }
      expect(html, lang).toContain(t.registerDiffers);
      expect(html, lang).toContain(t.apart);
    }
  });

  it("a name on a birth list but on no register list: a plain line, never 0 (AC-2)", async () => {
    const html = await render("pl", { imie: "tymon" }, { userId: "u" });
    const t = BABY_NAMES_TEXT.pl;
    expect(html).toContain(t.childrenIn(2025));
    expect(occurrences(html, t.registerNone)).toBe(2);
    expect(html).not.toContain("register-count");
  });

  it("a rare name in the register only: its list, the cut-off statement and no 0 (AC-2)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(lang, { [field[lang]]: "rara" }, { userId: "u" });
      const t = BABY_NAMES_TEXT[lang];
      const n = (v: number) => formatInteger(v, lang);
      expect(html, lang).toContain("RARA");
      expect(html, lang).not.toContain(t.notFound("rara"));
      expect(block(html, "FEMALE"), lang).toContain('data-figure="register-count">5<');
      expect(block(html, "FEMALE"), lang).toContain(t.rankOf(n(9000), n(28781)));
      // The men's list holds no claim for it: a plain line, not a figure.
      expect(block(html, "MALE"), lang).toContain(t.registerNone);
      expect(block(html, "MALE"), lang).not.toContain("register-count");
      // Each sex's latest stored list: 2025, cut-off 2.
      expect(occurrences(html, t.belowCutoff(2025, "2")), lang).toBe(2);
      expect(html, lang).not.toContain('data-figure="count"');
      expect(html, lang).not.toMatch(/data-figure="[a-z-]*count">0</u);
      expect(html, lang).toContain(t.registerDiffers);
    }
  });

  it("a name in neither dataset: not found, as before (AC-2)", async () => {
    const html = await render("pl", { imie: "nikt" }, { userId: "u" });
    expect(html).toContain(BABY_NAMES_TEXT.pl.notFound("nikt"));
    expect(html).not.toContain("data-register");
  });

  it("a held form shows neither dataset's figure", async () => {
    const html = await render("pl", { imie: "lena" }, { userId: "u" });
    expect(html).toContain(BABY_NAMES_TEXT.pl.held);
    expect(html).not.toContain("data-register");
  });

  it("signed out: no figure at all; signed in, the locked card is unchanged (AC-3)", async () => {
    const readStock = vi.fn();
    const data = await loadBabyNames({
      lang: "pl",
      query: { imie: "zofia" },
      session: null,
      deps: { ...deps({}), readStock },
    });
    expect(readStock).not.toHaveBeenCalled();
    const html = renderToStaticMarkup(createElement(BabyNamesView, { data }));
    expect(html).not.toContain("data-register");
    const signedIn = await render("pl", { imie: "zofia" }, { userId: "u" });
    expect(signedIn).toContain("8,99 zł");
    expect(signedIn).toContain(BABY_NAMES_TEXT.pl.soon);
  });

  it("a rights-blocked register shows no figure, only the plain refusal", async () => {
    const data = await loadBabyNames({
      lang: "en",
      query: { name: "zofia" },
      session: { userId: "u" },
      deps: {
        ...deps({}),
        readStock: () => Promise.resolve({ ...ZOFIA_STOCK, state: "RIGHTS_BLOCKED", lists: [] }),
      },
    });
    const html = renderToStaticMarkup(createElement(BabyNamesView, { data }));
    expect(html).not.toContain("register-count");
    expect(html).toContain("We cannot show these figures here.");
  });

  it("reaches the page through claims only: nothing reads given_name_counts (AC-4)", () => {
    for (const file of ["baby-names-page.tsx", "baby-names-text.ts"]) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(source, file).not.toContain("given_name_counts");
    }
  });

  it("is free: the register block does not depend on a purchase", async () => {
    const free = await render("pl", { imie: "zofia" }, { userId: "u" });
    const paid = await render("pl", { imie: "zofia" }, { userId: "u2" }, { u2: ["smaller"] });
    expect(free).toContain('data-figure="register-count"');
    expect(paid).toContain('data-figure="register-count"');
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
