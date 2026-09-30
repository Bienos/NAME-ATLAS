import type { ListEdition, ListFacts, ListFactsArtefact } from "@name-atlas/contracts";

/**
 * A SYNTHETIC list-facts artefact for the atlas view tests (TASK-040, v2 for
 * TASK-043, v3 for TASK-044).
 *
 * Every number and every surname below is invented. It tests rendering, not
 * the register, and is never read by the page (`page.tsx` reads
 * `listFacts()`). The two lists are deliberately different in every figure, so
 * a test can tell whether a number on the page belongs to one list, to the
 * other, or — which must never happen — to their sum. Each list's sections add
 * up the way the contract requires (dots, bands, concentration, initials,
 * overlap), so the fixture passes `listFactsArtefactSchema`. The male list's
 * first ending falls in the "one in four" wording band and the female list's
 * does not, so both wordings are rendered.
 *
 * Plate VII's series are invented too: five male editions, and four female
 * editions with a publisher-duplicate gap between them. The female list's
 * third most common surname is not on its first edition (`null`, never zero),
 * and only the male list's ten most common surnames are unchanged, so both
 * branches of each are rendered.
 */

/** A smooth shared-surname curve for a list whose pairs share a surname 1 in `oneIn`. */
function curve(oneIn: number): { n: number; p: number }[] {
  const points: { n: number; p: number }[] = [];
  for (let n = 2; n <= 300; n++) {
    points.push({ n, p: Number((1 - Math.exp((-n * (n - 1)) / (2 * oneIn))).toFixed(9)) });
  }
  return points;
}

function collision(oneIn: number, seed: number, rooms: number[], pair: [number, number]) {
  const points = curve(oneIn);
  const at = points.findIndex((point) => point.p >= 0.5);
  return {
    method_version: "list_collision@1",
    model: "RANDOM_PEOPLE_WITHOUT_REPLACEMENT" as const,
    curve: points,
    n_half: points[at]!.n,
    p_at_n_half: points[at]!.p,
    p_before_n_half: points[at - 1]!.p,
    pair_one_in: oneIn,
    example_rooms: { seed, first_pair_at: rooms, showcase_pair: pair },
  };
}

/** A `dots` histogram from `[count, surnames]` pairs, ascending by count. */
function histogram(pairs: readonly (readonly [number, number])[]) {
  return pairs.map(([count, surnames]) => ({ count, surnames }));
}

const ASSESSMENT = {
  completeness: "COMPLETE",
  confidence_status: "VERIFIED",
  confidence_method: "derived_statistic_rule",
  confidence_version: "derived_confidence@1",
  free_surface: "ALLOWED",
} as const;

const SOURCE_PAGE = "https://dane.gov.pl/pl/dataset/1681";

const MALE_SERIES = "pesel_living_current_surname_national_male";
const FEMALE_SERIES = "pesel_living_current_surname_national_female";

/** One edition of a series; its SHA-256 is `digit` repeated, and its surnames are its rows. */
function edition(
  series: string,
  resourceId: string,
  dataDate: string,
  digit: string,
  surnames: number,
  people: number,
): ListEdition {
  return {
    series,
    resource_id: resourceId,
    data_date: dataDate,
    sha256: digit.repeat(64),
    row_count: surnames,
    surnames,
    people,
    min_count: 2,
  };
}

