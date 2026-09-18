/**
 * UUIDv7 helper.
 *
 * UUIDv7 (RFC 9562) is the canonical primary-key format for Name Atlas from
 * the first migration (docs/canonical/23 §11, ARCHITECTURE.md §10 invariant
 * 12). Values are time-ordered: generating them in sequence yields
 * monotonically non-decreasing 128-bit values, which keeps primary-key
 * indexes append-mostly under write load — unlike random UUIDv4.
 *
 * This module has no domain knowledge. It knows nothing about a surname,
 * a claim or a source; it exists so no later task has to retrofit
 * identifiers.
 */
import { v7 as generateUuidV7 } from "uuid";

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Generates a new UUIDv7 string. */
export function uuidv7(): string {
  return generateUuidV7();
}

/**
 * Returns true if `value` is a syntactically valid UUIDv7 string: the
 * standard 8-4-4-4-12 hex layout with version nibble `7` and an RFC 4122
 * variant nibble (`8`, `9`, `a` or `b`).
 */
export function isUuidV7(value: string): boolean {
  return UUID_V7_PATTERN.test(value);
}
