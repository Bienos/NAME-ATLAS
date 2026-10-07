import type { CitationDto, SurnameResultResponse } from "@name-atlas/contracts";
import { FULL_NAME_REPORT_SCHEMA_VERSION, FULL_NAME_SECTION_TYPES } from "@name-atlas/truth";
import type {
  BirthSexFigures,
  BirthYearFigures,
  GivenNameReportFacts,
  StoredReportVersion,
} from "@name-atlas/truth";

/**
 * The sample report (TASK-172): WIELIMIRA WRZOSOWIECKA, an invented person,
 * with every chapter filled with invented figures, words and sources, so a
 * reader can see what the full report looks like before it can be bought.
 *
 * NOTHING HERE IS A FACT. Neither name is on the PESEL lists (checked on
 * 2026-10-07: the surname does not resolve on production, the first name is
 * not on the 2026-01-20 lists of first names). Every source is invented and
 * says so in its title, so no real publisher is credited with an invented
 * figure. The PDF marks every page of it "PRZYKŁAD" (`report-pdf.tsx`).
 *
 * It is shaped exactly like a stored full-name report version, so it goes
 * through the same parsing (`toReportPreview`) and the same PDF as a real one.
 */

/** Marks every invented source's title. */
const INVENTED = { pl: "dane zmyślone", en: "invented data" } as const;

const cite = (
  id: string,
  title: string,
  publisher: string | null,
  locator: string,
  date: string | null = null,
): CitationDto => ({
  id,
  title: `${title} (${INVENTED.pl})`,
  publisher,
  publication_date: date,
  source_type: "OTHER",
  locator,
  url: null,
  attribution: null,
  terms: null,
  retrieved_at: null,
  source_page_url: null,
});

const SNAPSHOT = "2026-01-20";
const PUBLISHER = "Name Atlas · przykład";

const C = {
  surnameFemale: cite(
    "sample-cit-surname-f",
    "Przykładowy rejestr nazwisk, nazwiska żeńskie",
    PUBLISHER,
    "resource:900011",
    SNAPSHOT,
  ),
  surnameMale: cite(
    "sample-cit-surname-m",
    "Przykładowy rejestr nazwisk, nazwiska męskie",
    PUBLISHER,
    "resource:900012",
    SNAPSHOT,
  ),
  regions: cite(
    "sample-cit-regions",
    "Przykładowy rejestr nazwisk według województw",
    PUBLISHER,
    "resource:900013",
    SNAPSHOT,
  ),
  change: cite(
    "sample-cit-change",
    "Przykładowy rejestr nazwisk, wydania 2019–2026",
    PUBLISHER,
    "resource:900014",
    SNAPSHOT,
  ),
  surnameDictionary: cite(
    "sample-cit-surname-dictionary",
    "Słownik nazwisk od nazw roślin",
    "J. Wzorcowy",
    "s. 214",
    "1931",
  ),
  surnamePlaces: cite(
    "sample-cit-surname-places",
    "Nazwiska od nazw miejscowych",
    "M. Przykładowa",
    "s. 77, hasło Wrzosowiecki",
    "1958",
  ),
  archive: cite(
    "sample-cit-archive",
    "Przykładowa biblioteka cyfrowa",
    PUBLISHER,
    '"WRZOSOWIECKA"',
  ),
  givenList: cite(
    "sample-cit-given-f",
    "Przykładowa lista imion, imiona żeńskie, imię pierwsze",
    PUBLISHER,
    "resource:900001",
    SNAPSHOT,
  ),
  births: cite(
    "sample-cit-births",
    "Przykładowe listy imion nadawanych dzieciom",
    PUBLISHER,
    "resource:900002",
    "2026",
  ),
  givenOld: cite(
    "sample-cit-given-old",
    "Imiona słowiańskie i ich znaczenie",
    "A. Zmyślona",
    "s. 41",
    "1924",
  ),
  givenGlossary: cite(
    "sample-cit-given-glossary",
    "A Glossary of Slavonic Names",
    "E. Imaginary",
    "p. 312",
    "1902",
  ),
} as const;

