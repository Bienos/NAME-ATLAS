import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { FAMILY_METADATA, FAMILY_PATH, FamilyCard } from "./family-card.js";
import { lookUp, runLookups, FamilyView } from "./family-view.js";
import type { Fetch } from "./family-view.js";
import { emptyEntries, LABELS, lookupsOf, SLOTS, withLabel, withSurname } from "./family-state.js";
import type { Card, CardState, Entry, SlotId } from "./family-state.js";
import { UI } from "./messages.js";
import { Result } from "./result-view.js";
import { sitemapPageXml } from "./sitemap-xml.js";
import * as plPage from "../app/pl/nazwiska-rodzinne/page.js";
import * as enPage from "../app/en/family-surnames/page.js";

/**
 * TASK-040's privacy invariants and rendering rules (§9, §11).
 *
 * The request tests spy on the one function a lookup is allowed to call, and
 * assert on every argument it received. The rendering tests render real
 * components to markup, as TASK-017's view tests do, in the `node` environment.
 */

// ── fixtures ────────────────────────────────────────────────────────────────

const CITATION = {
  id: "cit-1",
  title: "Nazwiska występujące w rejestrze PESEL",
  publisher: "Ministerstwo Cyfryzacji",
  publication_date: "2026-01-20",
  source_type: "OFFICIAL_DATASET",
  locator: "resource:1148808",
  url: "https://api.dane.gov.pl/resources/1148808/csv",
  attribution: "Dane pochodzą z rejestru PESEL, Ministerstwo Cyfryzacji, dane.gov.pl (CC0 1.0)",
  terms: "CC0 1.0",
  retrieved_at: "2026-09-18T17:40:00Z",
  source_page_url:
    "https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel",
};
const CONFIDENCE = { status: "VERIFIED", methodology_code: "rule@1" };
const SURFACE = { surface: "FREE", decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" };
const NO_MEANING = {
  state: "NO_SOURCED_MEANING",
  interpretations: [],
  confidence: null,
  methodology_code: null,
  reason_code: "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
  surface: SURFACE,
};

function observation(count: number | null, group: string) {
  return {
    value: {
      status: count === null ? "SUPPRESSED" : "KNOWN",
      value: count,
      unit: "PEOPLE",
      scope_label_code: "PESEL_CURRENT_SURNAME",
    },
    snapshot_date: "2026-01-20",
    country_code: "PL",
    source_population_scope: "Wykaz nazwisk osób żyjących…",
    coverage_notes: null,
    comparability_group: group,
    confidence: CONFIDENCE,
    citation: CITATION,
  };
}

function rarity(x: number, numerator: number, group: string) {
  return {
    primary: { metric: "ONE_IN_X", value: x },
    supporting: [],
    methodology_code: "PESEL_PUBLISHED_UNIVERSE_SUM_V1",
    universe_label_code: "PESEL_PUBLISHED_UNIVERSE",
    numerator,
    denominator: 21_197_537,
    share: Number((numerator / 21_197_537).toFixed(9)),
    scope_label_code: "PESEL_CURRENT_SURNAME",
    snapshot_date: "2026-01-20",
    country_code: "PL",
    comparability_group: group,
    confidence: CONFIDENCE,
    citation: CITATION,
  };
}

/** A resolved surname with both lists, both 1-in-X figures and a low-coverage distribution. */
function resolved(id: string, name: string, male: number, female: number): SurnameResultResponse {
  return surnameResultResponseSchema.parse({
    schema_version: "1.6",
    status: "RESOLVED",
    surname: { id, display_name: name, script: "Latn" },
    population: {
      state: "READY",
      observations: [
        observation(male, "pesel_2026_national_male"),
        observation(female, "pesel_2026_national_female"),
      ],
      reason_code: null,
      surface: SURFACE,
    },
    rarity: {
      state: "READY",
      entries: [
        rarity(Math.round(21_197_537 / male), male, "pesel_2026_national_male"),
        rarity(Math.round(21_197_537 / female), female, "pesel_2026_national_female"),
      ],
      reason_code: null,
      surface: SURFACE,
    },
    distribution: {
      state: "READY",
      entries: [
        {
          coverage_state: "LOW_COVERAGE",
          regions: [
            {
              place_id: "01a0c057-0000-7000-8000-000000000030",
              terc_code: "30",
              display_name: "WIELKOPOLSKIE",
              count: 210,
              share_of_covered: 1,
            },
          ],
          covered_count: 210,
          national_count: male,
          coverage_ratio: Number((210 / male).toFixed(9)),
          coverage_basis: "covered_count / national_count",
          low_coverage_threshold: 0.5,
          universe_label_code: "PESEL_REGISTERED_VOIVODESHIP_COVERED_SET",
          scope_label_code: "PESEL_CURRENT_SURNAME",
          snapshot_date: "2026-01-20",
          country_code: "PL",
          comparability_group: "pesel_2026_regional_male",
          confidence: CONFIDENCE,
          citation: CITATION,
        },
      ],
      reason_code: null,
      surface: SURFACE,
    },
    suggestions: null,
    meaning: NO_MEANING,
  });
}

const NOWAK_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc088";
const KOWALSKI_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc099";
const NOWAK = resolved(NOWAK_ID, "NOWAK", 98_387, 99_738);
const KOWALSKI = resolved(KOWALSKI_ID, "KOWALSKI", 69_530, 70_401);

/** A resolved surname whose population the register does not list, and whose other figures are absent. */
const NOT_LISTED = surnameResultResponseSchema.parse({
  schema_version: "1.6",
  status: "RESOLVED",
  surname: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc0aa", display_name: "RZADKI", script: "Latn" },
  population: {
    state: "UNAVAILABLE",
    observations: [],
    reason_code: "NO_APPLICABLE_EVIDENCE",
    surface: SURFACE,
  },
  rarity: {
    state: "UNAVAILABLE",
    entries: [],
    reason_code: "NO_APPLICABLE_EVIDENCE",
    surface: SURFACE,
  },
  distribution: {
    state: "UNAVAILABLE",
    entries: [],
    reason_code: "NO_COMPLETE_REGIONAL_UNIVERSE",
    surface: SURFACE,
  },
  suggestions: null,
  meaning: NO_MEANING,
});

/** A resolved surname one of whose published values is suppressed. */
const SUPPRESSED = surnameResultResponseSchema.parse({
  ...NOT_LISTED,
  population: {
    state: "READY",
    observations: [observation(null, "pesel_2026_national_female")],
    reason_code: null,
    surface: SURFACE,
  },
});

const UNRESOLVED = surnameResultResponseSchema.parse({
  schema_version: "1.6",
  status: "UNRESOLVED",
  surname: null,
  population: null,
  rarity: null,
  distribution: null,
  suggestions: {
    state: "READY",
    outcome: "SUGGESTION_REQUIRED",
    decision_mode: "USER_CONFIRM",
    reason_code: null,
    suggestions: [
      {
        surname: { id: NOWAK_ID, display_name: "NOWAK", script: "Latn" },
        match_type: "FUZZY_CANDIDATE",
        explanation_codes: ["EDIT_DISTANCE_1"],
      },
    ],
  },
  meaning: null,
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Records every argument of every call. */
function spyFetch(respond: (requestPath: string) => Response): {
  readonly calls: unknown[][];
  readonly fetchFn: Fetch;
} {
  const calls: unknown[][] = [];
  const fetchFn = (...args: unknown[]): Promise<Response> => {
    calls.push(args);
    return Promise.resolve(respond(String(args[0])));
  };
  return { calls, fetchFn: fetchFn as Fetch };
}

function entries(...surnames: string[]): Entry[] {
  return surnames.reduce(
    (list, surname, index) => withSurname(list, SLOTS[index] as SlotId, surname),
    emptyEntries(),
  );
}

function card(state: CardState, ...typed: [string, Entry["label"]][]): Card {
  return {
    key: "surname-1",
    entries: typed.map(([surname, label], index) => ({
      slot: SLOTS[index] as SlotId,
      surname,
      label,
    })),
    state,
  };
}

function renderCard(value: Card, lang: "pl" | "en", onRetry?: () => void): string {
  return renderToStaticMarkup(
    createElement(
      FamilyCard,
      onRetry === undefined ? { card: value, lang } : { card: value, lang, onRetry },
    ),
  );
}

function renderView(lang: "pl" | "en"): string {
  return renderToStaticMarkup(createElement(FamilyView, { lang }));
}

/** Visible text, entities decoded; a non-breaking space is kept, as in the real page. */
function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/gu, " ")
    .replace(/&#x27;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&amp;/gu, "&")
    .replace(/[ \t\n\r]+/gu, " ");
}

const ALL_LABEL_STRINGS: readonly string[] = [
  ...LABELS,
  ...(["pl", "en"] as const).flatMap((lang) => [
    UI[lang].familyLabelSelf,
    UI[lang].familyLabelFather,
    UI[lang].familyLabelMother,
    UI[lang].familyLabelOther,
  ]),
];

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── requests: AC-02, AC-03, AC-04, AC-12 ────────────────────────────────────

describe("AC-02: one GET per non-empty input, carrying only the surname", () => {
  it("sends exactly one request per non-empty input and none for empty ones", async () => {
    const { calls, fetchFn } = spyFetch(() => json(200, NOWAK));
    await runLookups(lookupsOf(entries("NOWAK", "", "  ", "KOWALSKI")), () => undefined, fetchFn);
    expect(calls).toHaveLength(2);
    const surnames = calls.map((args) => {
      const url = new URL(String(args[0]), "https://name-atlas.example");
      expect(url.pathname).toBe("/api/v1/surname-results");
      expect([...url.searchParams.keys()]).toEqual(["surname"]);
      return url.searchParams.get("surname");
    });
    expect(surnames).toEqual(["NOWAK", "KOWALSKI"]);
  });

  it("sends nothing at all when every input is empty", async () => {
    const { calls, fetchFn } = spyFetch(() => json(200, NOWAK));
    await runLookups(lookupsOf(entries("", " ", "", "\t")), () => undefined, fetchFn);
    expect(calls).toEqual([]);
  });

  it("AC-12: sends a compound once, as typed, never split", async () => {
    const { calls, fetchFn } = spyFetch(() => json(200, UNRESOLVED));
    await runLookups(lookupsOf(entries("Kowalska-Nowak")), () => undefined, fetchFn);
    expect(calls).toEqual([["/api/v1/surname-results?surname=Kowalska-Nowak"]]);
  });

  it("reports each answer against its own input", async () => {
    const { fetchFn } = spyFetch((requestPath) =>
      requestPath.endsWith("NOWAK") ? json(200, NOWAK) : json(200, UNRESOLVED),
    );
    const seen = new Map<SlotId, CardState>();
    await runLookups(
      lookupsOf(entries("NOWAK", "Xyzzy")),
      (slot, state) => seen.set(slot, state),
      fetchFn,
    );
    expect(seen.get("surname-1")).toEqual({ kind: "RESULT", response: NOWAK });
    expect(seen.get("surname-2")).toEqual({ kind: "RESULT", response: UNRESOLVED });
  });
});

describe("AC-03: no label appears in any request", () => {
  it("keeps every label, as code and as words in both languages, out of every argument", async () => {
    let list = entries("NOWAK", "KOWALSKI", "WÓJCIK", "LEWANDOWSKI");
    LABELS.forEach((label, index) => {
      list = withLabel(list, SLOTS[index] as SlotId, label);
    });
    const { calls, fetchFn } = spyFetch(() => json(200, NOWAK));
    await runLookups(lookupsOf(list), () => undefined, fetchFn);
    expect(calls).toHaveLength(4);
    const sent = JSON.stringify(calls);
    for (const label of ALL_LABEL_STRINGS) {
      expect(sent).not.toContain(label);
      expect(sent).not.toContain(encodeURIComponent(label));
    }
  });
});

describe("AC-04: a lookup is indistinguishable from any other request to the endpoint", () => {
  it("passes the path and nothing else: no options, so no header, body, method or credentials", async () => {
    const { calls, fetchFn } = spyFetch(() => json(200, NOWAK));
    await runLookups(lookupsOf(entries("NOWAK", "KOWALSKI")), () => undefined, fetchFn);
    for (const args of calls) expect(args).toHaveLength(1);
  });

  it("sends no Referer: the page's policy keeps its own address off every lookup", () => {
    // The browser adds `Referer` itself, so no fetch spy can see it. Without
    // this policy it named /pl/nazwiska-rodzinne on every lookup (found in
    // Chromium, 2026-09-30).
    expect(FAMILY_METADATA.referrer).toBe("no-referrer");
  });

  it("calls the real fetch with a single argument too", async () => {
    const calls: unknown[][] = [];
    vi.stubGlobal("fetch", (...args: unknown[]) => {
      calls.push(args);
      return Promise.resolve(json(200, NOWAK));
    });
    await expect(lookUp("NOWAK")).resolves.toEqual({ kind: "RESULT", response: NOWAK });
    expect(calls).toEqual([["/api/v1/surname-results?surname=NOWAK"]]);
  });
});

describe("§10: a failure belongs to its own card", () => {
  it("a connection failure is a retryable error, never an unknown surname", async () => {
    const failing: Fetch = () => Promise.reject(new Error("offline"));
    await expect(lookUp("NOWAK", failing)).resolves.toEqual({ kind: "ERROR", retryable: true });
  });

  it("the middleware's plain-text 429 is the retry state", async () => {
    const limited: Fetch = () =>
      Promise.resolve(new Response("Too many requests. Please slow down.", { status: 429 }));
    await expect(lookUp("NOWAK", limited)).resolves.toEqual({ kind: "RATE_LIMITED" });
  });

  it("one failing lookup does not stop the others", async () => {
    const seen = new Map<SlotId, CardState>();
    const mixed: Fetch = (requestPath) =>
      requestPath.endsWith("BLAD")
        ? Promise.reject(new Error("offline"))
        : Promise.resolve(json(200, NOWAK));
    await runLookups(
      lookupsOf(entries("NOWAK", "BLAD", "NOWAK")),
      (slot, state) => seen.set(slot, state),
      mixed,
    );
    expect(seen.get("surname-1")?.kind).toBe("RESULT");
    expect(seen.get("surname-2")).toEqual({ kind: "ERROR", retryable: true });
    expect(seen.get("surname-3")?.kind).toBe("RESULT");
  });
});

// ── source scan: AC-05 and §8 ───────────────────────────────────────────────

const LIB = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(LIB, "..", "app");
const FAMILY_FILES = [
  path.join(LIB, "family-state.ts"),
  path.join(LIB, "family-card.tsx"),
  path.join(LIB, "family-view.tsx"),
  path.join(APP, "pl", "nazwiska-rodzinne", "page.tsx"),
  path.join(APP, "en", "family-surnames", "page.tsx"),
];

function codeOnly(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/gu, "")
    .replace(/(^|[^:])\/\/.*$/gmu, "$1");
}

const IMPORT_PATTERN = /^\s*(?:import|export)\b[^'"]*?\bfrom\s+['"]([^'"]+)['"]/gmu;

/** Every local module reachable from `entry` through its static imports. */
function reachable(entry: string): Set<string> {
  const files = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || files.has(file)) continue;
    files.add(file);
    for (const match of readFileSync(file, "utf8").matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (specifier === undefined || !specifier.startsWith(".")) continue;
      const base = path.resolve(path.dirname(file), specifier).replace(/\.js$/u, "");
      const source = [`${base}.ts`, `${base}.tsx`].find((candidate) => {
        try {
          readFileSync(candidate);
          return true;
        } catch {
          return false;
        }
      });
      if (source !== undefined) queue.push(source);
    }
  }
  return files;
}

