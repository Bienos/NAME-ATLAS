import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { resolved, unresolved } from "./couple-fixture.js";
import {
  addEntry,
  cardsFor,
  initialEntries,
  LABELS,
  MAX_ENTRIES,
  setLabel,
  setSurname,
  submissions,
} from "./family-surnames-state.js";
import type { Entry, Outcome } from "./family-surnames-state.js";
import { lookup, lookupEach, lookupUrl } from "./family-surnames-lookup.js";

/**
 * TASK-169's state, request and source rules (§7, §9, §11): the pure state
 * module, the requests the page makes (watched through a `fetch` spy), and a
 * scan of the page's own sources for anything that could store or address the
 * surnames.
 */

const NOWAK_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc101";
const LUCZAK_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc102";
const ŁUCZAK_ID = "01a0b9e3-34f3-7633-a239-2b8596dfc103";

const result = (response: SurnameResultResponse): Outcome => ({ kind: "RESULT", response });

function entries(...items: (readonly [string, Entry["label"]] | string)[]): Entry[] {
  return items.map((item) =>
    typeof item === "string"
      ? { surname: item, label: null }
      : { surname: item[0], label: item[1] },
  );
}

function ambiguous(): SurnameResultResponse {
  return surnameResultResponseSchema.parse({
    ...unresolved(),
    status: "AMBIGUOUS",
    suggestions: {
      state: "UNAVAILABLE",
      outcome: null,
      decision_mode: null,
      reason_code: "MULTIPLE_EXACT_MATCHES",
      suggestions: [],
    },
  }) as SurnameResultResponse;
}

describe("AC-01 — at most four inputs, and blank ones ask nothing", () => {
  it("adds inputs up to four and never a fifth", () => {
    let list = initialEntries();
    for (let i = 0; i < 10; i++) list = addEntry(list);
    expect(list).toHaveLength(MAX_ENTRIES);
    expect(MAX_ENTRIES).toBe(4);
  });

  it("drops empty and whitespace-only inputs from the submission, and sends the rest as typed", () => {
    const list = entries("", "   ", " Nowak ", "\t");
    expect(submissions(list)).toEqual([{ surname: " Nowak ", label: null }]);
    expect(submissions(entries("", " "))).toEqual([]);
  });

  it("produces no card for a blank input", () => {
    expect(cardsFor(submissions(entries("", "  ")), [])).toEqual([]);
  });
});

describe("AC-14 — the four fixed labels", () => {
  it("is exactly the four labels of U-4", () => {
    expect(LABELS).toEqual(["SELF", "FATHER", "MOTHER", "OTHER"]);
  });

  it("accepts a label from the set, clears it with an empty value, and ignores free text", () => {
    let list = initialEntries();
    list = setLabel(list, 0, "MOTHER");
    expect(list[0]?.label).toBe("MOTHER");
    list = setLabel(list, 0, "");
    expect(list[0]?.label).toBeNull();
    list = setLabel(list, 1, "Babcia Zofia z Krakowa");
    expect(list[1]?.label).toBeNull();
  });

  it("keeps the typed surname untouched when a label changes", () => {
    const list = setLabel(setSurname(initialEntries(), 0, "Łuczak"), 0, "SELF");
    expect(list[0]).toEqual({ surname: "Łuczak", label: "SELF" });
  });
});

