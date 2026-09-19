import { describe, expect, it } from "vitest";
import { currentRankClaimKey } from "./rank.js";
import { assessDerivedStatistic, isValidCombination } from "./confidence.js";
import {
  CURRENT_RANK_METHOD_VERSION,
  CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_TIES_POLICY,
} from "./version.js";

describe("currentRankClaimKey", () => {
  it("is deterministic and depends only on the surname and the source record", () => {
    const a = currentRankClaimKey("s-1", "sr-1");
    const b = currentRankClaimKey("s-1", "sr-1");
    expect(a).toBe(b);
    expect(a).toBe("CURRENT_RANK|s-1|sr-1");
  });

  it("is keyed on the source record, not the snapshot — the rank is a property of the version", () => {
    expect(currentRankClaimKey("s-1", "sr-1")).not.toBe(currentRankClaimKey("s-1", "sr-2"));
  });

  it("distinguishes surnames", () => {
    expect(currentRankClaimKey("s-1", "sr-1")).not.toBe(currentRankClaimKey("s-2", "sr-1"));
  });

  it("carries no clock, uuid or environment input", () => {
    const first = currentRankClaimKey("s-1", "sr-1");
    // Nothing time-dependent can creep in: same inputs, same key, always.
    expect(currentRankClaimKey("s-1", "sr-1")).toBe(first);
    expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe("assessDerivedStatistic", () => {
  const sound = {
    computationReproducible: true,
    inputsComplete: true,
    upstreamEvidenceVerified: true,
    noMaterialConflict: true,
  } as const;

  it("grants VERIFIED when every proviso holds", () => {
    const v = assessDerivedStatistic(sound);
    expect(v.status).toBe("VERIFIED");
    expect(v.epistemic_type).toBe("FACT");
    expect(v.human_review_required).toBe(false);
    expect(isValidCombination(v.epistemic_type, v.status)).toBe(true);
  });

  it("returns INSUFFICIENT_DATA when the universe is incomplete, never a downgraded rank", () => {
    // The gate should have refused before this rule ran. If it is reached
    // with incomplete inputs, saying so is the only honest answer.
    const v = assessDerivedStatistic({ ...sound, inputsComplete: false });
    expect(v.status).toBe("INSUFFICIENT_DATA");
    expect(v.rationale).toContain("not complete");
    expect(v.human_review_required).toBe(true);
    expect(isValidCombination(v.epistemic_type, v.status)).toBe(true);
  });

  it("returns UNCONFIRMED when the computation is not reproducible", () => {
    const v = assessDerivedStatistic({ ...sound, computationReproducible: false });
    expect(v.status).toBe("UNCONFIRMED");
    expect(v.rationale).toContain("reproducible computation");
  });

  it("returns UNCONFIRMED when upstream evidence is not verified", () => {
    const v = assessDerivedStatistic({ ...sound, upstreamEvidenceVerified: false });
    expect(v.status).toBe("UNCONFIRMED");
    expect(v.rationale).toContain("verified upstream evidence");
  });

  it("returns CONFLICTING when a competing claim exists, and checks that first", () => {
    const v = assessDerivedStatistic({
      ...sound,
      noMaterialConflict: false,
      inputsComplete: false,
    });
    expect(v.status).toBe("CONFLICTING");
  });

  it("only ever emits a status docs/canonical/11 §12.3 permits for a FACT", () => {
    const flags = [true, false];
    for (const a of flags)
      for (const b of flags)
        for (const c of flags)
          for (const d of flags) {
            const v = assessDerivedStatistic({
              computationReproducible: a,
              inputsComplete: b,
              upstreamEvidenceVerified: c,
              noMaterialConflict: d,
            });
            expect(isValidCombination(v.epistemic_type, v.status)).toBe(true);
            expect(["LIKELY", "POSSIBLE"]).not.toContain(v.status);
          }
  });

  it("takes no rights input — there is nowhere to pass one", () => {
    // ARCHITECTURE.md §10 invariant 2, enforced by the signature. If a rights
    // field were ever added to DerivedConfidenceInputs this would still
    // compile, so the real guard is the integration test that re-derives under
    // a different profile and compares the assessment byte for byte.
    const keys = Object.keys(sound);
    expect(keys).toEqual([
      "computationReproducible",
      "inputsComplete",
      "upstreamEvidenceVerified",
      "noMaterialConflict",
    ]);
  });
});

describe("rank method identity", () => {
  it("uses an assessment method distinct from the source-native rule", () => {
    // So a derived assessment and a source-native one are distinguishable in
    // the data, not only by the claim they hang from (AC-15).
    expect(RANK_CONFIDENCE_ASSESSMENT_METHOD).not.toBe(CONFIDENCE_ASSESSMENT_METHOD);
  });

  it("records a ties policy, because a rank without one is ambiguous", () => {
    expect(RANK_TIES_POLICY).toBe("COMPETITION");
  });

  it("carries a versioned algorithm identifier", () => {
    expect(CURRENT_RANK_METHOD_VERSION).toMatch(/@\d+$/);
  });
});
