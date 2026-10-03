import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  WIKIDATA_BEARERS_KEPT,
  WikidataShapeError,
  exactBearers,
  nameEndsWithSurname,
  summariseWikidataBearers,
  wikidataBearersQuery,
  wikidataDetailsQuery,
  wikidataFamilyNameLabels,
  wikidataSurnameLabel,
} from "./bearers.js";
import {
  WIKIDATA_MIN_INTERVAL_MS,
  WIKIDATA_USER_AGENT,
  WikidataPacer,
  WikidataRequestError,
  fetchWikidataBearers,
} from "./fetch.js";
import type { WikidataFetchDeps } from "./fetch.js";

/**
 * TASK-073: famous bearers from Wikidata. The responses are real bytes the
 * loader's fetcher captured for ZAREMBA and KOWALSKA on 2026-10-03, pinned by
 * `fixtures/wikidata-bearers/source-manifest.json`. No test reaches the network.
 */

const DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../fixtures/wikidata-bearers",
);
const manifest = JSON.parse(readFileSync(path.join(DIR, "source-manifest.json"), "utf8")) as {
  files: { surname: string; query: string; path: string; sha256: string }[];
};
function response(surname: string, query: string): string {
  const file = manifest.files.find((f) => f.surname === surname && f.query === query);
  if (file === undefined) throw new Error(`no fixture for ${surname} ${query}`);
  return readFileSync(path.join(DIR, file.path), "utf8");
}

describe("the captured responses", () => {
  it.each(manifest.files.map((f) => [f.path, f] as const))("%s keeps its pinned digest", (_, f) => {
    const bytes = readFileSync(path.join(DIR, f.path));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(f.sha256);
  });
});

describe("the surname as Wikidata labels it", () => {
  it("is written as a name, each part of a double surname too", () => {
    expect(wikidataSurnameLabel("ZAREMBA")).toBe("Zaremba");
    expect(wikidataSurnameLabel("ŻMUDA-TRZEBIATOWSKI")).toBe("Żmuda-Trzebiatowski");
  });

  it("asks for the masculine item too for a feminine -ska, -cka or -dzka form", () => {
    expect(wikidataFamilyNameLabels("KOWALSKA")).toEqual(["Kowalska", "Kowalski"]);
    expect(wikidataFamilyNameLabels("NOWACKA")).toEqual(["Nowacka", "Nowacki"]);
    expect(wikidataFamilyNameLabels("ŻMUDA-TRZEBIATOWSKA")).toEqual([
      "Żmuda-Trzebiatowska",
      "Żmuda-Trzebiatowski",
    ]);
    expect(wikidataFamilyNameLabels("NOWAK")).toEqual(["Nowak"]);
    expect(wikidataFamilyNameLabels("KOWALSKI")).toEqual(["Kowalski"]);
  });

  it("is matched against a whole last word, without Wikipedia's disambiguation", () => {
    expect(nameEndsWithSurname("Piotr Nowak (piłkarz)", "NOWAK")).toBe(true);
    expect(nameEndsWithSurname("Joanna Nowak-Michalska", "NOWAK")).toBe(false);
    expect(nameEndsWithSurname("Jan Kowalski", "KOWALSKA")).toBe(false);
    expect(nameEndsWithSurname("Anna Kowalska", "KOWALSKA")).toBe(true);
    expect(nameEndsWithSurname("Sternowak", "NOWAK")).toBe(false);
  });
});

describe("the queries", () => {
  it("ask for people with a Wikipedia article, filed under a family-name item", () => {
    const q = wikidataBearersQuery(["Kowalska", "Kowalski"]);
    expect(q).toContain('"Kowalska"@pl "Kowalska"@mul "Kowalska"@en "Kowalski"@pl');
    expect(q).toContain("wdt:P734 ?fn ; wdt:P31 wd:Q5");
    expect(q).toContain('wikibase:wikiGroup "wikipedia"');
    expect(q).toContain("wd:Q101352");
  });

  it("escape a quote in a label, and refuse an id that is not one", () => {
    expect(wikidataBearersQuery(['O"Brien'])).toContain('"O\\"Brien"@pl');
    expect(() => wikidataDetailsQuery(["Q1", "Q2 } DROP"])).toThrow(/not a Wikidata id/u);
    expect(wikidataDetailsQuery(["Q1", "Q42"])).toContain("VALUES ?person { wd:Q1 wd:Q42 }");
  });
});

