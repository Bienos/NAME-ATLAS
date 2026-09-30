import { describe, expect, it } from "vitest";
import {
  LIST_ENDINGS,
  LIST_FACTS_SCHEMA_VERSION,
  LIST_INITIAL_LETTERS,
  NAMED_SURNAME_FLOOR,
  listEndingsSchema,
  listFactsArtefactSchema,
} from "./list-facts.js";
import type { ListFacts, ListInitial } from "./list-facts.js";

/**
 * The list-facts contract (TASK-040 AC-01, TASK-043 AC-01,
 * `docs/contracts/list-facts.md`). The values below are a small made-up
 * example, not PESEL figures, worked out by hand:
 *
 *   male:   NOWAK 40, KOWALSKI 25, ŻMUDA-TRZEBIATOWSKI 20, WÓJCIK 3, XU 2   (90 people)
 *   female: NOWAK 30, KOWALSKA 24, ŻMUDA-TRZEBIATOWSKA 21, WÓJCIK 4, LEE 2 (81 people)
 *
 * On both lists: nowak and wójcik; on one list only: three surnames each.
 */

type Row = readonly [published: string, key: string, count: number];

const ROWS: Record<"national_male" | "national_female", readonly Row[]> = {
  national_male: [
    ["NOWAK", "nowak", 40],
    ["KOWALSKI", "kowalski", 25],
    ["ŻMUDA-TRZEBIATOWSKI", "żmuda-trzebiatowski", 20],
    ["WÓJCIK", "wójcik", 3],
    ["XU", "xu", 2],
  ],
  national_female: [
    ["NOWAK", "nowak", 30],
    ["KOWALSKA", "kowalska", 24],
    ["ŻMUDA-TRZEBIATOWSKA", "żmuda-trzebiatowska", 21],
    ["WÓJCIK", "wójcik", 4],
    ["LEE", "lee", 2],
  ],
};

/** The hand-worked figures that differ between the two example lists. */
const FIGURES = {
  national_male: {
    people: 90,
    max_count: 40,
    median_count_per_surname: 20,
    median_count_per_person: 25,
    dots: [2, 3, 20, 25, 40],
    // q = 0.1: 9 people → NOWAK; q = 0.5: 45 → +KOWALSKI (65); q = 0.9: 81 → +ŻMUDA-… (85).
    levels: [
      { q: 0.1, surnames: 1, people: 40 },
      { q: 0.5, surnames: 2, people: 65 },
      { q: 0.9, surnames: 3, people: 85 },
    ],
    bands: [
      [1, 2],
      [1, 3],
      [3, 85],
    ],
    // ski: KOWALSKI + ŻMUDA-TRZEBIATOWSKI; ak: NOWAK; ik: WÓJCIK.
    endings: {
      ski: [2, 45, 0.5],
      ak: [1, 40, 0.444444444],
      ik: [1, 3, 0.033333333],
    } as Record<string, [number, number, number]>,
    initials: { N: [1, 40], K: [1, 25], Ż: [1, 20], W: [1, 3], X: [1, 2] } as Record<
      string,
      [number, number]
    >,
    rarest_polish: "W",
  },
  national_female: {
    people: 81,
    max_count: 30,
    median_count_per_surname: 21,
    median_count_per_person: 24,
    dots: [2, 4, 21, 24, 30],
    levels: [
      { q: 0.1, surnames: 1, people: 30 },
      { q: 0.5, surnames: 2, people: 54 },
      { q: 0.9, surnames: 3, people: 75 },
    ],
    bands: [
      [1, 2],
      [1, 4],
      [3, 75],
    ],
    endings: {
      ska: [2, 45, 0.555555556],
      ak: [1, 30, 0.37037037],
      ik: [1, 4, 0.049382716],
    } as Record<string, [number, number, number]>,
    initials: { N: [1, 30], K: [1, 24], Ż: [1, 21], W: [1, 4], L: [1, 2] } as Record<
      string,
      [number, number]
    >,
    rarest_polish: "L",
  },
} as const;

const named = (row: Row) => ({ key: row[1], published: row[0], count: row[2] });

