/**
 * The drift categories the Polona parser can report (TASK-031 §4 item 10).
 *
 * Each is a way a live response can stop matching the shapes captured in
 * `fixtures/polona/`. None of them is ever repaired: the parser refuses, and
 * the caller learns which category and where.
 */
export type PolonaDriftReason =
  | "invalid_json"
  | "invalid_xml"
  | "missing_field"
  | "unexpected_field"
  | "unexpected_element"
  | "wrong_type"
  | "unexpected_value"
  | "unknown_licence"
  | "unknown_rights_statement"
  | "inconsistent_rights"
  | "hit_count_mismatch";

/**
 * Thrown by every fail-closed check in `packages/sources/src/polona/`.
 *
 * `path` locates the offending value (`$.hits[3].attributes.licenseName` for
 * JSON, `alto/Layout/Page/…` for ALTO), so a report names exactly what
 * changed without anyone having to diff a response by hand.
 */
export class PolonaShapeError extends Error {
  readonly reasonCode: PolonaDriftReason;
  readonly path: string;

  constructor(reasonCode: PolonaDriftReason, path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "PolonaShapeError";
    this.reasonCode = reasonCode;
    this.path = path;
  }
}
