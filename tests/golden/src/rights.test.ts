import { describe, expect, it } from "vitest";
import { RIGHTS_CASES } from "./corpus/rights.js";
import { RIGHTS_FORBIDDEN } from "./forbidden-rights.js";
import { cellOf, observeRights } from "./observe-rights.js";
import { formatViolations, runForbidden } from "./run.js";

/**
 * The rights golden corpus (`docs/canonical/17` §20, §21 — Layer 11, "Absolute
 * P0").
 *
 * Pure: `evaluateSurface`, `evaluateAsset` and the §6.4 gates read a rights
 * record and nothing else, so this suite needs no database and runs everywhere.
 */
describe.each(RIGHTS_CASES.map((c) => [c.meta.case_id, c] as const))("%s", (caseId, goldenCase) => {
  const observation = observeRights(goldenCase.input);
  const expected = goldenCase.expected;

  it("sits on the expected row of the §6.3 decision matrix", () => {
    expect(observation.state).toBe(expected.state);
  });

  it("decides each surface as expected, independently", () => {
    const actual = Object.fromEntries(observation.surfaces.map((s) => [s.surface, s.decision]));
    expect(actual).toEqual(expected.surfaces);
  });

  it("decides each asset on each surface as expected", () => {
    const actual = Object.fromEntries(observation.matrix.map((c) => [cellOf(c), c.decision]));
    expect(actual).toEqual(expected.matrix);
  });

  it("answers §6.4's three named gates as expected", () => {
    expect({
      connector_executable: observation.connector_executable,
      paid_surface_eligible: observation.paid_surface_eligible,
      reproduction_eligible: observation.reproduction_eligible,
    }).toEqual({
      connector_executable: expected.connector_executable,
      paid_surface_eligible: expected.paid_surface_eligible,
      reproduction_eligible: expected.reproduction_eligible,
    });
  });

  it("publishes or withholds the OCR excerpt as expected", () => {
    const free = observation.excerpts.find((e) => e.surface === "FREE");
    expect(free?.excerpt.kind).toBe(expected.free_excerpt);
  });

  it("never carries an attribution on a blocked decision", () => {
    // Not a case-by-case expectation but a shape rule, and cheap to state
    // once: a refusal that carries a credit line invites a renderer to show
    // the credit for something it is not showing.
    for (const cell of observation.matrix) {
      if (cell.decision === "BLOCKED") expect(cell.attribution).toBeNull();
    }
  });

  it("breaks none of its forbidden rules", () => {
    const violations = runForbidden(RIGHTS_FORBIDDEN, goldenCase.forbidden, observation);
    expect(formatViolations(caseId, violations)).toBe("");
  });
});

describe("corpus-wide rights invariants", () => {
  it("applies EVERY forbidden rule to EVERY profile, not only the ones each case lists", () => {
    // `docs/canonical/17` §21's gates are absolute, so a profile that does not
    // list a rule must still satisfy it. The per-case lists say what each case
    // is *about*; this says the rules hold everywhere.
    const failures: string[] = [];
    for (const goldenCase of RIGHTS_CASES) {
      const observation = observeRights(goldenCase.input);
      const violations = runForbidden(RIGHTS_FORBIDDEN, Object.keys(RIGHTS_FORBIDDEN), observation);
      if (violations.length > 0) {
        failures.push(formatViolations(goldenCase.meta.case_id, violations));
      }
    }
    expect(failures.join("\n")).toBe("");
  });

  it("never lets a restriction widen a decision, over every profile and every restriction", () => {
    const rank = { ALLOWED: 0, ALLOWED_WITH_ATTRIBUTION: 1, LOCATOR_ONLY: 2, BLOCKED: 3 };
    const widened: string[] = [];
    for (const goldenCase of RIGHTS_CASES) {
      const o = observeRights(goldenCase.input);
      const before = new Map(o.matrix.map((c) => [cellOf(c), c.decision]));
      for (const restriction of o.restrictions) {
        for (const cell of restriction.matrix) {
          const was = before.get(cellOf(cell));
          if (was !== undefined && rank[cell.decision] < rank[was]) {
            widened.push(
              `${goldenCase.meta.case_id} + ${restriction.label}: ` +
                `${cellOf(cell)} ${was} → ${cell.decision}`,
            );
          }
        }
      }
    }
    expect(widened).toEqual([]);
  });
});
