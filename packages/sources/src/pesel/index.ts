/**
 * `@name-atlas/sources/pesel` — PESEL ingestion (TASK-004).
 *
 * Split from the package's default entry on purpose: the default entry is the
 * pure source-format layer (decode, parse, schema) and has no database
 * access, while this entry writes to PostgreSQL. Keeping them apart means a
 * caller that only needs to validate bytes never pulls in the database.
 */
export {
  PESEL_CAPABILITIES,
  PESEL_GEOGRAPHY_LEVEL,
  PESEL_RESOURCE_ROLES,
  PESEL_SOURCE_REGISTRY,
  isPeselResourceRole,
  peselCoverageNotes,
  peselDatasetVersion,
  peselResource,
  peselUniverseDescription,
} from "./registry.js";
export type {
  CachePermission,
  PeselResourceEntry,
  PeselResourceRole,
  PeselSourceRegistry,
  RightsPermission,
  RightsProfileSeed,
  RightsReviewStatus,
  SourceGranularity,
  SourceProductionStatus,
  SourceReliabilityTier,
  SourceSeed,
  SourceType,
} from "./registry.js";
export { assertContentHash, sha256Hex } from "./checksum.js";
export { PeselImportError } from "./errors.js";
export type { PeselImportErrorCode } from "./errors.js";
export { mapPeselRow, mapPeselRows } from "./mapping.js";
export type { MappedPeselRow } from "./mapping.js";
export { assertIngestionAllowed, evaluateRightsGate } from "./rights.js";
export type { IngestionRights, RightsGateVerdict } from "./rights.js";
export { formatPeselImportReport, reconciles, tallyQuarantineReasons } from "./report.js";
export type {
  PeselImportDisposition,
  PeselImportReport,
  QuarantineReason,
  QuarantinedPeselRow,
} from "./report.js";
export {
  checkIngestionInvariants,
  checkNormalisationInvariants,
  countIngestionRows,
  importPeselResource,
} from "./import.js";
export type { IngestionRowCounts, PeselImportInput, PeselResourceMetadata } from "./import.js";
export { readPeselRegister } from "./read.js";
export type {
  PeselAbsentEntry,
  PeselListedEntry,
  PeselRegisterEntry,
  PeselRegisterReading,
} from "./read.js";
