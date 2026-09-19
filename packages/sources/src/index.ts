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
  PESEL_SOURCE_KEY,
  PESEL_SOURCE,
  PESEL_RIGHTS_PROFILE,
  PESEL_NATIONAL_MALE_2026,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_RESOURCES_2026,
  findPeselResource,
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
export type { ImportPeselOptions } from "./importer.js";
export { assertReconciles, emptyReport, tallyReasons } from "./import-result.js";
export type {
  ImportFailureReason,
  ImportOutcome,
  QuarantinedRow,
  ReconciliationReport,
} from "./import-result.js";
