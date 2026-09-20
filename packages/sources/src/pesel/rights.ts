/**
 * The rights hard gate (TASK-004 AC-08; docs/canonical/12 §6.4;
 * ARCHITECTURE.md §10 invariant 13).
 *
 * Pure, so it can run before a file is opened or a database connection is
 * made, and so the same rule can be applied to both the registry entry about
 * to be seeded and the profile already stored in the database. Rights never
 * change a factual confidence — they decide whether a connector may execute
 * at all (ARCHITECTURE.md §5, §6).
 */
import { PeselImportError } from "./errors.js";
import type { RightsPermission, RightsReviewStatus } from "./registry.js";

/** The dimensions the gate reads. Anything wider is not this gate's business. */
export interface IngestionRights {
  readonly automated_access: RightsPermission;
  readonly review_status: RightsReviewStatus;
}

export interface RightsGateVerdict {
  readonly allowed: boolean;
  /** Set when `allowed` is false: which dimension refused, and why. */
  readonly refusal: string | null;
}

/**
 * Decides whether an automated connector may execute.
 *
 * Refuses on exactly the two conditions docs/canonical/12 §6.4 and
 * TASK-004 AC-08 name, and on nothing else. In particular
 * `review_status = LEGAL_REVIEW_REQUIRED` does NOT refuse: internal
 * ingestion is not a production surface, and blocking it would confuse
 * "a human has not reviewed the terms" with "the terms forbid this".
 * `commercial_use` is likewise not read here — it gates paid-surface
 * eligibility, which this task does not produce.
 */
export function evaluateRightsGate(rights: IngestionRights): RightsGateVerdict {
  if (rights.automated_access === "PROHIBITED") {
    return {
      allowed: false,
      refusal:
        "automated_access = PROHIBITED: no automated production connector may run against " +
        "this source (docs/canonical/12 §6.4)",
    };
  }
  if (rights.review_status === "BLOCKED") {
    return {
      allowed: false,
      refusal:
        "review_status = BLOCKED: connector execution is forbidden until the block is " +
        "lifted (docs/canonical/12 §5.2)",
    };
  }
  return { allowed: true, refusal: null };
}

/** Throws unless {@link evaluateRightsGate} allows the run. Writes nothing. */
export function assertIngestionAllowed(rights: IngestionRights, subject: string): void {
  const verdict = evaluateRightsGate(rights);
  if (!verdict.allowed) {
    throw new PeselImportError("rights_gate", `${subject} refused — ${verdict.refusal ?? ""}`);
  }
}
