import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  PESEL_REGIONAL_MALE_2026,
  PESEL_SERIES_KEYS,
  localFileName,
  sha256Hex,
} from "@name-atlas/sources";
import type { PeselRefusedResource, PeselResourceDescriptor } from "@name-atlas/sources";
import { ListFactsRefusedError, buildListFactsArtefact, computeListFacts } from "./build.js";
import type { ListInput, SeriesInput } from "./build.js";
import { LIST_FACTS_METHOD_VERSION } from "../version.js";

/**
 * The pipeline from bytes to validated list facts. The committed
 * `fixtures/pesel` files are excerpts (22 and 23 rows of 408,182 and
 * 420,082), so a list fact over them would describe an excerpt in the
 * language of a whole list. The completeness gate must refuse them, as
 * TASK-012 AC-1 requires of every derived statistic (TASK-040 AC-03).
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const fixture = (descriptor: PeselResourceDescriptor) =>
  new Uint8Array(readFileSync(path.join(repoRoot, "fixtures/pesel", localFileName(descriptor))));

/** A synthetic earlier edition of a national list, its registry entry pinning its own bytes. */
function syntheticEdition(
  role: "national_male" | "national_female",
  resource_id: string,
  data_date: string,
  rows: readonly (readonly [string, number])[],
): ListInput {
  const text = "Nazwisko aktualne,Liczba\r\n" + rows.map(([n, c]) => `${n},${c}\r\n`).join("");
  const bytes = new TextEncoder().encode(text);
  const base = role === "national_male" ? PESEL_NATIONAL_MALE_2026 : PESEL_NATIONAL_FEMALE_2026;
  return {
    descriptor: {
      ...base,
      resource_id,
      data_date,
      official_sha256: sha256Hex(bytes),
      official_byte_size: bytes.byteLength,
      official_row_count: rows.length,
    },
    bytes,
  };
}

/** A first edition, 2020-01-22, for a series whose last edition is `list`: two made-up rows. */
function seriesOf(list: ListInput, refused: readonly PeselRefusedResource[] = []): SeriesInput {
  const first = syntheticEdition(
    list.descriptor.role === "national_female" ? "national_female" : "national_male",
    list.descriptor.role === "national_female" ? "22815" : "22817",
    "2020-01-22",
    [
      ["SYNTH0000", 7],
      ["OLD0001", 2],
    ],
  );
  return { editions: [first, list], refused };
}

function refusal(run: () => unknown): ListFactsRefusedError {
  try {
    run();
  } catch (error) {
    if (error instanceof ListFactsRefusedError) return error;
    throw error;
  }
  throw new Error("expected a refusal, got a result");
}

describe("computeListFacts over the committed fixture excerpts", () => {
  for (const descriptor of [PESEL_NATIONAL_MALE_2026, PESEL_NATIONAL_FEMALE_2026]) {
    it(`refuses ${descriptor.role} at the completeness gate`, () => {
      const bytes = fixture(descriptor);
      const error = refusal(() => computeListFacts(seriesOf({ descriptor, bytes })));
      expect(error.reason).toBe("UNIVERSE_INCOMPLETE");
      expect(error.message).toContain("is not the complete published list");
      expect(error.message).toContain("not the official resource");
      expect(error.message).toContain(sha256Hex(bytes));
      // The refusal is worded for a list fact; the gate's own wording is about a rank.
      expect(error.message).not.toMatch(/rank/iu);
    });
  }

  it("refuses to build an artefact from them", () => {
    const error = refusal(() =>
      buildListFactsArtefact({
        male: seriesOf({
          descriptor: PESEL_NATIONAL_MALE_2026,
          bytes: fixture(PESEL_NATIONAL_MALE_2026),
        }),
        female: seriesOf({
          descriptor: PESEL_NATIONAL_FEMALE_2026,
          bytes: fixture(PESEL_NATIONAL_FEMALE_2026),
        }),
      }),
    );
    expect(error.reason).toBe("UNIVERSE_INCOMPLETE");
  });
});

