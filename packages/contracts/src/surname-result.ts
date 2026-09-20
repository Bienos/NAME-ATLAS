/**
 * Surname result read contract (TASK-006).
 *
 * The repository's first accepted API contract. Canonical semantics live in
 * `docs/canonical/16`; this module is the runtime schema those semantics are
 * expressed in, and the single source of the types both sides use
 * (`ARCHITECTURE.md` §6, `docs/canonical/16` §1.3).
 *
 * Scope grew one fact at a time and still carries no field whose only purpose
 * is a later task (`AGENTS.md` §6). TASK-006 added `population`, TASK-014
 * `rarity`, TASK-012 `distribution` and TASK-016 `suggestions`; there is still no chapter framework, no
 * pagination and no placeholder for a fact that has no truth chain behind it.
 *
 * ── One recorded deviation ──────────────────────────────────────────────
 *
 * `docs/canonical/16` §26 fixes the population unit as the single literal
 * `"PEOPLE"`. **ADR-0004** (`docs/adr/0004-population-value-unit.md`) widened
 * it to a two-member enum while TASK-004 §14 U-4 was open. U-4 was decided on
 * 2026-09-20 — the counted field is *nazwisko aktualne*, of which every living
 * person in PESEL has exactly one — so PESEL-derived values emit `"PEOPLE"`
 * again. `"SURNAME_OCCURRENCES"` stays in the enum for a source whose counted
 * field is not one-per-person.
 */
import { z } from "zod";

/** Response schema version, distinct from the API version (`docs/canonical/16` §5). */
export const SURNAME_RESULT_SCHEMA_VERSION = "1.3";

/**
 * `docs/canonical/16` §26. `value` is null for every status but `KNOWN`;
 * a suppressed or absent value is NEVER `{"value": 0}`.
 */
export const numericValueStatusSchema = z.enum([
  "KNOWN",
  "SUPPRESSED",
  "NOT_AVAILABLE",
  "NOT_APPLICABLE",
]);

/**
 * ADR-0004, as amended on 2026-09-20. PESEL emits `PEOPLE`;
 * `SURNAME_OCCURRENCES` remains for a source counting something else.
 */
export const populationUnitSchema = z.enum(["PEOPLE", "SURNAME_OCCURRENCES"]);

export const populationValueSchema = z
  .object({
    status: numericValueStatusSchema,
    value: z.number().int().positive().nullable(),
    unit: populationUnitSchema,
    /** Frontend-localised code for the publisher's universe. */
    scope_label_code: z.string().min(1),
  })
  .refine((v) => (v.status === "KNOWN" ? v.value !== null : v.value === null), {
    message: "value must be present exactly when status is KNOWN, and null otherwise",
  });

/**
 * `docs/canonical/16` §35. Status and method only — §35 says "Do not
 * transmit internal probability", and `docs/canonical/11` §10.3 marks the
 * assessment's `rationale` an internal explanation, "not final consumer
 * copy". Neither crosses this boundary.
 */
export const confidenceSchema = z.object({
  status: z.enum([
    "VERIFIED",
    "LIKELY",
    "POSSIBLE",
    "UNCONFIRMED",
    "CONFLICTING",
    "INSUFFICIENT_DATA",
  ]),
  methodology_code: z.string().min(1),
});

/**
 * `docs/canonical/16` §40. `url` may be absent where rights do not permit
 * linking. Nothing here is formatted prose — citation styling is downstream.
 */
export const citationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().min(1).nullable(),
  /** Source precision preserved, not reformatted. */
  publication_date: z.string().min(1).nullable(),
  source_type: z.string().min(1),
  locator: z.string().min(1).nullable(),
  url: z.string().min(1).nullable(),
  attribution: z.string().min(1).nullable(),
  terms: z.string().min(1).nullable(),
});

/** `docs/canonical/12` §6.3/§6.4, projected per surface. */
export const surfaceEligibilitySchema = z.object({
  surface: z.enum(["INTERNAL", "FREE", "PAID", "SEO"]),
  decision: z.enum(["ALLOWED", "CONDITIONAL", "BLOCKED"]),
  reason_code: z.string().min(1),
});

