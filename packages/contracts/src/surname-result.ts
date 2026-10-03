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
 * `rarity`, TASK-012 `distribution`, TASK-016 `suggestions` and TASK-051 `change`; there is still no chapter framework, no
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
/**
 * 1.7 adds `change` (TASK-051, ADR-0020) and 1.8 adds `archive` (TASK-054).
 * TASK-054 reached `main` first, as 1.8, while TASK-051 was still open as 1.7,
 * so 1.9 is the first version on `main` that carries both. 1.10 adds
 * `neighbours` and `other_form` (TASK-055, ADR-0025). 1.12 adds `bearers`
 * (TASK-073, ADR-0030); 1.11 is `localities`, open in #70 and #77 when this
 * was written (`AGENTS.md` §11).
 */
export const SURNAME_RESULT_SCHEMA_VERSION = "1.12";

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
  /**
   * When Name Atlas retrieved the record (ISO 8601). Added in 1.5 (TASK-023).
   * Distinct from `publication_date` and from the observation's own
   * `snapshot_date`: three dates, three meanings, never inferred from one
   * another (directive §37).
   */
  retrieved_at: z.string().min(1).nullable(),
  /**
   * The public web page of the source the record was taken from — for PESEL,
   * the dataset's page on dane.gov.pl — from the source registry. Added in 1.6
   * (ADR-0012). `url` stays the exact resource retrieved, which for a dataset
   * is a file download, not a page a reader should be sent to.
   */
  source_page_url: z.string().min(1).nullable(),
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
 * `SURNAME_DISTRIBUTION_SHIFT` — one surname's count on the editions of one
 * list (TASK-051, ADR-0020).
 *
 * A point is one edition. A `KNOWN` point carries the count and the edition's
 * own published total of people, so one in X is over that edition's total and
 * a surname's count is never shown without the list that grew around it. A
 * `NOT_ON_LIST` point has no count field at all and is `strict`, so a payload
 * that puts `count: 0` on it fails validation: a surname a list does not name
 * is below the publisher's floor of 2 or absent, never zero.
 */
export const changeListSchema = z.enum(["MALE", "FEMALE"]);

const changeDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

/** `UNIVERSE_DESCRIPTION_DIFFERS`: the 2019 files describe their universe in fewer words (ADR-0020 §2.2). */
export const changeNoteCodeSchema = z.enum(["UNIVERSE_DESCRIPTION_DIFFERS"]);

export const changePointSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("KNOWN"),
    data_date: changeDateSchema,
    note_code: changeNoteCodeSchema.nullable(),
    /** The edition's own resource, where the reader can fetch it. */
    source_url: z.string().min(1).nullable(),
    count: z.number().int().positive(),
    /** The sum of every published count on that edition: what one in X is over. */
    list_total: z.number().int().positive(),
    one_in_x: z.number().int().positive(),
    share: z.number().positive().max(1),
  }),
  z
    .object({
      status: z.literal("NOT_ON_LIST"),
      data_date: changeDateSchema,
      note_code: changeNoteCodeSchema.nullable(),
      source_url: z.string().min(1).nullable(),
    })
    .strict(),
]);

/** A resource the publisher lists in the series that is not an edition (the women's 2022 file repeats 2021). */
export const changeGapSchema = z.object({
  data_date: changeDateSchema,
  reason_code: z.literal("PUBLISHER_DUPLICATE"),
});

export const changeEndSchema = z.object({
  data_date: changeDateSchema,
  count: z.number().int().positive(),
  list_total: z.number().int().positive(),
});

export const changeSummarySchema = z.object({
  known_points: z.number().int().min(2),
  first: changeEndSchema,
  last: changeEndSchema,
  /** Signed, per cent, one decimal, half away from zero. The count's change. */
  count_change_percent: z.number(),
  /** The same for the list's total of people: what the count changed beside. */
  list_change_percent: z.number(),
});

