/**
 * First names given to children in Poland, by year of birth (ADR-0042,
 * TASK-132): dane.gov.pl dataset 219, its source and rights profile, and the
 * national first-name lists for 2000–2025, each pinned to the bytes read on
 * 2026-10-06.
 *
 * 2000–2019 come from one file (resource 21457) that carries the year in a
 * column. 2019 is also published as its own two files (21453, 21455); they
 * agree with 21457's 2019 rows name for name and count for count (read on
 * 2026-10-06), and they are not imported: one list per year and sex, never
 * two to be summed (ADR-0042 §3).
 */
import { PESEL_RIGHTS_PROFILE } from "../registry.js";
import type { RightsProfileSeed } from "../registry.js";
import type { GivenNameSourceSeed } from "./registry.js";

export const BIRTH_NAMES_SOURCE_KEY = "pl_pesel_birth_given_names";

export type BirthListSex = "MALE" | "FEMALE";

/** The header of the 2000–2019 file, exactly. */
export const BIRTH_NAMES_YEARS_HEADER = "Rok,Imię,Liczba,Płeć";
/** The `Płeć` column of the 2000–2019 file. */
export const BIRTH_NAMES_YEARS_SEX_VALUES: Readonly<Record<string, BirthListSex>> = {
  M: "MALE",
  K: "FEMALE",
};
/** The header of the yearly files, exactly, except 2022's. */
export const BIRTH_NAMES_ONE_YEAR_HEADER = "IMIĘ_PIERWSZE,PŁEĆ,LICZBA_WYSTĄPIEŃ";
/** 2022's two files carry spaces and the publisher's own "WYSTĄPIENIEŃ". Verbatim. */
export const BIRTH_NAMES_ONE_YEAR_HEADER_2022 = "IMIĘ PIERWSZE,PŁEĆ,LICZBA WYSTĄPIENIEŃ";

/**
 * The publisher's cut-off: "Do roku 2012 imiona z liczbą wystąpień poniżej 5
 * nie były umieszczane na liście, od 2013 r. granicą tą jest liczba 2". A name
 * absent from a year was given fewer times than this, never zero.
 */
export function birthListPublicationThreshold(birthYear: number): number {
  return birthYear <= 2012 ? 5 : 2;
}

/**
 * Dataset 219's licence, read on 2026-10-06 from the publisher's API
 * (`license_name: "CC0 1.0"`, institution 333, Ministerstwo Cyfryzacji): the
 * same publisher and licence as the surname lists, so D-007's judgement is
 * the same judgement.
 */
export const BIRTH_NAMES_RIGHTS_PROFILE: RightsProfileSeed = {
  ...PESEL_RIGHTS_PROFILE,
  checked_at: "2026-10-06T00:00:00Z",
  rights_url: "https://dane.gov.pl/pl/dataset/219,imiona-nadawane-dzieciom-w-polsce",
  notes:
    "dane.gov.pl dataset 219 'Imiona nadawane dzieciom w Polsce', licence CC0 1.0 " +
    "read on 2026-10-06. Same publisher and licence as the surname lists; D-007's " +
    "judgement on commercial use is carried over, not re-decided.",
};

export const BIRTH_NAMES_SOURCE: GivenNameSourceSeed = {
  source_key: BIRTH_NAMES_SOURCE_KEY,
  name: "Imiona nadawane dzieciom w Polsce",
  publisher: "Ministerstwo Cyfryzacji",
  source_type: "OFFICIAL_DATASET",
  granularity: "GIVEN_NAME",
  geographic_scope: ["PL"],
  temporal_from: "2000-01-01",
  temporal_to: "2025-12-31",
  methodology_notes:
    "First names given to children born in each year, from the PESEL register, one " +
    "list per year and sex. Names given fewer than 5 times were left out up to 2012, " +
    "fewer than 2 times from 2013 ('Do roku 2012 imiona z liczbą wystąpień poniżej 5 " +
    "nie były umieszczane na liście, od 2013 r. granicą tą jest liczba 2'): absence " +
    "is never a confirmed zero.",
  authority_tier: "A_PRIMARY_OFFICIAL",
  production_status: "LEGAL_REVIEW_REQUIRED",
  homepage_or_reference_url: "https://dane.gov.pl/pl/dataset/219,imiona-nadawane-dzieciom-w-polsce",
};

