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
