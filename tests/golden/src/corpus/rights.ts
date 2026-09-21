import type { CaseMetadata } from "../case.js";
import type { RightsCase } from "../expect-rights.js";

/**
 * The rights golden corpus (`docs/canonical/17` §20, §21).
 *
 * §20 names nine profiles and asks for eligibility to be asserted
 * **independently** for each surface. All nine are here, each with its full
 * twelve-cell (asset × surface) matrix written out — not a summary, because a
 * summary is where a scan quietly becomes publishable.
 *
 * ## The surfaces §20 names and the surfaces that exist
 *
 * §20 lists `INTERNAL_RESEARCH`, `FREE_UI`, `PAID_REPORT`, `SEO`, `SHARE` and
 * `IMAGE_REPRODUCTION`. Four map to `Surface`; `IMAGE_REPRODUCTION` is the
 * `IMAGE` row of the matrix together with `reproductionEligible`. **`SHARE` has
 * no evaluator** — TASK-024's share control puts this page's own URL on a
 * clipboard and carries no evidence — so no case here asserts a share decision.
 * Recording the gap is the honest move; inventing a `SHARE` surface so the
 * corpus looked complete would be the opposite.
 *
 * Every profile below is synthetic (§7.2). None describes a real institution's
 * terms, and nothing here is legal advice about any real collection.
 */

const COMMON = {
  case_version: 1,
  domain: "RIGHTS",
  market: "PL",
  fixtures: { canonical_fixture_id: "rights-profiles-v1", source_fixture_ids: [] },
  created_at: "2026-09-21",
  created_by: "TASK-026",
  // Layer 11 is "Absolute P0" and these are licence questions, so the reviewer
  // this corpus wants is not an engineer. Unreviewed, and saying so.
  review: { required_role: "LEGAL", reviewed_at: null, reviewed_by: null },
  linked_issues: [],
} as const;

function meta(
  case_id: string,
  category: string,
  linked_requirements: readonly string[],
  notes: string,
): CaseMetadata {
  return {
    ...COMMON,
    case_id,
    category,
    case_type: "SYNTHETIC",
    blocking_level: "P0",
    linked_requirements,
    notes,
  };
}

/** Shorthand for a twelve-cell matrix, written asset by asset. */
function matrix(
  metadata: readonly [string, string, string, string],
  transcription: readonly [string, string, string, string],
  image: readonly [string, string, string, string],
): Readonly<Record<string, string>> {
  const surfaces = ["INTERNAL", "FREE", "PAID", "SEO"] as const;
  const out: Record<string, string> = {};
  surfaces.forEach((s, i) => {
    out[`METADATA/${s}`] = metadata[i] ?? "";
    out[`TRANSCRIPTION/${s}`] = transcription[i] ?? "";
    out[`IMAGE/${s}`] = image[i] ?? "";
  });
  return out;
}

const OPEN = ["ALLOWED", "ALLOWED", "ALLOWED", "ALLOWED"] as const;
const CLOSED = ["BLOCKED", "BLOCKED", "BLOCKED", "BLOCKED"] as const;
const WITH_ATTRIBUTION = [
  "ALLOWED",
  "ALLOWED_WITH_ATTRIBUTION",
  "ALLOWED_WITH_ATTRIBUTION",
  "ALLOWED_WITH_ATTRIBUTION",
] as const;
/** Internal reading allowed, free surface conditional, commerce closed. */
const COMMERCIAL_CLOSED = ["ALLOWED", "LOCATOR_ONLY", "BLOCKED", "BLOCKED"] as const;

