import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CitationDto } from "@name-atlas/contracts";
import type { BirthNameFacts, GivenNameFacts, GivenNameMeaningFacts } from "@name-atlas/truth";
import {
  REPORT_INSIDE_METADATA,
  ReportInside,
  loadSample,
  typedName,
} from "./report-inside-page.js";
import type { SampleDeps, SampleFacts, SampleState } from "./report-inside-page.js";
import type { Lang } from "./messages.js";

/**
 * TASK-166: the page of what the full report holds, with the first chapter
 * for a typed first name read from claims. PIOTR's figures are those the
 * 2026-01-20 register lists and the 2025 boys' list give, as seen on real data
 * in TASK-159; the works are the three that explain the name.
 */

const citation = (id: string, title: string, locator: string, publisher: string | null) =>
  ({
    id,
    title,
    publisher,
    publication_date: "2026-01-20",
    source_type: "OFFICIAL_DATASET",
    locator,
    url: null,
    attribution: null,
    terms: null,
    retrieved_at: null,
    source_page_url: null,
  }) as unknown as CitationDto;

const REGISTER = "Imiona męskie występujące w rejestrze PESEL";
const CONFIDENCE = { status: "VERIFIED", methodology_code: "rule@1" };

const STOCK: GivenNameFacts = {
  given_name: { id: "g-1", display_name: "PIOTR" },
  state: "READY",
  lists: [
    {
      comparability_group: "pesel_2026_first_male",
      snapshot_date: "2026-01-20",
      count: {
        claim_id: "c-1",
        count: 682_516,
        confidence: CONFIDENCE,
        // The count's and the rank's citation rows name one file: one footnote.
        citation: citation("cit-1", REGISTER, "resource:1", "Ministerstwo Cyfryzacji"),
      },
      rank: {
        claim_id: "c-2",
        rank: 1,
        universe_size: 46_197,
        ties_policy: "COMPETITION",
        confidence: CONFIDENCE,
        citation: citation("cit-2", REGISTER, "resource:1", "Ministerstwo Cyfryzacji"),
      },
    },
  ],
};

const BOYS_2025 = {
  list_id: "l-1",
  birth_year: 2025,
  sex: "MALE" as const,
  publication_threshold: 2,
  people_sum: 126_404,
};
const BIRTHS_TITLE = "Imiona nadawane dzieciom w Polsce";

const BIRTHS: BirthNameFacts = {
  given_name: { id: "g-1", display_name: "PIOTR" },
  state: "READY",
  sexes: [
    {
      sex: "MALE",
      on_any_list: true,
      latest: {
        birth_year: 2025,
        list: BOYS_2025,
        count: {
          claim_id: "b-1",
          count: 1_146,
          share_per_million: 9_066,
          one_in: 110,
          citation: citation("cit-3", BIRTHS_TITLE, "resource:1159536", "Ministerstwo Cyfryzacji"),
        },
        rank: {
          claim_id: "b-2",
          rank: 29,
          universe_size: 965,
          citation: citation("cit-4", BIRTHS_TITLE, "resource:1159536", "Ministerstwo Cyfryzacji"),
        },
      },
      trend: null,
      history: null,
    },
    { sex: "FEMALE", on_any_list: false, latest: null, trend: null, history: null },
  ],
};

const work = (
  author: string,
  year: number,
  locator: string,
  origin: { code: string; as_printed: string },
  gloss: string | null,
) => ({
  work: { title: `${author} ${String(year)}`, author_or_publisher: author, year },
  printed_form: "Piotr",
  origin,
  literal_gloss: gloss,
  translation: null,
  locator,
  quotation: gloss ?? origin.as_printed,
  citation: citation(`w-${author}`, `${author} ${String(year)}`, locator, null),
});

const MEANING: GivenNameMeaningFacts = {
  state: "READY",
  claim_id: "m-1",
  confidence: { status: "CONTESTED", methodology_code: "rule@1" },
  works: [
    {
      ...work("Ch. M. Yonge", 1884, "s. 108", { code: "grc", as_printed: "Gr." }, "stone"),
      translation: { language: "pl", text: "kamień", by: "Name Atlas" },
    },
    work("A. Brückner", 1927, "s. 415", { code: "la", as_printed: "łac." }, null),
  ],
};

const FACTS: SampleFacts = { stock: STOCK, births: BIRTHS, meaning: MEANING };

