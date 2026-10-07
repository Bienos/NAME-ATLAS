import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FULL_NAME_COMPARE_TIERS } from "@name-atlas/accounts";
import type { PurchaseTier } from "@name-atlas/accounts";
import type { CitationDto } from "@name-atlas/contracts";
import type {
  BirthNameFacts,
  BirthNameLookup,
  GivenNameFacts,
  GivenNameListFacts,
  GivenNameMeaningFacts,
} from "@name-atlas/truth";
import PlPage, { generateMetadata as plMetadata } from "../app/pl/porownaj/imie-i-nazwisko/page.js";
import EnPage, { generateMetadata as enMetadata } from "../app/en/compare/full-name/page.js";
import { middleware } from "../middleware.js";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import type { ComparisonSide } from "./compare-view.js";
import { resolved } from "./couple-fixture.js";
import { fullNameCompareFree } from "./full-name-compare-config.js";
import { FullNameCompareView, loadFullNameCompare } from "./full-name-compare-page.js";
import type { FullNameCompareDeps, GivenNameAll } from "./full-name-compare-page.js";
import { FULL_NAME_COMPARE_TEXT } from "./full-name-compare-text.js";
import { formatInteger } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * TASK-155 AC-3 to AC-8: the full-name comparison off, signed out, signed in
 * without the product, and with it. SYNTHETIC figures, shaped like the claims
 * the readers return; the page is tested on what it renders.
 */

const PAGES = [
  { lang: "pl", Page: PlPage, metadata: plMetadata, path: "/pl/porownaj/imie-i-nazwisko" },
  { lang: "en", Page: EnPage, metadata: enMetadata, path: "/en/compare/full-name" },
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
  resetAccountsRuntimeForTests();
});

const cite = (id: string, title: string): CitationDto => ({
  id,
  title,
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: null,
  source_type: "OFFICIAL_DATASET",
  locator: `resource:${id}`,
  url: null,
  attribution: null,
  terms: null,
  retrieved_at: null,
  source_page_url: null,
});

const conf = { status: "HIGH", methodology_code: "x@1" };

function stockList(
  sex: "male" | "female",
  people: number,
  rank: number | null,
): GivenNameListFacts {
  const citation = cite(`stock-${sex}`, "Lista imion występujących w rejestrze PESEL");
  return {
    comparability_group: `pesel_given_names_2026_first_${sex}`,
    snapshot_date: "2026-01-20",
    count: { claim_id: `p-${sex}-${people}`, count: people, confidence: conf, citation },
    rank:
      rank === null
        ? null
        : {
            claim_id: `k-${sex}-${people}`,
            rank,
            universe_size: sex === "male" ? 46197 : 28781,
            ties_policy: "shared",
            confidence: conf,
            citation,
          },
  };
}

const birthList = (sex: "MALE" | "FEMALE") => ({
  list_id: `${sex}-2025`,
  birth_year: 2025,
  sex,
  publication_threshold: 2,
  people_sum: 120_000,
});

function births(
  id: string,
  display: string,
  boys: number | null,
  girls: number | null,
): BirthNameFacts {
  const citation = cite("1159538", "Imiona nadawane dzieciom w Polsce");
  const sex = (s: "MALE" | "FEMALE", count: number | null) => ({
    sex: s,
    // Synthetic: a name below the latest cut-off is on no list of that sex here.
    on_any_list: count !== null,
    latest: {
      birth_year: 2025,
      list: birthList(s),
      count:
        count === null
          ? null
          : {
              claim_id: `c-${id}-${s}`,
              count,
              share_per_million: Math.floor((count * 1_000_000) / 120_000),
              one_in: Math.round(120_000 / count),
              citation,
            },
      rank:
        count === null ? null : { claim_id: `r-${id}-${s}`, rank: 7, universe_size: 939, citation },
    },
    trend:
      count === null
        ? null
        : {
            claim_id: `t-${id}-${s}`,
            direction: "RISING" as const,
            latest_year: 2025,
            earlier_year: 2020,
            window_years: 5,
            change_percent: 10,
            latest_share_per_million: null,
            earlier_share_per_million: null,
            citations: [citation],
          },
    history: null,
  });
  return {
    given_name: { id, display_name: display },
    state: "READY",
    sexes: [sex("MALE", boys), sex("FEMALE", girls)],
  };
}