describe("AC-05: nothing is written to browser storage or the URL", () => {
  const forbidden: readonly [string, RegExp][] = [
    ["localStorage", /\blocalStorage\b/u],
    ["sessionStorage", /\bsessionStorage\b/u],
    ["indexedDB", /\bindexedDB\b/u],
    ["cookies", /cookie/iu],
    ["history.pushState / replaceState", /\b(?:pushState|replaceState|history\s*\.)/u],
    [
      "router navigation",
      /\b(?:useRouter|usePathname|permanentRedirect)\b|\bredirect\s*\(|next\/navigation/u,
    ],
    ["search parameters", /\b(?:useSearchParams|searchParams|URLSearchParams|params)\b/u],
    ["location writes", /\blocation\s*(?:\.|=)/u],
    ["a <form>, which submits its fields into the URL", /<form\b/u],
  ];

  for (const file of FAMILY_FILES) {
    it(`${path.relative(path.join(LIB, ".."), file)} contains none of it`, () => {
      const code = codeOnly(file);
      const found = forbidden.filter(([, pattern]) => pattern.test(code)).map(([name]) => name);
      expect(found).toEqual([]);
    });
  }

  it("reaches no event, share, share-card or comparison module (§8, AC-10, AC-15)", () => {
    const names = [...reachable(path.join(LIB, "family-view.tsx"))].map((file) =>
      path.basename(file),
    );
    expect(names).toContain("family-card.tsx");
    for (const banned of [
      "events.ts",
      "share-button.tsx",
      "og-card.tsx",
      "og-facts.ts",
      "compare.ts",
      "compare-view.tsx",
    ]) {
      expect(names).not.toContain(banned);
    }
  });
});

// ── rendering: AC-06, AC-09, AC-10, AC-11, AC-13, AC-14, AC-15 ──────────────

describe("AC-06: neutral inputs, and never the mother's maiden name", () => {
  for (const lang of ["pl", "en"] as const) {
    it(`${lang}: four text inputs, autocomplete off, neutral names, the decided prompt`, () => {
      const html = renderView(lang);
      const inputs = html.match(/<input\b[^>]*>/gu) ?? [];
      expect(inputs).toHaveLength(4);
      inputs.forEach((input, index) => {
        expect(input).toContain(`name="surname-${String(index + 1)}"`);
        // HTML attribute names are case-insensitive; React 19 keeps the prop's casing.
        expect(input).toMatch(/\bautocomplete="off"/iu);
        expect(input).toMatch(/\bspellcheck="false"/iu);
        expect(input).toContain('type="text"');
      });
      const labels = [...html.matchAll(/<label for="surname-\d">([^<]*)<\/label>/gu)].map(
        (match) => match[1],
      );
      expect(labels).toEqual(Array(4).fill(UI[lang].familyPrompt));
    });

    it(`${lang}: no input, label or placeholder asks for a maiden name`, () => {
      expect(renderView(lang)).not.toMatch(/rodow|panieńsk|maiden/iu);
    });
  }

  it("uses the decided Polish and English prompts", () => {
    expect(UI.pl.familyPrompt).toBe("Nazwisko z Twojej rodziny");
    expect(UI.en.familyPrompt).toBe("A surname from your family");
  });
});

describe("AC-14: each input offers the four labels, optionally, and no free text", () => {
  for (const lang of ["pl", "en"] as const) {
    it(`${lang}: four selects of none + the four labels, and no text field but the surnames`, () => {
      const html = renderView(lang);
      const selects = html.match(/<select\b[\s\S]*?<\/select>/gu) ?? [];
      expect(selects).toHaveLength(4);
      for (const select of selects) {
        const options = [
          ...select.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/gu),
        ].map((match) => [match[1], text(match[2] ?? "").trim()]);
        expect(options).toEqual([
          ["", UI[lang].familyNoLabel],
          ["SELF", UI[lang].familyLabelSelf],
          ["FATHER", UI[lang].familyLabelFather],
          ["MOTHER", UI[lang].familyLabelMother],
          ["OTHER", UI[lang].familyLabelOther],
        ]);
      }
      expect(html).not.toContain("<textarea");
      expect(html.match(/<input\b/gu)).toHaveLength(4);
    });
  }

  it("uses the decided words", () => {
    expect([
      UI.pl.familyLabelSelf,
      UI.pl.familyLabelFather,
      UI.pl.familyLabelMother,
      UI.pl.familyLabelOther,
    ]).toEqual(["Twoje nazwisko", "Strona ojca", "Strona matki", "Inne"]);
  });
});