export const changeEntrySchema = z
  .object({
    list: changeListSchema,
    /** Ascending by date. At least two are `KNOWN`: one edition is a count, not a change. */
    points: z.array(changePointSchema).min(2),
    /** Only gaps between the first and the last known point. */
    gaps: z.array(changeGapSchema),
    summary: changeSummarySchema,
    methodology_code: z.string().min(1),
    scope_label_code: z.string().min(1),
    country_code: z.string().min(2),
    confidence: confidenceSchema,
    citation: citationSchema,
  })
  .refine(
    (e) => e.points.every((p, i) => i === 0 || p.data_date > (e.points[i - 1]?.data_date ?? "")),
    {
      message: "points must be in strictly ascending order of date",
    },
  )
  .refine(
    (e) => {
      const known = e.points.filter((p) => p.status === "KNOWN");
      const first = known[0];
      const last = known.at(-1);
      return (
        first?.status === "KNOWN" &&
        last?.status === "KNOWN" &&
        e.summary.known_points === known.length &&
        e.summary.first.data_date === first.data_date &&
        e.summary.first.count === first.count &&
        e.summary.first.list_total === first.list_total &&
        e.summary.last.data_date === last.data_date &&
        e.summary.last.count === last.count &&
        e.summary.last.list_total === last.list_total
      );
    },
    { message: "summary must describe the first and the last known point, and count them" },
  )
  .refine((e) => e.points.every((p) => p.status !== "KNOWN" || p.count <= p.list_total), {
    message: "a count can never exceed its own list's total",
  })
  .refine(
    (e) =>
      e.points.every(
        (p) =>
          p.status !== "KNOWN" ||
          (p.one_in_x === Math.floor(p.list_total / p.count + 0.5) &&
            p.share === Number((p.count / p.list_total).toFixed(9))),
      ),
    { message: "one in X and the share must follow the point's own count and list total" },
  )
  .refine(
    (e) => {
      const { first, last, count_change_percent: c, list_change_percent: l } = e.summary;
      // A change of exactly 0.0 per cent means the values differ by less than
      // 0.05% of the start (half away from zero to one decimal): 2000·|Δ| < start.
      const agrees = (percent: number, from: number, to: number): boolean =>
        percent === 0 ? 2000 * Math.abs(to - from) < from : percent > 0 ? to > from : to < from;
      return agrees(c, first.count, last.count) && agrees(l, first.list_total, last.list_total);
    },
    { message: "each change's sign must agree with its own first and last values" },
  )
  .refine(
    (e) => {
      const known = e.points.filter((p) => p.status === "KNOWN");
      const from = known[0]?.data_date ?? "";
      const to = known.at(-1)?.data_date ?? "";
      return e.gaps.every((g) => g.data_date > from && g.data_date < to);
    },
    { message: "a gap is reported only between the first and the last known point" },
  );

/**
 * The change-over-time chapter: one entry per list the surname is on at two
 * or more stored editions (TASK-051). `UNAVAILABLE` says why — fewer than two
 * editions, not derived yet — and is never an empty chart.
 */