const ALLOWED = {
  surface: "PAID",
  decision: "ALLOWED",
  reason_code: "RIGHTS_PERMIT_PAID_SURFACE",
} as const;
const VERIFIED = { status: "VERIFIED", methodology_code: "przyklad@1" } as const;

const FEMALE = "pesel_2026_national_female";
const MALE = "pesel_2026_national_male";

/** The voivodeships with invented counts of WRZOSOWIECKA, largest first. */
const REGIONS: readonly (readonly [string, string, number])[] = [
  ["30", "WIELKOPOLSKIE", 312],
  ["04", "KUJAWSKO-POMORSKIE", 201],
  ["14", "MAZOWIECKIE", 166],
  ["22", "POMORSKIE", 118],
  ["10", "ŁÓDZKIE", 97],
  ["02", "DOLNOŚLĄSKIE", 64],
  ["32", "ZACHODNIOPOMORSKIE", 51],
  ["24", "ŚLĄSKIE", 43],
  ["08", "LUBUSKIE", 35],
  ["28", "WARMIŃSKO-MAZURSKIE", 28],
  ["12", "MAŁOPOLSKIE", 22],
  ["06", "LUBELSKIE", 14],
  ["16", "OPOLSKIE", 11],
  ["26", "ŚWIĘTOKRZYSKIE", 9],
  ["20", "PODLASKIE", 6],
  ["18", "PODKARPACKIE", 4],
];
const COVERED = REGIONS.reduce((sum, [, , n]) => sum + n, 0);
const FEMALE_COUNT = 1_214;
const MALE_COUNT = 1_187;

const changePoints = (counts: readonly number[], totals: readonly number[]) => {
  const dates = [
    "2019-06-30",
    "2020-01-22",
    "2021-02-01",
    "2022-01-27",
    "2023-01-30",
    "2024-01-19",
    "2025-01-22",
    SNAPSHOT,
  ];
  return dates.map((data_date, i) => {
    const count = counts[i] as number;
    const list_total = totals[i] as number;
    return {
      status: "KNOWN" as const,
      data_date,
      note_code: null,
      source_url: null,
      count,
      list_total,
      one_in_x: Math.round(list_total / count),
      share: Number((count / list_total).toFixed(9)),
    };
  });
};
const FEMALE_TOTALS = [
  20_249_319, 20_220_345, 20_263_212, 20_301_118, 21_369_477, 21_479_386, 21_535_515, 21_560_302,
];
const MALE_TOTALS = [
  19_859_783, 19_879_045, 19_987_207, 20_203_548, 20_808_071, 20_976_785, 21_096_170, 21_197_537,
];
const femalePoints = changePoints(
  [1_131, 1_142, 1_150, 1_163, 1_178, 1_190, 1_203, FEMALE_COUNT],
  FEMALE_TOTALS,
);
const malePoints = changePoints(
  [1_214, 1_209, 1_206, 1_201, 1_198, 1_194, 1_190, MALE_COUNT],
  MALE_TOTALS,
);
const changeSummary = (points: typeof femalePoints) => {
  const first = points[0] as (typeof points)[number];
  const last = points[points.length - 1] as (typeof points)[number];
  const pct = (a: number, b: number) => Number((((b - a) / a) * 100).toFixed(1));
  return {
    last: { count: last.count, data_date: last.data_date, list_total: last.list_total },
    first: { count: first.count, data_date: first.data_date, list_total: first.list_total },
    known_points: points.length,
    list_change_percent: pct(first.list_total, last.list_total),
    count_change_percent: pct(first.count, last.count),
  };
};

const SURNAME_ID = "00000000-0000-4000-8000-000000000001";

