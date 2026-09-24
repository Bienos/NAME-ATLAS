/**
 * The browser side of a surname search.
 *
 * docs/canonical/16 §9: the backend is authoritative for normalisation,
 * script detection and resolution; the frontend may only make basic UX
 * checks — empty, and an obvious maximum length — and must still send the
 * raw user string. So nothing here trims, cases, folds or normalises what
 * the user typed.
 */

/**
 * Mirrors `DEFAULT_MAX_INPUT_CODE_POINTS` in `@name-atlas/resolver` (a unit
 * test holds the two equal). Duplicated rather than imported because the
 * resolver's entry point also carries its database lookup, which must not
 * reach the browser bundle.
 */
export const MAX_SURNAME_CODE_POINTS = 256;

/** Where a search lands. The results page reads the raw value back from `name`. */
export const RESULTS_PATH = "/en/surname";
export const NAME_PARAM = "name";

export type SearchInputCheck = "OK" | "EMPTY" | "TOO_LONG" | "UNREADABLE";

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;

export function checkSearchInput(raw: string): SearchInputCheck {
  if (raw.trim() === "") {
    return "EMPTY";
  }
  if (Array.from(raw).length > MAX_SURNAME_CODE_POINTS) {
    return "TOO_LONG";
  }
  // A lone surrogate cannot be encoded into a URL at all.
  if (LONE_SURROGATE.test(raw)) {
    return "UNREADABLE";
  }
  return "OK";
}

/** The results URL for exactly what was typed. */
export function surnameHref(raw: string): string {
  return `${RESULTS_PATH}?${NAME_PARAM}=${encodeURIComponent(raw)}`;
}

/** The raw surname from the results page's search params, untouched. */
export function readNameParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}