function page(sample: SampleState, lang: Lang = "pl", typed: string | null = "Piotr"): string {
  const path = lang === "en" ? "/en/surname/kowalski" : "/pl/nazwisko/kowalski";
  return renderToStaticMarkup(
    createElement(ReportInside, {
      lang,
      surname: "KOWALSKI",
      path,
      otherPath:
        lang === "en" ? "/pl/nazwisko/kowalski/pelny-raport" : "/en/surname/kowalski/full-report",
      typed,
      sample,
    }),
  ).replaceAll("&amp;", "&");
}

const text = (html: string) =>
  html
    .replace(/<[^>]+>/gu, " ")
    .replace(/&quot;/gu, '"')
    .replace(/&#x27;/gu, "'")
    // Spaces and line breaks only: a figure keeps its no-break spaces.
    .replace(/[ \t\r\n]+/gu, " ");

const ready: SampleState = {
  kind: "ready",
  given: { id: "g-1", display_name: "PIOTR" },
  facts: FACTS,
};

describe("the full report's page (TASK-166)", () => {
  it("is never indexed", () => {
    expect(REPORT_INSIDE_METADATA.robots).toEqual({ index: false, follow: false });
  });

  it("reads the typed name from its own key in each language", () => {
    expect(typedName({ imie: "Piotr" }, "pl")).toBe("Piotr");
    expect(typedName({ name: "Piotr" }, "en")).toBe("Piotr");
    expect(typedName({ name: "Piotr" }, "pl")).toBeNull();
    expect(typedName({ imie: "  " }, "pl")).toBeNull();
    expect(typedName({ imie: ["Anna", "Piotr"] }, "pl")).toBe("Anna");
  });

  it("shows the first chapter from the claims, each list apart and never summed", () => {
    const words = text(page(ready));
    expect(words).toContain("Rozdział 1 z 10");
    expect(words).toContain("PIOTR KOWALSKI");
    expect(words).toContain("Mężczyźni z tym pierwszym imieniem 682 516");
    expect(words).toContain("Miejsce 1. z 46 197 na liście imion męskich.");
    expect(words).toContain("1 146 chłopców urodzonych w 2025 r. (29. miejsce z 965)");
    // No women's list holds the name, and none is invented.
    expect(words).not.toContain("Kobiety z tym pierwszym imieniem");
    expect(words).not.toContain("dziewczynek");
    // Each work in its own words, and the disagreement said.
    expect(words).toContain("Ch. M. Yonge 1884, s. 108");
    expect(words).toContain("A. Brückner 1927, s. 415");
    expect(words).toContain("„stone”, przekład Name Atlas: „kamień”");
    expect(words).toContain("Źródła się różnią");
  });

  it("numbers each source record once, in reading order", () => {
    const html = page(ready);
    const notes = /<ol class="ri-footnotes"[^>]*>([\s\S]*?)<\/ol>/u.exec(html)?.[1] ?? "";
    const items = [...notes.matchAll(/<li>([\s\S]*?)<\/li>/gu)].map((m) => text(m[1] ?? "").trim());
    expect(items).toEqual([
      `${REGISTER}, Ministerstwo Cyfryzacji, zasób 1`,
      `${BIRTHS_TITLE}, Ministerstwo Cyfryzacji, zasób 1159536`,
      "Ch. M. Yonge 1884",
      "A. Brückner 1927",
    ]);
  });

  it("says a year below the list's cut-off as such, never 0", () => {
    const below: SampleState = {
      ...ready,
      facts: {
        ...FACTS,
        births: {
          ...BIRTHS,
          sexes: [
            {
              sex: "MALE",
              on_any_list: true,
              latest: { birth_year: 2025, list: BOYS_2025, count: null, rank: null },
              trend: null,
              history: null,
            },
          ],
        },
      },
    };
    const words = text(page(below));
    expect(words).toContain("Chłopcy urodzeni w 2025 r.: poniżej progu listy (mniej niż 2).");
    expect(words).not.toMatch(/\b0 chłopców/u);
  });

  it("says when no work explains the name, and when a list does not hold it", () => {
    const none: SampleState = {
      ...ready,
      facts: {
        stock: { ...STOCK, state: "UNAVAILABLE", lists: [] },
        births: { ...BIRTHS, state: "NOT_ON_ANY_LIST", sexes: [] },
        meaning: { state: "NO_SOURCE" },
      },
    };
    const words = text(page(none));
    expect(words).toContain("Tego imienia nie ma na listach pierwszych imion z rejestru PESEL.");
    expect(words).toContain("Tego imienia nie ma na listach imion nadawanych dzieciom.");
    expect(words).toContain("żadne dzieło, które wolno nam cytować");
    expect(page(none)).not.toContain("ri-footnotes");
  });

  it("names the ten chapters, the price, soon and the waiting list, with no buy button", () => {
    const html = page({ kind: "none" }, "pl", null);
    const words = text(html);
    expect(words).toContain("01 Imię");
    expect(words).toContain("02 Pochodzenie nazwiska");
    expect(words).toContain("10 Czego nie wiemy");
    expect(html.match(/<li><span>\d\d<\/span>/gu)).toHaveLength(10);
    expect(words).toContain("28,99 zł");
    expect(words).toContain("Wkrótce.");
    expect(words).toContain("ma Twoje imię razem z nazwiskiem KOWALSKI");
    const mail = /href="(mailto:[^"]+)"/u.exec(html)?.[1] ?? "";
    expect(new URL(mail).searchParams.get("subject")).toBe(
      "Lista oczekujących: Małe poszukiwania (28,99 zł)",
    );
    expect(html).not.toMatch(/checkout|Kup raport/u);
    expect(html).not.toContain("data-report-sample");
    // The invented sample as a PDF (TASK-172).
    expect(html).toContain('href="/pl/przykladowy-raport.pdf"');
  });

  it("asks a reader without a session to sign in, and comes back here", () => {
    const href = "/pl/konto/zaloguj?next=%2Fpl%2Fnazwisko%2Fkowalski%2Fpelny-raport";
    const html = page({ kind: "sign-in", href });
    expect(html).toContain(`href="${href}"`);
    expect(text(html)).toContain("Próbkę dla Twojego imienia pokażemy po zalogowaniu.");
    expect(html).not.toContain("data-report-sample");
    // The typed name stays in the field.
    expect(html).toContain('value="Piotr"');
  });

  it("speaks English on the English page", () => {
    const words = text(page(ready, "en"));
    expect(words).toContain("Chapter 1 of 10");
    expect(words).toContain("Men with this first name 682,516");
    expect(words).toContain("1,146 boys born in 2025 (rank 29 of 965)");
    expect(words).toContain("PLN 28.99");
    expect(words).toContain("are called PIOTR KOWALSKI");
  });
});

