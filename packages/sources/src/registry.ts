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
 *
 * `series` (ADR-0019 §2.1) names the editions of one national list whose
 * published universe description is the same. Only list-scope figures may be
 * compared across the editions of one series; a regional resource is in none.
 */
export interface PeselResourceDescriptor {
  readonly role: "national_male" | "national_female" | "regional_male" | "regional_female";
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
  /** The series this national edition belongs to (ADR-0019 §2.1); `null` for a regional resource. */
  readonly series: PeselSeriesKey | null;
  /**
   * The exact header row of the file when it is not `PESEL_HEADER`
   * (`Nazwisko aktualne,Liczba`). Only the 2019-06-30 editions differ: their
   * header is `nazwisko,liczba` (TASK-045 §2). Absent means `PESEL_HEADER`.
   */
  readonly header?: string;
  /**
   * The sum of every count in the official file: the edition's published total
   * of people (TASK-051), pinned from the file's bytes on 2026-09-30. A trend
   * needs it as the denominator of one in X, and cannot sum stored rows for an
   * edition, which keeps only the surnames the current register has (TASK-045).
   * National resources only.
   */
  readonly official_people_sum?: number;
  /**
   * Set where a resource's published description differs from the series' and
   * the owner ruled it the same universe: `UNIVERSE_DESCRIPTION_DIFFERS`, for the
   * 2019 pair (ADR-0020 §2.2). A reader of the edition must say so.
   */
  readonly universe_note_code?: "UNIVERSE_DESCRIPTION_DIFFERS";
}

/**
 * ADR-0019 §2.1: one series per national list. A series holds the editions
 * whose publisher's universe description is the same — "Wykaz nazwisk …
 * osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL"
 * — from 2020-01-22 on. The 2019-06-30 editions describe their universe
 * differently and are in no series (ADR-0019 §2.2). The male and the female
 * series are two series: they are never added together.
 */
export const PESEL_SERIES_KEYS = {
  national_male: "pesel_living_current_surname_national_male",
  national_female: "pesel_living_current_surname_national_female",
} as const;

export type PeselSeriesKey = (typeof PESEL_SERIES_KEYS)[keyof typeof PESEL_SERIES_KEYS];

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
  official_people_sum: 21197537,
  universe_description:
    "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 20.01.2026",
  methodology_key: "pesel_current_surname_national_2026_male_resource",
  comparability_group: "pesel_2026_national_male",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_male,
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
  official_people_sum: 21560302,
  universe_description:
    "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 20.01.2026",
  methodology_key: "pesel_current_surname_national_2026_female_resource",
  comparability_group: "pesel_2026_national_female",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_female,
};

/** The approved national production pair, in a stable order. */
const REGIONAL_SCOPE_RESTRICTION =
  "The geography is *wojew\u00f3dztwo zameldowania na pobyt sta\u0142y* \u2014 the voivodeship of PERMANENT " +
  "REGISTERED RESIDENCE, a legal registration record. It is never surname origin, ancestry, " +
  "birthplace, historical distribution, or \u2014 without qualification \u2014 current physical residence " +
  "(D-004, binding). Suppression is applied per (surname, voivodeship) cell: an absent cell is " +
  "zero, suppressed or out of scope, never a confirmed zero. The 16 voivodeship values do NOT " +
  "account for the national totals \u2014 about 21.7% of male and 19.8% of female bearers appear in no " +
  "voivodeship row at all, a gap per-cell suppression provably cannot explain and which is " +
  "systematically biased toward recent-migration surnames (TASK-008). A regional count is " +
  "therefore a count within the covered set, never a share of the national count, and the two " +
  "sex partitions are never summed (U-1).";

/**
 * Regional resource `1148786` — male, by voivodeship of permanent registered
 * residence. Adopted by D-004 (Preferred, 2026-09-20); ingested by TASK-011.
 */
