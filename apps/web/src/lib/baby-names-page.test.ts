import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BABY_NAMES_FULL_TIERS } from "@name-atlas/accounts";
import type { PurchaseTier } from "@name-atlas/accounts";
import type { CitationDto } from "@name-atlas/contracts";
import { birthShare } from "@name-atlas/truth";
import type {
  BirthCountFigure,
  BirthNameFacts,
  BirthNameLookup,
  BirthSexFigures,
  BirthYearFigures,
  GivenNameFacts,
  GivenNameListFacts,
  GivenNameMeaningFacts,
} from "@name-atlas/truth";
import PlPage, { generateMetadata as plMetadata } from "../app/pl/imiona-dla-dziecka/page.js";
import EnPage, { generateMetadata as enMetadata } from "../app/en/baby-names/page.js";
import { middleware } from "../middleware.js";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import {
  BabyNamesView,
  DOT_GRID_MAX,
  YEARS_SHOWN,
  ladderYears,
  loadBabyNames,
  peakOf,
  trackPosition,
} from "./baby-names-page.js";
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

/** The girls' lists' children (ADR-0042 `people_sum`): 2025 and 2020 as the full files give them. */
const PEOPLE_SUM: Readonly<Record<number, number>> = { 2025: 119_788, 2020: 176_829 };

const list = (year: number, sex: "MALE" | "FEMALE") => ({
  list_id: `${sex}-${year}`,
  birth_year: year,
  sex,
  publication_threshold: year <= 2012 ? 5 : 2,
  people_sum: PEOPLE_SUM[year] ?? 100_000,
});

/** A count claim with its share and "1 in N" as the reader computes them (TASK-151). */
const countOf = (
  year: number,
  sex: "MALE" | "FEMALE",
  count: number,
  resource: string,
): BirthCountFigure => ({
  claim_id: `c-${sex}-${year}`,
  count,
  ...birthShare(count, list(year, sex).people_sum),
  citation: cite(resource),
});

/** One year of the girls' history: a count and rank, or an absence (count null). */
const year = (
  y: number,
  count: number | null,
  rank: number | null,
  resource = y >= 2020 ? (y === 2020 ? "28021" : "1159538") : "21457",
): BirthYearFigures => ({
  birth_year: y,
  list: list(y, "FEMALE"),
  count: count === null ? null : countOf(y, "FEMALE", count, resource),
  rank:
    rank === null || count === null
      ? null
      : { claim_id: `r-${y}`, rank, universe_size: y < 2013 ? 600 : 939, citation: cite(resource) },
});

/**
 * ZOFIA's girls' history, 2000 to 2025: 2 913 in 2000 (rank 14), absent in
 * 2001 (below the cut-off of 5), then counts rising to a peak of 9 012 in 2017
 * (rank 1, as in 2016 and 2018), falling to 4 415 in 2025 (rank 1).
 */
const GIRLS_COUNTS: readonly (number | null)[] = [
  2913,
  null,
  3100,
  3400,
  3700,
  4000,
  4300,
  4700,
  5100,
  5600,
  6100,
  6600,
  7000,
  7400,
  7900,
  8400,
  8800,
  9012,
  8900,
  8500,
  7073,
  6500,
  5900,
  5300,
  4800,
  4415,
];
const GIRLS_RANKS: readonly (number | null)[] = [
  14,
  null,
  13,
  12,
  11,
  10,
  9,
  8,
  7,
  6,
  5,
  4,
  3,
  3,
  2,
  2,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  1,
  1,
  1,
];
function girlsHistory(): BirthYearFigures[] {
  return GIRLS_COUNTS.map((count, i) => year(2000 + i, count, GIRLS_RANKS[i] ?? null));
}

/** The boys: a stored list every year, the name on none of them. */
function boysHistory(): BirthYearFigures[] {
  return Array.from({ length: 26 }, (_, i) => ({
    birth_year: 2000 + i,
    list: list(2000 + i, "MALE"),
    count: null,
    rank: null,
  }));
}

function zofia(history: boolean): BirthNameFacts {
  const boys: BirthSexFigures = {
    sex: "MALE",
    on_any_list: false,
    latest: { birth_year: 2025, list: list(2025, "MALE"), count: null, rank: null },
    trend: null,
    history: history ? boysHistory() : null,
  };
  const latest = year(2025, 4415, 1);
  const girls: BirthSexFigures = {
    sex: "FEMALE",
    on_any_list: true,
    latest,
    trend: {
      claim_id: "t25",
      direction: "STEADY",
      latest_year: 2025,
      earlier_year: 2020,
      window_years: 5,
      change_percent: 10,
      // The claim's own shares: 7 073 of 176 829 in 2020, 4 415 of 119 788 in 2025.
      latest_share_per_million: 36856,
      earlier_share_per_million: 39999,
      citations: [cite("1159538"), cite("28021")],
    },
    history: history ? girlsHistory() : null,
  };
  return {
    given_name: { id: "zofia", display_name: "ZOFIA" },
    state: "READY",
    sexes: [boys, girls],
  };
}

/** ZOFIA's figures under another name, with one sex's figures changed (TASK-157). */
function variant(
  history: boolean,
  name: string,
  change: { readonly MALE?: Partial<BirthSexFigures>; readonly FEMALE?: Partial<BirthSexFigures> },
): BirthNameFacts {
  const facts = zofia(history);
  return {
    ...facts,
    given_name: { id: name.toLowerCase(), display_name: name },
    sexes: facts.sexes.map((s) => ({ ...s, ...change[s.sex] })),
  };
}

