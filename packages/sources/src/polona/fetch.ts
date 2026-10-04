import { createHash } from "node:crypto";
import { polonaInventoryRequests, summarisePolonaInventory } from "./inventory.js";
import type { PolonaInventory } from "./inventory.js";

/**
 * The Polona connector's network half (TASK-054, ADR-0024 §2.2; its interval is ADR-0036's).
 *
 * Polite by construction: one request at a time, at least
 * {@link POLONA_MIN_INTERVAL_MS} between the start of one and the next, a
 * timeout on each, a user agent that names Name Atlas and where to reach it,
 * and a growing pause after a failure. `fetch` and the clock are injected so
 * the loop is tested without a network.
 */

export const POLONA_MIN_INTERVAL_MS = 250;
export const POLONA_TIMEOUT_MS = 30_000;
export const POLONA_ATTEMPTS = 3;
export const POLONA_USER_AGENT =
  "NameAtlas/1.0 (surname research; +https://name-atlas-two.vercel.app/pl/kontakt)";

export interface PolonaFetchDeps {
  readonly fetch: (
    url: string,
    init: {
      method: "POST";
      headers: Record<string, string>;
      body: string;
      signal: AbortSignal;
    },
  ) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>;
  readonly sleep: (ms: number) => Promise<void>;
  readonly now: () => number;
}

export const defaultPolonaFetchDeps: PolonaFetchDeps = {
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

export class PolonaRequestError extends Error {
  constructor(
    readonly requestName: string,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "PolonaRequestError";
  }
}

/** Paces requests across calls: the gap is kept from one surname to the next too. */
export class PolonaPacer {
  private last = Number.NEGATIVE_INFINITY;
  constructor(
    private readonly deps: Pick<PolonaFetchDeps, "sleep" | "now">,
    private readonly intervalMs = POLONA_MIN_INTERVAL_MS,
  ) {}

  async wait(): Promise<void> {
    const due = this.last + this.intervalMs;
    const now = this.deps.now();
    if (now < due) await this.deps.sleep(due - now);
    this.last = this.deps.now();
  }
}

export interface FetchedPolonaInventory {
  readonly inventory: PolonaInventory;
  /** When the first request was sent (ISO 8601). */
  readonly retrieved_at: string;
  /** sha256 of each response body, by request name: what was read, without keeping it twice. */
  readonly response_sha256: Readonly<Record<string, string>>;
}

/**
 * Asks Polona for one surname's inventory and summarises it.
 *
 * Throws {@link PolonaRequestError} when a request still fails after
 * {@link POLONA_ATTEMPTS} tries, and `PolonaShapeError` when a response does
 * not parse. Either way nothing is returned, so nothing half-read is stored.
 */
export async function fetchPolonaInventory(
  surname: string,
  pacer: PolonaPacer,
  deps: PolonaFetchDeps = defaultPolonaFetchDeps,
): Promise<FetchedPolonaInventory> {
  const responses: Record<string, string> = {};
  const hashes: Record<string, string> = {};
  let startedAt: number | null = null;
  for (const request of polonaInventoryRequests(surname)) {
    let lastError: PolonaRequestError | null = null;
    for (let attempt = 1; attempt <= POLONA_ATTEMPTS; attempt++) {
      await pacer.wait();
      startedAt ??= deps.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), POLONA_TIMEOUT_MS);
      try {
        const response = await deps.fetch(request.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": POLONA_USER_AGENT,
          },
          body: request.body,
          signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
          lastError = new PolonaRequestError(
            request.name,
            response.status,
            `${request.name}: HTTP ${String(response.status)}`,
          );
        } else {
          responses[request.name] = text;
          hashes[request.name] = createHash("sha256").update(text).digest("hex");
          lastError = null;
          break;
        }
      } catch (cause) {
        lastError = new PolonaRequestError(
          request.name,
          null,
          `${request.name}: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      } finally {
        clearTimeout(timer);
      }
      // Back off before the next try: 5 s, then 20 s.
      if (attempt < POLONA_ATTEMPTS) await deps.sleep(5000 * 4 ** (attempt - 1));
    }
    if (lastError !== null) throw lastError;
  }
  return {
    inventory: summarisePolonaInventory(surname, responses),
    retrieved_at: new Date(startedAt ?? deps.now()).toISOString(),
    response_sha256: hashes,
  };
}
