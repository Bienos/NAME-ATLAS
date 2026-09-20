import { describe, expect, it } from "vitest";
import {
  compareCandidates,
  FUZZY_LENGTH_BANDS,
  FUZZY_TIER,
  MIN_FUZZY_INPUT_LENGTH,
  RERANKED_CAP,
  SHORTLIST_CAP,
  thresholdForLength,
} from "./candidates.js";
import type { SearchCandidate } from "./candidates.js";

/** The pure half of TASK-015: the length policy and the ranking. No database. */

function candidate(
  form: string,
  editDistance: number,
  trigram: number,
  transposed: boolean,
): SearchCandidate {
  return {
    input_form: "cichwoski",
    generated_form: form,
    candidate_surname_id: "00000000-0000-0000-0000-000000000000",
    candidate_canonical_display: form,
    method: "FUZZY",
    method_version: "resolver_fuzzy_v1",
    tier: FUZZY_TIER,
    features: {
      exact_canonical: false,
      exact_known_form: false,
      trigram_similarity: trigram,
      edit_distance: editDistance,
      transposition_detected: transposed,
      same_primary_script: true,
    },
    explanation_codes: [],
    retrieval_rank_score: 0,
    search_only: true,
  };
}

describe("thresholdForLength (docs/canonical/13 §21)", () => {
  it("runs no fuzzy retrieval below the measured minimum", () => {
    expect(MIN_FUZZY_INPUT_LENGTH).toBe(6);
    for (const length of [0, 1, 2, 3, 4, 5]) {
      expect(thresholdForLength(length)).toBeNull();
    }
  });

  it("rises with length, because similarity after one edit rises with length", () => {
    // Measured: one transposition leaves similarity 0.273 at six characters and
    // 0.467 at ten, so one global threshold cannot serve both.
    expect(thresholdForLength(6)).toBe(0.25);
    expect(thresholdForLength(8)).toBe(0.25);
    expect(thresholdForLength(9)).toBe(0.4);
    expect(thresholdForLength(11)).toBe(0.4);
    expect(thresholdForLength(12)).toBe(0.5);
    expect(thresholdForLength(57)).toBe(0.5);
  });

  it("covers every length from the minimum upward with no gap", () => {
    for (let length = MIN_FUZZY_INPUT_LENGTH; length <= 60; length += 1) {
      expect(thresholdForLength(length)).not.toBeNull();
    }
  });

  it("carries the measurement that set each band, so a change is reviewable", () => {
    expect(FUZZY_LENGTH_BANDS.length).toBeGreaterThan(0);
    for (const band of FUZZY_LENGTH_BANDS) {
      expect(band.measuredFirstPlace).toMatch(/^\d+\/\d+$/u);
      expect(band.measuredTranspositionRecovery).toMatch(/^\d+\/\d+$/u);
      expect(band.similarityThreshold).toBeGreaterThan(0);
      expect(band.similarityThreshold).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the canonical caps", () => {
    expect(SHORTLIST_CAP).toBe(25);
    expect(RERANKED_CAP).toBe(10);
  });
});

describe("compareCandidates (docs/canonical/13 §25.1)", () => {
  it("puts the smaller edit distance first, whatever the trigram score", () => {
    const near = candidate("CICHOWSKI", 1, 0.429, false);
    const far = candidate("CICHOSKI", 2, 0.583, false);
    expect([far, near].sort(compareCandidates)[0]).toBe(near);
  });

  it("prefers a detected transposition at equal distance — the measured rule", () => {
    // CICHWOSKI is one edit from both. Trigram prefers CICHOSKI (0.583 against
    // 0.429) and is wrong. This rule moved transposition recovery from 8 of 25
    // to 25 of 25 at nine to eleven characters.
    const transposed = candidate("CICHOWSKI", 1, 0.429, true);
    const deleted = candidate("CICHOSKI", 1, 0.583, false);
    expect([deleted, transposed].sort(compareCandidates)[0]).toBe(transposed);
  });

  it("falls back to trigram similarity, then to the form, never to popularity", () => {
    const higher = candidate("WISNIEWSKI", 1, 0.692, false);
    const lower = candidate("WISZNIEWSKI", 1, 0.438, false);
    expect([lower, higher].sort(compareCandidates)[0]).toBe(higher);

    // Identical on every feature: the tie breaks on the form, deterministically.
    const a = candidate("WISNIEWSKA", 1, 0.692, false);
    const b = candidate("WISNIEWSKI", 1, 0.692, false);
    expect([b, a].sort(compareCandidates).map((c) => c.generated_form)).toEqual([
      "WISNIEWSKA",
      "WISNIEWSKI",
    ]);
  });

  it("is a total order: sorting is stable and independent of input order", () => {
    const items = [
      candidate("CICHOSKI", 1, 0.583, false),
      candidate("CICHOWSKI", 1, 0.429, true),
      candidate("CICHALSKI", 2, 0.429, false),
      candidate("CICHARSKI", 2, 0.429, false),
    ];
    const forward = [...items].sort(compareCandidates).map((c) => c.generated_form);
    const backward = [...items]
      .reverse()
      .sort(compareCandidates)
      .map((c) => c.generated_form);
    expect(forward).toEqual(backward);
    expect(forward[0]).toBe("CICHOWSKI");
  });
});