/**
 * One dated observation of a surname's population.
 *
 * A surname present in both PESEL resources yields two of these, with
 * different `comparability_group` values. `docs/canonical/11` §6.1 makes
 * that the gate on quantitative comparison: they must not be summed or
 * compared, and this contract exposes no total.
 */
export const populationObservationSchema = z.object({
  value: populationValueSchema,
  /** The dataset's own reference date. A count is never returned without it. */
  snapshot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  country_code: z.string().min(2),
  /** The publisher's verbatim universe wording, untranslated. */
  source_population_scope: z.string().min(1),
  coverage_notes: z.string().min(1).nullable(),
  comparability_group: z.string().min(1).nullable(),
  confidence: confidenceSchema,
  citation: citationSchema,
});

/**
 * `docs/canonical/16` §23's `SectionState`, narrowed to what this slice can
 * actually produce. `PROCESSING` and `PARTIAL` require a real async job and
 * are not reachable here.
 */
export const populationStateSchema = z.enum(["READY", "UNAVAILABLE", "RIGHTS_BLOCKED"]);

export const populationSectionSchema = z
  .object({
    state: populationStateSchema,
    /** Empty unless `state` is `READY`. */
    observations: z.array(populationObservationSchema),
    /** Why the section is not READY. Machine-readable; never consumer copy. */
    reason_code: z.string().min(1).nullable(),
    surface: surfaceEligibilitySchema,
  })
  .refine((s) => (s.state === "READY" ? s.observations.length > 0 : s.observations.length === 0), {
    message: "observations are present exactly when state is READY",
  });

/**
 * `docs/canonical/16` §27's `RarityDTO`, one entry per complete resource
 * version (TASK-014). `ONE_IN_X` is the primary metric; the rank in the same
 * universe is supporting when a `CURRENT_RANK` claim exists. Structured
 * metrics only — never an arbitrary "87/100", never a percentile this
 * slice has no method for, never an adjective.
 *
 * `universe_label_code` is what X is a share of: the *published universe*,
 * the sum of the published counts of one resource (U-6). A frontend renders
 * it as "of people counted in the register" / "osób ujętych w rejestrze",
 * never "of Poles".
 */
export const rarityMetricSchema = z.object({
  metric: z.enum(["ONE_IN_X", "RANK", "PERCENTILE"]),
  value: z.number().int().positive(),
});

export const rarityEntrySchema = z.object({
  primary: rarityMetricSchema,
  supporting: z.array(rarityMetricSchema),
  methodology_code: z.string().min(1),
  universe_label_code: z.string().min(1),
  /** The count behind X, with the same unit and scope as the population value. */
  numerator: z.number().int().positive(),
  /** The published-universe sum behind X. */
  denominator: z.number().int().positive(),
  /** `numerator / denominator`, nine places. */
  share: z.number().positive().max(1),
  scope_label_code: z.string().min(1),
  snapshot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  country_code: z.string().min(2),
  comparability_group: z.string().min(1).nullable(),
  confidence: confidenceSchema,
  citation: citationSchema,
});

export const raritySectionSchema = z
  .object({
    state: populationStateSchema,
    /** Empty unless `state` is `READY`. */
    entries: z.array(rarityEntrySchema),
    reason_code: z.string().min(1).nullable(),
    surface: surfaceEligibilitySchema,
  })
  .refine((s) => (s.state === "READY" ? s.entries.length > 0 : s.entries.length === 0), {
    message: "entries are present exactly when state is READY",
  });

/**
 * `docs/canonical/16` §28's `PlaceStatDTO`.
 *
 * **§28 references `PlaceStatDTO` but never defines its fields** (recorded in
 * `docs/contracts/surname-result.md`), so TASK-012 defines it here as the
 * smallest shape the geography chapter needs: which place, how many, and what
 * share of the covered set. No geometry and no `MapLayerDTO`: no place in the
 * schema has a centroid, and §28 forbids returning fabricated map features.
 *
 * `share_of_covered` is a share of the **covered set** — the surname's own sum
 * across the voivodeships the publisher listed for it. There is deliberately
 * no field for a share of the national count (TASK-012 §2, §8).
 */
