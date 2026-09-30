import { z } from "zod";

/**
 * List facts — statistics about one whole published PESEL list
 * (`docs/contracts/list-facts.md`, ADR-0015, TASK-040).
 *
 * Every figure here describes **one** list: the national male list or the
 * national female list of one resource version. The two lists are two
 * universes. The artefact carries them side by side under separate keys and
 * nothing in it is a sum, a union or a comparison across them.
 *
 * No surname string crosses this boundary. A list fact is about the shape of
 * a list (how many people, how many surnames, how counts are spread), never
 * about a named surname: those are surname claims and stay in the claim chain.
 *
 * Numbers are stored unrounded (shares and probabilities as fractions in
 * [0, 1] with up to 9 decimals). Rounding for display is presentation.
 */
export const LIST_FACTS_SCHEMA_VERSION = "list_facts@1" as const;

const fraction = z.number().min(0).max(1);
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

/** Which published list a block describes. Never both. */
export const listPartitionSchema = z.enum(["national_male", "national_female"]);

/** Where the list's bytes came from, pinned to the registry. */
export const listSourceSchema = z.object({
  /** dane.gov.pl dataset id. */
  dataset_id: z.literal(1681),
  /** dane.gov.pl resource id, e.g. "1148808". */
  external_record_id: z.string().regex(/^\d+$/u),
  /** SHA-256 of the exact bytes the facts were computed from; equals the registry's. */
  sha256,
  /** Data rows in the file; equals the registry's official row count. */
  row_count: positiveInt,
  /** The register's reference date (`data_date`). */
  snapshot_date: isoDate,
  /** The resource page a reader can follow (ADR-0012). */
  source_page_url: z.string().url(),
});

/** How the numbers may be read, decided when the artefact was built. */
export const listAssessmentSchema = z.object({
  /** The completeness gate (`assessUniverseCompleteness`) passed on these bytes. */
  completeness: z.literal("COMPLETE"),
  /** `assessDerivedStatistic` on a complete, reproducible computation. */
  confidence_status: z.literal("VERIFIED"),
  confidence_method: z.string().min(1),
  confidence_version: z.string().min(1),
  /** `evaluateSurface(rights, "FREE")` for the source's rights profile. */
  free_surface: z.literal("ALLOWED"),
});

/** How many surnames have at least `at_least` bearers, and how many people carry them. */
export const listThresholdSchema = z.object({
  at_least: positiveInt,
  surnames: nonNegativeInt,
  people: nonNegativeInt,
});

/** The count at a quantile: of surnames, or of people (weighted by bearers). */
export const listQuantileSchema = z.object({
  /** Quantile as a fraction, e.g. 0.5 or 0.99. */
  q: fraction,
  count: positiveInt,
});

export const listSummarySchema = z.object({
  method_version: z.string().min(1),
  /** People counted on the list: the sum of its counts. A sum within one list. */
  people: positiveInt,
  /** Surnames on the list: its data rows. */
  surnames: positiveInt,
  /** The largest count on the list (its most common surname, unnamed). */
  max_count: positiveInt,
  /** The smallest count on the list. The publisher omits surnames with one bearer. */
  min_count: positiveInt,
  /** Median bearers per surname: half the surnames have at most this many. */
  median_count_per_surname: positiveInt,
  /**
   * Median over people: at least half the people carry a surname that has at
   * least this many bearers on the list (the upper weighted median).
   */
  median_count_per_person: positiveInt,
  thresholds: z.array(listThresholdSchema).min(1),
  surname_quantiles: z.array(listQuantileSchema).min(1),
  person_quantiles: z.array(listQuantileSchema).min(1),
});

/** One point of the shared-surname curve: n people, chance that two or more share a surname. */
export const collisionPointSchema = z.object({ n: positiveInt, p: fraction });

