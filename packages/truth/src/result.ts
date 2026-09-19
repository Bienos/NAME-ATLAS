/**
 * The developer-facing result of a truth-chain lookup (TASK-005 §2, §7 AC-24).
 *
 * This is a read projection, not a persistence shape. It is deliberately not
 * an HTTP contract: the API DTO is TASK-006's, and shaping one here would be
 * abstraction for a task that does not exist yet (`AGENTS.md` §6).
 *
 * The states below are exhaustive and named. A caller must handle each; none
 * of them is representable as a count of zero (`ARCHITECTURE.md` §10
 * invariant 4).
 */
import type { ConfidenceStatus } from "./confidence.js";
import type { SurfaceEligibility } from "./rights.js";

/** Why a query produced no claim. Never collapsed into "no data". */
export type NoResultReason =
  /** Input failed validation before any lookup (empty, too long, control chars). */
  | "INVALID_INPUT"
  /** Resolved to nothing. Not a zero — the surname may exist and be suppressed. */
  | "UNRESOLVED"
  /** Resolution found more than one candidate, or needs review. Never guessed. */
  | "AMBIGUOUS"
  /** Resolved, but no snapshot from an applicable source covers this surname. */
  | "NO_APPLICABLE_EVIDENCE"
  /** The lookup itself failed. Infrastructure, never "surname unknown". */
  | "LOOKUP_FAILED";

export interface CanonicalSurnameIdentity {
  readonly surname_id: string;
  readonly canonical_display: string;
  readonly canonical_key: string;
  readonly primary_script: string;
}

/** Structured provenance, sufficient for a later layer to render a citation. */
export interface CitationProjection {
  readonly citation_id: string;
  readonly title: string;
  readonly publisher: string | null;
  /** Source precision preserved; not reformatted. */
  readonly publication_date: string | null;
  readonly url_or_reference: string;
  readonly supporting_locator: string | null;
  readonly accessed_at: string | null;
  /** Recorded attribution text, or null where none is required. */
  readonly attribution: string | null;
  /** The licence/terms identifier in force, e.g. "CC0 1.0". */
  readonly terms_version: string | null;
}

export interface ConfidenceProjection {
  readonly status: ConfidenceStatus;
  readonly rationale: string;
  readonly assessment_method: string;
  readonly assessment_version: string;
  readonly human_review_required: boolean;
}

/**
 * One `CURRENT_POPULATION` claim — one per dataset snapshot.
 *
 * There is deliberately no `unit` field. The publisher describes
 * *"liczba wystąpień"* — occurrences — and never states that one occurrence
 * is one living person (TASK-004 §14 U-4, unresolved). Asserting a unit here
 * would be exactly the fabrication `AGENTS.md` §9 forbids, so the count is
 * carried with the publisher's own scope wording instead and the unit
 * question is left to D-010 at the presentation boundary.
 */
export interface CurrentPopulationClaimResult {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly count: number;
  /** The source's own reference date — never the retrieval date. */
  readonly snapshot_date: string;
  readonly country_code: string;
  /** The publisher's verbatim universe description. Not translated. */
  readonly source_population_scope: string;
  /** Known limitations, incl. the suppression rule and the partition caveat. */
  readonly coverage_notes: string | null;
  /**
   * Snapshots in different comparability groups may not be compared or
   * summed without explicit justification (`docs/canonical/11` §6.1).
   */
  readonly comparability_group: string | null;
  readonly method_version: string;
  readonly confidence: ConfidenceProjection;
  readonly citation: CitationProjection;
}

export type SurnameTruthResult =
  | {
      readonly kind: "RESULT";
      readonly resolution_status: string;
      readonly surname: CanonicalSurnameIdentity;
      /**
       * One entry per applicable snapshot. A surname present in both PESEL
       * resources yields two, with their own counts and comparability
       * groups. They are never summed (TASK-005 AC-21).
       */
      readonly current_population: readonly CurrentPopulationClaimResult[];
      /** Per-surface rights decision. Independent of confidence. */
      readonly surface_eligibility: readonly SurfaceEligibility[];
    }
  | {
      readonly kind: "NO_RESULT";
      readonly reason: NoResultReason;
      readonly resolution_status: string;
      /** Present when the surname resolved but carried no evidence. */
      readonly surname: CanonicalSurnameIdentity | null;
      /** Machine-readable detail. Never a stack trace or SQL. */
      readonly message: string;
    };
