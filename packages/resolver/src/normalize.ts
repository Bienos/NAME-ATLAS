/**
 * Unicode normalisation for surname identity (docs/canonical/13 §5–§6).
 *
 * Everything here is pure: no database, no I/O, no clock. The canonical
 * identity key is a deterministic function of the input string and the
 * version constants in `version.ts`.
 */

/**
 * Code points that Unicode default *full* case folding leaves alone but
 * that `toUpperCase()` would change, so folding them through the uppercase
 * round trip would merge two distinct letters.
 *
 * U+0131 LATIN SMALL LETTER DOTLESS I has only a Turkic-conditional (`T`)
 * entry in CaseFolding.txt, so under the default profile it folds to
 * itself. `"ı".toUpperCase()` is `"I"`, which would then lowercase to `"i"`
 * and silently merge Turkish `ı` with Latin `i`.
 */
const CASE_FOLD_EXCEPTIONS = new Map<string, string>([["\u0131", "\u0131"]]);

/**
 * Typographic dash variants mapped to ASCII `-` in the key only
 * (docs/canonical/13 §5.4). The display form keeps the original.
 */
const DASH_LIKE = new Set([
  "\u2010", // HYPHEN
  "\u2011", // NON-BREAKING HYPHEN
  "\u2012", // FIGURE DASH
  "\u2013", // EN DASH
  "\u2014", // EM DASH
  "\u2015", // HORIZONTAL BAR
  "\u2212", // MINUS SIGN
  "\ufe58", // SMALL EM DASH
  "\ufe63", // SMALL HYPHEN-MINUS
  "\uff0d", // FULLWIDTH HYPHEN-MINUS
]);

/**
 * Apostrophe variants mapped to ASCII `'` in the key only
 * (docs/canonical/13 §5.4). `O'X` must never become `OX`: the separator is
 * canonicalised, not deleted.
 */
const APOSTROPHE_LIKE = new Set([
  "\u2018", // LEFT SINGLE QUOTATION MARK
  "\u2019", // RIGHT SINGLE QUOTATION MARK
  "\u02bc", // MODIFIER LETTER APOSTROPHE
  "\u02b9", // MODIFIER LETTER PRIME
  "\u2032", // PRIME
  "\uff07", // FULLWIDTH APOSTROPHE
]);

/**
 * Unicode space separators (general category Zs), collapsed to an ordinary
 * space. Tab and newline are deliberately absent: they are control
 * characters (Cc) and validation rejects them as
 * `MALFORMED_CONTROL_CHARACTERS` (docs/canonical/13 §4.5) — normalisation
 * must not quietly launder what validation refuses.
 */
const SPACE_LIKE = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/gu;

/**
 * The explicit Polish fold table (docs/canonical/13 §6.1), verbatim.
 *
 * Deliberately a table, not "NFD then strip combining marks": `ł` is not a
 * decomposable base-letter-plus-mark sequence, so the generic approach is
 * not a complete Polish strategy (§6.2). Uppercase forms are handled by
 * applying this after case folding, exactly as §6.1 specifies.
 */
const POLISH_FOLD = new Map<string, string>([
  ["ą", "a"], // U+0105
  ["ć", "c"], // U+0107
  ["ę", "e"], // U+0119
  ["ł", "l"], // U+0142
  ["ń", "n"], // U+0144
  ["ó", "o"], // U+00F3
  ["ś", "s"], // U+015B
  ["ź", "z"], // U+017A
  ["ż", "z"], // U+017C
]);

/** Normalises to NFC — the stored display and comparison basis (§5.2, §5.3). */
export function toNfc(value: string): string {
  return value.normalize("NFC");
}

/**
 * Unicode full case folding, applied per code point.
 *
 * Node has no direct case-folding API. `toLowerCase()` alone is simple
 * folding and misses the multi-character foldings (`ß` → `ss`, `ﬁ` → `fi`),
 * which §5.5 explicitly rules out as the only mechanism. Lowercasing, then
 * uppercasing, then lowercasing again reproduces full folding through ICU's
 * own data: the middle uppercase expands the multi-character cases, and the
 * leading lowercase makes the sequence idempotent (`ẞ` → `ß` → `SS` → `ss`,
 * where a bare upper-then-lower would stop at `ß`).
 *
 * Applied per code point because CaseFolding.txt is itself a per-code-point
 * mapping, so this cannot introduce a context-sensitive surprise.
 *
 * Not diffed against CaseFolding.txt directly: unicode.org was
 * network-egress-blocked in the implementing session. It was instead
 * verified empirically — idempotent and NFC/NFD-equivalent across every
 * code point up to U+2FFFF and 400,000 random multi-code-point strings —
 * and `normalize.test.ts` pins the behaviour that matters for identity.
 */
export function fullCaseFold(value: string): string {
  let folded = "";
  for (const codePoint of value) {
    const exception = CASE_FOLD_EXCEPTIONS.get(codePoint);
    folded += exception ?? codePoint.toLowerCase().toUpperCase().toLowerCase();
  }
  return folded;
}

/** Maps typographic dash/apostrophe variants to one separator each (§5.4). */
export function mapSeparators(value: string): string {
  let mapped = "";
  for (const codePoint of value) {
    if (DASH_LIKE.has(codePoint)) {
      mapped += "-";
    } else if (APOSTROPHE_LIKE.has(codePoint)) {
      mapped += "'";
    } else {
      mapped += codePoint;
    }
  }
  return mapped;
}

/**
 * Trims and collapses runs of ordinary spaces; preserves token order (§5.2,
 * §9.3). Trims spaces only — not `String.prototype.trim()`, which would also
 * strip tabs and newlines at the edges and so hide control characters from
 * validation.
 */
export function collapseWhitespace(value: string): string {
  return value
    .replace(SPACE_LIKE, " ")
    .replace(/ {2,}/gu, " ")
    .replace(/^ +| +$/gu, "");
}

/**
 * `canonical_key_v1` (docs/canonical/13 §5.2), in the order the canonical
 * text specifies:
 *
 *   NFC → full case fold → separator mapping → trim → collapse spaces
 *
 * Diacritics, particles and token order are preserved — `ŁUCZAK` becomes
 * `łuczak`, never `luczak`.
 */
export function canonicalKey(value: string): string {
  return toNfc(collapseWhitespace(mapSeparators(fullCaseFold(toNfc(value)))));
}

/**
 * The Polish diacritic search fold (docs/canonical/13 §6.1).
 *
 * **Retrieval only.** A shared fold key is not identity: `Łuczak` and
 * `Luczak` share this key and are still two different surnames unless an
 * explicit, eligible NameForm links them (§6.4). Nothing in this package's
 * matching path calls it — it exists for the retrieval tiers a later task
 * builds, and for the tests that prove it never touches the display form.
 */
export function polishDiacriticFold(value: string): string {
  let folded = "";
  for (const codePoint of canonicalKey(value)) {
    folded += POLISH_FOLD.get(codePoint) ?? codePoint;
  }
  return folded;
}