/** The girls' lists, and the boys' 2022 list only (2 boys): a stray earlier record. */
const nikola = (history: boolean): BirthNameFacts =>
  variant(history, "NIKOLA", {
    MALE: {
      on_any_list: true,
      history: history
        ? boysHistory().map((y) =>
            y.birth_year === 2022 ? { ...y, count: countOf(2022, "MALE", 2, "21457") } : y,
          )
        : null,
    },
  });

/** On both sexes' 2025 lists: 3 boys beside ZOFIA's girls. */
const noa = (history: boolean): BirthNameFacts =>
  variant(history, "NOA", {
    MALE: {
      on_any_list: true,
      latest: {
        birth_year: 2025,
        list: list(2025, "MALE"),
        count: countOf(2025, "MALE", 3, "1159536"),
        rank: null,
      },
      history: null,
    },
  });

/** On earlier lists of both sexes, on neither 2025 list. */
const ariel = (history: boolean): BirthNameFacts =>
  variant(history, "ARIEL", {
    MALE: { on_any_list: true, history: null },
    FEMALE: {
      latest: { birth_year: 2025, list: list(2025, "FEMALE"), count: null, rank: null },
      trend: null,
      history: null,
    },
  });

const VARIANTS: Readonly<Record<string, (history: boolean) => BirthNameFacts>> = {
  nikola,
  noa,
  ariel,
};