const MALE: ListFacts = {
  partition: "national_male",
  source: {
    dataset_id: 1681,
    external_record_id: "1148808",
    sha256: "1".repeat(64),
    row_count: 40818,
    snapshot_date: "2026-01-20",
    source_page_url: SOURCE_PAGE,
  },
  assessment: ASSESSMENT,
  summary: {
    method_version: "list_summary@1",
    people: 2119753,
    surnames: 40818,
    max_count: 91234,
    min_count: 2,
    median_count_per_surname: 6,
    median_count_per_person: 501,
    thresholds: [
      { at_least: 2, surnames: 40818, people: 2119753 },
      { at_least: 10, surnames: 16437, people: 2022197 },
      { at_least: 100, surnames: 2763, people: 1521757 },
      { at_least: 1000, surnames: 263, people: 901057 },
      { at_least: 10000, surnames: 13, people: 352817 },
      { at_least: 50000, surnames: 2, people: 151235 },
    ],
    surname_quantiles: [
      { q: 0.5, count: 6 },
      { q: 0.9, count: 60 },
      { q: 0.99, count: 501 },
      { q: 0.999, count: 5003 },
    ],
    person_quantiles: [
      { q: 0.5, count: 501 },
      { q: 0.9, count: 30011 },
      { q: 0.99, count: 91234 },
      { q: 0.999, count: 91234 },
    ],
  },
  collision: collision(
    4469,
    11,
    [98, 69, 56, 104, 8, 157, 76, 165, 151, 95, 173, 117, 85, 61, 143, 47],
    [96, 98],
  ),
  crowd: {
    method_version: "list_crowd@1",
    model: "RANDOM_PEOPLE_WITHOUT_REPLACEMENT",
    expected_distinct: [
      { n: 100, value: 98.9 },
      { n: 1000, value: 921.1 },
      { n: 10000, value: 7042.4 },
      { n: 100000, value: 39074.2 },
      { n: 1000000, value: 146706.8 },
    ],
    crowd_size: 1000,
    share_without_namesake: 0.863,
    reach_half: [
      { set: "TOP_1", share_of_people: 0.0043, n_half: 161, p_at_n_half: 0.50002 },
      { set: "TOP_10", share_of_people: 0.0247, n_half: 28, p_at_n_half: 0.5091 },
      { set: "TOP_100", share_of_people: 0.1066, n_half: 7, p_at_n_half: 0.5463 },
    ],
    example: {
      seed: 1011,
      n: 1000,
      distinct: 919,
      without_namesake: 860,
      group_sizes: [8, 5, 5, 4, 4, 3, 3, 3, 3, 3, 3, ...new Array<number>(48).fill(2)],
    },
  },
  dots: {
    method_version: "list_dots@1",
    histogram: histogram([
      [2, 8587],
      [3, 5794],
      [4, 3000],
      [6, 4000],
      [9, 3000],
      [12, 5000],
      [40, 4000],
      [60, 4674],
      [150, 1800],
      [501, 700],
      [1200, 90],
      [2001, 120],
      [5003, 40],
      [10050, 4],
      [15001, 3],
      [20345, 2],
      [30011, 1],
      [45678, 1],
      [60001, 1],
      [91234, 1],
    ]),
  },
  concentration: {
    method_version: "list_concentration@1",
    levels: [
      { q: 0.1, surnames: 4, people: 226924 },
      { q: 0.5, surnames: 581, people: 1060375 },
      { q: 0.9, surnames: 10077, people: 1907797 },
    ],
    beyond_half: 40237,
  },
  bands: {
    method_version: "list_bands@1",
    ranges: [
      { from: 2, to: 2, surnames: 8587, people: 17174 },
      { from: 3, to: 9, surnames: 15794, people: 80382 },
      { from: 10, to: 99, surnames: 13674, people: 500440 },
      { from: 100, to: 999, surnames: 2500, people: 620700 },
      { from: 1000, to: 9999, surnames: 250, people: 548240 },
      { from: 10000, to: null, surnames: 13, people: 352817 },
    ],
    under_10: 24381,
  },
  endings: {
    method_version: "list_endings@1",
    entries: [
      { ending: "ski", surnames: 4111, people: 532482, share_of_people: 0.251200022 },
      { ending: "ak", surnames: 1302, people: 165553, share_of_people: 0.078100137 },
      { ending: "ek", surnames: 777, people: 115950, share_of_people: 0.054699769 },
      { ending: "cki", surnames: 701, people: 87334, share_of_people: 0.041200083 },
      { ending: "ik", surnames: 592, people: 59565, share_of_people: 0.028099972 },
      { ending: "czyk", surnames: 301, people: 56385, share_of_people: 0.026599797 },
      { ending: "uk", surnames: 1377, people: 50662, share_of_people: 0.023899954 },
      { ending: "ewicz", surnames: 725, people: 45363, share_of_people: 0.021400135 },
      { ending: "owicz", surnames: 490, people: 27133, share_of_people: 0.012800076 },
    ],
  },
  initials: {
    method_version: "list_initials@1",
    letters: [
      { letter: "A", surnames: 1251, people: 65050 },
      { letter: "Ą", absent: true },
      { letter: "B", surnames: 2987, people: 155281 },
      { letter: "C", surnames: 1574, people: 81837 },
      { letter: "Ć", surnames: 28, people: 1468 },
      { letter: "D", surnames: 1695, people: 88132 },
      { letter: "E", surnames: 76, people: 3986 },
      { letter: "Ę", absent: true },
      { letter: "F", surnames: 726, people: 37771 },
      { letter: "G", surnames: 2260, people: 117510 },
      { letter: "H", surnames: 766, people: 39869 },
      { letter: "I", surnames: 222, people: 11541 },
      { letter: "J", surnames: 1372, people: 71345 },
      { letter: "K", surnames: 5662, people: 293794 },
      { letter: "L", surnames: 1130, people: 58755 },
      { letter: "Ł", surnames: 444, people: 23082 },
      { letter: "M", surnames: 3269, people: 169970 },
      { letter: "N", surnames: 1009, people: 52460 },
      { letter: "Ń", absent: true },
      { letter: "O", surnames: 888, people: 46164 },
      { letter: "Ó", surnames: 3, people: 11 },
      { letter: "P", surnames: 3108, people: 161577 },
      { letter: "R", surnames: 1493, people: 77640 },
      { letter: "S", surnames: 4803, people: 249710 },
      { letter: "Ś", surnames: 363, people: 18885 },
      { letter: "T", surnames: 1089, people: 56656 },
      { letter: "U", surnames: 205, people: 10701 },
      { letter: "W", surnames: 2543, people: 132199 },
      { letter: "Y", surnames: 113, people: 5875 },
      { letter: "Z", surnames: 1210, people: 62952 },
      { letter: "Ź", surnames: 8, people: 419 },
      { letter: "Ż", surnames: 294, people: 15318 },
      { letter: "Q", surnames: 12, people: 629 },
      { letter: "V", surnames: 169, people: 8813 },
      { letter: "X", surnames: 5, people: 230 },
    ],
    top: "K" as const,
    rarest_polish: "Ó" as const,
    outside: { surnames: 41, people: 123 },
  },
  hyphenated: {
    method_version: "list_hyphenated@1",
    surnames: 1234,
    people: 5678,
    top: { key: "żeta-ósmy", published: "ŻETA-ÓSMY", count: 212 },
  },
  named_top: {
    method_version: "list_named_top@1",
    items: [
      { key: "alfa", published: "ALFA", count: 91234 },
      { key: "betowski", published: "BETOWSKI", count: 60001 },
      { key: "gamma", published: "GAMMA", count: 45678 },
    ],
  },
  editions: {
    method_version: "list_editions@1",
    series: "pesel_living_current_surname_national_male",
    items: [
      edition(MALE_SERIES, "22817", "2020-01-22", "a", 30511, 2011234),
      edition(MALE_SERIES, "28052", "2021-02-01", "b", 32107, 2030119),
      edition(MALE_SERIES, "36401", "2022-01-27", "c", 33702, 2045678),
      edition(MALE_SERIES, "54097", "2024-01-19", "d", 37113, 2090123),
      edition(MALE_SERIES, "1148808", "2026-01-20", "1", 40818, 2119753),
    ],
    gaps: [],
  },
  change: {
    method_version: "list_change@1",
    first_data_date: "2020-01-22",
    last_data_date: "2026-01-20",
    surnames_first: 30511,
    surnames_last: 40818,
    surnames_delta: 10307,
    people_first: 2011234,
    people_last: 2119753,
    people_delta: 108519,
    on_last_not_first: { surnames: 11203, people: 30456 },
    on_first_not_last: { surnames: 896, people_on_first: 2412 },
    top3_first_counts: [
      { key: "alfa", count_first: 93012 },
      { key: "betowski", count_first: 61234 },
      { key: "gamma", count_first: 44001 },
    ],
    top10_unchanged: true,
  },
};

