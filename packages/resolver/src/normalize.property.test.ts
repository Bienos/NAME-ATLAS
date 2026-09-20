import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { canonicalKey, polishDiacriticFold, simpleCaseFold, toNfc } from "./normalize.js";
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

/**
 * ADR-0005 — the fold is Unicode **simple** case folding, and this is what
 * proves it, exhaustively rather than by example.
 *
 * ECMAScript canonicalises a `u`-mode case-insensitive `RegExp` with simple
 * case folding (scf), so `/^X$/iu` answers “do X and Y share a simple-fold
 * class?” from the runtime's own Unicode data. Two directions matter, and
 * the identity model needs both:
 *
 * - **Never join what Unicode folds apart.** This is the D-013 defect: full
 *   folding put `GROẞ` and `GROSS` in one class and made 171 real
 *   surnames uningestible.
 * - **Never separate what Unicode folds together.** Otherwise the key is not
 *   caseless — `ΣΟΦΟΣ` would not match `Σοφος`, whose final sigma is
 *   the same letter.
 *
 * Exhaustive over every code point (~8s). A sample would not do: the whole
 * point of D-013 is that the defect lived in one code point nobody sampled.
 */
function everyCodePoint(): readonly string[] {
  const all: string[] = [];
  for (let value = 0; value <= 0x10ffff; value += 1) {
    if (value >= 0xd800 && value <= 0xdfff) continue; // lone surrogates
    all.push(String.fromCodePoint(value));
  }
  return all;
}

/** `/^X$/iu` with X escaped: true when the runtime folds the two together. */
function shareSimpleFoldClass(a: string, b: string): boolean {
  return new RegExp(`^${a.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")}$`, "iu").test(b);
}

/** Every code point reachable from `value` by simple upper/lower mapping. */
function caseNeighbours(value: string): readonly string[] {
  const seen = new Set([value]);
  const pending = [value];
  while (pending.length > 0) {
    const current = pending.pop() as string;
    for (const mapped of [current.toLowerCase(), current.toUpperCase()]) {
      if ([...mapped].length !== 1 || seen.has(mapped)) continue;
      seen.add(mapped);
      pending.push(mapped);
    }
  }
  return [...seen];
}

describe("simpleCaseFold agrees with the runtime's simple-fold classes (ADR-0005)", () => {
  const all = everyCodePoint();

  it("P5 never joins two code points that Unicode folds apart", () => {
    const byFold = new Map<string, string[]>();
    for (const codePoint of all) {
      const fold = simpleCaseFold(codePoint);
      const group = byFold.get(fold);
      if (group === undefined) byFold.set(fold, [codePoint]);
      else group.push(codePoint);
    }
    const joined: string[] = [];
    for (const group of byFold.values()) {
      if (group.length < 2) continue;
      const [first, ...rest] = group as [string, ...string[]];
      for (const other of rest) {
        if (!shareSimpleFoldClass(first, other)) {
          joined.push(
            `U+${first.codePointAt(0)?.toString(16)} + U+${other.codePointAt(0)?.toString(16)}`,
          );
        }
      }
    }
    expect(joined).toEqual([]);
  });

  it("P6 never separates two code points that Unicode folds together", () => {
    const separated: string[] = [];
    for (const codePoint of all) {
      for (const neighbour of caseNeighbours(codePoint)) {
        if (neighbour === codePoint) continue;
        if (
          shareSimpleFoldClass(codePoint, neighbour) &&
          simpleCaseFold(neighbour) !== simpleCaseFold(codePoint)
        ) {
          separated.push(
            `U+${codePoint.codePointAt(0)?.toString(16)} | U+${neighbour.codePointAt(0)?.toString(16)}`,
          );
        }
      }
    }
    expect(separated).toEqual([]);
  });

  it("P7 the sharp S stays apart from SS, which is the whole of D-013", () => {
    expect(shareSimpleFoldClass("\u1e9e", "ss")).toBe(false);
    expect(shareSimpleFoldClass("\u1e9e", "\u00df")).toBe(true);
    expect(canonicalKey("GRO\u1e9e")).not.toBe(canonicalKey("GROSS"));
    expect(canonicalKey("GRO\u1e9e")).toBe(canonicalKey("Gro\u00df"));
  });
});