/** Yonge's and Buryan's entries for a name, as `readGivenNameMeaning` gives them (TASK-147). */
const MEANING_READY: GivenNameMeaningFacts = {
  state: "READY",
  claim_id: "m-zofia",
  confidence: { status: "LIKELY", methodology_code: "given_name_meaning@1" },
  works: [
    {
      work: { title: "Pochodzenie i znaczenie imion", author_or_publisher: "Buryan", year: 1933 },
      printed_form: "Zofja",
      origin: { code: "grc", as_printed: "grec." },
      literal_gloss: null,
      translation: null,
      locator: "s. 41",
      quotation: "Zofja (grec.) — mądrość.",
      citation: {
        ...cite("buryan"),
        title: "Pochodzenie i znaczenie imion",
        publisher: "Buryan",
        locator: "s. 41",
        url: "https://polona.pl/buryan",
      },
    },
    {
      work: { title: "History of Christian Names", author_or_publisher: "Yonge", year: 1884 },
      printed_form: "Zofia",
      origin: { code: "grc", as_printed: "Gr." },
      literal_gloss: "wisdom",
      translation: { language: "pl", text: "mądrość", by: "Name Atlas" },
      locator: "Glossary, Polish",
      quotation: "Zofia, Gr., wisdom.",
      citation: {
        ...cite("yonge"),
        title: "History of Christian Names",
        publisher: "Yonge",
        locator: "Glossary, Polish",
        url: null,
      },
    },
  ],
};
const MEANING_NONE: GivenNameMeaningFacts = { state: "NO_SOURCE" };

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
      for (const id of ["TYMON", "RARA", "NIKT", "NIKOLA", "NOA", "ARIEL"]) {
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
      const variantOf = VARIANTS[name.id];
      if (variantOf !== undefined) return Promise.resolve(variantOf(history));
      return Promise.resolve({ ...zofia(history), given_name: name });
    },
    readStock: (name) =>
      Promise.resolve(
        name.id === "zofia" || VARIANTS[name.id] !== undefined
          ? ZOFIA_STOCK
          : name.id === "rara"
            ? RARA_STOCK
            : NO_STOCK(name.id),
      ),
    readLists: () => Promise.resolve(STORED_LISTS),
    hasFullView: (userId) =>
      Promise.resolve((bought[userId] ?? []).some((t) => BABY_NAMES_FULL_TIERS.includes(t))),
    readMeaning: (name) => Promise.resolve(name.id === "zofia" ? MEANING_READY : MEANING_NONE),
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
      const html = await render(lang, {}, null);
      const t = BABY_NAMES_TEXT[lang];
      expect(html, lang).toContain(t.out.whatHeading);
      expect(html, lang).toContain("dane.gov.pl");
      expect(html, lang).toContain(`href="${signIn}"`);
      expect(html, lang).not.toContain("4415");
      expect(html, lang).not.toContain("4 415");
      expect(html, lang).not.toContain("data-figure");
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
    expect(html).toContain('data-figure="rank" data-rank="1" data-of="939"');
    expect(html).toContain(t.place("1"));
    expect(html).toContain(t.ofNames("939"));
    expect(html).toContain('data-direction="STEADY"');
    expect(html).toContain(t.childrenIn(2025));
    expect(html).toContain(t.trendBasis(2025, 2020, 10));
    expect(html).toContain("zasób 1159538");
    expect(html).toContain("zasób 28021");
    // ZOFIA is on no boys' list: no boys' section and no cut-off line for them (TASK-157).
    expect(html).not.toContain('data-sex="MALE"');
    expect(html).not.toContain(t.belowCutoff(2025, "2"));
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
    expect(html).toContain(`>${t.historyHeading}</h2>`);
    expect(html).toContain('data-year="2000"');
    // Newest first: the 2025 list's source is [1], the 2020 list's [2], the 2000–2019 file's [3].
    expect(html).toMatch(/<td>2,913<\/td><td>14 of 600<\/td><td class="baby-ref">\[3\]<\/td>/u);
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

  it("a name of both sexes: each sex's own register list with its count, N of M, date and source; no sum (AC-1, AC-4)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(lang, { [field[lang]]: "noa" }, { userId: "u" });
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
    // One section: the name is on the girls' lists only (TASK-157).
    expect(occurrences(html, t.registerNone)).toBe(1);
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
      // The men's list holds no claim for it: no men's section at all (TASK-157).
      expect(html, lang).not.toContain('data-register="MALE"');
      expect(html, lang).not.toContain('data-sex="MALE"');
      expect(html, lang).not.toContain("bn-tabs");
      // The women's latest stored list: 2025, cut-off 2.
      expect(occurrences(html, t.belowCutoff(2025, "2")), lang).toBe(1);
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

  it("reaches the page through claims only: nothing reads given_name_counts or given_name_birth_counts (AC-4)", () => {
    for (const file of ["baby-names-page.tsx", "baby-names-text.ts"]) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(source, file).not.toContain("given_name_counts");
      expect(source, file).not.toContain("given_name_birth_counts");
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
    const findName = vi.fn();
    const data = await loadBabyNames({
      lang: "pl",
      query: { imie: "Zofia" },
      session: null,
      deps: { ...deps({}), readFacts, findName },
    });
    expect(data.kind).toBe("signed-out");
    expect(readFacts).not.toHaveBeenCalled();
    expect(findName).not.toHaveBeenCalled();
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

describe("the redesigned page (TASK-151, ADR-0046)", () => {
  const field = { pl: "imie", en: "name" } as const;

  /** One sex's section: from its `data-sex` to the next sex's or the meaning tile. */
  const section = (html: string, sex: "MALE" | "FEMALE"): string => {
    const start = html.indexOf(`class="baby-sex bn-sex" data-sex="${sex}"`);
    expect(start).toBeGreaterThan(-1);
    const ends = [
      html.indexOf('class="baby-sex bn-sex"', start + 10),
      html.indexOf("bn-meaning", start),
    ].filter((i) => i > -1);
    return html.slice(start, Math.min(...ends));
  };
  const tile = (html: string, marker: string): string => {
    const start = html.indexOf(marker);
    expect(start, marker).toBeGreaterThan(-1);
    return html.slice(start, html.indexOf("</section>", start));
  };
  const count = (html: string, text: string): number => html.split(text).length - 1;

  it("is in the Brand System scope, with the sex tabs marking the current one (AC-4, D)", async () => {
    // NOA is on both sexes' 2025 lists: both have a count, so the boys come first.
    const html = await render("pl", { imie: "Noa" }, { userId: "u" });
    expect(html).toContain('class="baby-names atlas-v1"');
    expect(html).toContain('class="atlas-tabs bn-tabs" role="tablist" aria-label="Płeć"');
    expect(html).toMatch(
      /<a role="tab" class="bn-tab" href="\/pl\/imiona-dla-dziecka\?imie=Noa&sex=boys#sex-boys" aria-selected="true" aria-current="true" data-sex="MALE">Chłopcy<\/a>/u,
    );
    expect(html).toMatch(
      /<a role="tab" class="bn-tab" href="[^"]*sex=girls#sex-girls" aria-selected="false" data-sex="FEMALE">Dziewczynki<\/a>/u,
    );
    expect(
      html.indexOf('class="baby-sex bn-sex" data-sex="MALE" data-current="true"'),
    ).toBeLessThan(html.indexOf('class="baby-sex bn-sex" data-sex="FEMALE"'));
    // Asked for the girls, the girls' tab is current and their section first.
    const girls = await render("pl", { imie: "Noa", sex: "girls" }, { userId: "u" });
    expect(girls).toMatch(/sex=girls#sex-girls" aria-selected="true" aria-current="true"/u);
    expect(
      girls.indexOf('class="baby-sex bn-sex" data-sex="FEMALE" data-current="true"'),
    ).toBeLessThan(girls.indexOf('class="baby-sex bn-sex" data-sex="MALE"'));
    expect(girls).not.toMatch(/sex=boys#sex-boys" aria-selected="true"/u);
  });

  it("free, the hero tile: the count, its share of the list, the rank with its track, the source (AC-1, AC-3)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(lang, { [field[lang]]: "zofia" }, { userId: "u" });
      const t = BABY_NAMES_TEXT[lang];
      const hero = tile(section(html, "FEMALE"), "bn-hero");
      expect(hero, lang).toContain(t.eyebrowGot(2025));
      expect(hero, lang).toContain(`data-figure="count">${formatInteger(4415, lang)}<`);
      expect(hero, lang).toContain(t.noun.FEMALE);
      // 4 415 of 119 788: 36 856 per million, shown as one decimal.
      expect(hero, lang).toContain(
        `data-figure="share">${t.shareLine(lang === "pl" ? "3,7%" : "3.7%", "FEMALE", 2025)}<`,
      );
      expect(hero, lang).toContain('data-figure="rank" data-rank="1" data-of="939"');
      expect(hero, lang).toContain(`<strong>${t.place("1")}</strong>`);
      expect(hero, lang).toContain(t.ofNames("939"));
      expect(hero, lang).toContain('class="bn-track-mark atlas-point" style="left:0.1%"');
      expect(hero, lang).toContain(t.trackMost);
      expect(hero, lang).toContain(t.trackRarest);
      expect(hero, lang).toContain(lang === "pl" ? "zasób 1159538" : "resource 1159538");
      expect(html, lang).not.toMatch(/data-figure="[a-z-]*">0</u);
      expect(html, lang).not.toMatch(/[^0-9,.]0[,.]0%/u);
      // A name on neither 2025 list: each sex absent from it, no hero, no share, never 0.
      const both = await render(lang, { [field[lang]]: "ariel" }, { userId: "u" });
      const boys = section(both, "MALE");
      expect(boys, lang).not.toContain("bn-hero");
      expect(boys, lang).toContain(t.belowCutoff(2025, "2"));
      expect(both, lang).not.toMatch(/data-figure="[a-z-]*">0</u);
    }
  });

  it("free, how common: 1 in 27 with a dot grid of 27, one lit, and the caption (AC-1)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(lang, { [field[lang]]: "zofia" }, { userId: "u" });
      const t = BABY_NAMES_TEXT[lang];
      const common = tile(section(html, "FEMALE"), "bn-common");
      expect(common, lang).toContain(`data-figure="one-in" data-one-in="27">${t.oneIn("27")}<`);
      expect(common, lang).toContain(t.oneInNoun.FEMALE);
      expect(common, lang).toContain('data-dots="27"');
      expect(
        count(common, 'class="bn-dot"') + count(common, 'class="bn-dot bn-dot-lit atlas-point"'),
        lang,
      ).toBe(27);
      expect(count(common, "bn-dot-lit"), lang).toBe(1);
      expect(common, lang).toContain(t.oneInCaption("27", "FEMALE", 2025, "ZOFIA"));
      expect(common, lang).toContain(t.dotsLabel("27"));
    }
  });

  it("draws the dot grid only up to 60 dots; above that the figure stands alone", async () => {
    const withCount = (n: number) => ({
      ...deps({}),
      readFacts: () => {
        const facts = zofia(false);
        const girls = facts.sexes[1]!;
        const latest = girls.latest!;
        // n children of a list of 119 788 × n ÷ 27 ≈ "1 in 27"; here the sum is set to give 1 in N.
        const peopleSum = 1000 * n;
        return Promise.resolve({
          ...facts,
          sexes: [
            facts.sexes[0]!,
            {
              ...girls,
              latest: {
                ...latest,
                list: { ...latest.list!, people_sum: peopleSum },
                count: { ...latest.count!, count: 1000, ...birthShare(1000, peopleSum) },
              },
            },
          ],
        });
      },
    });
    for (const [n, dots] of [
      [60, true],
      [61, false],
      [DOT_GRID_MAX, true],
      [DOT_GRID_MAX + 1, false],
    ] as const) {
      const data = await loadBabyNames({
        lang: "pl",
        query: { imie: "zofia" },
        session: { userId: "u" },
        deps: withCount(n),
      });
      const html = renderToStaticMarkup(createElement(BabyNamesView, { data }));
      expect(html, String(n)).toContain(`data-one-in="${n}"`);
      expect(html.includes("bn-dots"), String(n)).toBe(dots);
      if (dots) expect(count(html, "bn-dot"), String(n)).toBe(n + 1 + 1); // n dots, one of them lit (two class names), plus the grid's own name
    }
  });

  it("free, the direction: the chip, the two shares the claim was decided on, the basis, the sources (AC-1)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(lang, { [field[lang]]: "zofia" }, { userId: "u" });
      const t = BABY_NAMES_TEXT[lang];
      const direction = tile(section(html, "FEMALE"), "bn-direction");
      expect(direction, lang).toContain('data-figure="trend" data-direction="STEADY"');
      expect(direction, lang).toContain(t.directions.STEADY);
      expect(direction, lang).toContain(
        `data-figure="shares">${t.sharesLine(2020, lang === "pl" ? "4,0%" : "4.0%", 2025, lang === "pl" ? "3,7%" : "3.7%")}<`,
      );
      expect(direction, lang).toContain(t.trendBasis(2025, 2020, 10));
      expect(direction, lang).toContain(lang === "pl" ? "zasób 28021" : "resource 28021");
    }
  });

  it("says 'poniżej progu' for an earlier year below the cut-off, and omits the shares an old claim lacks", async () => {
    const trendWith = (earlier: number | null, latest: number | null) => ({
      ...deps({}),
      readFacts: () => {
        const facts = zofia(false);
        const girls = facts.sexes[1]!;
        return Promise.resolve({
          ...facts,
          sexes: [
            facts.sexes[0]!,
            {
              ...girls,
              trend: {
                ...girls.trend!,
                direction: "RISING" as const,
                latest_share_per_million: latest,
                earlier_share_per_million: earlier,
              },
            },
          ],
        });
      },
    });
    const t = BABY_NAMES_TEXT.pl;
    const absent = await loadBabyNames({
      lang: "pl",
      query: { imie: "zofia" },
      session: { userId: "u" },
      deps: trendWith(null, 36856),
    });
    const html = renderToStaticMarkup(createElement(BabyNamesView, { data: absent }));
    expect(html).toContain(
      `data-figure="shares">${t.sharesLine(2020, t.belowThreshold, 2025, "3,7%")}<`,
    );
    expect(html).not.toContain("0,0%");
    const old = await loadBabyNames({
      lang: "pl",
      query: { imie: "zofia" },
      session: { userId: "u" },
      deps: trendWith(null, null),
    });
    const oldHtml = renderToStaticMarkup(createElement(BabyNamesView, { data: old }));
    expect(oldHtml).toContain('data-direction="RISING"');
    expect(oldHtml).not.toContain('data-figure="shares"');
  });

  it("the meaning tile: each work's origin and meaning in its words, the translation marked as ours on the Polish page (AC-1)", async () => {
    const pl = await render("pl", { imie: "zofia" }, { userId: "u" });
    const t = BABY_NAMES_TEXT.pl;
    const meaning = tile(pl, 'data-meaning="READY"');
    expect(meaning).toContain(t.meaningHeading);
    expect(meaning).toContain(`data-meaning-origin="grc">greckie (${t.quote("grec.")})<`);
    expect(meaning).toContain(`data-meaning-origin="grc">greckie (${t.quote("Gr.")})<`);
    expect(meaning).toContain(t.quote("wisdom"));
    expect(meaning).toContain(`${t.translatedBy}: ${t.quote("mądrość")}`);
    expect(meaning).toContain(t.translationNote);
    expect(meaning).toContain(t.workLine("Buryan", "Pochodzenie i znaczenie imion", 1933, "s. 41"));
    expect(meaning).toContain(
      t.workLine("Yonge", "History of Christian Names", 1884, "Glossary, Polish"),
    );
    expect(meaning).toContain('href="https://polona.pl/buryan"');
    expect(meaning).toContain('data-confidence="LIKELY"');
    expect(meaning).not.toContain(t.meaningNone);
    // The English page: Yonge in English, no translation and no note about one.
    const en = await render("en", { name: "zofia" }, { userId: "u" });
    const enMeaning = tile(en, 'data-meaning="READY"');
    expect(enMeaning).toContain(
      `data-meaning-origin="grc">Greek (${BABY_NAMES_TEXT.en.quote("Gr.")})<`,
    );
    expect(enMeaning).toContain(BABY_NAMES_TEXT.en.quote("wisdom"));
    expect(enMeaning).not.toContain("mądrość");
    expect(enMeaning).not.toContain("Name Atlas");
  });

  it("the meaning tile without a work: one muted line and nothing else; blocked: the refusal (AC-1)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(lang, { [field[lang]]: "tymon" }, { userId: "u" });
      const t = BABY_NAMES_TEXT[lang];
      const meaning = tile(html, 'data-meaning="NO_SOURCE"');
      expect(meaning, lang).toContain(`<p class="note bn-muted">${t.meaningNone}</p>`);
      expect(meaning, lang).not.toContain("bn-works");
      expect(meaning, lang).not.toContain("data-confidence");
      expect(meaning.match(/<p/gu), lang).toHaveLength(1);
    }
    // A rare name in the register only has the tile too.
    const rara = await render("pl", { imie: "rara" }, { userId: "u" });
    expect(tile(rara, 'data-meaning="NO_SOURCE"')).toContain(BABY_NAMES_TEXT.pl.meaningNone);
    const blocked = await loadBabyNames({
      lang: "pl",
      query: { imie: "zofia" },
      session: { userId: "u" },
      deps: { ...deps({}), readMeaning: () => Promise.resolve({ state: "RIGHTS_BLOCKED" }) },
    });
    const html = renderToStaticMarkup(createElement(BabyNamesView, { data: blocked }));
    expect(tile(html, 'data-meaning="RIGHTS_BLOCKED"')).toContain(BABY_NAMES_TEXT.pl.rightsBlocked);
    expect(html).not.toContain("wisdom");
  });

  it("asks for the meaning on the PAID surface only for an entitled reader", async () => {
    const readMeaning = vi.fn((_n: unknown, _full: boolean) => Promise.resolve(MEANING_NONE));
    for (const [bought, full] of [
      [{}, false],
      [{ u: ["babynames"] }, true],
    ] as const) {
      await loadBabyNames({
        lang: "pl",
        query: { imie: "zofia" },
        session: { userId: "u" },
        deps: { ...deps(bought), readMeaning },
      });
      expect(readMeaning).toHaveBeenLastCalledWith({ id: "zofia", display_name: "ZOFIA" }, full);
    }
  });

  it("the locked card is unchanged in facts and rule: 8,99 zł, Wkrótce, no button, no link (AC-1)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(lang, { [field[lang]]: "zofia" }, { userId: "u" });
      const t = BABY_NAMES_TEXT[lang];
      const locked = tile(html, "baby-locked");
      expect(locked, lang).toContain("8,99 zł");
      expect(locked, lang).toContain(t.soon);
      expect(locked, lang).toContain(t.lockedTier);
      expect(locked, lang).not.toMatch(/<button|<a /u);
      expect(html, lang).not.toContain("bn-chart");
      expect(html, lang).not.toContain("data-paid");
    }
  });

  it("paid: the chart from the history, the peak amber, a cut-off tick for an absent year, no zero bar (AC-2)", async () => {
    const html = await render("pl", { imie: "zofia" }, { userId: "u2" }, { u2: ["babynames"] });
    const t = BABY_NAMES_TEXT.pl;
    const paid = html.slice(html.indexOf('data-paid="FEMALE"'));
    expect(paid).toContain(`aria-label="${t.chartLabel("FEMALE", 2000, 2025)}"`);
    expect(paid).toContain('data-bars="25"');
    expect(paid.match(/<rect class="bn-chart-bar/gu)).toHaveLength(25);
    expect(paid).toMatch(
      /<rect class="bn-chart-bar bn-chart-bar-peak" data-year="2017" data-bar="peak"/u,
    );
    expect(paid.match(/data-bar="peak"/gu)).toHaveLength(1);
    expect(paid).toMatch(
      /<rect class="bn-chart-bar bn-chart-bar-edge" data-year="2000" data-bar="edge"/u,
    );
    expect(paid).toMatch(
      /<rect class="bn-chart-bar bn-chart-bar-edge" data-year="2025" data-bar="edge"/u,
    );
    expect(paid).toMatch(
      /<rect class="bn-chart-bar bn-chart-bar-year" data-year="2010" data-bar="year"/u,
    );
    // 2001: a cut-off tick, no bar and no bar of height 0.
    expect(paid).toMatch(/<line class="bn-chart-cutoff" data-year="2001" data-bar="cutoff"/u);
    expect(paid).not.toMatch(/<rect[^>]*data-year="2001"/u);
    expect(paid).not.toMatch(/<rect[^>]*height="0"/u);
    expect(paid).toContain(`${t.cutoffTick}</title>`);
    // The three labelled years.
    expect(paid.match(/<text class="bn-chart-label"/gu)).toHaveLength(3);
    for (const y of [2000, 2017, 2025]) expect(paid).toContain(`>${y}</text>`);
    expect(html).not.toContain("baby-locked");
    // ZOFIA is on no boys' list in any year: no boys' line and no boys' chart (TASK-157).
    expect(html).not.toContain(t.noneSince("MALE", 2000));
    expect(html).not.toContain('data-paid="MALE"');
    expect(html.match(/<svg class="bn-chart"/gu)).toHaveLength(1);
  });

  it("paid: the ×, the callouts, the ladder and the folded table (AC-2)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(
        lang,
        { [field[lang]]: "zofia" },
        { userId: "u2" },
        { u2: ["babynames"] },
      );
      const t = BABY_NAMES_TEXT[lang];
      const paid = html.slice(html.indexOf('data-paid="FEMALE"'));
      // 4 415 ÷ 2 913 = 1.5156…: ×1,5, more often than in 2000.
      expect(paid, lang).toContain(
        `data-figure="times" data-more="true"><strong>${t.times(lang === "pl" ? "1,5" : "1.5")}</strong> <span>${t.timesWording(true, 2000)}</span>`,
      );
      expect(paid, lang).toContain(`data-callout="${t.calloutFirst}" data-year="2000"`);
      expect(paid, lang).toContain(`data-callout="${t.calloutPeak}" data-year="2017"`);
      expect(paid, lang).toContain(`data-callout="${t.calloutLatest}" data-year="2025"`);
      expect(paid, lang).toContain(
        `<strong>${formatInteger(9012, lang)}</strong><small>${t.childrenWord} · ${t.peakWord} · ${t.place("1")}</small>`,
      );
      expect(paid, lang).toContain(
        `<strong>${formatInteger(2913, lang)}</strong><small>${t.childrenWord} · ${t.place("14")}</small>`,
      );
      // The ladder: 2000, 2005, 2010, 2015, 2020 and the latest, the latest current.
      for (const [y, rank] of [
        [2000, 14],
        [2005, 10],
        [2010, 5],
        [2015, 2],
        [2020, 2],
      ] as const) {
        expect(paid, `${lang} ${y}`).toContain(
          `<li class="bn-rung" data-year="${y}" data-rank="${rank}">`,
        );
      }
      expect(paid, lang).toContain(
        '<li class="bn-rung" data-year="2025" data-rank="1" aria-current="true">',
      );
      expect(paid, lang).toContain(
        `data-figure="top-years">${t.topYears("2016, 2017, 2018, 2023, 2024, 2025")}<`,
      );
      // The table: the last six years open, newest first; the rest behind "Wszystkie 26 lat".
      const open = paid.slice(paid.indexOf("<table"), paid.indexOf("</table>"));
      expect(open.match(/<tr data-year=/gu), lang).toHaveLength(YEARS_SHOWN);
      expect(open.indexOf('data-year="2025"'), lang).toBeLessThan(open.indexOf('data-year="2020"'));
      expect(open, lang).not.toContain('data-year="2019"');
      expect(paid, lang).toContain(
        `<details class="atlas-accordion bn-details"><summary>${t.allYears("26")}</summary>`,
      );
      const folded = paid.slice(paid.indexOf("<details"), paid.indexOf("</details>"));
      expect(folded.match(/<tr data-year=/gu), lang).toHaveLength(26 - YEARS_SHOWN);
      expect(folded, lang).toContain('data-year="2019"');
      expect(folded, lang).toContain('data-year="2000"');
      expect(html.match(/<button/gu), lang).toHaveLength(1);
    }
  });

  it("paid: no × when 2000 has no count; a year without a rank claim reads — on the ladder", async () => {
    const data = await loadBabyNames({
      lang: "pl",
      query: { imie: "zofia" },
      session: { userId: "u2" },
      deps: {
        ...deps({ u2: ["babynames"] }),
        readFacts: () => {
          const facts = zofia(true);
          const girls = facts.sexes[1]!;
          const history = girls.history!.map((y) =>
            y.birth_year === 2000
              ? { ...y, count: null, rank: null }
              : y.birth_year === 2005
                ? { ...y, rank: null }
                : y,
          );
          return Promise.resolve({ ...facts, sexes: [facts.sexes[0]!, { ...girls, history }] });
        },
      },
    });
    const html = renderToStaticMarkup(createElement(BabyNamesView, { data }));
    expect(html).not.toContain('data-figure="times"');
    expect(html).toContain(`data-callout="${BABY_NAMES_TEXT.pl.calloutFirst}" data-year="2002"`);
    expect(html).toContain(
      '<li class="bn-rung" data-year="2005" data-rank="none"><span class="bn-rung-year">2005</span><span class="bn-rung-rank">—</span></li>',
    );
    expect(html).toContain('data-bars="24"');
  });

  it("geometry helpers: the track position, the peak, the ladder's years", () => {
    expect(trackPosition(1, 939)).toBe("0.1%");
    expect(trackPosition(470, 939)).toBe("50.1%");
    expect(trackPosition(939, 939)).toBe("100.0%");
    expect(peakOf(girlsHistory())?.birth_year).toBe(2017);
    expect(peakOf([year(2001, null, null)])).toBeNull();
    expect(ladderYears(girlsHistory())).toEqual([2000, 2005, 2010, 2015, 2020, 2025]);
    expect(ladderYears(girlsHistory().slice(0, 21))).toEqual([2000, 2005, 2010, 2015, 2020]);
  });

  it("absent, no list, held, signed out: as before, with no figure and no tile of figures", async () => {
    const t = BABY_NAMES_TEXT.pl;
    const notFound = await render("pl", { imie: "nikt" }, { userId: "u" });
    expect(notFound).toContain(t.notFound("nikt"));
    expect(notFound).not.toContain("bn-tile");
    const held = await render("pl", { imie: "lena" }, { userId: "u" });
    expect(held).toContain(t.held);
    expect(held).not.toContain("bn-tile");
    const out = await render("pl", { imie: "zofia" }, null);
    expect(out).toContain('class="baby-names atlas-v1"');
    // The signed-out preview wears the tiles with every number masked (TASK-159): no figure.
    expect(out).not.toContain("data-figure");
    expect(out).not.toContain("4 415");
    expect(out).not.toContain("wisdom");
  });
});

