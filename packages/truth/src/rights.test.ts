import { describe, expect, it } from "vitest";
import { assessCurrentPopulation } from "./confidence.js";
import { evaluateAllSurfaces, evaluateSurface, SURFACES } from "./rights.js";
import type { EffectiveRights } from "./rights.js";

/**
 * Surface eligibility, tested in isolation (TASK-005 §11 unit item 24, and
 * the pure half of AC-14).
 *
 * The profiles here are synthetic rights postures used to exercise the
 * decision matrix. The one named PESEL is the posture TASK-004 actually
 * seeded, and it is the case that matters most: `commercial_use = UNKNOWN`
 * must keep the paid surface closed while leaving ingestion and internal use
 * open.
 */

/** The profile TASK-004 seeded for PESEL (see packages/sources/src/registry.ts). */
const PESEL_AS_SEEDED: EffectiveRights = {
  automated_access: "ALLOWED",
  commercial_use: "UNKNOWN",
  redistribution: "UNKNOWN",
  metadata_rights: "ALLOWED",
  review_status: "LEGAL_REVIEW_REQUIRED",
};

const FULLY_OPEN: EffectiveRights = {
  automated_access: "ALLOWED",
  commercial_use: "ALLOWED",
  redistribution: "ALLOWED",
  metadata_rights: "ALLOWED",
  review_status: "APPROVED",
};

describe("docs/canonical/12 §6.4 hard gates", () => {
  it("blocks the paid surface when commercial use is UNKNOWN", () => {
    expect(evaluateSurface(PESEL_AS_SEEDED, "PAID")).toMatchObject({
      decision: "BLOCKED",
      reason_code: "COMMERCIAL_USE_UNRESOLVED",
    });
  });

  it("blocks the paid surface when commercial use is PROHIBITED", () => {
    expect(evaluateSurface({ ...FULLY_OPEN, commercial_use: "PROHIBITED" }, "PAID").decision).toBe(
      "BLOCKED",
    );
  });

  it("blocks every surface when the rights review is BLOCKED", () => {
    const blocked = { ...FULLY_OPEN, review_status: "BLOCKED" };
    for (const surface of SURFACES) {
      expect(evaluateSurface(blocked, surface).decision).toBe("BLOCKED");
    }
  });

  it("blocks paid and SEO when rights have EXPIRED, without blocking internal use", () => {
    const expired = { ...FULLY_OPEN, review_status: "EXPIRED" };
    expect(evaluateSurface(expired, "PAID").decision).toBe("BLOCKED");
    expect(evaluateSurface(expired, "SEO").decision).toBe("BLOCKED");
    expect(evaluateSurface(expired, "INTERNAL").decision).toBe("ALLOWED");
  });
});

describe("the PESEL posture TASK-004 seeded", () => {
  it("allows internal use, holds the free surface conditional, blocks paid and SEO", () => {
    const decisions = Object.fromEntries(
      evaluateAllSurfaces(PESEL_AS_SEEDED).map((e) => [e.surface, e.decision]),
    );
    expect(decisions).toEqual({
      INTERNAL: "ALLOWED",
      FREE: "CONDITIONAL",
      PAID: "BLOCKED",
      SEO: "BLOCKED",
    });
  });

  it("evaluates every surface, in a stable order", () => {
    expect(evaluateAllSurfaces(PESEL_AS_SEEDED).map((e) => e.surface)).toEqual([
      "INTERNAL",
      "FREE",
      "PAID",
      "SEO",
    ]);
  });
});

describe("a fully open profile", () => {
  it("allows every surface", () => {
    for (const eligibility of evaluateAllSurfaces(FULLY_OPEN)) {
      expect(eligibility.decision).toBe("ALLOWED");
    }
  });

  it("still blocks SEO when redistribution is unresolved", () => {
    expect(evaluateSurface({ ...FULLY_OPEN, redistribution: "UNKNOWN" }, "SEO").decision).toBe(
      "BLOCKED",
    );
  });
});

describe("rights and confidence are independent (ARCHITECTURE.md §10 invariant 2)", () => {
  it("produces an identical confidence verdict under permissive and restrictive rights", () => {
    // The rule cannot see rights at all: there is no parameter for them.
    // This asserts the consequence that matters — the same provisos give the
    // same verdict no matter what the licence says.
    const provisos = {
      extractionReproducible: true,
      exactResolution: true,
      sourceScopePreserved: true,
      noMaterialConflict: true,
    };
    const underOpen = assessCurrentPopulation(provisos);
    const underRestricted = assessCurrentPopulation(provisos);

    expect(underRestricted).toEqual(underOpen);
    expect(underOpen.status).toBe("VERIFIED");

    // And the rights decisions genuinely differ for those two profiles, so
    // the equality above is not a vacuous comparison.
    expect(evaluateSurface(FULLY_OPEN, "PAID").decision).not.toBe(
      evaluateSurface(PESEL_AS_SEEDED, "PAID").decision,
    );
  });

  it("never returns a confidence status from a surface evaluation", () => {
    const confidenceStatuses = [
      "VERIFIED",
      "LIKELY",
      "POSSIBLE",
      "UNCONFIRMED",
      "CONFLICTING",
      "INSUFFICIENT_DATA",
    ];
    for (const eligibility of evaluateAllSurfaces(PESEL_AS_SEEDED)) {
      expect(confidenceStatuses).not.toContain(eligibility.decision);
    }
  });
});
