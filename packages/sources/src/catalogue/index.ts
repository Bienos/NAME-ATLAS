/**
 * The source catalogue registry seed (TASK-038), re-exported from the
 * package's single entry.
 */
export {
  CLASSIFIED_CHECKED_AT,
  MVP_LABEL_PRODUCTION_STATUS,
  PERMISSION_DIMENSIONS,
  RESEARCH_CHECKED_AT,
  SOURCE_CATALOGUE,
} from "./catalogue.js";
export type {
  CanonicalMvpLabel,
  CatalogueBasis,
  CatalogueEntry,
  CatalogueSourceSeed,
  PermissionDimension,
} from "./catalogue.js";
export { RESERVED_SOURCE_KEYS, SourceCatalogueError, validateSourceCatalogue } from "./validate.js";
export { formatSourceCatalogueSeedReport, seedSourceCatalogue } from "./seed.js";
export type { SourceCatalogueSeedReport } from "./seed.js";
