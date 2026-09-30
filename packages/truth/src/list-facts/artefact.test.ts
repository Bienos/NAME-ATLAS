import { describe, expect, it } from "vitest";
import {
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  PESEL_SOURCE,
} from "@name-atlas/sources";
import type { ListFacts } from "@name-atlas/contracts";
import { listFacts } from "./artefact.js";
import { birthdayReference } from "./collision.js";
import { LIST_FACTS_GENERATOR } from "./build.js";
import {
  LIST_COLLISION_CURVE_MAX,
  LIST_COLLISION_METHOD_VERSION,
  LIST_CROWD_METHOD_VERSION,
  LIST_CROWD_SEED_OFFSET,
  LIST_CROWD_SIZE,
  LIST_CROWD_SIZES,
  LIST_EXAMPLE_ROOMS,
  LIST_FACTS_METHOD_VERSION,
  LIST_REACH_SETS,
  LIST_ROOM_SEEDS,
  LIST_SUMMARY_METHOD_VERSION,
  LIST_SUMMARY_QUANTILES,
  LIST_SUMMARY_THRESHOLDS,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
} from "../version.js";

/**
 * The committed artefact (TASK-040 AC-04). CI has no copy of the official
 * files, so it cannot regenerate the artefact; it checks instead that the
 * committed one parses, is pinned to the registry's resources and is
 * internally consistent.
 */

const artefact = listFacts();
const lists = [
  ["male", artefact.lists.male, PESEL_NATIONAL_MALE_2026],
  ["female", artefact.lists.female, PESEL_NATIONAL_FEMALE_2026],
] as const;

describe("listFacts()", () => {
  it("parses the committed module once and returns the same object after", () => {
    expect(listFacts()).toBe(artefact);
    expect(artefact.generated_by).toBe(LIST_FACTS_GENERATOR);
    expect(artefact.pipeline_version).toBe(LIST_FACTS_METHOD_VERSION);
    expect(artefact.snapshot_date).toBe(PESEL_NATIONAL_MALE_2026.data_date);
  });

  it("carries the birthday comparison as computed, not as typed", () => {
    expect(artefact.birthday_reference).toEqual(birthdayReference());
  });
});