describe("AC-11: the notice is on screen", () => {
  it("says, in each language, that a result describes the surname and not the visitor's relatives", () => {
    expect(UI.pl.familyNotice).toBe(
      "Każdy wynik opisuje nazwisko jako całość — wszystkie osoby, które je noszą — a nie Twoich krewnych.",
    );
    expect(UI.en.familyNotice).toBe(
      "Each result describes the surname as a whole — everyone who carries it — not your relatives.",
    );
    for (const lang of ["pl", "en"] as const) {
      const html = renderView(lang);
      expect(html).toContain(`<p class="warning">${UI[lang].familyNotice}</p>`);
      // Before the inputs, so it is there before any card can be.
      expect(html.indexOf(UI[lang].familyNotice)).toBeLessThan(html.indexOf("<input"));
    }
  });
});

describe("AC-13: noindex, out of the sitemap, and no surname in any URL", () => {
  it("both routes are noindex, nofollow", () => {
    expect(FAMILY_METADATA.robots).toEqual({ index: false, follow: false });
    expect(plPage.metadata).toBe(FAMILY_METADATA);
    expect(enPage.metadata).toBe(FAMILY_METADATA);
  });

  it("neither route is in a sitemap page, which lists surname pages only", () => {
    const xml = sitemapPageXml("https://name-atlas.example", "pl", [
      {
        surname_id: NOWAK_ID,
        slug: "nowak",
        display_name: "NOWAK",
        last_modified: "2026-01-20",
      },
    ]);
    expect(xml).toContain("/pl/nazwisko/nowak");
    expect(xml).not.toContain(FAMILY_PATH.pl);
    expect(xml).not.toContain(FAMILY_PATH.en);
  });

  it("the routes carry no parameter, and the page links nowhere with a surname in it", () => {
    expect(FAMILY_PATH).toEqual({ pl: "/pl/nazwiska-rodzinne", en: "/en/family-surnames" });
    for (const lang of ["pl", "en"] as const) {
      const hrefs = [...renderView(lang).matchAll(/href="([^"]*)"/gu)].map((match) => match[1]);
      expect(hrefs.sort()).toEqual(
        (lang === "pl" ? ["/", FAMILY_PATH.en] : ["/?lang=en", FAMILY_PATH.pl]).sort(),
      );
    }
  });
});