export const placeStatSchema = z.object({
  place_id: z.string().uuid(),
  /** TERYT TERC code, e.g. "30". Null only where no external id is recorded. */
  terc_code: z.string().min(1).nullable(),
  display_name: z.string().min(1),
  count: z.number().int().positive(),
  /** `count / covered_count`, nine places. Never over the national count. */
  share_of_covered: z.number().positive().max(1),
});

/**
 * Whether a distribution may be presented as the surname's distribution
 * (TASK-012 §3). A scope property, never a confidence one.
 *
 * `COVERAGE_UNKNOWN` carries the same presentational obligation as
 * `LOW_COVERAGE`: not knowing what share of the bearers these places hold is
 * not a licence to present them as the whole.
 */
export const distributionCoverageStateSchema = z.enum([
  "READY",
  "LOW_COVERAGE",
  "COVERAGE_UNKNOWN",
]);

/**
 * One regional resource version's distribution for one surname.
 *
 * The refinements below are contract constraints, not conventions: a payload
 * whose denominator disagrees with its numerators, or whose coverage state
 * disagrees with its own ratio, fails validation rather than reaching a
 * surface.
 */
export const distributionEntrySchema = z
  .object({
    coverage_state: distributionCoverageStateSchema,
    /** Descending by count. Never padded to 16: an unlisted region has no entry. */
    regions: z.array(placeStatSchema).min(1),
    /** The surname's sum across `regions`. The denominator of every share. */
    covered_count: z.number().int().positive(),
    /** The same surname's count in the same partition's national resource. */
    national_count: z.number().int().positive().nullable(),
    /** `covered_count / national_count`, nine places, or null when unknown. */
    coverage_ratio: z.number().positive().max(1).nullable(),
    /** What that ratio is a ratio of, in words, on every entry. */
    coverage_basis: z.string().min(1),
    low_coverage_threshold: z.number().positive().max(1),
    universe_label_code: z.string().min(1),
    scope_label_code: z.string().min(1),
    snapshot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    country_code: z.string().min(2),
    comparability_group: z.string().min(1).nullable(),
    confidence: confidenceSchema,
    citation: citationSchema,
  })
  .refine((e) => e.regions.reduce((sum, r) => sum + r.count, 0) === e.covered_count, {
    message: "covered_count must equal the sum of regions[].count",
  })
  .refine((e) => (e.coverage_ratio === null) === (e.national_count === null), {
    message: "coverage_ratio is present exactly when national_count is",
  })
  .refine((e) => (e.coverage_ratio === null) === (e.coverage_state === "COVERAGE_UNKNOWN"), {
    message: "coverage_state is COVERAGE_UNKNOWN exactly when coverage_ratio is null",
  })
  .refine(
    (e) =>
      e.coverage_ratio === null ||
      e.coverage_ratio >= e.low_coverage_threshold === (e.coverage_state === "READY"),
    {
      message: "coverage_state must be READY exactly when coverage_ratio meets the threshold",
    },
  )
  .refine((e) => e.national_count === null || e.covered_count <= e.national_count, {
    message: "covered_count may never exceed national_count",
  });

/**
 * `docs/canonical/16` §28's geography chapter, one entry per complete regional
 * resource version (TASK-012). `state = UNAVAILABLE` where no approved current
 * regional source is complete — never an empty map, never zero-filled regions.
 */
export const distributionSectionSchema = z
  .object({
    state: populationStateSchema,
    /** Empty unless `state` is `READY`. */
    entries: z.array(distributionEntrySchema),
    reason_code: z.string().min(1).nullable(),
    surface: surfaceEligibilitySchema,
  })
  .refine((s) => (s.state === "READY" ? s.entries.length > 0 : s.entries.length === 0), {
    message: "entries are present exactly when state is READY",
  });

