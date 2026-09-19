/**
 * Surname result read contract (TASK-006).
 *
 * The repository's first accepted API contract. Canonical semantics live in
 * `docs/canonical/16`; this module is the runtime schema those semantics are
 * expressed in, and the single source of the types both sides use
 * (`ARCHITECTURE.md` §6, `docs/canonical/16` §1.3).
 *
 * Scope is deliberately one fact. There is no chapter framework, no
 * pagination, no rarity or rank placeholder, and no field whose only purpose
 * is a later task (`AGENTS.md` §6).
 *
 * ── One recorded deviation ──────────────────────────────────────────────
 *
 * `docs/canonical/16` §26 fixes the population unit as the single literal
 * `"PEOPLE"`. **ADR-0004** (`docs/adr/0004-population-value-unit.md`) widens
 * it, because the PESEL publisher describes *"liczba wystąpień"* —
 * occurrences — and never states that one occurrence is one living person
 * (TASK-004 §14 U-4, still open). Emitting `"PEOPLE"` here would publish an
 * assertion the truth layer beneath is forbidden to make.
 */
import { z } from "zod";

/** Response schema version, distinct from the API version (`docs/canonical/16` §5). */
export const SURNAME_RESULT_SCHEMA_VERSION = "1.0";

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

/** ADR-0004. `PEOPLE` is unused until TASK-004 §14 U-4 is answered. */
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
  })
  .refine((r) => (r.status === "RESOLVED" ? r.surname !== null : r.surname === null), {
    message: "surname identity is present exactly when status is RESOLVED",
  })
  .refine((r) => (r.status === "RESOLVED" ? r.population !== null : r.population === null), {
    message: "population section is present exactly when status is RESOLVED",
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
export type PublicSurnameIdentity = z.infer<typeof publicSurnameIdentitySchema>;
export type ResultStatus = z.infer<typeof resultStatusSchema>;
export type SurnameResultResponse = z.infer<typeof surnameResultResponseSchema>;
export type SurnameResultRequest = z.infer<typeof surnameResultRequestSchema>;
export type PublicErrorCode = z.infer<typeof publicErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
