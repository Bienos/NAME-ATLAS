import type { AssetDecision } from "@name-atlas/truth";
import type { ForbiddenRule } from "./forbidden-resolution.js";
import { cellOf } from "./observe-rights.js";
import type { RightsObservation } from "./observe-rights.js";

/**
 * `docs/canonical/17` §21's rights P0 hard fails, as executable predicates, plus
 * the ADR-0007 obligations that live on the same profiles.
 *
 * Layer 11 is "Absolute P0" (§2). These rules are the ones where being wrong is
 * not a bad answer but a licence breach, so each is stated as a refusal and
 * checked against every surface and every asset kind independently, as §20
 * requires.
 */
export type RightsForbiddenCode =
  | "COMMERCIAL_UNKNOWN_EVIDENCE_ON_PAID_SURFACE"
  | "IMAGE_PROHIBITED_BUT_REPRODUCED"
  | "AUTOMATION_PROHIBITED_BUT_CONNECTOR_EXECUTES"
  | "RIGHTS_BLOCKED_BUT_STILL_EXPOSED"
  | "RESTRICTION_WIDENED_AN_EXISTING_DECISION"
  | "ATTRIBUTION_REQUIRED_BUT_PUBLISHED_WITHOUT_IT"
  | "TRANSCRIPTION_PUBLISHED_WITHOUT_EXPLICIT_PERMISSION"
  | "TRANSCRIPTION_EXCERPT_EXCEEDS_CAP";

/** How restrictive each decision is. A restriction may only move this up. */
const DECISION_RANK: Record<AssetDecision, number> = {
  ALLOWED: 0,
  ALLOWED_WITH_ATTRIBUTION: 1,
  LOCATOR_ONLY: 2,
  BLOCKED: 3,
};

/** Decisions that put the asset itself in front of the public. */
const REPRODUCES = new Set<AssetDecision>(["ALLOWED", "ALLOWED_WITH_ATTRIBUTION"]);

const PUBLIC_SURFACES = new Set(["FREE", "PAID", "SEO"]);