export const SAMPLE_RESPONSE: SurnameResultResponse = {
  schema_version: "1.13",
  status: "RESOLVED",
  surname: { id: SURNAME_ID, display_name: "WRZOSOWIECKA", script: "Latn" },
  population: {
    state: "READY",
    observations: (
      [
        [FEMALE, FEMALE_COUNT, C.surnameFemale],
        [MALE, MALE_COUNT, C.surnameMale],
      ] as const
    ).map(([group, value, citation]) => ({
      value: { status: "KNOWN", value, unit: "PEOPLE", scope_label_code: "PESEL_CURRENT_SURNAME" },
      snapshot_date: SNAPSHOT,
      country_code: "PL",
      source_population_scope: `Przykład: ${INVENTED.pl}`,
      coverage_notes: `Przykład: ${INVENTED.pl}.`,
      comparability_group: group,
      confidence: VERIFIED,
      citation,
    })),
    reason_code: null,
    surface: ALLOWED,
  },
  rarity: {
    state: "READY",
    entries: (
      [
        [FEMALE, FEMALE_COUNT, 21_560_302, 9_412, C.surnameFemale],
        [MALE, MALE_COUNT, 21_197_537, 9_377, C.surnameMale],
      ] as const
    ).map(([group, numerator, denominator, rank, citation]) => ({
      primary: { metric: "ONE_IN_X", value: Math.round(denominator / numerator) },
      supporting: [{ metric: "RANK", value: rank }],
      methodology_code: "PESEL_PUBLISHED_UNIVERSE_SUM_V1",
      universe_label_code: "PESEL_PUBLISHED_UNIVERSE",
      numerator,
      denominator,
      share: Number((numerator / denominator).toFixed(9)),
      scope_label_code: "PESEL_CURRENT_SURNAME",
      snapshot_date: SNAPSHOT,
      country_code: "PL",
      comparability_group: group,
      confidence: VERIFIED,
      citation,
    })),
    reason_code: null,
    surface: ALLOWED,
  },
  distribution: {
    state: "READY",
    entries: [
      {
        coverage_state: "READY",
        regions: REGIONS.map(([terc, name, count], i) => ({
          place_id: `00000000-0000-4000-8000-0000000001${String(i).padStart(2, "0")}`,
          terc_code: terc,
          display_name: name,
          count,
          share_of_covered: Number((count / COVERED).toFixed(9)),
        })),
        covered_count: COVERED,
        national_count: FEMALE_COUNT,
        coverage_ratio: Number((COVERED / FEMALE_COUNT).toFixed(9)),
        coverage_basis: `Przykład: ${INVENTED.pl}.`,
        low_coverage_threshold: 0.5,
        universe_label_code: "PESEL_REGISTERED_VOIVODESHIP_COVERED_SET",
        scope_label_code: "PESEL_CURRENT_SURNAME",
        snapshot_date: SNAPSHOT,
        country_code: "PL",
        comparability_group: "pesel_2026_regional_female",
        confidence: VERIFIED,
        citation: C.regions,
      },
    ],
    reason_code: null,
    surface: ALLOWED,
  },
  suggestions: null,
  meaning: {
    state: "AVAILABLE",
    interpretations: [
      {
        root_form: "Wrzosowiec",
        root_language: "polski",
        literal_gloss: "od nazwy miejscowej Wrzosowiec, „miejsce porośnięte wrzosem”",
        formation_type: "TOPONYMIC",
        work: {
          title: C.surnamePlaces.title,
          author_or_publisher: "M. Przykładowa",
          year: 1958,
        },
        locator: "s. 77",
      },
      {
        root_form: "wrzos",
        root_language: "polski",
        literal_gloss: "od rośliny wrzos; przezwisko kogoś mieszkającego przy wrzosowisku",
        formation_type: "DESCRIPTIVE",
        work: {
          title: C.surnameDictionary.title,
          author_or_publisher: "J. Wzorcowy",
          year: 1931,
        },
        locator: "s. 214",
      },
    ],
    confidence: "POSSIBLE",
    methodology_code: "przyklad@1",
    reason_code: null,
    surface: ALLOWED,
  },
  change: {
    state: "READY",
    entries: [
      {
        list: "MALE",
        points: malePoints,
        gaps: [],
        summary: changeSummary(malePoints),
        methodology_code: "distribution_shift@1",
        scope_label_code: "PESEL_CURRENT_SURNAME",
        country_code: "PL",
        confidence: VERIFIED,
        citation: C.change,
      },
      {
        list: "FEMALE",
        points: femalePoints,
        gaps: [],
        summary: changeSummary(femalePoints),
        methodology_code: "distribution_shift@1",
        scope_label_code: "PESEL_CURRENT_SURNAME",
        country_code: "PL",
        confidence: VERIFIED,
        citation: C.change,
      },
    ],
    reason_code: null,
    surface: ALLOWED,
  },
  archive: {
    state: "READY",
    query: '"WRZOSOWIECKA"',
    searched_on: "2026-10-01",
    catalogue_records: 37,
    catalogue_by_category: [
      { count: 21, label: "Czasopisma" },
      { count: 11, label: "Książki" },
      { count: 5, label: "Druki ulotne" },
    ],
    pages: 412,
    pages_by_period: [
      { count: 58, to_year: 1899, from_year: 1850 },
      { count: 143, to_year: 1939, from_year: 1919 },
      { count: 211, to_year: null, from_year: 1940 },
    ],
    pages_by_place: [
      { count: 167, label: "Poznań" },
      { count: 98, label: "Bydgoszcz" },
      { count: 61, label: "Warszawa" },
    ],
    examples: [],
    confidence: { status: "VERIFIED", methodology_code: "przyklad@1" },
    citation: C.archive,
    reason_code: null,
    surface: ALLOWED,
  },
  // Not in the report: no invented person, list neighbour or place is named.
  bearers: {
    state: "NOT_SEARCHED",
    searched_on: null,
    total: null,
    with_death_date: null,
    people: [],
    more: null,
    confidence: null,
    citation: null,
    reason_code: "SAMPLE_NOT_SEARCHED",
    surface: ALLOWED,
  },
  neighbours: {
    state: "UNAVAILABLE",
    lists: [],
    reason_code: "SAMPLE_NOT_SHOWN",
    surface: ALLOWED,
  },
  other_form: {
    surname: {
      id: "00000000-0000-4000-8000-000000000002",
      display_name: "WRZOSOWIECKI",
      script: "Latn",
    },
    rule_code: "ADJECTIVAL_SKI_CKI_DZKI",
    comparability_group: MALE,
    snapshot_date: SNAPSHOT,
    rank: 9_377,
    count: MALE_COUNT,
    surface: ALLOWED,
  },
  localities: {
    state: "NOT_LOADED",
    reference_date: null,
    places: [],
    total: null,
    confidence: null,
    citation: null,
    reason_code: "SAMPLE_NOT_LOADED",
    surface: ALLOWED,
  },
  other_spelling: null,
};

