/**
 * Versioned method identifiers for the truth layer.
 *
 * Every derived artefact records the version of the method that produced it
 * (`docs/canonical/11` §10.1 `method_version`, §10.3 `assessment_version`),
 * so an assessment can be reproduced or invalidated deliberately rather than
 * by guesswork. Bump a version when its rule changes behaviour; never edit a
 * rule in place and leave the version alone.
 */

/** The `CURRENT_POPULATION` derivation method (TASK-005). */
export const CURRENT_POPULATION_METHOD_VERSION = "current_population@1";

/** The claim payload schema this method emits. */
export const CURRENT_POPULATION_PAYLOAD_VERSION = "current_population_payload@1";

/** The confidence rule implementing docs/canonical/14 §29's provisos. */
export const CONFIDENCE_ASSESSMENT_METHOD = "pesel_current_population_rule";
export const CONFIDENCE_ASSESSMENT_VERSION = "confidence@1";

/** The surface-eligibility evaluation (docs/canonical/12 §6.3/§6.4). */
export const SURFACE_ELIGIBILITY_VERSION = "surface_eligibility@1";

/** Orchestration version recorded on each ResearchRun. */
export const WORKFLOW_VERSION = "truth_chain_sync@1";

/** Schema version of the run's `raw_input` payload. */
export const RUN_INPUT_SCHEMA_VERSION = "run_input@1";

/** The `CURRENT_RANK` derivation method (TASK-009). */
export const CURRENT_RANK_METHOD_VERSION = "current_rank@1";

/** The rank claim payload schema this method emits. */
export const CURRENT_RANK_PAYLOAD_VERSION = "current_rank_payload@1";

/**
 * The confidence rule for a derived statistic. Deliberately distinct from
 * `CONFIDENCE_ASSESSMENT_METHOD`, so a source-native assessment and a derived
 * one are distinguishable in the data rather than only by the claim they hang
 * from (TASK-009 §9 AC-15).
 */
export const RANK_CONFIDENCE_ASSESSMENT_METHOD = "derived_statistic_rule";
export const RANK_CONFIDENCE_ASSESSMENT_VERSION = "derived_confidence@1";

/**
 * The ties policy, recorded on every rank claim because
 * `docs/canonical/12` §9.6 requires a rank to store one (TASK-009 §15 U-1).
 *
 * Competition ranking: tied counts share the lowest rank and the next
 * distinct count skips accordingly, giving 1, 2, 2, 4. It is the convention
 * a reader expects from a frequency table, and it keeps TASK-009 §10
 * invariant 4 exact — if count(A) > count(B) then rank(A) < rank(B) — which
 * dense ranking would also satisfy but ordinal ranking would not, since
 * ordinal would give two equal counts different ranks on an arbitrary
 * tiebreak.
 */
export const RANK_TIES_POLICY = "COMPETITION";

/** The universe a rank is computed within. Recorded on the claim payload. */
export const RANK_UNIVERSE_KIND = "SOURCE_RECORD_NATIONAL_VALUES";
