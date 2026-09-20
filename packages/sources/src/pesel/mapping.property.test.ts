import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { canonicalKey } from "@name-atlas/resolver";
import { mapPeselRow, mapPeselRows } from "./mapping.js";
import type { PeselSourceRow } from "../schema.js";

/**
 * TASK-004 §11 property items 21 and 22. Kept small, per
 * docs/canonical/17 §14.
 *
 * Arbitrary strings here are generated values, not surnames, and are never
 * presented as source data.
 */
const surnameArb = fc.string({ minLength: 1, maxLength: 40 }).filter(
  // The parser rejects a delimiter, a bare line ending or an empty value
  // long before mapping sees it, so those inputs are out of this contract.
  (value) => !value.includes(",") && !/[\r\n]/u.test(value) && value.trim().length > 0,
);
const countArb = fc.integer({ min: 2, max: 1_000_000 });

const rowArb: fc.Arbitrary<PeselSourceRow> = fc.record({
  surname: surnameArb,
  count: countArb,
});

describe("mapping properties", () => {
  it("never produces a canonical key that differs from canonicalKey(surname)", () => {
    fc.assert(
      fc.property(rowArb, (row) => {
        const mapped = mapPeselRow(row, 2);
        expect(mapped.canonicalKey).toBe(canonicalKey(row.surname));
        expect(mapped.searchKey).toBe(canonicalKey(row.surname));
      }),
      { numRuns: 300 },
    );
  });

  it("is deterministic and preserves the count exactly", () => {
    fc.assert(
      fc.property(fc.array(rowArb, { maxLength: 25 }), (rows) => {
        // Distinct canonical keys only: a repeat is schema drift by design
        // and is covered by its own unit test.
        const seen = new Set<string>();
        const distinct = rows.filter((row) => {
          const key = canonicalKey(row.surname);
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });

        const first = mapPeselRows(distinct);
        const second = mapPeselRows(distinct);
        expect(first).toEqual(second);
        expect(first.map((entry) => entry.count)).toEqual(distinct.map((row) => row.count));
        expect(first.map((entry) => entry.raw)).toEqual(distinct.map((row) => row.surname));
      }),
      { numRuns: 150 },
    );
  });
});
