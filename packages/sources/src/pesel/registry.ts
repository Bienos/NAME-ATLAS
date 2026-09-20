/**
 * PESEL source registry (TASK-004 §6 item 2; docs/canonical/12 §5).
 *
 * `SourceRegistry` is configuration/data, not scattered code constants — so
 * the whole registry entry lives here as one frozen object, and the importer
 * reads it rather than assembling literals at the call site.
 *
 * EVERY VALUE BELOW IS TRACEABLE. Each field carries the repository
 * evidence it came from: `fixtures/pesel/source-manifest.json`,
 * `docs/sources/pesel.md`, the verbatim publisher metadata captured under
 * `docs/sources/acquisition/2026-09-18/metadata/`, or a canonical document.
 * A field with no evidence is `UNKNOWN` or `null` with the gap stated —
 * never an optimistic default (TASK-004 AC-08, AC-09, AC-25).
 *
 * Nothing here is interpreted. In particular the male/female partition is
 * recorded using the publisher's own Polish wording and explicitly marked as
 * not disambiguated by the publisher (TASK-004 §5 row 7, §14 U-1).
 */

/** docs/canonical/11 §9.4 `RightsPermission`. */
export type RightsPermission = "ALLOWED" | "CONDITIONAL" | "PROHIBITED" | "UNKNOWN";

/** docs/canonical/11 §9.4 `CachePermission`. */
export type CachePermission = "ALLOWED" | "LIMITED" | "PROHIBITED" | "UNKNOWN";

/** docs/canonical/11 §9.4 `RightsReviewStatus`. */
export type RightsReviewStatus =
  "APPROVED" | "CONDITIONAL" | "LEGAL_REVIEW_REQUIRED" | "BLOCKED" | "EXPIRED";

/** docs/canonical/11 §9.1 `SourceType`. */
export type SourceType =
  | "OFFICIAL_DATASET"
  | "ARCHIVE"
  | "DIGITAL_LIBRARY"
  | "ACADEMIC"
  | "DICTIONARY"
  | "PUBLICATION"
  | "COMMERCIAL_DATABASE"
  | "COMMUNITY_INDEX"
  | "OTHER";

/** docs/canonical/11 §9.1 `SourceGranularity`. */
export type SourceGranularity = "SURNAME" | "PERSON" | "PLACE" | "DOCUMENT" | "MIXED";

/** docs/canonical/11 §9.1 `SourceReliabilityTier`. */
export type SourceReliabilityTier =
  "A_PRIMARY_OFFICIAL" | "B_AUTHORITATIVE_INDEX" | "C_SCHOLARLY_SECONDARY" | "D_TERTIARY_LEAD";

/** docs/canonical/11 §9.1 `SourceProductionStatus`. */
export type SourceProductionStatus =
  "APPROVED" | "PARTNERSHIP_REQUIRED" | "LEGAL_REVIEW_REQUIRED" | "BLOCKED" | "DEPRECATED";

/** The rights dimensions the hard gate and the seeded profile share. */
export interface RightsProfileSeed {
  readonly terms_version: string | null;
  readonly terms_hash: string | null;
  /**
   * When the rights EVIDENCE was last examined — not a legal review, of
   * which none has been performed. A fixed constant, never `now()`, so the
   * seeded row is deterministic (TASK-004 AC-02).
   */
  readonly checked_at: string;
  readonly metadata_rights: RightsPermission;
  readonly image_rights: RightsPermission;
  readonly transcription_rights: RightsPermission;
  readonly database_rights: RightsPermission;
  readonly automated_access: RightsPermission;
  readonly commercial_use: RightsPermission;
  readonly redistribution: RightsPermission;
  readonly local_cache: CachePermission;
  readonly attribution_required: boolean;
  readonly attribution_text: string | null;
  readonly source_owner: string | null;
  readonly rights_url: string | null;
  readonly contact_required: boolean;
  readonly review_status: RightsReviewStatus;
  readonly valid_from: string | null;
  readonly valid_to: string | null;
  readonly notes: string;
}

export interface SourceSeed {
  readonly source_key: string;
  readonly name: string;
  readonly publisher: string;
  readonly source_type: SourceType;
  readonly granularity: SourceGranularity;
  readonly geographic_scope: readonly string[];
  readonly temporal_from: string | null;
  readonly temporal_to: string | null;
  readonly methodology_notes: string;
  readonly authority_tier: SourceReliabilityTier;
  readonly production_status: SourceProductionStatus;
  readonly homepage_or_reference_url: string;
}