export const listCollisionSchema = z.object({
  method_version: z.string().min(1),
  /** The model, stated on the page: people drawn at random, without replacement, from this list. */
  model: z.literal("RANDOM_PEOPLE_WITHOUT_REPLACEMENT"),
  /** P(at least two of n share a surname) for n = 2 … curve_max. */
  curve: z.array(collisionPointSchema).min(2),
  /** The smallest n at which that chance reaches one half. */
  n_half: positiveInt,
  p_at_n_half: fraction,
  p_before_n_half: fraction,
  /** Two random people share a surname with chance 1 in this (rounded half up). */
  pair_one_in: positiveInt,
  /** Seeded example rooms: the position at which each room's first shared surname appeared. */
  example_rooms: z.object({
    seed: nonNegativeInt,
    first_pair_at: z.array(positiveInt).min(1),
    /** The first room in detail: seat numbers (1-based) of its first pair. */
    showcase_pair: z.tuple([positiveInt, positiveInt]),
  }),
});

/** Expected number of different surnames among n random people from the list. */
export const expectedDistinctSchema = z.object({ n: positiveInt, value: z.number().positive() });

/** How many random people until one of them, with even chance, carries a surname from a set. */
export const reachHalfSchema = z.object({
  /** The set: the list's 1, 10 or 100 most common surnames (unnamed). */
  set: z.enum(["TOP_1", "TOP_10", "TOP_100"]),
  /** Share of the list's people who carry a surname from the set. */
  share_of_people: fraction,
  /** Smallest n with chance at least one half; the chance at that n. */
  n_half: positiveInt,
  p_at_n_half: fraction,
});

export const listCrowdSchema = z.object({
  method_version: z.string().min(1),
  model: z.literal("RANDOM_PEOPLE_WITHOUT_REPLACEMENT"),
  expected_distinct: z.array(expectedDistinctSchema).min(1),
  /** The crowd size the next two figures are for. */
  crowd_size: positiveInt,
  /** Expected share of the crowd whose surname nobody else in the crowd carries. */
  share_without_namesake: fraction,
  reach_half: z.array(reachHalfSchema).length(3),
  /** One seeded example crowd: its distinct count, its loners and its shared-surname group sizes. */
  example: z.object({
    seed: nonNegativeInt,
    n: positiveInt,
    distinct: positiveInt,
    without_namesake: nonNegativeInt,
    /** Sizes of the groups of two or more people sharing a surname, largest first. */
    group_sizes: z.array(z.number().int().min(2)),
  }),
});

export const listFactsSchema = z.object({
  partition: listPartitionSchema,
  source: listSourceSchema,
  assessment: listAssessmentSchema,
  summary: listSummarySchema,
  collision: listCollisionSchema,
  crowd: listCrowdSchema,
});

export const listFactsArtefactSchema = z
  .object({
    schema_version: z.literal(LIST_FACTS_SCHEMA_VERSION),
    /** The script that wrote the artefact, repository-relative. */
    generated_by: z.string().min(1),
    snapshot_date: isoDate,
    /** A fixed model constant, not PESEL data: 23 people, 365 equally likely days. */
    birthday_reference: z.object({ n_half: positiveInt, p_at_n_half: fraction }),
    lists: z.object({ male: listFactsSchema, female: listFactsSchema }),
  })
  .refine((a) => a.lists.male.partition === "national_male", {
    message: "lists.male must describe the national male list",
  })
  .refine((a) => a.lists.female.partition === "national_female", {
    message: "lists.female must describe the national female list",
  })
  .refine(
    (a) =>
      a.lists.male.source.snapshot_date === a.snapshot_date &&
      a.lists.female.source.snapshot_date === a.snapshot_date,
    { message: "both lists must come from the artefact's snapshot date" },
  );

export type ListPartition = z.infer<typeof listPartitionSchema>;
export type ListFacts = z.infer<typeof listFactsSchema>;
export type ListFactsArtefact = z.infer<typeof listFactsArtefactSchema>;