export const PESEL_REGIONAL_MALE_2026: PeselResourceDescriptor = {
  role: "regional_male",
  resource_id: "1148786",
  resource_title:
    "Nazwiska m\u0119skie wg wojew\u00f3dztwa zameldowania na pobyt sta\u0142y - stan na 2026-01-20",
  data_date: "2026-01-20",
  portal_modified_at: "2026-01-28T13:32:49Z",
  retrieved_at: "2026-09-18T17:43:16Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/1148786,nazwiska-meskie-wg-wojewodztwa-zameldowania-na-pobyt-stay-stan-na-2026-01-20/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/1148786,nazwiska-meskie-wg-wojewodztwa-zameldowania-na-pobyt-stay-stan-na-2026-01-20",
  official_sha256: "0eb31d19955fbbb0a04c7693fb3e2515bc821515c31486851215f1482bee1b51",
  official_byte_size: 16_615_897,
  official_row_count: 646_052,
  universe_description:
    "Wykaz nazwisk m\u0119skich os\u00f3b \u017cyj\u0105cych (wg pola nazwisko aktualne) wyst\u0119puj\u0105cych w rejestrze PESEL (bez zgon\u00f3w) w podziale na wojew\u00f3dztwa, stan na 20.01.2026",
  methodology_key: "pesel_current_surname_regional_2026_male_resource",
  comparability_group: "pesel_2026_regional_male",
  coverage_notes: REGIONAL_SCOPE_RESTRICTION,
  series: null,
};

/** Regional resource `1148790` — female, same basis. */
export const PESEL_REGIONAL_FEMALE_2026: PeselResourceDescriptor = {
  role: "regional_female",
  resource_id: "1148790",
  resource_title:
    "Nazwiska \u017ce\u0144skie wg wojew\u00f3dztwa zameldowania na pobyt sta\u0142y - stan na 2026-01-20",
  data_date: "2026-01-20",
  portal_modified_at: "2026-01-28T13:35:13Z",
  retrieved_at: "2026-09-18T17:42:32Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/1148790,nazwiska-zenskie-wg-wojewodztwa-zameldowania-na-pobyt-stay-stan-na-2026-01-20/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/1148790,nazwiska-zenskie-wg-wojewodztwa-zameldowania-na-pobyt-stay-stan-na-2026-01-20",
  official_sha256: "cd0c100e9205cffef594a16129e65c4a8373b62c49dcbb5fd7ed3ae27f7b6989",
  official_byte_size: 17_900_370,
  official_row_count: 694_553,
  universe_description:
    "Wykaz nazwisk \u017ce\u0144skich os\u00f3b \u017cyj\u0105cych (wg pola nazwisko aktualne) wyst\u0119puj\u0105cych w rejestrze PESEL w podziale na wojew\u00f3dztwa, stan na 20.01.2026",
  methodology_key: "pesel_current_surname_regional_2026_female_resource",
  comparability_group: "pesel_2026_regional_female",
  coverage_notes: REGIONAL_SCOPE_RESTRICTION,
  series: null,
};

export const PESEL_REGIONAL_RESOURCES_2026 = [
  PESEL_REGIONAL_MALE_2026,
  PESEL_REGIONAL_FEMALE_2026,
] as const;

export const PESEL_NATIONAL_RESOURCES_2026: readonly PeselResourceDescriptor[] = [
  PESEL_NATIONAL_MALE_2026,
  PESEL_NATIONAL_FEMALE_2026,
];

/** Looks up an approved resource descriptor by the publisher's resource id. */
export function findPeselResource(resourceId: string): PeselResourceDescriptor | undefined {
  return [...PESEL_NATIONAL_RESOURCES_2026, ...PESEL_REGIONAL_RESOURCES_2026].find(
    (r) => r.resource_id === resourceId,
  );
}

/**
 * The national resource describing the same partition as a regional one.
 *
 * This is registry truth, not arithmetic: only the registry knows that
 * `1148786` and `1148808` are the same publisher's same partition of the same
 * register on the same reference date, one restricted to permanent registered
 * residence and one not. TASK-012 needs the pairing to state what share of a
 * surname's national count can be placed in a voivodeship at all.
 *
 * `docs/canonical/11` §6.1 forbids comparing snapshots across comparability
 * groups **without explicit justification**. The justification is exactly the
 * pairing this function encodes — same publisher, same partition, same
 * `data_date`, same counted field (*nazwisko aktualne*), same register, the
 * regional resource differing only by the residence restriction — and it holds
 * for no other pair of resources here. In particular it never pairs male with
 * female: U-1 leaves the partition undisambiguated, so those stay unsummable
 * and uncomparable, and `role` is matched on its suffix rather than guessed.
 *
 * Returns `undefined` for a national descriptor: it has no counterpart because
 * it *is* the counterpart.
 */