describe("what the sample shows for the typed name (TASK-166)", () => {
  const deps = (over: Partial<SampleDeps> = {}): SampleDeps => ({
    findGivenName: vi.fn(async () => ({
      kind: "FOUND" as const,
      given_name: { id: "g-1", display_name: "PIOTR" },
    })),
    readGivenName: vi.fn(async () => FACTS),
    ...over,
  });
  const signIn = "/pl/konto/zaloguj";

  it("reads nothing with nothing typed, or without a session", async () => {
    const d = deps();
    expect(await loadSample(null, "open", signIn, d)).toEqual({ kind: "none" });
    expect(await loadSample("Piotr", "sign-in", signIn, d)).toEqual({
      kind: "sign-in",
      href: signIn,
    });
    expect(await loadSample("Piotr", "unavailable", signIn, d)).toEqual({ kind: "unavailable" });
    expect(d.findGivenName).not.toHaveBeenCalled();
  });

  it("reads the claims with accounts off or a session", async () => {
    for (const gate of ["off", "open"] as const) {
      const d = deps();
      expect(await loadSample("Piotr", gate, signIn, d)).toEqual(ready);
      expect(d.readGivenName).toHaveBeenCalledWith({ id: "g-1", display_name: "PIOTR" });
    }
  });

  it("says what the lookup found instead of a sample", async () => {
    const found = (kind: "INVALID" | "NOT_FOUND" | "HELD") =>
      deps({ findGivenName: vi.fn(async () => ({ kind })) });
    expect(await loadSample("x".repeat(61), "open", signIn, found("INVALID"))).toEqual({
      kind: "invalid",
    });
    expect(await loadSample(" Qwerty ", "open", signIn, found("NOT_FOUND"))).toEqual({
      kind: "not-found",
      typed: "Qwerty",
    });
    expect(await loadSample("Piotr", "open", signIn, found("HELD"))).toEqual({ kind: "held" });
  });

  it("is unavailable, not empty, when the database cannot answer", async () => {
    const d = deps({
      readGivenName: vi.fn(async () => {
        throw new Error("down");
      }),
    });
    expect(await loadSample("Piotr", "open", signIn, d)).toEqual({ kind: "unavailable" });
  });
});