describe.each(lists)("the %s list", (_key, list: ListFacts, descriptor) => {
  it("is pinned to its registry resource: id, SHA-256, row count, snapshot date", () => {
    expect(list.partition).toBe(descriptor.role);
    expect(list.source).toEqual({
      dataset_id: 1681,
      external_record_id: descriptor.resource_id,
      sha256: descriptor.official_sha256,
      row_count: descriptor.official_row_count,
      snapshot_date: descriptor.data_date,
      source_page_url: PESEL_SOURCE.homepage_or_reference_url,
    });
    expect(list.summary.surnames).toBe(descriptor.official_row_count);
  });

  it("was assessed complete, verified and allowed on the free surface", () => {
    expect(list.assessment).toEqual({
      completeness: "COMPLETE",
      confidence_status: "VERIFIED",
      confidence_method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
      confidence_version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
      free_surface: "ALLOWED",
    });
    expect(list.summary.method_version).toBe(LIST_SUMMARY_METHOD_VERSION);
    expect(list.collision.method_version).toBe(LIST_COLLISION_METHOD_VERSION);
    expect(list.crowd.method_version).toBe(LIST_CROWD_METHOD_VERSION);
  });

  it("summary: thresholds monotone; the lowest threshold holds the whole list", () => {
    const { summary } = list;
    expect(summary.min_count).toBe(2);
    expect(summary.thresholds.map((t) => t.at_least)).toEqual(LIST_SUMMARY_THRESHOLDS);
    for (let i = 1; i < summary.thresholds.length; i++) {
      expect(summary.thresholds[i]!.surnames).toBeLessThanOrEqual(
        summary.thresholds[i - 1]!.surnames,
      );
      expect(summary.thresholds[i]!.people).toBeLessThanOrEqual(summary.thresholds[i - 1]!.people);
    }
    const whole = summary.thresholds.find((t) => t.at_least === summary.min_count);
    expect(whole).toEqual({
      at_least: summary.min_count,
      surnames: summary.surnames,
      people: summary.people,
    });
    expect(summary.surname_quantiles.map((q) => q.q)).toEqual(LIST_SUMMARY_QUANTILES);
    expect(summary.person_quantiles.map((q) => q.q)).toEqual(LIST_SUMMARY_QUANTILES);
    expect(summary.surname_quantiles[0]!.count).toBe(summary.median_count_per_surname);
    for (const quantiles of [summary.surname_quantiles, summary.person_quantiles]) {
      for (let i = 1; i < quantiles.length; i++) {
        expect(quantiles[i]!.count).toBeGreaterThanOrEqual(quantiles[i - 1]!.count);
      }
      for (const q of quantiles) {
        expect(q.count).toBeGreaterThanOrEqual(summary.min_count);
        expect(q.count).toBeLessThanOrEqual(summary.max_count);
      }
    }
    expect(summary.median_count_per_person).toBeGreaterThanOrEqual(
      summary.median_count_per_surname,
    );
  });

  it("collision: the curve runs 2…300 strictly increasing and n_half agrees with it", () => {
    const { collision } = list;
    expect(collision.curve.map((p) => p.n)).toEqual(
      Array.from({ length: LIST_COLLISION_CURVE_MAX - 1 }, (_, i) => i + 2),
    );
    for (let i = 1; i < collision.curve.length; i++) {
      expect(collision.curve[i]!.p).toBeGreaterThan(collision.curve[i - 1]!.p);
    }
    const at = collision.curve.find((p) => p.n === collision.n_half)!;
    const before = collision.curve.find((p) => p.n === collision.n_half - 1)!;
    expect(at.p).toBe(collision.p_at_n_half);
    expect(before.p).toBe(collision.p_before_n_half);
    expect(collision.p_at_n_half).toBeGreaterThanOrEqual(0.5);
    // n_half is decided on the unrounded chance, so the stored p before it is at most 0.5.
    expect(collision.p_before_n_half).toBeLessThanOrEqual(0.5);
    // P(2) on the curve and the rounded 1-in-X for a pair say the same thing.
    expect(Math.abs(1 / collision.curve[0]!.p - collision.pair_one_in)).toBeLessThan(0.51);
  });

  it("collision: the example rooms are seeded as recorded and consistent", () => {
    const rooms = list.collision.example_rooms;
    expect(rooms.seed).toBe(LIST_ROOM_SEEDS[list.partition]);
    expect(rooms.first_pair_at).toHaveLength(LIST_EXAMPLE_ROOMS);
    expect(rooms.showcase_pair[1]).toBe(rooms.first_pair_at[0]);
    expect(rooms.showcase_pair[0]).toBeLessThan(rooms.showcase_pair[1]);
    for (const seat of rooms.first_pair_at) expect(seat).toBeGreaterThanOrEqual(2);
  });

  it("crowd: expected distinct rises and never exceeds n or the list's surnames", () => {
    const { crowd, summary } = list;
    expect(crowd.expected_distinct.map((e) => e.n)).toEqual(LIST_CROWD_SIZES);
    for (let i = 0; i < crowd.expected_distinct.length; i++) {
      const { n, value } = crowd.expected_distinct[i]!;
      expect(value).toBeLessThanOrEqual(Math.min(n, summary.surnames));
      if (i > 0) expect(value).toBeGreaterThan(crowd.expected_distinct[i - 1]!.value);
    }
    expect(crowd.crowd_size).toBe(LIST_CROWD_SIZE);
    // A person without a namesake is one surname of the crowd: loners <= distinct.
    const atCrowd = crowd.expected_distinct.find((e) => e.n === crowd.crowd_size)!;
    expect(crowd.share_without_namesake * crowd.crowd_size).toBeLessThanOrEqual(atCrowd.value);
  });

  it("crowd: reach-half for the top 1, 10 and 100, shares rising and n falling", () => {
    const { crowd, summary } = list;
    expect(crowd.reach_half.map((r) => r.set)).toEqual(LIST_REACH_SETS.map((s) => s.set));
    expect(crowd.reach_half[0]!.share_of_people).toBeCloseTo(summary.max_count / summary.people, 9);
    for (let i = 1; i < crowd.reach_half.length; i++) {
      expect(crowd.reach_half[i]!.share_of_people).toBeGreaterThan(
        crowd.reach_half[i - 1]!.share_of_people,
      );
      expect(crowd.reach_half[i]!.n_half).toBeLessThanOrEqual(crowd.reach_half[i - 1]!.n_half);
    }
    for (const r of crowd.reach_half) expect(r.p_at_n_half).toBeGreaterThanOrEqual(0.5);
  });

  it("crowd: the example crowd is seeded as recorded and adds up", () => {
    const { example } = list.crowd;
    expect(example.seed).toBe(LIST_ROOM_SEEDS[list.partition] + LIST_CROWD_SEED_OFFSET);
    expect(example.n).toBe(LIST_CROWD_SIZE);
    expect(example.distinct).toBe(example.without_namesake + example.group_sizes.length);
    expect(example.without_namesake + example.group_sizes.reduce((a, b) => a + b, 0)).toBe(
      example.n,
    );
  });
});

describe("the two lists stay two universes", () => {
  const { male, female } = artefact.lists;

  it("come from two different resources", () => {
    expect(male.source.external_record_id).not.toBe(female.source.external_record_id);
    expect(male.source.sha256).not.toBe(female.source.sha256);
  });

  it("no number in the artefact is a sum of the two lists' people or surnames", () => {
    const sums = new Set([
      male.summary.people + female.summary.people,
      male.summary.surnames + female.summary.surnames,
    ]);
    const numbers: number[] = [];
    const walk = (value: unknown): void => {
      if (typeof value === "number") numbers.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value !== null && typeof value === "object") Object.values(value).forEach(walk);
    };
    walk(artefact);
    expect(numbers.filter((n) => sums.has(n))).toEqual([]);
  });
});

describe("no surname string can be in the artefact", () => {
  it("holds strings only at the contract's fixed, non-surname fields", () => {
    const paths = new Set<string>();
    const walk = (value: unknown, at: string): void => {
      if (typeof value === "string") paths.add(at);
      else if (Array.isArray(value)) value.forEach((v) => walk(v, `${at}[]`));
      else if (value !== null && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) walk(v, at === "" ? k : `${at}.${k}`);
      }
    };
    walk(artefact, "");
    const perList = [
      "partition",
      "source.external_record_id",
      "source.sha256",
      "source.snapshot_date",
      "source.source_page_url",
      "assessment.completeness",
      "assessment.confidence_status",
      "assessment.confidence_method",
      "assessment.confidence_version",
      "assessment.free_surface",
      "summary.method_version",
      "collision.method_version",
      "collision.model",
      "crowd.method_version",
      "crowd.model",
      "crowd.reach_half[].set",
    ];
    expect([...paths].sort()).toEqual(
      [
        "schema_version",
        "generated_by",
        "pipeline_version",
        "snapshot_date",
        ...perList.map((p) => `lists.male.${p}`),
        ...perList.map((p) => `lists.female.${p}`),
      ].sort(),
    );
  });
});
