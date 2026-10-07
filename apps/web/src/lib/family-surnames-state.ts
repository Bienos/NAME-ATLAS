import type { SurnameResultResponse } from "@name-atlas/contracts";

/**
 * The family surnames view's state (TASK-169): the inputs, their labels, each
 * lookup's outcome, and the cards those outcomes make.
 *
 * Pure: no React, no `fetch`, no browser API. Everything here lives in the
 * visitor's browser memory only and is forgotten on refresh (TASK-169 §5).
 *
 * It computes **nothing across cards** (§7 AC-10): no sum, no combined rarity,
 * no ranking and no overlap. Cards come out in input order. Two inputs share a
 * card only when the endpoint returned the same surname identity for both
 * (AC-07); the client never case-folds, normalises or strips diacritics to
 * decide that (`ARCHITECTURE.md` §10 invariant 8).
 */

/** At most four surnames (TASK-169 §13 U-3). */
export const MAX_ENTRIES = 4;

/** The four fixed labels (U-4). Optional; there is no free-text label. */
export const LABELS = ["SELF", "FATHER", "MOTHER", "OTHER"] as const;
export type FamilyLabel = (typeof LABELS)[number];

export interface Entry {
  /** The input exactly as typed. Never trimmed, folded or split before it is sent. */
  readonly surname: string;
  readonly label: FamilyLabel | null;
}

export function initialEntries(): Entry[] {
  return [
    { surname: "", label: null },
    { surname: "", label: null },
  ];
}

/** One more empty input, unless there are already four. */
export function addEntry(entries: readonly Entry[]): Entry[] {
  if (entries.length >= MAX_ENTRIES) return [...entries];
  return [...entries, { surname: "", label: null }];
}

export function setSurname(entries: readonly Entry[], index: number, surname: string): Entry[] {
  return entries.map((e, i) => (i === index ? { ...e, surname } : e));
}

/** A label from the fixed set, or none. Anything else is ignored. */
export function setLabel(entries: readonly Entry[], index: number, value: string): Entry[] {
  const label = (LABELS as readonly string[]).includes(value) ? (value as FamilyLabel) : null;
  return entries.map((e, i) => (i === index ? { ...e, label } : e));
}

/** The inputs that cause a lookup: every non-blank one, as typed, at most four. */
export function submissions(entries: readonly Entry[]): Entry[] {
  return entries.slice(0, MAX_ENTRIES).filter((e) => e.surname.trim() !== "");
}

/**
 * One lookup's outcome, one-to-one with the contract's states (§10). A
 * `RESULT` carries the validated response, whatever its status: resolved,
 * ambiguous and unresolved are all 200 answers with an explicit status.
 */
export type Outcome =
  | { readonly kind: "LOADING" }
  | { readonly kind: "RESULT"; readonly response: SurnameResultResponse }
  | { readonly kind: "INVALID" }
  | { readonly kind: "RATE_LIMITED" }
  | { readonly kind: "ERROR" };

export interface Card {
  /** `id:{uuid}` for a resolved surname, else `input:{n}`: one card per identity or per input. */
  readonly key: string;
  /** Every input this card answers, in input order. */
  readonly entries: readonly Entry[];
  /** Positions in the submitted list, for a retry of this card only. */
  readonly indexes: readonly number[];
  readonly outcome: Outcome;
}

function identityOf(outcome: Outcome | undefined): string | null {
  if (outcome?.kind !== "RESULT") return null;
  const { response } = outcome;
  return response.status === "RESOLVED" && response.surname !== null ? response.surname.id : null;
}

/**
 * The cards for a submission. `outcomes[i]` belongs to `submitted[i]`.
 *
 * A card is placed where its first input is. Merging is by the returned
 * surname id and nothing else.
 */
export function cardsFor(
  submitted: readonly Entry[],
  outcomes: readonly (Outcome | undefined)[],
): Card[] {
  const cards: { key: string; entries: Entry[]; indexes: number[]; outcome: Outcome }[] = [];
  const byKey = new Map<string, (typeof cards)[number]>();
  submitted.forEach((entry, index) => {
    const outcome: Outcome = outcomes[index] ?? { kind: "LOADING" };
    const identity = identityOf(outcome);
    const key = identity === null ? `input:${String(index)}` : `id:${identity}`;
    const existing = byKey.get(key);
    if (existing !== undefined) {
      existing.entries.push(entry);
      existing.indexes.push(index);
      return;
    }
    const card = { key, entries: [entry], indexes: [index], outcome };
    byKey.set(key, card);
    cards.push(card);
  });
  return cards;
}

/**
 * The outcome an HTTP answer stands for. A 200 must pass the contract's own
 * schema, as on every page that renders it; one that does not is an error,
 * never "unknown surname".
 */
export function outcomeOf(
  status: number,
  body: unknown,
  parse: (body: unknown) => SurnameResultResponse | null,
): Outcome {
  if (status === 200) {
    const response = parse(body);
    return response === null ? { kind: "ERROR" } : { kind: "RESULT", response };
  }
  if (status === 400) return { kind: "INVALID" };
  if (status === 429) return { kind: "RATE_LIMITED" };
  return { kind: "ERROR" };
}