describe("AC-09: every count carries its scope and date, as the single-surname page shows it", () => {
  for (const lang of ["pl", "en"] as const) {
    it(`${lang}: each claim on the card is the page's own claim, word for word`, () => {
      const cardHtml = renderCard(card({ kind: "RESULT", response: NOWAK }, ["NOWAK", null]), lang);
      const pageHtml = renderToStaticMarkup(createElement(Result, { response: NOWAK, lang }));
      const claims = cardHtml.match(/<p class="claim-(?:statement|meta)">[\s\S]*?<\/p>/gu) ?? [];
      // Two counts, two 1-in-X figures, one distribution: five statements, five meta lines.
      expect(claims).toHaveLength(10);
      for (const claim of claims) expect(pageHtml).toContain(claim);
    });
  }

  it("names the register, the publisher and the dataset's date beside the count", () => {
    const html = text(renderCard(card({ kind: "RESULT", response: NOWAK }, ["NOWAK", null]), "pl"));
    expect(html).toContain("98 387 osób było zarejestrowanych z nazwiskiem NOWAK");
    expect(html).toContain("w rejestrze PESEL na dzień 20 stycznia 2026 r.");
    expect(html).toContain("Ministerstwo Cyfryzacji");
  });

  it("puts a coverage warning before the regional figure it qualifies", () => {
    const html = renderCard(card({ kind: "RESULT", response: NOWAK }, ["NOWAK", null]), "en");
    const warning = html.indexOf('class="warning"');
    expect(warning).toBeGreaterThan(-1);
    expect(warning).toBeLessThan(html.indexOf("who had a registered voivodeship on"));
  });
});