interface BirthNameResourceBase {
  readonly resource_id: string;
  readonly resource_title: string;
  /** The header row, exactly. */
  readonly header: string;
  /** The birth years the file holds: every one must be present, and no other. */
  readonly years: readonly number[];
  /** The sexes the file holds: every one must be present in every year, and no other. */
  readonly sexes: readonly BirthListSex[];
  readonly portal_modified_at: string;
  readonly retrieved_at: string;
  readonly official_source_url: string;
  /** SHA-256 of the full official file. Not a fixture's. */
  readonly official_sha256: string;
  readonly official_byte_size: number;
  /** Data rows, header excluded. */
  readonly official_row_count: number;
  /** The sum of every count in the file. */
  readonly official_people_sum: number;
  readonly universe_description: string;
  readonly methodology_key: string;
  /** The record's group; each list inside it carries its own (`birthListComparabilityGroup`). */
  readonly comparability_group: string;
  readonly coverage_notes: string;
}

export type BirthNameResourceDescriptor =
  | (BirthNameResourceBase & {
      /** `Rok,Imię,Liczba,Płeć`: the year and the sex on every row. */
      readonly layout: "YEARS_IN_ROWS";
    })
  | (BirthNameResourceBase & {
      /** Name, sex, count: one year and one sex per file. */
      readonly layout: "ONE_YEAR";
      /** The sex column's value on every row of the file. */
      readonly sex_value: "MĘŻCZYZNA" | "KOBIETA";
    });

/** One list's comparability group: lists of different years or sexes are never summed. */
export function birthListComparabilityGroup(birthYear: number, sex: BirthListSex): string {
  return `pesel_birth_given_names_first_${birthYear}_${sex.toLowerCase()}`;
}

const COVERAGE_NOTES =
  "One list per year of birth and sex as the publisher partitions them; lists of " +
  "different years or sexes are NOT summable. Names given fewer than 5 times (to 2012) " +
  "or fewer than 2 times (from 2013) are left out: an absent name is " +
  "BELOW_PUBLICATION_THRESHOLD_OR_ABSENT, never a zero.";

