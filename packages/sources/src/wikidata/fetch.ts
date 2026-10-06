import { createHash } from "node:crypto";
import {
  WIKIDATA_SPARQL_ENDPOINT,
  WikidataShapeError,
  batchBearers,
  keptBearers,
  exactBearers,
  summariseCandidates,
  summariseWikidataBearers,
  wikidataBearersBatchQuery,
  wikidataBearersQuery,
  wikidataDetailsById,
  wikidataDetailsQuery,
  wikidataFamilyNameLabels,
} from "./bearers.js";
import type { WikidataBearers, WikidataCandidate, WikidataDetails } from "./bearers.js";

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
    init: {
      method: "GET" | "POST";
      headers: Record<string, string>;
      body?: string;
      signal: AbortSignal;
    },
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
    /** A batch query that ran out of time: it is split, not asked again (ADR-0044). */
    readonly tooLarge = false,
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

/**
 * One query, paced, with up to {@link WIKIDATA_ATTEMPTS} tries. `POST` sends
 * the query in the body, for a batch too long for an address (ADR-0044); a
 * batch that runs out of time, on our clock or the service's, is not asked
 * again but thrown as `tooLarge`, for the caller to split.
 */
async function ask(
  name: string,
  query: string,
  pacer: WikidataPacer,
  deps: WikidataFetchDeps,
  method: "GET" | "POST" = "GET",
): Promise<string> {
  let lastError: WikidataRequestError | null = null;
  const headers = {
    Accept: "application/sparql-results+json",
    "User-Agent": WIKIDATA_USER_AGENT,
  };
  for (let attempt = 1; attempt <= WIKIDATA_ATTEMPTS; attempt++) {
    await pacer.wait();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WIKIDATA_TIMEOUT_MS);
    let wait: number | null = null;
    try {
      const response = await (method === "POST"
        ? deps.fetch(WIKIDATA_SPARQL_ENDPOINT, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ query, format: "json" }).toString(),
            signal: controller.signal,
          })
        : deps.fetch(wikidataQueryUrl(query), {
            method: "GET",
            headers,
            signal: controller.signal,
          }));
      const body = await response.text();
      if (response.ok) return body;
      if (method === "POST" && response.status === 500 && body.includes("TimeoutException")) {
        throw new WikidataRequestError(name, 500, `${name}: the service's time ran out`, true);
      }
      lastError = new WikidataRequestError(
        name,
        response.status,
        `${name}: HTTP ${String(response.status)}`,
      );
      wait = retryAfterMs(response.headers.get("retry-after"));
    } catch (cause) {
      if (cause instanceof WikidataRequestError) throw cause;
      if (method === "POST" && controller.signal.aborted) {
        throw new WikidataRequestError(
          name,
          null,
          `${name}: no answer in ${String(WIKIDATA_TIMEOUT_MS)} ms`,
          true,
        );
      }
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

/** How many people one details query asks about in a batch (ADR-0044). */
export const WIKIDATA_DETAILS_PER_QUERY = 200;

/** One surname's outcome in a batch: its bearers, or why it was left for the next run. */
export type WikidataBatchOutcome =
  | { readonly surname: string; readonly fetched: FetchedWikidataBearers }
  | { readonly surname: string; readonly error: WikidataRequestError | WikidataShapeError };

/**
 * Asks Wikidata for a batch of surnames' bearers at once (ADR-0044): one query
 * for the people of all of them, then details queries for the people the
 * surnames keep, at most {@link WIKIDATA_DETAILS_PER_QUERY} at a time and a
 * surname's people never split between two. Each surname's summary is the one
 * its own two queries give (`summariseCandidates`), so it is stored and
 * derived exactly as one surname's is.
 *
 * A batch whose first query runs out of time, or whose answer is cut off, is
 * split in two and each half asked again, down to one surname. Any other
 * failure leaves the surnames it touches for the next run, each with its own
 * error; one surname's unreadable row fails only that surname. Outcomes come
 * back in the order the surnames were given. Queries stay one at a time and
 * paced, as one surname's are.
 */
export async function fetchWikidataBearersBatch(
  surnames: readonly string[],
  pacer: WikidataPacer,
  deps: WikidataFetchDeps = defaultWikidataFetchDeps,
): Promise<readonly WikidataBatchOutcome[]> {
  const outcomes: WikidataBatchOutcome[] = [];
  await askBatch(surnames, pacer, deps, outcomes);
  return outcomes;
}

async function askBatch(
  surnames: readonly string[],
  pacer: WikidataPacer,
  deps: WikidataFetchDeps,
  outcomes: WikidataBatchOutcome[],
): Promise<void> {
  if (surnames.length === 0) return;
  const startedAt = deps.now();
  let body: string;
  let found: readonly (readonly WikidataCandidate[] | WikidataShapeError)[];
  try {
    body = await ask(
      "bearers",
      wikidataBearersBatchQuery(surnames.flatMap((s) => wikidataFamilyNameLabels(s))),
      pacer,
      deps,
      "POST",
    );
    found = batchBearers(surnames, body);
  } catch (error) {
    if (!(error instanceof WikidataRequestError) && !(error instanceof WikidataShapeError)) {
      throw error;
    }
    // Out of time, or an answer cut off mid-way (the service can stream a 200
    // and stop): half the batch is asked again, then the other half.
    const split =
      surnames.length > 1 && (error instanceof WikidataShapeError || error.tooLarge === true);
    if (split) {
      const half = Math.ceil(surnames.length / 2);
      await askBatch(surnames.slice(0, half), pacer, deps, outcomes);
      await askBatch(surnames.slice(half), pacer, deps, outcomes);
      return;
    }
    for (const surname of surnames) outcomes.push({ surname, error });
    return;
  }
  const bearersHash = sha256(body);

  // The details, in groups of whole surnames.
  const groups: { readonly at: number[]; readonly qids: string[] }[] = [];
  for (const [at, result] of found.entries()) {
    if (result instanceof WikidataShapeError) continue;
    const qids = keptBearers(result).map((c) => c.qid);
    if (qids.length === 0) continue;
    const last = groups.at(-1);
    if (last && last.qids.length + qids.length <= WIKIDATA_DETAILS_PER_QUERY) {
      last.at.push(at);
      last.qids.push(...qids);
    } else {
      groups.push({ at: [at], qids: [...qids] });
    }
  }
  const detailsOf = new Map<
    number,
    { details: WikidataDetails; hash: string } | WikidataRequestError | WikidataShapeError
  >();
  for (const group of groups) {
    let outcome:
      { details: WikidataDetails; hash: string } | WikidataRequestError | WikidataShapeError;
    try {
      const details = await ask("details", wikidataDetailsQuery(group.qids), pacer, deps, "POST");
      outcome = { details: wikidataDetailsById(details), hash: sha256(details) };
    } catch (error) {
      if (!(error instanceof WikidataRequestError) && !(error instanceof WikidataShapeError)) {
        throw error;
      }
      outcome = error;
    }
    for (const at of group.at) detailsOf.set(at, outcome);
  }

  const retrievedAt = new Date(startedAt).toISOString();
  for (const [at, surname] of surnames.entries()) {
    const result = found[at];
    if (result === undefined || result instanceof WikidataShapeError) {
      outcomes.push({
        surname,
        error: result ?? new WikidataShapeError("bearers", `no result for ${surname}`),
      });
      continue;
    }
    const details = detailsOf.get(at);
    if (details instanceof WikidataRequestError || details instanceof WikidataShapeError) {
      outcomes.push({ surname, error: details });
      continue;
    }
    try {
      outcomes.push({
        surname,
        fetched: {
          bearers: summariseCandidates(surname, result, details?.details ?? new Map()),
          retrieved_at: retrievedAt,
          response_sha256:
            details === undefined
              ? { bearers_batch: bearersHash }
              : { bearers_batch: bearersHash, details_batch: details.hash },
        },
      });
    } catch (error) {
      if (!(error instanceof WikidataShapeError)) throw error;
      outcomes.push({ surname, error });
    }
  }
}
