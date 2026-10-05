import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  WikidataShapeError,
  batchBearers,
  exactBearers,
  summariseWikidataBearers,
  wikidataBearersBatchQuery,
  wikidataBearersQuery,
} from "./bearers.js";
import {
  WIKIDATA_DETAILS_PER_QUERY,
  WIKIDATA_MIN_INTERVAL_MS,
  WIKIDATA_USER_AGENT,
  WikidataPacer,
  WikidataRequestError,
  fetchWikidataBearersBatch,
} from "./fetch.js";
import type { WikidataBatchOutcome, WikidataFetchDeps } from "./fetch.js";

/**
 * TASK-140 (ADR-0044): famous bearers asked for in batches. The batch answers
 * are made from the real ZAREMBA and KOWALSKA answers of 2026-10-03
 * (`fixtures/wikidata-bearers/`), each row tagged with the label it was found
 * under, as the batch query returns it; the rest is SYNTHETIC. No test
 * reaches the network.
 */

const DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../fixtures/wikidata-bearers/responses",
);
const read = (file: string): string => readFileSync(path.join(DIR, file), "utf8");
const ZAREMBA = read("ZAREMBA.bearers.json");
const KOWALSKA = read("KOWALSKA.bearers.json");
const DETAILS = [read("ZAREMBA.details.json"), read("KOWALSKA.details.json")];

type Row = Record<string, { value: string } | undefined>;
const rowsOf = (body: string): Row[] =>
  (JSON.parse(body) as { results: { bindings: Row[] } }).results.bindings;
const answer = (rows: readonly Row[]): string => JSON.stringify({ results: { bindings: rows } });
const tagged = (body: string, key: string): Row[] =>
  rowsOf(body).map((r) => ({ ...r, key: { value: key } }));

/**
 * The batch answer for ZAREMBA, KOWALSKA and KOWALSKI. KOWALSKA's single query
 * asked for both labels and does not say which found whom; here every one of
 * its people is found under "Kowalski", and the first five under "Kowalska" too.
 */
const BATCH_ROWS: Row[] = [
  ...tagged(ZAREMBA, "Zaremba"),
  ...tagged(KOWALSKA, "Kowalski"),
  ...tagged(KOWALSKA, "Kowalska").slice(0, 5),
];
const MERGED_DETAILS = answer(DETAILS.flatMap(rowsOf));

describe("the batch query", () => {
  it("is the surname's own query, grouped by the label each person was found under", () => {
    const q = wikidataBearersBatchQuery(["Zaremba", "Kowalska", "Kowalski", "Kowalski"]);
    expect(q).toContain("SELECT ?person ?key ");
    expect(q).toContain("BIND(STR(?label) AS ?key)");
    expect(q).toMatch(/\} GROUP BY \?person \?key$/u);
    // Each label once, however many surnames share it.
    expect(q.match(/"Kowalski"@pl/gu)).toHaveLength(1);
    // The one surname's query is unchanged.
    const single = wikidataBearersQuery(["Zaremba"]);
    expect(single).not.toContain("?key");
    expect(single).toMatch(/\} GROUP BY \?person$/u);
  });
});

describe("a batch answer", () => {
  it("gives each surname exactly the people its own query gives", () => {
    const [zaremba, kowalska, kowalski, nobody] = batchBearers(
      ["ZAREMBA", "KOWALSKA", "KOWALSKI", "XYZZY"],
      answer(BATCH_ROWS),
    );
    expect(zaremba).toEqual(exactBearers("ZAREMBA", ZAREMBA));
    expect(kowalska).toEqual(exactBearers("KOWALSKA", KOWALSKA));
    expect(kowalski).toEqual(exactBearers("KOWALSKI", KOWALSKA));
    expect(nobody).toEqual([]);
    expect((kowalska as readonly unknown[]).length).toBe(55);
  });

  it("fails only the surnames a row it cannot read belongs to", () => {
    const bad: Row = {
      person: { value: "http://www.wikidata.org/entity/Q1" },
      key: { value: "Zaremba" },
      label_pl: { value: "Jan Zaremba" },
      sitelinks: { value: "3" },
      polish: { value: "http://www.wikidata.org/entity/Q30" },
    };
    const [zaremba, kowalska] = batchBearers(["ZAREMBA", "KOWALSKA"], answer([...BATCH_ROWS, bad]));
    expect(zaremba).toBeInstanceOf(WikidataShapeError);
    expect(kowalska).toEqual(exactBearers("KOWALSKA", KOWALSKA));
  });

  it("is refused whole when it does not parse, or a row has no label", () => {
    expect(() => batchBearers(["ZAREMBA"], "<html>")).toThrow(WikidataShapeError);
    const [first] = rowsOf(ZAREMBA);
    expect(() => batchBearers(["ZAREMBA"], answer([first as Row]))).toThrow(/key/u);
  });
});