/** Which national resource an import run is about. */
export type PeselResourceRole = "national_male" | "national_female";

export interface PeselResourceEntry {
  readonly role: PeselResourceRole;
  /** The publisher's own resource id — becomes `external_record_id`. */
  readonly resource_id: string;
  /** The publisher's own resource title, verbatim. */
  readonly resource_title: string;
  /**
   * The publisher's own resource description, verbatim, with the HTML
   * paragraph wrapper the API response carries stripped and nothing else
   * changed. This is the text AC-17 requires the snapshot to quote.
   */
  readonly resource_description: string;
  /** The PESEL reference date — what the data describes. Never a portal timestamp. */
  readonly data_date: string;
  /** Portal metadata timestamp. A different, later date than `data_date`. */
  readonly portal_modified_at: string;
  /** The stable endpoint the CSV representation is fetched from. */
  readonly csv_download_url: string;
  /** SHA-256 of the official full CSV resource. NEVER a fixture's checksum. */
  readonly official_csv_sha256: string;
  readonly official_csv_byte_size: number;
  readonly official_csv_row_count_excluding_header: number;
  /** When the project owner fetched the official bytes. */
  readonly official_retrieved_at: string;
  /** Stable method identifier recorded on every snapshot from this resource. */
  readonly methodology_key: string;
  /**
   * Snapshots may be compared quantitatively only within one group
   * (docs/canonical/11 §6.1). Scoped to one partition AND one state date, so
   * neither the male/female partitions nor two annual editions are ever
   * implied to be comparable (TASK-004 §8, AC-17).
   */
  readonly comparability_group: string;
}

export interface PeselSourceRegistry {
  readonly source: SourceSeed;
  readonly rights: RightsProfileSeed;
  readonly dataset_id: string;
  readonly resources: Readonly<Record<PeselResourceRole, PeselResourceEntry>>;
}

/**
 * Rights posture for the PESEL dataset, as answered by the project owner
 * (TASK-004 §14 U-2, accepted as proposed).
 *
 * Evidence: dataset-level `license_name = "CC0 1.0"`, read from the portal's
 * own dataset metadata response. Resource-level metadata carries no licence,
 * rights or terms attribute at all — verified across the full attribute set
 * of the captured resource responses. No legal review has been performed by
 * anyone, which is why `review_status` states exactly that rather than
 * claiming approval.
 *
 * `automated_access` and `commercial_use` are ALLOWED on the strength of the
 * dataset-level CC0 dedication, which is what lets ingestion proceed
 * (docs/canonical/12 §6.4's hard gate does not fire). `image_rights` and
 * `transcription_rights` are UNKNOWN: a two-column CSV has no image or
 * transcription surface, so this project holds no evidence about either and
 * will not guess one (AC-08).
 */
const PESEL_RIGHTS: RightsProfileSeed = {
  terms_version: "CC0 1.0",
  terms_hash: null,
  checked_at: "2026-09-19T00:00:00Z",
  metadata_rights: "ALLOWED",
  image_rights: "UNKNOWN",
  transcription_rights: "UNKNOWN",
  database_rights: "ALLOWED",
  automated_access: "ALLOWED",
  commercial_use: "ALLOWED",
  redistribution: "ALLOWED",
  local_cache: "ALLOWED",
  attribution_required: false,
  attribution_text: null,
  source_owner: "Ministerstwo Cyfryzacji",
  rights_url: null,
  contact_required: false,
  review_status: "LEGAL_REVIEW_REQUIRED",
  valid_from: null,
  valid_to: null,
  notes:
    "Licence evidence is DATASET-LEVEL ONLY. dane.gov.pl dataset 1681 states " +
    'license_name = "CC0 1.0" in its own metadata response. Resource-level metadata for ' +
    "resources 1148808 and 1148811 carries no licence, rights or terms attribute at all, so " +
    "resource inheritance of that dedication is an assumption this project has NOT verified " +
    "(fixtures/pesel/source-manifest.json licence_provenance; docs/DECISIONS_NEEDED.md D-004). " +
    "NO LEGAL REVIEW HAS BEEN PERFORMED. review_status therefore records " +
    "LEGAL_REVIEW_REQUIRED, which is a statement of fact about the review, not a restriction " +
    "inferred from the licence. checked_at is when the rights evidence was last examined, not " +
    "a review date. automated_access and commercial_use are ALLOWED on the strength of the " +
    "dataset-level CC0 dedication, which permits internal ingestion; paid-surface eligibility " +
    "stays blocked until a human review (ARCHITECTURE.md §10 invariant 13). attribution_text " +
    "is null because CC0 1.0 requires no attribution; rights_url is null because no " +
    "rights-specific URL was recorded — the licence statement lives in the dataset metadata " +
    "response cited above. Decided by the project owner, TASK-004 §14 U-2.",
};

