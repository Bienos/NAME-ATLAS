/**
 * The surname result application query service (TASK-006 §5, §6 item 3).
 *
 *   validation → exact resolution → truth lookup → rights → response DTO
 *
 * This is the layer `ARCHITECTURE.md` §6 keeps out of the BFF. The route
 * handler parses, maps to HTTP and serializes; every decision below happens
 * here.
 *
 * What this module never does:
 *
 *   - resolve a surname itself. It calls `@name-atlas/resolver`, unchanged;
 *   - compute a population. It reads what TASK-005 derived;
 *   - write anything. `readCurrentPopulation` is read-only, and derivation
 *     is not reachable from this path (TASK-006 AC-03, §15 U-3);
 *   - compute confidence. It copies the persisted status;
 *   - let rights alter confidence, or confidence alter rights. The two are
 *     read from separate functions with no shared input
 *     (`ARCHITECTURE.md` §10 invariant 2);
 *   - emit a zero for an absent value (invariant 4), or a count without its
 *     dataset date and scope (invariant 5).
 */
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type {
  PopulationObservation,
  PopulationSection,
  SurfaceEligibilityDto,
  SurnameResultResponse,
} from "@name-atlas/contracts";
import { SURNAME_RESULT_SCHEMA_VERSION } from "@name-atlas/contracts";
import { resolveSurname } from "@name-atlas/resolver";
import { readCurrentPopulation } from "./read.js";
import type { PersistedCurrentPopulation } from "./read.js";
import { evaluateSurface } from "./rights.js";
import type { Surface } from "./rights.js";

/**
 * The unit PESEL-derived values carry.
 *
 * `SURNAME_OCCURRENCES`, not `"PEOPLE"` — the publisher describes
 * *"liczba wystąpień"* and never states that one occurrence is one living
 * person (TASK-004 §14 U-4). ADR-0004 records the decision and the
 * deviation from `docs/canonical/16` §26 it entails.
 */
const PESEL_POPULATION_UNIT = "SURNAME_OCCURRENCES" as const;

/** Frontend-localised code for the publisher's universe. */
const PESEL_SCOPE_LABEL_CODE = "PESEL_CURRENT_SURNAME";

/** Outcomes the caller must map to HTTP. Invalid input is the only 4xx. */
export type SurnameQueryOutcome =
  | { readonly kind: "OK"; readonly response: SurnameResultResponse }
  | {
      readonly kind: "INVALID_INPUT";
      /** Which validation rule rejected it. Never echoes the raw input. */
      readonly reason: string;
    }
  | {
      readonly kind: "UNAVAILABLE";
      /** Infrastructure failure. Carries no detail for the client. */
      readonly reason: string;
    };

export interface SurnameQueryOptions {
  /** Which surface the answer is for. Defaults to the free public surface. */
  readonly surface?: Surface;
}

function emptySection(
  state: "UNAVAILABLE" | "RIGHTS_BLOCKED",
  reasonCode: string,
  surface: SurfaceEligibilityDto,
): PopulationSection {
  return { state, observations: [], reason_code: reasonCode, surface };
}

/** Projects one persisted claim into the public observation shape. */
function toObservation(claim: PersistedCurrentPopulation): PopulationObservation {
  return {
    value: {
      // Only real counts reach here; derivation never persists a zero.
      status: "KNOWN",
      value: claim.count,
      unit: PESEL_POPULATION_UNIT,
      scope_label_code: PESEL_SCOPE_LABEL_CODE,
    },
    snapshot_date: claim.snapshot_date,
    country_code: claim.country_code,
    source_population_scope: claim.source_population_scope,
    coverage_notes: claim.coverage_notes,
    comparability_group: claim.comparability_group,
    confidence: {
      // Copied from the persisted assessment. The assessment's `rationale`
      // is an internal explanation (docs/canonical/11 §10.3) and does not
      // cross this boundary.
      status: claim.confidence_status as PopulationObservation["confidence"]["status"],
      methodology_code: `${claim.assessment_method}@${claim.assessment_version}`,
    },
    citation: {
      id: claim.citation_id,
      title: claim.citation_title,
      publisher: claim.citation_publisher,
      publication_date: claim.citation_publication_date,
      source_type: claim.source_type,
      locator: claim.citation_locator,
      url: claim.citation_url,
      attribution: claim.attribution_text,
      terms: claim.terms_version,
    },
  };
}