// ---------------------------------------------------------------------------

interface Call {
  readonly method: string;
  readonly url: string;
  readonly query: string;
  readonly at: number;
  readonly ua: string;
}

/** A query service that answers from the query's text, and a clock that moves on sleep. */
function service(
  reply: (kind: "people" | "details", query: string) => { status: number; body: string },
): WikidataFetchDeps & { calls: Call[] } {
  let clock = 0;
  const calls: Call[] = [];
  return {
    calls,
    now: () => clock,
    sleep: (ms) => {
      clock += ms;
      return Promise.resolve();
    },
    fetch: (url, init) => {
      const query =
        init.method === "POST"
          ? (new URLSearchParams(init.body ?? "").get("query") ?? "")
          : (new URL(url).searchParams.get("query") ?? "");
      calls.push({
        method: init.method,
        url,
        query,
        at: clock,
        ua: init.headers["User-Agent"] ?? "",
      });
      clock += 100;
      const r = reply(query.includes("schema:description") ? "details" : "people", query);
      return Promise.resolve({
        ok: r.status === 200,
        status: r.status,
        headers: { get: () => null },
        text: () => Promise.resolve(r.body),
      });
    },
  };
}

const EMPTY = answer([]);
const labelsAsked = (query: string): string[] =>
  [...query.matchAll(/"([^"]+)"@pl/gu)].map((m) => m[1] ?? "");
const fetchedOf = (o: WikidataBatchOutcome | undefined) => {
  if (o === undefined || !("fetched" in o)) throw new Error(`no answer: ${JSON.stringify(o)}`);
  return o.fetched;
};