export function nationalCounterpartOf(
  descriptor: PeselResourceDescriptor,
): PeselResourceDescriptor | undefined {
  // Registry truth, not arithmetic (above): only the 2026 regional pair has a
  // national counterpart on the same reference date. The 2025 regional pair
  // (TASK-045) is dated 2025-02-24 against national lists dated 2025-01-22, so
  // it has none, and it never reaches a derivation anyway (`isPeselEdition`).
  if (descriptor.resource_id === PESEL_REGIONAL_MALE_2026.resource_id) {
    return PESEL_NATIONAL_MALE_2026;
  }
  if (descriptor.resource_id === PESEL_REGIONAL_FEMALE_2026.resource_id) {
    return PESEL_NATIONAL_FEMALE_2026;
  }
  return undefined;
}

// --- TASK-044, ADR-0019: the two national series ---------------------------

const PORTAL_DATE_2023_FEMALE =
  `${PARTITION_NOT_DISAMBIGUATED} The portal's data_date says 2023-01-31; the title and the ` +
  'description say "stan na 30.01.2023", and the stated reference date is the one used.';

/*
 * The earlier editions of the two national lists (ADR-0019 §2.1). Each is
 * SHA-pinned and gated like the 2026 files; the list-facts generator reads
 * them for list-scope figures only. They are not import-approved:
 * `findPeselResource` does not return them, so no surname claim is built
 * from an earlier edition (TASK-044 §5).
 *
 * `universe_description` is the publisher's text verbatim, including the 2020
 * male edition's "nazwisk męskie". `retrieved_at` is when the CSV endpoint's
 * bytes these checksums describe finished downloading; a second download of
 * the 2020 male file gave the same bytes.
 */

export const PESEL_NATIONAL_MALE_2020: PeselResourceDescriptor = {
  role: "national_male",
  resource_id: "22817",
  resource_title: "Nazwiska męskie - stan na 2020-01-22",
  data_date: "2020-01-22",
  portal_modified_at: "2022-05-23T11:47:22Z",
  retrieved_at: "2026-09-30T17:54:37Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/22817,nazwiska-meskie-stan-na-2020-01-22/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/22817,nazwiska-meskie-stan-na-2020-01-22",
  official_sha256: "a6af514f921c30771591bced6785c6559d63f5e88868e25eaad130eb36fd805d",
  official_byte_size: 3_662_490,
  official_row_count: 283_221,
  official_people_sum: 19879045,
  universe_description:
    "Wykaz nazwisk męskie osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 22.01.2020",
  methodology_key: "pesel_current_surname_national_2020_male_resource",
  comparability_group: "pesel_2020_national_male",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_male,
};

export const PESEL_NATIONAL_MALE_2021: PeselResourceDescriptor = {
  role: "national_male",
  resource_id: "28052",
  resource_title: "Nazwiska męskie - stan na 2021-02-01",
  data_date: "2021-02-01",
  portal_modified_at: "2021-02-03T11:06:56Z",
  retrieved_at: "2026-09-30T17:54:54Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/28052,nazwiska-meskie-stan-na-2021-02-01/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/28052,nazwiska-meskie-stan-na-2021-02-01",
  official_sha256: "ea466f2b8611be038913c6354bb13a5d029f5ff0ced07eea7ef282f5f52c215c",
  official_byte_size: 3_859_773,
  official_row_count: 298_692,
  official_people_sum: 19987207,
  universe_description:
    "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 01.02.2021",
  methodology_key: "pesel_current_surname_national_2021_male_resource",
  comparability_group: "pesel_2021_national_male",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_male,
};

export const PESEL_NATIONAL_MALE_2022: PeselResourceDescriptor = {
  role: "national_male",
  resource_id: "36401",
  resource_title: "Nazwiska męskie - stan na 2022-01-27",
  data_date: "2022-01-27",
  portal_modified_at: "2022-02-07T08:19:30Z",
  retrieved_at: "2026-09-30T17:55:12Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/36401,nazwiska-meskie-stan-na-2022-01-27/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/36401,nazwiska-meskie-stan-na-2022-01-27",
  official_sha256: "4389d8964dd37c7ab71306d537e98b365e171831d2be9e63b84bdcaaf33ca68d",
  official_byte_size: 4_160_756,
  official_row_count: 322_232,
  official_people_sum: 20203548,
  universe_description:
    "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 27.01.2022",
  methodology_key: "pesel_current_surname_national_2022_male_resource",
  comparability_group: "pesel_2022_national_male",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_male,
};

