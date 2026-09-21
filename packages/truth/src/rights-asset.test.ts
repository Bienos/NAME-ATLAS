import { describe, expect, it } from "vitest";
import {
  ASSET_KINDS,
  asPermission,
  attributionFor,
  classifyRightsState,
  completeRights,
  connectorExecutable,
  evaluateAsset,
  evaluateRightsMatrix,
  evaluateSurface,
  excerptTranscription,
  mostRestrictive,
  paidSurfaceEligible,
  reproductionEligible,
  resolveEffectiveRights,
  SURFACES,
  TRANSCRIPTION_EXCERPT_MAX_CHARS,
} from "./rights.js";
import type { FullRights, RightsLayer } from "./rights.js";

/**
 * TASK-021 / ADR-0007 — rights per asset kind and surface, resolving D-003.
 *
 * The postures below are synthetic. They are shaped to exercise the eight rows
 * of `docs/canonical/12` §6.3 and the three hard gates of §6.4, and none of
 * them asserts anything about what Polona's actual terms say.
 */

const OPEN: RightsLayer = {
  metadata_rights: "ALLOWED",
  transcription_rights: "ALLOWED",
  image_rights: "ALLOWED",
  database_rights: "ALLOWED",
  automated_access: "ALLOWED",
  commercial_use: "ALLOWED",
  redistribution: "ALLOWED",
  review_status: "APPROVED",
  attribution_required: false,
};

/** §6.3 row 3, and the shape a public-domain-metadata Polona object takes. */
const METADATA_OPEN_IMAGE_RESTRICTED: RightsLayer = {
  ...OPEN,
  image_rights: "PROHIBITED",
  transcription_rights: "PROHIBITED",
};

const fully = (layer: RightsLayer): FullRights => completeRights(layer);

describe("AC-1: the metadata row reproduces evaluateSurface exactly", () => {
  const postures: readonly RightsLayer[] = [
    OPEN,
    METADATA_OPEN_IMAGE_RESTRICTED,
    // The PESEL posture TASK-004 seeded, which must not move under this change.
    {
      ...OPEN,
      commercial_use: "UNKNOWN",
      redistribution: "UNKNOWN",
      review_status: "LEGAL_REVIEW_REQUIRED",
    },
    { ...OPEN, metadata_rights: "PROHIBITED" },
    { ...OPEN, review_status: "BLOCKED" },
    { ...OPEN, review_status: "EXPIRED" },
    { ...OPEN, commercial_use: "PROHIBITED" },
    {},
  ];

  it.each(postures.map((p, i) => [i, p] as const))(
    "posture %i agrees on every surface",
    (_i, posture) => {
      const rights = fully(posture);
      for (const surface of SURFACES) {
        const legacy = evaluateSurface(rights, surface);
        const asset = evaluateAsset(rights, "METADATA", surface);
        if (legacy.decision === "BLOCKED") {
          expect(asset.decision).toBe("BLOCKED");
        } else if (legacy.decision === "ALLOWED") {
          expect(["ALLOWED", "ALLOWED_WITH_ATTRIBUTION"]).toContain(asset.decision);
        } else {
          // CONDITIONAL is not a permission to publish; it is not a refusal
          // either. It carries through as LOCATOR_ONLY.
          expect(asset.decision).toBe("LOCATOR_ONLY");
        }
        expect(asset.reason_code).toBe(legacy.reason_code);
      }
    },
  );
});

describe("AC-2: the three permissions are independent (§16.4)", () => {
  const rights = fully(METADATA_OPEN_IMAGE_RESTRICTED);

  it("publishes metadata while refusing to reproduce the scan", () => {
    expect(evaluateAsset(rights, "METADATA", "FREE").decision).toBe("ALLOWED");
    expect(evaluateAsset(rights, "IMAGE", "FREE").decision).toBe("LOCATOR_ONLY");
    expect(evaluateAsset(rights, "TRANSCRIPTION", "FREE").decision).toBe("BLOCKED");
  });

  it("does not name the object at all when its metadata is not publishable", () => {
    const blocked = fully({ ...METADATA_OPEN_IMAGE_RESTRICTED, metadata_rights: "PROHIBITED" });
    expect(evaluateAsset(blocked, "IMAGE", "FREE")).toMatchObject({
      decision: "BLOCKED",
      reason_code: "METADATA_NOT_PUBLISHABLE",
    });
  });

  it("covers every asset and surface in the matrix", () => {
    const matrix = evaluateRightsMatrix(rights);
    expect(matrix).toHaveLength(ASSET_KINDS.length * SURFACES.length);
    expect(new Set(matrix.map((e) => `${e.asset}:${e.surface}`)).size).toBe(matrix.length);
  });
});