describe("the batch fetcher", () => {
  it("asks once for the whole batch's people and once for their details, by POST, a second apart", async () => {
    const deps = service((kind) =>
      kind === "people"
        ? { status: 200, body: answer(BATCH_ROWS) }
        : { status: 200, body: MERGED_DETAILS },
    );
    const outcomes = await fetchWikidataBearersBatch(
      ["ZAREMBA", "KOWALSKA", "XYZZY"],
      new WikidataPacer(deps),
      deps,
    );
    expect(deps.calls).toHaveLength(2);
    expect(deps.calls.every((c) => c.method === "POST")).toBe(true);
    expect(deps.calls.every((c) => c.url === "https://query.wikidata.org/sparql")).toBe(true);
    expect(deps.calls.every((c) => c.ua === WIKIDATA_USER_AGENT)).toBe(true);
    expect(deps.calls[1]!.at - deps.calls[0]!.at).toBeGreaterThanOrEqual(WIKIDATA_MIN_INTERVAL_MS);

    expect(outcomes.map((o) => o.surname)).toEqual(["ZAREMBA", "KOWALSKA", "XYZZY"]);
    // The very summary each surname's own two queries give.
    expect(fetchedOf(outcomes[0]).bearers).toEqual(
      summariseWikidataBearers("ZAREMBA", ZAREMBA, DETAILS[0] ?? null),
    );
    expect(fetchedOf(outcomes[1]).bearers).toEqual(
      summariseWikidataBearers("KOWALSKA", KOWALSKA, DETAILS[1] ?? null),
    );
    expect(fetchedOf(outcomes[2]).bearers).toMatchObject({ total: 0, bearers: [] });
    expect(Object.keys(fetchedOf(outcomes[0]).response_sha256)).toEqual([
      "bearers_batch",
      "details_batch",
    ]);
    expect(Object.keys(fetchedOf(outcomes[2]).response_sha256)).toEqual(["bearers_batch"]);
  });

  it("splits a batch the service could not finish in time, down to one surname", async () => {
    const deps = service((_, query) =>
      labelsAsked(query).length > 1
        ? { status: 500, body: "java.util.concurrent.TimeoutException" }
        : { status: 200, body: EMPTY },
    );
    const surnames = ["ALFA", "BETA", "GAMMA", "DELTA"];
    const outcomes = await fetchWikidataBearersBatch(surnames, new WikidataPacer(deps), deps);
    expect(outcomes.map((o) => o.surname)).toEqual(surnames);
    expect(outcomes.every((o) => "fetched" in o && o.fetched.bearers.total === 0)).toBe(true);
    // 4 → 2 + 2 → 1 + 1 + 1 + 1: seven queries, none of them asked twice as it was.
    expect(deps.calls.map((c) => labelsAsked(c.query).length)).toEqual([4, 2, 1, 1, 2, 1, 1]);
    const gaps = deps.calls.slice(1).map((c, i) => c.at - (deps.calls[i]?.at ?? 0));
    expect(gaps.every((g) => g >= WIKIDATA_MIN_INTERVAL_MS)).toBe(true);
  });

  it("splits an answer cut off midway, and fails one surname whose answer is", async () => {
    const deps = service((_, query) =>
      labelsAsked(query).includes("Beta")
        ? { status: 200, body: '{"results":{"bindings":[{"person":' }
        : { status: 200, body: EMPTY },
    );
    const outcomes = await fetchWikidataBearersBatch(
      ["ALFA", "BETA"],
      new WikidataPacer(deps),
      deps,
    );
    expect("fetched" in outcomes[0]!).toBe(true);
    expect(outcomes[1]).toMatchObject({ surname: "BETA" });
    expect((outcomes[1] as { error: Error }).error).toBeInstanceOf(WikidataShapeError);
  });

  it("leaves every surname for the next run when the service keeps failing, without splitting", async () => {
    const deps = service(() => ({ status: 503, body: "" }));
    const outcomes = await fetchWikidataBearersBatch(
      ["ALFA", "BETA", "GAMMA"],
      new WikidataPacer(deps),
      deps,
    );
    expect(deps.calls).toHaveLength(3);
    expect(outcomes.every((o) => "error" in o && o.error instanceof WikidataRequestError)).toBe(
      true,
    );
  });

  it("asks for details in groups of whole surnames, never more than the cap", async () => {
    // Eleven surnames of twenty people each: 220 people, one surname over the cap.
    const names = Array.from({ length: 11 }, (_, i) => `NAZWISKO${"ABCDEFGHIJK"[i] ?? ""}`);
    const label = (surname: string): string => surname.charAt(0) + surname.slice(1).toLowerCase();
    const people: Row[] = names.flatMap((surname, s) =>
      Array.from({ length: 20 }, (_, p) => ({
        person: { value: `http://www.wikidata.org/entity/Q${String(1000 + s * 100 + p)}` },
        key: { value: label(surname) },
        label_pl: { value: `Jan ${label(surname)}` },
        sitelinks: { value: String(30 - p) },
      })),
    );
    const deps = service((kind, query) =>
      kind === "people"
        ? { status: 200, body: answer(people) }
        : {
            status: 200,
            body: answer(
              [...query.matchAll(/wd:(Q\d+)/gu)].map((m) => ({
                person: { value: `http://www.wikidata.org/entity/${m[1] ?? ""}` },
                description_pl: { value: "opis" },
              })),
            ),
          },
    );
    const outcomes = await fetchWikidataBearersBatch(names, new WikidataPacer(deps), deps);
    const asked = deps.calls
      .filter((c) => c.query.includes("schema:description"))
      .map((c) => [...c.query.matchAll(/wd:Q\d+/gu)].length);
    expect(asked).toEqual([200, 20]);
    expect(Math.max(...asked)).toBeLessThanOrEqual(WIKIDATA_DETAILS_PER_QUERY);
    expect(outcomes.every((o) => "fetched" in o && o.fetched.bearers.bearers.length === 20)).toBe(
      true,
    );
  });
});
