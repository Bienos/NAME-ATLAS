import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PESEL_TREND_EDITIONS } from "@name-atlas/sources";
import { LIST_FACTS_DATA } from "./generated/list-facts.js";
import {
  buildShift,
  distributionShiftClaimKey,
  distributionShiftClaimKeyPrefix,
  percentChange,
  registryShiftEditions,
  shiftStructuredValue,
} from "./shift.js";
import type { EditionValueRow, LoadedEdition, ShiftEditions } from "./shift.js";

/**
 * TASK-051: the pure half of `SURNAME_DISTRIBUTION_SHIFT`. The database half is
 * `tests/integration/src/distribution-shift.test.ts`.
 */

// A small list of four editions, invented for the arithmetic, not real PESEL data.
const edition = (id: string, date: string, total: number, note = false) => ({
  resource_id: id,
  data_date: date,
  official_sha256: id.repeat(8).slice(0, 8),
  official_people_sum: total,
  official_source_url: `https://example.invalid/resources/${id}`,
  universe_note_code: note ? ("UNIVERSE_DESCRIPTION_DIFFERS" as const) : null,
});

const SET: ShiftEditions = {
  editions: [
    edition("a", "2019-06-30", 1_000_000, true),
    edition("b", "2020-01-22", 1_010_000),
    edition("c", "2021-02-01", 1_050_000),
    edition("d", "2022-01-27", 1_100_000),
  ],
  gaps: [
    {
      resource_id: "x",
      data_date: "2020-06-01",
      reason_code: "PUBLISHER_DUPLICATE",
      duplicate_of: "b",
    },
    {
      resource_id: "y",
      data_date: "2023-01-01",
      reason_code: "PUBLISHER_DUPLICATE",
      duplicate_of: "d",
    },
  ],
};

const loaded = (ids: readonly string[]): Map<string, LoadedEdition> =>
  new Map(
    ids.map((id) => [
      id,
      {
        resource_id: id,
        source_record_id: `rec-${id}`,
        source_id: "src",
        source_url: null,
        retrieved_at: null,
      },
    ]),
  );

const row = (id: string, count: number): [string, EditionValueRow] => [
  id,
  {
    resource_id: id,
    source_record_id: `rec-${id}`,
    distribution_snapshot_id: `snap-${id}`,
    distribution_value_id: `val-${id}`,
    count,
  },
];

describe("percentChange: per cent, one decimal, half away from zero, integers only", () => {
  it.each([
    [100, 100, 0],
    [100, 110, 10],
    [100, 90, -10],
    [101_473, 98_387, -3.0],
    [3, 4, 33.3],
    [3, 2, -33.3],
    [200, 201, 0.5],
    [200, 199, -0.5],
    [2000, 2001, 0.1], // 0.05 rounds away from zero
    [2000, 1999, -0.1],
    [7, 7, 0],
  ])("(%d → %d) is %d per cent", (first, last, expected) => {
    expect(percentChange(first, last)).toBe(expected);
  });

  it("never returns negative zero", () => {
    expect(Object.is(percentChange(1_000_000, 999_999), 0)).toBe(true);
  });

  it("refuses a start that is not a positive integer, and an end that is negative or fractional", () => {
    expect(() => percentChange(0, 5)).toThrow(/positive integer start/u);
    expect(() => percentChange(-1, 5)).toThrow();
    expect(() => percentChange(1.5, 5)).toThrow();
    expect(() => percentChange(5, -1)).toThrow();
    expect(() => percentChange(5, 1.5)).toThrow();
  });
});

