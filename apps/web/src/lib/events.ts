/**
 * The product-event vocabulary (TASK-024).
 *
 * In `lib/` rather than in the route, because a Next route module may export
 * only its handlers and a fixed set of config keys — exporting the allow-list
 * from there fails the build's type check. (The admin app hit the same rule with
 * `inspectorEnabled` in TASK-018.)
 *
 * The list **is** the privacy mechanism. There is no field for a surname, a
 * query, a session or a family detail, so none can reach a log through the
 * events route (`docs/canonical/19` §85; directive §55).
 */
export const PRODUCT_EVENTS = [
  "share_started",
  "share_completed",
  "share_cancelled",
  "copy_link_success",
  "copy_link_denied",
  "evidence_opened",
  "comparison_started",
] as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

export function isProductEvent(value: unknown): value is ProductEvent {
  return typeof value === "string" && (PRODUCT_EVENTS as readonly string[]).includes(value);
}

/**
 * Whether a parsed body is exactly `{ event: <allow-listed name> }`.
 *
 * Returns the event or a refusal reason; the caller logs neither the body nor
 * any of its field names beyond how many there were.
 */
export function readEventBody(
  body: unknown,
):
  | { readonly ok: true; readonly event: ProductEvent }
  | { readonly ok: false; readonly fields: number } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, fields: 0 };
  }
  const keys = Object.keys(body);
  const event = (body as Record<string, unknown>)["event"];
  if (keys.length !== 1 || keys[0] !== "event" || !isProductEvent(event)) {
    return { ok: false, fields: keys.length };
  }
  return { ok: true, event };
}