const YONGE: GivenNameMeaningFacts = {
  state: "READY",
  claim_id: "m-zofia",
  confidence: conf,
  works: [
    {
      work: { title: "History of Christian Names", author_or_publisher: "Yonge", year: 1884 },
      printed_form: "Zofia",
      origin: { code: "grc", as_printed: "Greek" },
      literal_gloss: "wisdom",
      translation: { language: "pl", text: "mądrość", by: "Name Atlas" },
      locator: "s. 1",
      quotation: "Zofia — wisdom",
      citation: cite("yonge", "History of Christian Names"),
    },
  ],
};

/** ZOFIA on both register lists, with counts that would show a sum. */
const FACTS: Record<string, GivenNameAll> = {
  zofia: {
    stock: {
      given_name: { id: "zofia", display_name: "ZOFIA" },
      state: "READY",
      lists: [stockList("female", 321456, 12), stockList("male", 77, null)],
    } satisfies GivenNameFacts,
    births: births("zofia", "ZOFIA", null, 4415),
    meaning: YONGE,
  },
  jan: {
    stock: {
      given_name: { id: "jan", display_name: "JAN" },
      state: "READY",
      lists: [stockList("male", 250000, 3)],
    },
    births: births("jan", "JAN", 900, null),
    meaning: { state: "NO_SOURCE" },
  },
  ola: {
    stock: { given_name: { id: "ola", display_name: "OLA" }, state: "UNAVAILABLE", lists: [] },
    births: { given_name: { id: "ola", display_name: "OLA" }, state: "NOT_ON_ANY_LIST", sexes: [] },
    meaning: { state: "NO_SOURCE" },
  },
};

const SURNAMES: Record<string, ComparisonSide> = {
  nowak: {
    slug: "nowak",
    display: "NOWAK",
    path: "/pl/nazwisko/nowak",
    response: resolved({
      id: "01a0b9e3-34f3-7633-a239-2b8596dfc001",
      display: "NOWAK",
      counts: [
        [200_000, "male"],
        [190_000, "female"],
      ],
    }),
  },
  kowalski: {
    slug: "kowalski",
    display: "KOWALSKI",
    path: "/pl/nazwisko/kowalski",
    response: resolved({
      id: "01a0b9e3-34f3-7633-a239-2b8596dfc002",
      display: "KOWALSKI",
      counts: [[130_000, "male"]],
      region: "MAZOWIECKIE",
    }),
  },
};

/** Deps over a fake store of purchases, recording every read. */
function deps(bought: Record<string, readonly PurchaseTier[]>, reads: string[] = []) {
  const value: FullNameCompareDeps = {
    hasFullView: (userId) =>
      Promise.resolve((bought[userId] ?? []).some((t) => FULL_NAME_COMPARE_TIERS.includes(t))),
    findGivenName: (typed): Promise<BirthNameLookup> => {
      reads.push(`find:${typed}`);
      const id = typed.trim().toLowerCase();
      if (id === "lena") return Promise.resolve({ kind: "HELD" });
      const facts = FACTS[id];
      return Promise.resolve(
        facts === undefined
          ? { kind: "NOT_FOUND" }
          : { kind: "FOUND", given_name: facts.stock.given_name },
      );
    },
    readGivenName: (name, surface) => {
      reads.push(surface === "PAID" ? `given:${name.id}` : `given:${name.id}:${surface}`);
      return Promise.resolve(FACTS[name.id]!);
    },
    loadSurname: (typed) => {
      reads.push(`surname:${typed}`);
      const key = typed.trim().toLowerCase();
      return Promise.resolve(
        SURNAMES[key] ?? { slug: key, display: null, response: null, path: null },
      );
    },
  };
  return value;
}