describe("buildShift", () => {
  it("builds every loaded edition in date order, with one in X over that edition's own total", () => {
    const build = buildShift(
      "national_male",
      SET,
      loaded(["a", "b", "c", "d"]),
      new Map([row("a", 500), row("b", 505), row("c", 420), row("d", 440)]),
    );
    if (!build) throw new Error("expected a build");
    expect(build.points.map((p) => [p.data_date, p.status])).toEqual([
      ["2019-06-30", "KNOWN"],
      ["2020-01-22", "KNOWN"],
      ["2021-02-01", "KNOWN"],
      ["2022-01-27", "KNOWN"],
    ]);
    const first = build.points[0];
    if (first?.status !== "KNOWN") throw new Error("expected a known point");
    expect(first.count).toBe(500);
    expect(first.list_total).toBe(1_000_000);
    expect(first.one_in_x).toBe(2000);
    expect(first.share).toBe(0.0005);
    expect(first.note_code).toBe("UNIVERSE_DESCRIPTION_DIFFERS");
    expect(build.summary).toEqual({
      known_points: 4,
      first: { data_date: "2019-06-30", count: 500, list_total: 1_000_000 },
      last: { data_date: "2022-01-27", count: 440, list_total: 1_100_000 },
      count_change_percent: -12,
      list_change_percent: 10,
    });
  });

  it("carries an absence as NOT_ON_LIST with no count, never as zero", () => {
    const build = buildShift(
      "national_male",
      SET,
      loaded(["a", "b", "c", "d"]),
      new Map([row("a", 40), row("c", 30), row("d", 35)]),
    );
    if (!build) throw new Error("expected a build");
    const absent = build.points.find((p) => p.resource_id === "b");
    expect(absent?.status).toBe("NOT_ON_LIST");
    expect(absent).not.toHaveProperty("count");
    expect(JSON.stringify(build)).not.toMatch(/"count":\s*0\b/u);
    expect(build.summary.known_points).toBe(3);
  });

  it("does not turn an edition that is not loaded into an absence", () => {
    const build = buildShift(
      "national_male",
      SET,
      loaded(["b", "d"]),
      new Map([row("b", 10), row("d", 12)]),
    );
    if (!build) throw new Error("expected a build");
    expect(build.points.map((p) => p.resource_id)).toEqual(["b", "d"]);
  });

  it("keeps only the gaps between the first and the last known point", () => {
    const build = buildShift(
      "national_male",
      SET,
      loaded(["a", "b", "c", "d"]),
      new Map([row("a", 10), row("d", 12)]),
    );
    expect(build?.gaps.map((g) => g.resource_id)).toEqual(["x"]);
    const narrow = buildShift(
      "national_male",
      SET,
      loaded(["a", "b", "c", "d"]),
      new Map([row("c", 10), row("d", 12)]),
    );
    expect(narrow?.gaps).toEqual([]);
  });

  it("returns null with fewer than two known points: one edition is a count, not a change", () => {
    expect(buildShift("national_male", SET, loaded(["a", "b"]), new Map([row("a", 9)]))).toBeNull();
    expect(buildShift("national_male", SET, loaded(["a", "b", "c", "d"]), new Map())).toBeNull();
    expect(
      buildShift("national_male", SET, loaded(["a", "b", "c", "d"]), new Map([row("d", 9)])),
    ).toBeNull();
    // two loaded editions but one known point
    expect(buildShift("national_male", SET, loaded(["c", "d"]), new Map([row("d", 9)]))).toBeNull();
  });

  it("refuses a stored count below the publisher's floor rather than publishing it", () => {
    expect(() =>
      buildShift("national_male", SET, loaded(["a", "b"]), new Map([row("a", 1), row("b", 5)])),
    ).toThrow(/minimum of 2/u);
  });

  it("changes are signed, and the list's own change is reported beside the count's", () => {
    const build = buildShift(
      "national_male",
      SET,
      loaded(["a", "d"]),
      new Map([row("a", 1000), row("d", 1000)]),
    );
    // the count did not change, the list grew by 10 per cent: the surname's share fell
    expect(build?.summary.count_change_percent).toBe(0);
    expect(build?.summary.list_change_percent).toBe(10);
    const a = build?.points[0];
    const d = build?.points[1];
    if (a?.status !== "KNOWN" || d?.status !== "KNOWN") throw new Error("expected known points");
    expect(d.one_in_x).toBeGreaterThan(a.one_in_x);
  });
});

