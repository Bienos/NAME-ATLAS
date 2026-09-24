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
  DistributionEntry,
  DistributionSection,
  Suggestion,
  SuggestionsSection,
  PopulationObservation,
  PopulationSection,
  SurfaceEligibilityDto,
  SurnameResultResponse,
  RarityEntry,
  RaritySection,
  MeaningSection,
  MeaningInterpretation as MeaningInterpretationDto,
} from "@name-atlas/contracts";
import { SURNAME_RESULT_SCHEMA_VERSION } from "@name-atlas/contracts";
import { resolveSurname, suggestSurnames } from "@name-atlas/resolver";
import {
  hasNationalRegisterCount,
  readCurrentDistribution,
  readCurrentPopulation,
  readRarityContext,
  readSurnameMeaning,
} from "./read.js";
import type {
  PersistedCurrentDistribution,
  PersistedCurrentPopulation,
  PersistedInterpretation,
  PersistedRarityContext,
  PersistedSurnameMeaning,
} from "./read.js";
import { evaluateSurface } from "./rights.js";
import type { EffectiveRights, Surface } from "./rights.js";
import { RARITY_METHODOLOGY_CODE } from "./version.js";

/**
 * The unit PESEL-derived values carry.
 *
 * `PEOPLE`, since 2026-09-20 (ADR-0004 as amended; TASK-004 §14 U-4 decided
 * by the project owner). The publisher's word is *"liczba wystąpień"*, but
 * the field counted is *nazwisko aktualne* — the current surname — and
 * every living person in PESEL has exactly one, so an occurrence among
 * living persons is one person by construction. The residual is duplicate
 * person records, a data-quality matter, not a definitional one.
 * `SURNAME_OCCURRENCES` stays in the contract's enum for a source whose
 * field is not one-per-person.
 */
const PESEL_POPULATION_UNIT = "PEOPLE" as const;

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

function emptyRarity(
  state: "UNAVAILABLE" | "RIGHTS_BLOCKED",
  reasonCode: string,
  surface: SurfaceEligibilityDto,
): RaritySection {
  return { state, entries: [], reason_code: reasonCode, surface };
}

/**
 * The suggestions section for an input that did not resolve (TASK-016).
 *
 * Runs only for `UNKNOWN`. A `REVIEW_REQUIRED` input — mixed script with a
 * confusable — gets none: `docs/canonical/13` §33.4 names mixed-script identity
 * as a case never to auto-resolve, and offering Latin neighbours for an input
 * carrying a Cyrillic lookalike would be worse than offering nothing.
 *
 * A retrieval failure degrades to `UNAVAILABLE` rather than failing the
 * request. An unresolved answer is still a correct answer when the trigram
 * index is unreachable; turning it into a 503 would be a worse lie than saying
 * no suggestion is available.
 */
async function suggestionsFor(
  db: Kysely<DB>,
  rawInput: string,
  resolutionStatus: string,
): Promise<SuggestionsSection> {
  if (resolutionStatus === "REVIEW_REQUIRED") {
    return emptySuggestions("MIXED_SCRIPT_REVIEW");
  }
  if (resolutionStatus === "MULTIPLE_EXACT") {
    return emptySuggestions("MULTIPLE_EXACT_MATCHES");
  }
  if (resolutionStatus !== "UNKNOWN") {
    return emptySuggestions("NOT_APPLICABLE");
  }

  const found = await suggestSurnames(db, rawInput);
  if (found.kind === "LOOKUP_FAILED") {
    return emptySuggestions("SUGGESTIONS_UNAVAILABLE");
  }
  if (found.kind === "NO_SUGGESTIONS") {
    return emptySuggestions(found.reason);
  }
  return {
    state: "READY",
    outcome: found.outcome,
    decision_mode: found.decision_mode,
    reason_code: null,
    suggestions: found.candidates.map((candidate): Suggestion => ({
      surname: {
        id: candidate.candidate_surname_id,
        display_name: candidate.candidate_canonical_display,
        script: candidate.candidate_primary_script,
      },
      match_type: "FUZZY_CANDIDATE",
      explanation_codes: [...candidate.explanation_codes],
    })),
  };
}

function emptySuggestions(reasonCode: string): SuggestionsSection {
  return {
    state: "UNAVAILABLE",
    outcome: null,
    decision_mode: null,
    reason_code: reasonCode,
    suggestions: [],
  };
}

function emptyDistribution(
  state: "UNAVAILABLE" | "RIGHTS_BLOCKED",
  reasonCode: string,
  surface: SurfaceEligibilityDto,
): DistributionSection {
  return { state, entries: [], reason_code: reasonCode, surface };
}

/**
 * The meaning section for a surname with no admissible onomastic work, or one
 * whose rights close the surface (TASK-022, ADR-0008 §3).
 *
 * `NO_SOURCED_MEANING` is the ordinary case and will be the answer for every
 * surname until an onomastic source is imported. It is a stated gap, not an
 * omission: the reader is told Name Atlas has no sourced meaning, which is
 * true and checkable, and is what ADR-0008 §2 requires instead of a guess.
 */
