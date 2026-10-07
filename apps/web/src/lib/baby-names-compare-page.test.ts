import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PurchaseTier } from "@name-atlas/accounts";
import PlCompare, {
  generateMetadata as plMetadata,
} from "../app/pl/imiona-dla-dziecka/porownaj/page.js";
import EnCompare, { generateMetadata as enMetadata } from "../app/en/baby-names/compare/page.js";
import { middleware } from "../middleware.js";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { JULIA_STOCK, julia } from "./baby-names-compare-test-fixtures.js";
import { BabyCompareView, loadBabyCompare } from "./baby-names-compare-page.js";
import { BabyNamesView, loadBabyNames } from "./baby-names-page.js";
import type { BabyNamesDeps } from "./baby-names-page.js";
import { shareDeps } from "./baby-names-share-test-fixtures.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import { formatInteger } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * TASK-158 AC-2 to AC-4: the comparison's gating (404 when off, sign-in when
 * signed out, the locked card and no figure without the entitlement, the full
 * view with it), its markup (no checkout link, the form's one button, the two
 * columns, `aria-current` on the tabs), the way in from the page, the
 * middleware's header and the sitemaps.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  resetAccountsRuntimeForTests();
});

const BOUGHT: Record<string, readonly PurchaseTier[]> = { paid: ["babynames"] };

/** TASK-152's deps (ZOFIA, RARA), with JULIA on the girls' lists and ADAM held. */
function compareDeps(calls = { findName: 0, readFacts: 0, hasFullView: 0 }): BabyNamesDeps & {
  readonly calls: typeof calls;
} {
  const base = shareDeps(BOUGHT, calls);
  return {
    ...base,
    findName: (typed) => {
      const key = typed.trim().toUpperCase();
      if (key === "JULIA") {
        calls.findName++;
        return Promise.resolve({
          kind: "FOUND",
          given_name: { id: "julia", display_name: "JULIA" },
        });
      }
      if (key === "ADAM") {
        calls.findName++;
        return Promise.resolve({ kind: "HELD" });
      }
      return base.findName(typed);
    },
    readFacts: (name, history) => {
      if (name.id === "julia") {
        calls.readFacts++;
        return Promise.resolve({ ...julia(), given_name: name });
      }
      return base.readFacts(name, history);
    },
    readStock: (name) =>
      name.id === "julia" ? Promise.resolve(JULIA_STOCK) : base.readStock(name),
  };
}

