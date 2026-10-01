import type { Intent } from "./messages.js";

/**
 * The deck's address (TASK-055, ADR-0025 §2.2): `?view=cards` opens the deck
 * over the surname page. It is never part of the canonical URL. Kept apart
 * from the faces so the search box can link with it and stay small.
 */
export const DECK_PARAM = "view";
export const DECK_VALUE = "cards";

/**
 * Where a search on the site sends a resolved surname: its own address, with
 * the intent when there is one, and the deck open.
 */
export function searchTarget(path: string, intent: Intent): string {
  const params = new URLSearchParams();
  if (intent !== "default") params.set("intent", intent);
  params.set(DECK_PARAM, DECK_VALUE);
  return `${path}?${params.toString()}`;
}

/** Whether a page request asked for the deck. */
export function deckRequested(value: string | string[] | undefined): boolean {
  return (Array.isArray(value) ? value[0] : value) === DECK_VALUE;
}
