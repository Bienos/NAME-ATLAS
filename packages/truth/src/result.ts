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

/** Why a rank query produced no claim. `INCOMPLETE_UNIVERSE` is the new one. */
export type NoRankReason =
  | NoResultReason
  /**
   * The surname resolved and has evidence, but the set it would be ranked
   * within is not the complete resource version. Reported, never approximated
   * (TASK-009 §2).
   */
  | "INCOMPLETE_UNIVERSE";

/** The universe a rank was computed within, carried so the rank is readable. */
export interface RankUniverse {
  /** What kind of set this is — currently one resource version's national values. */
  readonly kind: string;
  /** How many surnames it contains. */
  readonly size: number;
  /** The source record the set comes from. */
  readonly source_record_id: string;
  /** The publisher's resource id for that record. */
  readonly external_record_id: string | null;
  /**
   * Snapshots in different comparability groups may not be compared
   * (`docs/canonical/11` §6.1), which is why each group is its own universe.
   */
  readonly comparability_group: string | null;
}

/**
 * One `CURRENT_RANK` claim — one per resource version, never one per surname.
 *
 * There is deliberately no "overall" or "national" rank field. The male and
 * female PESEL resources sit in different comparability groups and TASK-004
 * §14 U-1 forbids summing them, so **no all-Poland rank is derivable from
 * this source**. A field implying one would be the fabrication `AGENTS.md` §9
 * forbids.
 */
export interface CurrentRankClaimResult {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly rank: number;
  readonly universe: RankUniverse;
  /** The count the rank was computed from, carried for auditability. */
  readonly count: number;
  /** How tied counts were handled, because a rank without this is ambiguous. */
  readonly ties_policy: string;
  /** The versioned algorithm that produced the rank. */
  readonly algorithm_version: string;
  /** The source's own reference date — never the retrieval date. */
  readonly snapshot_date: string;
  readonly country_code: string;
  /** The publisher's verbatim universe description. Not translated. */
  readonly source_population_scope: string;
  readonly coverage_notes: string | null;
  readonly method_version: string;
  readonly confidence: ConfidenceProjection;
  readonly citation: CitationProjection;
}

export type SurnameRankResult =
  | {
      readonly kind: "RESULT";
      readonly resolution_status: string;
      readonly surname: CanonicalSurnameIdentity;
      /** One entry per complete resource version. Never merged. */
      readonly current_rank: readonly CurrentRankClaimResult[];
      readonly surface_eligibility: readonly SurfaceEligibility[];
    }
  | {
      readonly kind: "NO_RESULT";
      readonly reason: NoRankReason;
      readonly resolution_status: string;
      readonly surname: CanonicalSurnameIdentity | null;
      /** Machine-readable detail. Never a stack trace or SQL. */
      readonly message: string;
      /**
       * Present when the reason is `INCOMPLETE_UNIVERSE`: what the registry
       * expected against what is actually persisted, so the gap is reportable
       * rather than merely asserted.
       */
      readonly incomplete_universes?: readonly {
        readonly source_record_id: string;
        readonly external_record_id: string | null;
        readonly reason: string;
        readonly expected_row_count: number | null;
        readonly actual_row_count: number;
      }[];
    };

/**
 * One `RARITY_CONTEXT` claim — one per complete resource version, never one
 * per surname, for the same reason as the rank: the sex partitions are
 * different universes and may not be combined.
 */
export interface RarityContextClaimResult {
  readonly claim_id: string;
  readonly claim_key: string;
  /** `denominator / count`, rounded half up. "About 1 in X". */
  readonly one_in_x: number;
  /** The surname's count in this universe. */
  readonly numerator: number;
  /** The sum of every published count in this universe. */
  readonly denominator: number;
  /** What the denominator is: always the published-universe sum here. */
  readonly denominator_kind: string;
  /** Frontend-localised code for what X is a share of. */
  readonly universe_label_code: string;
  /** `count / denominator`, to nine places. */
  readonly share: number;
  readonly rounding: string;
  readonly universe: RankUniverse;
  /** The rank in the same universe, when a `CURRENT_RANK` claim exists. */
  readonly supporting_rank: number | null;
  readonly snapshot_date: string;
  readonly country_code: string;
  readonly source_population_scope: string;
  readonly coverage_notes: string | null;
  readonly method_version: string;
  readonly confidence: ConfidenceProjection;
  readonly citation: CitationProjection;
}