/**
 * `docs/canonical/16` §21, minus `canonical_slug`/`canonical_path`.
 *
 * Those are omitted deliberately (TASK-006 §15 U-2): no slug exists in the
 * schema, slug transliteration for Polish surnames is a real decision that
 * must not be confused with the identity-bearing diacritics of
 * `ARCHITECTURE.md` §10 invariant 8, and this slice ships no browser route
 * or SEO surface to consume them. Adding them later is additive.
 *
 * `id` is the surname UUID. Exposing it is explicitly what §18 prescribes:
 * display forms evolve, slugs collide, the UUID is stable.
 */
export const publicSurnameIdentitySchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().min(1),
  script: z.string().regex(/^[A-Z][a-z]{3}$/u),
});

/**
 * One surname the input might have meant (TASK-016, over TASK-015's retrieval).
 *
 * Identity, a match type and localisable explanation codes. Deliberately **no**
 * similarity, edit distance or rank score: `docs/canonical/16` §35 keeps
 * internal scores off the wire, and `docs/canonical/13` §24 is explicit that
 * those are diagnostic retrieval features and "not historical confidence". A
 * number here would invite a surface to render "91% match", which is a claim
 * this project does not make.
 */
export const suggestionSchema = z.object({
  surname: publicSurnameIdentitySchema,
  /** `docs/canonical/13` §31's `ResolutionMatchType`, narrowed to what exists. */
  match_type: z.literal("FUZZY_CANDIDATE"),
  /** e.g. `ADJACENT_TRANSPOSITION`, `EDIT_DISTANCE_1`. Localised downstream. */
  explanation_codes: z.array(z.string().min(1)).min(1),
});

/**
 * The suggestions section (`docs/canonical/13` §32.2, §32.4, §32.5).
 *
 * `decision_mode` is always `USER_CONFIRM` when suggestions are present. §32.2
 * is explicit — "Do not silently replace input" — and §33.4 forbids
 * auto-resolving on a fuzzy relation at any score. The refinements below make
 * that a schema rule rather than a convention: a payload claiming `AUTO`, or
 * claiming one outcome while carrying a different number of candidates, fails
 * validation instead of reaching a surface.
 */
export const suggestionsSectionSchema = z
  .object({
    state: z.enum(["READY", "UNAVAILABLE"]),
    /**
     * `SUGGESTION_REQUIRED` for a single candidate, `MULTIPLE_CANDIDATES` for
     * several. Null when the section is not READY.
     */
    outcome: z.enum(["SUGGESTION_REQUIRED", "MULTIPLE_CANDIDATES"]).nullable(),
    /** Never `AUTO`. Null when there is nothing to confirm. */
    decision_mode: z.literal("USER_CONFIRM").nullable(),
    /** Why there are none: INPUT_TOO_SHORT, NO_CANDIDATE_ABOVE_THRESHOLD, … */
    reason_code: z.string().min(1).nullable(),
    suggestions: z.array(suggestionSchema),
  })
  .refine((s) => (s.state === "READY" ? s.suggestions.length > 0 : s.suggestions.length === 0), {
    message: "suggestions are present exactly when state is READY",
  })
  .refine((s) => (s.state === "READY") === (s.outcome !== null), {
    message: "outcome is present exactly when state is READY",
  })
  .refine((s) => (s.state === "READY") === (s.decision_mode !== null), {
    message: "decision_mode is present exactly when state is READY",
  })
  .refine(
    (s) =>
      s.outcome === null || (s.outcome === "SUGGESTION_REQUIRED") === (s.suggestions.length === 1),
    {
      message:
        "SUGGESTION_REQUIRED carries exactly one suggestion; MULTIPLE_CANDIDATES carries more",
    },
  );

/**
 * Top-level resolution outcome.
 *
 * `UNRESOLVED` and `AMBIGUOUS` are **successful** responses, not errors
 * (`docs/canonical/16` §79: "Expected surname ambiguity/unresolved states
 * normally remain successful search response states"). Neither is ever a
 * count of zero.
 */
export const resultStatusSchema = z.enum(["RESOLVED", "UNRESOLVED", "AMBIGUOUS"]);