export const RIGHTS_CASES: readonly RightsCase[] = [
  {
    meta: meta(
      "RIGHTS-FULLY-OPEN",
      "FULLY_OPEN",
      ["docs/canonical/17 §20", "docs/canonical/12 §6.3 row 1"],
      "The baseline. Everything permitted, so every later case's refusal is visibly a " +
        "consequence of a stated term rather than of the system being cautious by default.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      transcription_rights: "ALLOWED",
      image_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      review_status: "APPROVED",
      attribution_required: false,
    },
    expected: {
      state: "FULLY_OPEN",
      surfaces: { INTERNAL: "ALLOWED", FREE: "ALLOWED", PAID: "ALLOWED", SEO: "ALLOWED" },
      matrix: matrix(OPEN, OPEN, OPEN),
      connector_executable: true,
      paid_surface_eligible: true,
      reproduction_eligible: true,
      free_excerpt: "EXCERPT",
    },
    forbidden: ["RESTRICTION_WIDENED_AN_EXISTING_DECISION", "TRANSCRIPTION_EXCERPT_EXCEEDS_CAP"],
  },

  {
    meta: meta(
      "RIGHTS-ATTRIBUTION",
      "ATTRIBUTION_REQUIRED",
      ["docs/canonical/17 §20", "docs/canonical/12 §6.3 row 2", "ADR-0007 §5"],
      "Fully permissive except that the licence requires a credit. The credit travels with " +
        "every public decision, so a renderer cannot publish the value and forget the line.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      transcription_rights: "ALLOWED",
      image_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      review_status: "APPROVED",
      attribution_required: true,
      attribution_text: "Synthetic Collection (CC BY 4.0)",
    },
    expected: {
      state: "ATTRIBUTION_REQUIRED",
      surfaces: { INTERNAL: "ALLOWED", FREE: "ALLOWED", PAID: "ALLOWED", SEO: "ALLOWED" },
      matrix: matrix(WITH_ATTRIBUTION, WITH_ATTRIBUTION, WITH_ATTRIBUTION),
      connector_executable: true,
      paid_surface_eligible: true,
      reproduction_eligible: true,
      free_excerpt: "EXCERPT",
    },
    forbidden: [
      "ATTRIBUTION_REQUIRED_BUT_PUBLISHED_WITHOUT_IT",
      "RESTRICTION_WIDENED_AN_EXISTING_DECISION",
      "TRANSCRIPTION_EXCERPT_EXCEEDS_CAP",
    ],
  },

  {
    meta: meta(
      "RIGHTS-ATTRIBUTION-UNBUILDABLE",
      "ATTRIBUTION_REQUIRED",
      ["ADR-0007 §5", "docs/canonical/12 §6.3 row 2"],
      "The same licence with nobody to credit: no attribution text, no owner, no rights URL. " +
        "An obligation that cannot be discharged is not a licence to publish without it, so " +
        "every public surface closes — including the metadata that would otherwise be open. " +
        "Without this case ADR-0007 §5 would be a paragraph nothing tests.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      transcription_rights: "ALLOWED",
      image_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      review_status: "APPROVED",
      attribution_required: true,
    },
    expected: {
      state: "ATTRIBUTION_REQUIRED",
      // The surface evaluation does not read the attribution obligation — it
      // answers "may this kind of value be shown here at all". The per-asset
      // decision is where the obligation bites, which is why both are asserted.
      surfaces: { INTERNAL: "ALLOWED", FREE: "ALLOWED", PAID: "ALLOWED", SEO: "ALLOWED" },
      matrix: matrix(
        ["ALLOWED", "BLOCKED", "BLOCKED", "BLOCKED"],
        ["ALLOWED", "BLOCKED", "BLOCKED", "BLOCKED"],
        ["ALLOWED", "BLOCKED", "BLOCKED", "BLOCKED"],
      ),
      connector_executable: true,
      paid_surface_eligible: true,
      reproduction_eligible: true,
      free_excerpt: "OMITTED",
    },
    forbidden: [
      "ATTRIBUTION_REQUIRED_BUT_PUBLISHED_WITHOUT_IT",
      "RESTRICTION_WIDENED_AN_EXISTING_DECISION",
    ],
  },

  {
    meta: meta(
      "RIGHTS-METADATA-OPEN-IMAGE-BLOCKED",
      "METADATA_OPEN_IMAGE_RESTRICTED",
      [
        "docs/canonical/17 §20",
        "docs/canonical/17 §21",
        "docs/canonical/12 §6.3 row 3",
        "ADR-0007 §3",
      ],
      "The digital-library case §16.4 exists for: the catalogue record is open, the scan is " +
        "not. The object may be named and linked everywhere its metadata is publishable, and " +
        "the image is never copied, cropped, proxied or re-hosted. `LOCATOR_ONLY` is that " +
        "distinction; it is not a softened yes.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      transcription_rights: "ALLOWED",
      image_rights: "PROHIBITED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      review_status: "APPROVED",
      attribution_required: false,
    },
    expected: {
      state: "METADATA_OPEN_IMAGE_RESTRICTED",
      surfaces: { INTERNAL: "ALLOWED", FREE: "ALLOWED", PAID: "ALLOWED", SEO: "ALLOWED" },
      matrix: matrix(OPEN, OPEN, [
        // Internal reading of a prohibited scan is itself refused: a
        // prohibition is the one thing ADR-0007 §1 does not let staff past.
        "BLOCKED",
        "LOCATOR_ONLY",
        "LOCATOR_ONLY",
        "LOCATOR_ONLY",
      ]),
      connector_executable: true,
      paid_surface_eligible: true,
      reproduction_eligible: false,
      free_excerpt: "EXCERPT",
    },
    forbidden: [
      "IMAGE_PROHIBITED_BUT_REPRODUCED",
      "RESTRICTION_WIDENED_AN_EXISTING_DECISION",
      "TRANSCRIPTION_EXCERPT_EXCEEDS_CAP",
    ],
  },

  {
    meta: meta(
      "RIGHTS-COMMERCIAL-UNKNOWN",
      "COMMERCIAL_UNKNOWN",
      ["docs/canonical/17 §20", "docs/canonical/17 §21", "docs/canonical/12 §6.4"],
      "The profile the PESEL register actually sits on. UNKNOWN is not a maybe: the paid " +
        "report and the search index are closed, the free surface is conditional, and OCR — " +
        "whose own permission was never stated and therefore reads UNKNOWN — is not shown at " +
        "all. This is §21's first hard gate.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "UNKNOWN",
      review_status: "APPROVED",
      attribution_required: false,
    },
    expected: {
      state: "COMMERCIAL_UNKNOWN",
      surfaces: { INTERNAL: "ALLOWED", FREE: "CONDITIONAL", PAID: "BLOCKED", SEO: "BLOCKED" },
      matrix: matrix(
        COMMERCIAL_CLOSED,
        // Transcription rights were never stated, so they read UNKNOWN and the
        // OCR is withheld from every public surface — not merely un-linked.
        ["ALLOWED", "BLOCKED", "BLOCKED", "BLOCKED"],
        ["ALLOWED", "LOCATOR_ONLY", "BLOCKED", "BLOCKED"],
      ),
      connector_executable: true,
      paid_surface_eligible: false,
      reproduction_eligible: false,
      free_excerpt: "OMITTED",
    },
    forbidden: [
      "COMMERCIAL_UNKNOWN_EVIDENCE_ON_PAID_SURFACE",
      "TRANSCRIPTION_PUBLISHED_WITHOUT_EXPLICIT_PERMISSION",
      "IMAGE_PROHIBITED_BUT_REPRODUCED",
      "RESTRICTION_WIDENED_AN_EXISTING_DECISION",
    ],
  },

  {
    meta: meta(
      "RIGHTS-NONCOMMERCIAL",
      "NON_COMMERCIAL_ONLY",
      ["docs/canonical/17 §20", "docs/canonical/12 §6.3 row 4"],
      "An explicit non-commercial licence. Everything the licence permits is shown free; " +
        "nothing reaches a paid report. Note that the scan stays `reproduction_eligible` " +
        "because its own permission is ALLOWED — the commercial term closes the surface, not " +
        "the image right, and conflating the two would make the refusal unexplainable.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      transcription_rights: "ALLOWED",
      image_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "PROHIBITED",
      redistribution: "ALLOWED",
      review_status: "APPROVED",
      attribution_required: false,
    },
    expected: {
      state: "NON_COMMERCIAL_ONLY",
      surfaces: { INTERNAL: "ALLOWED", FREE: "CONDITIONAL", PAID: "BLOCKED", SEO: "BLOCKED" },
      matrix: matrix(COMMERCIAL_CLOSED, COMMERCIAL_CLOSED, COMMERCIAL_CLOSED),
      connector_executable: true,
      paid_surface_eligible: false,
      reproduction_eligible: true,
      free_excerpt: "OMITTED",
    },
    forbidden: [
      "COMMERCIAL_UNKNOWN_EVIDENCE_ON_PAID_SURFACE",
      "RESTRICTION_WIDENED_AN_EXISTING_DECISION",
    ],
  },

  {
    meta: meta(
      "RIGHTS-AUTOMATION-PROHIBITED",
      "AUTOMATED_ACCESS_PROHIBITED",
      ["docs/canonical/17 §21", "docs/canonical/12 §6.4"],
      "§21's third hard gate. Note what does **not** move: every display decision stays " +
        "open. A prohibition on automated access is about how the material may be " +
        "*acquired*, never about what may be shown once it lawfully has been, and a system " +
        "that conflated the two would refuse to display material it already holds.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      transcription_rights: "ALLOWED",
      image_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "PROHIBITED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      review_status: "APPROVED",
      attribution_required: false,
    },
    expected: {
      state: "AUTOMATED_ACCESS_PROHIBITED",
      surfaces: { INTERNAL: "ALLOWED", FREE: "ALLOWED", PAID: "ALLOWED", SEO: "ALLOWED" },
      matrix: matrix(OPEN, OPEN, OPEN),
      connector_executable: false,
      paid_surface_eligible: true,
      reproduction_eligible: true,
      free_excerpt: "EXCERPT",
    },
    forbidden: [
      "AUTOMATION_PROHIBITED_BUT_CONNECTOR_EXECUTES",
      "RESTRICTION_WIDENED_AN_EXISTING_DECISION",
    ],
  },

  {
    meta: meta(
      "RIGHTS-PARTNERSHIP-REQUIRED",
      "PARTNERSHIP_REQUIRED",
      ["docs/canonical/17 §21", "docs/canonical/12 §6.3 row 6"],
      "§21's fourth hard gate at rest: a blocked review closes every surface and every asset " +
        "at once, and stops the connector as well. Nothing survives the block by having been " +
        "computed before it.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      transcription_rights: "ALLOWED",
      image_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      review_status: "BLOCKED",
      attribution_required: false,
    },
    expected: {
      state: "PARTNERSHIP_REQUIRED",
      surfaces: { INTERNAL: "BLOCKED", FREE: "BLOCKED", PAID: "BLOCKED", SEO: "BLOCKED" },
      matrix: matrix(CLOSED, CLOSED, CLOSED),
      connector_executable: false,
      // A named §6.4 gate reading `commercial_use` alone, and the licence there
      // is open. The verdict is the matrix above, which is closed.
      paid_surface_eligible: true,
      reproduction_eligible: true,
      free_excerpt: "OMITTED",
    },
    forbidden: ["RIGHTS_BLOCKED_BUT_STILL_EXPOSED", "RESTRICTION_WIDENED_AN_EXISTING_DECISION"],
  },

  {
    meta: meta(
      "RIGHTS-EXPIRED",
      "RIGHTS_EXPIRED",
      ["docs/canonical/17 §20", "docs/canonical/12 §6.3 row 8"],
      "A review whose validity has lapsed. We no longer know the terms, so the surfaces " +
        "where being wrong costs money or is permanent close, and internal research — the " +
        "work of finding out what the terms now are — stays open.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      transcription_rights: "ALLOWED",
      image_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      review_status: "EXPIRED",
      attribution_required: false,
    },
    expected: {
      state: "RIGHTS_EXPIRED",
      surfaces: { INTERNAL: "ALLOWED", FREE: "ALLOWED", PAID: "BLOCKED", SEO: "BLOCKED" },
      matrix: matrix(
        ["ALLOWED", "ALLOWED", "BLOCKED", "BLOCKED"],
        ["ALLOWED", "ALLOWED", "BLOCKED", "BLOCKED"],
        ["ALLOWED", "ALLOWED", "BLOCKED", "BLOCKED"],
      ),
      connector_executable: true,
      paid_surface_eligible: true,
      reproduction_eligible: true,
      free_excerpt: "EXCERPT",
    },
    forbidden: ["RESTRICTION_WIDENED_AN_EXISTING_DECISION", "TRANSCRIPTION_EXCERPT_EXCEEDS_CAP"],
  },

  {
    meta: meta(
      "RIGHTS-CHANGED-AFTER-CLAIM",
      "RIGHTS_WITHDRAWN",
      ["docs/canonical/17 §21", "docs/canonical/12 §6.1"],
      "An institution that was open and has since tightened: the scan is now prohibited, " +
        "commercial permission has been withdrawn to UNKNOWN, and a credit is required. " +
        "§21's fourth gate is about what happens next — a projection built before the change " +
        "must not outlive it — and its executable half is " +
        "RESTRICTION_WIDENED_AN_EXISTING_DECISION, which re-evaluates this profile under " +
        "every restriction in turn and proves none of them opens anything.",
    ),
    input: {
      metadata_rights: "ALLOWED",
      transcription_rights: "ALLOWED",
      image_rights: "PROHIBITED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "UNKNOWN",
      redistribution: "UNKNOWN",
      review_status: "APPROVED",
      attribution_required: true,
      attribution_text: "Synthetic Collection — terms revised",
    },
    expected: {
      state: "COMMERCIAL_UNKNOWN",
      surfaces: { INTERNAL: "ALLOWED", FREE: "CONDITIONAL", PAID: "BLOCKED", SEO: "BLOCKED" },
      matrix: matrix(COMMERCIAL_CLOSED, COMMERCIAL_CLOSED, [
        "BLOCKED",
        "LOCATOR_ONLY",
        "BLOCKED",
        "BLOCKED",
      ]),
      connector_executable: true,
      paid_surface_eligible: false,
      reproduction_eligible: false,
      free_excerpt: "OMITTED",
    },
    forbidden: [
      "RESTRICTION_WIDENED_AN_EXISTING_DECISION",
      "COMMERCIAL_UNKNOWN_EVIDENCE_ON_PAID_SURFACE",
      "IMAGE_PROHIBITED_BUT_REPRODUCED",
      "ATTRIBUTION_REQUIRED_BUT_PUBLISHED_WITHOUT_IT",
    ],
  },
];