function list(partition: "national_male" | "national_female", id: string, sha: string): ListFacts {
  const f = FIGURES[partition];
  const rows = ROWS[partition];
  const band = (i: number) => f.bands[i] ?? [0, 0];
  return {
    partition,
    source: {
      dataset_id: 1681,
      external_record_id: id,
      sha256: sha,
      row_count: 5,
      snapshot_date: "2026-01-20",
      source_page_url: "https://dane.gov.pl/pl/dataset/1681",
    },
    assessment: {
      completeness: "COMPLETE",
      confidence_status: "VERIFIED",
      confidence_method: "derived_statistic_rule",
      confidence_version: "derived_confidence@1",
      free_surface: "ALLOWED",
    },
    summary: {
      method_version: "list_summary@1",
      people: f.people,
      surnames: 5,
      max_count: f.max_count,
      min_count: 2,
      median_count_per_surname: f.median_count_per_surname,
      median_count_per_person: f.median_count_per_person,
      thresholds: [{ at_least: 2, surnames: 5, people: f.people }],
      surname_quantiles: [{ q: 0.5, count: f.median_count_per_surname }],
      person_quantiles: [{ q: 0.5, count: f.median_count_per_person }],
    },
    collision: {
      method_version: "list_collision@1",
      model: "RANDOM_PEOPLE_WITHOUT_REPLACEMENT",
      curve: [
        { n: 2, p: 0.25 },
        { n: 3, p: 0.6 },
      ],
      n_half: 3,
      p_at_n_half: 0.6,
      p_before_n_half: 0.25,
      pair_one_in: 4,
      example_rooms: { seed: 1, first_pair_at: [3, 2], showcase_pair: [1, 3] },
    },
    crowd: {
      method_version: "list_crowd@1",
      model: "RANDOM_PEOPLE_WITHOUT_REPLACEMENT",
      expected_distinct: [{ n: 2, value: 1.75 }],
      crowd_size: 2,
      share_without_namesake: 0.75,
      reach_half: [
        { set: "TOP_1", share_of_people: 0.45, n_half: 2, p_at_n_half: 0.7 },
        { set: "TOP_10", share_of_people: 1, n_half: 1, p_at_n_half: 1 },
        { set: "TOP_100", share_of_people: 1, n_half: 1, p_at_n_half: 1 },
      ],
      example: { seed: 1001, n: 2, distinct: 2, without_namesake: 2, group_sizes: [] },
    },
    dots: {
      method_version: "list_dots@1",
      histogram: f.dots.map((count) => ({ count, surnames: 1 })),
    },
    concentration: {
      method_version: "list_concentration@1",
      levels: f.levels.map((level) => ({ ...level })),
      beyond_half: 3,
    },
    bands: {
      method_version: "list_bands@1",
      ranges: [
        { from: 2, to: 2, surnames: band(0)[0]!, people: band(0)[1]! },
        { from: 3, to: 9, surnames: band(1)[0]!, people: band(1)[1]! },
        { from: 10, to: 99, surnames: band(2)[0]!, people: band(2)[1]! },
        { from: 100, to: 999, surnames: 0, people: 0 },
        { from: 1000, to: 9999, surnames: 0, people: 0 },
        { from: 10000, to: null, surnames: 0, people: 0 },
      ],
      under_10: 2,
    },
    endings: {
      method_version: "list_endings@1",
      entries: LIST_ENDINGS[partition].map((ending) => {
        const [surnames, people, share_of_people] = f.endings[ending] ?? [0, 0, 0];
        return { ending, surnames, people, share_of_people };
      }),
    },
    initials: {
      method_version: "list_initials@1",
      letters: LIST_INITIAL_LETTERS.map((letter): ListInitial => {
        const figures = f.initials[letter];
        return figures === undefined
          ? { letter, absent: true }
          : { letter, surnames: figures[0], people: figures[1] };
      }),
      top: "N",
      rarest_polish: f.rarest_polish,
      outside: { surnames: 0, people: 0 },
    },
    hyphenated: {
      method_version: "list_hyphenated@1",
      surnames: 1,
      people: rows[2]![2],
      top: named(rows[2]!),
    },
    named_top: { method_version: "list_named_top@1", items: rows.slice(0, 3).map(named) },
  };
}

const male = list("national_male", "1148808", "a".repeat(64));
const female = list("national_female", "1148811", "b".repeat(64));

const OVERLAP = {
  method_version: "list_overlap@1",
  male_only: 3,
  both: 2,
  female_only: 3,
  on_both_top: {
    key: "nowak",
    male: { published: "NOWAK", count: 40 },
    female: { published: "NOWAK", count: 30 },
  },
  one_list_top: {
    male: { key: "kowalski", published: "KOWALSKI", count: 25 },
    female: { key: "kowalska", published: "KOWALSKA", count: 24 },
  },
};

function artefact(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: LIST_FACTS_SCHEMA_VERSION,
    generated_by: "packages/truth/bin/build-list-facts.ts",
    pipeline_version: "list_facts_pipeline@2",
    snapshot_date: "2026-01-20",
    birthday_reference: { n_half: 23, p_at_n_half: 0.507297234 },
    lists: { male, female },
    overlap: OVERLAP,
    ...overrides,
  };
}

const accepts = (value: unknown) => listFactsArtefactSchema.safeParse(value).success;