export const RIGHTS_FORBIDDEN: {
  readonly [C in RightsForbiddenCode]: ForbiddenRule<RightsObservation>;
} = {
  COMMERCIAL_UNKNOWN_EVIDENCE_ON_PAID_SURFACE: {
    clause:
      "docs/canonical/17 §21 `commercial_use UNKNOWN + paid report contains evidence → FAIL`; " +
      "docs/canonical/12 §6.4",
    rule:
      "UNKNOWN is not a maybe. Where commercial permission is unknown or refused, nothing " +
      "reaches a paid report or a search index — not the metadata, not the OCR, not the scan.",
    check: (o) => {
      const unresolved =
        o.rights.commercial_use === "UNKNOWN" || o.rights.commercial_use === "PROHIBITED";
      if (!unresolved) return null;
      const faults: string[] = [];
      if (o.paid_surface_eligible) faults.push("paid_surface_eligible was true");
      for (const cell of o.matrix) {
        if (cell.surface !== "PAID" && cell.surface !== "SEO") continue;
        if (cell.decision !== "BLOCKED") {
          faults.push(`${cellOf(cell)} was ${cell.decision}`);
        }
      }
      for (const { surface, excerpt } of o.excerpts) {
        if ((surface === "PAID" || surface === "SEO") && excerpt.kind === "EXCERPT") {
          faults.push(`an OCR excerpt was produced for ${surface}`);
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  IMAGE_PROHIBITED_BUT_REPRODUCED: {
    clause:
      "docs/canonical/17 §21 `image_rights PROHIBITED + report embeds image → FAIL`; " +
      "docs/canonical/12 §6.4; ADR-0007 §3",
    rule:
      "A scan is reproduced on an explicit `image_rights = ALLOWED` or not at all. Anything " +
      "short of that is a locator — a link to the holding institution's own page — and a " +
      "prohibition is not even that on a public surface.",
    check: (o) => {
      const faults: string[] = [];
      if (o.rights.image_rights !== "ALLOWED" && o.reproduction_eligible) {
        faults.push(`reproduction_eligible was true at image_rights=${o.rights.image_rights}`);
      }
      for (const cell of o.matrix) {
        if (cell.asset !== "IMAGE" || !PUBLIC_SURFACES.has(cell.surface)) continue;
        if (o.rights.image_rights !== "ALLOWED" && REPRODUCES.has(cell.decision)) {
          faults.push(
            `${cellOf(cell)} was ${cell.decision} at image_rights=${o.rights.image_rights}`,
          );
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  AUTOMATION_PROHIBITED_BUT_CONNECTOR_EXECUTES: {
    clause:
      "docs/canonical/17 §21 `automated_access PROHIBITED + connector executes automatically " +
      "→ FAIL`; docs/canonical/12 §6.4",
    rule:
      "A source that forbids automated access is read by a human or not at all. No schedule, " +
      "no backfill, no retry.",
    check: (o) => {
      if (o.rights.automated_access !== "PROHIBITED") return null;
      return o.connector_executable ? "connectorExecutable was true" : null;
    },
  },

  RIGHTS_BLOCKED_BUT_STILL_EXPOSED: {
    clause:
      "docs/canonical/17 §21 `rights change blocks item + cached premium projection still " +
      "exposes it → FAIL`; docs/canonical/12 §6.3",
    rule:
      "A blocked rights review closes every surface at once, including internal reuse of an " +
      "already-built projection. Nothing survives the block by having been computed before it.",
    check: (o) => {
      if (o.rights.review_status !== "BLOCKED") return null;
      const faults: string[] = [];
      for (const s of o.surfaces) {
        if (s.decision !== "BLOCKED") faults.push(`surface ${s.surface} was ${s.decision}`);
      }
      for (const cell of o.matrix) {
        if (cell.decision !== "BLOCKED") faults.push(`${cellOf(cell)} was ${cell.decision}`);
      }
      if (o.connector_executable) faults.push("connectorExecutable was true");
      // `paidSurfaceEligible` is deliberately not asserted here. It is one of
      // §6.4's named gates and reads `commercial_use` alone, so an open
      // commercial licence keeps it true even while the review is blocked.
      // The verdict is the matrix, which is asserted above; a gate is not a
      // verdict, and making this one answer a question it was not asked would
      // hide which rule actually closed the surface.
      for (const { surface, excerpt } of o.excerpts) {
        if (excerpt.kind === "EXCERPT") faults.push(`an OCR excerpt was produced for ${surface}`);
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  RESTRICTION_WIDENED_AN_EXISTING_DECISION: {
    clause: "docs/canonical/12 §6.1 — a child layer may only be MORE restrictive",
    rule:
      "Applying a restriction never opens anything. This is the executable half of §21's " +
      "fourth gate: the rule a cache would have to violate for a withdrawn item to stay " +
      "visible, checked where it is decided rather than where it is stored.",
    check: (o) => {
      const before = new Map(o.matrix.map((cell) => [cellOf(cell), cell.decision]));
      const faults: string[] = [];
      for (const restriction of o.restrictions) {
        for (const cell of restriction.matrix) {
          const was = before.get(cellOf(cell));
          if (was === undefined) continue;
          if (DECISION_RANK[cell.decision] < DECISION_RANK[was]) {
            faults.push(`${restriction.label}: ${cellOf(cell)} ${was} → ${cell.decision}`);
          }
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  ATTRIBUTION_REQUIRED_BUT_PUBLISHED_WITHOUT_IT: {
    clause: "ADR-0007 §5; docs/canonical/12 §6.3 row 2",
    rule:
      "An attribution obligation that cannot be discharged blocks publication. Where " +
      "something is published on a public surface under such an obligation, the text to " +
      "display travels with the decision.",
    check: (o) => {
      if (!o.rights.attribution_required) return null;
      const faults: string[] = [];
      for (const cell of o.matrix) {
        if (!PUBLIC_SURFACES.has(cell.surface)) continue;
        if (cell.decision === "BLOCKED") continue;
        if (cell.attribution === null || cell.attribution.trim() === "") {
          faults.push(`${cellOf(cell)} was ${cell.decision} with no attribution text`);
        }
        if (cell.decision === "ALLOWED") {
          faults.push(`${cellOf(cell)} was plain ALLOWED under an attribution obligation`);
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  TRANSCRIPTION_PUBLISHED_WITHOUT_EXPLICIT_PERMISSION: {
    clause: "ADR-0007 §2; docs/canonical/12 §16.5",
    rule:
      "OCR is stored whenever it is retrieved — without the matched text there is no evidence " +
      "— but it is shown to the public only on an explicit `transcription_rights = ALLOWED`. " +
      "Storage and publication are different permissions.",
    check: (o) => {
      if (o.rights.transcription_rights === "ALLOWED") return null;
      const faults: string[] = [];
      for (const { surface, excerpt } of o.excerpts) {
        if (surface === "INTERNAL") continue;
        if (excerpt.kind === "EXCERPT") {
          faults.push(
            `${surface} produced an excerpt at transcription_rights=` +
              `${o.rights.transcription_rights}`,
          );
        }
      }
      for (const cell of o.matrix) {
        if (cell.asset !== "TRANSCRIPTION" || !PUBLIC_SURFACES.has(cell.surface)) continue;
        if (REPRODUCES.has(cell.decision)) faults.push(`${cellOf(cell)} was ${cell.decision}`);
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },

  TRANSCRIPTION_EXCERPT_EXCEEDS_CAP: {
    clause: "ADR-0007 §2",
    rule:
      "A published excerpt is capped at 300 Unicode code points and says it was truncated. " +
      "The cap is counted in code points, so a surname carrying combining marks is not cut " +
      "through the middle of a character.",
    check: (o) => {
      const faults: string[] = [];
      for (const { surface, excerpt } of o.excerpts) {
        if (excerpt.kind !== "EXCERPT") continue;
        const points = Array.from(excerpt.text).length;
        if (points > o.excerpt_cap) {
          faults.push(`${surface} excerpt was ${String(points)} code points`);
        }
        if (points === o.excerpt_cap && !excerpt.truncated) {
          faults.push(`${surface} excerpt filled the cap without declaring truncation`);
        }
      }
      return faults.length === 0 ? null : faults.join("; ");
    },
  },
};

export const RIGHTS_FORBIDDEN_CODES = Object.keys(
  RIGHTS_FORBIDDEN,
) as readonly RightsForbiddenCode[];
