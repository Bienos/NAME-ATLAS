import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BABY_NAMES_FULL_TIERS } from "@name-atlas/accounts";
import type { PurchaseTier } from "@name-atlas/accounts";
import type { CitationDto } from "@name-atlas/contracts";
import type { BirthListInfo, BirthListOptions, BirthListPage } from "@name-atlas/truth";
import PlPage, { generateMetadata as plMetadata } from "../app/pl/imiona-dla-dziecka/lista/page.js";
import EnPage, { generateMetadata as enMetadata } from "../app/en/baby-names/list/page.js";
import { middleware } from "../middleware.js";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { BabyNamesListView, loadBabyNamesList } from "./baby-names-list-page.js";
import type { BabyNamesListDeps } from "./baby-names-list-page.js";
import { BABY_NAMES_LIST_TEXT } from "./baby-names-list-text.js";
import type { Lang } from "./messages.js";

/**
 * TASK-146 AC-1 to AC-5: the baby-names list page with the flag off, signed
 * out, signed in without an entitlement, and with a `babynames` or a
 * 28,99 zł+ test purchase. The reader is a fake over 300 names; the SQL is
 * the integration test's.
 */

const PAGES = [
  { lang: "pl", Page: PlPage, metadata: plMetadata, path: "/pl/imiona-dla-dziecka/lista" },
  { lang: "en", Page: EnPage, metadata: enMetadata, path: "/en/baby-names/list" },
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
  resetAccountsRuntimeForTests();
});

const cite: CitationDto = {
  id: "cit-1",
  title: "Imiona nadawane dzieciom w Polsce",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: null,
  source_type: "OFFICIAL_DATASET",
  locator: "resource:1159538",
  url: "https://api.dane.gov.pl/resources/1159538",
  attribution: null,
  terms: null,
  retrieved_at: null,
  source_page_url: null,
};

const LISTS: BirthListInfo[] = [];
for (const sex of ["MALE", "FEMALE"] as const) {
  for (const year of [2000, 2020, 2025]) {
    LISTS.push({
      list_id: `${sex}-${year}`,
      birth_year: year,
      sex,
      publication_threshold: year <= 2012 ? 5 : 2,
      people_sum: 100000,
    });
  }
}

/** The names of a list: `KOBIETA001`… for girls, `MEZCZYZNA001`… for boys; ranks 1..300, two tied at 5. */
const nameOf = (sex: string, n: number): string =>
  `${sex === "FEMALE" ? "KOBIETA" : "MEZCZYZNA"}${String(n).padStart(3, "0")}`;
const TOTAL = 300;

interface Calls {
  readonly pages: { list: BirthListInfo; options: BirthListOptions }[];
}

function deps(bought: Record<string, readonly PurchaseTier[]>, calls: Calls): BabyNamesListDeps {
  return {
    readLists: () => Promise.resolve(LISTS),
    readPage: (list, options) => {
      calls.pages.push({ list, options });
      const all = Array.from({ length: TOTAL }, (_, i) => i + 1)
        // The fake direction: every third name rising, every fifth falling.
        .map((n) => ({
          given_name_id: `${list.sex}-${n}`,
          display_name: nameOf(list.sex, n),
          count: 5000 - n,
          rank: n === 6 ? 5 : n,
          universe_size: TOTAL,
          direction: !options.withTrend
            ? null
            : n % 3 === 0
              ? ("RISING" as const)
              : n % 5 === 0
                ? ("FALLING" as const)
                : ("STEADY" as const),
        }))
        .filter((r) => options.direction === null || r.direction === options.direction);
      const page: BirthListPage = {
        state: "READY",
        list,
        rows: all.slice(options.offset, options.offset + options.limit),
        total: all.length,
        citations: [cite],
      };
      return Promise.resolve(page);
    },
    hasFullView: (userId) =>
      Promise.resolve((bought[userId] ?? []).some((t) => BABY_NAMES_FULL_TIERS.includes(t))),
  };
}

