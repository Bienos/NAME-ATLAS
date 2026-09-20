/**
 * PESEL source registry (TASK-004 §6 item 2; docs/canonical/12 §5 — the
 * registry is "configuration/data, not scattered code constants").
 *
 * Every value in this file is traceable to `fixtures/pesel/source-manifest.json`,
 * to the captured publisher metadata under
 * `docs/sources/acquisition/2026-09-18/metadata/`, or to a named canonical
 * document. Nothing here is inferred, and nothing not evidenced is given an
 * optimistic default — an unevidenced rights dimension is `UNKNOWN`.
 *
 * This module is pure data plus types. It performs no I/O.
 */

/** Stable internal source key (docs/canonical/11 §9.1). */
export const PESEL_SOURCE_KEY = "pl_pesel_surnames";

export type RightsPermission = "ALLOWED" | "CONDITIONAL" | "PROHIBITED" | "UNKNOWN";
export type CachePermission = "ALLOWED" | "LIMITED" | "PROHIBITED" | "UNKNOWN";
export type RightsReviewStatus =
  "APPROVED" | "CONDITIONAL" | "LEGAL_REVIEW_REQUIRED" | "BLOCKED" | "EXPIRED";

export interface RightsProfileSeed {
  readonly terms_version: string | null;
  readonly terms_hash: string | null;
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

/**
 * The PESEL rights profile, seeded exactly as TASK-004 §14 U-2 specifies
 * (answered by the project owner, 2026-09-19).
 *
 * Two values carry the whole legal posture and must not be "improved":
 *
 *   - `commercial_use = UNKNOWN`. Dataset-level CC0 1.0 would permit
 *     commercial use, but the resource-level metadata carries no licence
 *     attribute at all, so resource inheritance of CC0 is unverified. By
 *     docs/canonical/12 §6.4 this sets `paid_surface_eligible = false`
 *     automatically — the gate stays closed in code, not in memory.
 *     Closing it is D-007, not this task.
 *   - `review_status = LEGAL_REVIEW_REQUIRED`. Nobody has performed a legal
 *     review; `APPROVED` would be a false statement of fact (AGENTS.md §9).
 *
 * Neither value blocks ingestion: the only hard gate on running a connector
 * is `automated_access = PROHIBITED` (docs/canonical/12 §6.4).
 */
export const PESEL_RIGHTS_PROFILE: RightsProfileSeed = {
  terms_version: "CC0 1.0",
  terms_hash: null,
  checked_at: "2026-09-20T00:00:00Z",
  metadata_rights: "ALLOWED",
  // No image or transcription exists for a CSV resource, and nothing
  // evidences a permission either way. UNKNOWN, not ALLOWED.
  image_rights: "UNKNOWN",
  transcription_rights: "UNKNOWN",
  // CC0 1.0 expressly waives sui generis database rights.
  database_rights: "ALLOWED",
  // The publisher operates a public, documented JSON:API as the declared
  // access route. This task performs no automated retrieval regardless.
  automated_access: "ALLOWED",
  // D-007, decided by the project owner on 2026-09-20: rely on the
  // dataset-level CC0 1.0 declaration and the statutory right to re-use
  // public sector information. CC0 permits commercial use and
  // redistribution without condition. A judgement, recorded as one.
  commercial_use: "ALLOWED",
  redistribution: "ALLOWED",
  local_cache: "ALLOWED",
  // CC0 requires no attribution. The product attributes anyway: every
  // published fact traces to its source and date (PRODUCT.md §7).
  attribution_required: false,
  attribution_text:
    "Dane pochodzą z rejestru PESEL, Ministerstwo Cyfryzacji, dane.gov.pl (CC0 1.0)",
  source_owner: "Ministerstwo Cyfryzacji",
  rights_url:
    "https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel",
  contact_required: false,
  review_status: "APPROVED",
  valid_from: "2026-09-20",
  valid_to: null,
  notes:
    "Licence is stated at DATASET level (license_name = 'CC0 1.0', dataset 1681); resource-level " +
    "metadata carries no licence attribute. D-007 resolved by the project owner on 2026-09-20: " +
    "rely on the dataset-level CC0 1.0 declaration — dane.gov.pl attaches licences at dataset " +
    "level, resources being files within a dataset — together with the statutory right to " +
    "re-use public sector information (ustawa o otwartych danych). This is the project owner's " +
    "judgement, recorded as such, not a publisher confirmation; a confirmation, if obtained, " +
    "would be recorded here and would change nothing unless it contradicted this posture.",
};

export interface SourceSeed {
  readonly source_key: string;
  readonly name: string;
  readonly publisher: string;
  readonly source_type: "OFFICIAL_DATASET";
  readonly granularity: "SURNAME";
  readonly geographic_scope: readonly string[];
  readonly temporal_from: string | null;
  readonly temporal_to: string | null;
  readonly methodology_notes: string;
  readonly authority_tier: "A_PRIMARY_OFFICIAL";
  readonly production_status: "LEGAL_REVIEW_REQUIRED";
  readonly homepage_or_reference_url: string;
}

/**
 * The PESEL `Source` (docs/canonical/11 §9.1).
 *
 * `authority_tier` and `production_status` are independent dimensions, as
 * §9.1 states explicitly: this is a primary official source (A tier) that
 * is nonetheless not cleared for production commercial use, because the
 * rights review in D-007 has not happened.
 */
export const PESEL_SOURCE: SourceSeed = {
  source_key: PESEL_SOURCE_KEY,
  name: "Nazwiska występujące w rejestrze PESEL",
  publisher: "Ministerstwo Cyfryzacji",
  source_type: "OFFICIAL_DATASET",
  granularity: "SURNAME",
  geographic_scope: ["PL"],
  // The dataset's coverage is a single reference date, not a range. Both
  // bounds are that date rather than an invented span.
  temporal_from: "2026-01-20",
  temporal_to: "2026-01-20",
  methodology_notes:
    "Current-surname field ('nazwisko aktualne') of living persons in the PESEL register. " +
    "Deceased persons excluded. Surnames occurring exactly once are suppressed by the " +
    "publisher and absent from the resource — absence is never a confirmed zero " +
    "(docs/canonical/12 §9.5). Male and female surnames are published as two separate " +
    "resources; the publisher does not state whether the partition is by the bearer's sex " +
    "or by the grammatical gender of the surname form, so the two are never summed " +
    "(TASK-004 §14 U-1).",
  authority_tier: "A_PRIMARY_OFFICIAL",
  production_status: "LEGAL_REVIEW_REQUIRED",
  homepage_or_reference_url:
    "https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel",
};

/**
 * One approved, checksum-pinned PESEL resource version.
 *
 * `universe_description` is the publisher's own text, verbatim and
 * untranslated (TASK-004 §14 U-1). The captured metadata wraps it in a
 * single `<p>` element; only that wrapper is stripped.
 *
 * `methodology_key` names the resource without asserting what the
 * male/female split means. `comparability_group` differs per partition so
 * that docs/canonical/11 §6.1's comparability rule — "only snapshots in the
 * same group may be compared quantitatively" — mechanically forbids summing
 * or comparing the two resources. That is the enforcement for AC-17.
 */
export interface PeselResourceDescriptor {
  readonly role: "national_male" | "national_female";
  /** The publisher's own resource id; `external_record_id` (ADR-0003). */
  readonly resource_id: string;
  readonly resource_title: string;
  /** PESEL reference date — what the data describes. Never a portal timestamp. */
  readonly data_date: string;
  /** Portal metadata timestamp; distinct from `data_date` and from `retrieved_at`. */
  readonly portal_modified_at: string;
  /** When the bytes were fetched by the project owner. */
  readonly retrieved_at: string;
  readonly official_source_url: string;
  readonly official_resource_metadata_url: string;
  /** SHA-256 of the full official resource. NOT the committed fixture's checksum. */
  readonly official_sha256: string;
  readonly official_byte_size: number;
  readonly official_row_count: number;
  readonly universe_description: string;
  readonly methodology_key: string;
  readonly comparability_group: string;
  readonly coverage_notes: string;
}

const PARTITION_NOT_DISAMBIGUATED =
  "The publisher does not state whether this partition is by the bearer's sex or by the " +
  "grammatical gender of the surname form. The male and female resources are therefore " +
  "NOT summable and NOT quantitatively comparable; they carry different comparability " +
  "groups for that reason (TASK-004 §14 U-1). Surnames occurring exactly once are " +
  "suppressed by the publisher: a surname absent from this resource is " +
  "BELOW_PUBLICATION_THRESHOLD_OR_ABSENT, never a confirmed zero.";

export const PESEL_NATIONAL_MALE_2026: PeselResourceDescriptor = {
  role: "national_male",
  resource_id: "1148808",
  resource_title: "Nazwiska męskie - stan na 2026-01-20",
  data_date: "2026-01-20",
  portal_modified_at: "2026-01-28T13:47:34Z",
  retrieved_at: "2026-09-18T17:40:00Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/1148808,nazwiska-meskie-stan-na-2026-01-20/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/1148808,nazwiska-meskie-stan-na-2026-01-20",
  official_sha256: "ce4238feda85e75c73b16a229eb8afc1dfccb8854a7809111ab85fb8672b62f4",
  official_byte_size: 5_293_415,
  official_row_count: 408_182,
  universe_description:
    "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 20.01.2026",
  methodology_key: "pesel_current_surname_national_2026_male_resource",
  comparability_group: "pesel_2026_national_male",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
};

export const PESEL_NATIONAL_FEMALE_2026: PeselResourceDescriptor = {
  role: "national_female",
  resource_id: "1148811",
  resource_title: "Nazwiska żeńskie - stan na 2026-01-20",
  data_date: "2026-01-20",
  portal_modified_at: "2026-01-28T13:48:39Z",
  retrieved_at: "2026-09-18T17:39:46Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/1148811,nazwiska-zenskie-stan-na-2026-01-20/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/1148811,nazwiska-zenskie-stan-na-2026-01-20",
  official_sha256: "c508680d084dd21949ca7c817339fd63d31342ee5318320c5266c6bf4909f6e6",
  official_byte_size: 5_592_881,
  official_row_count: 420_082,
  universe_description:
    "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 20.01.2026",
  methodology_key: "pesel_current_surname_national_2026_female_resource",
  comparability_group: "pesel_2026_national_female",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
};

/** The approved national production pair, in a stable order. */
export const PESEL_NATIONAL_RESOURCES_2026: readonly PeselResourceDescriptor[] = [
  PESEL_NATIONAL_MALE_2026,
  PESEL_NATIONAL_FEMALE_2026,
];

/** Looks up an approved resource descriptor by the publisher's resource id. */
export function findPeselResource(resourceId: string): PeselResourceDescriptor | undefined {
  return PESEL_NATIONAL_RESOURCES_2026.find((r) => r.resource_id === resourceId);
}
