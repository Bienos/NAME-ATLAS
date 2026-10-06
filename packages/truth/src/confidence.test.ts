import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  assessCurrentPopulation,
  assessGivenNameMeaning,
  evidenceSetHash,
  isValidCombination,
} from "./confidence.js";
import type { ConfidenceInputs } from "./confidence.js";

/**
 * The confidence rule, tested in isolation (TASK-005 §11 unit items 22–23,
 * 27, 29).
 *
 * Every value here is synthetic: these are booleans describing provisos, not
 * PESEL data. The rule's behaviour over real ingested rows is proved by the
 * integration suite.
 */

const ALL_HOLD: ConfidenceInputs = {
  extractionReproducible: true,
  exactResolution: true,
  sourceScopePreserved: true,
  noMaterialConflict: true,
};

describe("docs/canonical/14 §29 provisos", () => {
  it("grants VERIFIED only when every proviso holds", () => {
    const verdict = assessCurrentPopulation(ALL_HOLD);
    expect(verdict.status).toBe("VERIFIED");
    expect(verdict.epistemic_type).toBe("FACT");
    expect(verdict.human_review_required).toBe(false);
  });

  it.each([
    ["extractionReproducible", "reproducible extraction"],
    ["exactResolution", "valid exact surname resolution"],
    ["sourceScopePreserved", "preserved source scope"],
  ] as const)("withholds VERIFIED when %s is absent", (proviso, phrase) => {
    const verdict = assessCurrentPopulation({ ...ALL_HOLD, [proviso]: false });
    expect(verdict.status).toBe("UNCONFIRMED");
    expect(verdict.rationale).toContain(phrase);
    expect(verdict.human_review_required).toBe(true);
  });

  it("reports CONFLICTING when a material conflict exists", () => {
    const verdict = assessCurrentPopulation({ ...ALL_HOLD, noMaterialConflict: false });
    expect(verdict.status).toBe("CONFLICTING");
    expect(verdict.human_review_required).toBe(true);
  });

  it("never downgrades a FACT to LIKELY or POSSIBLE", () => {
    // docs/canonical/11 §12.3: those statuses "should normally mean it is not
    // yet a FACT", so a weakly supported CURRENT_POPULATION must not use them.
    fc.assert(
      fc.property(
        fc.record({
          extractionReproducible: fc.boolean(),
          exactResolution: fc.boolean(),
          sourceScopePreserved: fc.boolean(),
          noMaterialConflict: fc.boolean(),
        }),
        (inputs) => {
          const verdict = assessCurrentPopulation(inputs);
          return (
            verdict.epistemic_type === "FACT" &&
            verdict.status !== "LIKELY" &&
            verdict.status !== "POSSIBLE" &&
            isValidCombination(verdict.epistemic_type, verdict.status)
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("always emits a non-empty rationale", () => {
    fc.assert(
      fc.property(
        fc.record({
          extractionReproducible: fc.boolean(),
          exactResolution: fc.boolean(),
          sourceScopePreserved: fc.boolean(),
          noMaterialConflict: fc.boolean(),
        }),
        (inputs) => assessCurrentPopulation(inputs).rationale.trim().length > 0,
      ),
      { numRuns: 50 },
    );
  });
});

describe("epistemic / confidence combinations (docs/canonical/11 §12.3)", () => {
  it("permits the four FACT statuses", () => {
    for (const status of ["VERIFIED", "UNCONFIRMED", "CONFLICTING", "INSUFFICIENT_DATA"] as const) {
      expect(isValidCombination("FACT", status)).toBe(true);
    }
  });

  it("rejects LIKELY and POSSIBLE for a FACT", () => {
    expect(isValidCombination("FACT", "LIKELY")).toBe(false);
    expect(isValidCombination("FACT", "POSSIBLE")).toBe(false);
  });

  it("permits only INSUFFICIENT_DATA for UNKNOWN", () => {
    expect(isValidCombination("UNKNOWN", "INSUFFICIENT_DATA")).toBe(true);
    expect(isValidCombination("UNKNOWN", "VERIFIED")).toBe(false);
  });
});

describe("evidence set hash", () => {
  it("is a lowercase hex sha256", () => {
    expect(evidenceSetHash(["a"])).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("is stable under reordering", () => {
    expect(evidenceSetHash(["b", "a", "c"])).toBe(evidenceSetHash(["a", "c", "b"]));
  });

  it("changes when the evidence set changes", () => {
    expect(evidenceSetHash(["a", "b"])).not.toBe(evidenceSetHash(["a"]));
    expect(evidenceSetHash(["a"])).not.toBe(evidenceSetHash(["b"]));
  });

  it("is order-independent for arbitrary sets", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.string({ minLength: 1 }), { maxLength: 8 }), (ids) => {
        const shuffled = [...ids].reverse();
        return evidenceSetHash(ids) === evidenceSetHash(shuffled);
      }),
      { numRuns: 100 },
    );
  });
});

describe("confidence takes no rights input", () => {
  it("has no parameter through which a rights value could reach it", () => {
    // Compile-time guarantee made explicit: ConfidenceInputs has exactly the
    // four proviso booleans. If a rights field were ever added, this test
    // would need editing — which is the point (ARCHITECTURE.md §10 inv. 2).
    const keys = Object.keys(ALL_HOLD).sort();
    expect(keys).toEqual([
      "exactResolution",
      "extractionReproducible",
      "noMaterialConflict",
      "sourceScopePreserved",
    ]);
  });
});

describe("a first name's origin and meaning (TASK-147, ADR-0045)", () => {
  const status = (supportingWorks: number, worksStatingOrigin: number, distinctOrigins: number) =>
    assessGivenNameMeaning({ supportingWorks, worksStatingOrigin, distinctOrigins }).status;

  it("is POSSIBLE from one work, LIKELY when two state one origin, CONFLICTING on two", () => {
    expect(status(1, 1, 1)).toBe("POSSIBLE");
    expect(status(1, 0, 0)).toBe("POSSIBLE");
    expect(status(2, 2, 1)).toBe("LIKELY");
    expect(status(2, 1, 1)).toBe("POSSIBLE");
    expect(status(2, 2, 2)).toBe("CONFLICTING");
    expect(status(0, 0, 0)).toBe("INSUFFICIENT_DATA");
  });

  it("is an interpretation, never VERIFIED", () => {
    fc.assert(
      fc.property(fc.nat(5), fc.nat(5), fc.nat(5), (works, stating, origins) => {
        const verdict = assessGivenNameMeaning({
          supportingWorks: works,
          worksStatingOrigin: Math.min(stating, works),
          distinctOrigins: Math.min(origins, stating, works),
        });
        expect(verdict.epistemic_type).toBe("INTERPRETATION");
        expect(verdict.status).not.toBe("VERIFIED");
        expect(isValidCombination(verdict.epistemic_type, verdict.status)).toBe(true);
      }),
    );
  });
});
