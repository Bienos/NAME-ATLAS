import type { SurnameResultResponse } from "@name-atlas/contracts";
import { apiErrorResponseSchema, surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * The family surnames view's state (TASK-040), with no React, no `fetch` and no
 * browser API, so every rule here runs in `apps/web`'s `node` test environment.
 *
 * The page is a composition of ordinary single-surname lookups. The combination
 * "these surnames + these labels + this visitor" is private family data
 * (`docs/canonical/19` §4), and it is kept out of every request by
 * construction: a lookup is built from one surname string and nothing else, so
 * a label has no path into a URL, header or body.
 */

/** U-3: four inputs, enough for the four grandparents' birth surnames. There is no fifth. */
export const SLOTS = ["surname-1", "surname-2", "surname-3", "surname-4"] as const;
export type SlotId = (typeof SLOTS)[number];

/** U-4: exactly four fixed labels, optional, and never free text. */
export const LABELS = ["SELF", "FATHER", "MOTHER", "OTHER"] as const;
export type Label = (typeof LABELS)[number];

export interface Entry {
  readonly slot: SlotId;
  /** As typed. Never trimmed, case-folded or normalised here. */
  readonly surname: string;
  readonly label: Label | null;
}

export function emptyEntries(): Entry[] {
  return SLOTS.map((slot) => ({ slot, surname: "", label: null }));
}

export function withSurname(entries: readonly Entry[], slot: SlotId, surname: string): Entry[] {
  return entries.map((entry) => (entry.slot === slot ? { ...entry, surname } : entry));
}

export function withLabel(entries: readonly Entry[], slot: SlotId, label: Label | null): Entry[] {
  return entries.map((entry) => (entry.slot === slot ? { ...entry, label } : entry));
}

/** A `<select>` value as a label, or none. Anything outside the fixed four is none. */
export function parseLabel(value: string): Label | null {
  return (LABELS as readonly string[]).includes(value) ? (value as Label) : null;
}

/**
 * The inputs that cause a request, in input order.
 *
 * An empty or whitespace-only input sends nothing and gets no card (AC-01).
 * The trim decides only that; the surname sent is the text as typed, so a
 * compound such as `Kowalska-Nowak` is one lookup, never split (AC-12).
 */
export function lookupsOf(entries: readonly Entry[]): Entry[] {
  return entries.slice(0, SLOTS.length).filter((entry) => entry.surname.trim() !== "");
}

export const SURNAME_RESULTS_PATH = "/api/v1/surname-results";

/**
 * The one request a lookup makes: `surname` and no other parameter (AC-02).
 * Nobody else calls this endpoint with `surface`, so neither does this page, and
 * the request is the same as any other client's (AC-04).
 */
export function requestPath(surname: string): string {
  return `${SURNAME_RESULTS_PATH}?surname=${encodeURIComponent(surname)}`;
}

/** One card's state. It maps one-to-one onto the endpoint's answers (§10). */
export type CardState =
  | { readonly kind: "LOADING" }
  | { readonly kind: "RESULT"; readonly response: SurnameResultResponse }
  | { readonly kind: "INVALID" }
  | { readonly kind: "RATE_LIMITED" }
  | { readonly kind: "ERROR"; readonly retryable: boolean };

export const LOADING: CardState = { kind: "LOADING" };

/**
 * What the endpoint answered, as a card state.
 *
 * A 200 whose body fails its own contract is an error with no figures, as on
 * the search page: a payload that violates the contract is a bug and must not
 * reach a reader. A 429 comes from the middleware as plain text, so it is
 * recognised by status alone. A server error is never shown as an unknown
 * surname.
 */
export function stateOf(status: number, body: unknown): CardState {
  if (status === 200) {
    const parsed = surnameResultResponseSchema.safeParse(body);
    return parsed.success
      ? { kind: "RESULT", response: parsed.data }
      : { kind: "ERROR", retryable: false };
  }
  if (status === 429) return { kind: "RATE_LIMITED" };
  if (status === 400) return { kind: "INVALID" };
  const envelope = apiErrorResponseSchema.safeParse(body);
  return {
    kind: "ERROR",
    retryable: envelope.success ? envelope.data.error.retryable : status >= 500,
  };
}

/** The public identity the endpoint returned, when it returned one. */
export function identityOf(state: CardState): string | null {
  if (state.kind !== "RESULT") return null;
  const { response } = state;
  return response.status === "RESOLVED" && response.surname !== null ? response.surname.id : null;
}

export interface Card {
  /** The first input's slot. Stable while the card's state changes. */
  readonly key: SlotId;
  /** Every input shown on this card, in input order. */
  readonly entries: readonly Entry[];
  readonly state: CardState;
}

/**
 * One card per distinct surname, in input order and never sorted (AC-10).
 *
 * Two inputs share a card **only** when the endpoint returned the same public
 * identity for both (AC-07). The client never case-folds, normalises or strips
 * diacritics to decide that (`ARCHITECTURE.md` §10 invariant 8): `NOWAK` and
 * `Nowak` are two lookups, and whether they are one surname is the endpoint's
 * answer. An input with no identity — unresolved, ambiguous, failed or still
 * loading — always has a card of its own.
 */
export function cardsOf(lookups: readonly Entry[], states: ReadonlyMap<SlotId, CardState>): Card[] {
  const cards: { key: SlotId; entries: Entry[]; state: CardState }[] = [];
  const byIdentity = new Map<string, number>();
  for (const entry of lookups) {
    const state = states.get(entry.slot) ?? LOADING;
    const identity = identityOf(state);
    const existing = identity === null ? undefined : byIdentity.get(identity);
    if (existing !== undefined) {
      cards[existing]?.entries.push(entry);
      continue;
    }
    if (identity !== null) byIdentity.set(identity, cards.length);
    cards.push({ key: entry.slot, entries: [entry], state });
  }
  return cards;
}