/** A synthetic "national" resource whose registry entry pins its own bytes. */
function syntheticList(role: "national_male" | "national_female", counts: readonly number[]) {
  const text =
    "Nazwisko aktualne,Liczba\r\n" +
    counts.map((c, i) => `SYNTH${String(i).padStart(4, "0")},${c}\r\n`).join("");
  const bytes = new TextEncoder().encode(text);
  const base = role === "national_male" ? PESEL_NATIONAL_MALE_2026 : PESEL_NATIONAL_FEMALE_2026;
  const descriptor: PeselResourceDescriptor = {
    ...base,
    official_sha256: sha256Hex(bytes),
    official_byte_size: bytes.byteLength,
    official_row_count: counts.length,
  };
  return { descriptor, bytes };
}

describe("computeListFacts on a synthetic complete list", () => {
  const counts = Array.from({ length: 150 }, (_, i) => 2 + ((i * 37) % 90));
  const list = syntheticList("national_male", counts);

  it("computes facts that satisfy the contract, with lineage and assessment", () => {
    const facts = computeListFacts(seriesOf(list));
    expect(facts.partition).toBe("national_male");
    expect(facts.source).toEqual({
      dataset_id: 1681,
      external_record_id: "1148808",
      sha256: list.descriptor.official_sha256,
      row_count: 150,
      snapshot_date: "2026-01-20",
      source_page_url:
        "https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel",
    });
    expect(facts.assessment).toEqual({
      completeness: "COMPLETE",
      confidence_status: "VERIFIED",
      confidence_method: "derived_statistic_rule",
      confidence_version: "derived_confidence@1",
      free_surface: "ALLOWED",
    });
    expect(facts.summary.people).toBe(counts.reduce((a, b) => a + b, 0));
    expect(facts.collision.example_rooms.seed).toBe(20260120);
    expect(facts.crowd.example.seed).toBe(20261120);
  });

  it("carries surname strings only in ADR-0018's named selections, at or above the floor", () => {
    const facts = computeListFacts(seriesOf(list));
    const { named_top, hyphenated, change, ...rest } = facts;
    expect(JSON.stringify(rest)).not.toMatch(/synth/iu);
    // change names no surname of its own: only the keys of named_top, in its order.
    expect(change.top3_first_counts.map((entry) => entry.key)).toEqual(
      named_top.items.map((item) => item.key),
    );
    // The three largest counts: 2 + (i·37 mod 90) reaches 91 at i = 17 and 107, 90 at i = 34.
    expect(named_top.items).toEqual([
      { key: "synth0017", published: "SYNTH0017", count: 91 },
      { key: "synth0107", published: "SYNTH0107", count: 91 },
      { key: "synth0034", published: "SYNTH0034", count: 90 },
    ]);
    expect(hyphenated).toEqual({
      method_version: "list_hyphenated@1",
      surnames: 0,
      people: 0,
      top: null,
    });
  });

  it("names nothing on a list whose surnames are all below the floor", () => {
    // Counts 2…19 (1224 people, enough for the example crowd of 1000): none reaches 20.
    const small = syntheticList(
      "national_male",
      Array.from({ length: 120 }, (_, i) => 2 + (i % 18)),
    );
    const facts = computeListFacts(seriesOf(small));
    expect(facts.named_top.items).toEqual([]);
    expect(facts.change.top3_first_counts).toEqual([]);
    expect(JSON.stringify(facts)).not.toMatch(/synth/iu);
  });

  it("is deterministic", () => {
    expect(computeListFacts(seriesOf(list))).toEqual(computeListFacts(seriesOf(list)));
  });

  it("refuses bytes whose size the registry does not pin, even with a matching checksum", () => {
    const wrongSize = { ...list.descriptor, official_byte_size: list.bytes.byteLength + 1 };
    const error = refusal(() =>
      computeListFacts(seriesOf({ descriptor: wrongSize, bytes: list.bytes })),
    );
    expect(error.reason).toBe("BYTES_NOT_OFFICIAL");
  });

  it("refuses a row count the registry does not pin", () => {
    const short = { ...list.descriptor, official_row_count: 151 };
    const error = refusal(() =>
      computeListFacts(seriesOf({ descriptor: short, bytes: list.bytes })),
    );
    expect(error.reason).toBe("UNIVERSE_INCOMPLETE");
    expect(error.message).toContain("has 150 rows where the registry pins 151");
    expect(error.message).not.toMatch(/rank/iu);
  });

  it("refuses a regional resource: a list fact is about a whole national list", () => {
    const regional = { ...list.descriptor, role: PESEL_REGIONAL_MALE_2026.role };
    const error = refusal(() =>
      computeListFacts({ editions: [{ descriptor: regional, bytes: list.bytes }], refused: [] }),
    );
    expect(error.reason).toBe("NOT_A_NATIONAL_LIST");
  });
});

