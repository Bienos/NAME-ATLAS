import { canonicalKey } from "@name-atlas/resolver";
import type { ResolutionObservation } from "./observe.js";
import type { ResolutionCase } from "./expect-resolution.js";
import { matchesOneOf } from "./expect-resolution.js";

/**
 * `docs/canonical/17` §12's resolution metrics, over this corpus.
 *
 * §12 lists twelve measures and then says which ones decide whether to launch:
 *
 * > FALSE MERGE RATE
 * > FALSE AUTO-RESOLVE RATE
 * >
 * > are more important than maximizing fuzzy recall.
 *
 * So those two are computed here and asserted to be **zero**, as a property of
 * the corpus rather than of any one case: a change that merges two identities
 * fails here even if it repaired every individual expectation.
 *
 * The recall-shaped measures in the same list — top-1 accuracy, top-3 recall,
 * diacritic candidate recall, OCR candidate recall — are deliberately **not**
 * computed here. A rate over 23 fixture entities is not a recall figure; it is
 * a number that would look like one. Those are measured on the real
 * 598,476-surname register by `pnpm measure:fuzzy-recall` (TASK-015), which is
 * where a number that anyone might quote belongs.
 */
export interface CorpusMetrics {
  readonly cases: number;
  /** Resolved to an identity the input's own key does not address, unbridged. */
  readonly false_merges: readonly string[];
  /** Resolved although the case expected no identity. */
  readonly false_auto_resolves: readonly string[];
  /** Resolved to an identity other than the expected one. */
  readonly wrong_identities: readonly string[];
  /** Ambiguous fixtures that nonetheless committed to one identity. */
  readonly ambiguous_auto_resolves: readonly string[];
  readonly resolved: number;
  readonly unresolved: number;
  readonly invalid_input: number;
}

export function corpusMetrics(
  pairs: readonly (readonly [ResolutionCase, ResolutionObservation])[],
): CorpusMetrics {
  const false_merges: string[] = [];
  const false_auto_resolves: string[] = [];
  const wrong_identities: string[] = [];
  const ambiguous_auto_resolves: string[] = [];
  let resolved = 0;
  let unresolved = 0;
  let invalid_input = 0;

  for (const [goldenCase, o] of pairs) {
    const r = o.resolution;
    const id = goldenCase.meta.case_id;
    if (r.outcome === "RESOLVED") resolved += 1;
    else if (r.outcome === "UNRESOLVED") unresolved += 1;
    else invalid_input += 1;

    if (r.outcome === "RESOLVED") {
      const display = r.resolved_canonical_display;
      // A false merge: two different addresses became one identity, and no
      // accepted NameForm is the reason.
      if (
        display !== null &&
        canonicalKey(display) !== r.canonical_key &&
        r.matched_name_form_id === null
      ) {
        false_merges.push(`${id}: ${r.unicode_nfc} → ${display}`);
      }
      // A false auto-resolve: the case expected nobody to commit, and the
      // system committed.
      if (!matchesOneOf(goldenCase.expected.resolution.outcome, "RESOLVED")) {
        false_auto_resolves.push(`${id}: resolved to ${String(display)}`);
      }
      const want = goldenCase.expected.resolution.resolved_display;
      if (want !== null && display !== want) {
        wrong_identities.push(`${id}: expected ${want}, got ${String(display)}`);
      }
    }

    if (
      goldenCase.expected.resolution.candidate_surname_displays !== null &&
      r.resolved_surname_id !== null
    ) {
      ambiguous_auto_resolves.push(`${id}: committed although the fixture is ambiguous`);
    }
  }

  return {
    cases: pairs.length,
    false_merges,
    false_auto_resolves,
    wrong_identities,
    ambiguous_auto_resolves,
    resolved,
    unresolved,
    invalid_input,
  };
}
