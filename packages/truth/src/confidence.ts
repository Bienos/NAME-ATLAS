/**
 * The confidence rule for `CURRENT_POPULATION` (`docs/canonical/14` §29).
 *
 * §29 grants `VERIFIED` to the deterministic PESEL path **provided**:
 *
 *   1. extraction is reproducible;
 *   2. exact surname resolution is valid;
 *   3. source scope is preserved;
 *   4. no material conflict exists.
 *
 * Each proviso is checked here as an actual predicate. A withheld proviso
 * downgrades the status to one `docs/canonical/11` §12.3 permits for a
 * `FACT` — `UNCONFIRMED`, `CONFLICTING` or `INSUFFICIENT_DATA` — never to
 * `LIKELY` or `POSSIBLE`, which §12.3 says "should normally mean it is not
 * yet a FACT".
 *
 * This module imports nothing about rights and receives no rights input.
 * That is enforced by its signature, not by a comment: there is nowhere to
 * pass a `RightsProfile` in (`ARCHITECTURE.md` §10 invariant 2).
 */
import { createHash } from "node:crypto";

export type ConfidenceStatus =
  "VERIFIED" | "LIKELY" | "POSSIBLE" | "UNCONFIRMED" | "CONFLICTING" | "INSUFFICIENT_DATA";

export type EpistemicType = "FACT" | "INTERPRETATION" | "HYPOTHESIS" | "UNKNOWN";

/** The four §29 provisos, as observed facts about one derivation. */
export interface ConfidenceInputs {
  /** The derivation is deterministic and carries a method version. */
  readonly extractionReproducible: boolean;
  /** Resolution reached the surname exactly (not fuzzy, not ambiguous). */
  readonly exactResolution: boolean;
  /** The snapshot carries its own universe description and reference date. */
  readonly sourceScopePreserved: boolean;
  /** No competing ACTIVE claim and no contradicting evidence was found. */
  readonly noMaterialConflict: boolean;
}

export interface ConfidenceVerdict {
  readonly status: ConfidenceStatus;
  readonly epistemic_type: EpistemicType;
  readonly rationale: string;
  readonly human_review_required: boolean;
}

/**
 * The permitted `(epistemic_type, status)` pairs from `docs/canonical/11`
 * §12.3. Used to reject an invalid pairing before it can be stored.
 */
const VALID_COMBINATIONS: Readonly<Record<EpistemicType, readonly ConfidenceStatus[]>> = {
  FACT: ["VERIFIED", "UNCONFIRMED", "CONFLICTING", "INSUFFICIENT_DATA"],
  INTERPRETATION: ["LIKELY", "POSSIBLE", "CONFLICTING", "INSUFFICIENT_DATA", "VERIFIED"],
  HYPOTHESIS: ["LIKELY", "POSSIBLE", "UNCONFIRMED", "CONFLICTING", "INSUFFICIENT_DATA"],
  UNKNOWN: ["INSUFFICIENT_DATA"],
};

export function isValidCombination(epistemic: EpistemicType, status: ConfidenceStatus): boolean {
  return VALID_COMBINATIONS[epistemic].includes(status);
}

/**
 * Applies §29's provisos. `CURRENT_POPULATION` is a `FACT` in the canonical
 * taxonomy (`docs/canonical/11` §11) regardless of how well supported it is —
 * epistemic type describes the *kind* of proposition, confidence describes
 * how well the evidence supports it. They are independent (§12).
 */
export function assessCurrentPopulation(inputs: ConfidenceInputs): ConfidenceVerdict {
  const epistemic_type: EpistemicType = "FACT";

  if (!inputs.noMaterialConflict) {
    return {
      status: "CONFLICTING",
      epistemic_type,
      rationale:
        "A competing active claim or contradicting evidence exists for this surname and " +
        "snapshot; the value is not settled (docs/canonical/14 §29 proviso 4).",
      human_review_required: true,
    };
  }

  const missing: string[] = [];
  if (!inputs.extractionReproducible) missing.push("reproducible extraction");
  if (!inputs.exactResolution) missing.push("valid exact surname resolution");
  if (!inputs.sourceScopePreserved) missing.push("preserved source scope");

  if (missing.length > 0) {
    return {
      status: "UNCONFIRMED",
      epistemic_type,
      rationale:
        `docs/canonical/14 §29 grants VERIFIED only when every proviso holds; missing: ` +
        `${missing.join(", ")}. The value is recorded but not confirmed.`,
      human_review_required: true,
    };
  }

  return {
    status: "VERIFIED",
    epistemic_type,
    rationale:
      "Deterministic extraction from a checksum-pinned official dataset resource, reached by " +
      "exact canonical surname resolution, with the source's own universe description and " +
      "reference date preserved on the snapshot, and no competing active claim " +
      "(docs/canonical/14 §29).",
    human_review_required: false,
  };
}