export const PESEL_NATIONAL_MALE_2023: PeselResourceDescriptor = {
  role: "national_male",
  resource_id: "44647",
  resource_title: "Nazwiska męskie - stan na 2023-01-30",
  data_date: "2023-01-30",
  portal_modified_at: "2024-01-25T14:56:41Z",
  retrieved_at: "2026-09-30T17:55:28Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/44647,nazwiska-meskie-stan-na-2023-01-30/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/44647,nazwiska-meskie-stan-na-2023-01-30",
  official_sha256: "7e95c307a2ebf62b1ea14b936925c46cc0b6db960dec8fc98c6b5fe8980f9af0",
  official_byte_size: 4_692_377,
  official_row_count: 363_360,
  official_people_sum: 20808071,
  universe_description:
    "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 30.01.2023",
  methodology_key: "pesel_current_surname_national_2023_male_resource",
  comparability_group: "pesel_2023_national_male",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_male,
};

export const PESEL_NATIONAL_MALE_2024: PeselResourceDescriptor = {
  role: "national_male",
  resource_id: "54097",
  resource_title: "Nazwiska męskie - stan na 2024-01-19",
  data_date: "2024-01-19",
  portal_modified_at: "2024-01-26T06:35:27Z",
  retrieved_at: "2026-09-30T17:55:52Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/54097,nazwiska-meskie-stan-na-2024-01-19/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/54097,nazwiska-meskie-stan-na-2024-01-19",
  official_sha256: "3c722cada73f0b52184931a4cc521a5c7d6905683f5103a417f867fd9547be0e",
  official_byte_size: 4_904_484,
  official_row_count: 379_712,
  official_people_sum: 20976785,
  universe_description:
    "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 19.01.2024",
  methodology_key: "pesel_current_surname_national_2024_male_resource",
  comparability_group: "pesel_2024_national_male",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_male,
};

export const PESEL_NATIONAL_MALE_2025: PeselResourceDescriptor = {
  role: "national_male",
  resource_id: "63892",
  resource_title: "Nazwiska męskie - stan na 2025-01-22",
  data_date: "2025-01-22",
  portal_modified_at: "2025-01-23T14:29:44Z",
  retrieved_at: "2026-09-30T17:56:10Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/63892,nazwiska-meskie-stan-na-2025-01-22/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/63892,nazwiska-meskie-stan-na-2025-01-22",
  official_sha256: "079695630265bf0bcb2f944743799850465123fbd280ead736f3274d867818cb",
  official_byte_size: 5_114_559,
  official_row_count: 395_127,
  official_people_sum: 21096170,
  universe_description:
    "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 22.01.2025",
  methodology_key: "pesel_current_surname_national_2025_male_resource",
  comparability_group: "pesel_2025_national_male",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_male,
};

export const PESEL_NATIONAL_FEMALE_2020: PeselResourceDescriptor = {
  role: "national_female",
  resource_id: "22815",
  resource_title: "Nazwiska żeńskie - stan na 2020-01-22",
  data_date: "2020-01-22",
  portal_modified_at: "2022-05-23T10:50:33Z",
  retrieved_at: "2026-09-30T17:54:46Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/22815,nazwiska-zenskie-stan-na-2020-01-22/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/22815,nazwiska-zenskie-stan-na-2020-01-22",
  official_sha256: "b0ede69ca79698cd8f6b09462916234be67dd4322d888e6a9263b89a52bfd99b",
  official_byte_size: 3_988_200,
  official_row_count: 299_612,
  official_people_sum: 20220345,
  universe_description:
    "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 22.01.2020",
  methodology_key: "pesel_current_surname_national_2020_female_resource",
  comparability_group: "pesel_2020_national_female",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_female,
};

