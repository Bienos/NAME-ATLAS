import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PolonaShapeError } from "./errors.js";
import {
  POLONA_EXCERPT_MAX_CHARS,
  POLONA_INVENTORY_REQUEST_COUNT,
  polonaExcerpt,
  polonaInventoryRequests,
  polonaQuery,
  summarisePolonaInventory,
} from "./inventory.js";
import {
  POLONA_MIN_INTERVAL_MS,
  POLONA_USER_AGENT,
  PolonaPacer,
  PolonaRequestError,
  fetchPolonaInventory,
} from "./fetch.js";
import type { PolonaFetchDeps } from "./fetch.js";

/**
 * TASK-054: one surname's Polona inventory. The responses are real bytes the
 * loader's fetcher captured for ZAREMBA on 2026-10-01, pinned by
 * `fixtures/polona-inventory/source-manifest.json`. No test reaches the network.
 */

const DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../fixtures/polona-inventory",
);
const manifest = JSON.parse(readFileSync(path.join(DIR, "source-manifest.json"), "utf8")) as {
  files: { request: string; path: string; sha256: string }[];
};
const responses: Record<string, string> = Object.fromEntries(
  manifest.files.map((f) => [f.request, readFileSync(path.join(DIR, f.path), "utf8")]),
);

describe("the captured responses", () => {
  it.each(manifest.files.map((f) => [f.path, f] as const))("%s keeps its pinned digest", (_, f) => {
    const bytes = readFileSync(path.join(DIR, f.path));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(f.sha256);
  });

  it("answer every request an inventory sends", () => {
    expect(Object.keys(responses).sort()).toEqual(
      polonaInventoryRequests("ZAREMBA")
        .map((r) => r.name)
        .sort(),
    );
  });
});

describe("the requests", () => {
  it("are a catalogue search, a page search and one count per period", () => {
    const requests = polonaInventoryRequests("ZAREMBA");
    expect(requests).toHaveLength(POLONA_INVENTORY_REQUEST_COUNT);
    expect(requests.map((r) => r.name)).toEqual([
      "catalogue",
      "pages",
      "period:-1799",
      "period:1800-1849",
      "period:1850-1899",
      "period:1900-1918",
      "period:1919-1939",
      "period:1940-",
    ]);
    // Only works that are not copyright-protected are searched for pages.
    for (const r of requests.slice(1)) {
      expect(JSON.parse(r.body).filters.keywordFilters).toEqual({ copyright: ["false"] });
    }
    expect(JSON.parse(requests[3]!.body).filters.temporalFilters).toEqual({
      dates: { startRange: "1800-01-01", endRange: "1849-12-31" },
    });
  });

  it("quote the surname, so a hyphen is part of it, not an operator", () => {
    expect(polonaQuery("KOWALSKA-NOWAK")).toBe('"KOWALSKA-NOWAK"');
    expect(polonaInventoryRequests("KOWALSKA-NOWAK")[0]!.url).toContain(
      `query=${encodeURIComponent('"KOWALSKA-NOWAK"')}`,
    );
    expect(polonaInventoryRequests("WIŚNIEWSKI")[1]!.url).toContain(
      encodeURIComponent('"WIŚNIEWSKI"'),
    );
  });
});

describe("the summary of ZAREMBA's responses", () => {
  const inventory = summarisePolonaInventory("ZAREMBA", responses);

  it("carries the totals Polona served", () => {
    expect(inventory.query).toBe('"ZAREMBA"');
    expect(inventory.catalogue_records).toBe(1148);
    expect(inventory.catalogue_public_domain).toBe(291);
    expect(inventory.pages).toBe(54479);
  });

  it("splits the pages by period, and counts what falls outside every period", () => {
    expect(inventory.pages_by_period.map((p) => p.count)).toEqual([
      121, 2814, 13843, 9484, 20256, 7868,
    ]);
    const inPeriods = inventory.pages_by_period.reduce((sum, p) => sum + p.count, 0);
    expect(inventory.pages_outside_periods).toBe(inventory.pages - inPeriods);
  });

  it("keeps the largest places and categories first, at most eight", () => {
    expect(inventory.pages_by_place[0]).toEqual({ label: "Warszawa", count: 25755 });
    expect(inventory.pages_by_place.length).toBeLessThanOrEqual(8);
    expect(inventory.catalogue_by_category[0]).toEqual({ label: "Czasopisma", count: 193 });
  });

  it("quotes only public-domain pages, older works first, and links to the right scan", () => {
    expect(inventory.examples.length).toBeGreaterThan(0);
    expect(inventory.examples.length).toBeLessThanOrEqual(3);
    for (const e of inventory.examples) {
      expect(e.excerpt.length).toBeLessThanOrEqual(POLONA_EXCERPT_MAX_CHARS);
      expect(e.excerpt).not.toMatch(/<[^>]+>/u);
      // The viewer counts scans from zero, the search from one.
      expect(e.url).toBe(
        `https://polona.pl/item-view/${e.object_id}?page=${String(e.page_number - 1)}`,
      );
    }
    expect(inventory.examples[0]!.date).toBe("1882-01-01");
    expect(inventory.examples[0]!.excerpt).toContain("Zaremba");
    expect(inventory.examples_withheld).toBe(2);
  });

  it("refuses a response whose envelope does not parse", () => {
    expect(() => summarisePolonaInventory("ZAREMBA", { ...responses, pages: "{}" })).toThrow(
      PolonaShapeError,
    );
    const { catalogue: _dropped, ...withoutCatalogue } = responses;
    expect(() => summarisePolonaInventory("ZAREMBA", withoutCatalogue)).toThrow(PolonaShapeError);
  });
});