/**
 * A stable hash of the evidence set supporting a claim, so an assessment can
 * be checked against the evidence it was made from (`docs/canonical/11`
 * §10.3 `evidence_set_hash`).
 *
 * Order-independent by construction: ids are sorted before hashing, so
 * reordering the same evidence yields the same hash while adding or removing
 * any item changes it.
 */
export function evidenceSetHash(evidenceItemIds: readonly string[]): string {
  const canonical = [...evidenceItemIds].sort().join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * The confidence rule for a **derived** statistic (`docs/canonical/14` §30).
 *
 * §30 frames a derived statistic as "a FACT about a deterministic
 * calculation, not a source-native fact". So the provisos differ from §29's:
 * what matters is whether the calculation was deterministic, whether its
 * inputs were complete, and whether those inputs were themselves trustworthy.
 * A perfectly reproducible computation over a partial universe is worse than
 * useless, which is why input completeness is a proviso and not an assumption.
 *
 * Like {@link assessCurrentPopulation}, this receives no rights input and
 * there is nowhere to pass one (`ARCHITECTURE.md` §10 invariant 2).
 */
export interface DerivedConfidenceInputs {
  /** The computation is deterministic and carries an algorithm version. */
  readonly computationReproducible: boolean;
  /** The universe the statistic was computed over passed the completeness gate. */
  readonly inputsComplete: boolean;
  /** Every upstream evidence item is itself VERIFIED. */
  readonly upstreamEvidenceVerified: boolean;
  /** No competing ACTIVE claim for the same proposition. */
  readonly noMaterialConflict: boolean;
}

export function assessDerivedStatistic(inputs: DerivedConfidenceInputs): ConfidenceVerdict {
  const epistemic_type: EpistemicType = "FACT";

  if (!inputs.noMaterialConflict) {
    return {
      status: "CONFLICTING",
      epistemic_type,
      rationale:
        "A competing active claim exists for this derived statistic; the value is not settled " +
        "(docs/canonical/14 §30).",
      human_review_required: true,
    };
  }

  // Incompleteness is reported separately and fails closed before this rule
  // is ever reached, so a false here means a caller bypassed the gate. Say so
  // rather than quietly downgrading, because the downgrade would publish a
  // number computed over a partial universe.
  if (!inputs.inputsComplete) {
    return {
      status: "INSUFFICIENT_DATA",
      epistemic_type,
      rationale:
        "The universe this statistic was computed over is not complete, so the statistic is " +
        "not about the population it appears to describe (docs/canonical/14 §30).",
      human_review_required: true,
    };
  }

  const missing: string[] = [];
  if (!inputs.computationReproducible) missing.push("reproducible computation");
  if (!inputs.upstreamEvidenceVerified) missing.push("verified upstream evidence");

  if (missing.length > 0) {
    return {
      status: "UNCONFIRMED",
      epistemic_type,
      rationale:
        "A derived statistic is only as good as its calculation and its inputs; missing: " +
        `${missing.join(", ")}. The value is recorded but not confirmed (docs/canonical/14 §30).`,
      human_review_required: true,
    };
  }

  return {
    status: "VERIFIED",
    epistemic_type,
    rationale:
      "Deterministic calculation carrying its algorithm version, computed over a universe " +
      "verified complete against the source registry's official checksum and row count, from " +
      "upstream evidence that is itself verified, with no competing active claim " +
      "(docs/canonical/14 §30).",
    human_review_required: false,
  };
}

/**
 * The confidence rule for an onomastic interpretation (ADR-0008 §5).
 *
 * `SURNAME_MEANING` is an `INTERPRETATION` in the canonical taxonomy
 * (`docs/canonical/11` §8), so `VERIFIED` is unreachable here by design: an
 * interpretation of a name's origin is not a measurement, and §8 expects
 * LIKELY/POSSIBLE/CONFLICTING and no more.
 *
 * The rule counts **agreeing independent works**, and nothing else. It does not
 * read a rights value (`ARCHITECTURE.md` §10 invariant 2), it does not weight a
 * work by its reliability tier — admissibility already gated that at import —
 * and it never promotes a single source to `LIKELY`, because one work is one
 * opinion however good the work is.
 */
export interface MeaningConfidenceInputs {
  /** How many admissible works support an interpretation of this surname. */
  readonly supportingWorks: number;
  /** Whether every supporting work proposes the same root and language. */
  readonly worksAgree: boolean;
}

export function assessSurnameMeaning(inputs: MeaningConfidenceInputs): ConfidenceVerdict {
  const epistemic_type: EpistemicType = "INTERPRETATION";

  if (inputs.supportingWorks <= 0) {
    // Reachable only by a caller that asked for an assessment it should not
    // have asked for: no evidence means no claim, so there is nothing to
    // assess. Returning INSUFFICIENT_DATA rather than throwing keeps the rule
    // total, and `deriveSurnameMeaning` never gets here.
    return {
      status: "INSUFFICIENT_DATA",
      epistemic_type,
      rationale:
        "no admissible onomastic work supports an interpretation of this surname; " +
        "absence of scholarship is not a meaning",
      human_review_required: false,
    };
  }

  if (inputs.supportingWorks === 1) {
    return {
      status: "POSSIBLE",
      epistemic_type,
      rationale:
        "one admissible onomastic work proposes this interpretation; a single work is a single " +
        "opinion, so the interpretation is POSSIBLE and not LIKELY",
      human_review_required: false,
    };
  }

  if (!inputs.worksAgree) {
    return {
      status: "CONFLICTING",
      epistemic_type,
      rationale:
        `${inputs.supportingWorks} admissible onomastic works propose different roots for this ` +
        "surname; both readings are retained and neither is preferred, because onomastic " +
        "disagreement is a fact about the scholarship",
      // A real disagreement between cited works is exactly what an editor
      // should look at, even though the product can already display it.
      human_review_required: true,
    };
  }

  return {
    status: "LIKELY",
    epistemic_type,
    rationale:
      `${inputs.supportingWorks} admissible onomastic works independently propose the same root ` +
      "and language for this surname",
    human_review_required: false,
  };
}

export interface GivenNameMeaningConfidenceInputs {
  /** Distinct works that state anything about the name. */
  readonly supportingWorks: number;
  /** Distinct works that state its language of origin. */
  readonly worksStatingOrigin: number;
  /** Distinct languages of origin those works state. */
  readonly distinctOrigins: number;
}

/**
 * The confidence rule for a first name's origin and meaning (TASK-147,
 * ADR-0045), ADR-0008 §5's table applied to the stated origin: one work is
 * POSSIBLE; two or more stating the same origin, and none another, LIKELY;
 * two different origins CONFLICTING. Never VERIFIED.
 */
export function assessGivenNameMeaning(
  inputs: GivenNameMeaningConfidenceInputs,
): ConfidenceVerdict {
  const epistemic_type: EpistemicType = "INTERPRETATION";
  if (inputs.supportingWorks <= 0) {
    return {
      status: "INSUFFICIENT_DATA",
      epistemic_type,
      rationale: "no admissible work states an origin or a meaning for this first name",
      human_review_required: false,
    };
  }
  if (inputs.distinctOrigins >= 2) {
    return {
      status: "CONFLICTING",
      epistemic_type,
      rationale:
        `${inputs.worksStatingOrigin} admissible works state ${inputs.distinctOrigins} different ` +
        "languages of origin for this first name; each is kept and neither is preferred",
      human_review_required: true,
    };
  }
  if (inputs.worksStatingOrigin >= 2) {
    return {
      status: "LIKELY",
      epistemic_type,
      rationale:
        `${inputs.worksStatingOrigin} admissible works independently state the same language ` +
        "of origin for this first name",
      human_review_required: false,
    };
  }
  return {
    status: "POSSIBLE",
    epistemic_type,
    rationale:
      "no two admissible works state the same language of origin for this first name; " +
      "a single work is a single opinion",
    human_review_required: false,
  };
}
