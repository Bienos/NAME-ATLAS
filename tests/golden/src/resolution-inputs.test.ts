import { describe, expect, it } from "vitest";
import { canonicalKey, detectScripts, validateSurnameInput } from "@name-atlas/resolver";
import { RESOLUTION_CASES } from "./corpus/resolution.js";

/**
 * The half of the resolution corpus that needs no database.
 *
 * Every expectation in `corpus/resolution.ts` rests on a pure property of its
 * input — that `nowak` and `Nowak` share a canonical key, that `Luczak` and
 * `Łuczak` do not, that an en dash addresses a hyphen and a space does not,
 * that one Cyrillic letter inside a Latin word is a mixed-script review.
 * Those properties are `@name-atlas/resolver`'s normalisation, not the
 * database's, so they are asserted here and the suite runs everywhere.
 *
 * This is not a duplicate of `packages/resolver/src/normalize.test.ts`, which
 * tests the functions. This tests the **corpus**: that each case's expectation
 * is reachable at all. A case expecting `EXACT` against a display form whose
 * key differs from its input would be unsatisfiable — a test that could only
 * ever fail, written in good faith, and invisible until someone ran it with a
 * database.
 */

/** Statuses the validator produces before any matching happens. */
const VALIDATION_STATUSES = new Set([
  "EMPTY",
  "EXCEEDS_OPERATIONAL_LIMIT",
  "MALFORMED_CONTROL_CHARACTERS",
]);

function singleStatus(expected: unknown): string | null {
  return typeof expected === "string" ? expected : null;
}

describe.each(RESOLUTION_CASES.map((c) => [c.meta.case_id, c] as const))(
  "%s input properties",
  (caseId, goldenCase) => {
    const raw = goldenCase.input.raw_surname;
    const want = goldenCase.expected.resolution;
    const status = singleStatus(want.resolution_status);

    it("validates the way the case expects", () => {
      const validation = validateSurnameInput(raw);
      if (status !== null && VALIDATION_STATUSES.has(status)) {
        expect(validation.status).toBe(status);
      } else if (status === "REVIEW_REQUIRED") {
        expect(validation.status).toBe("MIXED_SCRIPT_REVIEW");
      } else {
        expect(validation.status).toBe("VALID");
      }
    });

    it("carries the script flags the case depends on", () => {
      const scripts = detectScripts(raw);
      if (status === "REVIEW_REQUIRED") {
        expect(scripts.mixed_script).toBe(true);
        expect(scripts.script_confusable_flag).toBe(true);
      } else {
        expect(scripts.mixed_script).toBe(false);
      }
    });

    it("states an expectation the canonical key can actually reach", () => {
      if (status === "EXACT") {
        // An EXACT expectation is only satisfiable when the input addresses
        // the stored display form. Asserting this here means the case cannot
        // be quietly unsatisfiable.
        expect(want.resolved_display).not.toBeNull();
        expect(canonicalKey(raw)).toBe(canonicalKey(want.resolved_display ?? ""));
      }
      if (status === "KNOWN_VARIANT") {
        // The opposite shape: the input must address the *form*, and must not
        // address the canonical entity — otherwise T0 would have matched and
        // the case would be testing something else.
        expect(want.matched_form).not.toBeNull();
        expect(canonicalKey(raw)).toBe(canonicalKey(want.matched_form ?? ""));
        expect(canonicalKey(raw)).not.toBe(canonicalKey(want.resolved_display ?? ""));
      }
      if (status === "UNKNOWN") {
        for (const [display, verb] of Object.entries(goldenCase.expected.candidate_behavior)) {
          if (verb !== "MAY_APPEAR") continue;
          // A form the case hopes to see *suggested* must not be one the input
          // already addresses — that would be an exact hit, not a suggestion.
          expect(canonicalKey(raw), `${caseId}: ${display}`).not.toBe(canonicalKey(display));
        }
      }
    });
  },
);

describe("the corpus covers the classes it claims to", () => {
  it("contains at least one case per resolution status it asserts", () => {
    const statuses = new Set(
      RESOLUTION_CASES.map((c) => singleStatus(c.expected.resolution.resolution_status)).filter(
        (s): s is string => s !== null,
      ),
    );
    // Every status the exact resolver can emit, and every validation status
    // it carries through. A corpus missing one of these has a whole branch of
    // `outcomeOf` that nothing exercises.
    expect([...statuses].sort()).toEqual([
      "EMPTY",
      "EXACT",
      "EXCEEDS_OPERATIONAL_LIMIT",
      "KNOWN_VARIANT",
      "MALFORMED_CONTROL_CHARACTERS",
      "MULTIPLE_EXACT",
      "REVIEW_REQUIRED",
      "UNKNOWN",
    ]);
  });

  it("uses more than one script", () => {
    const scripts = new Set(
      RESOLUTION_CASES.map((c) => detectScripts(c.input.raw_surname).primary_script),
    );
    expect(scripts.size).toBeGreaterThan(1);
  });
});
