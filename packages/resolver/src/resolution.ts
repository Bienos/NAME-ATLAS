/**
 * The resolver's outcome contract (docs/canonical/11 §4.5; TASK-003 §7).
 *
 * `SurnameResolution` is a runtime value object, not persisted (TASK-003
 * §6.2): its canonical `resolution_id`/`research_run_id`/`created_at`
 * fields belong to the persistence a later task adds with `ResearchRun`.
 */
import type { InputValidationStatus } from "./validation.js";

/**
 * The subset of docs/canonical/11 §4.5's `ResolutionStatus` this exact
 * resolver can produce. `POSSIBLE_VARIANT` and `FUZZY_MATCH` require
 * candidate generation and are never emitted here.
 */
export type ResolutionStatus =
  "EXACT" | "KNOWN_VARIANT" | "MULTIPLE_EXACT" | "UNKNOWN" | "REVIEW_REQUIRED";

/**
 * What `resolution_status` holds: a matching-tier outcome for valid input,
 * or the validation outcome itself when the input never reached matching
 * (TASK-003 §7.3). `MIXED_SCRIPT_REVIEW` is carried as `REVIEW_REQUIRED`
 * (§7.2), so it never appears here directly.
 */
export type SurnameResolutionStatus =
  ResolutionStatus | Exclude<InputValidationStatus, "VALID" | "MIXED_SCRIPT_REVIEW">;

/**
 * Coarse tri-state projection of `resolution_status` for callers that only
 * need "did it resolve, and if not, was that the input's fault". Derived,
 * never stored, never the primary field — `resolution_status` is.
 */
export type ResolutionOutcome = "RESOLVED" | "UNRESOLVED" | "INVALID_INPUT";

export function outcomeOf(status: SurnameResolutionStatus): ResolutionOutcome {
  switch (status) {
    case "EXACT":
    case "KNOWN_VARIANT":
      return "RESOLVED";
    case "MULTIPLE_EXACT":
    case "UNKNOWN":
    case "REVIEW_REQUIRED":
      return "UNRESOLVED";
    case "EMPTY":
    case "EXCEEDS_OPERATIONAL_LIMIT":
    case "MALFORMED_CONTROL_CHARACTERS":
      return "INVALID_INPUT";
  }
}

export interface SurnameResolution {
  /** Exactly as received. Never trimmed, cased or normalised. */
  readonly raw_input: string;
  /** NFC form of the raw input (docs/canonical/11 §4.5). */
  readonly unicode_nfc: string;
  /** The `canonical_key_v1` lookup representation the tiers matched on. */
  readonly canonical_key: string;
  readonly canonical_key_version: string;
  readonly validation_status: InputValidationStatus;
  readonly resolution_status: SurnameResolutionStatus;
  readonly outcome: ResolutionOutcome;
  /** Set only for `EXACT` and `KNOWN_VARIANT`. */
  readonly resolved_surname_id: string | null;
  /** The resolved surname's stored `canonical_display`; set with `resolved_surname_id`. */
  readonly resolved_canonical_display: string | null;
  /** Every distinct candidate, sorted; non-empty only for `MULTIPLE_EXACT`. */
  readonly candidate_surname_ids: readonly string[];
  /** Set only for `KNOWN_VARIANT`. */
  readonly matched_name_form_id: string | null;
  /** The matched form's stored `form`; set with `matched_name_form_id`. */
  readonly matched_form: string | null;
  readonly resolution_method_version: string;
  /** True for `MULTIPLE_EXACT` and `REVIEW_REQUIRED` (TASK-003 §7.3). */
  readonly user_confirmation_required: boolean;
  readonly detected_scripts: readonly string[];
  readonly primary_script: string;
  readonly mixed_script: boolean;
  readonly script_confusable_flag: boolean;
}

/** Where a lookup failure surfaced, for diagnosis. */
export type LookupStage = "TRANSACTION" | "T0_CANONICAL" | "T1_NAME_FORM";

/**
 * What `resolveSurname` returns. A database failure is a distinct, typed
 * outcome — never `UNKNOWN`, which would misreport an outage as "this
 * surname does not exist" (TASK-003 §8 item 19).
 */
export type SurnameLookupOutcome =
  | {
      readonly kind: "RESOLUTION";
      readonly resolution: SurnameResolution;
    }
  | {
      readonly kind: "LOOKUP_FAILED";
      readonly raw_input: string;
      readonly unicode_nfc: string;
      readonly canonical_key: string;
      readonly resolution_method_version: string;
      readonly stage: LookupStage;
      readonly message: string;
      readonly cause: unknown;
    };