describe("AC-07 — cards merge only on the returned identity", () => {
  it("NOWAK and Nowak are two requests and one card when the endpoint gives one identity", async () => {
    const nowak = resolved({ id: NOWAK_ID, display: "NOWAK" });
    const spy = vi.fn((_url: string) => Promise.resolve(Response.json(nowak)));
    const submitted = submissions(entries(["NOWAK", "FATHER"], ["Nowak", "MOTHER"]));
    const outcomes: Outcome[] = [];
    await lookupEach(spy, submitted, (i, o) => {
      outcomes[i] = o;
    });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls.map((c) => c[0])).toEqual([lookupUrl("NOWAK"), lookupUrl("Nowak")]);
    const cards = cardsFor(submitted, outcomes);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.entries.map((e) => e.surname)).toEqual(["NOWAK", "Nowak"]);
    expect(cards[0]?.indexes).toEqual([0, 1]);
  });

  it("Łuczak and Luczak with two identities are two cards", () => {
    const submitted = submissions(entries("Łuczak", "Luczak"));
    const cards = cardsFor(submitted, [
      result(resolved({ id: ŁUCZAK_ID, display: "ŁUCZAK" })),
      result(resolved({ id: LUCZAK_ID, display: "LUCZAK" })),
    ]);
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.entries[0]?.surname)).toEqual(["Łuczak", "Luczak"]);
  });

  it("never merges by the typed text: the same text with no identity yet is two cards", () => {
    const cards = cardsFor(submissions(entries("Nowak", "Nowak")), []);
    expect(cards).toHaveLength(2);
    expect(cards.every((c) => c.outcome.kind === "LOADING")).toBe(true);
  });

  it("never merges two unresolved inputs", () => {
    const cards = cardsFor(submissions(entries("Zzyzx", "Zzyzx")), [
      result(unresolved()),
      result(unresolved()),
    ]);
    expect(cards).toHaveLength(2);
  });
});

describe("AC-08 and §10 — one state per card, and no card changes another", () => {
  const submitted = submissions(entries("Nowak", "Zzyzx", "Kowa", "x", "Bad"));
  const mixed: Outcome[] = [
    result(resolved({ id: NOWAK_ID, display: "NOWAK" })),
    result(unresolved()),
    result(ambiguous()),
    { kind: "INVALID" },
  ];

  it("maps each outcome to its own card", () => {
    const cards = cardsFor(submitted.slice(0, 4), mixed);
    expect(cards.map((c) => c.outcome.kind)).toEqual(["RESULT", "RESULT", "RESULT", "INVALID"]);
    const statuses = cards.map((c) =>
      c.outcome.kind === "RESULT" ? c.outcome.response.status : null,
    );
    expect(statuses).toEqual(["RESOLVED", "UNRESOLVED", "AMBIGUOUS", null]);
  });

  it("changing one outcome leaves every other card exactly as it was", () => {
    const before = cardsFor(submitted.slice(0, 4), mixed);
    for (const changed of [
      { kind: "ERROR" },
      { kind: "RATE_LIMITED" },
      { kind: "LOADING" },
    ] as const) {
      const after = cardsFor(submitted.slice(0, 4), [mixed[0], changed, mixed[2], mixed[3]]);
      expect(after[1]?.outcome).toEqual(changed);
      expect([after[0], after[2], after[3]]).toEqual([before[0], before[2], before[3]]);
    }
  });

  it("maps HTTP answers to the contract's states", async () => {
    const answer = (status: number, body: unknown = null) =>
      lookup(() => Promise.resolve(Response.json(body, { status })), "Nowak");
    const nowak = resolved({ id: NOWAK_ID, display: "NOWAK" });
    expect((await answer(200, nowak)).kind).toBe("RESULT");
    expect(await answer(400, { error: { code: "INVALID_REQUEST" } })).toEqual({ kind: "INVALID" });
    expect(await answer(429)).toEqual({ kind: "RATE_LIMITED" });
    expect(await answer(500, { error: { retryable: true } })).toEqual({ kind: "ERROR" });
    expect(await answer(503)).toEqual({ kind: "ERROR" });
    // A 200 the contract does not accept is an error, never "unknown surname".
    expect(await answer(200, { status: "UNRESOLVED" })).toEqual({ kind: "ERROR" });
    expect(await lookup(() => Promise.reject(new Error("offline")), "Nowak")).toEqual({
      kind: "ERROR",
    });
  });

  it("one failing lookup does not stop the others from landing", async () => {
    const nowak = resolved({ id: NOWAK_ID, display: "NOWAK" });
    const spy = vi.fn((url: string) =>
      url.includes("Bad")
        ? Promise.reject(new Error("network"))
        : Promise.resolve(Response.json(nowak)),
    );
    const outcomes: Outcome[] = [];
    await lookupEach(spy, submissions(entries("Nowak", "Bad", "Kowalski")), (i, o) => {
      outcomes[i] = o;
    });
    expect(outcomes.map((o) => o.kind)).toEqual(["RESULT", "ERROR", "RESULT"]);
  });
});

