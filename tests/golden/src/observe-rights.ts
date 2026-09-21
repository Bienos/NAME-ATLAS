import {
  completeRights,
  evaluateAllSurfaces,
  evaluateAsset,
  evaluateRightsMatrix,
  excerptTranscription,
  classifyRightsState,
  connectorExecutable,
  paidSurfaceEligible,
  reproductionEligible,
  resolveEffectiveRights,
  SURFACES,
  TRANSCRIPTION_EXCERPT_MAX_CHARS,
} from "@name-atlas/truth";
import type {
  AssetEligibility,
  FullRights,
  RightsLayer,
  RightsState,
  SurfaceEligibility,
  TranscriptionExcerpt,
} from "@name-atlas/truth";

/**
 * What a rights golden case observes.
 *
 * `docs/canonical/17` §20 asks for eligibility to be asserted **independently**
 * per surface, so the observation carries every surface and every
 * (asset × surface) cell rather than a summary. §21's fourth hard gate — "rights
 * change blocks item + cached premium projection still exposes it" — is about
 * what happens when a restriction *arrives*, so the observation also carries the
 * same profile re-evaluated under each of a fixed set of restricting child
 * layers. There is no cache on this path to test directly; what can be tested,
 * and is, is that a restriction never widens a decision.
 */

/** A synthetic OCR page, long enough to exercise ADR-0007 §2's 300-point cap. */
export const OCR_SAMPLE = "Kowalski z Krakowa, roku pańskiego 1784. ".repeat(20);

export interface Restriction {
  readonly label: string;
  readonly layer: RightsLayer;
  readonly rights: FullRights;
  readonly matrix: readonly AssetEligibility[];
}

/**
 * One child layer per rights dimension, each stating the strictest value that
 * dimension has. `docs/canonical/12` §6.1 allows a child to be more restrictive
 * and only more restrictive, so every one of these must move decisions in one
 * direction or leave them alone.
 */
const RESTRICTIONS: readonly { readonly label: string; readonly layer: RightsLayer }[] = [
  { label: "metadata_rights=PROHIBITED", layer: { metadata_rights: "PROHIBITED" } },
  { label: "transcription_rights=PROHIBITED", layer: { transcription_rights: "PROHIBITED" } },
  { label: "image_rights=PROHIBITED", layer: { image_rights: "PROHIBITED" } },
  { label: "commercial_use=PROHIBITED", layer: { commercial_use: "PROHIBITED" } },
  { label: "redistribution=PROHIBITED", layer: { redistribution: "PROHIBITED" } },
  { label: "automated_access=PROHIBITED", layer: { automated_access: "PROHIBITED" } },
  { label: "review_status=BLOCKED", layer: { review_status: "BLOCKED" } },
  { label: "review_status=EXPIRED", layer: { review_status: "EXPIRED" } },
];

export interface RightsObservation {
  readonly rights: FullRights;
  readonly state: RightsState;
  readonly surfaces: readonly SurfaceEligibility[];
  readonly matrix: readonly AssetEligibility[];
  readonly connector_executable: boolean;
  readonly paid_surface_eligible: boolean;
  readonly reproduction_eligible: boolean;
  /** One excerpt attempt per surface, so `FREE` and `PAID` are not conflated. */
  readonly excerpts: readonly {
    readonly surface: string;
    readonly excerpt: TranscriptionExcerpt;
  }[];
  readonly restrictions: readonly Restriction[];
  readonly excerpt_cap: number;
}

export function observeRights(layer: RightsLayer): RightsObservation {
  const rights = completeRights(layer);
  return {
    rights,
    state: classifyRightsState(rights),
    // `evaluateSurface` reads the five dimensions of `EffectiveRights`;
    // `FullRights` carries them, so the metadata surfaces are evaluated from
    // exactly the same values the asset matrix uses.
    surfaces: evaluateAllSurfaces({
      automated_access: rights.automated_access,
      commercial_use: rights.commercial_use,
      redistribution: rights.redistribution,
      metadata_rights: rights.metadata_rights,
      review_status: rights.review_status,
    }),
    matrix: evaluateRightsMatrix(rights),
    connector_executable: connectorExecutable(rights),
    paid_surface_eligible: paidSurfaceEligible(rights),
    reproduction_eligible: reproductionEligible(rights),
    excerpts: SURFACES.map((surface) => ({
      surface,
      excerpt: excerptTranscription(OCR_SAMPLE, rights, surface),
    })),
    restrictions: RESTRICTIONS.map((r) => {
      const restricted = resolveEffectiveRights(layer, r.layer);
      return {
        label: r.label,
        layer: r.layer,
        rights: restricted,
        matrix: evaluateRightsMatrix(restricted),
      };
    }),
    excerpt_cap: TRANSCRIPTION_EXCERPT_MAX_CHARS,
  };
}

/** The (asset × surface) cell, for a message that says which one failed. */
export function cellOf(e: AssetEligibility): string {
  return `${e.asset}/${e.surface}`;
}

export { evaluateAsset };
