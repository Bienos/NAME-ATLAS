import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  PESEL_REGIONAL_MALE_2026,
  localFileName,
  sha256Hex,
} from "@name-atlas/sources";
import type { PeselResourceDescriptor } from "@name-atlas/sources";
import { ListFactsRefusedError, buildListFactsArtefact, computeListFacts } from "./build.js";
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
      const error = refusal(() => computeListFacts({ descriptor, bytes }));
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
        male: { descriptor: PESEL_NATIONAL_MALE_2026, bytes: fixture(PESEL_NATIONAL_MALE_2026) },
        female: {
          descriptor: PESEL_NATIONAL_FEMALE_2026,
          bytes: fixture(PESEL_NATIONAL_FEMALE_2026),
        },
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
    const facts = computeListFacts(list);
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

  it("carries no surname string out of the parser", () => {
    expect(JSON.stringify(computeListFacts(list))).not.toContain("SYNTH");
  });

  it("is deterministic", () => {
    expect(computeListFacts(list)).toEqual(computeListFacts(list));
  });

  it("refuses bytes whose size the registry does not pin, even with a matching checksum", () => {
    const wrongSize = { ...list.descriptor, official_byte_size: list.bytes.byteLength + 1 };
    const error = refusal(() => computeListFacts({ descriptor: wrongSize, bytes: list.bytes }));
    expect(error.reason).toBe("BYTES_NOT_OFFICIAL");
  });

  it("refuses a row count the registry does not pin", () => {
    const short = { ...list.descriptor, official_row_count: 151 };
    const error = refusal(() => computeListFacts({ descriptor: short, bytes: list.bytes }));
    expect(error.reason).toBe("UNIVERSE_INCOMPLETE");
    expect(error.message).toContain("has 150 rows where the registry pins 151");
    expect(error.message).not.toMatch(/rank/iu);
  });

  it("refuses a regional resource: a list fact is about a whole national list", () => {
    const regional = { ...list.descriptor, role: PESEL_REGIONAL_MALE_2026.role };
    const error = refusal(() => computeListFacts({ descriptor: regional, bytes: list.bytes }));
    expect(error.reason).toBe("NOT_A_NATIONAL_LIST");
  });
});

describe("buildListFactsArtefact", () => {
  const male = syntheticList(
    "national_male",
    Array.from({ length: 150 }, (_, i) => 2 + (i % 60)),
  );
  const female = syntheticList(
    "national_female",
    Array.from({ length: 160 }, (_, i) => 2 + (i % 70)),
  );

  it("places the two lists side by side, each computed on its own", () => {
    const artefact = buildListFactsArtefact({ male, female });
    expect(artefact.lists.male.partition).toBe("national_male");
    expect(artefact.lists.female.partition).toBe("national_female");
    expect(artefact.lists.male).toEqual(computeListFacts(male));
    expect(artefact.lists.female).toEqual(computeListFacts(female));
    expect(artefact.birthday_reference).toEqual({ n_half: 23, p_at_n_half: 0.507297234 });
  });

  it("records the pipeline version, apart from the schema version", () => {
    const artefact = buildListFactsArtefact({ male, female });
    expect(artefact.pipeline_version).toBe(LIST_FACTS_METHOD_VERSION);
    expect(artefact.pipeline_version).toBe("list_facts_pipeline@1");
    expect(artefact.pipeline_version).not.toBe(artefact.schema_version);
  });

  it("refuses the lists in each other's slot", () => {
    const error = refusal(() => buildListFactsArtefact({ male: female, female: male }));
    expect(error.reason).toBe("LISTS_MISMATCHED");
  });

  it("refuses lists from two reference dates", () => {
    const later = { ...female, descriptor: { ...female.descriptor, data_date: "2027-01-20" } };
    const error = refusal(() => buildListFactsArtefact({ male, female: later }));
    expect(error.reason).toBe("LISTS_MISMATCHED");
  });
});
