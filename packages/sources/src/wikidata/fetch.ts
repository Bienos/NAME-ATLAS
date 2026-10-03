import { createHash } from "node:crypto";
import {
  WIKIDATA_SPARQL_ENDPOINT,
  keptBearers,
  exactBearers,
  summariseWikidataBearers,
  wikidataBearersQuery,
  wikidataDetailsQuery,
  wikidataFamilyNameLabels,
} from "./bearers.js";
import type { WikidataBearers } from "./bearers.js";

/**
 * The Wikidata connector's network half (TASK-073, ADR-0030 §2.2).
 *
 * The Wikidata Query Service's rules (one query at a time, a user agent that
 * names the client and how to reach it) and the same politeness as Polona's:
 * at least {@link WIKIDATA_MIN_INTERVAL_MS} between queries, a timeout on
 * each, three tries with a growing pause, longer when the service says how
 * long to wait. `fetch` and the clock are injected so it is tested without a
 * network.
 */

export const WIKIDATA_MIN_INTERVAL_MS = 1000;
export const WIKIDATA_TIMEOUT_MS = 60_000;
export const WIKIDATA_ATTEMPTS = 3;
export const WIKIDATA_USER_AGENT =
  "NameAtlas/1.0 (surname research; +https://name-atlas.pl/pl/kontakt)";

export interface WikidataFetchDeps {
  readonly fetch: (
    url: string,
    init: { method: "GET"; headers: Record<string, string>; signal: AbortSignal },
  ) => Promise<{
    readonly ok: boolean;
    readonly status: number;
    readonly headers: { get(name: string): string | null };
    text(): Promise<string>;
  }>;
  readonly sleep: (ms: number) => Promise<void>;
  readonly now: () => number;
}

export const defaultWikidataFetchDeps: WikidataFetchDeps = {
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

export class WikidataRequestError extends Error {
  constructor(
    readonly requestName: string,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "WikidataRequestError";
  }
}

/** Paces queries across calls: the gap is kept from one surname to the next too. */
export class WikidataPacer {
  private last = Number.NEGATIVE_INFINITY;
  constructor(
    private readonly deps: Pick<WikidataFetchDeps, "sleep" | "now">,
    private readonly intervalMs = WIKIDATA_MIN_INTERVAL_MS,
  ) {}

  async wait(): Promise<void> {
    const due = this.last + this.intervalMs;
    const now = this.deps.now();
    if (now < due) await this.deps.sleep(due - now);
    this.last = this.deps.now();
  }
}

export interface FetchedWikidataBearers {
  readonly bearers: WikidataBearers;
  /** When the first query was sent (ISO 8601). */
  readonly retrieved_at: string;
  /** sha256 of each response body, by query name. */
  readonly response_sha256: Readonly<Record<string, string>>;
}

/** The query's address: the endpoint with the query in its parameters. */
export function wikidataQueryUrl(query: string): string {
  return `${WIKIDATA_SPARQL_ENDPOINT}?${new URLSearchParams({ query, format: "json" }).toString()}`;
}

/** Seconds from a `Retry-After` header, capped at five minutes; null when absent or a date. */
function retryAfterMs(value: string | null): number | null {
  if (value === null || !/^\d+$/u.test(value.trim())) return null;
  return Math.min(Number(value) * 1000, 300_000);
}

async function ask(
  name: string,
  query: string,
  pacer: WikidataPacer,
  deps: WikidataFetchDeps,
): Promise<string> {
  let lastError: WikidataRequestError | null = null;
  for (let attempt = 1; attempt <= WIKIDATA_ATTEMPTS; attempt++) {
    await pacer.wait();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WIKIDATA_TIMEOUT_MS);
    let wait: number | null = null;
    try {
      const response = await deps.fetch(wikidataQueryUrl(query), {
        method: "GET",
        headers: { Accept: "application/sparql-results+json", "User-Agent": WIKIDATA_USER_AGENT },
        signal: controller.signal,
      });
      const body = await response.text();
      if (response.ok) return body;
      lastError = new WikidataRequestError(
        name,
        response.status,
        `${name}: HTTP ${String(response.status)}`,
      );
      wait = retryAfterMs(response.headers.get("retry-after"));
    } catch (cause) {
      lastError = new WikidataRequestError(
        name,
        null,
        `${name}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    } finally {
      clearTimeout(timer);
    }
    // Back off before the next try: 5 s, then 20 s, or as long as the service asked.
    if (attempt < WIKIDATA_ATTEMPTS) await deps.sleep(wait ?? 5000 * 4 ** (attempt - 1));
  }
  throw lastError ?? new WikidataRequestError(name, null, `${name}: no attempt made`);
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Asks Wikidata for one surname's bearers and summarises them: one query for
 * who they are, and a second for the descriptions and articles of those kept.
 *
 * Throws {@link WikidataRequestError} when a query still fails after
 * {@link WIKIDATA_ATTEMPTS} tries, and `WikidataShapeError` when an answer
 * does not parse. Either way nothing is returned, so nothing half-read is
 * stored.
 */
export async function fetchWikidataBearers(
  surname: string,
  pacer: WikidataPacer,
  deps: WikidataFetchDeps = defaultWikidataFetchDeps,
): Promise<FetchedWikidataBearers> {
  const startedAt = deps.now();
  const bearers = await ask(
    "bearers",
    wikidataBearersQuery(wikidataFamilyNameLabels(surname)),
    pacer,
    deps,
  );
  const hashes: Record<string, string> = { bearers: sha256(bearers) };
  const kept = keptBearers(exactBearers(surname, bearers));
  let details: string | null = null;
  if (kept.length > 0) {
    details = await ask("details", wikidataDetailsQuery(kept.map((c) => c.qid)), pacer, deps);
    hashes.details = sha256(details);
  }
  return {
    bearers: summariseWikidataBearers(surname, bearers, details),
    retrieved_at: new Date(startedAt).toISOString(),
    response_sha256: hashes,
  };
}