export const PESEL_NATIONAL_FEMALE_2021: PeselResourceDescriptor = {
  role: "national_female",
  resource_id: "35279",
  resource_title: "Nazwiska żeńskie - stan na 2021-02-02",
  data_date: "2021-02-02",
  portal_modified_at: "2021-12-21T13:31:47Z",
  retrieved_at: "2026-09-30T17:55:04Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/35279,nazwiska-zenskie-stan-na-2021-02-02/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/35279,nazwiska-zenskie-stan-na-2021-02-02",
  official_sha256: "9af26480ed3035e7e6b9349033c4ccd76bee3eeb5e8ac7ce299a8d00ba0b62e0",
  official_byte_size: 4_141_803,
  official_row_count: 311_240,
  official_people_sum: 20263212,
  universe_description:
    "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 02.02.2021",
  methodology_key: "pesel_current_surname_national_2021_female_resource",
  comparability_group: "pesel_2021_national_female",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_female,
};

export const PESEL_NATIONAL_FEMALE_2023: PeselResourceDescriptor = {
  role: "national_female",
  resource_id: "44646",
  resource_title: "Nazwiska żeńskie - stan na 2023-01-30",
  data_date: "2023-01-30",
  portal_modified_at: "2023-01-31T14:12:44Z",
  retrieved_at: "2026-09-30T17:55:42Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/44646,nazwiska-zenskie-stan-na-2023-01-30/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/44646,nazwiska-zenskie-stan-na-2023-01-30",
  official_sha256: "326bfc3dcf2b55886073a46780acaefec3fb2bc4444f6ddbc052938c1aa05cb2",
  official_byte_size: 5_169_657,
  official_row_count: 389_365,
  official_people_sum: 21369477,
  universe_description:
    "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 30.01.2023",
  methodology_key: "pesel_current_surname_national_2023_female_resource",
  comparability_group: "pesel_2023_national_female",
  coverage_notes: PORTAL_DATE_2023_FEMALE,
  series: PESEL_SERIES_KEYS.national_female,
};

export const PESEL_NATIONAL_FEMALE_2024: PeselResourceDescriptor = {
  role: "national_female",
  resource_id: "54098",
  resource_title: "Nazwiska żeńskie - stan na 2024-01-19",
  data_date: "2024-01-19",
  portal_modified_at: "2024-01-26T07:06:19Z",
  retrieved_at: "2026-09-30T17:56:57Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/54098,nazwiska-zenskie-stan-na-2024-01-19/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/54098,nazwiska-zenskie-stan-na-2024-01-19",
  official_sha256: "7988d01d8f85f84cd84bb0069b9129c9b3944aba5349709cffca21555d6fcf28",
  official_byte_size: 5_324_053,
  official_row_count: 400_764,
  official_people_sum: 21479386,
  universe_description:
    "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 19.01.2024",
  methodology_key: "pesel_current_surname_national_2024_female_resource",
  comparability_group: "pesel_2024_national_female",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_female,
};

export const PESEL_NATIONAL_FEMALE_2025: PeselResourceDescriptor = {
  role: "national_female",
  resource_id: "63888",
  resource_title: "Nazwiska żeńskie - stan na 2025-01-22",
  data_date: "2025-01-22",
  portal_modified_at: "2025-01-23T11:54:55Z",
  retrieved_at: "2026-09-30T17:56:22Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/63888,nazwiska-zenskie-stan-na-2025-01-22/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/63888,nazwiska-zenskie-stan-na-2025-01-22",
  official_sha256: "9ac287db5266fc03d3e24a497244d071b3ef2fb4907c43c2b07844912db0d27a",
  official_byte_size: 5_465_724,
  official_row_count: 411_012,
  official_people_sum: 21535515,
  universe_description:
    "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 22.01.2025",
  methodology_key: "pesel_current_surname_national_2025_female_resource",
  comparability_group: "pesel_2025_national_female",
  coverage_notes: PARTITION_NOT_DISAMBIGUATED,
  series: PESEL_SERIES_KEYS.national_female,
};

/**
 * ADR-0019 §2.1: each national series, its editions in date order, the 2026
 * edition last. The female series has no 2022 edition: the resource dated
 * 2022-01-27 is refused ({@link PESEL_REFUSED_RESOURCES}).
 */