describe("an excerpt", () => {
  it("drops the highlight tags and collapses whitespace", () => {
    expect(polonaExcerpt("Zaremba <em>Jan</em>\n  Ks.")).toBe("Zaremba Jan Ks.");
  });

  it("is cut at a word, with an ellipsis, when it is too long", () => {
    const long = `${"słowo ".repeat(80)}koniec`;
    const cut = polonaExcerpt(long);
    expect(cut.length).toBeLessThanOrEqual(POLONA_EXCERPT_MAX_CHARS);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut).not.toContain("koniec");
  });
});

/** A clock that only moves when the code sleeps, and a network that answers from the fixtures. */
function fakeDeps(
  answers: (url: string, body: string) => { ok: boolean; status: number; text: string },
) {
  let clock = 0;
  const sleeps: number[] = [];
  const calls: { url: string; userAgent: string; at: number }[] = [];
  const deps: PolonaFetchDeps = {
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    fetch: async (url, init) => {
      calls.push({ url, userAgent: init.headers["User-Agent"] ?? "", at: clock });
      clock += 200;
      const a = answers(url, init.body);
      return { ok: a.ok, status: a.status, text: async () => a.text };
    },
  };
  return { deps, sleeps, calls };
}

function fixtureFor(url: string, body: string): string {
  const request = polonaInventoryRequests("ZAREMBA").find((r) => r.url === url && r.body === body);
  if (request === undefined) throw new Error(`unexpected request ${url}`);
  return responses[request.name]!;
}

describe("the fetcher", () => {
  it("sends one request at a time, at least POLONA_MIN_INTERVAL_MS apart, naming Name Atlas", async () => {
    const { deps, calls } = fakeDeps((url, body) => ({
      ok: true,
      status: 200,
      text: fixtureFor(url, body),
    }));
    const fetched = await fetchPolonaInventory("ZAREMBA", new PolonaPacer(deps), deps);
    expect(calls).toHaveLength(POLONA_INVENTORY_REQUEST_COUNT);
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i]!.at - calls[i - 1]!.at).toBeGreaterThanOrEqual(POLONA_MIN_INTERVAL_MS);
    }
    expect(new Set(calls.map((c) => c.userAgent))).toEqual(new Set([POLONA_USER_AGENT]));
    expect(fetched.inventory.pages).toBe(54479);
    expect(Object.keys(fetched.response_sha256)).toHaveLength(POLONA_INVENTORY_REQUEST_COUNT);
  });

  it("retries a failed request after a pause, and succeeds", async () => {
    let failures = 1;
    const { deps, sleeps } = fakeDeps((url, body) => {
      if (failures > 0) {
        failures -= 1;
        return { ok: false, status: 503, text: "" };
      }
      return { ok: true, status: 200, text: fixtureFor(url, body) };
    });
    const fetched = await fetchPolonaInventory("ZAREMBA", new PolonaPacer(deps), deps);
    expect(fetched.inventory.catalogue_records).toBe(1148);
    expect(sleeps).toContain(5000);
  });

  it("gives up after three tries, and returns nothing half-read", async () => {
    const { deps, calls } = fakeDeps(() => ({ ok: false, status: 500, text: "" }));
    await expect(fetchPolonaInventory("ZAREMBA", new PolonaPacer(deps), deps)).rejects.toThrow(
      PolonaRequestError,
    );
    expect(calls).toHaveLength(3);
  });
});
