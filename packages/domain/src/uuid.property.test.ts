import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isUuidV7, uuidv7 } from "./uuid.js";

/**
 * TASK-001 §2.10: property test proving the UUIDv7 helper produces
 * well-formed, unique, monotonically non-decreasing values — the property
 * the whole system relies on for append-mostly primary-key indexes
 * (ARCHITECTURE.md §10 invariant 12).
 */
describe("uuidv7 (property-based)", () => {
  it("every generated value is a well-formed UUIDv7", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), (count) => {
        for (let i = 0; i < count; i++) {
          expect(isUuidV7(uuidv7())).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });

  it("a batch of generated values contains no duplicates", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 500 }), (count) => {
        const values = Array.from({ length: count }, () => uuidv7());
        expect(new Set(values).size).toBe(values.length);
      }),
      { numRuns: 20 },
    );
  });

  it("a batch of generated values is monotonically non-decreasing", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 500 }), (count) => {
        const values = Array.from({ length: count }, () => uuidv7());
        const sorted = [...values].sort();
        expect(values).toEqual(sorted);
      }),
      { numRuns: 20 },
    );
  });
});
