/**
 * @name-atlas/truth — the current-surname truth chains: CURRENT_POPULATION
 * (TASK-005), CURRENT_RANK (TASK-009), RARITY_CONTEXT (TASK-014) and
 * CURRENT_DISTRIBUTION (TASK-012).
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
export {
  readCurrentDistribution,
  readCurrentPopulation,
  readRarityContext,
  readSurnameMeaning,
} from "./read.js";
export type { PersistedInterpretation, PersistedSurnameMeaning } from "./read.js";
export type {
  PersistedCurrentDistribution,
  PersistedCurrentPopulation,
  PersistedDistributionEntry,
  PersistedRarityContext,
} from "./read.js";
export { querySurnameResult } from "./query.js";
export type { SurnameQueryOptions, SurnameQueryOutcome } from "./query.js";
export {
  buildRankTable,
  competitionRank,
  currentRankClaimKey,
  deriveCurrentRank,
  rankInTable,
} from "./rank.js";
export type { DeriveRankOptions, RankTable, RankTableCache } from "./rank.js";
export {
  deriveRarityContext,
  rarityContextClaimKey,
  oneInX,
  shareOf,
  publishedUniverseSum,
} from "./rarity.js";
export type { DeriveRarityOptions, UniverseSumCache } from "./rarity.js";
export {
  coverageRatio,
  coverageState,
  coveredSetSum,
  currentDistributionClaimKey,
  deriveCurrentDistribution,
  shareOfCovered,
} from "./distribution.js";
export type { DeriveDistributionOptions } from "./distribution.js";
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
// Per-asset rights (ADR-0007, resolving D-003).
export {
  ASSET_KINDS,
  asPermission,
  attributionFor,
  classifyRightsState,
  completeRights,
  connectorExecutable,
  evaluateAsset,
  evaluateRightsMatrix,
  excerptTranscription,
  mostRestrictive,
  paidSurfaceEligible,
  reproductionEligible,
  resolveEffectiveRights,
  TRANSCRIPTION_EXCERPT_MAX_CHARS,
} from "./rights.js";
export type {
  AssetDecision,
  AssetEligibility,
  AssetKind,
  FullRights,
  Permission,
  RightsLayer,
  RightsState,
  TranscriptionExcerpt,
} from "./rights.js";
export { loadEffectiveRights } from "./rights-load.js";
export type { RightsLoadRequest } from "./rights-load.js";
export type {
  CanonicalSurnameIdentity,
  CitationProjection,
  ConfidenceProjection,
  CurrentDistributionClaimResult,
  CurrentPopulationClaimResult,
  CurrentRankClaimResult,
  DistributionCoverageState,
  DistributionEntryResult,
  NoRankReason,
  NoResultReason,
  RankUniverse,
  RarityContextClaimResult,
  SurnameDistributionResult,
  SurnameRankResult,
  SurnameRarityResult,
  SurnameTruthResult,
} from "./result.js";
export {
  CURRENT_DISTRIBUTION_METHOD_VERSION,
  CURRENT_DISTRIBUTION_PAYLOAD_VERSION,
  DISTRIBUTION_COVERAGE_BASIS,
  DISTRIBUTION_DENOMINATOR_KIND,
  DISTRIBUTION_DENOMINATOR_METHOD,
  DISTRIBUTION_DENOMINATOR_VERSION,
  DISTRIBUTION_LOW_COVERAGE_THRESHOLD,
  DISTRIBUTION_SHARE_PRECISION,
  DISTRIBUTION_UNIVERSE_KIND,
  DISTRIBUTION_UNIVERSE_LABEL_CODE,
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

// The SURNAME_MEANING chain — TASK-022, ADR-0008.
export {
  deriveSurnameMeaning,
  distinctWorks,
  interpretationsAgree,
  loadInterpretations,
  surnameMeaningClaimKey,
} from "./meaning.js";
export type {
  DeriveMeaningOptions,
  OnomasticInterpretation,
  SurnameMeaningClaimResult,
  SurnameMeaningResult,
} from "./meaning.js";
export { assessSurnameMeaning } from "./confidence.js";
export type { MeaningConfidenceInputs } from "./confidence.js";
export { regionalUniverseSize, universeSize } from "./universe.js";
export type { UniverseSizeCache } from "./universe.js";
export { mostCommonSurnames } from "./common.js";
export type { CommonSurname, CommonSurnameList } from "./common.js";
export { COVERAGE_BANDS, COVERAGE_FAMILIES, coverageMarkdown, coverageReport } from "./coverage.js";
export type { CoverageBand, CoverageCell, CoverageFamily, ResourceCoverage } from "./coverage.js";
