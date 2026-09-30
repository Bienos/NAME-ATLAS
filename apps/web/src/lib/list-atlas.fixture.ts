import type { ListFacts, ListFactsArtefact } from "@name-atlas/contracts";

/**
 * A SYNTHETIC list-facts artefact for the atlas view tests (TASK-040).
 *
 * Every number below is invented. It tests rendering, not the register, and is
 * never read by the page (`page.tsx` reads `listFacts()`). The two lists are
 * deliberately different in every figure, so a test can tell whether a number
 * on the page belongs to one list, to the other, or — which must never happen
 * — to their sum.
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

const ASSESSMENT = {
  completeness: "COMPLETE",
  confidence_status: "VERIFIED",
  confidence_method: "derived_statistic_rule",
  confidence_version: "derived_confidence@1",
  free_surface: "ALLOWED",
} as const;

const SOURCE_PAGE = "https://dane.gov.pl/pl/dataset/1681";

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
    median_count_per_surname: 5,
    median_count_per_person: 731,
    thresholds: [
      { at_least: 2, surnames: 40818, people: 2119753 },
      { at_least: 10, surnames: 12345, people: 1987654 },
      { at_least: 100, surnames: 2966, people: 1682600 },
      { at_least: 1000, surnames: 303, people: 959011 },
      { at_least: 10000, surnames: 14, people: 271103 },
      { at_least: 50000, surnames: 1, people: 91234 },
    ],
    surname_quantiles: [
      { q: 0.5, count: 5 },
      { q: 0.9, count: 67 },
      { q: 0.99, count: 764 },
      { q: 0.999, count: 4722 },
    ],
    person_quantiles: [
      { q: 0.5, count: 731 },
      { q: 0.9, count: 12956 },
      { q: 0.99, count: 61234 },
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
    median_count_per_surname: 6,
    median_count_per_person: 756,
    thresholds: [
      { at_least: 2, surnames: 42008, people: 2156030 },
      { at_least: 10, surnames: 12987, people: 2011122 },
      { at_least: 100, surnames: 3010, people: 1701234 },
      { at_least: 1000, surnames: 310, people: 970123 },
      { at_least: 10000, surnames: 15, people: 280456 },
      { at_least: 50000, surnames: 1, people: 93456 },
    ],
    surname_quantiles: [
      { q: 0.5, count: 6 },
      { q: 0.9, count: 65 },
      { q: 0.99, count: 756 },
      { q: 0.999, count: 4801 },
    ],
    person_quantiles: [
      { q: 0.5, count: 749 },
      { q: 0.9, count: 13101 },
      { q: 0.99, count: 62345 },
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
};

export const LIST_FACTS_FIXTURE: ListFactsArtefact = {
  schema_version: "list_facts@1",
  generated_by: "apps/web/src/lib/list-atlas.fixture.ts (SYNTHETIC)",
  pipeline_version: "list_facts_pipeline@1",
  snapshot_date: "2026-01-20",
  birthday_reference: { n_half: 23, p_at_n_half: 0.507297234 },
  lists: { male: MALE, female: FEMALE },
};
