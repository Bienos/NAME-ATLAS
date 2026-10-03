export {
  GIVEN_NAME_PLACEHOLDERS,
  GIVEN_NAME_RESOURCES_2026,
  GIVEN_NAMES_FIRST_FEMALE_2026,
  GIVEN_NAMES_FIRST_HEADER,
  GIVEN_NAMES_FIRST_MALE_2026,
  GIVEN_NAMES_RIGHTS_PROFILE,
  GIVEN_NAMES_SOURCE,
  GIVEN_NAMES_SOURCE_KEY,
  needsFormReview,
} from "./registry.js";
export type { GivenNameResourceDescriptor, GivenNameSourceSeed } from "./registry.js";
export { parseGivenNameFile } from "./parser.js";
export type { GivenNameSourceRow } from "./parser.js";
export { importGivenNameResource } from "./importer.js";
export type {
  GivenNameImportOutcome,
  GivenNameImportReport,
  ImportGivenNamesOptions,
} from "./importer.js";
