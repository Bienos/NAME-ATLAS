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
 * Letterform variants that Unicode **simple** case folding maps to their
 * canonical letter (CaseFolding.txt status `C`) but that `toLowerCase()`
 * leaves alone, because they are already lowercase.
 *
 * Without this table the key would not be caseless for them, and the case
 * that matters in a name is Greek: lowercasing a word-final capital sigma
 * yields ς, not σ, so ΣΟΦΟΣ and Σοφος would take different keys.
 *
 * Twenty-two entries, derived from the runtime's own folding data rather
 * than transcribed by hand — unicode.org is network-egress-blocked here, so
 * CaseFolding.txt could not be read. ECMAScript specifies that a `u`-mode
 * case-insensitive `RegExp` canonicalises with simple case folding (scf),
 * which makes `/^X$/iu` an oracle for whether two code points share a
 * simple-fold class. `normalize.property.test.ts` re-derives this table from
 * that oracle across every code point, so a table that drifts from the
 * runtime fails the suite instead of silently changing identity.
 *
 * U+0131 LATIN SMALL LETTER DOTLESS I is deliberately absent: its only
 * CaseFolding.txt entry is Turkic-conditional (`T`), so under the default
 * profile it folds to itself and stays distinct from Latin `i`. Simple
 * folding reaches that outcome without the uppercase round trip v1 needed.
 */
const SIMPLE_FOLD_VARIANTS = new Map<string, string>([
  ["\u00b5", "\u03bc"], // MICRO SIGN → μ
  ["\u017f", "\u0073"], // LATIN SMALL LETTER LONG S → s
  ["\u0345", "\u03b9"], // COMBINING GREEK YPOGEGRAMMENI → ι
  ["\u03c2", "\u03c3"], // GREEK SMALL LETTER FINAL SIGMA → σ
  ["\u03d0", "\u03b2"], // GREEK BETA SYMBOL → β
  ["\u03d1", "\u03b8"], // GREEK THETA SYMBOL → θ
  ["\u03d5", "\u03c6"], // GREEK PHI SYMBOL → φ
  ["\u03d6", "\u03c0"], // GREEK PI SYMBOL → π
  ["\u03f0", "\u03ba"], // GREEK KAPPA SYMBOL → κ
  ["\u03f1", "\u03c1"], // GREEK RHO SYMBOL → ρ
  ["\u03f5", "\u03b5"], // GREEK LUNATE EPSILON SYMBOL → ε
  ["\u1c80", "\u0432"], // CYRILLIC SMALL LETTER ROUNDED VE → в
  ["\u1c81", "\u0434"], // CYRILLIC SMALL LETTER LONG-LEGGED DE → д
  ["\u1c82", "\u043e"], // CYRILLIC SMALL LETTER NARROW O → о
  ["\u1c83", "\u0441"], // CYRILLIC SMALL LETTER WIDE ES → с
  ["\u1c84", "\u0442"], // CYRILLIC SMALL LETTER TALL TE → т
  ["\u1c85", "\u0442"], // CYRILLIC SMALL LETTER THREE-LEGGED TE → т
  ["\u1c86", "\u044a"], // CYRILLIC SMALL LETTER TALL HARD SIGN → ъ
  ["\u1c87", "\u0463"], // CYRILLIC SMALL LETTER TALL YAT → ѣ
  ["\u1c88", "\ua64b"], // CYRILLIC SMALL LETTER UNBLENDED UK → ꙋ
  ["\u1e9b", "\u1e61"], // LATIN SMALL LETTER LONG S WITH DOT ABOVE → ṡ
  ["\u1fbe", "\u03b9"], // GREEK PROSGEGRAMMENI → ι
]);

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
 * **No longer the canonical identity fold.** `canonicalKey` used this up to
 * `canonical_key_v1` and moved to {@link simpleCaseFold} at
 * `canonical_key_v2`, because full folding expands `ẞ` to `ss` and so merges
 * distinct surnames (`WEIẞ` with `WEISS`). See ADR-0005 and D-013. It is kept
 * exported and tested because the v1 keys it produced are what migration
 * `0006_canonical_key_v2` rewrites, and because the regression test uses it to
 * show the collisions were real rather than theoretical.
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

/**
 * Unicode **simple** case folding, applied per code point (ADR-0005).
 *
 * Simple folding is one code point in, one code point out. It never expands
 * a letter into several, so ẞ LATIN CAPITAL LETTER SHARP S folds to ß
 * and never to `ss`: `GROẞ` and `GROSS` stay two distinct surnames, which
 * is what the register says they are. Full folding merges them, and that
 * merge made the official resource uningestible — see ADR-0005 for the
 * measurement and for why the cost lands on the retrieval tiers instead.
 *
 * `toLowerCase()` supplies the mapping, with two corrections. Its
 * per-code-point result can expand (U+0130 İ becomes `i` + U+0307), and
 * simple folding has no expansions, so a multi-code-point result is
 * discarded and the code point stands — which is also what Unicode does
 * with U+0130, since it has no simple-fold entry at all. And lowercasing
 * leaves the letterform variants of {@link SIMPLE_FOLD_VARIANTS} alone,
 * where folding does not.
 *
 * Verified against the runtime's own simple-fold data in
 * `normalize.property.test.ts`: over every code point, this function never
 * joins two code points that Unicode folds apart, and never separates two
 * it folds together.
 */
export function simpleCaseFold(value: string): string {
  let folded = "";
  for (const codePoint of value) {
    const variant = SIMPLE_FOLD_VARIANTS.get(codePoint);
    if (variant !== undefined) {
      folded += variant;
      continue;
    }
    const lower = codePoint.toLowerCase();
    folded += [...lower].length === 1 ? lower : codePoint;
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
 * `canonical_key_v2` (docs/canonical/13 §5.2, amended by ADR-0005):
 *
 *   NFC → simple case fold → separator mapping → trim → collapse spaces
 *
 * Diacritics, particles and token order are preserved — `ŁUCZAK` becomes
 * `łuczak`, never `luczak`.
 *
 * The one difference from `canonical_key_v1` is the case step: v1 applied
 * Unicode *full* folding, which expands a letter into several and so merged
 * `WEIẞ` into `WEISS`. Everything else — the order of the steps, NFC at both
 * ends, the separator table — is unchanged, so every key containing no code
 * point the two treat differently is byte-identical between the versions.
 */
export function canonicalKey(value: string): string {
  return toNfc(collapseWhitespace(mapSeparators(simpleCaseFold(toNfc(value)))));
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
