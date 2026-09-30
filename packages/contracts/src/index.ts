/**
 * Shared API/data contracts package.
 *
 * Empty at TASK-001 by design. Contracts are canonical in
 * docs/canonical/16 (API and frontend data contract); this package will
 * hold the runtime schemas (Zod → JSON Schema → OpenAPI → client types)
 * once M2 introduces the first real endpoint (docs/contracts/README.md).
 *
 * CONTRACT_PACKAGE_VERSION exists only so the package has one real,
 * testable export and is not an empty module — it carries no product
 * meaning and must not be read as a schema version.
 */
export const CONTRACT_PACKAGE_VERSION = "0.0.0";

// --- TASK-006: the surname result read contract -------------------------
export {
  SURNAME_RESULT_SCHEMA_VERSION,
  apiErrorResponseSchema,
  citationSchema,
  confidenceSchema,
  distributionCoverageStateSchema,
  distributionEntrySchema,
  distributionSectionSchema,
  meaningConfidenceSchema,
  meaningInterpretationSchema,
  meaningSectionSchema,
  meaningStateSchema,
  numericValueStatusSchema,
  placeStatSchema,
  populationObservationSchema,
  populationSectionSchema,
  populationStateSchema,
  populationUnitSchema,
  populationValueSchema,
  rarityEntrySchema,
  rarityMetricSchema,
  raritySectionSchema,
  publicErrorCodeSchema,
  publicSurnameIdentitySchema,
  resultStatusSchema,
  suggestionSchema,
  suggestionsSectionSchema,
  surfaceEligibilitySchema,
  surnameResultRequestSchema,
  surnameResultResponseSchema,
} from "./surname-result.js";
export type {
  ApiErrorResponse,
  CitationDto,
  ConfidenceDto,
  DistributionCoverageState,
  DistributionEntry,
  DistributionSection,
  MeaningInterpretation,
  MeaningSection,
  NumericValueStatus,
  PlaceStat,
  PopulationObservation,
  PopulationSection,
  RarityEntry,
  RarityMetric,
  RaritySection,
  PopulationState,
  PopulationUnit,
  PopulationValue,
  PublicErrorCode,
  PublicSurnameIdentity,
  ResultStatus,
  Suggestion,
  SuggestionsSection,
  SurfaceEligibilityDto,
  SurnameResultRequest,
  SurnameResultResponse,
} from "./surname-result.js";
export {
  SURNAME_PREFIX_SCHEMA_VERSION,
  prefixItemSchema,
  surnamePrefixResponseSchema,
} from "./surname-prefix.js";
export type { PrefixItem, SurnamePrefixResponse } from "./surname-prefix.js";

// --- TASK-040: list facts (statistics about one whole published list) ---
export {
  LIST_FACTS_SCHEMA_VERSION,
  collisionPointSchema,
  expectedDistinctSchema,
  listAssessmentSchema,
  listCollisionSchema,
  listCrowdSchema,
  listFactsArtefactSchema,
  listFactsSchema,
  listPartitionSchema,
  listQuantileSchema,
  listSourceSchema,
  listSummarySchema,
  listThresholdSchema,
  reachHalfSchema,
} from "./list-facts.js";
export type { ListFacts, ListFactsArtefact, ListPartition } from "./list-facts.js";