describe("the claim key", () => {
  const build = buildShift(
    "national_male",
    SET,
    loaded(["a", "b", "c", "d"]),
    new Map([row("a", 10), row("d", 12)]),
  );
  if (!build) throw new Error("expected a build");

  it("is stable for the same stored editions and starts with the surname's list prefix", () => {
    const key = distributionShiftClaimKey("S1", "national_male", build.points);
    expect(key).toBe(distributionShiftClaimKey("S1", "national_male", build.points));
    expect(key.startsWith(distributionShiftClaimKeyPrefix("S1", "national_male"))).toBe(true);
    expect(
      key.startsWith("SURNAME_DISTRIBUTION_SHIFT|S1|national_male|distribution_shift@1|"),
    ).toBe(true);
  });

  it("changes with the stored editions, so a new edition replaces the claim rather than adding one", () => {
    const fewer = buildShift(
      "national_male",
      SET,
      loaded(["a", "d"]),
      new Map([row("a", 10), row("d", 12)]),
    );
    if (!fewer) throw new Error("expected a build");
    expect(distributionShiftClaimKey("S1", "national_male", fewer.points)).not.toBe(
      distributionShiftClaimKey("S1", "national_male", build.points),
    );
  });

  it("differs by surname and by list", () => {
    const key = distributionShiftClaimKey("S1", "national_male", build.points);
    expect(distributionShiftClaimKey("S2", "national_male", build.points)).not.toBe(key);
    expect(distributionShiftClaimKey("S1", "national_female", build.points)).not.toBe(key);
  });

  it("puts the list, points, gaps, summary and method in the stored payload, and no cause", () => {
    const payload = shiftStructuredValue(build);
    expect(Object.keys(payload).sort()).toEqual([
      "algorithm_version",
      "country_code",
      "gaps",
      "points",
      "role",
      "rounding",
      "scope_label_code",
      "summary",
    ]);
    expect(JSON.stringify(payload)).not.toMatch(/cause|because|due to|migration|birth|death/iu);
  });
});

describe("the registry's editions (ADR-0020 §2)", () => {
  const set = registryShiftEditions();

  it("reads 2019 to 2026 for men, and the same without 2022 for women, with 2022 a gap", () => {
    expect(set.national_male.editions.map((e) => e.data_date)).toEqual([
      "2019-06-30",
      "2020-01-22",
      "2021-02-01",
      "2022-01-27",
      "2023-01-30",
      "2024-01-19",
      "2025-01-22",
      "2026-01-20",
    ]);
    expect(set.national_female.editions.map((e) => e.data_date)).toEqual([
      "2019-06-30",
      "2020-01-22",
      "2021-02-02",
      "2023-01-30",
      "2024-01-19",
      "2025-01-22",
      "2026-01-20",
    ]);
    expect(set.national_male.gaps).toEqual([]);
    expect(set.national_female.gaps).toEqual([
      {
        resource_id: "38772",
        data_date: "2022-01-27",
        reason_code: "PUBLISHER_DUPLICATE",
        duplicate_of: "35279",
      },
    ]);
  });

  it("flags the 2019 editions and only them", () => {
    for (const role of ["national_male", "national_female"] as const) {
      const flagged = set[role].editions.filter((e) => e.universe_note_code !== null);
      expect(flagged.map((e) => e.data_date)).toEqual(["2019-06-30"]);
    }
  });

  it("pins, for 2020–2026, exactly the people the committed list-facts artefact computed from the same bytes", () => {
    for (const [role, list] of [
      ["national_male", LIST_FACTS_DATA.lists.male],
      ["national_female", LIST_FACTS_DATA.lists.female],
    ] as const) {
      const items = list.editions.items;
      expect(items.length).toBeGreaterThan(5);
      for (const item of items) {
        const pinned = set[role].editions.find((e) => e.resource_id === item.resource_id);
        expect(pinned, `${role} ${item.resource_id}`).toBeDefined();
        expect(pinned?.official_people_sum).toBe(item.people);
        expect(pinned?.data_date).toBe(item.data_date);
        expect(pinned?.official_sha256).toBe(item.sha256);
      }
    }
  });

  it("agrees with the descriptors it was made from", () => {
    for (const role of ["national_male", "national_female"] as const) {
      expect(set[role].editions.map((e) => e.resource_id)).toEqual(
        PESEL_TREND_EDITIONS[role].map((d) => d.resource_id),
      );
    }
  });
});

describe("the derivation's lookups stay indexable (production's collation is en_US.UTF-8)", () => {
  // A btree cannot answer `claim_key LIKE 'prefix%'` under a collation other than C, so such a
  // lookup scans the whole claims table, once per claim. A `C.UTF-8` development database hides it
  // (2026-10-01: about 1.7 claims a second on the VM). The supersession lookup goes by surname and
  // claim type instead, through `claims_subject_type_status_idx`.
  it.each(["src/shift.ts", "bin/derive-shift-batch.ts"])(
    "%s never looks a claim up by a key prefix",
    (file) => {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
        .replace(/\/\*[\s\S]*?\*\//gu, "")
        .replace(/\/\/.*$/gmu, "");
      expect(source).not.toMatch(/claim_key["']?\s*,\s*["']like["']/iu);
      expect(source).not.toMatch(/claim_key\s+(?:i?like|~~)\b/iu);
    },
  );
});