async function render(
  lang: Lang,
  query: Record<string, string>,
  session: { userId: string } | null,
  bought: Record<string, readonly PurchaseTier[]> = {},
  calls: Calls = { pages: [] },
): Promise<string> {
  const data = await loadBabyNamesList({ lang, query, session, deps: deps(bought, calls) });
  return renderToStaticMarkup(createElement(BabyNamesListView, { data }))
    .replace(/&#x27;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&");
}

const girls = (n: number) => nameOf("FEMALE", n);
const boys = (n: number) => nameOf("MALE", n);

describe("the baby-names list pages (TASK-146)", () => {
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
      for (const flag of [undefined, "1"]) {
        vi.stubEnv("BABY_NAMES_ENABLED", flag);
        const response = middleware(new NextRequest(`https://name-atlas.pl${path}?year=2020`));
        expect(response.headers.get("cache-control"), path).toBe("private, no-store");
      }
    }
  });

  it("signed out: explain, name the source, link to sign-in and back; no name, no figure (AC-2)", async () => {
    for (const [lang, signIn] of [
      ["pl", "/pl/konto/zaloguj?next=%2Fpl%2Fimiona-dla-dziecka%2Flista"],
      ["en", "/en/account/sign-in?next=%2Fen%2Fbaby-names%2Flist"],
    ] as const) {
      const calls: Calls = { pages: [] };
      const html = await render(lang, { year: "2020", page: "2" }, null, {}, calls);
      expect(html, lang).toContain(BABY_NAMES_LIST_TEXT[lang].signedOut);
      expect(html, lang).toContain("dane.gov.pl");
      expect(html, lang).toContain(`href="${signIn}"`);
      expect(html, lang).not.toMatch(/KOBIETA|MEZCZYZNA/u);
      expect(html, lang).not.toContain("<form");
      expect(calls.pages, lang).toEqual([]);
    }
  });

  it("signed in, no entitlement: the top 10 of the latest list, directions, source once, the locked card (AC-2, AC-5)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const t = BABY_NAMES_LIST_TEXT[lang];
      const calls: Calls = { pages: [] };
      const html = await render(lang, {}, { userId: "u1" }, {}, calls);
      // The boys' list (the default): ranks 1 to 10 only; the 11th is nowhere in the response.
      for (let n = 1; n <= 10; n++) expect(html, `${lang} ${n}`).toContain(boys(n));
      expect(html, lang).not.toContain(boys(11));
      expect(html, lang).not.toContain(girls(1));
      expect(html, lang).toContain(t.listHeading(t.sexes.MALE, 2025));
      expect(html, lang).toContain(t.cutoff("2"));
      expect(html, lang).toContain('data-direction="RISING"');
      expect(html.split("Imiona nadawane dzieciom w Polsce, Ministerstwo").length - 1, lang).toBe(
        1,
      );
      expect(html, lang).toContain(
        `href="${lang === "pl" ? "/pl/imiona-dla-dziecka?imie=" : "/en/baby-names?name="}${boys(1)}"`,
      );
      // The locked card: price and "soon"; no way to buy.
      expect(html, lang).toContain("8,99 zł");
      expect(html, lang).toContain(t.soon);
      expect(html, lang).not.toMatch(/checkout|stripe/iu);
      const locked = html.slice(
        html.indexOf("baby-locked"),
        html.indexOf("</section>", html.indexOf("baby-locked")),
      );
      expect(locked, lang).not.toMatch(/<button|<a /u);
      // The page's own filters have the only button.
      expect(html.match(/<button/gu), lang).toHaveLength(1);
      expect(calls.pages).toHaveLength(1);
      expect(calls.pages[0]?.options).toMatchObject({ surface: "FREE", limit: 10, offset: 0 });
    }
  });

  it("signed in, no entitlement: the girls' list is its own latest list, never merged (AC-2)", async () => {
    const html = await render("en", { sex: "girls" }, { userId: "u1" });
    expect(html).toContain(girls(1));
    expect(html).toContain(girls(10));
    expect(html).not.toContain(girls(11));
    expect(html).not.toMatch(/MEZCZYZNA/u);
  });

  it("signed in, no entitlement: another year, a page beyond the free rows or a direction filter is the locked card and no read (AC-2)", async () => {
    const queries: Record<string, string>[] = [
      { year: "2020" },
      { year: "2000", sex: "girls" },
      { page: "2" },
      { trend: "rising" },
      { trend: "falling", year: "2025" },
    ];
    for (const query of queries) {
      for (const lang of ["pl", "en"] as const) {
        const calls: Calls = { pages: [] };
        const html = await render(lang, query, { userId: "u1" }, {}, calls);
        const label = `${lang} ${JSON.stringify(query)}`;
        expect(html, label).toContain(BABY_NAMES_LIST_TEXT[lang].lockedHeading);
        expect(html, label).toContain("8,99 zł");
        // No name of either list is anywhere in the response, not even in a link.
        expect(html, label).not.toMatch(/KOBIETA|MEZCZYZNA/u);
        expect(calls.pages, label).toEqual([]);
      }
    }
  });

  it("a purchase of nothing relevant is no entitlement; so is another reader's purchase (AC-2)", async () => {
    const calls: Calls = { pages: [] };
    const html = await render(
      "pl",
      { year: "2020" },
      { userId: "u9" },
      { u1: ["babynames"], u9: [] },
      calls,
    );
    expect(html).toContain(BABY_NAMES_LIST_TEXT.pl.lockedHeading);
    expect(html).not.toMatch(/KOBIETA|MEZCZYZNA/u);
    expect(calls.pages).toEqual([]);
  });

  it("with a babynames purchase, and with each tier from 28,99 zł: any year, 100 rows, paging, the filter (AC-3)", async () => {
    for (const tier of ["babynames", "smaller", "couple", "family"] as const) {
      const bought = { u: [tier] };
      const calls: Calls = { pages: [] };
      const first = await render("pl", { sex: "girls" }, { userId: "u" }, bought, calls);
      expect(first, tier).toContain(girls(1));
      expect(first, tier).toContain(girls(100));
      expect(first, tier).not.toContain(girls(101));
      expect(first, tier).not.toContain("baby-locked");
      expect(first.match(/<button/gu), tier).toHaveLength(1);
      expect(calls.pages[0]?.options, tier).toMatchObject({
        surface: "PAID",
        limit: 100,
        offset: 0,
      });
      // Page 2 continues; its link is on page 1.
      expect(first, tier).toContain('href="/pl/imiona-dla-dziecka/lista?sex=girls&page=2"');
      const second = await render(
        "pl",
        { sex: "girls", page: "2" },
        { userId: "u" },
        bought,
        calls,
      );
      expect(second, tier).toContain(girls(101));
      expect(second, tier).toContain(girls(200));
      expect(second, tier).not.toContain(girls(100));
      expect(second, tier).toContain('rel="prev"');
      const last = await render("pl", { sex: "girls", page: "3" }, { userId: "u" }, bought);
      expect(last, tier).toContain(girls(300));
      expect(last, tier).not.toContain('rel="next"');
      // Another year: a list of its own, with no direction column.
      const old = await render("en", { year: "2000" }, { userId: "u" }, bought);
      expect(old, tier).toContain(BABY_NAMES_LIST_TEXT.en.listHeading("Boys", 2000));
      expect(old, tier).toContain(BABY_NAMES_LIST_TEXT.en.cutoff("5"));
      expect(old, tier).not.toContain(
        `<th scope="col">${BABY_NAMES_LIST_TEXT.en.directionColumn}</th>`,
      );
    }
  });

  it("the direction filter reaches the reader for the latest year only; another year says so (AC-3)", async () => {
    const bought = { u: ["babynames"] as const };
    const calls: Calls = { pages: [] };
    const rising = await render("en", { trend: "rising" }, { userId: "u" }, bought, calls);
    expect(calls.pages[0]?.options).toMatchObject({ direction: "RISING", withTrend: true });
    expect(rising).toContain(boys(3));
    expect(rising).not.toContain(boys(1));
    expect(rising).toContain('data-direction="RISING"');
    expect(rising).not.toContain('data-direction="FALLING"');
    expect(rising).toContain("Names 1–100 of 100.");
    const other = await render(
      "en",
      { trend: "rising", year: "2020" },
      { userId: "u" },
      bought,
      calls,
    );
    expect(calls.pages[1]?.options).toMatchObject({ direction: null, withTrend: false });
    expect(other).toContain(BABY_NAMES_LIST_TEXT.en.trendOnlyLatest(2025));
    expect(other).toContain(boys(1));
  });

  it("ties share a rank, and a name with no rank shows none (AC-4)", async () => {
    const html = await render("en", {}, { userId: "u" }, { u: ["babynames"] });
    expect(html.match(/data-figure="rank">5</gu)).toHaveLength(2);
    const noRank: BabyNamesListDeps = {
      ...deps({ u: ["babynames"] }, { pages: [] }),
      readPage: (list) =>
        Promise.resolve({
          state: "READY",
          list,
          rows: [
            {
              given_name_id: "x",
              display_name: "IMIE",
              count: 7,
              rank: null,
              universe_size: null,
              direction: null,
            },
          ],
          total: 1,
          citations: [cite],
        }),
    };
    const data = await loadBabyNamesList({
      lang: "en",
      query: { year: "2000" },
      session: { userId: "u" },
      deps: noRank,
    });
    const out = renderToStaticMarkup(createElement(BabyNamesListView, { data }));
    expect(out).toContain('data-figure="rank">—<');
    expect(out).not.toContain('data-figure="rank">0<');
  });

  it("an unknown year is no list, and no page past the end is shown (AC-3)", async () => {
    const bought = { u: ["babynames"] as const };
    const none = await render("en", { year: "1999" }, { userId: "u" }, bought);
    expect(none).toContain(BABY_NAMES_LIST_TEXT.en.noList);
    expect(none).not.toMatch(/KOBIETA|MEZCZYZNA/u);
    const past = await render("en", { page: "9" }, { userId: "u" }, bought);
    expect(past).toContain(BABY_NAMES_LIST_TEXT.en.noPage);
  });

  it("a rights refusal shows the plain refusal and no name", async () => {
    const blocked: BabyNamesListDeps = {
      ...deps({}, { pages: [] }),
      readPage: (list) =>
        Promise.resolve({ state: "RIGHTS_BLOCKED", list, rows: [], total: 0, citations: [] }),
    };
    const data = await loadBabyNamesList({
      lang: "pl",
      query: {},
      session: { userId: "u" },
      deps: blocked,
    });
    const out = renderToStaticMarkup(createElement(BabyNamesListView, { data }));
    expect(out).toContain("Tych danych nie możemy tu pokazać.");
    expect(out).not.toMatch(/<table/u);
  });

  it("is in no sitemap (AC-1)", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(__dirname, "..", "app");
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
      );
    const files = readdirSync(dir)
      .filter((f) => f.startsWith("sitemap") || f.startsWith("robots"))
      .flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/imiona-dla-dziecka|baby-names/u);
    }
  });
});