const TWO = { f1: "Zofia", s1: "Nowak", f2: "Jan", s2: "Kowalski" };

/** One panel's markup: from its attribute to the next panel or the chapter's end. */
function panel(html: string, attribute: string): string {
  const from = html.indexOf(attribute);
  expect(from, attribute).toBeGreaterThan(-1);
  const rest = html.slice(from + attribute.length);
  const ends = [rest.indexOf('class="cmp-panel"'), rest.indexOf("</section>")].filter(
    (i) => i >= 0,
  );
  return rest.slice(0, Math.min(...ends));
}

async function render(
  lang: Lang,
  query: Record<string, string>,
  session: { userId: string; tester?: boolean } | null,
  bought: Record<string, readonly PurchaseTier[]> = {},
  reads: string[] = [],
): Promise<string> {
  const data = await loadFullNameCompare({ lang, query, session, deps: deps(bought, reads) });
  return renderToStaticMarkup(createElement(FullNameCompareView, { data }))
    .replace(/&#x27;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&");
}

describe("the full-name comparison's pages (TASK-155)", () => {
  it("answer 404 with the flag unset or not exactly 1, with empty metadata (AC-3)", async () => {
    for (const value of [undefined, "0", "true", " 1"]) {
      vi.stubEnv("FULL_NAME_COMPARE_ENABLED", value);
      for (const { lang, Page, metadata } of PAGES) {
        await expect(
          Page({ searchParams: Promise.resolve({}) }),
          `${lang} ${String(value)}`,
        ).rejects.toMatchObject({ digest: expect.stringContaining("404") as unknown });
        expect(metadata(), lang).toEqual({});
      }
    }
  });

  it("answer 404 with the flag on but accounts off, and are noindex when on (AC-3)", async () => {
    vi.stubEnv("FULL_NAME_COMPARE_ENABLED", "1");
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

  it("are sent private, no-store, on or off; the free comparison is not", () => {
    for (const { path } of PAGES) {
      const response = middleware(new NextRequest(`https://name-atlas.pl${path}?f1=Jan&s1=Nowak`));
      expect(response.headers.get("cache-control"), path).toBe("private, no-store");
    }
    const free = middleware(
      new NextRequest("https://name-atlas.pl/pl/porownaj?a=nowak&b=kowalski"),
    );
    expect(free.headers.get("cache-control")).toBeNull();
  });
});

describe("signed out (AC-4)", () => {
  it("explains, links to sign-in and back, and reads nothing", async () => {
    for (const { lang, path } of PAGES) {
      const reads: string[] = [];
      const html = await render(lang, TWO, null, {}, reads);
      const t = FULL_NAME_COMPARE_TEXT[lang];
      expect(html, lang).toContain(t.signedOut);
      expect(html, lang).toContain(`next=${encodeURIComponent(path)}`);
      expect(html, lang).not.toContain("cmp-bar-fill");
      expect(reads, lang).toEqual([]);
    }
  });
});

describe("signed in without the product (AC-4)", () => {
  it("shows the form and the locked card, no buy button, and reads no claim", async () => {
    for (const bought of [[], ["babynames"]] as const) {
      const reads: string[] = [];
      const html = await render("pl", TWO, { userId: "u" }, { u: bought }, reads);
      const t = FULL_NAME_COMPARE_TEXT.pl;
      expect(html, bought.join()).toContain(t.lockedHeading);
      expect(html).toContain("15,99 zł");
      expect(html).toContain(t.soon);
      // The only button is the form's own "Porównaj".
      expect(html.match(/<button/gu)).toHaveLength(1);
      expect(html).toContain(`<button type="submit">${t.submit}</button>`);
      expect(html).not.toContain("checkout");
      expect(reads).toEqual([]);
    }
  });

  it("offers a listed tester a test-mode purchase of fullnames, and still reads no claim", async () => {
    const reads: string[] = [];
    const html = await render("pl", TWO, { userId: "u", tester: true }, {}, reads);
    const t = FULL_NAME_COMPARE_TEXT.pl;
    expect(html).toContain(t.lockedHeading);
    expect(html).toContain('action="/api/checkout"');
    expect(html).toContain('name="tier" value="fullnames"');
    expect(html).not.toContain(t.soon);
    expect(html).not.toContain("cmp-plates");
    expect(reads).toEqual([]);
  });
});

describe("free for signed-in readers (D-053)", () => {
  it("is free unless FULL_NAME_COMPARE_FREE is exactly 0", () => {
    expect(fullNameCompareFree({})).toBe(true);
    expect(fullNameCompareFree({ FULL_NAME_COMPARE_FREE: "1" })).toBe(true);
    expect(fullNameCompareFree({ FULL_NAME_COMPARE_FREE: "0" })).toBe(false);
  });

  it("opens the result without a purchase, read on the FREE surface", async () => {
    const reads: string[] = [];
    let looked = false;
    const d = deps({}, reads);
    const data = await loadFullNameCompare({
      lang: "pl",
      query: TWO,
      session: { userId: "u" },
      deps: {
        ...d,
        hasFullView: (id) => {
          looked = true;
          return d.hasFullView(id);
        },
      },
      free: true,
    });
    const html = renderToStaticMarkup(createElement(FullNameCompareView, { data }));
    expect(looked).toBe(false);
    expect(html).toContain("cmp-plates");
    expect(html).not.toContain("fnc-locked");
    const given = reads.filter((r) => r.startsWith("given:"));
    expect(given.length).toBeGreaterThan(0);
    expect(given.every((r) => r.endsWith(":FREE"))).toBe(true);
  });

  it("still asks a signed-out reader to sign in", async () => {
    const reads: string[] = [];
    const data = await loadFullNameCompare({
      lang: "pl",
      query: TWO,
      session: null,
      deps: deps({}, reads),
      free: true,
    });
    expect(data.kind).toBe("signed-out");
    expect(reads).toEqual([]);
  });
});

describe("with the product (AC-5 to AC-8)", () => {
  it("opens for fullnames and each tier from 28,99 zł, and reads both people", async () => {
    for (const tier of ["fullnames", "smaller", "couple", "family"] as const) {
      const reads: string[] = [];
      const html = await render("pl", TWO, { userId: "u" }, { u: [tier] }, reads);
      expect(html, tier).toContain("cmp-plates");
      expect(html, tier).not.toContain("fnc-locked");
      expect(reads, tier).toEqual([
        "find:Zofia",
        "given:zofia",
        "surname:Nowak",
        "find:Jan",
        "given:jan",
        "surname:Kowalski",
      ]);
    }
  });

  it("heads the page with each full name and says no source counts both names (AC-8)", async () => {
    for (const lang of ["pl", "en"] as const) {
      const html = await render(lang, TWO, { userId: "u" }, { u: ["fullnames"] });
      const t = FULL_NAME_COMPARE_TEXT[lang];
      expect(html, lang).toMatch(
        /<h1 class="cmp-plates"[^>]*>.*ZOFIA.*NOWAK.*JAN.*KOWALSKI.*<\/h1>/su,
      );
      expect(html, lang).toContain(t.togetherHeading);
      expect(html, lang).toContain(t.togetherBody);
    }
  });

  it("keeps the men's and women's register lists apart, never summed (AC-6)", async () => {
    const html = await render("pl", TWO, { userId: "u" }, { u: ["fullnames"] });
    const t = FULL_NAME_COMPARE_TEXT.pl;
    const women = panel(html, 'data-list="FEMALE"');
    const men = panel(html, 'data-list="MALE"');
    expect(women).toContain(formatInteger(321456, "pl"));
    // JAN is in the register but not on the women's list: one line, no bar row (TASK-164).
    expect(women).toContain(t.notOnList("JAN"));
    expect(women.match(/class="cmp-bar"/gu) ?? []).toHaveLength(1);
    expect(men).toContain(formatInteger(77, "pl"));
    expect(men).toContain(formatInteger(250000, "pl"));
    expect(html).not.toContain(formatInteger(321456 + 77, "pl"));
    expect(html).toContain(t.registerApart);
  });

  it("draws no bar for an absent figure and says why (AC-2)", async () => {
    const html = await render("pl", TWO, { userId: "u" }, { u: ["fullnames"] });
    const t = FULL_NAME_COMPARE_TEXT.pl;
    // JAN is below the girls' list's cut-off: words, not a bar.
    const girls = panel(html, 'data-births="FEMALE"');
    expect(girls).toContain(t.birthsBelow(formatInteger(2, "pl")));
    expect(girls.match(/cmp-bar-fill/gu) ?? []).toHaveLength(1);
    // KOWALSKI has no women's-list figure.
    expect(html).toContain(t.notInDataset);
  });

  it("quotes the works' meaning, with Name Atlas's translation marked on the Polish page", async () => {
    const pl = await render("pl", TWO, { userId: "u" }, { u: ["fullnames"] });
    const t = FULL_NAME_COMPARE_TEXT.pl;
    expect(pl).toContain("„wisdom”");
    expect(pl).toContain(`${t.translatedBy}: „mądrość”`);
    expect(pl).toContain(t.translationNote);
    expect(pl).toContain(t.meaningNone);
    const en = await render("en", TWO, { userId: "u" }, { u: ["fullnames"] });
    expect(en).toContain("“wisdom”");
    expect(en).not.toContain("mądrość");
  });

  it("links both surname pages and the free comparison of the two", async () => {
    const html = await render("pl", TWO, { userId: "u" }, { u: ["fullnames"] });
    expect(html).toContain('href="/pl/nazwisko/nowak">NOWAK</a>');
    expect(html).toContain('href="/pl/porownaj?a=nowak&b=kowalski"');
  });

  it("compares four people and never reads a fifth (AC-5)", async () => {
    const reads: string[] = [];
    const query = {
      ...TWO,
      f3: "Ola",
      s3: "Nowak",
      f4: "Zofia",
      s4: "Kowalski",
      f5: "Jan",
      s5: "Nowak",
    };
    const html = await render("pl", query, { userId: "u" }, { u: ["fullnames"] }, reads);
    expect(reads.filter((r) => r.startsWith("surname:"))).toHaveLength(4);
    expect(html).toContain('data-count="4"');
    // OLA is on no list: said, never a zero.
    expect(html).toContain(FULL_NAME_COMPARE_TEXT.pl.birthsNone);
  });

  it("gives the form with an error, and reads nothing, for one person or half a row", async () => {
    for (const query of [
      { f1: "Zofia", s1: "Nowak" },
      { ...TWO, f3: "Ola" },
    ]) {
      const reads: string[] = [];
      const html = await render("pl", query, { userId: "u" }, { u: ["fullnames"] }, reads);
      expect(html).toContain('role="alert"');
      expect(reads).toEqual([]);
    }
  });

  it("names what it did not find", async () => {
    const query = { f1: "Qwxyzzy", s1: "Nowak", f2: "Lena", s2: "Nieznane" };
    const html = await render("pl", query, { userId: "u" }, { u: ["fullnames"] });
    const t = FULL_NAME_COMPARE_TEXT.pl;
    expect(html).toContain(t.givenNotFound("Qwxyzzy"));
    expect(html).toContain(t.givenHeld);
    expect(html).toContain(t.surnameUnknown("nieznane"));
  });

  it("carries the typed people to the other language", async () => {
    const html = await render("pl", TWO, { userId: "u" }, { u: ["fullnames"] });
    expect(html).toContain('href="/en/compare/full-name?f1=Zofia&s1=Nowak&f2=Jan&s2=Kowalski"');
  });
});

describe("the layout from the owner's canvas (TASK-164)", () => {
  it("before a result: the steps, two rows, persons 3 and 4 folded, the locked card beside", async () => {
    const html = await render("pl", TWO, { userId: "u" }, { u: [] });
    const t = FULL_NAME_COMPARE_TEXT.pl;
    expect(html).toMatch(/<li data-state="current" aria-current="step">.*Wpisz osoby/su);
    expect(html).toContain(`${t.steps[1]} · ${t.lockedPrice}`);
    expect(html).toContain('<details class="fnc-more">');
    expect(html).toContain(t.addPeople);
    expect(html).toContain(t.lockedHint);
    expect(html).toContain('class="fnc-locked"');
    expect(html).toContain(t.containsLocked);
    expect(html).toContain(t.togetherHeading);
    // Each field keeps a label of its own.
    expect(html).toContain(
      `<label class="visually-hidden" for="f3">${t.person(3)}: ${t.givenLabel}</label>`,
    );
  });

  it("opens persons 3 and 4 when the query carries them, and marks step 2 done with the product", async () => {
    const html = await render(
      "pl",
      { ...TWO, f3: "Ola", s3: "" },
      { userId: "u" },
      { u: ["fullnames"] },
    );
    expect(html).toContain('<details class="fnc-more" open="">');
    expect(html).toMatch(/<li data-state="done">.*Odblokuj porównanie/su);
    expect(html).not.toContain("fnc-locked");
  });

  it("signed out: the sign-in link, the free link and a preview with no figure", async () => {
    const html = await render("pl", {}, null);
    expect(html).toContain('class="fnc-preview" aria-hidden="true"');
    expect(html).toContain('href="/pl/porownaj"');
    expect(html).not.toContain("<form");
  });

  it("the result: the notice before any figure, the chapter bar and one overview row a person", async () => {
    const html = await render("pl", TWO, { userId: "u" }, { u: ["fullnames"] });
    const t = FULL_NAME_COMPARE_TEXT.pl;
    const firstFigure = html.indexOf(formatInteger(321456, "pl"));
    expect(html.indexOf(t.disclaimer)).toBeLessThan(firstFigure);
    expect(html.indexOf(t.togetherBody)).toBeLessThan(firstFigure);
    expect(html).toContain('class="fnc-chapters"');
    expect(html).toContain('href="#fnc-glance"');
    expect(html).toContain('id="fnc-ch-4"');
    // Nothing unresolved: no "Braki" link.
    expect(html).not.toContain('href="#fnc-missing"');
    const glance = html.slice(html.indexOf('id="fnc-glance"'), html.indexOf('id="fnc-ch-1"'));
    expect(glance.match(/<tr data-side=/gu) ?? []).toHaveLength(2);
    // ZOFIA's two register lists stay two lines, never a sum.
    expect(glance).toContain(formatInteger(321456, "pl"));
    expect(glance).toContain(formatInteger(77, "pl"));
    expect(glance).not.toContain(formatInteger(321456 + 77, "pl"));
    // JAN has no quoted origin; KOWALSKI has no women's figure: words, never 0.
    expect(glance).toContain(t.glanceNone);
    expect(glance).not.toMatch(/fnc-glance-figure">0</u);
    expect(glance).not.toContain("cmp-bar");
  });

  it("names the gaps in the chapter bar only when something is unresolved", async () => {
    const html = await render(
      "pl",
      { f1: "Qwxyzzy", s1: "Nowak", f2: "Jan", s2: "Kowalski" },
      { userId: "u" },
      { u: ["fullnames"] },
    );
    expect(html).toContain('href="#fnc-missing"');
    expect(html).toContain('id="fnc-missing"');
  });
});