const FEMALE: ListFacts = {
  partition: "national_female",
  source: {
    ...MALE.source,
    external_record_id: "1148811",
    sha256: "2".repeat(64),
    row_count: 42008,
  },
  assessment: ASSESSMENT,
  summary: {
    method_version: "list_summary@1",
    people: 2156030,
    surnames: 42008,
    max_count: 93456,
    min_count: 2,
    median_count_per_surname: 7,
    median_count_per_person: 512,
    thresholds: [
      { at_least: 2, surnames: 42008, people: 2156030 },
      { at_least: 10, surnames: 15626, people: 2048169 },
      { at_least: 100, surnames: 2780, people: 1595389 },
      { at_least: 1000, surnames: 268, people: 948767 },
      { at_least: 10000, surnames: 14, people: 378492 },
      { at_least: 50000, surnames: 2, people: 154458 },
    ],
    surname_quantiles: [
      { q: 0.5, count: 7 },
      { q: 0.9, count: 60 },
      { q: 0.99, count: 512 },
      { q: 0.999, count: 5104 },
    ],
    person_quantiles: [
      { q: 0.5, count: 512 },
      { q: 0.9, count: 31022 },
      { q: 0.99, count: 93456 },
      { q: 0.999, count: 93456 },
    ],
  },
  collision: collision(
    4301,
    12,
    [119, 99, 123, 64, 53, 11, 46, 68, 164, 50, 60, 17, 62, 41, 112, 53],
    [87, 119],
  ),
  crowd: {
    method_version: "list_crowd@1",
    model: "RANDOM_PEOPLE_WITHOUT_REPLACEMENT",
    expected_distinct: [
      { n: 100, value: 98.7 },
      { n: 1000, value: 917.3 },
      { n: 10000, value: 7001.8 },
      { n: 100000, value: 38813.6 },
      { n: 1000000, value: 145203.1 },
    ],
    crowd_size: 1000,
    share_without_namesake: 0.857,
    reach_half: [
      { set: "TOP_1", share_of_people: 0.0044, n_half: 156, p_at_n_half: 0.50021 },
      { set: "TOP_10", share_of_people: 0.0251, n_half: 27, p_at_n_half: 0.5012 },
      { set: "TOP_100", share_of_people: 0.1072, n_half: 6, p_at_n_half: 0.5471 },
    ],
    example: {
      seed: 1012,
      n: 1000,
      distinct: 936,
      without_namesake: 886,
      group_sizes: [5, 5, 4, 3, 3, 3, 3, 3, 3, ...new Array<number>(41).fill(2)],
    },
  },
  dots: {
    method_version: "list_dots@1",
    histogram: histogram([
      [2, 9585],
      [3, 6397],
      [5, 3200],
      [7, 4100],
      [8, 3100],
      [13, 5100],
      [41, 4120],
      [60, 3626],
      [161, 1822],
      [512, 690],
      [1301, 95],
      [2012, 118],
      [5104, 41],
      [11061, 5],
      [16002, 3],
      [21456, 2],
      [31022, 1],
      [46789, 1],
      [61002, 1],
      [93456, 1],
    ]),
  },
  concentration: {
    method_version: "list_concentration@1",
    levels: [
      { q: 0.1, surnames: 4, people: 232269 },
      { q: 0.5, surnames: 521, people: 1078303 },
      { q: 0.9, surnames: 9516, people: 1940459 },
    ],
    beyond_half: 41487,
  },
  bands: {
    method_version: "list_bands@1",
    ranges: [
      { from: 2, to: 2, surnames: 9585, people: 19170 },
      { from: 3, to: 9, surnames: 16797, people: 88691 },
      { from: 10, to: 99, surnames: 12846, people: 452780 },
      { from: 100, to: 999, surnames: 2512, people: 646622 },
      { from: 1000, to: 9999, surnames: 254, people: 570275 },
      { from: 10000, to: null, surnames: 14, people: 378492 },
    ],
    under_10: 26382,
  },
  endings: {
    method_version: "list_endings@1",
    entries: [
      { ending: "ska", surnames: 5578, people: 588812, share_of_people: 0.273100096 },
      { ending: "ak", surnames: 1537, people: 166446, share_of_people: 0.077200224 },
      { ending: "ek", surnames: 898, people: 118797, share_of_people: 0.055099883 },
      { ending: "cka", surnames: 771, people: 90122, share_of_people: 0.041799975 },
      { ending: "ik", surnames: 652, people: 60153, share_of_people: 0.02789989 },
      { ending: "czyk", surnames: 360, people: 58428, share_of_people: 0.027099808 },
      { ending: "uk", surnames: 1403, people: 52392, share_of_people: 0.024300218 },
      { ending: "ewicz", surnames: 760, people: 47217, share_of_people: 0.021899974 },
      { ending: "owicz", surnames: 506, people: 28675, share_of_people: 0.013299908 },
    ],
  },
  initials: {
    method_version: "list_initials@1",
    letters: [
      { letter: "A", surnames: 1288, people: 66171 },
      { letter: "Ą", absent: true },
      { letter: "B", surnames: 3074, people: 157958 },
      { letter: "C", surnames: 1620, people: 83248 },
      { letter: "Ć", surnames: 29, people: 1494 },
      { letter: "D", surnames: 1745, people: 89652 },
      { letter: "E", surnames: 78, people: 4055 },
      { letter: "Ę", absent: true },
      { letter: "F", surnames: 747, people: 38422 },
      { letter: "G", surnames: 2326, people: 119536 },
      { letter: "H", surnames: 789, people: 40556 },
      { letter: "I", surnames: 228, people: 11740 },
      { letter: "J", surnames: 1412, people: 72575 },
      { letter: "K", surnames: 5835, people: 298854 },
      { letter: "L", surnames: 1163, people: 59768 },
      { letter: "Ł", surnames: 457, people: 23480 },
      { letter: "M", surnames: 3365, people: 172900 },
      { letter: "N", surnames: 1038, people: 53364 },
      { letter: "Ń", absent: true },
      { letter: "O", surnames: 914, people: 46960 },
      { letter: "Ó", surnames: 2, people: 7 },
      { letter: "P", surnames: 3199, people: 164362 },
      { letter: "R", surnames: 1537, people: 78979 },
      { letter: "S", surnames: 4944, people: 254014 },
      { letter: "Ś", surnames: 373, people: 19211 },
      { letter: "T", surnames: 1121, people: 57633 },
      { letter: "U", surnames: 211, people: 10886 },
      { letter: "W", surnames: 2617, people: 134478 },
      { letter: "Y", surnames: 116, people: 5976 },
      { letter: "Z", surnames: 1246, people: 64037 },
      { letter: "Ź", surnames: 8, people: 426 },
      { letter: "Ż", surnames: 303, people: 15582 },
      { letter: "Q", surnames: 12, people: 640 },
      { letter: "V", surnames: 174, people: 8965 },
      { letter: "X", absent: true },
    ],
    top: "K" as const,
    rarest_polish: "Ó" as const,
    outside: { surnames: 37, people: 101 },
  },
  hyphenated: {
    method_version: "list_hyphenated@1",
    surnames: 2345,
    people: 6789,
    top: { key: "żeta-ósma", published: "ŻETA-ÓSMA", count: 219 },
  },
  named_top: {
    method_version: "list_named_top@1",
    items: [
      { key: "alfa", published: "ALFA", count: 93456 },
      { key: "betowska", published: "BETOWSKA", count: 61002 },
      { key: "gammowa", published: "GAMMOWA", count: 46789 },
    ],
  },
  editions: {
    method_version: "list_editions@1",
    series: "pesel_living_current_surname_national_female",
    items: [
      edition(FEMALE_SERIES, "22815", "2020-01-22", "e", 31622, 2051234),
      edition(FEMALE_SERIES, "35279", "2021-02-02", "f", 34013, 2080456),
      edition(FEMALE_SERIES, "54098", "2024-01-19", "7", 38904, 2120789),
      edition(FEMALE_SERIES, "1148811", "2026-01-20", "2", 42008, 2156030),
    ],
    gaps: [
      {
        data_date: "2022-01-27",
        resource_id: "38772",
        reason: "PUBLISHER_DUPLICATE",
        duplicate_of: "35279",
      },
    ],
  },
  change: {
    method_version: "list_change@1",
    first_data_date: "2020-01-22",
    last_data_date: "2026-01-20",
    surnames_first: 31622,
    surnames_last: 42008,
    surnames_delta: 10386,
    people_first: 2051234,
    people_last: 2156030,
    people_delta: 104796,
    on_last_not_first: { surnames: 11417, people: 31890 },
    on_first_not_last: { surnames: 1031, people_on_first: 2744 },
    top3_first_counts: [
      { key: "alfa", count_first: 95011 },
      { key: "betowska", count_first: 62345 },
      { key: "gammowa", count_first: null },
    ],
    top10_unchanged: false,
  },
};

export const LIST_FACTS_FIXTURE: ListFactsArtefact = {
  schema_version: "list_facts@3",
  generated_by: "apps/web/src/lib/list-atlas.fixture.ts (SYNTHETIC)",
  pipeline_version: "list_facts_pipeline@3",
  snapshot_date: "2026-01-20",
  birthday_reference: { n_half: 23, p_at_n_half: 0.507297234 },
  lists: { male: MALE, female: FEMALE },
  overlap: {
    method_version: "list_overlap@1",
    male_only: 17362,
    both: 23456,
    female_only: 18552,
    on_both_top: {
      key: "alfa",
      male: { published: "ALFA", count: 91234 },
      female: { published: "ALFA", count: 93456 },
    },
    one_list_top: {
      male: { key: "betowski", published: "BETOWSKI", count: 60001 },
      female: { key: "betowska", published: "BETOWSKA", count: 61002 },
    },
  },
};