describe("AC-10: nothing is computed across cards", () => {
  const cards = [
    renderCard(card({ kind: "RESULT", response: NOWAK }, ["NOWAK", "FATHER"]), "pl"),
    renderCard(card({ kind: "RESULT", response: KOWALSKI }, ["KOWALSKI", "MOTHER"]), "pl"),
  ].join("");
  const shown = text(cards);

  it("shows no sum of any two counts, within a surname or across surnames", () => {
    const counts = [98_387, 99_738, 69_530, 70_401];
    for (const a of counts) {
      for (const b of counts) {
        if (a >= b) continue;
        const sum = String(a + b).replace(/\B(?=(\d{3})+(?!\d))/gu, " ");
        expect(shown).not.toContain(sum);
      }
    }
  });

  it("names no rarer surname, no similarity and no shared region", () => {
    expect(shown).not.toMatch(/rzadsz|częstsz|podobn|wspóln|oba nazwiska/iu);
  });

  it("keeps each card to its own surname", () => {
    const [nowak, kowalski] = [
      renderCard(card({ kind: "RESULT", response: NOWAK }, ["NOWAK", null]), "pl"),
      renderCard(card({ kind: "RESULT", response: KOWALSKI }, ["KOWALSKI", null]), "pl"),
    ];
    expect(nowak).not.toContain("KOWALSKI");
    expect(kowalski).not.toContain("NOWAK");
  });
});