const PESEL_SOURCE: SourceSeed = {
  source_key: "pl_pesel_surnames",
  name: "Nazwiska występujące w rejestrze PESEL",
  publisher: "Ministerstwo Cyfryzacji",
  source_type: "OFFICIAL_DATASET",
  granularity: "SURNAME",
  geographic_scope: ["PL"],
  // The dataset publishes annual snapshots and this project has pinned only
  // the 2026-01-20 state, so a dataset-level coverage range is not
  // established. Left null rather than narrowed to one edition's date.
  temporal_from: null,
  temporal_to: null,
  methodology_notes:
    "Counts of current surname values ('nazwisko aktualne') held for living persons in the " +
    "PESEL register, at a stated reference date. Surnames occurring exactly once are excluded " +
    "by the publisher; that suppression rule is confirmed directly from the resource bytes " +
    "(docs/sources/pesel.md). A surname absent from a resource is therefore " +
    "BELOW_PUBLICATION_THRESHOLD_OR_ABSENT, never a confirmed zero (docs/canonical/12 §9.5). " +
    "The publisher does not state whether one occurrence equals one living person, so no " +
    "population statement may be derived from a count without resolving that first " +
    "(TASK-004 §14 U-4, carried forward to TASK-005). Update frequency: yearly. " +
    "Regional resources exist but are not adopted (docs/DECISIONS_NEEDED.md D-004); this " +
    "source is ingested as national only.",
  authority_tier: "A_PRIMARY_OFFICIAL",
  // Matches the rights profile's review_status: the source is wanted and
  // lawful to ingest internally, and awaits a legal review before any paid
  // surface uses it. Authority tier and rights status are independent
  // (docs/canonical/11 §9.1).
  production_status: "LEGAL_REVIEW_REQUIRED",
  homepage_or_reference_url:
    "https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel",
};

/**
 * The two national production resources, pinned by TASK-002.
 *
 * `official_csv_sha256` is the checksum of the FULL official resource. It is
 * never the checksum of a repository fixture: the committed fixtures are
 * 22- and 23-row excerpts, and presenting an excerpt as matching the
 * official file would be a false provenance claim (TASK-004 §12 rule 1).
 * The importer therefore takes the expected checksum as an explicit
 * argument instead of reading it from here.
 */
const PESEL_RESOURCES: Record<PeselResourceRole, PeselResourceEntry> = {
  national_male: {
    role: "national_male",
    resource_id: "1148808",
    resource_title: "Nazwiska męskie - stan na 2026-01-20",
    resource_description:
      "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w " +
      "rejestrze PESEL, stan na 20.01.2026",
    data_date: "2026-01-20",
    portal_modified_at: "2026-01-28T13:47:34Z",
    csv_download_url:
      "https://api.dane.gov.pl/resources/1148808,nazwiska-meskie-stan-na-2026-01-20/csv",
    official_csv_sha256: "ce4238feda85e75c73b16a229eb8afc1dfccb8854a7809111ab85fb8672b62f4",
    official_csv_byte_size: 5293415,
    official_csv_row_count_excluding_header: 408182,
    official_retrieved_at: "2026-09-18T17:40:00Z",
    methodology_key: "pl_pesel_national_surname_counts/nazwiska_meskie/v1",
    comparability_group: "pl_pesel_national/nazwiska_meskie/2026-01-20",
  },
  national_female: {
    role: "national_female",
    resource_id: "1148811",
    resource_title: "Nazwiska żeńskie - stan na 2026-01-20",
    resource_description:
      "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w " +
      "rejestrze PESEL, stan na 20.01.2026",
    data_date: "2026-01-20",
    portal_modified_at: "2026-01-28T13:48:39Z",
    csv_download_url:
      "https://api.dane.gov.pl/resources/1148811,nazwiska-zenskie-stan-na-2026-01-20/csv",
    official_csv_sha256: "c508680d084dd21949ca7c817339fd63d31342ee5318320c5266c6bf4909f6e6",
    official_csv_byte_size: 5592881,
    official_csv_row_count_excluding_header: 420082,
    official_retrieved_at: "2026-09-18T17:39:46Z",
    methodology_key: "pl_pesel_national_surname_counts/nazwiska_zenskie/v1",
    comparability_group: "pl_pesel_national/nazwiska_zenskie/2026-01-20",
  },
};