describe("a name shows only the sexes it is on (TASK-157)", () => {
  const field = { pl: "imie", en: "name" } as const;

  it("ZOFIA, a girls' name: no boys' section, tab, cut-off line, register figure or two-lists note", async () => {
    for (const lang of ["pl", "en"] as const) {
      const t = BABY_NAMES_TEXT[lang];
      for (const query of [{ [field[lang]]: "zofia" }, { [field[lang]]: "zofia", sex: "boys" }]) {
        const html = await render(lang, query, { userId: "u" });
        expect(html, lang).toContain('data-sex="FEMALE" data-current="true"');
        expect(html, lang).not.toContain('data-sex="MALE"');
        expect(html, lang).not.toContain('data-register="MALE"');
        expect(html, lang).not.toContain(`>${t.sex.MALE}<`);
        expect(html, lang).not.toContain("bn-tabs");
        expect(html, lang).not.toContain(t.apart);
        expect(html, lang).not.toContain(t.belowCutoff(2025, "2"));
        // The register's 77 men of this first name are not shown on a girls' name.
        expect(html, lang).not.toContain('data-figure="register-count">77<');
        expect(html, lang).toContain(t.registerDiffers);
      }
      const paid = await render(
        lang,
        { [field[lang]]: "zofia" },
        { userId: "p" },
        { p: ["babynames"] },
      );
      expect(paid, lang).not.toContain('data-paid="MALE"');
      expect(paid, lang).not.toContain(t.noneSince("MALE", 2000));
    }
  });

  it("asked for a sex the name is not on, the focus is the sex it is on", async () => {
    const data = await loadBabyNames({
      lang: "pl",
      query: { imie: "zofia", sex: "boys" },
      session: { userId: "u" },
      deps: deps({}),
    });
    expect(data.kind === "signed-in" && data.focus).toBe("FEMALE");
  });

  it("NIKOLA, on the girls' lists and once on an earlier boys' list: the girls only", async () => {
    const t = BABY_NAMES_TEXT.pl;
    const queries: Record<string, string>[] = [{ imie: "nikola" }, { imie: "nikola", sex: "boys" }];
    for (const query of queries) {
      const html = await render("pl", query, { userId: "u" });
      expect(html).toContain('data-sex="FEMALE" data-current="true"');
      expect(html).not.toContain('data-sex="MALE"');
      expect(html).not.toContain("bn-tabs");
      expect(html).not.toContain(t.belowCutoff(2025, "2"));
    }
  });

  it("NOA, on both sexes' latest lists: both sections, the tabs and the two-lists note", async () => {
    const t = BABY_NAMES_TEXT.pl;
    const html = await render("pl", { imie: "noa" }, { userId: "u" });
    expect(html).toContain('class="baby-sex bn-sex" data-sex="MALE" data-current="true"');
    expect(html).toContain('class="baby-sex bn-sex" data-sex="FEMALE"');
    expect(html).toContain("bn-tabs");
    expect(html).toContain(t.apart);
    expect(html).toContain('data-figure="count">3<');
    expect(html).not.toContain(t.belowCutoff(2025, "2"));
  });

  it("ARIEL, on earlier lists of both sexes and on neither 2025 list: both, below each cut-off, never 0", async () => {
    const t = BABY_NAMES_TEXT.pl;
    const html = await render("pl", { imie: "ariel" }, { userId: "u" });
    expect(html).toContain('data-sex="MALE"');
    expect(html).toContain('data-sex="FEMALE"');
    expect(html).toContain("bn-tabs");
    expect(html.split(t.belowCutoff(2025, "2")).length - 1).toBe(2);
    expect(html).not.toContain("bn-hero");
    expect(html).not.toMatch(/data-figure="[a-z-]*count">0</u);
  });

  it("a name on no birth list whose register lists neither sex keeps both sections", async () => {
    const data = await loadBabyNames({
      lang: "pl",
      query: { imie: "rara" },
      session: { userId: "u" },
      deps: {
        ...deps({}),
        readStock: () => Promise.resolve({ ...RARA_STOCK, state: "RIGHTS_BLOCKED", lists: [] }),
      },
    });
    const html = renderToStaticMarkup(createElement(BabyNamesView, { data }));
    expect(html).toContain('data-sex="MALE"');
    expect(html).toContain('data-sex="FEMALE"');
    expect(html).toContain("bn-tabs");
  });
});