export const changeSectionSchema = z
  .object({
    state: populationStateSchema,
    /** Empty unless `state` is `READY`. */
    entries: z.array(changeEntrySchema),
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
 * `SURNAME_MEANING` — one work's interpretation (TASK-022, ADR-0008).
 *
 * `work` is not optional and `locator` is not optional. ADR-0008 §4 makes a
 * meaning admissible only if a reader can go and check it, and a gloss without
 * a citable work and a place in that work is exactly what this product must
 * never publish.
 */
export const meaningInterpretationSchema = z.object({
  /** The proposed lexical root, where the work proposes one. Never inferred. */
  root_form: z.string().min(1).nullable(),
  root_language: z.string().min(1).nullable(),
  /** The work's own short gloss, carried verbatim. */
  literal_gloss: z.string().min(1),
  formation_type: z.enum([
    "PATRONYMIC",
    "TOPONYMIC",
    "OCCUPATIONAL",
    "DESCRIPTIVE",
    "OTHER",
    "UNKNOWN",
  ]),
  work: z.object({
    title: z.string().min(1),
    author_or_publisher: z.string().min(1),
    year: z.number().int(),
  }),
  /** Page, entry number or column within the work. */
  locator: z.string().min(1),
});

/**
 * Why a meaning section is in the state it is.
 *
 * `NO_SOURCED_MEANING` is the state ADR-0008 §3 makes a first-class result: it
 * is not an omitted field and not an empty list, and it is the honest answer
 * for every surname no admissible onomastic work covers. `RIGHTS_BLOCKED`
 * carries no interpretation text at all — omitted, not sent and hidden.
 */
export const meaningStateSchema = z.enum([
  "AVAILABLE",
  "NO_SOURCED_MEANING",
  "RIGHTS_BLOCKED",
  "UNAVAILABLE",
]);

/**
 * `docs/canonical/11` §8 types `SURNAME_MEANING` as an `INTERPRETATION` with
 * LIKELY/POSSIBLE/CONFLICTING confidence. `VERIFIED` is deliberately absent
 * here: an interpretation of a name's origin is not a measurement, and
 * ADR-0008 §5 makes it unreachable in the derivation too.
 */
export const meaningConfidenceSchema = z.enum([
  "LIKELY",
  "POSSIBLE",
  "CONFLICTING",
  "INSUFFICIENT_DATA",
]);

export const meaningSectionSchema = z
  .object({
    state: meaningStateSchema,
    /**
     * Every admissible interpretation, never merged and never ranked. Two works
     * proposing different roots both appear, and `confidence` is `CONFLICTING`.
     */
    interpretations: z.array(meaningInterpretationSchema),
    confidence: meaningConfidenceSchema.nullable(),
    /** `assessment_method@assessment_version`. Added in 1.5; present exactly when AVAILABLE. */
    methodology_code: z.string().min(1).nullable(),
    reason_code: z.string().min(1).nullable(),
    surface: surfaceEligibilitySchema,
  })
  .refine(
    (s) =>
      s.state === "AVAILABLE" ? s.interpretations.length > 0 : s.interpretations.length === 0,
    { message: "interpretations are present exactly when state is AVAILABLE" },
  )
  .refine((s) => (s.state === "AVAILABLE") === (s.confidence !== null), {
    message: "confidence is present exactly when state is AVAILABLE",
  })
  .refine((s) => (s.state === "AVAILABLE") === (s.methodology_code !== null), {
    message: "methodology_code is present exactly when state is AVAILABLE",
  })
  .refine((s) => (s.state === "AVAILABLE") === (s.reason_code === null), {
    message: "a reason code is present exactly when state is not AVAILABLE",
  });

/** A labelled count, largest first: a category, a place, a language. */
export const archiveCountSchema = z.object({
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
});

/** Pages published in one period. Years inclusive; null is open-ended. */
export const archivePeriodSchema = z.object({
  from_year: z.number().int().nullable(),
  to_year: z.number().int().nullable(),
  count: z.number().int().nonnegative(),
});

/**
 * One page quoted from a public-domain work (ADR-0024 §2.4). The excerpt is the
 * source's OCR text, at most 300 characters (`TRANSCRIPTION_EXCERPT_MAX_CHARS`).
 */
export const archiveExampleSchema = z.object({
  title: z.string().min(1),
  /** The work's date as the catalogue states it, unparsed. */
  date: z.string().min(1).nullable(),
  page_number: z.number().int().positive(),
  excerpt: z.string().min(1).max(300),
  url: z.string().url(),
});

export const archiveStateSchema = z.enum([
  "READY",
  /** The surname has not been searched yet. Never a count of zero. */
  "NOT_SEARCHED",
  "RIGHTS_BLOCKED",
  "UNAVAILABLE",
]);

/**
 * What a digital library's search returns for the surname (TASK-054,
 * ADR-0024): an `ARCHIVE_AVAILABILITY` claim (`docs/canonical/11` §11).
 *
 * Every count is a count of **search matches for a word**, in any inflected
 * form, within the searched scope: catalogue records of every licence, and
 * pages of works that are not copyright-protected. Never people, ancestors or
 * verified occurrences of the surname. A READY section with zero matches is an
 * answer ("no matches"); NOT_SEARCHED is the absence of one.
 */
export const archiveSectionSchema = z
  .object({
    state: archiveStateSchema,
    /** The query as sent, quotes included. */
    query: z.string().min(1).nullable(),
    /** When the search ran (ISO 8601 date). */
    searched_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u)
      .nullable(),
    catalogue_records: z.number().int().nonnegative().nullable(),
    catalogue_by_category: z.array(archiveCountSchema),
    pages: z.number().int().nonnegative().nullable(),
    pages_by_period: z.array(archivePeriodSchema),
    pages_by_place: z.array(archiveCountSchema),
    examples: z.array(archiveExampleSchema).max(3),
    confidence: confidenceSchema.nullable(),
    citation: citationSchema.nullable(),
    reason_code: z.string().min(1).nullable(),
    surface: surfaceEligibilitySchema,
  })
  .refine(
    (a) =>
      (a.state === "READY") ===
      (a.query !== null &&
        a.searched_on !== null &&
        a.catalogue_records !== null &&
        a.pages !== null &&
        a.confidence !== null &&
        a.citation !== null),
    { message: "query, date, counts, confidence and citation are present exactly when READY" },
  )
  .refine((a) => (a.state === "READY") === (a.reason_code === null), {
    message: "reason_code is null exactly when READY",
  })
  .refine(
    (a) =>
      a.state === "READY" ||
      (a.catalogue_by_category.length === 0 &&
        a.pages_by_period.length === 0 &&
        a.pages_by_place.length === 0 &&
        a.examples.length === 0),
    { message: "a section that is not READY carries no figures" },
  )
  .refine(
    (a) =>
      a.state === "READY" ||
      (a.query === null &&
        a.searched_on === null &&
        a.catalogue_records === null &&
        a.pages === null &&
        a.confidence === null &&
        a.citation === null),
    { message: "a section that is not READY carries no search, count or source" },
  );

/** One person Wikidata names with the surname (TASK-073, ADR-0030). */
export const bearerSchema = z.object({
  /** The Wikidata id, `Q…`. */
  wikidata_id: z.string().regex(/^Q[1-9][0-9]*$/u),
  /** The name as Wikidata labels the person. */
  name: z.string().min(1),
  /** Wikidata's one-line description, in Polish and in English, where it has one. */
  description_pl: z.string().min(1).max(200).nullable(),
  description_en: z.string().min(1).max(200).nullable(),
  /** Years as Wikidata states them. A null `died` is not "living": it may just not be recorded. */
  born: z.number().int().nullable(),
  died: z.number().int().nullable(),
  /** The person's article in the Polish Wikipedia, else the English one. */
  article_url: z.string().url().nullable(),
  wikidata_url: z.string().url(),
});

export const bearersStateSchema = z.enum([
  "READY",
  /** Wikidata has not been asked about this surname yet. Never a count of zero. */
  "NOT_SEARCHED",
  "RIGHTS_BLOCKED",
  "UNAVAILABLE",
]);

/**
 * Known people with the surname (TASK-073, ADR-0030): a `NOTABLE_BEARERS`
 * claim. People whose own name, in Wikidata, ends with exactly this surname
 * and who have an article in at least one Wikipedia: Polish citizens first,
 * then the most widely written about. Sharing a surname says nothing about family. A READY section
 * with a total of zero is an answer; NOT_SEARCHED is the absence of one.
 *
 * `people` is as long as the surface allows (the free page lists three, the
 * paid report all the claim keeps); `more` is how many the count holds beyond
 * them.
 */
export const bearersSectionSchema = z
  .object({
    state: bearersStateSchema,
    searched_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u)
      .nullable(),
    total: z.number().int().nonnegative().nullable(),
    with_death_date: z.number().int().nonnegative().nullable(),
    people: z.array(bearerSchema),
    more: z.number().int().nonnegative().nullable(),
    confidence: confidenceSchema.nullable(),
    citation: citationSchema.nullable(),
    reason_code: z.string().min(1).nullable(),
    surface: surfaceEligibilitySchema,
  })
  .refine(
    (b) =>
      (b.state === "READY") ===
      (b.searched_on !== null &&
        b.total !== null &&
        b.with_death_date !== null &&
        b.more !== null &&
        b.confidence !== null &&
        b.citation !== null),
    { message: "date, counts, confidence and citation are present exactly when READY" },
  )
  .refine((b) => (b.state === "READY") === (b.reason_code === null), {
    message: "reason_code is null exactly when READY",
  })
  .refine((b) => b.state === "READY" || b.people.length === 0, {
    message: "a section that is not READY names nobody",
  })
  .refine(
    (b) =>
      b.state === "READY" ||
      (b.searched_on === null &&
        b.total === null &&
        b.with_death_date === null &&
        b.more === null &&
        b.confidence === null &&
        b.citation === null),
    { message: "a section that is not READY carries no date, count or source" },
  )
  .refine(
    (b) =>
      b.state !== "READY" ||
      (b.total !== null &&
        b.with_death_date !== null &&
        b.with_death_date <= b.total &&
        b.people.length + (b.more ?? 0) === b.total),
    { message: "the people listed and the more beyond them add up to the total" },
  );

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