export type SurnameRarityResult =
  | {
      readonly kind: "RESULT";
      readonly resolution_status: string;
      readonly surname: CanonicalSurnameIdentity;
      /** One entry per complete resource version. Never merged. */
      readonly rarity_context: readonly RarityContextClaimResult[];
      readonly surface_eligibility: readonly SurfaceEligibility[];
    }
  | {
      readonly kind: "NO_RESULT";
      readonly reason: NoRankReason;
      readonly resolution_status: string;
      readonly surname: CanonicalSurnameIdentity | null;
      readonly message: string;
      readonly incomplete_universes?: readonly {
        readonly source_record_id: string;
        readonly external_record_id: string | null;
        readonly reason: string;
        readonly expected_row_count: number | null;
        readonly actual_row_count: number;
      }[];
    };

/**
 * Whether a distribution may be presented as the surname's distribution
 * (TASK-012 §3). A scope property, never a confidence one: the counts are
 * exactly what the source says in all three states.
 */
export type DistributionCoverageState =
  /** Coverage is at or above the threshold. Presentable as the distribution. */
  | "READY"
  /**
   * Coverage is below the threshold. The entries are real and returned, but a
   * surface must present them as "of the N bearers with a registered
   * voivodeship", never as where the surname is found.
   */
  | "LOW_COVERAGE"
  /**
   * No complete national resource version for this partition, so what share of
   * the surname's bearers these cells represent is unknown. Presented exactly
   * as `LOW_COVERAGE`: unknown coverage is not adequate coverage.
   */
  | "COVERAGE_UNKNOWN";

/** One voivodeship's published figure for one surname. */
export interface DistributionEntryResult {
  readonly place_id: string;
  /** TERYT TERC code, e.g. "30" for WIELKOPOLSKIE. Null if no id is recorded. */
  readonly terc_code: string | null;
  readonly place_display_name: string;
  /** The publisher's own geography string, kept so the join stays auditable. */
  readonly source_geography_key: string | null;
  readonly count: number;
  /** `count / covered_count`, to nine places. Never over the national count. */
  readonly share_of_covered: number;
}

/**
 * One `CURRENT_DISTRIBUTION` claim — one per regional resource version.
 *
 * There is deliberately no field expressing a share of the national count, and
 * no entry for a voivodeship the publisher did not list. Both would state
 * something the source does not support (TASK-012 §2, §8).
 */
export interface CurrentDistributionClaimResult {
  readonly claim_id: string;
  readonly claim_key: string;
  readonly state: DistributionCoverageState;
  /** Descending by count, then by place name. */
  readonly entries: readonly DistributionEntryResult[];
  /** How many voivodeships the publisher listed. Never assumed to be 16. */
  readonly regions_present: number;
  /** The surname's sum across those voivodeships. The shares' denominator. */
  readonly covered_count: number;
  /** The same surname's count in the same partition's national resource. */
  readonly national_count: number | null;
  /** `covered_count / national_count`, to nine places, or null when unknown. */
  readonly coverage_ratio: number | null;
  /** What that ratio is a ratio of, in words, on every claim. */
  readonly coverage_basis: string;
  /** The threshold `state` was decided against, so the decision is auditable. */
  readonly low_coverage_threshold: number;
  readonly universe: RankUniverse;
  readonly universe_label_code: string;
  readonly snapshot_date: string;
  readonly country_code: string;
  readonly source_population_scope: string;
  /** Carries the registered-residence restriction verbatim. */
  readonly coverage_notes: string | null;
  readonly method_version: string;
  readonly confidence: ConfidenceProjection;
  readonly citation: CitationProjection;
}

export type SurnameDistributionResult =
  | {
      readonly kind: "RESULT";
      readonly resolution_status: string;
      readonly surname: CanonicalSurnameIdentity;
      /** One entry per complete regional resource version. Never merged. */
      readonly current_distribution: readonly CurrentDistributionClaimResult[];
      readonly surface_eligibility: readonly SurfaceEligibility[];
    }
  | {
      readonly kind: "NO_RESULT";
      readonly reason: NoRankReason;
      readonly resolution_status: string;
      readonly surname: CanonicalSurnameIdentity | null;
      readonly message: string;
      readonly incomplete_universes?: readonly {
        readonly source_record_id: string;
        readonly external_record_id: string | null;
        readonly reason: string;
        readonly expected_row_count: number | null;
        readonly actual_row_count: number;
      }[];
    };
