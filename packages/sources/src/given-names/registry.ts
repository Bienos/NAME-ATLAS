/**
 * The PESEL given-name lists (ADR-0030, TASK-075): the source, its rights
 * profile, and the two resources this task imports, each pinned to the bytes
 * the project read on 2026-10-03.
 */
import { PESEL_RIGHTS_PROFILE } from "../registry.js";
import type { RightsProfileSeed } from "../registry.js";

export const GIVEN_NAMES_SOURCE_KEY = "pl_pesel_given_names";

/** The header of the first-name files, exactly. */
export const GIVEN_NAMES_FIRST_HEADER = "IMIĘ_PIERWSZE,PŁEĆ,LICZBA_WYSTĄPIEŃ";

/**
 * The publisher's placeholders: rows that hold no name (ADR-0030 §3). Read,
 * counted and reported; never a given name. Exact strings only, read from the
 * 2026-01-20 files; a new placeholder is a finding to add here by review.
 */
export const GIVEN_NAME_PLACEHOLDERS: ReadonlySet<string> = new Set([
  "BRAK DANYCH",
  "BRAKDANYCH",
  "BRAK IMIENIA",
  "BRAK",
  "-",
  "XXX",
]);

/** ADR-0030 §4: one character, or a full stop. Stored, flagged, never shown unreviewed. */
export function needsFormReview(name: string): boolean {
  return [...name].length === 1 || name.includes(".");
}

/**
 * Dataset 1667's licence, as the surname lists': CC0 1.0, checked again on
 * 2026-10-03 on the dataset's own page. The surname profile's judgement
 * (D-007) is the same judgement for the same publisher and licence.
 */
export const GIVEN_NAMES_RIGHTS_PROFILE: RightsProfileSeed = {
  ...PESEL_RIGHTS_PROFILE,
  checked_at: "2026-10-03T00:00:00Z",
  notes:
    "dane.gov.pl dataset 1667 'Lista imion występujących w rejestrze PESEL', " +
    "licence CC0 1.0 read on 2026-10-03. Same publisher and licence as the surname " +
    "lists; D-007's judgement on commercial use is carried over, not re-decided.",
};

export interface GivenNameSourceSeed {
  readonly source_key: string;
  readonly name: string;
  readonly publisher: string;
  readonly source_type: "OFFICIAL_DATASET";
  readonly granularity: "GIVEN_NAME";
  readonly geographic_scope: readonly string[];
  readonly temporal_from: string;
  readonly temporal_to: string;
  readonly methodology_notes: string;
  readonly authority_tier: "A_PRIMARY_OFFICIAL";
  readonly production_status: "LEGAL_REVIEW_REQUIRED";
  readonly homepage_or_reference_url: string;
}

export const GIVEN_NAMES_SOURCE: GivenNameSourceSeed = {
  source_key: GIVEN_NAMES_SOURCE_KEY,
  name: "Lista imion występujących w rejestrze PESEL",
  publisher: "Ministerstwo Cyfryzacji",
  source_type: "OFFICIAL_DATASET",
  granularity: "GIVEN_NAME",
  geographic_scope: ["PL"],
  temporal_from: "2026-01-20",
  temporal_to: "2026-01-20",
  methodology_notes:
    "Given names of living persons in the PESEL register, one list per sex and name " +
    "position. Single occurrences and deceased persons are left out by the publisher " +
    "('Pojedyncze wystąpienia oraz dane dot. osób zmarłych nie zostały umieszczone na " +
    "liście'): absence is never a confirmed zero. The lists carry placeholder rows " +
    "('BRAK DANYCH' and others) that are not names (ADR-0030 §3).",
  authority_tier: "A_PRIMARY_OFFICIAL",
  production_status: "LEGAL_REVIEW_REQUIRED",
  homepage_or_reference_url:
    "https://dane.gov.pl/pl/dataset/1667,lista-imion-wystepujacych-w-rejestrze-pesel",
};

export interface GivenNameResourceDescriptor {
  readonly role: "first_male" | "first_female";
  /** The sex column's value on every row of the file. */
  readonly sex_value: "MĘŻCZYZNA" | "KOBIETA";
  readonly resource_id: string;
  readonly resource_title: string;
  readonly data_date: string;
  readonly portal_modified_at: string;
  readonly retrieved_at: string;
  readonly official_source_url: string;
  /** SHA-256 of the full official file. Not a fixture's. */
  readonly official_sha256: string;
  readonly official_byte_size: number;
  /** Data rows, placeholders included. */
  readonly official_row_count: number;
  /** The sum of every count in the file, placeholders included. */
  readonly official_people_sum: number;
  readonly universe_description: string;
  readonly methodology_key: string;
  readonly comparability_group: string;
  readonly coverage_notes: string;
}

const COVERAGE_NOTES =
  "One list per sex as the publisher partitions it; the male and female lists are NOT " +
  "summable and carry different comparability groups. Names occurring once are left " +
  "out: an absent name is BELOW_PUBLICATION_THRESHOLD_OR_ABSENT, never a zero. The " +
  "publisher's placeholder rows are counted in the file's total but are not names.";

export const GIVEN_NAMES_FIRST_MALE_2026: GivenNameResourceDescriptor = {
  role: "first_male",
  sex_value: "MĘŻCZYZNA",
  resource_id: "1159669",
  resource_title: "lista imion męskich w rejestrze PESEL stan na 20.01.2026 - imię pierwsze",
  data_date: "2026-01-20",
  portal_modified_at: "2026-01-30T09:45:36Z",
  retrieved_at: "2026-10-03T12:02:23Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/1159669,lista-imion-meskich-w-rejestrze-pesel-stan-na-20012026-imie-pierwsze/csv",
  official_sha256: "6a6e30832a880d5006ac5b884828235599cd5180aa2b4bb92e69adf004ca7853",
  official_byte_size: 1_095_529,
  official_row_count: 46_202,
  official_people_sum: 21_462_794,
  // The publisher's resource title, verbatim: the file carries no universe line of its own.
  universe_description: "lista imion męskich w rejestrze PESEL stan na 20.01.2026 - imię pierwsze",
  methodology_key: "pesel_given_name_first_2026_male_resource",
  comparability_group: "pesel_given_names_2026_first_male",
  coverage_notes: COVERAGE_NOTES,
};

export const GIVEN_NAMES_FIRST_FEMALE_2026: GivenNameResourceDescriptor = {
  role: "first_female",
  sex_value: "KOBIETA",
  resource_id: "1159670",
  resource_title: "lista imion żeńskich w rejestrze PESEL stan na 20.01.2026 - imię pierwsze",
  data_date: "2026-01-20",
  portal_modified_at: "2026-01-30T09:46:40Z",
  retrieved_at: "2026-10-03T12:02:26Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/1159670,lista-imion-zenskich-w-rejestrze-pesel-stan-na-20012026-imie-pierwsze/csv",
  official_sha256: "95dcfa121ef81d2102705e865744cfa433dcecd4a582157881f94cbde339f73a",
  official_byte_size: 557_487,
  official_row_count: 28_786,
  official_people_sum: 22_589_659,
  universe_description: "lista imion żeńskich w rejestrze PESEL stan na 20.01.2026 - imię pierwsze",
  methodology_key: "pesel_given_name_first_2026_female_resource",
  comparability_group: "pesel_given_names_2026_first_female",
  coverage_notes: COVERAGE_NOTES,
};

export const GIVEN_NAME_RESOURCES_2026: readonly GivenNameResourceDescriptor[] = [
  GIVEN_NAMES_FIRST_MALE_2026,
  GIVEN_NAMES_FIRST_FEMALE_2026,
];