export const BIRTH_NAMES_FIRST_2000_2019: BirthNameResourceDescriptor = {
  layout: "YEARS_IN_ROWS",
  resource_id: "21457",
  resource_title: "Imiona nadane dzieciom w Polsce w latach 2000-2019 - imię pierwsze",
  header: BIRTH_NAMES_YEARS_HEADER,
  years: Array.from({ length: 20 }, (_, i) => 2000 + i),
  sexes: ["MALE", "FEMALE"],
  portal_modified_at: "2023-12-27T11:59:07Z",
  retrieved_at: "2026-10-06T10:57:38Z",
  // A native CSV: the official URL is the media file itself.
  official_source_url:
    "https://api.dane.gov.pl/media/resources/20200129/Imiona_nadane_wPolsce_w_latach_2000-2019.csv",
  official_sha256: "471d8ff99756f3030b492fb32517a70f5c8bc42675dc9fd1e19cf5f2208ca6a7",
  official_byte_size: 440_085,
  official_row_count: 24_461,
  official_people_sum: 8_064_304,
  universe_description: "Imiona nadane dzieciom w Polsce w latach 2000-2019 - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2000_2019_resource",
  comparability_group: "pesel_birth_given_names_first_2000_2019",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_MALE_2020: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "28020",
  resource_title: "Imiona męskie nadane dzieciom w Polsce w 2020 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2020],
  sexes: ["MALE"],
  sex_value: "MĘŻCZYZNA",
  portal_modified_at: "2021-02-03T07:38:59Z",
  retrieved_at: "2026-10-06T10:57:40Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/28020,imiona-meskie-nadane-dzieciom-w-polsce-w-2020-r-imie-pierwsze/csv",
  official_sha256: "dfd0f1394c316601888a03c2eaea7413639114997a6331dd75148a2110533125",
  official_byte_size: 18_246,
  official_row_count: 799,
  official_people_sum: 186_590,
  universe_description: "Imiona męskie nadane dzieciom w Polsce w 2020 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2020_male_resource",
  comparability_group: "pesel_birth_given_names_first_2020_male",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_FEMALE_2020: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "28021",
  resource_title: "Imiona żeńskie nadane dzieciom w Polsce w 2020 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2020],
  sexes: ["FEMALE"],
  sex_value: "KOBIETA",
  portal_modified_at: "2021-02-03T07:43:15Z",
  retrieved_at: "2026-10-06T10:57:41Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/28021,imiona-zenskie-nadane-dzieciom-w-polsce-w-2020-r-imie-pierwsze/csv",
  official_sha256: "ae0033ec115300b791a64468cd48a06975147177a1c7d110f5d99871854599cf",
  official_byte_size: 15_009,
  official_row_count: 799,
  official_people_sum: 176_829,
  universe_description: "Imiona żeńskie nadane dzieciom w Polsce w 2020 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2020_female_resource",
  comparability_group: "pesel_birth_given_names_first_2020_female",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_MALE_2021: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "36393",
  resource_title: "Imiona męskie nadane dzieciom w Polsce w 2021 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2021],
  sexes: ["MALE"],
  sex_value: "MĘŻCZYZNA",
  portal_modified_at: "2022-02-07T06:58:05Z",
  retrieved_at: "2026-10-06T10:57:42Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/36393,imiona-meskie-nadane-dzieciom-w-polsce-w-2021-r-imie-pierwsze/csv",
  official_sha256: "e3df575d9d1c7c1cfbbfd9d9f63b6d24d649cad2bb6bb3fdcd38da419d49a5bf",
  official_byte_size: 19_598,
  official_row_count: 860,
  official_people_sum: 175_132,
  universe_description: "Imiona męskie nadane dzieciom w Polsce w 2021 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2021_male_resource",
  comparability_group: "pesel_birth_given_names_first_2021_male",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_FEMALE_2021: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "36394",
  resource_title: "Imiona żeńskie nadane dzieciom w Polsce w 2021 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2021],
  sexes: ["FEMALE"],
  sex_value: "KOBIETA",
  portal_modified_at: "2022-02-07T07:00:46Z",
  retrieved_at: "2026-10-06T10:57:43Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/36394,imiona-zenskie-nadane-dzieciom-w-polsce-w-2021-r-imie-pierwsze/csv",
  official_sha256: "e115e2b462319afd500eaaafb840c68452b193c5c64a802c3bfe638c793e0888",
  official_byte_size: 15_448,
  official_row_count: 822,
  official_people_sum: 165_856,
  universe_description: "Imiona żeńskie nadane dzieciom w Polsce w 2021 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2021_female_resource",
  comparability_group: "pesel_birth_given_names_first_2021_female",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_MALE_2022: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "44825",
  resource_title: "Imiona męskie nadane dzieciom w Polsce w 2022 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER_2022,
  years: [2022],
  sexes: ["MALE"],
  sex_value: "MĘŻCZYZNA",
  portal_modified_at: "2023-02-03T07:15:11Z",
  retrieved_at: "2026-10-06T10:57:44Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/44825,imiona-meskie-nadane-dzieciom-w-polsce-w-2022-r-imie-pierwsze/csv",
  official_sha256: "f2f4d23f9c4cf22e36c52a224b35164f6520b77666c49e5f1954ca3cc252f7a4",
  official_byte_size: 23_529,
  official_row_count: 1_033,
  official_people_sum: 163_864,
  universe_description: "Imiona męskie nadane dzieciom w Polsce w 2022 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2022_male_resource",
  comparability_group: "pesel_birth_given_names_first_2022_male",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_FEMALE_2022: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "44824",
  resource_title: "Imiona żeńskie nadane dzieciom w Polsce w 2022 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER_2022,
  years: [2022],
  sexes: ["FEMALE"],
  sex_value: "KOBIETA",
  portal_modified_at: "2023-02-03T07:13:00Z",
  retrieved_at: "2026-10-06T10:58:04Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/44824,imiona-zenskie-nadane-dzieciom-w-polsce-w-2022-r-imie-pierwsze/csv",
  official_sha256: "e9612b465d51e0d12f5e8a6dae470384fc87a6bc8a9e29b9109b9ca860016af9",
  official_byte_size: 19_091,
  official_row_count: 1_015,
  official_people_sum: 155_704,
  universe_description: "Imiona żeńskie nadane dzieciom w Polsce w 2022 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2022_female_resource",
  comparability_group: "pesel_birth_given_names_first_2022_female",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_MALE_2023: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "54099",
  resource_title: "Imiona męskie nadane dzieciom w Polsce w 2023 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2023],
  sexes: ["MALE"],
  sex_value: "MĘŻCZYZNA",
  portal_modified_at: "2024-01-26T07:10:01Z",
  retrieved_at: "2026-10-06T10:57:52Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/54099,imiona-meskie-nadane-dzieciom-w-polsce-w-2023-r-imie-pierwsze/csv",
  official_sha256: "ebc537fe568c2ba21c3e7af770c97941a12b0d20e38a9eec7f39f3467afd1408",
  official_byte_size: 22_401,
  official_row_count: 984,
  official_people_sum: 145_349,
  universe_description: "Imiona męskie nadane dzieciom w Polsce w 2023 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2023_male_resource",
  comparability_group: "pesel_birth_given_names_first_2023_male",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_FEMALE_2023: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "54100",
  resource_title: "Imiona żeńskie nadane dzieciom w Polsce w 2023 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2023],
  sexes: ["FEMALE"],
  sex_value: "KOBIETA",
  portal_modified_at: "2024-01-26T07:16:03Z",
  retrieved_at: "2026-10-06T10:57:53Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/54100,imiona-zenskie-nadane-dzieciom-w-polsce-w-2023-r-imie-pierwsze/csv",
  official_sha256: "3e1e37b0650271dbf1b39ebbff1558262eebcc7a328949d3ec3226c2798edade",
  official_byte_size: 18_310,
  official_row_count: 976,
  official_people_sum: 138_666,
  universe_description: "Imiona żeńskie nadane dzieciom w Polsce w 2023 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2023_female_resource",
  comparability_group: "pesel_birth_given_names_first_2023_female",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_MALE_2024: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "63900",
  resource_title: "Imiona męskie nadane dzieciom w Polsce w 2024 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2024],
  sexes: ["MALE"],
  sex_value: "MĘŻCZYZNA",
  portal_modified_at: "2025-01-24T09:02:47Z",
  retrieved_at: "2026-10-06T10:57:54Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/63900,imiona-meskie-nadane-dzieciom-w-polsce-w-2024-r-imie-pierwsze/csv",
  official_sha256: "ee7612aa4d605fb7f0f08eea59d5b04db08fd1e36bac751000fdaf08603865fa",
  official_byte_size: 21_964,
  official_row_count: 967,
  official_people_sum: 134_314,
  universe_description: "Imiona męskie nadane dzieciom w Polsce w 2024 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2024_male_resource",
  comparability_group: "pesel_birth_given_names_first_2024_male",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_FEMALE_2024: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "63899",
  resource_title: "Imiona żeńskie nadane dzieciom w Polsce w 2024 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2024],
  sexes: ["FEMALE"],
  sex_value: "KOBIETA",
  portal_modified_at: "2025-01-24T09:01:06Z",
  retrieved_at: "2026-10-06T10:57:55Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/63899,imiona-zenskie-nadane-dzieciom-w-polsce-w-2024-r-imie-pierwsze/csv",
  official_sha256: "1b84511477d739ead7aed8fa94e423308a461446868dcda0d1552814fb5eca02",
  official_byte_size: 18_345,
  official_row_count: 978,
  official_people_sum: 126_456,
  universe_description: "Imiona żeńskie nadane dzieciom w Polsce w 2024 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2024_female_resource",
  comparability_group: "pesel_birth_given_names_first_2024_female",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_MALE_2025: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "1159536",
  resource_title: "Imiona męskie nadane dzieciom w Polsce w 2025 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2025],
  sexes: ["MALE"],
  sex_value: "MĘŻCZYZNA",
  portal_modified_at: "2026-01-30T08:51:12Z",
  retrieved_at: "2026-10-06T10:57:56Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/1159536,imiona-meskie-nadane-dzieciom-w-polsce-w-2025-r-imie-pierwsze/csv",
  official_sha256: "447f64ad7008f7960341710322d4f4d20e928129753f9469a10abc593da92beb",
  official_byte_size: 21_926,
  official_row_count: 965,
  official_people_sum: 126_404,
  universe_description: "Imiona męskie nadane dzieciom w Polsce w 2025 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2025_male_resource",
  comparability_group: "pesel_birth_given_names_first_2025_male",
  coverage_notes: COVERAGE_NOTES,
};

