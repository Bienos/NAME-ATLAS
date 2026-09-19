import { describe, expect, it } from "vitest";
import { currentPopulationClaimKey } from "./derive.js";
import { CURRENT_POPULATION_METHOD_VERSION, CONFIDENCE_ASSESSMENT_VERSION } from "./version.js";

/**
 * Pure properties of the derivation layer (TASK-005 §11 unit item 25).
 * Synthetic identifiers only — nothing here is PESEL data.
 */
describe("claim_key (docs/canonical/11 §10.1)", () => {
  it("is deterministic for the same subject and snapshot", () => {
    const a = currentPopulationClaimKey("surname-1", "snapshot-1");
    const b = currentPopulationClaimKey("surname-1", "snapshot-1");
    expect(a).toBe(b);
  });

  it("differs per snapshot, so one surname's two PESEL resources do not collide", () => {
    expect(currentPopulationClaimKey("s", "male")).not.toBe(
      currentPopulationClaimKey("s", "female"),
    );
  });

  it("differs per surname", () => {
    expect(currentPopulationClaimKey("a", "snap")).not.toBe(currentPopulationClaimKey("b", "snap"));
  });

  it("names its claim type, so keys of different types can never collide", () => {
    expect(currentPopulationClaimKey("s", "snap").startsWith("CURRENT_POPULATION|")).toBe(true);
  });

  it("depends on no clock, uuid or environment", () => {
    // Called twice with a delay-free loop; any time- or random-derived
    // component would surface as a difference across iterations.
    const keys = new Set(Array.from({ length: 50 }, () => currentPopulationClaimKey("s", "snap")));
    expect(keys.size).toBe(1);
  });
});

describe("method versions are recorded, not implied", () => {
  it("carries a versioned derivation method", () => {
    expect(CURRENT_POPULATION_METHOD_VERSION).toMatch(/@\d+$/u);
  });

  it("carries a versioned confidence assessment", () => {
    expect(CONFIDENCE_ASSESSMENT_VERSION).toMatch(/@\d+$/u);
  });
});
