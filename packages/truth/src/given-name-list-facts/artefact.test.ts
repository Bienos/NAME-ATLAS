import { describe, expect, it } from "vitest";
import { BIRTH_NAME_RESOURCES, BIRTH_NAMES_SOURCE } from "@name-atlas/sources";
import {
  GIVEN_NAME_LIST_FACTS_SCHEMA_VERSION,
  GIVEN_NAME_LIST_TOP_SIZE,
  NAMED_GIVEN_NAME_FLOOR,
  inGivenNameSelectionOrder,
} from "@name-atlas/contracts";
import { givenNameListFacts } from "./artefact.js";
import { GIVEN_NAME_LIST_FACTS_GENERATOR } from "./build.js";
import {
  GIVEN_NAME_LIST_FACTS_METHOD_VERSION,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
} from "../version.js";

/**
 * The committed artefact (TASK-178 AC-3). CI has no copy of the official
 * files, so it cannot regenerate the artefact; it checks instead that the
 * committed one parses, is pinned to the registry's resources and is
 * internally consistent.
 */

const artefact = givenNameListFacts();

describe("givenNameListFacts()", () => {
  it("parses, and names its schema, pipeline and generator", () => {
    expect(artefact.schema_version).toBe(GIVEN_NAME_LIST_FACTS_SCHEMA_VERSION);
    expect(artefact.pipeline_version).toBe(GIVEN_NAME_LIST_FACTS_METHOD_VERSION);
    expect(artefact.generated_by).toBe(GIVEN_NAME_LIST_FACTS_GENERATOR);
    expect(artefact.dataset_id).toBe(219);
    expect(artefact.source_page_url).toBe(BIRTH_NAMES_SOURCE.homepage_or_reference_url);
    expect(artefact.assessment).toEqual({
      completeness: "COMPLETE",
      confidence_status: "VERIFIED",
      confidence_method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
      confidence_version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
      free_surface: "ALLOWED",
    });
  });

  it("is pinned to every registry resource: id, SHA-256, size, rows, people, years and sexes", () => {
    expect(artefact.resources).toHaveLength(BIRTH_NAME_RESOURCES.length);
    for (const descriptor of BIRTH_NAME_RESOURCES) {
      const resource = artefact.resources.find((r) => r.resource_id === descriptor.resource_id);
      expect(resource, descriptor.resource_id).toBeDefined();
      expect(resource).toEqual({
        resource_id: descriptor.resource_id,
        sha256: descriptor.official_sha256,
        byte_size: descriptor.official_byte_size,
        row_count: descriptor.official_row_count,
        people_sum: descriptor.official_people_sum,
        years: [...descriptor.years],
        sexes: [...descriptor.sexes],
      });
    }
  });

  it("covers 2000 to the registry's last year, once per sex, the two sexes apart", () => {
    const lastYear = Math.max(...BIRTH_NAME_RESOURCES.flatMap((r) => r.years));
    expect(artefact.first_year).toBe(2000);
    expect(artefact.last_year).toBe(lastYear);
    for (const facts of [artefact.sexes.male, artefact.sexes.female]) {
      expect(facts.years.map((y) => y.birth_year)).toEqual(
        Array.from({ length: lastYear - 1999 }, (_, i) => 2000 + i),
      );
      // Each year's children add up within that one list: never across lists.
      for (const year of facts.years) {
        expect(year.children).toBeGreaterThanOrEqual(year.names * year.min_count);
        expect(year.publication_threshold).toBe(year.birth_year <= 2012 ? 5 : 2);
      }
    }
    expect(artefact.sexes.male.sex).toBe("MALE");
    expect(artefact.sexes.female.sex).toBe("FEMALE");
  });

  it("names a first name only at or above the floor, in selection order", () => {
    for (const facts of [artefact.sexes.male, artefact.sexes.female]) {
      for (const year of facts.years) {
        expect(year.top.count).toBeGreaterThanOrEqual(NAMED_GIVEN_NAME_FLOOR);
      }
      for (const ten of [facts.top_first, facts.top_last]) {
        expect(ten).toHaveLength(GIVEN_NAME_LIST_TOP_SIZE);
        expect(inGivenNameSelectionOrder(ten)).toBe(true);
        for (const name of ten) expect(name.count).toBeGreaterThanOrEqual(NAMED_GIVEN_NAME_FLOOR);
      }
      for (const run of facts.number_one) {
        expect(run.years).toBe(run.to_year - run.from_year + 1);
      }
    }
  });

  it("keeps every share within one list: at most 1, the ten's at least the top's", () => {
    for (const facts of [artefact.sexes.male, artefact.sexes.female]) {
      for (const year of facts.years) {
        expect(year.top.share).toBeLessThanOrEqual(1);
        expect(year.top10_share).toBeLessThanOrEqual(1);
        expect(year.top10_share).toBeGreaterThanOrEqual(year.top.share);
        expect(year.top_letter.share).toBeLessThanOrEqual(1);
        expect(year.ends_a_share).toBeLessThanOrEqual(1);
        expect(year.half_names).toBeLessThanOrEqual(year.names);
      }
    }
  });
});