/**
 * Answers one surname query.
 *
 * `UNRESOLVED` and `AMBIGUOUS` are successful outcomes carrying an explicit
 * status, not errors and never a zero (`docs/canonical/16` §79).
 */
export async function querySurnameResult(
  db: Kysely<DB>,
  rawInput: string,
  options: SurnameQueryOptions = {},
): Promise<SurnameQueryOutcome> {
  const surface: Surface = options.surface ?? "FREE";

  // Validation is the resolver's, not a second implementation of it.
  const lookup = await resolveSurname(db, rawInput);

  if (lookup.kind === "LOOKUP_FAILED") {
    // Infrastructure, never "this surname does not exist".
    return { kind: "UNAVAILABLE", reason: `resolution lookup failed at ${lookup.stage}` };
  }

  const resolution = lookup.resolution;
  const status = resolution.resolution_status;

  if (resolution.outcome === "INVALID_INPUT") {
    return { kind: "INVALID_INPUT", reason: status };
  }

  if (status === "MULTIPLE_EXACT" || status === "REVIEW_REQUIRED") {
    return {
      kind: "OK",
      response: {
        schema_version: SURNAME_RESULT_SCHEMA_VERSION,
        status: "AMBIGUOUS",
        surname: null,
        population: null,
      },
    };
  }

  // EXACT only. KNOWN_VARIANT is excluded for the same reason TASK-005
  // excluded it (§15 U-5): no NameForm variant links exist in production
  // data, so the permissive path cannot be tested against anything real.
  if (status !== "EXACT" || !resolution.resolved_surname_id) {
    return {
      kind: "OK",
      response: {
        schema_version: SURNAME_RESULT_SCHEMA_VERSION,
        status: "UNRESOLVED",
        surname: null,
        population: null,
      },
    };
  }

  const surnameId = resolution.resolved_surname_id;
  const claims = await readCurrentPopulation(db, surnameId);

  const identity = {
    id: surnameId,
    display_name: resolution.resolved_canonical_display ?? resolution.unicode_nfc,
    script: resolution.primary_script,
  };

  if (claims.length === 0) {
    // Absence. The surname may be below the publisher's suppression
    // threshold, or outside the resource's scope, or simply not derived yet.
    // None of those is a count of zero.
    const noRights = evaluateSurface(
      {
        automated_access: "UNKNOWN",
        commercial_use: "UNKNOWN",
        redistribution: "UNKNOWN",
        metadata_rights: "UNKNOWN",
        review_status: "LEGAL_REVIEW_REQUIRED",
      },
      surface,
    );
    return {
      kind: "OK",
      response: {
        schema_version: SURNAME_RESULT_SCHEMA_VERSION,
        status: "RESOLVED",
        surname: identity,
        population: emptySection("UNAVAILABLE", "NO_APPLICABLE_EVIDENCE", noRights),
      },
    };
  }

  // Rights are evaluated from the profile in force for the evidence, before
  // any factual value is placed in the response.
  const firstClaim = claims[0];
  if (!firstClaim) {
    throw new Error("unreachable: claims array is non-empty");
  }
  const eligibility = evaluateSurface(firstClaim.rights, surface);

  if (eligibility.decision === "BLOCKED") {
    // The value is omitted from the payload entirely — not sent and marked
    // hidden. docs/canonical/16 §55 forbids relying on client-side gating.
    return {
      kind: "OK",
      response: {
        schema_version: SURNAME_RESULT_SCHEMA_VERSION,
        status: "RESOLVED",
        surname: identity,
        population: emptySection("RIGHTS_BLOCKED", eligibility.reason_code, eligibility),
      },
    };
  }

  // ALLOWED and CONDITIONAL both surface the values; CONDITIONAL carries its
  // reason so a caller can apply the condition (docs/canonical/12 §6.3).
  return {
    kind: "OK",
    response: {
      schema_version: SURNAME_RESULT_SCHEMA_VERSION,
      status: "RESOLVED",
      surname: identity,
      population: {
        state: "READY",
        observations: claims.map(toObservation),
        reason_code: null,
        surface: eligibility,
      },
    },
  };
}