const GIVEN_ID = "00000000-0000-4000-8000-000000000010";

/** The girls' lists from 2000 to 2025: the name off the list until 2009, then rising. */
const GIRLS: readonly (readonly [number, number | null, number | null, number])[] = [
  // [year, count, rank, children on the list]
  [2000, null, null, 178_402],
  [2001, null, null, 174_955],
  [2002, null, null, 171_314],
  [2003, null, null, 170_982],
  [2004, null, null, 172_640],
  [2005, null, null, 175_093],
  [2006, null, null, 181_211],
  [2007, null, null, 187_420],
  [2008, null, null, 196_117],
  [2009, 6, 812, 199_036],
  [2010, 9, 701, 197_804],
  [2011, 14, 598, 188_311],
  [2012, 22, 487, 185_926],
  [2013, 31, 431, 178_215],
  [2014, 43, 384, 177_904],
  [2015, 58, 341, 176_522],
  [2016, 71, 312, 182_637],
  [2017, 94, 271, 192_008],
  [2018, 118, 238, 186_441],
  [2019, 137, 214, 183_212],
  [2020, 152, 199, 176_829],
  [2021, 171, 183, 157_305],
  [2022, 186, 171, 149_660],
  [2023, 198, 160, 133_212],
  [2024, 207, 152, 125_430],
  [2025, 214, 146, 119_788],
];

