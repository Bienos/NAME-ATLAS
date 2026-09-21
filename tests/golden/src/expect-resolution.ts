import type {
  NoSuggestionReason,
  ResolutionOutcome,
  SurnameResolutionStatus,
} from "@name-atlas/resolver";
import type { CaseMetadata } from "./case.js";
import type { ResolutionObservation } from "./observe.js";
import type { ResolutionForbiddenCode } from "./forbidden-resolution.js";

/** §4's worked example uses `MAY_APPEAR`; exclusion and inclusion complete it. */
export type CandidateVerb = "MUST_APPEAR" | "MUST_NOT_APPEAR" | "MAY_APPEAR";

/** §5 writes single values and `one_of` lists interchangeably. Both are kept. */
export type OneOf<T> = T | { readonly one_of: readonly T[] };

/**
 * `docs/canonical/17` §11's assertion list in full.
 *
 * Three of its fields are **projections**, not stored fields, and are marked
 * as such: `SurnameResolution` carries `user_confirmation_required` and the
 * status, and `auto_resolved`, `human_review_required` and `decision_mode` are
 * read off them. They are asserted anyway because §11 asks for them by name and
 * because a projection that stopped agreeing with its source would be exactly
 * the silent failure this corpus exists to catch.
 */
export interface ResolutionExpectation {
  readonly outcome: OneOf<ResolutionOutcome>;
  readonly resolution_status: OneOf<SurnameResolutionStatus>;
  /**
   * Projection. `AUTOMATIC` only where the system committed to an identity.
   * A `one_of` is used where the mode depends on whether fuzzy retrieval
   * happened to return anything, which is measured rather than guaranteed.
   */
  readonly decision_mode: OneOf<"AUTOMATIC" | "USER_CONFIRM" | "NONE">;
  /** Projection: resolved, and nobody was asked. */
  readonly auto_resolved: boolean;
  readonly user_confirmation_required: boolean;
  /** Projection: the status is `REVIEW_REQUIRED`. */
  readonly human_review_required: boolean;
  readonly resolved_display: string | null;
  readonly matched_form: string | null;
  /**
   * The exact set of candidate identities a `MULTIPLE_EXACT` named, by display
   * form. `null` where the case does not constrain it. §11: "Do not evaluate
   * only top-1 string" — for the ambiguous case the whole set is the answer.
   */
  readonly candidate_surname_displays: readonly string[] | null;
}

export interface SuggestionExpectation {
  readonly kind: "SUGGESTIONS" | "NO_SUGGESTIONS" | "ANY";
  /** Asserted only when `kind` is `NO_SUGGESTIONS`. */
  readonly reason: NoSuggestionReason | null;
}

export interface ResolutionCase {
  readonly meta: CaseMetadata;
  readonly input: {
    readonly raw_surname: string;
    readonly locale: "pl-PL";
    readonly country: "PL";
  };
  readonly expected: {
    readonly resolution: ResolutionExpectation;
    readonly suggestion: SuggestionExpectation;
    /** Keyed by display form, as §4's example is. */
    readonly candidate_behavior: Readonly<Record<string, CandidateVerb>>;
  };
  readonly forbidden: readonly ResolutionForbiddenCode[];
}

/** The three projections §11 names, computed once so every consumer agrees. */
export interface ResolutionProjections {
  readonly decision_mode: "AUTOMATIC" | "USER_CONFIRM" | "NONE";
  readonly auto_resolved: boolean;
  readonly human_review_required: boolean;
}

export function projectionsOf(o: ResolutionObservation): ResolutionProjections {
  const r = o.resolution;
  const resolved = r.resolution_status === "EXACT" || r.resolution_status === "KNOWN_VARIANT";
  const decision_mode = resolved
    ? "AUTOMATIC"
    : r.user_confirmation_required || o.suggestion.kind === "SUGGESTIONS"
      ? "USER_CONFIRM"
      : "NONE";
  return {
    decision_mode,
    auto_resolved: resolved && !r.user_confirmation_required,
    human_review_required: r.resolution_status === "REVIEW_REQUIRED",
  };
}

export function matchesOneOf<T>(expected: OneOf<T>, actual: T): boolean {
  if (typeof expected === "object" && expected !== null && "one_of" in expected) {
    return (expected as { readonly one_of: readonly T[] }).one_of.includes(actual);
  }
  return expected === actual;
}

export function describeOneOf<T>(expected: OneOf<T>): string {
  if (typeof expected === "object" && expected !== null && "one_of" in expected) {
    return (expected as { readonly one_of: readonly T[] }).one_of.map(String).join(" | ");
  }
  return String(expected);
}
