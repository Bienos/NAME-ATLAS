/**
 * @name-atlas/truth — the CURRENT_POPULATION truth chain (TASK-005).
 *
 * Public surface: one derivation entry point, the result projection types,
 * and the two rules it applies (confidence and surface eligibility) exposed
 * separately so each can be tested without a database — and so that neither
 * can quietly read the other's inputs.
 */
export {
  deriveCurrentPopulation,
  currentPopulationClaimKey,
  TruthInvariantError,
} from "./derive.js";
export type { DeriveOptions } from "./derive.js";
export { readCurrentPopulation, readRarityContext } from "./read.js";
export type { PersistedCurrentPopulation, PersistedRarityContext } from "./read.js";
export { querySurnameResult } from "./query.js";
export type { SurnameQueryOptions, SurnameQueryOutcome } from "./query.js";
export { deriveCurrentRank, currentRankClaimKey } from "./rank.js";
export type { DeriveRankOptions } from "./rank.js";
export { deriveRarityContext, rarityContextClaimKey, oneInX, shareOf } from "./rarity.js";
export type { DeriveRarityOptions } from "./rarity.js";
export { assessUniverseCompleteness } from "./completeness.js";
export type { CompletenessInputs, CompletenessVerdict, IncompleteReason } from "./completeness.js";
export {
  assessCurrentPopulation,
  assessDerivedStatistic,
  evidenceSetHash,
  isValidCombination,
} from "./confidence.js";
export type {
  ConfidenceInputs,
  DerivedConfidenceInputs,
  ConfidenceStatus,
  ConfidenceVerdict,
  EpistemicType,
} from "./confidence.js";
export { evaluateSurface, evaluateAllSurfaces, SURFACES } from "./rights.js";
export type { EffectiveRights, Surface, SurfaceDecision, SurfaceEligibility } from "./rights.js";
export type {
  CanonicalSurnameIdentity,
  CitationProjection,
  ConfidenceProjection,
  CurrentPopulationClaimResult,
  CurrentRankClaimResult,
  NoRankReason,
  NoResultReason,
  RankUniverse,
  RarityContextClaimResult,
  SurnameRankResult,
  SurnameRarityResult,
  SurnameTruthResult,
} from "./result.js";
export {
  CURRENT_RANK_METHOD_VERSION,
  CURRENT_RANK_PAYLOAD_VERSION,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
  RANK_TIES_POLICY,
  RANK_UNIVERSE_KIND,
  RARITY_CONTEXT_METHOD_VERSION,
  RARITY_CONTEXT_PAYLOAD_VERSION,
  RARITY_DENOMINATOR_KIND,
  RARITY_DENOMINATOR_METHOD,
  RARITY_DENOMINATOR_VERSION,
  RARITY_METHODOLOGY_CODE,
  RARITY_ROUNDING,
  RARITY_UNIVERSE_LABEL_CODE,
  CONFIDENCE_ASSESSMENT_METHOD,
  CONFIDENCE_ASSESSMENT_VERSION,
  CURRENT_POPULATION_METHOD_VERSION,
  CURRENT_POPULATION_PAYLOAD_VERSION,
  RUN_INPUT_SCHEMA_VERSION,
  SURFACE_ELIGIBILITY_VERSION,
  WORKFLOW_VERSION,
} from "./version.js";
