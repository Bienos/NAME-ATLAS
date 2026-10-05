import { describe, expect, it } from "vitest";
import { editionFigures, listEditions } from "./editions.js";
import type { EditionFigures, RefusedEdition } from "./editions.js";
import { ListFactsInputError } from "./histogram.js";
import { LIST_EDITIONS_METHOD_VERSION } from "../version.js";

/**
 * `list_editions@2` on a synthetic series (TASK-044 §4.3, ADR-0019): three
 * editions and a publisher duplicate of the second, recorded as a gap.
 */

const SERIES = "pesel_living_current_surname_national_female";

const edition = (resource_id: string, data_date: string, sha: string, counts: number[]) =>
  editionFigures(
    { series: SERIES, universe_note_code: null, resource_id, data_date, sha256: sha.repeat(64) },
    counts,
  );

const first = edition("22815", "2020-01-22", "a", [5, 2, 3]);
const second = edition("35279", "2021-02-02", "b", [6, 2, 3, 2]);
const last = edition("1148811", "2026-01-20", "c", [7, 4, 2, 2, 3]);

const duplicate: RefusedEdition = {
  series: SERIES,
  resource_id: "38772",
  data_date: "2022-01-27",
  sha256: "b".repeat(64),
  reason: "PUBLISHER_DUPLICATE",
  duplicate_of: "35279",
};

describe("editionFigures", () => {
  it("counts one edition's surnames, people and smallest count, from its counts alone", () => {
    expect(first).toEqual({
      series: SERIES,
      universe_note_code: null,
      resource_id: "22815",
      data_date: "2020-01-22",
      sha256: "a".repeat(64),
      row_count: 3,
      surnames: 3,
      people: 10,
      min_count: 2,
    });
  });

  it("refuses an edition with no rows or a count that is not a positive integer", () => {
    expect(() => edition("1", "2020-01-22", "a", [])).toThrow(ListFactsInputError);
    expect(() => edition("1", "2020-01-22", "a", [2, 0])).toThrow(ListFactsInputError);
    expect(() => edition("1", "2020-01-22", "a", [2, 2.5])).toThrow(ListFactsInputError);
  });
});

describe("listEditions", () => {
  it("keeps the editions in date order and records the duplicate as a gap, never a value", () => {
    const editions = listEditions(SERIES, [first, second, last], [duplicate]);
    expect(editions).toEqual({
      method_version: LIST_EDITIONS_METHOD_VERSION,
      series: SERIES,
      items: [first, second, last],
      gaps: [
        {
          data_date: "2022-01-27",
          resource_id: "38772",
          reason: "PUBLISHER_DUPLICATE",
          duplicate_of: "35279",
        },
      ],
    });
    // The gap carries no surnames and no people: nothing stands in for the missing edition.
    expect(Object.keys(editions.gaps[0]!)).not.toContain("people");
  });

  it("orders several gaps by date", () => {
    const earlier: RefusedEdition = { ...duplicate, resource_id: "30000", data_date: "2021-06-01" };
    const gaps = listEditions(SERIES, [first, second, last], [duplicate, earlier]).gaps;
    expect(gaps.map((gap) => gap.data_date)).toEqual(["2021-06-01", "2022-01-27"]);
  });

  it("refuses a series of one edition: there is nothing to compare", () => {
    expect(() => listEditions(SERIES, [last], [])).toThrow(/first and a last edition/u);
  });

  it("refuses editions out of date order, or two on one date", () => {
    expect(() => listEditions(SERIES, [second, first, last], [])).toThrow(/ascending date order/u);
    const sameDate = { ...second, data_date: first.data_date };
    expect(() => listEditions(SERIES, [first, sameDate, last], [])).toThrow(
      /ascending date order/u,
    );
  });

  it("refuses an edition of another series: one series is one list", () => {
    const male: EditionFigures = {
      ...second,
      series: "pesel_living_current_surname_national_male",
    };
    expect(() => listEditions(SERIES, [first, male, last], [])).toThrow(/not pesel_living/u);
  });

  it("takes the list's 2019 edition first, in no series and noted as described differently", () => {
    const before = editionFigures(
      {
        series: null,
        universe_note_code: "UNIVERSE_DESCRIPTION_DIFFERS",
        resource_id: "18989",
        data_date: "2019-06-30",
        sha256: "f".repeat(64),
      },
      [4, 2, 3],
    );
    const editions = listEditions(SERIES, [before, first, second, last], [duplicate]);
    expect(editions.series).toBe(SERIES);
    expect(editions.items[0]).toMatchObject({
      series: null,
      universe_note_code: "UNIVERSE_DESCRIPTION_DIFFERS",
    });

    // Anywhere but first, or without its note, an edition in no series is refused;
    // and an edition of the series carries no note.
    expect(() => listEditions(SERIES, [first, before, last], [])).toThrow(/only the first/u);
    const unnoted = { ...before, universe_note_code: null };
    expect(() => listEditions(SERIES, [unnoted, first, last], [])).toThrow(/only the first/u);
    const noted = { ...first, universe_note_code: "UNIVERSE_DESCRIPTION_DIFFERS" as const };
    expect(() => listEditions(SERIES, [noted, second, last], [])).toThrow(/only the first/u);
  });

  it("refuses two editions with one SHA-256: a publisher duplicate is not an edition", () => {
    const twin = { ...duplicate, sha256: second.sha256 };
    const asEdition = editionFigures(
      {
        series: SERIES,
        universe_note_code: null,
        resource_id: twin.resource_id,
        data_date: twin.data_date,
        sha256: twin.sha256,
      },
      [6, 2, 3, 2],
    );
    expect(() => listEditions(SERIES, [first, second, asEdition, last], [])).toThrow(
      /same SHA-256: a publisher duplicate is not an edition/u,
    );
  });

  it("refuses a refused resource whose bytes are not those of the edition it names", () => {
    for (const refused of [
      { ...duplicate, sha256: "d".repeat(64) },
      { ...duplicate, duplicate_of: "99999" },
    ]) {
      expect(() => listEditions(SERIES, [first, second, last], [refused])).toThrow(
        /not an edition with the same SHA-256/u,
      );
    }
  });

  it("refuses a refused resource on an edition's date, or of another series", () => {
    expect(() =>
      listEditions(SERIES, [first, second, last], [{ ...duplicate, data_date: last.data_date }]),
    ).toThrow(/a date with an edition/u);
    expect(() =>
      listEditions(
        SERIES,
        [first, second, last],
        [{ ...duplicate, series: "pesel_living_current_surname_national_male" }],
      ),
    ).toThrow(/is of series/u);
  });
});
