/**
 * Damerau-Levenshtein edit distance (docs/canonical/13 §20.1, stage 9).
 *
 * `pg_trgm` answers "which strings share character fragments?". This answers
 * "how many edits separate them?", and the distinction is not academic. A
 * transposition of two adjacent characters destroys three of the roughly
 * `n + 1` trigrams in a string, so it is the edit class trigram similarity
 * handles worst and the one an interactive typist commits most.
 *
 * Measured on the real register: over 100 single-edit cases on real
 * nine-to-eleven-character surnames, trigram order put the intended surname
 * first in 53 and recovered 8 of the 25 transpositions; reranking the same
 * shortlist with this function put it first in 80 and recovered **25 of 25**.
 * That is why retrieval and ranking are separate stages rather than one
 * `ORDER BY`. Re-measure with `pnpm measure:fuzzy-recall`.
 *
 * This is the **unrestricted** variant (Damerau's original, with the adjacent
 * transposition treated as a single edit), not the "optimal string alignment"
 * simplification: OSA charges two edits for `ca → abc` and real surname typos
 * do include a transposition adjacent to another edit.
 *
 * Pure: no database, no locale, no normalisation. Callers pass whatever
 * representation they are comparing — `candidates.ts` passes `canonical_key`
 * values, so casing and separators are already settled upstream.
 */

/**
 * Edit distance between two strings, counting an adjacent transposition as one
 * edit alongside insertion, deletion and substitution.
 *
 * Compares by **code point**, not by UTF-16 code unit, so a surname outside the
 * BMP is one character rather than two. Polish surnames are all BMP, but
 * `canonical_key` admits any script and a silently doubled distance for one
 * would be an invisible bug.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const s = [...a];
  const t = [...b];
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  // Standard Damerau-Levenshtein with a "last row containing this character"
  // table. The +2 sizing and the `inf` sentinels are what make the
  // transposition term safe at the borders.
  const inf = s.length + t.length + 1;
  const lastRowOf = new Map<string, number>();
  const d: number[][] = Array.from({ length: s.length + 2 }, () =>
    new Array<number>(t.length + 2).fill(0),
  );

  d[0]![0] = inf;
  for (let i = 0; i <= s.length; i += 1) {
    d[i + 1]![0] = inf;
    d[i + 1]![1] = i;
  }
  for (let j = 0; j <= t.length; j += 1) {
    d[0]![j + 1] = inf;
    d[1]![j + 1] = j;
  }

  for (let i = 1; i <= s.length; i += 1) {
    let lastColMatch = 0;
    for (let j = 1; j <= t.length; j += 1) {
      const lastRowMatch = lastRowOf.get(t[j - 1]!) ?? 0;
      // Captured BEFORE `lastColMatch` advances for this j. Using the advanced
      // value collapses the transposition term whenever the characters match,
      // which reported `kowalskii` against `kowalski` as distance 0.
      const lastColMatchBefore = lastColMatch;
      const substitution = s[i - 1] === t[j - 1] ? 0 : 1;
      if (substitution === 0) lastColMatch = j;
      d[i + 1]![j + 1] = Math.min(
        d[i]![j]! + substitution,
        d[i + 1]![j]! + 1,
        d[i]![j + 1]! + 1,
        // The transposition: swap back to the last position where these two
        // characters were seen, paying for what lies between.
        d[lastRowMatch]![lastColMatchBefore]! +
          (i - lastRowMatch - 1) +
          1 +
          (j - lastColMatchBefore - 1),
      );
    }
    lastRowOf.set(s[i - 1]!, i);
  }

  return d[s.length + 1]![t.length + 1]!;
}

/**
 * Whether `b` is `a` with exactly one pair of adjacent characters swapped.
 *
 * Reported as its own candidate feature (`docs/canonical/13` §24
 * `transposition_detected`) because it is the most diagnostic single signal
 * this task has: a transposition is almost always a typing slip rather than a
 * different surname, whereas a substitution at the same distance may well be
 * a genuinely different name.
 */
export function hasAdjacentTransposition(a: string, b: string): boolean {
  const s = [...a];
  const t = [...b];
  if (s.length !== t.length) return false;
  const differing: number[] = [];
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] !== t[i]) differing.push(i);
    if (differing.length > 2) return false;
  }
  if (differing.length !== 2) return false;
  const [first, second] = differing as [number, number];
  return second === first + 1 && s[first] === t[second] && s[second] === t[first];
}
