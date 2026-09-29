// Polona (Biblioteka Cyfrowa Polona) — TASK-031 source spike.
//
// Pure and database-free: every function here takes the bytes Polona served
// and either returns what they say or throws a `PolonaShapeError`. The
// connector that will call Polona is a later task; see docs/sources/polona.md.

export { PolonaShapeError } from "./errors.js";
export type { PolonaDriftReason } from "./errors.js";
export { parsePolonaFulltextSearch, parsePolonaSimpleSearch } from "./search.js";
export type {
  ParsePolonaSearchOptions,
  PolonaFacetValue,
  PolonaField,
  PolonaFieldGroup,
  PolonaFulltextHit,
  PolonaMetadataHit,
  PolonaObjectType,
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