/** One surname on a list near the surname asked about (TASK-055). */
export const neighbourEntrySchema = z.object({
  surname: publicSurnameIdentitySchema,
  rank: z.number().int().positive(),
  count: z.number().int().positive(),
  /** The surname the response is about. Exactly one entry per list. */
  is_self: z.boolean(),
});

/**
 * One list's neighbourhood: the surname, and up to two surnames ranked above
 * it and two below, by rank then canonical key. Read from active
 * `CURRENT_RANK` claims, never computed by a surface (ADR-0025 §2.4).
 */
export const neighbourListSchema = z
  .object({
    comparability_group: z.string().min(1),
    snapshot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    entries: z.array(neighbourEntrySchema).min(1).max(5),
  })
  .refine((l) => l.entries.filter((e) => e.is_self).length === 1, {
    message: "exactly one entry is the surname itself",
  })
  .refine((l) => l.entries.every((e, i) => i === 0 || e.rank >= (l.entries[i - 1]?.rank ?? 0)), {
    message: "entries run from the best rank down",
  })
  .refine(
    (l) =>
      l.entries.every(
        (e, i) => i === 0 || e.count <= (l.entries[i - 1]?.count ?? Number.POSITIVE_INFINITY),
      ),
    { message: "a worse rank never has a larger count" },
  );

