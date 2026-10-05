// Wikidata — TASK-073 (ADR-0030): famous bearers of a surname. Pure queries
// and summary (`bearers.ts`), the paced network half (`fetch.ts`) and the
// source record (`source.ts`). Since TASK-140 (ADR-0044) also in batches.

export {
  WIKIDATA_BEARERS_KEPT,
  WIKIDATA_BEARERS_VERSION,
  WIKIDATA_DESCRIPTION_MAX_CHARS,
  WIKIDATA_EXCLUDED_PEOPLE,
  WIKIDATA_FAMILY_NAME_CLASSES,
  WIKIDATA_POLISH_STATES,
  WIKIDATA_SPARQL_ENDPOINT,
  WikidataShapeError,
  batchBearers,
  exactBearers,
  keptBearers,
  nameEndsWithSurname,
  statedYears,
  summariseCandidates,
  summariseWikidataBearers,
  wikidataBearersBatchQuery,
  wikidataBearersQuery,
  wikidataDetailsById,
  wikidataDetailsQuery,
  wikidataFamilyNameLabels,
  wikidataSurnameLabel,
} from "./bearers.js";
export type {
  WikidataBearer,
  WikidataBearers,
  WikidataCandidate,
  WikidataDetails,
} from "./bearers.js";
export {
  WIKIDATA_ATTEMPTS,
  WIKIDATA_DETAILS_PER_QUERY,
  WIKIDATA_MIN_INTERVAL_MS,
  WIKIDATA_USER_AGENT,
  WikidataPacer,
  WikidataRequestError,
  defaultWikidataFetchDeps,
  fetchWikidataBearers,
  fetchWikidataBearersBatch,
  wikidataQueryUrl,
} from "./fetch.js";
export type { FetchedWikidataBearers, WikidataBatchOutcome, WikidataFetchDeps } from "./fetch.js";
export {
  WIKIDATA_SOURCE_KEY,
  ensureWikidataSource,
  storeWikidataBearers,
  wikidataBearersHash,
  wikidataBearersRecordId,
  wikidataQueryPageUrl,
} from "./source.js";
export type { StoredWikidataBearers } from "./source.js";