export const PESEL_SOURCE_REGISTRY: PeselSourceRegistry = Object.freeze({
  source: Object.freeze(PESEL_SOURCE),
  rights: Object.freeze(PESEL_RIGHTS),
  dataset_id: "1681",
  resources: Object.freeze(PESEL_RESOURCES),
});

/** Every role in the registry, in a fixed order. */
export const PESEL_RESOURCE_ROLES: readonly PeselResourceRole[] = Object.freeze([
  "national_male",
  "national_female",
]);

export function isPeselResourceRole(value: string): value is PeselResourceRole {
  return (PESEL_RESOURCE_ROLES as readonly string[]).includes(value);
}

export function peselResource(role: PeselResourceRole): PeselResourceEntry {
  return PESEL_SOURCE_REGISTRY.resources[role];
}

/**
 * The geography every snapshot from these resources carries. The resources'
 * own `regions` attribute is `[{name: "Polska"}]` — national, with no
 * regional field of any kind — so the connector declares
 * `regional_distribution = false` and a national count is never
 * extrapolated into a region (docs/canonical/12 §9.8).
 */
export const PESEL_GEOGRAPHY_LEVEL = "NATIONAL" as const;

/** Declared connector capabilities (docs/canonical/12 §9.8). */
export const PESEL_CAPABILITIES = Object.freeze({
  regional_distribution: false,
});

/**
 * Coverage limitations recorded on every snapshot, verbatim. States the
 * suppression rule, the absence-is-not-zero consequence, and — per the
 * project owner's answer to §14 U-1 — that the publisher does not
 * disambiguate what the male/female split partitions.
 */
export function peselCoverageNotes(resource: PeselResourceEntry): string {
  return (
    `Partition recorded verbatim from the publisher: "${resource.resource_title}" — ` +
    `"${resource.resource_description}". THE PARTITION BASIS IS NOT DISAMBIGUATED BY THE ` +
    "PUBLISHER: whether the two resources split by the bearer's sex or by the grammatical " +
    "gender of the surname form is not stated in any metadata this project has verified. The " +
    "two partitions must therefore never be summed, merged or compared, and no total across " +
    "them may be computed (TASK-004 §14 U-1, answered by the project owner: record the " +
    "publisher's wording, state the gap, forbid summation). " +
    "Suppression: the publisher excludes surnames occurring exactly once, confirmed directly " +
    "from the resource bytes. A surname absent from this resource is " +
    "BELOW_PUBLICATION_THRESHOLD_OR_ABSENT, never a confirmed zero (docs/canonical/12 §9.5). " +
    "Geography: national only; the resource carries no regional field and a national count is " +
    "never extrapolated into a region (docs/canonical/12 §9.8). " +
    "Unit: the publisher does not state that one occurrence equals one living person, so this " +
    "snapshot supports no population statement (TASK-004 §14 U-4). " +
    "universe_size is null: no verified PESEL living-population denominator exists, and " +
    "docs/canonical/11 §6.1 stores one only if methodologically valid (§14 U-6)."
  );
}

/**
 * What population the snapshot covers, in the publisher's own words. Quotes
 * the resource title and description verbatim and adds no interpretation
 * (TASK-004 AC-17).
 */
export function peselUniverseDescription(resource: PeselResourceEntry): string {
  return `${resource.resource_title} — ${resource.resource_description} (dane.gov.pl dataset ${PESEL_SOURCE_REGISTRY.dataset_id}, resource ${resource.resource_id})`;
}

/**
 * The resource version a snapshot belongs to.
 *
 * The publisher issues no version string of its own, so this joins the two
 * identifiers it does issue: the resource id and the resource's own state
 * date. It is deliberately NOT the portal `created`/`modified`/`verified`
 * timestamp and NOT `retrieved_at` (TASK-004 AC-06).
 */
export function peselDatasetVersion(resource: PeselResourceEntry): string {
  return `${resource.resource_id}/${resource.data_date}`;
}