describe("ZAREMBA's bearers", () => {
  const summary = summariseWikidataBearers(
    "ZAREMBA",
    response("ZAREMBA", "bearers"),
    response("ZAREMBA", "details"),
  );

  it("count everyone named exactly ZAREMBA, and how many have a date of death", () => {
    expect(summary.version).toBe("wikidata_bearers@1");
    expect(summary.labels).toEqual(["Zaremba"]);
    expect(summary.total).toBe(59);
    expect(summary.with_death_date).toBe(37);
  });

  it("keep at most twenty, most written about first, each named ZAREMBA", () => {
    expect(summary.bearers).toHaveLength(WIKIDATA_BEARERS_KEPT);
    for (const [i, b] of summary.bearers.entries()) {
      expect(nameEndsWithSurname(b.name, "ZAREMBA")).toBe(true);
      if (i > 0) expect(summary.bearers[i - 1]!.sitelinks).toBeGreaterThanOrEqual(b.sitelinks);
    }
    expect(summary.bearers[1]).toMatchObject({
      name: "Stanisław Zaremba",
      born: 1863,
      died: 1942,
      description_pl: "polski matematyk, profesor UJ",
    });
  });

  it("link a Wikipedia article in Polish or English, and nothing else", () => {
    for (const b of summary.bearers) {
      if (b.article_url !== null) {
        expect(b.article_url).toMatch(/^https:\/\/(pl|en)\.wikipedia\.org\/wiki\//u);
      }
    }
  });

  it("leave out a person on the exclusion list, from the count too", () => {
    const first = summary.bearers[0]!.qid;
    const without = exactBearers("ZAREMBA", response("ZAREMBA", "bearers"), [first]);
    expect(without).toHaveLength(58);
    expect(without.map((b) => b.qid)).not.toContain(first);
    // The twenty-first moves up, and the details captured for the first twenty
    // do not answer for it: the summary refuses rather than show half a person.
    expect(() =>
      summariseWikidataBearers(
        "ZAREMBA",
        response("ZAREMBA", "bearers"),
        response("ZAREMBA", "details"),
        [first],
      ),
    ).toThrow(/no row for/u);
  });
});

describe("KOWALSKA's bearers", () => {
  const bearers = response("KOWALSKA", "bearers");
  const summary = summariseWikidataBearers("KOWALSKA", bearers, response("KOWALSKA", "details"));

  it("are the women named KOWALSKA, not the men filed under the same item", () => {
    expect(summary.labels).toEqual(["Kowalska", "Kowalski"]);
    expect(summary.total).toBe(55);
    expect(summary.with_death_date).toBe(25);
    expect(summary.bearers[0]).toMatchObject({ name: "Faustyna Kowalska", born: 1905 });
    // The query answered for every Kowalski and Kowalska; the summary kept the exact surname.
    const rows = (JSON.parse(bearers) as { results: { bindings: unknown[] } }).results.bindings;
    expect(rows.length).toBeGreaterThan(summary.total);
    expect(exactBearers("KOWALSKA", bearers).every((c) => / Kowalska$/u.test(c.name))).toBe(true);
  });

  it("include a living person, with no year of death", () => {
    expect(summary.bearers.some((b) => b.died === null && b.born !== null)).toBe(true);
  });
});

describe("an answer that does not parse", () => {
  it("is refused, never summarised", () => {
    expect(() => summariseWikidataBearers("ZAREMBA", "<html>", null)).toThrow(WikidataShapeError);
    expect(() => summariseWikidataBearers("ZAREMBA", '{"results":{}}', null)).toThrow(
      /results\.bindings/u,
    );
    const one = JSON.stringify({
      results: {
        bindings: [
          {
            person: { value: "http://www.wikidata.org/entity/Q1" },
            label_pl: { value: "Jan Zaremba" },
            sitelinks: { value: "3" },
          },
        ],
      },
    });
    // Kept, so the details must answer for it.
    expect(() => summariseWikidataBearers("ZAREMBA", one, null)).toThrow(/details/u);
    expect(() =>
      summariseWikidataBearers("ZAREMBA", one, JSON.stringify({ results: { bindings: [] } })),
    ).toThrow(/no row for Q1/u);
    const elsewhere = JSON.stringify({
      results: {
        bindings: [
          {
            person: { value: "http://www.wikidata.org/entity/Q1" },
            plwiki: { value: "https://example.org/wiki/Jan" },
          },
        ],
      },
    });
    expect(() => summariseWikidataBearers("ZAREMBA", one, elsewhere)).toThrow(/pl\.wikipedia/u);
  });
});

// ---------------------------------------------------------------------------

function fakeDeps(
  answers: { ok: boolean; status: number; body: string; retryAfter?: string }[],
): WikidataFetchDeps & { calls: { url: string; at: number; ua: string }[]; slept: number[] } {
  let clock = 0;
  const calls: { url: string; at: number; ua: string }[] = [];
  const slept: number[] = [];
  return {
    calls,
    slept,
    now: () => clock,
    sleep: (ms) => {
      slept.push(ms);
      clock += ms;
      return Promise.resolve();
    },
    fetch: (url, init) => {
      calls.push({ url, at: clock, ua: init.headers["User-Agent"] ?? "" });
      const a = answers.shift();
      if (a === undefined) return Promise.reject(new Error("no answer left"));
      clock += 100;
      return Promise.resolve({
        ok: a.ok,
        status: a.status,
        headers: {
          get: (name: string) => (name === "retry-after" ? (a.retryAfter ?? null) : null),
        },
        text: () => Promise.resolve(a.body),
      });
    },
  };
}

describe("the fetcher", () => {
  it("asks twice, a second apart, naming Name Atlas", async () => {
    const deps = fakeDeps([
      { ok: true, status: 200, body: response("ZAREMBA", "bearers") },
      { ok: true, status: 200, body: response("ZAREMBA", "details") },
    ]);
    const fetched = await fetchWikidataBearers("ZAREMBA", new WikidataPacer(deps), deps);
    expect(fetched.bearers.total).toBe(59);
    expect(deps.calls).toHaveLength(2);
    expect(deps.calls[1]!.at - deps.calls[0]!.at).toBeGreaterThanOrEqual(WIKIDATA_MIN_INTERVAL_MS);
    expect(deps.calls.every((c) => c.ua === WIKIDATA_USER_AGENT)).toBe(true);
    expect(deps.calls[0]!.url).toMatch(/^https:\/\/query\.wikidata\.org\/sparql\?query=/u);
    expect(Object.keys(fetched.response_sha256)).toEqual(["bearers", "details"]);
  });

  it("asks once when nobody is named exactly the surname", async () => {
    const empty = JSON.stringify({ results: { bindings: [] } });
    const deps = fakeDeps([{ ok: true, status: 200, body: empty }]);
    const fetched = await fetchWikidataBearers("XYZZY", new WikidataPacer(deps), deps);
    expect(fetched.bearers).toMatchObject({ total: 0, with_death_date: 0, bearers: [] });
    expect(deps.calls).toHaveLength(1);
  });

  it("waits as long as the service asks after a 429, then succeeds", async () => {
    const empty = JSON.stringify({ results: { bindings: [] } });
    const deps = fakeDeps([
      { ok: false, status: 429, body: "slow down", retryAfter: "30" },
      { ok: true, status: 200, body: empty },
    ]);
    await fetchWikidataBearers("XYZZY", new WikidataPacer(deps), deps);
    expect(deps.slept).toContain(30_000);
  });

  it("gives up after three tries, and returns nothing half-read", async () => {
    const deps = fakeDeps([
      { ok: false, status: 500, body: "" },
      { ok: false, status: 500, body: "" },
      { ok: false, status: 500, body: "" },
    ]);
    await expect(
      fetchWikidataBearers("ZAREMBA", new WikidataPacer(deps), deps),
    ).rejects.toBeInstanceOf(WikidataRequestError);
    expect(deps.calls).toHaveLength(3);
  });
});