const unescape = (html: string) =>
  html
    .replace(/&#x27;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&");

async function render(
  lang: Lang,
  query: Record<string, string>,
  session: { userId: string } | null,
  deps: BabyNamesDeps = compareDeps(),
): Promise<string> {
  const data = await loadBabyCompare({ lang, query, session, deps });
  return unescape(renderToStaticMarkup(createElement(BabyCompareView, { data })));
}

const GIRLS = { a: "Zofia", b: "Julia", sex: "girls" };
const n = (v: number, lang: Lang = "pl") => formatInteger(v, lang);

describe("the way in from the page (in scope 4)", () => {
  it("is one link per sex in the paid view, with the name as the first; none in the free view, which names the comparison in the locked card", async () => {
    const paid = await loadBabyNames({
      lang: "pl",
      query: { imie: "Zofia", sex: "girls" },
      session: { userId: "paid" },
      deps: compareDeps(),
    });
    const html = unescape(renderToStaticMarkup(createElement(BabyNamesView, { data: paid })));
    expect(html).toContain(
      '<a class="bn-compare-link" href="/pl/imiona-dla-dziecka/porownaj?a=ZOFIA&sex=girls" data-compare="FEMALE">Porównaj z innym imieniem</a>',
    );
    expect(html.match(/bn-compare-link/gu)).toHaveLength(1);
    const free = await loadBabyNames({
      lang: "pl",
      query: { imie: "Zofia", sex: "girls" },
      session: { userId: "free" },
      deps: compareDeps(),
    });
    const freeHtml = unescape(renderToStaticMarkup(createElement(BabyNamesView, { data: free })));
    expect(freeHtml).not.toContain("bn-compare-link");
    expect(freeHtml).toContain("porównanie dwóch imion są w tym samym pakiecie");
  });
});

describe("the comparison, gated (AC-2, AC-3)", () => {
  it("signed out: explains and links to sign-in, which comes back to the page; no form, no figure", async () => {
    const html = await render("pl", GIRLS, null);
    expect(html).toContain("Porównanie dwóch imion jest dla zalogowanych");
    expect(html).toContain('href="/pl/konto/zaloguj?next=%2Fpl%2Fimiona-dla-dziecka"');
    expect(html).not.toContain("<form");
    expect(html).not.toContain(n(4415));
    expect(html).not.toContain("ZOFIA");
    const en = await render("en", { a: "Zofia", b: "Julia", sex: "girls" }, null);
    expect(en).toContain('href="/en/account/sign-in?next=%2Fen%2Fbaby-names"');
  });

  it("signed in without the entitlement: the form, the sex tabs and the page's locked card; no figure, no claim read", async () => {
    const deps = compareDeps();
    const html = await render("pl", GIRLS, { userId: "free" }, deps);
    const t = BABY_NAMES_TEXT.pl;
    expect(html).toContain("<form");
    expect(html).toContain('role="tab"');
    expect(html).toContain(t.lockedHeading);
    expect(html).toContain(t.lockedBody);
    expect(html).toContain("8,99 zł");
    expect(html).toContain(t.soon);
    expect(html).not.toContain(n(4415));
    expect(html).not.toContain(n(3207));
    expect(html).not.toContain("bnc-columns");
    expect(html).not.toContain("bn-chart");
    expect(html).not.toMatch(/checkout|platnosc|płatno|stripe|kup teraz|\bkup\b/iu);
    // The entitlement is decided first: no name is looked up, no claim read.
    expect(deps.calls).toEqual({ findName: 0, readFacts: 0, hasFullView: 1 });
    // The one button is the form's.
    const buttons = html.match(/<button[^>]*>[^<]*<\/button>/gu) ?? [];
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toContain('type="submit"');
    // What was typed stays in the fields.
    expect(html).toContain('value="Zofia"');
    expect(html).toContain('value="Julia"');
  });

  it("checks the tier, not any purchase: 8,99, 28,99, 89,99 and 199 zł open the comparison", async () => {
    for (const [tier, open] of [
      ["babynames", true],
      ["family", true],
      ["tree", false],
    ] as const) {
      const deps: BabyNamesDeps = {
        ...compareDeps(),
        hasFullView: () => Promise.resolve(open),
      };
      const html = await render("pl", GIRLS, { userId: tier }, deps);
      expect(html.includes("bnc-columns"), tier).toBe(open);
    }
  });
});

describe("the comparison, entitled (AC-1, AC-4)", () => {
  it("sets the two names side by side with every row of the board, the chart, the ladder, the table and the swap link", async () => {
    const html = await render("pl", GIRLS, { userId: "paid" });
    // The top: the way back to the first name's page, the eyebrow.
    expect(html).toContain('href="/pl/imiona-dla-dziecka?imie=Zofia&sex=girls#sex-girls"');
    expect(html).toContain("Porównanie · Dziewczynki");
    // The tabs keep both names; the current one is marked.
    expect(html).toContain(
      'href="/pl/imiona-dla-dziecka/porownaj?a=Zofia&b=Julia&sex=girls" aria-selected="true" aria-current="true" data-sex="FEMALE"',
    );
    expect(html).toContain(
      'href="/pl/imiona-dla-dziecka/porownaj?a=Zofia&b=Julia&sex=boys" aria-selected="false" data-sex="MALE"',
    );
    // The two heads.
    expect(html).toContain('<h2 class="bnc-name">ZOFIA</h2>');
    expect(html).toContain('<h2 class="bnc-name">JULIA</h2>');
    expect(html).toContain("2025 · 1. z 939");
    expect(html).toContain("2025 · 6. z 939");
    // The rows.
    expect(html).toContain(`data-figure="count-a">${n(4415)}<`);
    expect(html).toContain(`data-figure="count-b">${n(3207)}<`);
    expect(html).toContain('data-figure="share-a">3,7%<');
    expect(html).toContain('data-figure="share-b">2,7%<');
    expect(html).toContain('data-figure="direction-a">bez większej zmiany<');
    expect(html).toContain('data-figure="shares-a">4,0% → 3,7%<');
    expect(html).toContain('data-figure="direction-b">spada<');
    expect(html).toContain('data-figure="shares-b">poniżej progu → 2,7%<');
    expect(html).toContain("2020 → 2025");
    expect(html).toContain('data-figure="top-a">2016, 2017, 2018, 2023, 2024, 2025<');
    expect(html).toContain(`data-figure="register-a">${n(321456)} kobiet<`);
    expect(html).toContain(`12. z ${n(28781)}`);
    expect(html).toContain(`data-figure="register-b">${n(200123)} kobiet<`);
    // The chart: two bars for each of the six years, no zero bar; the Brand System's series classes.
    expect(html).toContain('class="bn-chart bnc-chart"');
    expect(html).toContain('data-bars="12"');
    expect(html).toContain(
      'class="bnc-bar bnc-bar-a" data-year="2000" data-side="a" data-bar="count"',
    );
    expect(html).toContain(
      'class="bnc-bar bnc-bar-b" data-year="2025" data-side="b" data-bar="count"',
    );
    expect(html).not.toContain('height="0"');
    expect(html).not.toContain("bn-chart-bar-peak");
    expect(html).not.toContain("amber");
    // The figures under it and the ladder: a row a name, a column a year; 2010 without a rank claim reads —.
    expect(html).toContain('class="bnc-grid bnc-figures"');
    expect(html).toContain('class="bnc-grid bnc-ladder"');
    expect(html).toMatch(
      /bnc-ladder[\s\S]*?<tr data-side="b">[\s\S]*?<td data-year="2010" data-side="b"><span class="bnc-rank" data-rank="none">—<\/span>/u,
    );
    expect(html).toMatch(
      /<td data-year="2025" data-side="a"><span class="bnc-rank" data-rank="1">1\.<\/span>/u,
    );
    // The table: six rows open, the rest folded, the sources numbered once.
    expect(html).toContain(
      '<details class="atlas-accordion bn-details"><summary>Wszystkie 26 lat</summary>',
    );
    expect(html.match(/<tr data-year="\d{4}">/gu)).toHaveLength(26);
    expect(html).toContain("[1] ");
    expect(html).not.toContain("[4] ");
    // The swap link carries a and the sex alone and points at the second field.
    expect(html).toContain(
      '<a class="bnc-swap-link" href="/pl/imiona-dla-dziecka/porownaj?a=ZOFIA&sex=girls#bnc-b" data-swap="">Zamień drugie imię</a>',
    );
    expect(html).toContain(
      "Źródło przy każdym fakcie · Brak danych to też odpowiedź · Nic o Twoim dziecku, tylko o imieniu",
    );
    // Nothing to buy, no locked card, the form's one button.
    expect(html).not.toContain("baby-locked");
    expect(html).not.toContain("Wkrótce");
    expect(html).not.toMatch(/checkout|stripe|\bkup\b/iu);
    expect(html.match(/<button/gu)).toHaveLength(1);
    expect(html).toContain('class="baby-names atlas-v1 bn-compare-page"');
  });

  it("reads an absent year as the cut-off in the chart (a tick) and the table (< N), never 0", async () => {
    const html = await render("pl", GIRLS, { userId: "paid" });
    // ZOFIA's 2001 is below the 5 cut-off: in the table as "< 5"; the chart's years skip 2001, so no tick there.
    expect(html).toMatch(
      /<tr data-year="2001"><th scope="row">2001<\/th><td colSpan="2" class="baby-below">&lt; 5<\/td>/u,
    );
    expect(html).not.toMatch(/<td>0<\/td>/u);
    // A chart with a cut-off year: ZOFIA below the 2000 list.
    const plain = compareDeps();
    const deps: BabyNamesDeps = {
      ...plain,
      readFacts: async (name, history) => {
        const facts = await plain.readFacts(name, history);
        if (name.id !== "zofia" || facts.state !== "READY") return facts;
        return {
          ...facts,
          sexes: facts.sexes.map((s) =>
            s.sex === "FEMALE" && s.history !== null
              ? {
                  ...s,
                  history: s.history.map((y) =>
                    y.birth_year === 2000 ? { ...y, count: null, rank: null } : y,
                  ),
                }
              : s,
          ),
        };
      },
    };
    const ticked = await render("pl", GIRLS, { userId: "paid" }, deps);
    expect(ticked).toContain('data-year="2000" data-side="a" data-bar="cutoff"');
    expect(ticked).toContain('data-bars="11"');
    expect(ticked).toMatch(
      /<td data-year="2000" data-side="a"><span class="baby-below">&lt; 5<\/span><\/td>/u,
    );
  });

  it("the English page says the same in English", async () => {
    const html = await render("en", { a: "Zofia", b: "Julia", sex: "girls" }, { userId: "paid" });
    expect(html).toContain("Comparison · Girls");
    expect(html).toContain("2025 · no. 1 of 939");
    expect(html).toContain('data-figure="direction-a">steady<');
    expect(html).toContain('data-figure="shares-b">below the cut-off → 2.7%<');
    expect(html).toContain(`data-figure="register-a">${n(321456, "en")} women<`);
    expect(html).toContain('href="/en/baby-names/compare?a=ZOFIA&sex=girls#bnc-b"');
    expect(html).toContain("Change the second name");
  });

  it("with one name: the form with the first filled and the second focused; with none: the form", async () => {
    const one = await render("pl", { a: "Zofia", sex: "girls" }, { userId: "paid" });
    expect(one).toContain('value="Zofia"');
    expect(one).toMatch(/<input id="bnc-b"[^>]*autofocus=""/u);
    expect(one).not.toContain("bnc-columns");
    expect(one).not.toContain("bnc-problem");
    const none = await render("pl", {}, { userId: "paid" });
    expect(none).toContain("<form");
    expect(none).not.toMatch(/autofocus/u);
    expect(none).toContain('href="/pl/imiona-dla-dziecka"');
    expect(none).toContain("Porównanie · Chłopcy");
  });

  it("one plain line and the form for an unknown name, a held form, the same name twice, and a name on no list of the sex", async () => {
    const unknown = await render("pl", { a: "Zofia", b: "Nikt", sex: "girls" }, { userId: "paid" });
    expect(unknown).toContain('data-problem="NOT_FOUND">Imienia „Nikt” nie ma na żadnej z list');
    expect(unknown).not.toContain("bnc-columns");
    expect(unknown).toContain("<form");
    const held = await render("pl", { a: "Adam", b: "Julia", sex: "boys" }, { userId: "paid" });
    expect(held).toContain('data-problem="HELD">Formy „Adam” nie pokazujemy');
    const same = await render("pl", { a: "Zofia", b: "zofia", sex: "girls" }, { userId: "paid" });
    expect(same).toContain('data-problem="SAME">Wpisz dwa różne imiona.');
    expect(same).not.toContain(n(4415));
    // Boys: ZOFIA is on no boys' list since 2000.
    const boys = await render("pl", { a: "Julia", b: "Zofia", sex: "boys" }, { userId: "paid" });
    expect(boys).toContain(
      'data-problem="NOT_ON_LIST">Imienia JULIA nie ma na żadnej liście chłopców od 2000 r.',
    );
    expect(boys).not.toContain("bnc-columns");
    // On no birth list at all.
    const rara = await render("en", { a: "Zofia", b: "Rara", sex: "girls" }, { userId: "paid" });
    expect(rara).toContain('data-problem="NOT_ON_LIST">RARA is on no girls\' list since 2000.');
    const invalid = await render(
      "en",
      { a: "Zofia", b: "x".repeat(70), sex: "girls" },
      { userId: "paid" },
    );
    expect(invalid).toContain('data-problem="NOT_FOUND"');
  });
});

describe("the comparison's routes (AC-3)", () => {
  const PAGES = [
    { lang: "pl", Page: PlCompare, metadata: plMetadata, path: "/pl/imiona-dla-dziecka/porownaj" },
    { lang: "en", Page: EnCompare, metadata: enMetadata, path: "/en/baby-names/compare" },
  ] as const;

  it("answer 404 with the flag unset or not exactly 1, with empty metadata", async () => {
    for (const value of [undefined, "0", "true"]) {
      vi.stubEnv("BABY_NAMES_ENABLED", value);
      for (const { Page, metadata } of PAGES) {
        await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
          digest: expect.stringContaining("404") as unknown,
        });
        expect(metadata()).toEqual({});
      }
    }
  });

  it("answer 404 with the flag on but accounts off, and are noindex when on", async () => {
    vi.stubEnv("BABY_NAMES_ENABLED", "1");
    vi.stubEnv("ACCOUNTS_DATABASE_URL", undefined);
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("GOOGLE_CLIENT_ID", undefined);
    for (const { Page, metadata } of PAGES) {
      await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
        digest: expect.stringContaining("404") as unknown,
      });
      expect(metadata().robots).toEqual({ index: false, follow: false });
    }
  });

  it("are sent private, no-store by the middleware", () => {
    for (const { path } of PAGES) {
      const response = middleware(
        new NextRequest(`https://name-atlas.pl${path}?a=Zofia&b=Julia&sex=girls`),
      );
      expect(response.headers.get("cache-control"), path).toBe("private, no-store");
    }
  });

  it("are in no sitemap", () => {
    const dir = join(__dirname, "..", "app");
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
      );
    const files = readdirSync(dir)
      .filter((f) => f.startsWith("sitemap") || f.startsWith("robots"))
      .flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /imiona-dla-dziecka\/porownaj|baby-names\/compare|imiona-dla-dziecka|baby-names/u,
      );
    }
  });
});

describe("the free window (TASK-160, D-051)", () => {
  it("open, no purchase: the comparison, read on the FREE surface", async () => {
    const surfaces: (boolean | undefined)[] = [];
    const base = compareDeps();
    const deps: BabyNamesDeps = {
      ...base,
      hasFullView: () => Promise.resolve(false),
      freeUntil: () => new Date("2026-10-08T21:59:00Z"),
      readFacts: (name, history, paid) => {
        surfaces.push(paid);
        return base.readFacts(name, history, paid);
      },
    };
    const html = await render("pl", GIRLS, { userId: "free" }, deps);
    expect(html).toContain("bnc-columns");
    expect(surfaces).toEqual([false, false]);
  });
});