export const PESEL_NATIONAL_SERIES: {
  readonly national_male: readonly PeselResourceDescriptor[];
  readonly national_female: readonly PeselResourceDescriptor[];
} = {
  national_male: [
    PESEL_NATIONAL_MALE_2020,
    PESEL_NATIONAL_MALE_2021,
    PESEL_NATIONAL_MALE_2022,
    PESEL_NATIONAL_MALE_2023,
    PESEL_NATIONAL_MALE_2024,
    PESEL_NATIONAL_MALE_2025,
    PESEL_NATIONAL_MALE_2026,
  ],
  national_female: [
    PESEL_NATIONAL_FEMALE_2020,
    PESEL_NATIONAL_FEMALE_2021,
    PESEL_NATIONAL_FEMALE_2023,
    PESEL_NATIONAL_FEMALE_2024,
    PESEL_NATIONAL_FEMALE_2025,
    PESEL_NATIONAL_FEMALE_2026,
  ],
};

/** Why a published resource of a series is not one of its editions (ADR-0019 §2.2). */
export type PeselRefusalReason = "PUBLISHER_DUPLICATE";

/**
 * A resource the publisher lists in a series that is not an edition of it.
 * Recorded with the bytes it was refused on, so the refusal can be checked.
 */
export interface PeselRefusedResource {
  readonly role: "national_male" | "national_female";
  readonly series: PeselSeriesKey;
  readonly resource_id: string;
  readonly resource_title: string;
  /** The reference date the publisher states for it. */
  readonly data_date: string;
  readonly portal_modified_at: string;
  readonly retrieved_at: string;
  readonly official_source_url: string;
  readonly official_resource_metadata_url: string;
  readonly official_sha256: string;
  readonly official_byte_size: number;
  readonly official_row_count: number;
  readonly reason: PeselRefusalReason;
  /** `PUBLISHER_DUPLICATE`: the resource id of the edition whose bytes it repeats. */
  readonly duplicate_of: string;
  readonly notes: string;
}

/**
 * ADR-0019 §1 and §2.2: the female resource dated 2022-01-27 is byte-identical
 * to the one dated 2021-02-02 (same SHA-256, 311 240 rows). It cannot be a
 * 2022 measurement, so the female series shows a gap there, never a value.
 */
export const PESEL_REFUSED_RESOURCES: readonly PeselRefusedResource[] = [
  {
    role: "national_female",
    series: PESEL_SERIES_KEYS.national_female,
    resource_id: "38772",
    resource_title: "Nazwiska żeńskie - stan na 2022-01-27",
    data_date: "2022-01-27",
    portal_modified_at: "2022-05-25T09:38:12Z",
    retrieved_at: "2026-09-30T17:56:45Z",
    official_source_url:
      "https://api.dane.gov.pl/resources/38772,nazwiska-zenskie-stan-na-2022-01-27/csv",
    official_resource_metadata_url:
      "https://api.dane.gov.pl/1.4/resources/38772,nazwiska-zenskie-stan-na-2022-01-27",
    official_sha256: "9af26480ed3035e7e6b9349033c4ccd76bee3eeb5e8ac7ce299a8d00ba0b62e0",
    official_byte_size: 4_141_803,
    official_row_count: 311_240,
    reason: "PUBLISHER_DUPLICATE",
    duplicate_of: "35279",
    notes:
      "Byte-identical to resource 35279 (stan na 2021-02-02): the same SHA-256, size and rows. " +
      'Its description says "stan na 27.01.2022", but its bytes are the 2021 edition\'s, so it ' +
      "is no 2022 measurement.",
  },
];

// --- TASK-045: every published edition, importable on the VM -----------------

const EDITION_2019_NOTE =
  'The publisher\'s description of this edition says only "lista nazwisk \u2026 w rejestrze PESEL" ' +
  'and does not say "os\u00f3b \u017cyj\u0105cych" (living persons); its header is "nazwisko,liczba", not ' +
  '"Nazwisko aktualne,Liczba". The project owner ruled on 2026-09-30 that it describes living ' +
  "persons with their current surname, as the later editions do (TASK-045 \u00a72). That ruling, not " +
  "a publisher statement, is why it is registered as an edition. ADR-0019 \u00a72.2 keeps it out of " +
  "the landing's series until that ADR is amended.";