describe("AC-3: UNKNOWN fails closed on every public surface", () => {
  const unknown = fully({ ...OPEN, transcription_rights: "UNKNOWN", image_rights: "UNKNOWN" });

  it.each(["FREE", "PAID", "SEO"] as const)("on %s", (surface) => {
    expect(evaluateAsset(unknown, "TRANSCRIPTION", surface).decision).toBe("BLOCKED");
    // An image never becomes a reproduction on an UNKNOWN; a locator is the
    // most it can be, and only because the metadata here is open.
    expect(evaluateAsset(unknown, "IMAGE", surface).decision).toBe("LOCATOR_ONLY");
    expect(reproductionEligible(unknown)).toBe(false);
  });

  it("still allows internal research, so the rights question stays answerable", () => {
    expect(evaluateAsset(unknown, "TRANSCRIPTION", "INTERNAL").decision).toBe("ALLOWED");
    expect(evaluateAsset(unknown, "IMAGE", "INTERNAL").decision).toBe("ALLOWED");
  });

  it("reads an unparseable stored value as UNKNOWN, never as ALLOWED", () => {
    expect(asPermission("allowed")).toBe("UNKNOWN");
    expect(asPermission("")).toBe("UNKNOWN");
    expect(asPermission(null)).toBe("UNKNOWN");
    expect(asPermission(undefined)).toBe("UNKNOWN");
    expect(asPermission("ALLOWED")).toBe("ALLOWED");
  });
});

describe("AC-4: §6.1 precedence — a child may only tighten", () => {
  it("applies a more restrictive child", () => {
    const resolved = resolveEffectiveRights(OPEN, { image_rights: "PROHIBITED" });
    expect(resolved.image_rights).toBe("PROHIBITED");
    expect(resolved.metadata_rights).toBe("ALLOWED");
  });

  it("ignores a more permissive child", () => {
    const restricted: RightsLayer = { ...OPEN, image_rights: "PROHIBITED" };
    const resolved = resolveEffectiveRights(restricted, { image_rights: "ALLOWED" });
    expect(resolved.image_rights).toBe("PROHIBITED");
  });

  it("leaves a dimension the child does not state alone", () => {
    const resolved = resolveEffectiveRights(OPEN, { image_rights: "CONDITIONAL" });
    expect(resolved.transcription_rights).toBe("ALLOWED");
    expect(resolved.commercial_use).toBe("ALLOWED");
  });

  it("folds three layers in order, most restrictive winning", () => {
    const resolved = resolveEffectiveRights(
      OPEN,
      { image_rights: "CONDITIONAL" },
      { image_rights: "PROHIBITED", transcription_rights: "CONDITIONAL" },
    );
    expect(resolved.image_rights).toBe("PROHIBITED");
    expect(resolved.transcription_rights).toBe("CONDITIONAL");
  });

  it("never lets a child clear an attribution obligation", () => {
    const resolved = resolveEffectiveRights(
      { ...OPEN, attribution_required: true, attribution_text: "Source X" },
      { attribution_required: false },
    );
    expect(resolved.attribution_required).toBe(true);
  });

  it("escalates review status but never relaxes it", () => {
    expect(resolveEffectiveRights(OPEN, { review_status: "BLOCKED" }).review_status).toBe(
      "BLOCKED",
    );
    expect(
      resolveEffectiveRights({ ...OPEN, review_status: "BLOCKED" }, { review_status: "APPROVED" })
        .review_status,
    ).toBe("BLOCKED");
  });

  it("orders permissions ALLOWED < CONDITIONAL < UNKNOWN < PROHIBITED", () => {
    expect(mostRestrictive("ALLOWED", "CONDITIONAL")).toBe("CONDITIONAL");
    expect(mostRestrictive("CONDITIONAL", "UNKNOWN")).toBe("UNKNOWN");
    expect(mostRestrictive("UNKNOWN", "PROHIBITED")).toBe("PROHIBITED");
    expect(mostRestrictive("PROHIBITED", "ALLOWED")).toBe("PROHIBITED");
  });
});

describe("AC-5: §6.4's hard gates, taken literally", () => {
  it("refuses reproduction for every image permission that is not ALLOWED", () => {
    for (const value of ["CONDITIONAL", "UNKNOWN", "PROHIBITED"] as const) {
      expect(reproductionEligible(fully({ ...OPEN, image_rights: value }))).toBe(false);
    }
    expect(reproductionEligible(fully(OPEN))).toBe(true);
  });

  it("stops the connector when automated access is prohibited", () => {
    expect(connectorExecutable(fully({ ...OPEN, automated_access: "PROHIBITED" }))).toBe(false);
    expect(connectorExecutable(fully({ ...OPEN, review_status: "BLOCKED" }))).toBe(false);
    expect(connectorExecutable(fully(OPEN))).toBe(true);
  });

  it("closes the paid surface on UNKNOWN as firmly as on PROHIBITED", () => {
    expect(paidSurfaceEligible(fully({ ...OPEN, commercial_use: "UNKNOWN" }))).toBe(false);
    expect(paidSurfaceEligible(fully({ ...OPEN, commercial_use: "PROHIBITED" }))).toBe(false);
    expect(paidSurfaceEligible(fully(OPEN))).toBe(true);
  });
});