const listOf = (sex: "MALE" | "FEMALE", year: number, people: number) => ({
  list_id: `sample-list-${sex.toLowerCase()}-${String(year)}`,
  birth_year: year,
  sex,
  publication_threshold: year <= 2012 ? 5 : 2,
  people_sum: people,
});

const girlYears: BirthYearFigures[] = GIRLS.map(([year, count, rank, people]) => ({
  birth_year: year,
  list: listOf("FEMALE", year, people),
  count:
    count === null
      ? null
      : {
          claim_id: `sample-claim-birth-count-${String(year)}`,
          count,
          share_per_million: Math.floor((count * 1_000_000) / people),
          one_in: Math.round(people / count),
          citation: C.births,
        },
  rank:
    rank === null
      ? null
      : {
          claim_id: `sample-claim-birth-rank-${String(year)}`,
          rank,
          universe_size: 939,
          citation: C.births,
        },
}));
const latestGirls = girlYears[girlYears.length - 1] as BirthYearFigures;

const BOYS_PEOPLE = 126_404;
const boyYears: BirthYearFigures[] = GIRLS.map(([year, , , people]) => ({
  birth_year: year,
  list: listOf("MALE", year, Math.round(people * 1.05)),
  count: null,
  rank: null,
}));

const girls: BirthSexFigures = {
  sex: "FEMALE",
  on_any_list: true,
  latest: latestGirls,
  trend: {
    claim_id: "sample-claim-birth-trend",
    direction: "RISING",
    latest_year: 2025,
    earlier_year: 2020,
    window_years: 5,
    change_percent: 10,
    latest_share_per_million: Math.floor((214 * 1_000_000) / 119_788),
    earlier_share_per_million: Math.floor((152 * 1_000_000) / 176_829),
    citations: [C.births],
  },
  history: girlYears,
};
const boys: BirthSexFigures = {
  sex: "MALE",
  on_any_list: false,
  latest: { ...(boyYears[boyYears.length - 1] as BirthYearFigures) },
  trend: null,
  history: boyYears.map((y, i) =>
    i === boyYears.length - 1 ? { ...y, list: listOf("MALE", 2025, BOYS_PEOPLE) } : y,
  ),
};

export const SAMPLE_GIVEN_NAME: GivenNameReportFacts = {
  given_name: { id: GIVEN_ID, display_name: "WIELIMIRA" },
  state: "READY",
  lists: [
    {
      comparability_group: "pesel_2026_first_female",
      snapshot_date: SNAPSHOT,
      count: {
        claim_id: "sample-claim-given-count",
        count: 1_486,
        confidence: VERIFIED,
        citation: C.givenList,
      },
      rank: {
        claim_id: "sample-claim-given-rank",
        rank: 512,
        universe_size: 28_781,
        ties_policy: "COMPETITION",
        confidence: VERIFIED,
        citation: C.givenList,
      },
    },
  ],
  meaning: {
    state: "READY",
    claim_id: "sample-claim-given-meaning",
    confidence: { status: "LIKELY", methodology_code: "przyklad@1" },
    works: [
      {
        work: { title: C.givenGlossary.title, author_or_publisher: "E. Imaginary", year: 1902 },
        printed_form: "Velimira",
        origin: { code: "sla", as_printed: "Slav." },
        literal_gloss: "great peace",
        translation: { language: "pl", text: "wielki pokój", by: "Name Atlas" },
        locator: "p. 312",
        quotation: "Velimira, f. Slav. great peace.",
        citation: C.givenGlossary,
      },
      {
        work: { title: C.givenOld.title, author_or_publisher: "A. Zmyślona", year: 1924 },
        printed_form: "Wielimira",
        origin: { code: "sla", as_printed: "staropolskie" },
        literal_gloss: "ta, której pokój jest wielki",
        translation: null,
        locator: "s. 41",
        quotation: "Wielimira, imię staropolskie: z wiele- i -mir, ta, której pokój jest wielki.",
        citation: C.givenOld,
      },
    ],
  },
  births: {
    given_name: { id: GIVEN_ID, display_name: "WIELIMIRA" },
    state: "READY",
    sexes: [boys, girls],
  },
};

