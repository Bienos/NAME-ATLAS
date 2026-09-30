import { describe, expect, it } from "vitest";
import {
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  PESEL_NATIONAL_SERIES,
  PESEL_REFUSED_RESOURCES,
  PESEL_SERIES_KEYS,
  PESEL_SOURCE,
} from "@name-atlas/sources";
import { LIST_ENDINGS, NAMED_SURNAME_FLOOR } from "@name-atlas/contracts";
import type { ListFacts } from "@name-atlas/contracts";
import { canonicalKey } from "@name-atlas/resolver";
import { listFacts } from "./artefact.js";
import { birthdayReference } from "./collision.js";
import { LIST_FACTS_GENERATOR } from "./build.js";
import {
  LIST_BANDS_METHOD_VERSION,
  LIST_CHANGE_METHOD_VERSION,
  LIST_COLLISION_CURVE_MAX,
  LIST_COLLISION_METHOD_VERSION,
  LIST_CONCENTRATION_METHOD_VERSION,
  LIST_CONCENTRATION_QUANTILES,
  LIST_COUNT_BANDS,
  LIST_CROWD_METHOD_VERSION,
  LIST_DOTS_METHOD_VERSION,
  LIST_EDITIONS_METHOD_VERSION,
  LIST_ENDINGS_METHOD_VERSION,
  LIST_HYPHENATED_METHOD_VERSION,
  LIST_INITIALS_METHOD_VERSION,
  LIST_NAMED_TOP_METHOD_VERSION,
  LIST_OVERLAP_METHOD_VERSION,
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
 * The committed artefact (TASK-040 AC-04, TASK-043 AC-01). CI has no copy of
 * the official files, so it cannot regenerate the artefact; it checks instead
 * that the committed one parses, is pinned to the registry's resources and is
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

describe.each(lists)("the %s list, list_facts@2 sections", (_key, list: ListFacts) => {
  it("carries each new section's method version and the shared parameters", () => {
    expect(list.dots.method_version).toBe(LIST_DOTS_METHOD_VERSION);
    expect(list.concentration.method_version).toBe(LIST_CONCENTRATION_METHOD_VERSION);
    expect(list.bands.method_version).toBe(LIST_BANDS_METHOD_VERSION);
    expect(list.endings.method_version).toBe(LIST_ENDINGS_METHOD_VERSION);
    expect(list.initials.method_version).toBe(LIST_INITIALS_METHOD_VERSION);
    expect(list.hyphenated.method_version).toBe(LIST_HYPHENATED_METHOD_VERSION);
    expect(list.named_top.method_version).toBe(LIST_NAMED_TOP_METHOD_VERSION);
    expect(list.concentration.levels.map((l) => l.q)).toEqual(LIST_CONCENTRATION_QUANTILES);
    expect(list.bands.ranges.map(({ from, to }) => ({ from, to }))).toEqual(LIST_COUNT_BANDS);
    expect(list.endings.entries.map((e) => e.ending)).toEqual(LIST_ENDINGS[list.partition]);
  });

  it("dots, bands and summary describe the same counts", () => {
    const { dots, bands, summary } = list;
    expect(dots.histogram[0]!.count).toBe(summary.min_count);
    expect(dots.histogram.at(-1)!.count).toBe(summary.max_count);
    const twos = dots.histogram.find((d) => d.count === 2)!;
    expect(bands.ranges[0]).toEqual({
      from: 2,
      to: 2,
      surnames: twos.surnames,
      people: 2 * twos.surnames,
    });
    const atLeast10 = summary.thresholds.find((t) => t.at_least === 10)!;
    expect(bands.under_10).toBe(summary.surnames - atLeast10.surnames);
  });

  it("names only ADR-0018 selections, each at or above the floor, keyed by canonical_key_v2", () => {
    const selections = [
      ...list.named_top.items,
      ...(list.hyphenated.top ? [list.hyphenated.top] : []),
    ];
    expect(list.named_top.items).toHaveLength(3);
    for (const selection of selections) {
      expect(selection.count).toBeGreaterThanOrEqual(NAMED_SURNAME_FLOOR);
      expect(selection.key).toBe(canonicalKey(selection.published));
    }
    expect(list.named_top.items[0]!.count).toBe(list.summary.max_count);
    expect(list.hyphenated.top?.key).toContain("-");
  });

  it("the top letter and the rarest Polish letter are present on the list", () => {
    const byLetter = new Map(list.initials.letters.map((l) => [l.letter, l]));
    expect("absent" in byLetter.get(list.initials.top)!).toBe(false);
    expect("absent" in byLetter.get(list.initials.rarest_polish)!).toBe(false);
  });
});

describe.each(lists)(
  "the %s list, list_facts@3 editions and change (ADR-0019)",
  (_key, list: ListFacts, descriptor) => {
    const partition = descriptor.role as "national_male" | "national_female";
    const { editions, change } = list;

    it("holds every edition of its registry series, in date order, pinned byte for byte", () => {
      expect(editions.method_version).toBe(LIST_EDITIONS_METHOD_VERSION);
      expect(editions.series).toBe(PESEL_SERIES_KEYS[partition]);
      expect(
        editions.items.map((e) => [e.series, e.resource_id, e.data_date, e.sha256, e.row_count]),
      ).toEqual(
        PESEL_NATIONAL_SERIES[partition].map((d) => [
          d.series,
          d.resource_id,
          d.data_date,
          d.official_sha256,
          d.official_row_count,
        ]),
      );
      // ADR-0019 §1: every edition has the same publication floor.
      for (const edition of editions.items) {
        expect(edition.min_count).toBe(2);
        expect(edition.surnames).toBe(edition.row_count);
      }
    });

    it("records each resource the registry refused from its series as a gap, never a value", () => {
      expect(editions.gaps).toEqual(
        PESEL_REFUSED_RESOURCES.filter((r) => r.series === PESEL_SERIES_KEYS[partition]).map(
          (r) => ({
            data_date: r.data_date,
            resource_id: r.resource_id,
            reason: r.reason,
            duplicate_of: r.duplicate_of,
          }),
        ),
      );
    });

    it("ends with the list itself", () => {
      const last = editions.items[editions.items.length - 1]!;
      expect([last.resource_id, last.sha256, last.data_date]).toEqual([
        descriptor.resource_id,
        descriptor.official_sha256,
        descriptor.data_date,
      ]);
      expect([last.surnames, last.people]).toEqual([list.summary.surnames, list.summary.people]);
    });

    it("compares the first edition with the last, for TOP_3 by key", () => {
      const first = editions.items[0]!;
      const last = editions.items[editions.items.length - 1]!;
      expect(change.method_version).toBe(LIST_CHANGE_METHOD_VERSION);
      expect(change).toMatchObject({
        first_data_date: first.data_date,
        last_data_date: last.data_date,
        surnames_delta: last.surnames - first.surnames,
        people_delta: last.people - first.people,
      });
      expect(change.top3_first_counts.map((t) => t.key)).toEqual(
        list.named_top.items.map((item) => item.key),
      );
      for (const entry of change.top3_first_counts) {
        expect(entry.count_first === null || entry.count_first >= 2).toBe(true);
      }
    });
  },
);

describe("the overlap of the two lists (ADR-0018 §2.3)", () => {
  const { overlap } = artefact;
  const { male, female } = artefact.lists;

  it("adds up to each list's own surnames, and names only selections at or above the floor", () => {
    expect(overlap.method_version).toBe(LIST_OVERLAP_METHOD_VERSION);
    expect(overlap.male_only + overlap.both).toBe(male.summary.surnames);
    expect(overlap.female_only + overlap.both).toBe(female.summary.surnames);
    const top = overlap.on_both_top!;
    expect(top.male.count).toBeGreaterThanOrEqual(NAMED_SURNAME_FLOOR);
    expect(top.female.count).toBeGreaterThanOrEqual(NAMED_SURNAME_FLOOR);
    expect(top.key).toBe(canonicalKey(top.male.published));
    expect(top.key).toBe(canonicalKey(top.female.published));
    for (const selection of [overlap.one_list_top.male!, overlap.one_list_top.female!]) {
      expect(selection.count).toBeGreaterThanOrEqual(NAMED_SURNAME_FLOOR);
      expect(selection.key).toBe(canonicalKey(selection.published));
    }
  });
});

describe("the two lists stay two universes", () => {
  const { male, female } = artefact.lists;

  it("come from two different resources", () => {
    expect(male.source.external_record_id).not.toBe(female.source.external_record_id);
    expect(male.source.sha256).not.toBe(female.source.sha256);
  });

  it("are two series, with no edition in both", () => {
    expect(male.editions.series).not.toBe(female.editions.series);
    const maleIds = new Set(male.editions.items.map((e) => e.resource_id));
    expect(female.editions.items.filter((e) => maleIds.has(e.resource_id))).toEqual([]);
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

describe("surname strings are only ADR-0018's named selections", () => {
  it("holds strings only at the contract's fixed fields", () => {
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
      "dots.method_version",
      "concentration.method_version",
      "bands.method_version",
      "endings.method_version",
      "endings.entries[].ending",
      "initials.method_version",
      "initials.letters[].letter",
      "initials.top",
      "initials.rarest_polish",
      "hyphenated.method_version",
      "hyphenated.top.key",
      "hyphenated.top.published",
      "named_top.method_version",
      "named_top.items[].key",
      "named_top.items[].published",
      // list_facts@3 (ADR-0019): lineage, and the keys of TOP_3 on the first edition.
      "editions.method_version",
      "editions.series",
      "editions.items[].series",
      "editions.items[].resource_id",
      "editions.items[].data_date",
      "editions.items[].sha256",
      "change.method_version",
      "change.first_data_date",
      "change.last_data_date",
      "change.top3_first_counts[].key",
    ];
    expect([...paths].sort()).toEqual(
      [
        "schema_version",
        "generated_by",
        "pipeline_version",
        "snapshot_date",
        ...perList.map((p) => `lists.male.${p}`),
        ...perList.map((p) => `lists.female.${p}`),
        // Only the female series has a gap: resource 38772, a publisher duplicate.
        ...["data_date", "resource_id", "reason", "duplicate_of"].map(
          (field) => `lists.female.editions.gaps[].${field}`,
        ),
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
});