describe("AC-6: the OCR excerpt policy (ADR-0007 §2)", () => {
  const long = "Kowalski ".repeat(80);

  it("refuses an excerpt without an explicit transcription permission", () => {
    for (const value of ["CONDITIONAL", "UNKNOWN", "PROHIBITED"] as const) {
      expect(excerptTranscription(long, fully({ ...OPEN, transcription_rights: value }))).toEqual({
        kind: "OMITTED",
        reason_code: expect.stringContaining("TRANSCRIPTION_RIGHTS_"),
      });
    }
  });

  it("caps the excerpt and reports the truncation rather than hiding it", () => {
    const result = excerptTranscription(long, fully(OPEN));
    expect(result.kind).toBe("EXCERPT");
    if (result.kind !== "EXCERPT") throw new Error("unreachable");
    expect(Array.from(result.text).length).toBeLessThanOrEqual(TRANSCRIPTION_EXCERPT_MAX_CHARS);
    expect(result.truncated).toBe(true);
  });

  it("returns a short text whole, and does not claim it was truncated", () => {
    expect(excerptTranscription("Jan Kowalski, rolnik", fully(OPEN))).toEqual({
      kind: "EXCERPT",
      text: "Jan Kowalski, rolnik",
      truncated: false,
    });
  });

  it("counts code points, so a combining mark is not cut in half", () => {
    // U+0141 written as L + combining stroke: two code points, one grapheme.
    const text = "L̵".repeat(400);
    const result = excerptTranscription(text, fully(OPEN));
    if (result.kind !== "EXCERPT") throw new Error("unreachable");
    expect(Array.from(result.text).length).toBeLessThanOrEqual(TRANSCRIPTION_EXCERPT_MAX_CHARS);
  });
});

describe("AC-7: attribution is an obligation, not a decoration", () => {
  it("marks an allowed asset as requiring attribution and carries the text", () => {
    const rights = fully({
      ...OPEN,
      attribution_required: true,
      attribution_text: "Biblioteka Narodowa / Polona",
    });
    expect(evaluateAsset(rights, "IMAGE", "FREE")).toMatchObject({
      decision: "ALLOWED_WITH_ATTRIBUTION",
      attribution: "Biblioteka Narodowa / Polona",
    });
  });

  it("blocks when attribution is required and none can be built", () => {
    const rights = fully({ ...OPEN, attribution_required: true });
    expect(evaluateAsset(rights, "IMAGE", "FREE")).toMatchObject({
      decision: "BLOCKED",
      reason_code: "ATTRIBUTION_REQUIRED_BUT_UNAVAILABLE",
    });
  });

  it("composes a line from the owner and rights URL when no text is stored", () => {
    expect(
      attributionFor(fully({ ...OPEN, source_owner: "Owner", rights_url: "https://example.org" })),
    ).toBe("Owner — https://example.org");
    expect(attributionFor(fully({ ...OPEN, source_owner: "Owner" }))).toBe("Owner");
    expect(attributionFor(fully(OPEN))).toBeNull();
  });

  it("never attaches attribution to an internal decision", () => {
    const rights = fully({ ...OPEN, attribution_required: true, attribution_text: "X" });
    expect(evaluateAsset(rights, "IMAGE", "INTERNAL").attribution).toBeNull();
  });
});

describe("AC-8: every row of §6.3's matrix is reachable", () => {
  const cases: readonly (readonly [string, RightsLayer])[] = [
    ["FULLY_OPEN", OPEN],
    ["ATTRIBUTION_REQUIRED", { ...OPEN, attribution_required: true }],
    ["METADATA_OPEN_IMAGE_RESTRICTED", METADATA_OPEN_IMAGE_RESTRICTED],
    ["NON_COMMERCIAL_ONLY", { ...OPEN, commercial_use: "PROHIBITED" }],
    ["COMMERCIAL_UNKNOWN", { ...OPEN, commercial_use: "UNKNOWN" }],
    ["PARTNERSHIP_REQUIRED", { ...OPEN, review_status: "BLOCKED" }],
    ["AUTOMATED_ACCESS_PROHIBITED", { ...OPEN, automated_access: "PROHIBITED" }],
    ["RIGHTS_EXPIRED", { ...OPEN, review_status: "EXPIRED" }],
  ];

  it.each(cases)("classifies %s", (expected, layer) => {
    expect(classifyRightsState(fully(layer))).toBe(expected);
  });

  it("classifies an empty profile as commercially unknown, not as open", () => {
    expect(classifyRightsState(completeRights({}))).toBe("COMMERCIAL_UNKNOWN");
  });
});

describe("a partnership-required source is closed on every public surface", () => {
  // This is the posture an IJP PAN profile would carry before a licence: the
  // gate that makes D-002's Path A safe to wait for (ADR-0008).
  const partner = fully({ ...OPEN, review_status: "BLOCKED" });

  it("blocks every asset everywhere except internal research", () => {
    for (const asset of ASSET_KINDS) {
      for (const surface of ["FREE", "PAID", "SEO"] as const) {
        expect(evaluateAsset(partner, asset, surface).decision).toBe("BLOCKED");
      }
    }
  });
});
