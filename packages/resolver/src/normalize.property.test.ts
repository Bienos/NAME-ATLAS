import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { canonicalKey, polishDiacriticFold, toNfc } from "./normalize.js";
import { DEFAULT_MAX_INPUT_CODE_POINTS, validateSurnameInput } from "./validation.js";

/**
 * TASK-003 §8 items 9–12 — property-based (docs/canonical/17 §14).
 *
 * Kept small and non-fragile on purpose: each property is one invariant the
 * whole resolver relies on, over arbitrary Unicode up to the operational
 * limit. Item 12's database half (the lookup never throws) is covered in
 * `tests/integration/src/resolver.test.ts` against a real PostgreSQL.
 */

/** Arbitrary Unicode (any code point, surrogates excluded) within the operational limit. */
const surnameLike = fc.string({
  unit: "grapheme",
  minLength: 0,
  maxLength: DEFAULT_MAX_INPUT_CODE_POINTS,
});

/** A few real-world separators/marks mixed into otherwise-arbitrary text. */
const withSeparators = fc
  .tuple(
    surnameLike,
    fc.constantFrom("-", "\u2013", "\u2014", "'", "\u2019", " ", "\u00a0", "\u0301", "\u0308"),
    surnameLike,
  )
  .map(([a, sep, b]) => a + sep + b);

const anyInput = fc.oneof(surnameLike, withSeparators);

describe("normalisation properties", () => {
  it("P1 idempotence: canonicalKey(canonicalKey(x)) === canonicalKey(x)", () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const once = canonicalKey(input);
        expect(canonicalKey(once)).toBe(once);
      }),
      { numRuns: 500 },
    );
  });

  it("P2 NFC equivalence: NFD and NFC representations produce the same key", () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const nfc = input.normalize("NFC");
        const nfd = input.normalize("NFD");
        expect(canonicalKey(nfd)).toBe(canonicalKey(nfc));
        expect(canonicalKey(input)).toBe(canonicalKey(nfc));
      }),
      { numRuns: 500 },
    );
  });

  it("P2 (corollary): the key is itself in NFC", () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const key = canonicalKey(input);
        expect(key.normalize("NFC")).toBe(key);
      }),
      { numRuns: 200 },
    );
  });

  it("P3 display preservation: the diacritic fold never mutates its input or the NFC display form", () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const before = input;
        const display = toNfc(input);
        polishDiacriticFold(input);
        // Strings are immutable in JS; the point is that the fold returns a
        // new value and the caller's display/raw values are what they were.
        expect(input).toBe(before);
        expect(toNfc(input)).toBe(display);
      }),
      { numRuns: 200 },
    );
  });

  it("P4 no crash (pure half): validation and key derivation return a typed result for any input", () => {
    const statuses = new Set([
      "VALID",
      "EMPTY",
      "EXCEEDS_OPERATIONAL_LIMIT",
      "MALFORMED_CONTROL_CHARACTERS",
      "MIXED_SCRIPT_REVIEW",
    ]);
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 600 }), (input) => {
        const validation = validateSurnameInput(input);
        expect(statuses.has(validation.status)).toBe(true);
        expect(typeof canonicalKey(input)).toBe("string");
      }),
      { numRuns: 500 },
    );
  });

  it("raw input is never what the key is: normalisation produces a new value and leaves the input alone", () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const snapshot = `${input}`;
        canonicalKey(input);
        validateSurnameInput(input);
        expect(input).toBe(snapshot);
      }),
      { numRuns: 200 },
    );
  });
});