function emptyMeaning(
  state: "NO_SOURCED_MEANING" | "RIGHTS_BLOCKED" | "UNAVAILABLE",
  reasonCode: string,
  surface: SurfaceEligibilityDto,
): MeaningSection {
  return {
    state,
    interpretations: [],
    confidence: null,
    methodology_code: null,
    reason_code: reasonCode,
    surface,
  };
}

/**
 * Projects the persisted meaning claim into the contract's shape.
 *
 * Carries every interpretation, unmerged and unranked. Where two works
 * disagree the confidence is `CONFLICTING` and both readings travel, because
 * `ARCHITECTURE.md` §10 invariant 2's sibling principle applies: the surface
 * renders validated claims, it does not resolve scholarship.
 */
function projectMeaningSection(
  claim: PersistedSurnameMeaning,
  surface: SurfaceEligibilityDto,
): MeaningSection {
  const confidence = MEANING_CONFIDENCES.includes(claim.confidence_status)
    ? (claim.confidence_status as MeaningSection["confidence"])
    : null;
  if (claim.interpretations.length === 0 || confidence === null) {
    // A stored claim that carries no interpretation, or a confidence value the
    // contract does not permit for an interpretation, is a finding rather than
    // something to render. Report the gap; never guess at the missing half.
    return emptyMeaning("UNAVAILABLE", "MEANING_CLAIM_INCOMPLETE", surface);
  }
  return {
    state: "AVAILABLE",
    interpretations: claim.interpretations.map((i: PersistedInterpretation) => ({
      root_form: i.root_form,
      root_language: i.root_language,
      literal_gloss: i.literal_gloss,
      formation_type: FORMATION_TYPES.includes(i.formation_type)
        ? (i.formation_type as MeaningInterpretationDto["formation_type"])
        : "UNKNOWN",
      work: {
        title: i.work.title,
        author_or_publisher: i.work.author_or_publisher,
        year: i.work.year,
      },
      locator: i.locator,
    })),
    confidence,
    methodology_code: `${claim.assessment_method}@${claim.assessment_version}`,
    reason_code: null,
    surface,
  };
}

/**
 * The rights posture used where no source exists to have any: every dimension
 * `UNKNOWN`, review unresolved. Fail closed, so an absent section can never
 * report a permission the project does not hold.
 */
const NO_RIGHTS_KNOWN: EffectiveRights = {
  automated_access: "UNKNOWN",
  commercial_use: "UNKNOWN",
  redistribution: "UNKNOWN",
  metadata_rights: "UNKNOWN",
  review_status: "LEGAL_REVIEW_REQUIRED",
};

/**
 * Builds the meaning section, evaluated against **its own** source's rights.
 *
 * Deliberately not gated by the population section's eligibility. A meaning
 * comes from a scholarly work, a count comes from the register, and the two
 * carry different rights profiles; letting one decide the other's surface
 * would be wrong in both directions — it could hide a lawfully publishable
 * meaning behind an unresolved register licence, or publish a partner-only
 * interpretation because a CC0 count was publishable.
 */
async function meaningSectionFor(
  db: Kysely<DB>,
  surnameId: string,
  surface: Surface,
): Promise<MeaningSection> {
  const claims = await readSurnameMeaning(db, surnameId);
  const claim = claims[0];
  if (!claim) {
    // ADR-0008 §3: the stated gap. The expected answer for every surname until
    // an onomastic source is imported.
    return emptyMeaning(
      "NO_SOURCED_MEANING",
      "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
      evaluateSurface(NO_RIGHTS_KNOWN, surface),
    );
  }
  const eligibility = evaluateSurface(claim.rights, surface);
  if (eligibility.decision === "BLOCKED") {
    // No interpretation text in the payload at all — omitted, not sent and
    // marked hidden (docs/canonical/16 §55).
    return emptyMeaning("RIGHTS_BLOCKED", eligibility.reason_code, eligibility);
  }
  return projectMeaningSection(claim, eligibility);
}

/** The confidence values the contract permits for an interpretation. */
const MEANING_CONFIDENCES: readonly string[] = [
  "LIKELY",
  "POSSIBLE",
  "CONFLICTING",
  "INSUFFICIENT_DATA",
];

const FORMATION_TYPES: readonly string[] = [
  "PATRONYMIC",
  "TOPONYMIC",
  "OCCUPATIONAL",
  "DESCRIPTIVE",
  "OTHER",
  "UNKNOWN",
];

/**
 * Projects one persisted distribution claim into canonical/16 §28's shape
 * (TASK-012).
 *
 * `coverage_state` travels with the figures rather than being derived by the
 * consumer: a surface must not have to recompute whether 210 of 6,442 bearers
 * is enough to call something a distribution.
 */