describe("AC-10 — nothing computed across cards", () => {
  it("keeps input order, never count order, and carries no aggregate", () => {
    const small = resolved({ id: LUCZAK_ID, display: "LUCZAK", counts: [[12, "male"]] });
    const large = resolved({ id: NOWAK_ID, display: "NOWAK", counts: [[100000, "male"]] });
    const cards = cardsFor(submissions(entries("Luczak", "Nowak")), [result(small), result(large)]);
    expect(cards.map((c) => c.key)).toEqual([`id:${LUCZAK_ID}`, `id:${NOWAK_ID}`]);
    for (const card of cards) {
      expect(Object.keys(card).sort()).toEqual(["entries", "indexes", "key", "outcome"]);
    }
    // Each card's response is the endpoint's, untouched.
    expect(cards[0]?.outcome).toEqual(result(small));
    expect(cards[1]?.outcome).toEqual(result(large));
  });
});

describe("AC-12 — a compound surname is sent as typed", () => {
  it("is one input, one request, never split", async () => {
    const spy = vi.fn((_url: string) => Promise.resolve(Response.json(unresolved())));
    const submitted = submissions(entries("Kowalska-Nowak"));
    await lookupEach(spy, submitted, () => undefined);
    expect(spy).toHaveBeenCalledTimes(1);
    const url = new URL(spy.mock.calls[0]?.[0] ?? "", "https://x.test");
    expect(url.searchParams.getAll("surname")).toEqual(["Kowalska-Nowak"]);
    expect(cardsFor(submitted, [result(unresolved())])).toHaveLength(1);
  });
});

describe("AC-02, AC-03, AC-04 and §9.1–9.2 — the requests", () => {
  const LABEL_WORDS = [...LABELS, "Twoje nazwisko", "Strona ojca", "Strona matki", "Inne"];

  /** The page's own path for a submission, with `fetch` watched. */
  async function watch(list: Entry[]) {
    const spy = vi.fn((..._args: unknown[]) => Promise.resolve(Response.json(unresolved())));
    await lookupEach(
      spy as unknown as (url: string) => Promise<Response>,
      submissions(list),
      () => undefined,
    );
    return spy;
  }

  it("makes exactly one GET per non-empty input, with `surname` as its only parameter", async () => {
    const list = entries(
      ["Nowak", "SELF"],
      "",
      ["Łuczak", "FATHER"],
      ["  Kowalska-Nowak", "OTHER"],
    );
    const spy = await watch(list);
    expect(spy).toHaveBeenCalledTimes(3);
    const typed = ["Nowak", "Łuczak", "  Kowalska-Nowak"];
    spy.mock.calls.forEach((call, i) => {
      const url = new URL(String(call[0]), "https://x.test");
      expect(url.pathname).toBe("/api/v1/surname-results");
      expect([...url.searchParams.keys()]).toEqual(["surname"]);
      expect(url.searchParams.get("surname")).toBe(typed[i]);
    });
  });

  it("sends no label, in any URL, header or body", async () => {
    const list = entries(
      ["Nowak", "SELF"],
      ["Kowalski", "FATHER"],
      ["Wiśniewski", "MOTHER"],
      ["Zieliński", "OTHER"],
    );
    const spy = await watch(list);
    expect(spy).toHaveBeenCalledTimes(4);
    for (const call of spy.mock.calls) {
      const serialised = JSON.stringify(call) + decodeURIComponent(String(call[0]));
      for (const word of LABEL_WORDS) expect(serialised).not.toContain(word);
    }
  });

  it("passes `fetch` the URL alone: no method, header, body, cookie or credentials option", async () => {
    const spy = await watch(entries("Nowak", "Kowalski"));
    for (const call of spy.mock.calls) {
      expect(call).toHaveLength(1);
      expect(typeof call[0]).toBe("string");
    }
  });

  it("asks exactly what any other client asks for the same surname", async () => {
    const spy = await watch(entries(["Nowak", "MOTHER"]));
    expect(spy.mock.calls[0]).toEqual(["/api/v1/surname-results?surname=Nowak"]);
  });
});

