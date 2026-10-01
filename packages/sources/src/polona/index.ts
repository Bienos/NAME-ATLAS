// Polona (Biblioteka Cyfrowa Polona) — TASK-031 source spike.
//
// Pure and database-free: every function here takes the bytes Polona served
// and either returns what they say or throws a `PolonaShapeError`. The
// connector that will call Polona is a later task; see docs/sources/polona.md.

export { PolonaShapeError } from "./errors.js";
export type { PolonaDriftReason } from "./errors.js";
export {
  parsePolonaFulltextHit,
  parsePolonaFulltextSearch,
  parsePolonaMetadataHit,
  parsePolonaSearchEnvelope,
  parsePolonaSimpleSearch,
} from "./search.js";
export type {
  ParsePolonaSearchOptions,
  PolonaFacetValue,
  PolonaField,
  PolonaFieldGroup,
  PolonaFulltextHit,
  PolonaMetadataHit,
  PolonaObjectType,
  PolonaSearchEnvelope,
  PolonaSearchPage,
} from "./search.js";
export {
  parsePolonaDigitalObjectDetails,
  parsePolonaDigitalObjectFrontOfficeDetails,
  parsePolonaVirtualObjectFrontOfficeDetails,
} from "./objects.js";
export type {
  PolonaDigitalObjectDetails,
  PolonaDigitalObjectFrontOfficeDetails,
  PolonaIdentification,
  PolonaInstance,
  PolonaObjectMetadata,
  PolonaVirtualObjectFrontOfficeDetails,
} from "./objects.js";
export { ALTO_V2_NAMESPACE, parsePolonaAltoPage } from "./alto.js";
export type { PolonaAltoBox, PolonaAltoLine, PolonaAltoPage, PolonaAltoString } from "./alto.js";
export {
  POLONA_LICENCES,
  POLONA_RIGHTS_MAPPING,
  POLONA_RIGHTS_STATEMENTS,
  classifyPolonaRights,
  polonaLicence,
  polonaRightsLayer,
} from "./rights.js";
export type {
  PolonaLicence,
  PolonaLicenceKey,
  PolonaPermission,
  PolonaRights,
  PolonaRightsLayer,
  PolonaRightsMappingRow,
  PolonaRightsObservation,
  PolonaStatementKey,
} from "./rights.js";
export {
  POLONA_API_BASE,
  POLONA_EXAMPLES_KEPT,
  POLONA_EXCERPT_MAX_CHARS,
  POLONA_INVENTORY_REQUEST_COUNT,
  POLONA_INVENTORY_VERSION,
  POLONA_PERIODS,
  polonaExcerpt,
  polonaInventoryRequests,
  polonaQuery,
  summarisePolonaInventory,
} from "./inventory.js";
export type {
  PolonaCount,
  PolonaExample,
  PolonaInventory,
  PolonaPeriodCount,
  PolonaRequest,
} from "./inventory.js";
export {
  POLONA_MIN_INTERVAL_MS,
  POLONA_USER_AGENT,
  PolonaPacer,
  PolonaRequestError,
  defaultPolonaFetchDeps,
  fetchPolonaInventory,
} from "./fetch.js";
export type { FetchedPolonaInventory, PolonaFetchDeps } from "./fetch.js";
export {
  POLONA_RIGHTS_PROFILE,
  POLONA_SOURCE,
  POLONA_SOURCE_KEY,
  ensurePolonaSource,
  polonaInventoryHash,
  polonaInventoryRecordId,
  storePolonaInventory,
} from "./source.js";
export type { StoredPolonaInventory } from "./source.js";
