import { describe, expect, it } from "vitest";
import { LIST_FACTS_SCHEMA_VERSION, listFactsArtefactSchema } from "./list-facts.js";
import type { ListFacts } from "./list-facts.js";

/**
 * The list-facts contract (TASK-040 AC-01, `docs/contracts/list-facts.md`).
 * The values below are a small made-up example, not PESEL figures.
 */

function list(partition: "national_male" | "national_female", id: string, sha: string): ListFacts {
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
      people: 22,
      surnames: 5,
      max_count: 10,
      min_count: 2,
      median_count_per_surname: 3,
      median_count_per_person: 5,
      thresholds: [{ at_least: 2, surnames: 5, people: 22 }],
      surname_quantiles: [{ q: 0.5, count: 3 }],
      person_quantiles: [{ q: 0.5, count: 5 }],
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
  };
}

const male = list("national_male", "1148808", "a".repeat(64));
const female = list("national_female", "1148811", "b".repeat(64));

function artefact(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: LIST_FACTS_SCHEMA_VERSION,
    generated_by: "packages/truth/bin/build-list-facts.ts",
    pipeline_version: "list_facts_pipeline@1",
    snapshot_date: "2026-01-20",
    birthday_reference: { n_half: 23, p_at_n_half: 0.507297234 },
    lists: { male, female },
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

  it("carries no surname: a reach set is an unnamed set, never a name", () => {
    const named = {
      ...male,
      crowd: {
        ...male.crowd,
        reach_half: [
          { ...male.crowd.reach_half[0]!, set: "NOWAK" },
          ...male.crowd.reach_half.slice(1),
        ],
      },
    };
    expect(accepts(artefact({ lists: { male: named, female } }))).toBe(false);
  });

  it("carries no surname: a name added anywhere is stripped, never passed on", () => {
    const smuggled = {
      ...male,
      surname: "NOWAK",
      summary: { ...male.summary, most_common: "NOWAK" },
      collision: {
        ...male.collision,
        example_rooms: { ...male.collision.example_rooms, pair_surname: "NOWAK" },
      },
      crowd: {
        ...male.crowd,
        reach_half: male.crowd.reach_half.map((r) => ({ ...r, surnames: ["NOWAK"] })),
      },
    };
    const parsed = listFactsArtefactSchema.parse(
      artefact({ lists: { male: smuggled, female }, top_surname: "NOWAK" }),
    );
    expect(JSON.stringify(parsed)).not.toContain("NOWAK");
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