export const surnameResultResponseSchema = z
  .object({
    schema_version: z.literal(SURNAME_RESULT_SCHEMA_VERSION),
    status: resultStatusSchema,
    surname: publicSurnameIdentitySchema.nullable(),
    population: populationSectionSchema.nullable(),
    /** Added in 1.1 (TASK-014). Present exactly when RESOLVED, like population. */
    rarity: raritySectionSchema.nullable(),
    /** Added in 1.2 (TASK-012). Present exactly when RESOLVED, like the rest. */
    distribution: distributionSectionSchema.nullable(),
    /**
     * Added in 1.3 (TASK-016). Present exactly when `status` is **not**
     * `RESOLVED`: a resolved query needs no suggestion (an exact surname wins,
     * docs/canonical/13 §32.3), and both other outcomes are "we did not give
     * you a surname", where a client needs to know whether anything is on
     * offer and, if not, why. An `AMBIGUOUS` outcome always carries
     * `UNAVAILABLE` — several *exact* matches, or a mixed-script input that
     * §33.4 forbids resolving — and the reason code says which.
     */
    suggestions: suggestionsSectionSchema.nullable(),
  })
  .refine((r) => (r.status === "RESOLVED" ? r.surname !== null : r.surname === null), {
    message: "surname identity is present exactly when status is RESOLVED",
  })
  .refine((r) => (r.status === "RESOLVED" ? r.population !== null : r.population === null), {
    message: "population section is present exactly when status is RESOLVED",
  })
  .refine((r) => (r.status === "RESOLVED" ? r.rarity !== null : r.rarity === null), {
    message: "rarity section is present exactly when status is RESOLVED",
  })
  .refine((r) => (r.status === "RESOLVED" ? r.distribution !== null : r.distribution === null), {
    message: "distribution section is present exactly when status is RESOLVED",
  })
  .refine((r) => (r.status !== "RESOLVED") === (r.suggestions !== null), {
    message: "suggestions are present exactly when status is not RESOLVED",
  });

export const surnameResultRequestSchema = z.object({
  surname: z.string(),
  surface: z.enum(["INTERNAL", "FREE", "PAID", "SEO"]).default("FREE"),
});

/** `docs/canonical/16` §79. Only the codes this slice can emit. */
export const publicErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "INVALID_SURNAME_INPUT",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
]);

/** `docs/canonical/16` §78. Never carries a stack trace, SQL or file path. */
export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: publicErrorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
    request_id: z.string().min(1),
  }),
});

export type NumericValueStatus = z.infer<typeof numericValueStatusSchema>;
export type PopulationUnit = z.infer<typeof populationUnitSchema>;
export type PopulationValue = z.infer<typeof populationValueSchema>;
export type ConfidenceDto = z.infer<typeof confidenceSchema>;
export type CitationDto = z.infer<typeof citationSchema>;
export type SurfaceEligibilityDto = z.infer<typeof surfaceEligibilitySchema>;
export type PopulationObservation = z.infer<typeof populationObservationSchema>;
export type PopulationState = z.infer<typeof populationStateSchema>;
export type PopulationSection = z.infer<typeof populationSectionSchema>;
export type RarityMetric = z.infer<typeof rarityMetricSchema>;
export type RarityEntry = z.infer<typeof rarityEntrySchema>;
export type RaritySection = z.infer<typeof raritySectionSchema>;
export type PlaceStat = z.infer<typeof placeStatSchema>;
export type DistributionCoverageState = z.infer<typeof distributionCoverageStateSchema>;
export type DistributionEntry = z.infer<typeof distributionEntrySchema>;
export type DistributionSection = z.infer<typeof distributionSectionSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type SuggestionsSection = z.infer<typeof suggestionsSectionSchema>;
export type PublicSurnameIdentity = z.infer<typeof publicSurnameIdentitySchema>;
export type ResultStatus = z.infer<typeof resultStatusSchema>;
export type SurnameResultResponse = z.infer<typeof surnameResultResponseSchema>;
export type SurnameResultRequest = z.infer<typeof surnameResultRequestSchema>;
export type PublicErrorCode = z.infer<typeof publicErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
