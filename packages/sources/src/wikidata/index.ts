// Wikidata — TASK-073 (ADR-0030): famous bearers of a surname. Pure queries
// and summary (`bearers.ts`), the paced network half (`fetch.ts`) and the
// source record (`source.ts`).

export {
  WIKIDATA_BEARERS_KEPT,
  WIKIDATA_BEARERS_VERSION,
  WIKIDATA_DESCRIPTION_MAX_CHARS,
  WIKIDATA_EXCLUDED_PEOPLE,
  WIKIDATA_FAMILY_NAME_CLASSES,
  WIKIDATA_SPARQL_ENDPOINT,
  WikidataShapeError,
  exactBearers,
  keptBearers,
  nameEndsWithSurname,
  summariseWikidataBearers,
  wikidataBearersQuery,
  wikidataDetailsQuery,
  wikidataFamilyNameLabels,
  wikidataSurnameLabel,
} from "./bearers.js";
export type { WikidataBearer, WikidataBearers, WikidataCandidate } from "./bearers.js";
export {
  WIKIDATA_ATTEMPTS,
  WIKIDATA_MIN_INTERVAL_MS,
  WIKIDATA_USER_AGENT,
  WikidataPacer,
  WikidataRequestError,
  defaultWikidataFetchDeps,
  fetchWikidataBearers,
  wikidataQueryUrl,
} from "./fetch.js";
export type { FetchedWikidataBearers, WikidataFetchDeps } from "./fetch.js";
export {
  WIKIDATA_SOURCE_KEY,
  ensureWikidataSource,
  storeWikidataBearers,
  wikidataBearersHash,
  wikidataBearersRecordId,
  wikidataQueryPageUrl,
} from "./source.js";
export type { StoredWikidataBearers } from "./source.js";
