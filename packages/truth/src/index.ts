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
  readDistributionShift,
  readRarityContext,
  readSurnameMeaning,
} from "./read.js";
export type { PersistedInterpretation, PersistedSurnameMeaning } from "./read.js";
export type {
  PersistedCurrentDistribution,
  PersistedCurrentPopulation,
  PersistedDistributionEntry,
  PersistedDistributionShift,
  PersistedRarityContext,
} from "./read.js";
export { querySurnameResult } from "./query.js";
export {
  NEIGHBOUR_SPAN,
  OTHER_FORM_RULE,
  otherGrammaticalForm,
  readOtherForm,
  readRankNeighbours,
} from "./neighbours.js";
export type { OtherForm, RankNeighbour, RankNeighbourList } from "./neighbours.js";
export { TERYT_NOT_LOADED, localitiesSectionFor } from "./localities.js";
export {
  archiveAvailabilityClaimKey,
  archiveSectionFor,
  deriveArchiveAvailability,
  projectArchiveSection,
  readArchiveAvailability,
  selectArchiveCandidates,
} from "./archive.js";
export type {
  ArchiveCandidate,
  ArchiveDerivation,
  PersistedArchiveAvailability,
} from "./archive.js";
export {
  bearersSectionFor,
  bearersShownOn,
  deriveNotableBearers,
  notableBearersClaimKey,
  projectBearersSection,
  readNotableBearers,
  selectBearersCandidates,
} from "./bearers.js";
export type { BearersCandidate, BearersDerivation, PersistedNotableBearers } from "./bearers.js";
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
  buildShift,
  deriveDistributionShift,
  deriveDistributionShiftFor,
  distributionShiftClaimKey,
  distributionShiftClaimKeyPrefix,
  loadEditionValues,
  loadOfficialEditions,
  percentChange,
  registryShiftEditions,
  SHIFT_ROLES,
  shiftStructuredValue,
} from "./shift.js";
export type {
  AbsentPoint,
  DeriveShiftOptions,
  DistributionShiftClaimResult,
  EditionValueRow,
  KnownPoint,
  LoadedEdition,
  ShiftBuild,
  ShiftEdition,
  ShiftEditions,
  ShiftEditionSet,
  ShiftEnd,
  ShiftGap,
  ShiftPoint,
  ShiftRole,
  ShiftSummary,
  SurnameShiftResult,
} from "./shift.js";
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
  DISTRIBUTION_SHIFT_METHOD_VERSION,
  DISTRIBUTION_SHIFT_ROUNDING,
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
  ARCHIVE_AVAILABILITY_METHOD_VERSION,
  ARCHIVE_CONFIDENCE_ASSESSMENT_METHOD,
  ARCHIVE_CONFIDENCE_ASSESSMENT_VERSION,
  ARCHIVE_REFRESH_DAYS,
  BEARERS_CONFIDENCE_ASSESSMENT_METHOD,
  BEARERS_CONFIDENCE_ASSESSMENT_VERSION,
  BEARERS_REFRESH_DAYS,
  BEARERS_SHOWN_FREE,
  NOTABLE_BEARERS_METHOD_VERSION,
} from "./version.js";

// The SURNAME_MEANING chain — TASK-022, ADR-0008.
export {
  deriveSurnameMeaning,
  distinctWorks,
  interpretationsAgree,
  loadInterpretations,
  meaningRootKey,
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
export {
  assessCoverage,
  assessResponse,
  COVERAGE_ASSESSMENT_VERSION,
  COVERAGE_AVAILABILITIES,
  COVERAGE_DIMENSIONS,
  COVERAGE_TIERS,
  coverageRun,
  coverageRunMarkdown,
  coverageTier,
  forEachActiveSurname,
} from "./coverage-assessment.js";
export type {
  CoverageAssessment,
  CoverageAssessmentOutcome,
  CoverageAvailability,
  CoverageDimension,
  CoverageDimensionName,
  CoveragePeople,
  CoverageRunOptions,
  CoverageRunTally,
  CoverageTier,
} from "./coverage-assessment.js";
export type { CoverageBand, CoverageCell, CoverageFamily, ResourceCoverage } from "./coverage.js";
// The DiscoveryIndex — TASK-116, PRE-001: what a paid report could truthfully count.
export {
  buildDiscoveryIndex,
  DISCOVERY_CATEGORIES,
  DISCOVERY_COUNT_SEMANTICS,
  DISCOVERY_INDEX_VERSION,
  discoveryIndexOf,
  discoveryRun,
  discoveryRunMarkdown,
  originAlternatives,
  worksCited,
} from "./discovery-index.js";
export type {
  DiscoveryCategory,
  DiscoveryCategoryTally,
  DiscoveryIndex,
  DiscoveryIndexEntry,
  DiscoveryIndexOutcome,
  DiscoveryListTally,
  DiscoveryRunTally,
} from "./discovery-index.js";
// Premium eligibility — TASK-117, PRE-002: whether a paid report may be offered.
export {
  assessPremiumEligibility,
  PREMIUM_ELIGIBILITY_STATES,
  PREMIUM_ELIGIBILITY_VERSION,
  PREMIUM_INELIGIBILITY_REASONS,
  premiumEligibilityOf,
  premiumEligibilityRun,
  premiumEligibilityRunMarkdown,
} from "./premium-eligibility.js";
export type {
  PremiumCategory,
  PremiumEligibility,
  PremiumEligibilityOutcome,
  PremiumEligibilityRunTally,
  PremiumEligibilityState,
  PremiumIneligibilityReason,
} from "./premium-eligibility.js";
// Given-name claims — TASK-122, ADR-0032 §6: first-name counts and ranks per list.
export {
  deriveAllGivenNames,
  deriveGivenName,
  givenNamePopulationClaimKey,
  givenNameRankClaimKey,
  newGivenNameRunCache,
} from "./given-name.js";
export type {
  GivenNameClaimOutcome,
  GivenNameDerivationOutcome,
  GivenNameListResult,
  GivenNameRunCache,
  GivenNameRunOptions,
  GivenNameRunTally,
} from "./given-name.js";
export { GIVEN_NAME_POPULATION_METHOD_VERSION, GIVEN_NAME_RANK_METHOD_VERSION } from "./version.js";
// The frozen surname report — TASK-119, RPT-001: internal test versions only.
export {
  buildReport,
  isReportVersionId,
  readReportVersion,
  REPORT_SCHEMA_VERSION,
  REPORT_SECTION_TYPES,
  reportSectionsOf,
} from "./report.js";
export type {
  BuildReportOutcome,
  PresentationRole,
  ReportClaim,
  ReportClaimReference,
  ReportPayload,
  ReportSection,
  ReportSectionType,
  StoredReportVersion,
} from "./report.js";

// List facts — TASK-040, ADR-0015: statistics about one whole published list,
// derived offline into a committed artefact. The web app reads `listFacts()`.
export { listFacts } from "./list-facts/artefact.js";
export {
  LIST_COLLISION_METHOD_VERSION,
  LIST_CROWD_METHOD_VERSION,
  LIST_FACTS_METHOD_VERSION,
  LIST_SUMMARY_METHOD_VERSION,
} from "./version.js";
