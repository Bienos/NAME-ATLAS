/**
 * Surface eligibility (`ARCHITECTURE.md` §5; `docs/canonical/12` §6.3, §6.4).
 *
 * Rights are a **surface** dimension, orthogonal to truth. Nothing in this
 * module reads a claim, an evidence item or a confidence status, and nothing
 * in `confidence.ts` reads a rights profile. That separation is the point:
 * `ARCHITECTURE.md` §10 invariant 2 says a rights restriction never lowers a
 * confidence status and a permissive licence never raises one.
 *
 * Eligibility is **computed, not stored**. A persisted
 * `SurfaceEligibilityAssessment` is `docs/canonical/14`'s unratified proposal
 * 14-I and is deliberately not built (TASK-005 §8).
 */

/** Rights dimensions this evaluation reads (`docs/canonical/11` §9.4). */
export interface EffectiveRights {
  readonly automated_access: string;
  readonly commercial_use: string;
  readonly redistribution: string;
  readonly metadata_rights: string;
  readonly review_status: string;
}

/** The surfaces `docs/canonical/12` §6.3's matrix distinguishes. */
export type Surface = "INTERNAL" | "FREE" | "PAID" | "SEO";

export type SurfaceDecision = "ALLOWED" | "CONDITIONAL" | "BLOCKED";

export interface SurfaceEligibility {
  readonly surface: Surface;
  readonly decision: SurfaceDecision;
  /** Machine-readable reason. Never consumer copy. */
  readonly reason_code: string;
}

export const SURFACES: readonly Surface[] = ["INTERNAL", "FREE", "PAID", "SEO"];

/**
 * Evaluates one surface against the effective rights profile.
 *
 * The hard gates are `docs/canonical/12` §6.4:
 *
 *   automated_access == PROHIBITED  → no automated production connector
 *   commercial_use in {UNKNOWN, PROHIBITED} → paid_surface_eligible = false
 *
 * and the row-by-row consequences are §6.3's decision matrix. For the PESEL
 * profile TASK-004 seeded (`commercial_use = UNKNOWN`) this yields the
 * "commercial permission unknown" row: paid and SEO blocked, free
 * conditional, internal research allowed.
 */
export function evaluateSurface(rights: EffectiveRights, surface: Surface): SurfaceEligibility {
  const commercialUnknownOrProhibited =
    rights.commercial_use === "UNKNOWN" || rights.commercial_use === "PROHIBITED";

  if (rights.review_status === "BLOCKED") {
    return { surface, decision: "BLOCKED", reason_code: "RIGHTS_REVIEW_BLOCKED" };
  }
  if (rights.review_status === "EXPIRED" && (surface === "PAID" || surface === "SEO")) {
    return { surface, decision: "BLOCKED", reason_code: "RIGHTS_EXPIRED" };
  }

  switch (surface) {
    case "INTERNAL":
      // Internal research use. Only an outright prohibition stops it.
      return rights.metadata_rights === "PROHIBITED"
        ? { surface, decision: "BLOCKED", reason_code: "METADATA_RIGHTS_PROHIBITED" }
        : { surface, decision: "ALLOWED", reason_code: "INTERNAL_USE" };

    case "FREE":
      if (rights.metadata_rights === "PROHIBITED") {
        return { surface, decision: "BLOCKED", reason_code: "METADATA_RIGHTS_PROHIBITED" };
      }
      // §6.3 "Commercial permission unknown" → Free UI: Conditional.
      return commercialUnknownOrProhibited
        ? { surface, decision: "CONDITIONAL", reason_code: "COMMERCIAL_USE_UNRESOLVED" }
        : { surface, decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" };

    case "PAID":
      // §6.4 hard gate. UNKNOWN is not a maybe here — it is a no.
      return commercialUnknownOrProhibited
        ? { surface, decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNRESOLVED" }
        : { surface, decision: "ALLOWED", reason_code: "COMMERCIAL_USE_ALLOWED" };

    case "SEO":
      if (commercialUnknownOrProhibited) {
        return { surface, decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNRESOLVED" };
      }
      return rights.redistribution === "ALLOWED"
        ? { surface, decision: "ALLOWED", reason_code: "REDISTRIBUTION_ALLOWED" }
        : { surface, decision: "BLOCKED", reason_code: "REDISTRIBUTION_UNRESOLVED" };
  }
}

/** Evaluates every surface in a stable order. */
export function evaluateAllSurfaces(rights: EffectiveRights): readonly SurfaceEligibility[] {
  return SURFACES.map((surface) => evaluateSurface(rights, surface));
}