describe("AC-15: a card links to the full page, and nothing is sold or shared here", () => {
  it("links a resolved card to the single-surname page through the search, which redirects there", () => {
    const pl = renderCard(card({ kind: "RESULT", response: NOWAK }, ["Nowak", null]), "pl");
    const en = renderCard(card({ kind: "RESULT", response: NOWAK }, ["Nowak", null]), "en");
    expect(pl).toContain(`<a href="/?surname=NOWAK">${UI.pl.familyFullPage}</a>`);
    expect(en).toContain(`<a href="/?surname=NOWAK&amp;lang=en">${UI.en.familyFullPage}</a>`);
  });

  it("carries no offer, price, checkout, share action or share card", () => {
    for (const lang of ["pl", "en"] as const) {
      const html =
        renderView(lang) +
        renderCard(card({ kind: "RESULT", response: NOWAK }, ["NOWAK", null]), lang);
      expect(html).not.toMatch(
        /premium|checkout|class="share|og:image|\d\s?zł|\bPLN\b|€|\$\s?\d/iu,
      );
    }
  });
});

describe("§10: each card state has its own honest words", () => {
  const t = UI.pl;

  it("a merged card lists every input that named it, with its label", () => {
    const html = text(
      renderCard(
        card({ kind: "RESULT", response: NOWAK }, ["NOWAK", "FATHER"], ["Nowak", "MOTHER"]),
        "pl",
      ),
    );
    expect(html).toContain(`${t.familyEntered}: NOWAK (Strona ojca), Nowak (Strona matki)`);
  });

  it("an unresolved surname shows the page's own clarification, never a zero", () => {
    const html = text(
      renderCard(card({ kind: "RESULT", response: UNRESOLVED }, ["Nowk", null]), "pl"),
    );
    expect(html).toContain(t.unresolvedHeading);
    expect(html).toContain(t.suggestionsQuestion);
    expect(html).not.toMatch(/\b0 osób/u);
  });

  it("a surname the dataset does not list says so, and never shows zero", () => {
    const html = text(
      renderCard(card({ kind: "RESULT", response: NOT_LISTED }, ["Rzadki", null]), "pl"),
    );
    expect(html).toContain("Ten zbiór nie zawiera tego nazwiska.");
    expect(html).not.toMatch(/\b0 osób/u);
  });

  it("a suppressed value is stated as absent, never as zero", () => {
    const html = text(
      renderCard(card({ kind: "RESULT", response: SUPPRESSED }, ["Rzadki", null]), "pl"),
    );
    expect(html).toContain("nie jest podana w tym zbiorze");
    expect(html).not.toMatch(/\b0 osób/u);
  });

  it("an invalid input shows the validation message for that input only", () => {
    const html = text(renderCard(card({ kind: "INVALID" }, ["!!!", null]), "pl"));
    expect(html).toContain(t.invalidHeading);
    expect(html).not.toContain(t.unresolvedHeading);
  });

  it("a server error offers a retry and is never shown as an unknown surname", () => {
    const html = renderCard(
      card({ kind: "ERROR", retryable: true }, ["NOWAK", null]),
      "pl",
      () => undefined,
    );
    expect(text(html)).toContain(t.unavailableHeading);
    expect(text(html)).not.toContain(t.unresolvedHeading);
    expect(html).toContain(`<button type="button" class="family-retry">${t.familyRetry}</button>`);
  });

  it("an error the envelope marks as not retryable offers no retry", () => {
    const html = renderCard(
      card({ kind: "ERROR", retryable: false }, ["NOWAK", null]),
      "pl",
      () => undefined,
    );
    expect(html).not.toContain("family-retry");
  });

  it("a rate-limited lookup offers a retry", () => {
    const html = renderCard(card({ kind: "RATE_LIMITED" }, ["NOWAK", null]), "en", () => undefined);
    expect(text(html)).toContain(UI.en.familyRateLimited);
    expect(html).toContain("family-retry");
  });

  it("a lookup in flight says so", () => {
    expect(text(renderCard(card({ kind: "LOADING" }, ["NOWAK", null]), "pl"))).toContain(
      t.familyLoading,
    );
  });

  it("bounds a very long input rather than rendering it whole as a heading", () => {
    const long = "A".repeat(500);
    const html = renderCard(card({ kind: "INVALID" }, [long, null]), "pl");
    expect(html).not.toContain(long);
    expect(html).toContain(`${"A".repeat(40)}…`);
  });
});