export const neighboursStateSchema = z.enum(["READY", "UNAVAILABLE", "RIGHTS_BLOCKED"]);

/** Added in 1.10 (TASK-055). It follows the rights of the rarity section's rank claims. */
export const neighboursSectionSchema = z
  .object({
    state: neighboursStateSchema,
    lists: z.array(neighbourListSchema),
    reason_code: z.string().min(1).nullable(),
    surface: surfaceEligibilitySchema,
  })
  .refine((n) => (n.state === "READY") === n.lists.length > 0, {
    message: "lists are present exactly when READY",
  })
  .refine((n) => (n.state === "READY") === (n.reason_code === null), {
    message: "reason_code is null exactly when READY",
  });

/**
 * The surname's other grammatical form (ADR-0025 §2.5): KOWALSKI and KOWALSKA.
 * A fixed -ski/-cki/-dzki rule over the register, with the other form's rank
 * and count on its own list. It states a form, never kinship.
 */
export const otherFormSchema = z.object({
  surname: publicSurnameIdentitySchema,
  rule_code: z.literal("ADJECTIVAL_SKI_CKI_DZKI"),
  comparability_group: z.string().min(1),
  snapshot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  rank: z.number().int().positive(),
  count: z.number().int().positive(),
  surface: surfaceEligibilitySchema,
});

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
    /**
     * Added in 1.4 (TASK-022). Present exactly when RESOLVED, like the other
     * fact sections — and carrying `NO_SOURCED_MEANING` rather than being
     * absent when no admissible onomastic work covers the surname, which is
     * the answer for every surname until a source is imported (ADR-0008 §3).
     */
    meaning: meaningSectionSchema.nullable(),
    /**
     * Added in 1.9 (TASK-051, ADR-0020; 1.7 on its own branch). Present exactly when RESOLVED, like the
     * other fact sections, and stating its own absence (`NOT_ENOUGH_EDITIONS`,
     * `NOT_DERIVED_YET`) rather than being omitted.
     */
    change: changeSectionSchema.nullable(),
    /**
     * Added in 1.8 (TASK-054). Present exactly when RESOLVED, like the other
     * fact sections, and `NOT_SEARCHED` rather than absent when the surname's
     * archive search has not run.
     */
    archive: archiveSectionSchema.nullable(),
    /** Added in 1.10 (TASK-055). Present exactly when RESOLVED. */
    neighbours: neighboursSectionSchema.nullable(),
    /**
     * Added in 1.12 (TASK-073). Present exactly when RESOLVED, and
     * `NOT_SEARCHED` rather than absent when Wikidata has not been asked.
     */
    bearers: bearersSectionSchema.nullable(),
    /** Added in 1.10 (TASK-055). Null unless RESOLVED, and null where no other form is paired. */
    other_form: otherFormSchema.nullable(),
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
  })
  .refine((r) => (r.status === "RESOLVED" ? r.meaning !== null : r.meaning === null), {
    message: "meaning section is present exactly when status is RESOLVED",
  })
  .refine((r) => (r.status === "RESOLVED" ? r.change !== null : r.change === null), {
    message: "change section is present exactly when status is RESOLVED",
  })
  .refine((r) => (r.status === "RESOLVED" ? r.archive !== null : r.archive === null), {
    message: "archive section is present exactly when status is RESOLVED",
  })
  .refine((r) => (r.status === "RESOLVED" ? r.neighbours !== null : r.neighbours === null), {
    message: "neighbours section is present exactly when status is RESOLVED",
  })
  .refine((r) => (r.status === "RESOLVED" ? r.bearers !== null : r.bearers === null), {
    message: "bearers section is present exactly when status is RESOLVED",
  })
  .refine((r) => r.status === "RESOLVED" || r.other_form === null, {
    message: "an other form is present only when status is RESOLVED",
  })
  .refine((r) => r.other_form === null || r.other_form.surname.id !== r.surname?.id, {
    message: "the other form is a different surname",
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
export type ChangeList = z.infer<typeof changeListSchema>;
export type ChangePoint = z.infer<typeof changePointSchema>;
export type ChangeGap = z.infer<typeof changeGapSchema>;
export type ChangeEntry = z.infer<typeof changeEntrySchema>;
export type ChangeSection = z.infer<typeof changeSectionSchema>;
export type PlaceStat = z.infer<typeof placeStatSchema>;
export type DistributionCoverageState = z.infer<typeof distributionCoverageStateSchema>;
export type DistributionEntry = z.infer<typeof distributionEntrySchema>;
export type DistributionSection = z.infer<typeof distributionSectionSchema>;
export type MeaningSection = z.infer<typeof meaningSectionSchema>;
export type ArchiveCount = z.infer<typeof archiveCountSchema>;
export type ArchivePeriod = z.infer<typeof archivePeriodSchema>;
export type ArchiveExample = z.infer<typeof archiveExampleSchema>;
export type ArchiveState = z.infer<typeof archiveStateSchema>;
export type ArchiveSection = z.infer<typeof archiveSectionSchema>;
export type Bearer = z.infer<typeof bearerSchema>;
export type BearersState = z.infer<typeof bearersStateSchema>;
export type BearersSection = z.infer<typeof bearersSectionSchema>;
export type NeighbourEntry = z.infer<typeof neighbourEntrySchema>;
export type NeighbourList = z.infer<typeof neighbourListSchema>;
export type NeighboursSection = z.infer<typeof neighboursSectionSchema>;
export type OtherForm = z.infer<typeof otherFormSchema>;
export type MeaningInterpretation = z.infer<typeof meaningInterpretationSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type SuggestionsSection = z.infer<typeof suggestionsSectionSchema>;
export type PublicSurnameIdentity = z.infer<typeof publicSurnameIdentitySchema>;
export type ResultStatus = z.infer<typeof resultStatusSchema>;
export type SurnameResultResponse = z.infer<typeof surnameResultResponseSchema>;
export type SurnameResultRequest = z.infer<typeof surnameResultRequestSchema>;
export type PublicErrorCode = z.infer<typeof publicErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