describe("buildListFactsArtefact", () => {
  const male = seriesOf(
    syntheticList(
      "national_male",
      Array.from({ length: 150 }, (_, i) => 2 + (i % 60)),
    ),
  );
  const female = seriesOf(
    syntheticList(
      "national_female",
      Array.from({ length: 160 }, (_, i) => 2 + (i % 70)),
    ),
  );

  it("places the two lists side by side, each computed on its own", () => {
    const artefact = buildListFactsArtefact({ male, female });
    expect(artefact.lists.male.partition).toBe("national_male");
    expect(artefact.lists.female.partition).toBe("national_female");
    expect(artefact.lists.male).toEqual(computeListFacts(male));
    expect(artefact.lists.female).toEqual(computeListFacts(female));
    expect(artefact.birthday_reference).toEqual({ n_half: 23, p_at_n_half: 0.507297234 });
  });

  it("compares the two lists' sets of keys: SYNTH0000–0149 on both, 0150–0159 female only", () => {
    const { overlap } = buildListFactsArtefact({ male, female });
    expect(overlap).toMatchObject({ male_only: 0, both: 150, female_only: 10 });
    // Male counts 2 + (i mod 60) peak at 61 for i = 59 and 119; "synth0059" comes first.
    expect(overlap.on_both_top).toEqual({
      key: "synth0059",
      male: { published: "SYNTH0059", count: 61 },
      female: { published: "SYNTH0059", count: 61 },
    });
    expect(overlap.one_list_top).toEqual({
      male: null,
      // Female counts 2 + (i mod 70) for i = 150…159: 12…21, so SYNTH0159 with 21.
      female: { key: "synth0159", published: "SYNTH0159", count: 21 },
    });
  });

  it("records the pipeline version, apart from the schema version", () => {
    const artefact = buildListFactsArtefact({ male, female });
    expect(artefact.pipeline_version).toBe(LIST_FACTS_METHOD_VERSION);
    expect(artefact.pipeline_version).toBe("list_facts_pipeline@4");
    expect(artefact.pipeline_version).not.toBe(artefact.schema_version);
  });

  it("refuses the lists in each other's slot", () => {
    const error = refusal(() => buildListFactsArtefact({ male: female, female: male }));
    expect(error.reason).toBe("LISTS_MISMATCHED");
  });

  it("refuses lists from two reference dates", () => {
    const [first, list] = female.editions;
    const later = {
      ...female,
      editions: [
        first!,
        { ...list!, descriptor: { ...list!.descriptor, data_date: "2027-01-20" } },
      ],
    };
    const error = refusal(() => buildListFactsArtefact({ male, female: later }));
    expect(error.reason).toBe("LISTS_MISMATCHED");
  });

  it("gives each list its own series: the two are never one series", () => {
    const artefact = buildListFactsArtefact({ male, female });
    expect(artefact.lists.male.editions.series).toBe(PESEL_SERIES_KEYS.national_male);
    expect(artefact.lists.female.editions.series).toBe(PESEL_SERIES_KEYS.national_female);
  });
});

/**
 * A synthetic female series (TASK-044, ADR-0019): 2020, 2021 and 2026, and a
 * resource dated 2022 that repeats the 2021 edition's bytes. The last edition
 * pads to 1100 people with FILL rows (11 each, below the floor), enough for
 * the example crowd of 1000.
 */