describe("the signed-out page (TASK-159)", () => {
  const field = { pl: "imie", en: "name" } as const;
  const home = { pl: "/pl/imiona-dla-dziecka", en: "/en/baby-names" } as const;
  const signIn = { pl: "/pl/konto/zaloguj", en: "/en/account/sign-in" } as const;
  const signUp = { pl: "/pl/konto/zaloz", en: "/en/account/sign-up" } as const;

  function main(html: string): string {
    return html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  }

  /** The preview's words, without its markup. */
  function previewText(html: string): string {
    const start = html.indexOf('<figure class="bn-out-preview"');
    return html.slice(start, html.indexOf("</figure>", start)).replace(/<[^>]*>/gu, " ");
  }

  it("shows the search box, the masked preview, what you get, the plans and the source (AC-1)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = main(await render(lang, {}, null));
      const t = BABY_NAMES_TEXT[lang];
      expect(html, lang).toContain(`<h1 class="page-title bn-out-title">${t.title}</h1>`);
      expect(html, lang).toContain(`action="${home[lang]}"`);
      expect(html, lang).toContain(`name="${field[lang]}"`);
      expect(html, lang).toContain(t.out.hint);
      expect(html, lang).toContain(`href="${signUp[lang]}"`);
      expect(previewText(html), lang).toContain(t.out.previewName);
      expect(previewText(html), lang).toContain(t.out.previewLocked);
      // Masked: no number in the preview but the "1" of its own words "1 na".
      expect(previewText(html).replace(t.out.previewOneIn, ""), lang).not.toMatch(/\d/u);
      for (const f of Object.values(t.out.features)) expect(html, lang).toContain(f.title);
      for (const item of t.out.freeItems) expect(html, lang).toContain(item);
      expect(html, lang).toContain(t.lockedHeading);
      expect(html, lang).toContain(t.lockedPrice);
      expect(html, lang).toContain(t.soon);
      expect(html, lang).toContain(t.out.sourceRef);
      expect(html, lang).toContain(t.out.sourceAbsent);
      // One button, the search box's: the tier has none (ADR-0023 §2.5).
      expect(html.match(/<button/gu)?.length, lang).toBe(1);
      expect(html, lang).not.toContain("data-figure");
      expect(html, lang).not.toContain('role="status"');
    }
  });

  it("carries a typed name round the sign-in and shows it in the preview (AC-2)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = main(await render(lang, { [field[lang]]: "  Zofia " }, null));
      const t = BABY_NAMES_TEXT[lang];
      const back = `${home[lang]}?${field[lang]}=Zofia`;
      expect(html, lang).toContain(`href="${signIn[lang]}?next=${encodeURIComponent(back)}"`);
      expect(html, lang).toContain(t.out.asked("Zofia"));
      expect(html, lang).toContain('value="Zofia"');
      expect(previewText(html), lang).toContain(" Zofia ");
      expect(previewText(html), lang).not.toContain(t.out.previewName);
      expect(html, lang).not.toContain(t.out.hint);
      expect(html, lang).not.toContain("data-figure");
    }
  });

  it("encodes a name with letters outside ASCII on its way round", async () => {
    const data = await loadBabyNames({
      lang: "pl",
      query: { imie: "Łucja" },
      session: null,
      deps: deps({}),
    });
    if (data.kind !== "signed-out") throw new Error(data.kind);
    expect(data.carried).toBe(true);
    expect(new URL(data.signInHref, "https://atlas.test").searchParams.get("next")).toBe(
      "/pl/imiona-dla-dziecka?imie=%C5%81ucja",
    );
  });

  it("keeps a name the return address cannot carry in the box, and promises nothing (AC-2)", async () => {
    const t = BABY_NAMES_TEXT.pl;
    const html = main(await render("pl", { imie: "Jan." }, null));
    expect(html).toContain('value="Jan."');
    expect(html).toContain('href="/pl/konto/zaloguj?next=%2Fpl%2Fimiona-dla-dziecka"');
    expect(html).toContain(t.out.hint);
    expect(html).not.toContain(t.out.asked("Jan."));
    expect(previewText(html)).toContain(t.out.previewName);
    expect(previewText(html)).not.toContain("Jan.");
  });

  it("says how long a name may be for an over-long one, and goes nowhere with it (AC-2)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = main(await render(lang, { [field[lang]]: "A".repeat(61) }, null));
      const t = BABY_NAMES_TEXT[lang];
      expect(html, lang).toContain(`role="alert">${t.invalid}`);
      expect(html, lang).toContain(`href="${signIn[lang]}?next=${encodeURIComponent(home[lang])}"`);
      expect(html, lang).not.toContain("A".repeat(61));
      expect(previewText(html), lang).toContain(t.out.previewName);
    }
  });
});