describe("listFactsArtefactSchema", () => {
  it("accepts two lists side by side", () => {
    expect(accepts(artefact())).toBe(true);
  });

  it("rejects a list under the wrong key, including the two swapped", () => {
    expect(accepts(artefact({ lists: { male: female, female: male } }))).toBe(false);
    expect(accepts(artefact({ lists: { male, female: male } }))).toBe(false);
    expect(accepts(artefact({ lists: { male } }))).toBe(false);
  });

  it("rejects a merged list: there is no partition for both lists at once", () => {
    for (const partition of ["national", "national_all", "national_male_female"]) {
      const merged = { ...male, partition };
      expect(accepts(artefact({ lists: { male: merged, female } }))).toBe(false);
    }
    expect(accepts(artefact({ lists: { all: male } }))).toBe(false);
  });

  it("rejects mismatched snapshot dates", () => {
    const later = { ...female, source: { ...female.source, snapshot_date: "2027-01-20" } };
    expect(accepts(artefact({ lists: { male, female: later } }))).toBe(false);
    expect(accepts(artefact({ snapshot_date: "2025-01-20" }))).toBe(false);
  });

  it("rejects a missing assessment, and any assessment short of complete, verified and free", () => {
    const { assessment: _dropped, ...withoutAssessment } = male;
    expect(accepts(artefact({ lists: { male: withoutAssessment, female } }))).toBe(false);
    for (const patch of [
      { completeness: "INCOMPLETE" },
      { confidence_status: "UNCONFIRMED" },
      { free_surface: "CONDITIONAL" },
      { confidence_method: "" },
    ]) {
      const weaker = { ...male, assessment: { ...male.assessment, ...patch } };
      expect(accepts(artefact({ lists: { male: weaker, female } }))).toBe(false);
    }
  });

  it("rejects out-of-range fractions", () => {
    const badCurve = {
      ...male,
      collision: {
        ...male.collision,
        curve: [
          { n: 2, p: 0.25 },
          { n: 3, p: 1.2 },
        ],
      },
    };
    const badShare = { ...male, crowd: { ...male.crowd, share_without_namesake: -0.1 } };
    const badQuantile = {
      ...male,
      summary: { ...male.summary, surname_quantiles: [{ q: 1.5, count: 3 }] },
    };
    for (const bad of [badCurve, badShare, badQuantile]) {
      expect(accepts(artefact({ lists: { male: bad, female } }))).toBe(false);
    }
    expect(accepts(artefact({ birthday_reference: { n_half: 23, p_at_n_half: 2 } }))).toBe(false);
  });

  it("rejects malformed lineage and counts", () => {
    const badSha = { ...male, source: { ...male.source, sha256: "ABC" } };
    const badDataset = { ...male, source: { ...male.source, dataset_id: 1 } };
    const fractionalPeople = { ...male, summary: { ...male.summary, people: 22.5 } };
    const groupOfOne = {
      ...male,
      crowd: { ...male.crowd, example: { ...male.crowd.example, group_sizes: [1] } },
    };
    const twoReachSets = {
      ...male,
      crowd: { ...male.crowd, reach_half: male.crowd.reach_half.slice(0, 2) },
    };
    for (const bad of [badSha, badDataset, fractionalPeople, groupOfOne, twoReachSets]) {
      expect(accepts(artefact({ lists: { male: bad, female } }))).toBe(false);
    }
  });

  it("carries no surname in a reach set: it is an unnamed set, never a name", () => {
    const withName = {
      ...male,
      crowd: {
        ...male.crowd,
        reach_half: [
          { ...male.crowd.reach_half[0]!, set: "NOWAK" },
          ...male.crowd.reach_half.slice(1),
        ],
      },
    };
    expect(accepts(artefact({ lists: { male: withName, female } }))).toBe(false);
  });

  it("carries no surname outside the named selections: a name added elsewhere is stripped", () => {
    const smuggled = {
      ...male,
      surname: "SMUGGLED",
      summary: { ...male.summary, most_common: "SMUGGLED" },
      collision: {
        ...male.collision,
        example_rooms: { ...male.collision.example_rooms, pair_surname: "SMUGGLED" },
      },
      crowd: {
        ...male.crowd,
        reach_half: male.crowd.reach_half.map((r) => ({ ...r, surnames: ["SMUGGLED"] })),
      },
      dots: {
        ...male.dots,
        histogram: male.dots.histogram.map((d) => ({ ...d, example: "SMUGGLED" })),
      },
      bands: {
        ...male.bands,
        ranges: male.bands.ranges.map((b) => ({ ...b, example: "SMUGGLED" })),
      },
      endings: {
        ...male.endings,
        entries: male.endings.entries.map((e) => ({ ...e, top: "SMUGGLED" })),
      },
      hyphenated: { ...male.hyphenated, second: "SMUGGLED" },
    };
    const parsed = listFactsArtefactSchema.parse(
      artefact({
        lists: { male: smuggled, female },
        overlap: { ...OVERLAP, both_second: "SMUGGLED" },
        top_surname: "SMUGGLED",
      }),
    );
    expect(JSON.stringify(parsed)).not.toContain("SMUGGLED");
  });

  it("has string fields only where the contract lists them", () => {
    const parsed = listFactsArtefactSchema.parse(artefact());
    const paths = new Set<string>();
    const walk = (value: unknown, at: string): void => {
      if (typeof value === "string") paths.add(at.replace(/^lists\.(male|female)\./u, "lists.*."));
      else if (Array.isArray(value)) value.forEach((v) => walk(v, `${at}[]`));
      else if (value !== null && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) walk(v, at === "" ? k : `${at}.${k}`);
      }
    };
    walk(parsed, "");
    expect([...paths].sort()).toEqual(
      [
        "schema_version",
        "generated_by",
        "pipeline_version",
        "snapshot_date",
        "lists.*.partition",
        "lists.*.source.external_record_id",
        "lists.*.source.sha256",
        "lists.*.source.snapshot_date",
        "lists.*.source.source_page_url",
        "lists.*.assessment.completeness",
        "lists.*.assessment.confidence_status",
        "lists.*.assessment.confidence_method",
        "lists.*.assessment.confidence_version",
        "lists.*.assessment.free_surface",
        "lists.*.summary.method_version",
        "lists.*.collision.method_version",
        "lists.*.collision.model",
        "lists.*.crowd.method_version",
        "lists.*.crowd.model",
        "lists.*.crowd.reach_half[].set",
        "lists.*.dots.method_version",
        "lists.*.concentration.method_version",
        "lists.*.bands.method_version",
        "lists.*.endings.method_version",
        "lists.*.endings.entries[].ending",
        "lists.*.initials.method_version",
        "lists.*.initials.letters[].letter",
        "lists.*.initials.top",
        "lists.*.initials.rarest_polish",
        "lists.*.hyphenated.method_version",
        // ADR-0018's named selections: the only surname strings.
        "lists.*.hyphenated.top.key",
        "lists.*.hyphenated.top.published",
        "lists.*.named_top.method_version",
        "lists.*.named_top.items[].key",
        "lists.*.named_top.items[].published",
        "overlap.method_version",
        "overlap.on_both_top.key",
        "overlap.on_both_top.male.published",
        "overlap.on_both_top.female.published",
        "overlap.one_list_top.male.key",
        "overlap.one_list_top.male.published",
        "overlap.one_list_top.female.key",
        "overlap.one_list_top.female.published",
      ].sort(),
    );
  });

  it("requires the pipeline version, apart from the schema version", () => {
    const { pipeline_version: _dropped, ...without } = artefact();
    expect(accepts(without)).toBe(false);
    expect(accepts(artefact({ pipeline_version: "" }))).toBe(false);
  });

  it("rejects the same resource under both keys: ids and SHA-256 must both differ", () => {
    const sameId = { ...female, source: { ...female.source, external_record_id: "1148808" } };
    const sameSha = { ...female, source: { ...female.source, sha256: male.source.sha256 } };
    expect(accepts(artefact({ lists: { male, female: sameId } }))).toBe(false);
    expect(accepts(artefact({ lists: { male, female: sameSha } }))).toBe(false);
  });

  it("rejects two lists computed with different model parameters", () => {
    const patches: Record<string, (list: ListFacts) => ListFacts> = {
      crowd_size: (l) => ({
        ...l,
        crowd: {
          ...l.crowd,
          crowd_size: 3,
          expected_distinct: [...l.crowd.expected_distinct, { n: 3, value: 2.5 }],
        },
      }),
      "curve n range": (l) => ({
        ...l,
        collision: { ...l.collision, curve: [...l.collision.curve, { n: 4, p: 0.8 }] },
      }),
      "number of example rooms": (l) => ({
        ...l,
        collision: {
          ...l.collision,
          example_rooms: { ...l.collision.example_rooms, first_pair_at: [3, 2, 4] },
        },
      }),
      "expected_distinct n": (l) => ({
        ...l,
        crowd: {
          ...l.crowd,
          expected_distinct: [...l.crowd.expected_distinct, { n: 3, value: 2.5 }],
        },
      }),
      "thresholds at_least": (l) => ({
        ...l,
        summary: { ...l.summary, thresholds: [{ at_least: 3, surnames: 4, people: 20 }] },
      }),
      "surname quantile q": (l) => ({
        ...l,
        summary: { ...l.summary, surname_quantiles: [{ q: 0.9, count: 8 }] },
      }),
      "person quantile q": (l) => ({
        ...l,
        summary: { ...l.summary, person_quantiles: [{ q: 0.9, count: 10 }] },
      }),
    };
    for (const [name, patch] of Object.entries(patches)) {
      // Each patch alone is a valid list; only the pair disagrees.
      expect(accepts(artefact({ lists: { male: patch(male), female: patch(female) } })), name).toBe(
        true,
      );
      expect(accepts(artefact({ lists: { male, female: patch(female) } })), name).toBe(false);
    }
  });

  it("rejects the curve and expected_distinct out of order in n, or with an n twice", () => {
    for (const curve of [
      [
        { n: 3, p: 0.6 },
        { n: 2, p: 0.25 },
      ],
      [
        { n: 2, p: 0.25 },
        { n: 2, p: 0.25 },
        { n: 3, p: 0.6 },
      ],
    ]) {
      const bad = (l: ListFacts) => ({ ...l, collision: { ...l.collision, curve } });
      expect(accepts(artefact({ lists: { male: bad(male), female: bad(female) } }))).toBe(false);
    }
    for (const expected_distinct of [
      [
        { n: 2, value: 1.75 },
        { n: 1, value: 1 },
      ],
      [
        { n: 2, value: 1.75 },
        { n: 2, value: 1.75 },
      ],
    ]) {
      const bad = (l: ListFacts) => ({ ...l, crowd: { ...l.crowd, expected_distinct } });
      expect(accepts(artefact({ lists: { male: bad(male), female: bad(female) } }))).toBe(false);
    }
  });

  it("requires an expected_distinct entry for crowd_size", () => {
    const bad = (l: ListFacts) => ({
      ...l,
      crowd: {
        ...l.crowd,
        expected_distinct: l.crowd.expected_distinct.filter((e) => e.n !== l.crowd.crowd_size),
      },
    });
    expect(accepts(artefact({ lists: { male: bad(male), female: bad(female) } }))).toBe(false);
  });

  it("rejects thresholds out of order by at_least, and quantiles out of order by q", () => {
    const thresholds = [
      { at_least: 10, surnames: 1, people: 10 },
      { at_least: 2, surnames: 5, people: 22 },
    ];
    const twice = [
      { at_least: 2, surnames: 5, people: 22 },
      { at_least: 2, surnames: 5, people: 22 },
    ];
    const quantiles = [
      { q: 0.9, count: 8 },
      { q: 0.5, count: 3 },
    ];
    const patches = [
      (l: ListFacts) => ({ ...l, summary: { ...l.summary, thresholds } }),
      (l: ListFacts) => ({ ...l, summary: { ...l.summary, thresholds: twice } }),
      (l: ListFacts) => ({ ...l, summary: { ...l.summary, surname_quantiles: quantiles } }),
      (l: ListFacts) => ({ ...l, summary: { ...l.summary, person_quantiles: quantiles } }),
    ];
    for (const patch of patches) {
      expect(accepts(artefact({ lists: { male: patch(male), female: patch(female) } }))).toBe(
        false,
      );
    }
  });

  it("requires reach_half to hold TOP_1, TOP_10 and TOP_100 once each, in any order", () => {
    const [top1, top10, top100] = male.crowd.reach_half;
    const withSets = (reach_half: unknown[]) => (l: ListFacts) => ({
      ...l,
      crowd: { ...l.crowd, reach_half },
    });
    const both = (patch: (l: ListFacts) => unknown) =>
      accepts(artefact({ lists: { male: patch(male), female: patch(female) } }));
    expect(both(withSets([top100, top1, top10]))).toBe(true);
    expect(both(withSets([top1, top1, top100]))).toBe(false);
    expect(both(withSets([top1, top10, top10]))).toBe(false);
  });
});