describe("computeListFacts over a series (ADR-0019)", () => {
  const fill = Array.from(
    { length: 100 },
    (_, i) => [`FILL${String(i).padStart(4, "0")}`, 11] as const,
  );
  const e2020 = syntheticEdition("national_female", "22815", "2020-01-22", [
    ["NOWAK", 50],
    ["KOWALSKA", 30],
    ["ŁUCZAK", 5],
    ["STARA", 2],
    ...fill,
  ]);
  const e2021 = syntheticEdition("national_female", "35279", "2021-02-02", [
    ["NOWAK", 52],
    ["KOWALSKA", 30],
    ["ŁUCZAK", 5],
    ["STARA", 2],
    ...fill,
  ]);
  const e2026 = syntheticEdition("national_female", "1148811", "2026-01-20", [
    ["NOWAK", 60],
    ["KOWALSKA", 30],
    ["LUCZAK", 25],
    ["ŁUCZAK", 4],
    ["NOWA", 2],
    ...fill,
  ]);
  const duplicate: PeselRefusedResource = {
    ...e2021.descriptor,
    role: "national_female",
    series: PESEL_SERIES_KEYS.national_female,
    resource_id: "38772",
    data_date: "2022-01-27",
    reason: "PUBLISHER_DUPLICATE",
    duplicate_of: "35279",
    notes: "synthetic",
  };
  const series: SeriesInput = { editions: [e2020, e2021, e2026], refused: [duplicate] };

  it("states every edition, and the duplicate as a gap with its reason", () => {
    const { editions } = computeListFacts(series);
    expect(editions.series).toBe(PESEL_SERIES_KEYS.national_female);
    expect(editions.items.map((e) => [e.resource_id, e.data_date, e.surnames, e.people])).toEqual([
      ["22815", "2020-01-22", 104, 1187],
      ["35279", "2021-02-02", 104, 1189],
      ["1148811", "2026-01-20", 105, 1221],
    ]);
    expect(editions.items.map((e) => e.sha256)).toEqual([
      e2020.descriptor.official_sha256,
      e2021.descriptor.official_sha256,
      e2026.descriptor.official_sha256,
    ]);
    expect(editions.gaps).toEqual([
      {
        data_date: "2022-01-27",
        resource_id: "38772",
        reason: "PUBLISHER_DUPLICATE",
        duplicate_of: "35279",
      },
    ]);
  });

  it("compares the first edition with the last by exact key, a surname absent being null", () => {
    const { change, named_top } = computeListFacts(series);
    expect(named_top.items.map((item) => item.published)).toEqual(["NOWAK", "KOWALSKA", "LUCZAK"]);
    expect(change).toMatchObject({
      first_data_date: "2020-01-22",
      last_data_date: "2026-01-20",
      surnames_delta: 1,
      people_delta: 34,
      // LUCZAK and NOWA are new; ŁUCZAK is another surname, on both; STARA is gone.
      on_last_not_first: { surnames: 2, people: 27 },
      on_first_not_last: { surnames: 1, people_on_first: 2 },
      top3_first_counts: [
        { key: "nowak", count_first: 50 },
        { key: "kowalska", count_first: 30 },
        { key: "luczak", count_first: null },
      ],
      top10_unchanged: false,
    });
  });

  it("refuses the duplicate as an edition", () => {
    const asEdition: ListInput = {
      bytes: e2021.bytes,
      descriptor: { ...e2021.descriptor, resource_id: "38772", data_date: "2022-01-27" },
    };
    const error = refusal(() =>
      computeListFacts({ editions: [e2020, e2021, asEdition, e2026], refused: [] }),
    );
    expect(error.reason).toBe("DUPLICATE_EDITION");
    expect(error.message).toContain("38772");
    expect(error.message).toContain("35279");
  });

  it("refuses an edition on another publication floor (ADR-0019 §1)", () => {
    const higher = syntheticEdition("national_female", "35279", "2021-02-02", [
      ["NOWAK", 52],
      ["KOWALSKA", 30],
      ["ŁUCZAK", 5],
      ...fill,
    ]);
    const error = refusal(() =>
      computeListFacts({ editions: [e2020, higher, e2026], refused: [] }),
    );
    expect(error.reason).toBe("FLOOR_MISMATCHED");
    expect(error.message).toContain("35279");
  });

  it("gates every edition, not only the last", () => {
    const tampered: ListInput = {
      ...e2021,
      descriptor: { ...e2021.descriptor, official_row_count: 105 },
    };
    const error = refusal(() =>
      computeListFacts({ editions: [e2020, tampered, e2026], refused: [] }),
    );
    expect(error.reason).toBe("UNIVERSE_INCOMPLETE");
    expect(error.message).toContain("35279");
  });

  it("refuses an edition of the other list or of no series, and a series of one edition", () => {
    const male = syntheticEdition("national_male", "28052", "2021-02-01", [["NOWAK", 9]]);
    expect(
      refusal(() => computeListFacts({ editions: [e2020, male, e2026], refused: [] })).reason,
    ).toBe("SERIES_MISMATCHED");
    const noSeries: ListInput = { ...e2021, descriptor: { ...e2021.descriptor, series: null } };
    expect(
      refusal(() => computeListFacts({ editions: [e2020, noSeries, e2026], refused: [] })).reason,
    ).toBe("SERIES_MISMATCHED");
    expect(refusal(() => computeListFacts({ editions: [e2026], refused: [] })).reason).toBe(
      "SERIES_MISMATCHED",
    );
  });

  it("reads the list's 2019 edition first, with its own header, in no series (TASK-106)", () => {
    const rows = [["NOWAK", 49], ["KOWALSKA", 30], ["STARA", 2], ...fill] as const;
    const text = "nazwisko,liczba\r\n" + rows.map(([n, c]) => `${n},${c}\r\n`).join("");
    const bytes = new TextEncoder().encode(text);
    const e2019: ListInput = {
      bytes,
      descriptor: {
        ...e2020.descriptor,
        resource_id: "18989",
        data_date: "2019-06-30",
        official_sha256: sha256Hex(bytes),
        official_byte_size: bytes.byteLength,
        official_row_count: rows.length,
        series: null,
        header: "nazwisko,liczba",
        universe_note_code: "UNIVERSE_DESCRIPTION_DIFFERS",
      },
    };
    const facts = computeListFacts({ ...series, editions: [e2019, e2020, e2021, e2026] });
    expect(facts.editions.items[0]).toMatchObject({
      series: null,
      universe_note_code: "UNIVERSE_DESCRIPTION_DIFFERS",
      resource_id: "18989",
      people: 1181,
    });
    expect(facts.editions.items.slice(1).every((e) => e.universe_note_code === null)).toBe(true);
    expect(facts.change.first_data_date).toBe("2019-06-30");

    // Not first, or without the registry's note, it is no edition of the list.
    expect(
      refusal(() => computeListFacts({ editions: [e2020, e2019, e2026], refused: [] })).reason,
    ).toBe("SERIES_MISMATCHED");
    const unnoted: ListInput = {
      ...e2019,
      descriptor: { ...e2019.descriptor, universe_note_code: undefined },
    };
    expect(
      refusal(() => computeListFacts({ editions: [unnoted, e2020, e2026], refused: [] })).reason,
    ).toBe("SERIES_MISMATCHED");
    // Its header is the registry's word for it: the later header does not parse as it.
    const relabelled: ListInput = {
      ...e2020,
      descriptor: { ...e2020.descriptor, header: "nazwisko,liczba" },
    };
    expect(() => computeListFacts({ editions: [relabelled, e2026], refused: [] })).toThrow(
      /unexpected header|expected header/u,
    );
  });

  it("refuses editions out of date order, and a refused resource that is no byte-identical twin", () => {
    expect(() => computeListFacts({ editions: [e2021, e2020, e2026], refused: [] })).toThrow(
      /ascending date order/u,
    );
    const notATwin = { ...duplicate, official_sha256: "0".repeat(64) };
    expect(() => computeListFacts({ ...series, refused: [notATwin] })).toThrow(
      /not an edition with the same SHA-256/u,
    );
  });
});