export const BIRTH_NAMES_FIRST_FEMALE_2025: BirthNameResourceDescriptor = {
  layout: "ONE_YEAR",
  resource_id: "1159538",
  resource_title: "Imiona żeńskie nadane dzieciom w Polsce w 2025 r. - imię pierwsze",
  header: BIRTH_NAMES_ONE_YEAR_HEADER,
  years: [2025],
  sexes: ["FEMALE"],
  sex_value: "KOBIETA",
  portal_modified_at: "2026-01-30T08:52:49Z",
  retrieved_at: "2026-10-06T10:57:57Z",
  official_source_url:
    "https://api.dane.gov.pl/resources/1159538,imiona-zenskie-nadane-dzieciom-w-polsce-w-2025-r-imie-pierwsze/csv",
  official_sha256: "213d8c29e64bb61982ec534d39c98113dfd402451e88613a18842f2891c187e4",
  official_byte_size: 17_592,
  official_row_count: 939,
  official_people_sum: 119_788,
  universe_description: "Imiona żeńskie nadane dzieciom w Polsce w 2025 r. - imię pierwsze",
  methodology_key: "pesel_birth_given_name_first_2025_female_resource",
  comparability_group: "pesel_birth_given_names_first_2025_female",
  coverage_notes: COVERAGE_NOTES,
};

/** Every national first-name list, 2000–2025: one resource per (year, sex), never two. */
export const BIRTH_NAME_RESOURCES: readonly BirthNameResourceDescriptor[] = [
  BIRTH_NAMES_FIRST_2000_2019,
  BIRTH_NAMES_FIRST_MALE_2020,
  BIRTH_NAMES_FIRST_FEMALE_2020,
  BIRTH_NAMES_FIRST_MALE_2021,
  BIRTH_NAMES_FIRST_FEMALE_2021,
  BIRTH_NAMES_FIRST_MALE_2022,
  BIRTH_NAMES_FIRST_FEMALE_2022,
  BIRTH_NAMES_FIRST_MALE_2023,
  BIRTH_NAMES_FIRST_FEMALE_2023,
  BIRTH_NAMES_FIRST_MALE_2024,
  BIRTH_NAMES_FIRST_FEMALE_2024,
  BIRTH_NAMES_FIRST_MALE_2025,
  BIRTH_NAMES_FIRST_FEMALE_2025,
];
