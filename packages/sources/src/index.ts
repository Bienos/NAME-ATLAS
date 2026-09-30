export {
  PESEL_HEADER,
  PESEL_COLUMNS,
  PESEL_COLUMN_COUNT,
  PESEL_DELIMITER,
  PESEL_LINE_TERMINATOR,
  PESEL_MIN_VALID_COUNT,
} from "./schema.js";
export type { PeselSourceRow } from "./schema.js";
export { decodePeselBytes } from "./decode.js";
export { parsePeselFile } from "./parser.js";
export { PeselSchemaError } from "./errors.js";

// --- TASK-004: source registry and bulk importer ------------------------
export {
  PESEL_REGIONAL_HEADER,
  PESEL_REGIONAL_COLUMNS,
  PESEL_REGIONAL_COLUMN_COUNT,
  PESEL_REGIONAL_GEOGRAPHY_VALUES,
  isPeselRegionalGeographyValue,
} from "./regional-schema.js";
export type { PeselRegionalGeographyValue, PeselRegionalSourceRow } from "./regional-schema.js";
export { parsePeselRegionalFile } from "./regional-parser.js";

export {
  PESEL_SOURCE_KEY,
  PESEL_SOURCE,
  PESEL_RIGHTS_PROFILE,
  PESEL_NATIONAL_MALE_2026,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_RESOURCES_2026,
  PESEL_REGIONAL_MALE_2026,
  PESEL_REGIONAL_FEMALE_2026,
  PESEL_REGIONAL_RESOURCES_2026,
  findPeselResource,
  nationalCounterpartOf,
} from "./registry.js";
export type {
  CachePermission,
  PeselResourceDescriptor,
  RightsPermission,
  RightsProfileSeed,
  RightsReviewStatus,
  SourceSeed,
} from "./registry.js";
export { importPeselResource, rightsRefusal, sha256Hex } from "./importer.js";
export { importPeselRegionalResource } from "./regional-importer.js";
export type { ImportPeselRegionalOptions } from "./regional-importer.js";
export {
  readVoivodeshipCorrespondence,
  seedVoivodeshipPlaces,
  TERYT_PROVIDER_KEY,
} from "./voivodeships.js";
export type { VoivodeshipCorrespondence, VoivodeshipSeedReport } from "./voivodeships.js";
export type { ImportPeselOptions } from "./importer.js";
export {
  assertReconciles,
  assertRegionalReconciles,
  emptyReport,
  emptyRegionalReport,
  tallyReasons,
} from "./import-result.js";
export type {
  FlaggedRow,
  ImportFailureReason,
  ImportOutcome,
  QuarantinedRow,
  ReconciliationReport,
  RegionalImportOutcome,
  RegionalReconciliationReport,
} from "./import-result.js";

// Onomastic (meaning/origin) sources — TASK-022, ADR-0008.
export {
  ADMISSIBLE_RELIABILITY_TIERS,
  importOnomasticSource,
  licenceNote,
  onomasticContentHash,
  parseOnomasticSource,
} from "./onomastics.js";
export type {
  AdmissibleReliabilityTier,
  FormationType,
  ImportOnomasticOptions,
  ImportOnomasticOutcome,
  LicenceBasis,
  OnomasticEntry,
  OnomasticSourceFile,
  OnomasticWork,
  ParseOutcome,
} from "./onomastics.js";
export { applySlice, filingLetter, parseSliceSpec, SliceSpecError } from "./slice.js";
export type { LinedRow, SliceSpec } from "./slice.js";

// Polona (Biblioteka Cyfrowa Polona) — TASK-031 source spike: a pure,
// fail-closed parser for the captured response shapes. No database, no network.
export * from "./polona/index.js";

// Source catalogue — TASK-038: every researched source as a registry row,
// seeded idempotently. Registry data only; it fetches and ingests nothing.
export * from "./catalogue/index.js";

// TERYT localities — TASK-039: TERC + SIMC into places, names, external ids
// and administrative memberships. Geography infrastructure, never surname evidence.
export * from "./teryt/index.js";