/**
 * The bibliography's order: the first name's sources, then the surname's. The
 * surname's dictionaries are named in its origin's table, as a real report's are.
 */
const SOURCE_IDS = [
  C.givenList,
  C.births,
  C.givenGlossary,
  C.givenOld,
  C.surnameFemale,
  C.surnameMale,
  C.regions,
  C.change,
  C.archive,
].map((c) => c.id);

const claims = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    claim_id: `sample-claim-${prefix}-${String(i + 1)}`,
    presentation_role: i === 0 ? ("HERO" as const) : ("SUPPORT" as const),
  }));

const SECTION_CLAIMS: Readonly<Record<string, number>> = {
  GIVEN_NAME: 37,
  ORIGIN: 1,
  DISTRIBUTION: 5,
  TIMELINE: 2,
  ARCHIVES: 1,
};

/** The sample as a stored full-name report version; nothing of it is stored. */
export const SAMPLE_REPORT: StoredReportVersion = {
  report_version_id: "00000000-0000-4000-8000-000000000100",
  report_type: "FULL_NAME",
  version_number: 1,
  report_schema_version: FULL_NAME_REPORT_SCHEMA_VERSION,
  eligibility_state: "ELIGIBLE",
  generated_at: "2026-10-07T12:00:00.000Z",
  payload: {
    report_schema_version: FULL_NAME_REPORT_SCHEMA_VERSION,
    surface: "PAID",
    entitlement_kind: "INTERNAL_TEST",
    response: SAMPLE_RESPONSE,
    coverage: {
      display_name: "WRZOSOWIECKA",
      dimensions: [
        { dimension: "POPULATION", availability: "STRONG" },
        { dimension: "RARITY", availability: "STRONG" },
        { dimension: "MODERN_GEOGRAPHY", availability: "STRONG" },
        { dimension: "CHANGE_OVER_TIME", availability: "STRONG" },
        { dimension: "ETYMOLOGY", availability: "STRONG" },
        { dimension: "ARCHIVES", availability: "PARTIAL" },
        { dimension: "VARIANTS", availability: "NOT_RETRIEVED" },
        { dimension: "HISTORICAL_PLACES", availability: "NOT_RETRIEVED" },
        { dimension: "MIGRATION", availability: "NOT_RETRIEVED" },
      ],
    },
    discovery_index: { entries: [] },
    eligibility: { state: "ELIGIBLE", reason_codes: [] },
    given_name: SAMPLE_GIVEN_NAME,
  },
  sections: FULL_NAME_SECTION_TYPES.map((type, i) => ({
    section_type: type,
    sequence_number: i + 1,
    title_payload: { message_key: `report.section.${type.toLowerCase()}` },
    body_payload:
      type === "SOURCES"
        ? { citation_ids: SOURCE_IDS }
        : type === "LIMITATIONS"
          ? {
              given_name: [
                { topic: "FULL_NAME_COUNT", reason_code: "NO_SOURCE", comparability_group: null },
              ],
            }
          : {},
    section_confidence_summary: {},
    claims: claims(type.toLowerCase(), SECTION_CLAIMS[type] ?? 0),
  })),
};
