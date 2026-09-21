import type { RightsLayer } from "@name-atlas/truth";
import type { CaseMetadata } from "./case.js";
import type { RightsForbiddenCode } from "./forbidden-rights.js";

/**
 * A rights case's `expected` block.
 *
 * `docs/canonical/17` §20 asks for eligibility to be asserted **independently**
 * for each surface, so the expectation is written per surface and per
 * (asset × surface) cell rather than as one verdict. §6.3's row the profile
 * sits on is asserted too — not because anything enforces from it, but because
 * an operator reading the admin console is told which row this is, and a row
 * that drifted from the decisions would mislead them.
 */
export type SurfaceName = "INTERNAL" | "FREE" | "PAID" | "SEO";
export type AssetName = "METADATA" | "TRANSCRIPTION" | "IMAGE";

export interface RightsExpectation {
  /** `classifyRightsState`'s answer: which row of §6.3 this profile is on. */
  readonly state: string;
  /** Per-surface metadata decision, all four, none optional. */
  readonly surfaces: Readonly<Record<SurfaceName, "ALLOWED" | "CONDITIONAL" | "BLOCKED">>;
  /**
   * Per (asset × surface) decision. Written as `"ASSET/SURFACE"` keys, every
   * one of the twelve present, so a case cannot quietly decline to say what
   * happens to the scan.
   */
  readonly matrix: Readonly<Record<string, string>>;
  readonly connector_executable: boolean;
  readonly paid_surface_eligible: boolean;
  readonly reproduction_eligible: boolean;
  /** Whether a public OCR excerpt is produced on the free surface. */
  readonly free_excerpt: "EXCERPT" | "OMITTED";
}

export interface RightsCase {
  readonly meta: CaseMetadata;
  /** The stored rights position, as a source or record layer carries it. */
  readonly input: RightsLayer;
  readonly expected: RightsExpectation;
  readonly forbidden: readonly RightsForbiddenCode[];
}