/** The 2019-06-30 national editions: the earliest, with the older header (TASK-045 \u00a72). */
export const PESEL_NATIONAL_MALE_2019: PeselResourceDescriptor = {
  role: "national_male",
  resource_id: "18990",
  resource_title: "Nazwiska m\u0119skie - stan na 2019-06-30",
  data_date: "2019-06-30",
  portal_modified_at: "2024-01-10T12:45:57Z",
  retrieved_at: "2026-09-30T19:55:58Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/18990,nazwiska-meskie-stan-na-2019-06-30/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/18990,nazwiska-meskie-stan-na-2019-06-30",
  official_sha256: "e975ecc4226aec76a5144ce17ca32612e4aaba058dd9589f6b4cbd2db3e4a4bb",
  official_byte_size: 3_610_164,
  official_row_count: 277_108,
  official_people_sum: 19859783,
  universe_description: "lista nazwisk m\u0119skich w rejestrze PESEL stan na 30.06.2019",
  methodology_key: "pesel_current_surname_national_2019_male_resource",
  comparability_group: "pesel_2019_national_male",
  coverage_notes: `${PARTITION_NOT_DISAMBIGUATED} ${EDITION_2019_NOTE}`,
  series: null,
  header: "nazwisko,liczba",
  universe_note_code: "UNIVERSE_DESCRIPTION_DIFFERS",
};

/**
 * The female 2019 resource is published as a native CSV (the others as XLSX
 * with a CSV endpoint), so its official URL is the media file itself.
 */
export const PESEL_NATIONAL_FEMALE_2019: PeselResourceDescriptor = {
  role: "national_female",
  resource_id: "18989",
  resource_title: "Nazwiska \u017ce\u0144skie - stan na 2019-06-30",
  data_date: "2019-06-30",
  portal_modified_at: "2020-03-17T06:58:30Z",
  retrieved_at: "2026-09-30T19:57:08Z",
  official_source_url:
    "https://api.dane.gov.pl/media/resources/20190813/nazwiska_%C5%BCe%C5%84skie.csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/18989,nazwiska-zenskie-stan-na-2019-06-30",
  official_sha256: "c35e44779eb3e655f66c453a71b1c8db192b309375e828f16893864822fdbba8",
  official_byte_size: 3_993_861,
  official_row_count: 297_456,
  official_people_sum: 20249319,
  universe_description: "lista nazwisk \u017ce\u0144skich w rejestrze PESEL stan na 30.06.2019",
  methodology_key: "pesel_current_surname_national_2019_female_resource",
  comparability_group: "pesel_2019_national_female",
  coverage_notes: `${PARTITION_NOT_DISAMBIGUATED} ${EDITION_2019_NOTE}`,
  series: null,
  header: "nazwisko,liczba",
  universe_note_code: "UNIVERSE_DESCRIPTION_DIFFERS",
};

/** The 2025-02-24 regional pair: the only earlier regional edition the publisher lists. */
export const PESEL_REGIONAL_MALE_2025: PeselResourceDescriptor = {
  role: "regional_male",
  resource_id: "65049",
  resource_title:
    "Nazwiska m\u0119skie wg wojew\u00f3dztwa zameldowania na pobyt sta\u0142y - stan na 2025-02-24",
  data_date: "2025-02-24",
  portal_modified_at: "2025-03-10T11:45:42Z",
  retrieved_at: "2026-09-30T19:57:47Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/65049,nazwiska-meskie-wg-zameldowania-na-pobyt-stay-stan-na-2025-02-24/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/65049,nazwiska-meskie-wg-zameldowania-na-pobyt-stay-stan-na-2025-02-24",
  official_sha256: "4e258a328cf7a8f66766a73e486505e760d2ebb0840814df72c09695c374ef39",
  official_byte_size: 16_619_443,
  official_row_count: 646_100,
  universe_description:
    "Wykaz nazwisk m\u0119skich os\u00f3b \u017cyj\u0105cych (wg pola nazwisko aktualne) wyst\u0119puj\u0105cych w rejestrze PESEL (bez zgon\u00f3w) w podziale na wojew\u00f3dztwa, stan na 24.02.2025",
  methodology_key: "pesel_current_surname_regional_2025_male_resource",
  comparability_group: "pesel_2025_regional_male",
  coverage_notes: REGIONAL_SCOPE_RESTRICTION,
  series: null,
};