/** §16.3: the files this task adds. */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(__dirname, "..", "app");
const PAGE_SOURCES = [
  path.join(__dirname, "family-surnames-state.ts"),
  path.join(__dirname, "family-surnames-lookup.ts"),
  path.join(__dirname, "family-surnames-view.tsx"),
  path.join(__dirname, "family-surnames-client.tsx"),
  path.join(__dirname, "family-surnames-page.tsx"),
  path.join(APP, "pl", "nazwiska-w-rodzinie", "page.tsx"),
  path.join(APP, "en", "family-surnames", "page.tsx"),
];

/** Code only: comments may name what the code must not do. */
function code(file: string): string {
  return readFileSync(file, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/(^|[^:])\/\/.*$/gmu, "$1");
}

describe("AC-05 and §9.3 — the page writes nothing to storage or to the URL", () => {
  const FORBIDDEN: readonly [string, RegExp][] = [
    ["localStorage", /localStorage/u],
    ["sessionStorage", /sessionStorage/u],
    ["indexedDB", /indexedDB/iu],
    ["document.cookie", /document\s*\.\s*cookie/u],
    ["cookies()", /\bcookies\s*\(/u],
    ["history.pushState", /pushState/u],
    ["history.replaceState", /replaceState/u],
    ["the router", /useRouter|next\/navigation|next\/router|\bredirect\s*\(/u],
    ["search-parameter writes", /searchParams|URLSearchParams|useSearchParams/u],
    [
      "location writes",
      /location\s*\.\s*(?:href|search|hash|assign|replace)|window\s*\.\s*location/u,
    ],
    // A form submitted before hydration would put the surnames in the query string.
    ["a <form>", /<form\b/u],
  ];

  it("covers every source file this task adds", () => {
    for (const file of PAGE_SOURCES) expect(readFileSync(file, "utf-8").length).toBeGreaterThan(0);
  });

  for (const [name, pattern] of FORBIDDEN) {
    it(`no source references ${name}`, () => {
      const hits = PAGE_SOURCES.filter((file) => pattern.test(code(file)));
      expect(hits).toEqual([]);
    });
  }

  it("the only network call is the surname-results lookup", () => {
    const fetches = PAGE_SOURCES.flatMap((file) =>
      [...code(file).matchAll(/fetch\(([^)]*)\)/gu)].map(
        (m) => `${path.basename(file)}:${m[1] ?? ""}`,
      ),
    );
    expect(fetches).toEqual(["family-surnames-client.tsx:url"]);
    expect(code(PAGE_SOURCES[1] ?? "")).toContain("/api/v1/surname-results?surname=");
  });
});

describe("§9.4 — the server gains nothing", () => {
  it("adds no route handler: the page folders hold a page and nothing else", () => {
    expect(readdirSync(path.join(APP, "pl", "nazwiska-w-rodzinie"))).toEqual(["page.tsx"]);
    expect(readdirSync(path.join(APP, "en", "family-surnames"))).toEqual(["page.tsx"]);
  });
});

describe("AC-13 — no route or sitemap carries the page or a surname", () => {
  it("the routes are static: no dynamic segment that could hold a surname", () => {
    for (const file of PAGE_SOURCES.slice(5)) {
      expect(file).not.toMatch(/\[/u);
      expect(code(file)).not.toMatch(/params/u);
    }
  });

  it("no sitemap source names either route", () => {
    const sitemapSources = [
      path.join(__dirname, "sitemap-xml.ts"),
      path.join(APP, "sitemap.xml", "route.ts"),
      path.join(APP, "sitemap", "[page]", "route.ts"),
      path.join(APP, "sitemap-blog.xml", "route.ts"),
    ];
    for (const file of sitemapSources) {
      const source = readFileSync(file, "utf-8");
      expect(source).not.toContain("nazwiska-w-rodzinie");
      expect(source).not.toContain("family-surnames");
    }
  });
});