/** The messages of every issue the schema raises for `value` (none when it is accepted). */
function issues(value: unknown): string[] {
  const result = listFactsArtefactSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

/** Refused, and for the stated reason (a fragment of the refinement's message). */
function expectRefused(value: unknown, reason: string): void {
  const messages = issues(value);
  expect(messages.length, `accepted, expected refusal for "${reason}"`).toBeGreaterThan(0);
  expect(messages.join(" | ")).toContain(reason);
}

/** The artefact with the male list patched, and the female list as it is. */
const withMale = (patch: (l: ListFacts) => unknown) =>
  artefact({ lists: { male: patch(male), female } });
/** The artefact with the same patch applied to both lists. */
const withBoth = (patch: (l: ListFacts) => unknown) =>
  artefact({ lists: { male: patch(male), female: patch(female) } });

describe("listFactsArtefactSchema, list_facts@2 (TASK-043, ADR-0018)", () => {
  it("is list_facts@2 with a floor of 20 people for a named surname", () => {
    expect(LIST_FACTS_SCHEMA_VERSION).toBe("list_facts@2");
    expect(NAMED_SURNAME_FLOOR).toBe(20);
    expect(issues(artefact())).toEqual([]);
  });

  it("refuses dots that do not add up to the list's surnames or people", () => {
    expectRefused(
      withMale((l) => ({
        ...l,
        dots: { ...l.dots, histogram: [...l.dots.histogram, { count: 41, surnames: 1 }] },
      })),
      "dots must add up",
    );
    // Same surnames, different people: count × surnames is checked too.
    expectRefused(
      withMale((l) => ({
        ...l,
        dots: {
          ...l.dots,
          histogram: l.dots.histogram.map((d) => (d.count === 40 ? { ...d, count: 41 } : d)),
        },
      })),
      "dots must add up",
    );
  });

  it("refuses dots out of order or with a count twice", () => {
    const reversed = (l: ListFacts) => ({
      ...l,
      dots: { ...l.dots, histogram: [...l.dots.histogram].reverse() },
    });
    expectRefused(withBoth(reversed), "ascending by count");
    const twice = (l: ListFacts) => ({
      ...l,
      dots: {
        ...l.dots,
        histogram: [{ count: 2, surnames: 1 }, ...l.dots.histogram],
      },
    });
    expectRefused(withBoth(twice), "ascending by count");
  });

  it("refuses bands that do not add up to the list's surnames or people", () => {
    const moreSurnames = (l: ListFacts) => ({
      ...l,
      bands: {
        ...l.bands,
        ranges: l.bands.ranges.map((b) =>
          b.from === 100 ? { ...b, surnames: 1, people: 100 } : b,
        ),
      },
    });
    expectRefused(withMale(moreSurnames), "bands must add up");
    const morePeople = (l: ListFacts) => ({
      ...l,
      bands: {
        ...l.bands,
        ranges: l.bands.ranges.map((b) => (b.from === 10 ? { ...b, people: b.people + 1 } : b)),
      },
    });
    expectRefused(withMale(morePeople), "bands must add up");
  });

  it("refuses bands with a gap, out of order, or with a closed last band", () => {
    const gap = (l: ListFacts) => ({
      ...l,
      bands: {
        ...l.bands,
        ranges: l.bands.ranges.map((b) => (b.from === 3 ? { ...b, to: 8 } : b)),
      },
    });
    expectRefused(withBoth(gap), "contiguous and ascending");
    const reversed = (l: ListFacts) => ({
      ...l,
      bands: { ...l.bands, ranges: [...l.bands.ranges].reverse() },
    });
    expectRefused(withBoth(reversed), "contiguous and ascending");
    const closed = (l: ListFacts) => ({
      ...l,
      bands: {
        ...l.bands,
        ranges: l.bands.ranges.map((b) => (b.to === null ? { ...b, to: 99999 } : b)),
      },
    });
    expectRefused(withBoth(closed), "contiguous and ascending");
  });

  it("refuses a band whose people cannot come from its surnames", () => {
    const impossible = (l: ListFacts) => ({
      ...l,
      bands: {
        ...l.bands,
        ranges: l.bands.ranges.map((b) =>
          b.from === 2 ? { ...b, people: 1 } : b.from === 3 ? { ...b, people: b.people + 1 } : b,
        ),
      },
    });
    expectRefused(withMale(impossible), "between its surnames times");
  });

  it("refuses under_10 that is not the surnames of the bands below 10", () => {
    const wrong = (l: ListFacts) => ({ ...l, bands: { ...l.bands, under_10: 3 } });
    expectRefused(withMale(wrong), "under_10 must equal");
    const noTenEdge = (l: ListFacts) => ({
      ...l,
      bands: {
        ...l.bands,
        ranges: [
          { from: 2, to: 2, surnames: 1, people: 2 },
          { from: 3, to: 19, surnames: 1, people: 3 },
          { from: 20, to: null, surnames: 3, people: 85 },
        ],
        under_10: 1,
      },
    });
    expectRefused(withBoth(noTenEdge), "a band starting at 10");
  });

  it("refuses concentration levels out of order, falling, or without q = 0.5", () => {
    const reversed = (l: ListFacts) => ({
      ...l,
      concentration: { ...l.concentration, levels: [...l.concentration.levels].reverse() },
    });
    expectRefused(withBoth(reversed), "ascending by q");
    const withoutHalf = (l: ListFacts) => ({
      ...l,
      concentration: {
        ...l.concentration,
        levels: l.concentration.levels.filter((level) => level.q !== 0.5),
      },
    });
    expectRefused(withBoth(withoutHalf), "must hold q = 0.5");
    const falling = (l: ListFacts) => ({
      ...l,
      concentration: {
        ...l.concentration,
        levels: l.concentration.levels.map((level) =>
          level.q === 0.9 ? { ...level, surnames: 1 } : level,
        ),
      },
    });
    expectRefused(withBoth(falling), "must not fall");
  });

  it("refuses a concentration level short of its share, and a wrong beyond_half", () => {
    // 64 of 90 people is still at least half, so only the next level's shortfall is refused.
    const short = (l: ListFacts) => ({
      ...l,
      concentration: {
        ...l.concentration,
        levels: l.concentration.levels.map((level) =>
          level.q === 0.9 ? { ...level, people: 80 } : level,
        ),
      },
    });
    expectRefused(withMale(short), "at least its share q");
    const beyond = (l: ListFacts) => ({
      ...l,
      concentration: { ...l.concentration, beyond_half: 2 },
    });
    expectRefused(withMale(beyond), "beyond_half must be");
  });

  it("refuses overlapping endings: one ending a suffix of another", () => {
    const entry = { surnames: 0, people: 0, share_of_people: 0 };
    for (const endings of [
      ["ski", "wski"],
      ["ak", "czak"],
      ["ski", "ski"],
    ]) {
      const parsed = listEndingsSchema.safeParse({
        method_version: "list_endings@1",
        entries: endings.map((ending) => ({ ending, ...entry })),
      });
      expect(parsed.success, endings.join(" ")).toBe(false);
    }
    const overlapping = (l: ListFacts) => ({
      ...l,
      endings: {
        ...l.endings,
        entries: [...l.endings.entries, { ending: "wski", ...entry }],
      },
    });
    expectRefused(withBoth(overlapping), "no ending may be a suffix of another");
  });

  it("refuses endings other than the fixed set of the list's partition", () => {
    // The female list's endings on the male list, and vice versa.
    const swapped = (from: ListFacts) => (l: ListFacts) => ({ ...l, endings: from.endings });
    expectRefused(
      artefact({ lists: { male: swapped(female)(male), female } }),
      "fixed set of endings",
    );
    expectRefused(
      artefact({ lists: { male, female: swapped(male)(female) } }),
      "fixed set of endings",
    );
    const reordered = (l: ListFacts) => ({
      ...l,
      endings: { ...l.endings, entries: [...l.endings.entries].reverse() },
    });
    expectRefused(withBoth(reordered), "fixed set of endings");
  });

  it("refuses an ending whose share is not its people over the list's", () => {
    const wrongShare = (l: ListFacts) => ({
      ...l,
      endings: {
        ...l.endings,
        entries: l.endings.entries.map((e) =>
          e.ending === "ski" ? { ...e, share_of_people: 0.4 } : e,
        ),
      },
    });
    expectRefused(withMale(wrongShare), "each share of people");
  });

  it("refuses initials missing a letter, out of order, or with a letter twice", () => {
    const missing = (l: ListFacts) => ({
      ...l,
      initials: { ...l.initials, letters: l.initials.letters.slice(0, -1) },
    });
    expectRefused(withBoth(missing), "once and in that order");
    const reordered = (l: ListFacts) => ({
      ...l,
      initials: { ...l.initials, letters: [...l.initials.letters].reverse() },
    });
    expectRefused(withBoth(reordered), "once and in that order");
    const twice = (l: ListFacts) => ({
      ...l,
      initials: {
        ...l.initials,
        letters: l.initials.letters.map((i) => (i.letter === "Ą" ? { ...i, letter: "A" } : i)),
      },
    });
    expectRefused(withBoth(twice), "once and in that order");
  });

  it("states an absent letter as absent: never zero people, never absent with figures", () => {
    const patchLetter = (letter: string, entry: unknown) => (l: ListFacts) => ({
      ...l,
      initials: {
        ...l.initials,
        letters: l.initials.letters.map((i) => (i.letter === letter ? entry : i)),
      },
    });
    for (const entry of [
      { letter: "Ą", surnames: 0, people: 0 },
      { letter: "Ą", absent: true, surnames: 0, people: 0 },
      { letter: "Ą", absent: false },
      { letter: "Ą" },
      { letter: "N", absent: true, surnames: 1, people: 40 },
    ]) {
      expect(accepts(withMale(patchLetter(entry.letter, entry))), JSON.stringify(entry)).toBe(
        false,
      );
    }
  });

  it("refuses initials that do not add up with outside to the list", () => {
    const outside = (l: ListFacts) => ({
      ...l,
      initials: { ...l.initials, outside: { surnames: 1, people: 2 } },
    });
    expectRefused(withMale(outside), "initials and outside must add up");
  });

  it("names as top the present letter with the most people", () => {
    expectRefused(
      withMale((l) => ({ ...l, initials: { ...l.initials, top: "K" } })),
      "initials.top",
    );
    expectRefused(
      withMale((l) => ({ ...l, initials: { ...l.initials, top: "Ą" } })),
      "initials.top",
    );
  });

  it("names as rarest_polish a present Polish letter with the fewest people", () => {
    // X has the fewest people on the male list, but X is not a letter of the Polish alphabet.
    for (const letter of ["X", "N", "Ą"]) {
      expectRefused(
        withMale((l) => ({ ...l, initials: { ...l.initials, rarest_polish: letter } })),
        "initials.rarest_polish",
      );
    }
  });

  it("refuses a named selection below the floor of 20 people", () => {
    const below = { key: "xu", published: "XU", count: NAMED_SURNAME_FLOOR - 1 };
    expect(
      accepts(
        withMale((l) => ({
          ...l,
          hyphenated: {
            ...l.hyphenated,
            top: { key: "a-b", published: "A-B", count: NAMED_SURNAME_FLOOR - 1 },
          },
        })),
      ),
    ).toBe(false);
    expect(
      accepts(
        withMale((l) => ({
          ...l,
          named_top: { ...l.named_top, items: [...l.named_top.items.slice(0, 2), below] },
        })),
      ),
    ).toBe(false);
    const onBoth = OVERLAP.on_both_top;
    expect(
      accepts(
        artefact({
          overlap: {
            ...OVERLAP,
            on_both_top: { ...onBoth, female: { ...onBoth.female, count: 19 } },
          },
        }),
      ),
    ).toBe(false);
    for (const side of ["male", "female"] as const) {
      expect(
        accepts(
          artefact({
            overlap: { ...OVERLAP, one_list_top: { ...OVERLAP.one_list_top, [side]: below } },
          }),
        ),
        side,
      ).toBe(false);
    }
  });

  it("accepts no name at all where a selection has none at or above the floor", () => {
    expect(
      issues(
        artefact({
          lists: {
            male: { ...male, hyphenated: { ...male.hyphenated, top: null } },
            female: { ...female, named_top: { ...female.named_top, items: [] } },
          },
          overlap: { ...OVERLAP, on_both_top: null, one_list_top: { male: null, female: null } },
        }),
      ),
    ).toEqual([]);
  });

  it("refuses named_top out of selection order, more than three, or not led by the top count", () => {
    const [first, second, third] = male.named_top.items;
    const withItems = (items: unknown[]) => (l: ListFacts) => ({
      ...l,
      named_top: { ...l.named_top, items },
    });
    expectRefused(withMale(withItems([second, first, third])), "by count descending");
    // A tie is broken by key in code-point order: "a…" before "b…".
    const tieA = { key: "a", published: "A", count: 25 };
    const tieB = { key: "b", published: "B", count: 25 };
    expect(accepts(withMale(withItems([first, tieA, tieB])))).toBe(true);
    expectRefused(withMale(withItems([first, tieB, tieA])), "by count descending");
    expect(accepts(withMale(withItems([first, second, third, third])))).toBe(false);
    expectRefused(withMale(withItems([second, third])), "most common surname");
  });

  it("refuses a hyphenated top without a hyphen", () => {
    expectRefused(
      withMale((l) => ({
        ...l,
        hyphenated: { ...l.hyphenated, top: { key: "nowak", published: "NOWAK", count: 20 } },
      })),
      "hyphenated.top",
    );
  });

  it("refuses overlap parts that do not add up to each list's surnames", () => {
    for (const patch of [
      { male_only: 4 },
      { female_only: 2 },
      { both: 3 },
      // Adding up across the two lists is not the check: each list on its own is.
      { male_only: 4, female_only: 2 },
    ]) {
      expectRefused(artefact({ overlap: { ...OVERLAP, ...patch } }), "overlap must add up");
    }
  });

  it("refuses an overlap selection from an empty part, or past its own list's largest count", () => {
    expectRefused(
      artefact({ overlap: { ...OVERLAP, male_only: 0, both: 5, female_only: 0 } }),
      "needs a surname in the part",
    );
    const onBoth = OVERLAP.on_both_top;
    expectRefused(
      artefact({
        overlap: {
          ...OVERLAP,
          on_both_top: { ...onBoth, female: { ...onBoth.female, count: 31 } },
        },
      }),
      "fit within its own list",
    );
  });

  it("refuses the two lists with different concentration q values or band edges", () => {
    const patches: Record<string, (l: ListFacts) => ListFacts> = {
      "concentration q": (l) => ({
        ...l,
        concentration: {
          ...l.concentration,
          levels: l.concentration.levels.filter((level) => level.q !== 0.1),
        },
      }),
      "band edges": (l) => ({
        ...l,
        bands: {
          ...l.bands,
          ranges: [
            ...l.bands.ranges.slice(0, 5),
            { from: 10000, to: 99999, surnames: 0, people: 0 },
            { from: 100000, to: null, surnames: 0, people: 0 },
          ],
        },
      }),
    };
    for (const [name, patch] of Object.entries(patches)) {
      // Each patch alone is a valid list; only the pair disagrees.
      expect(issues(withBoth(patch)), name).toEqual([]);
      expectRefused(artefact({ lists: { male, female: patch(female) } }), "same model parameters");
    }
  });

  it("requires the overlap", () => {
    const { overlap: _dropped, ...without } = artefact();
    expect(accepts(without)).toBe(false);
  });
});