function toDistributionEntry(claim: PersistedCurrentDistribution): DistributionEntry {
  return {
    coverage_state: claim.state as DistributionEntry["coverage_state"],
    regions: claim.entries.map((entry) => ({
      place_id: entry.place_id,
      terc_code: entry.terc_code,
      display_name: entry.place_display_name,
      count: entry.count,
      share_of_covered: entry.share_of_covered,
    })),
    covered_count: claim.covered_count,
    national_count: claim.national_count,
    coverage_ratio: claim.coverage_ratio,
    coverage_basis: claim.coverage_basis,
    low_coverage_threshold: claim.low_coverage_threshold,
    universe_label_code: claim.universe_label_code,
    scope_label_code: PESEL_SCOPE_LABEL_CODE,
    snapshot_date: claim.snapshot_date,
    country_code: claim.country_code,
    comparability_group: claim.comparability_group,
    confidence: {
      status: claim.confidence_status as DistributionEntry["confidence"]["status"],
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
      retrieved_at: claim.citation_retrieved_at,
      source_page_url: claim.citation_source_page_url,
    },
  };
}

/** Projects one persisted rarity claim into canonical/16 §27's shape (TASK-014). */
function toRarityEntry(claim: PersistedRarityContext): RarityEntry {
  return {
    primary: { metric: "ONE_IN_X", value: claim.one_in_x },
    supporting:
      claim.supporting_rank === null ? [] : [{ metric: "RANK", value: claim.supporting_rank }],
    methodology_code: RARITY_METHODOLOGY_CODE,
    universe_label_code: claim.universe_label_code,
    numerator: claim.numerator,
    denominator: claim.denominator,
    share: claim.share,
    scope_label_code: PESEL_SCOPE_LABEL_CODE,
    snapshot_date: claim.snapshot_date,
    country_code: claim.country_code,
    comparability_group: claim.comparability_group,
    confidence: {
      status: claim.confidence_status as RarityEntry["confidence"]["status"],
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
      retrieved_at: claim.citation_retrieved_at,
      source_page_url: claim.citation_source_page_url,
    },
  };
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
      retrieved_at: claim.citation_retrieved_at,
      source_page_url: claim.citation_source_page_url,
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
        rarity: null,
        distribution: null,
        suggestions: await suggestionsFor(db, rawInput, status),
        meaning: null,
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
        rarity: null,
        distribution: null,
        suggestions: await suggestionsFor(db, rawInput, status),
        meaning: null,
      },
    };
  }

  const surnameId = resolution.resolved_surname_id;
  const claims = await readCurrentPopulation(db, surnameId);
  const meaningSection = await meaningSectionFor(db, surnameId, surface);
  const rarityClaims = await readRarityContext(db, surnameId);
  const distributionClaims = await readCurrentDistribution(db, surnameId);

  const identity = {
    id: surnameId,
    display_name: resolution.resolved_canonical_display ?? resolution.unicode_nfc,
    script: resolution.primary_script,
  };

  if (claims.length === 0) {
    // Absence. The surname may be below the publisher's suppression
    // threshold, or outside the resource's scope, or simply not derived yet.
    // None of those is a count of zero. The last is told apart from the
    // others, because "this dataset does not list it" would be false for a
    // surname the register does list. Still no write: derivation stays off
    // this path (TASK-006 AC-03).
    const reason = (await hasNationalRegisterCount(db, surnameId))
      ? "NOT_DERIVED_YET"
      : "NO_APPLICABLE_EVIDENCE";
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
        population: emptySection("UNAVAILABLE", reason, noRights),
        rarity: emptyRarity("UNAVAILABLE", reason, noRights),
        distribution: emptyDistribution("UNAVAILABLE", reason, noRights),
        suggestions: null,
        // A meaning comes from a different source with different rights, so it
        // is present or absent on its own terms even where no count exists.
        meaning: meaningSection,
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
        rarity: emptyRarity("RIGHTS_BLOCKED", eligibility.reason_code, eligibility),
        distribution: emptyDistribution("RIGHTS_BLOCKED", eligibility.reason_code, eligibility),
        suggestions: null,
        meaning: meaningSection,
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
      // Rarity needs a complete universe as well as a count, so it can be
      // absent where population is present. Absence is stated, never a
      // figure invented.
      rarity:
        rarityClaims.length > 0
          ? {
              state: "READY",
              entries: rarityClaims.map(toRarityEntry),
              reason_code: null,
              surface: eligibility,
            }
          : emptyRarity("UNAVAILABLE", "NO_COMPLETE_UNIVERSE", eligibility),
      // The geography chapter needs a complete *regional* resource version,
      // which is a different universe from the national one, so it too can be
      // absent where population is present. docs/canonical/16 §28: state the
      // absence, never return an empty map.
      distribution:
        distributionClaims.length > 0
          ? {
              state: "READY",
              entries: distributionClaims.map(toDistributionEntry),
              reason_code: null,
              surface: eligibility,
            }
          : emptyDistribution("UNAVAILABLE", "NO_COMPLETE_REGIONAL_UNIVERSE", eligibility),
      // An exact surname wins outright, so there is nothing to suggest
      // (docs/canonical/13 §32.3).
      suggestions: null,
      meaning: meaningSection,
    },
  };
}