export const PESEL_REGIONAL_FEMALE_2025: PeselResourceDescriptor = {
  role: "regional_female",
  resource_id: "65090",
  resource_title:
    "Nazwiska \u017ce\u0144skie wg wojew\u00f3dztwa zameldowania na pobyt sta\u0142y - stan na 2025-02-24",
  data_date: "2025-02-24",
  portal_modified_at: "2025-03-10T11:45:12Z",
  retrieved_at: "2026-09-30T19:58:24Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/65090,nazwiska-zenskie-wg-zameldowania-na-pobyt-stay-stan-na-2025-02-24/csv",
  official_resource_metadata_url:
    "https://api.dane.gov.pl/1.4/resources/65090,nazwiska-zenskie-wg-zameldowania-na-pobyt-stay-stan-na-2025-02-24",
  official_sha256: "9322fc8c72e6ddaa2d4c51bf247f2847ce9ee96ea397587b87d9056039064e43",
  official_byte_size: 17_891_156,
  official_row_count: 694_199,
  universe_description:
    "Wykaz nazwisk \u017ce\u0144skich os\u00f3b \u017cyj\u0105cych (wg pola nazwisko aktualne) wyst\u0119puj\u0105cych w rejestrze PESEL w podziale na wojew\u00f3dztwa, stan na 24.02.2025",
  methodology_key: "pesel_current_surname_regional_2025_female_resource",
  comparability_group: "pesel_2025_regional_female",
  coverage_notes: REGIONAL_SCOPE_RESTRICTION,
  series: null,
};

/**
 * Every registered resource that is not one of the four current ones
 * (`findPeselResource`): the 2019 pair, the 2020\u20132025 national editions of
 * both series, and the 2025 regional pair. An edition is imported as its own
 * dated snapshot and produces no claim: `isPeselEdition` keeps it out of every
 * derivation, so the pages show the current resources only (TASK-045 \u00a73).
 */
export const PESEL_EDITIONS: readonly PeselResourceDescriptor[] = [
  PESEL_NATIONAL_MALE_2019,
  PESEL_NATIONAL_FEMALE_2019,
  ...PESEL_NATIONAL_SERIES.national_male.filter((r) => r !== PESEL_NATIONAL_MALE_2026),
  ...PESEL_NATIONAL_SERIES.national_female.filter((r) => r !== PESEL_NATIONAL_FEMALE_2026),
  PESEL_REGIONAL_MALE_2025,
  PESEL_REGIONAL_FEMALE_2025,
];

/** A current resource or an edition, by the publisher's resource id: what the importers accept. */
export function findPeselEdition(resourceId: string): PeselResourceDescriptor | undefined {
  return findPeselResource(resourceId) ?? PESEL_EDITIONS.find((r) => r.resource_id === resourceId);
}

/** True for a registered edition that is not current: imported, dated, and never derived from. */
export function isPeselEdition(resourceId: string | null): boolean {
  return (
    resourceId !== null &&
    findPeselResource(resourceId) === undefined &&
    PESEL_EDITIONS.some((r) => r.resource_id === resourceId)
  );
}

/**
 * The editions a surname's change over time reads, per list, in date order
 * (ADR-0020 §2.2): ADR-0019's series, 2020-01-22 to 2026-01-20, preceded by the
 * 2019-06-30 edition of the list. The 2019 pair is in no series (ADR-0019
 * §2.2), so the landing's panel does not read it; a surname's section does, on
 * the project owner's ruling of 2026-09-30.
 *
 * The female list has no 2022 edition: its resource is a publisher duplicate
 * of the 2021 one, listed in {@link PESEL_REFUSED_RESOURCES} and carried by a
 * claim as a gap.
 */
export const PESEL_TREND_EDITIONS: {
  readonly national_male: readonly PeselResourceDescriptor[];
  readonly national_female: readonly PeselResourceDescriptor[];
} = {
  national_male: [PESEL_NATIONAL_MALE_2019, ...PESEL_NATIONAL_SERIES.national_male],
  national_female: [PESEL_NATIONAL_FEMALE_2019, ...PESEL_NATIONAL_SERIES.national_female],
};
