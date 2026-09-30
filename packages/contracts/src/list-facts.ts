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
 * Shares, probabilities and expectations are stored rounded to 9 decimals,
 * never to display precision (shares and probabilities as fractions in
 * [0, 1]); counts are exact integers. Rounding for display is presentation.
 * Every decision against one half (`n_half`) is taken on the unrounded chance.
 */
export const LIST_FACTS_SCHEMA_VERSION = "list_facts@1" as const;

const fraction = z.number().min(0).max(1);
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

/** True when `key` strictly rises along `items`: sorted ascending, no duplicates. */
function strictlyAscending<T>(items: readonly T[], key: (item: T) => number): boolean {
  let previous = -Infinity;
  for (const item of items) {
    const value = key(item);
    if (!(value > previous)) return false;
    previous = value;
  }
  return true;
}

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
  /**
   * The source's dataset page on dane.gov.pl (the registry's
   * `homepage_or_reference_url`, the same page for both lists): the link a
   * reader can follow (ADR-0012).
   */
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
  /** Ascending by `at_least`, no duplicates. */
  thresholds: z
    .array(listThresholdSchema)
    .min(1)
    .refine((items) => strictlyAscending(items, (t) => t.at_least), {
      message: "thresholds must be ascending by at_least, with no duplicates",
    }),
  /** Ascending by `q`, no duplicates; likewise `person_quantiles`. */
  surname_quantiles: z
    .array(listQuantileSchema)
    .min(1)
    .refine((items) => strictlyAscending(items, (q) => q.q), {
      message: "surname_quantiles must be ascending by q, with no duplicates",
    }),
  person_quantiles: z
    .array(listQuantileSchema)
    .min(1)
    .refine((items) => strictlyAscending(items, (q) => q.q), {
      message: "person_quantiles must be ascending by q, with no duplicates",
    }),
});

/** One point of the shared-surname curve: n people, chance that two or more share a surname. */
export const collisionPointSchema = z.object({ n: positiveInt, p: fraction });

export const listCollisionSchema = z.object({
  method_version: z.string().min(1),
  /** The model, stated on the page: people drawn at random, without replacement, from this list. */
  model: z.literal("RANDOM_PEOPLE_WITHOUT_REPLACEMENT"),
  /** P(at least two of n share a surname) for n = 2 … curve_max: ascending in n, no duplicates. */
  curve: z
    .array(collisionPointSchema)
    .min(2)
    .refine((points) => strictlyAscending(points, (point) => point.n), {
      message: "curve must be ascending in n, with no duplicates",
    }),
  /**
   * The smallest n at which that chance, unrounded, reaches one half. The
   * next two are the curve's stored (rounded) p at `n_half` and `n_half - 1`;
   * so the latter can read 0.5 when the unrounded chance there is just below.
   */
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

/** The reach sets: the list's 1, 10 and 100 most common surnames (unnamed). */
const REACH_SETS = ["TOP_1", "TOP_10", "TOP_100"] as const;

/** How many random people until one of them, with even chance, carries a surname from a set. */
export const reachHalfSchema = z.object({
  /** The set: the list's 1, 10 or 100 most common surnames (unnamed). */
  set: z.enum(REACH_SETS),
  /** Share of the list's people who carry a surname from the set. */
  share_of_people: fraction,
  /** Smallest n whose chance, unrounded, is at least one half; that chance, rounded. */
  n_half: positiveInt,
  p_at_n_half: fraction,
});

export const listCrowdSchema = z
  .object({
    method_version: z.string().min(1),
    model: z.literal("RANDOM_PEOPLE_WITHOUT_REPLACEMENT"),
    /** Ascending in n, no duplicates. */
    expected_distinct: z
      .array(expectedDistinctSchema)
      .min(1)
      .refine((entries) => strictlyAscending(entries, (entry) => entry.n), {
        message: "expected_distinct must be ascending in n, with no duplicates",
      }),
    /** The crowd size the next two figures are for. */
    crowd_size: positiveInt,
    /** Expected share of the crowd whose surname nobody else in the crowd carries. */
    share_without_namesake: fraction,
    /** Exactly one entry for each of TOP_1, TOP_10 and TOP_100. */
    reach_half: z
      .array(reachHalfSchema)
      .length(3)
      .refine(
        (entries) =>
          REACH_SETS.every((set) => entries.filter((entry) => entry.set === set).length === 1),
        { message: "reach_half must hold TOP_1, TOP_10 and TOP_100 once each" },
      ),
    /** One seeded example crowd: its distinct count, its loners and its shared-surname group sizes. */
    example: z.object({
      seed: nonNegativeInt,
      n: positiveInt,
      distinct: positiveInt,
      without_namesake: nonNegativeInt,
      /** Sizes of the groups of two or more people sharing a surname, largest first. */
      group_sizes: z.array(z.number().int().min(2)),
    }),
  })
  .refine((crowd) => crowd.expected_distinct.some((entry) => entry.n === crowd.crowd_size), {
    message: "expected_distinct must carry an entry for crowd_size, the crowd the page describes",
  });

export const listFactsSchema = z.object({
  partition: listPartitionSchema,
  source: listSourceSchema,
  assessment: listAssessmentSchema,
  summary: listSummarySchema,
  collision: listCollisionSchema,
  crowd: listCrowdSchema,
});

/**
 * The model parameters of one list's figures. Both lists must use the same
 * ones, so a figure of one list is never read with a parameter of the other.
 */
function modelParameters(list: z.infer<typeof listFactsSchema>): string {
  return JSON.stringify({
    crowd_size: list.crowd.crowd_size,
    curve_n: list.collision.curve.map((point) => point.n),
    example_rooms: list.collision.example_rooms.first_pair_at.length,
    expected_distinct_n: list.crowd.expected_distinct.map((entry) => entry.n),
    thresholds: list.summary.thresholds.map((threshold) => threshold.at_least),
    surname_quantiles: list.summary.surname_quantiles.map((quantile) => quantile.q),
    person_quantiles: list.summary.person_quantiles.map((quantile) => quantile.q),
  });
}

export const listFactsArtefactSchema = z
  .object({
    schema_version: z.literal(LIST_FACTS_SCHEMA_VERSION),
    /** The script that wrote the artefact, repository-relative. */
    generated_by: z.string().min(1),
    /** The version of the pipeline that wrote it (`list_facts_pipeline@…`); not the schema's. */
    pipeline_version: z.string().min(1),
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
  )
  .refine(
    (a) =>
      a.lists.male.source.external_record_id !== a.lists.female.source.external_record_id &&
      a.lists.male.source.sha256 !== a.lists.female.source.sha256,
    { message: "the two lists must come from two resources: different ids and different SHA-256" },
  )
  .refine((a) => modelParameters(a.lists.male) === modelParameters(a.lists.female), {
    message:
      "both lists must use the same model parameters: crowd_size, the curve's n, the number " +
      "of example rooms, expected_distinct's n, thresholds' at_least and quantiles' q",
  });

export type ListPartition = z.infer<typeof listPartitionSchema>;
export type ListFacts = z.infer<typeof listFactsSchema>;
export type ListFactsArtefact = z.infer<typeof listFactsArtefactSchema>;
