import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { outcomeOf } from "./family-surnames-state.js";
import type { Entry, Outcome } from "./family-surnames-state.js";

/**
 * The family surnames view's lookups (TASK-169 §5, §9).
 *
 * Each surname is one ordinary `GET /api/v1/surname-results?surname=…`, the
 * input exactly as typed, with no other parameter, no header, no body and no
 * request option. Nothing in it says which page sent it or which other
 * surnames were asked about, and a label never leaves the browser. There is no
 * batch request and no shared marker.
 *
 * `fetch` is passed in, so the requests can be watched in a test.
 */

export type Fetch = (url: string) => Promise<Response>;

/** The request for one surname: its only query parameter is `surname`. */
export function lookupUrl(surname: string): string {
  return `/api/v1/surname-results?surname=${encodeURIComponent(surname)}`;
}

function parse(body: unknown): SurnameResultResponse | null {
  const parsed = surnameResultResponseSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

/** One lookup. A network failure or an unreadable body is an error for this surname only. */
export async function lookup(fetchFn: Fetch, surname: string): Promise<Outcome> {
  try {
    const response = await fetchFn(lookupUrl(surname));
    const body: unknown = response.status === 200 ? await response.json() : null;
    return outcomeOf(response.status, body, parse);
  } catch {
    return { kind: "ERROR" };
  }
}

/**
 * One lookup per entry, each reported as soon as it lands: a slow or failing
 * surname never holds back another (§10).
 */
export function lookupEach(
  fetchFn: Fetch,
  entries: readonly Entry[],
  onOutcome: (index: number, outcome: Outcome) => void,
): Promise<void> {
  return Promise.all(
    entries.map(async (entry, index) => {
      onOutcome(index, await lookup(fetchFn, entry.surname));
    }),
  ).then(() => undefined);
}
