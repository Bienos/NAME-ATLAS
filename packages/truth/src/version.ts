/**
 * Versioned method identifiers for the truth layer.
 *
 * Every derived artefact records the version of the method that produced it
 * (`docs/canonical/11` §10.1 `method_version`, §10.3 `assessment_version`),
 * so an assessment can be reproduced or invalidated deliberately rather than
 * by guesswork. Bump a version when its rule changes behaviour; never edit a
 * rule in place and leave the version alone.
 */

/** The `CURRENT_POPULATION` derivation method (TASK-005). */
export const CURRENT_POPULATION_METHOD_VERSION = "current_population@1";

/** The claim payload schema this method emits. */
export const CURRENT_POPULATION_PAYLOAD_VERSION = "current_population_payload@1";

/** The confidence rule implementing docs/canonical/14 §29's provisos. */
export const CONFIDENCE_ASSESSMENT_METHOD = "pesel_current_population_rule";
export const CONFIDENCE_ASSESSMENT_VERSION = "confidence@1";

/** The surface-eligibility evaluation (docs/canonical/12 §6.3/§6.4). */
export const SURFACE_ELIGIBILITY_VERSION = "surface_eligibility@1";

/** Orchestration version recorded on each ResearchRun. */
export const WORKFLOW_VERSION = "truth_chain_sync@1";

/** Schema version of the run's `raw_input` payload. */
export const RUN_INPUT_SCHEMA_VERSION = "run_input@1";

/** The `CURRENT_RANK` derivation method (TASK-009). */
export const CURRENT_RANK_METHOD_VERSION = "current_rank@1";

/** The rank claim payload schema this method emits. */
export const CURRENT_RANK_PAYLOAD_VERSION = "current_rank_payload@1";

/**
 * The confidence rule for a derived statistic. Deliberately distinct from
 * `CONFIDENCE_ASSESSMENT_METHOD`, so a source-native assessment and a derived
 * one are distinguishable in the data rather than only by the claim they hang
 * from (TASK-009 §9 AC-15).
 */
export const RANK_CONFIDENCE_ASSESSMENT_METHOD = "derived_statistic_rule";
export const RANK_CONFIDENCE_ASSESSMENT_VERSION = "derived_confidence@1";

/**
 * The ties policy, recorded on every rank claim because
 * `docs/canonical/12` §9.6 requires a rank to store one (TASK-009 §15 U-1).
 *
 * Competition ranking: tied counts share the lowest rank and the next
 * distinct count skips accordingly, giving 1, 2, 2, 4. It is the convention
 * a reader expects from a frequency table, and it keeps TASK-009 §10
 * invariant 4 exact — if count(A) > count(B) then rank(A) < rank(B) — which
 * dense ranking would also satisfy but ordinal ranking would not, since
 * ordinal would give two equal counts different ranks on an arbitrary
 * tiebreak.
 */
export const RANK_TIES_POLICY = "COMPETITION";

/** The universe a rank is computed within. Recorded on the claim payload. */
export const RANK_UNIVERSE_KIND = "SOURCE_RECORD_NATIONAL_VALUES";

/** The `RARITY_CONTEXT` derivation method (TASK-014). */
export const RARITY_CONTEXT_METHOD_VERSION = "rarity_context@1";

/** Shape version of the `RARITY_CONTEXT` claim payload. */
export const RARITY_CONTEXT_PAYLOAD_VERSION = "rarity_context_payload@1";

/**
 * The denominator's derivation: the sum of every published count on one
 * complete resource version (U-6, decided 2026-09-20). Not the register's
 * living-person total, which is unknown, and never GUS resident population,
 * which is a different universe.
 */
export const RARITY_DENOMINATOR_METHOD = "published_universe_sum";
export const RARITY_DENOMINATOR_VERSION = "published_universe_sum@1";
export const RARITY_DENOMINATOR_KIND = "PUBLISHED_UNIVERSE_SUM";

/** Frontend-localised code for what the denominator is a share of. */
export const RARITY_UNIVERSE_LABEL_CODE = "PESEL_PUBLISHED_UNIVERSE";

/** `one_in_x` is `denominator / count` rounded half up to an integer. */
export const RARITY_ROUNDING = "ROUND_HALF_UP";

/** The public methodology code canonical/16 §27's RarityDTO carries. */
export const RARITY_METHODOLOGY_CODE = "PESEL_PUBLISHED_UNIVERSE_SUM_V1";

/** The `CURRENT_DISTRIBUTION` derivation method (TASK-012). */
export const CURRENT_DISTRIBUTION_METHOD_VERSION = "current_distribution@1";

/** Shape version of the `CURRENT_DISTRIBUTION` claim payload. */
export const CURRENT_DISTRIBUTION_PAYLOAD_VERSION = "current_distribution_payload@1";

/** The universe a distribution is computed within: one regional resource version. */
export const DISTRIBUTION_UNIVERSE_KIND = "SOURCE_RECORD_REGIONAL_VALUES";

/**
 * The denominator every published share is taken over: the surname's **own**
 * sum across the voivodeships the publisher listed for it.
 *
 * Never the national count. TASK-012 §2 rejected that: the 16 voivodeships
 * account for 78.3% (male) and 80.2% (female) of the national totals and the
 * shortfall is biased by surname size, so a share of the national count would
 * report a surname like MELNYK — 210 placed of 6,442 registered — as nearly
 * absent from a country it is demonstrably present in.
 */
export const DISTRIBUTION_DENOMINATOR_METHOD = "covered_set_sum";
export const DISTRIBUTION_DENOMINATOR_VERSION = "covered_set_sum@1";
export const DISTRIBUTION_DENOMINATOR_KIND = "SURNAME_COVERED_SET_SUM";

/**
 * What `coverage_ratio` is a ratio of, carried on every claim so the figure
 * can never be read as a share of a population.
 *
 * It is the one comparison this project makes across comparability groups, and
 * `docs/canonical/11` §6.1 permits that only with explicit justification. The
 * justification is `nationalCounterpartOf`'s: same publisher, same partition,
 * same reference date, same counted field, same register; the regional
 * resource differs only by restricting to permanent registered residence. The
 * ratio therefore measures that restriction and nothing else.
 */
export const DISTRIBUTION_COVERAGE_BASIS =
  "covered_count / national_count, where covered_count is this surname's sum across the " +
  "voivodeships the regional resource lists for it and national_count is the same surname's " +
  "count in the same partition's national resource for the same reference date. It measures " +
  "how much of the surname's registered population has a permanent registered residence in " +
  "the published geography. It is NOT a share of any resident or national population.";

/** Frontend-localised code for what a distribution share is a share of. */
export const DISTRIBUTION_UNIVERSE_LABEL_CODE = "PESEL_REGISTERED_VOIVODESHIP_COVERED_SET";

/**
 * The coverage at or above which a distribution may be presented as the
 * surname's distribution (TASK-012 §3).
 *
 * 0.50 — a distribution built on fewer than half of a surname's bearers is not
 * a distribution of that surname. Recommended by TASK-012 §3 and adopted here
 * as the implemented default; it keeps NOWAK (0.884) `READY` and puts MELNYK
 * (0.033) in `LOW_COVERAGE`. The project owner may set it anywhere: this
 * constant is the only place it is written, and nothing else changes.
 */
export const DISTRIBUTION_LOW_COVERAGE_THRESHOLD = 0.5;

/** `share_of_covered` and `coverage_ratio` are both rounded to nine places. */
export const DISTRIBUTION_SHARE_PRECISION = 9;

/** The `SURNAME_MEANING` derivation method (TASK-022, ADR-0008). */
export const SURNAME_MEANING_METHOD_VERSION = "surname_meaning@1";

/** Shape version of the `SURNAME_MEANING` claim payload. */
export const SURNAME_MEANING_PAYLOAD_VERSION = "surname_meaning_payload@1";

/**
 * The confidence rule for an onomastic interpretation (ADR-0008 §5).
 *
 * Distinct from both the source-native rule and the derived-statistic rule,
 * because it counts **agreeing independent works** rather than assessing a
 * computation. Keeping the method identifiable in the data is the same reason
 * TASK-009 gave for separating its own (§9 AC-15).
 */
export const MEANING_CONFIDENCE_ASSESSMENT_METHOD = "onomastic_agreement_rule";
export const MEANING_CONFIDENCE_ASSESSMENT_VERSION = "onomastic_confidence@1";

/**
 * How two interpretations are judged to agree: same root form and same root
 * language, both compared case-insensitively after trimming.
 *
 * Deliberately strict. Two works proposing roots that merely look related is
 * not agreement, and treating it as such would manufacture a `LIKELY` out of
 * two `POSSIBLE`s.
 */
export const MEANING_AGREEMENT_BASIS = "identical root_form and root_language, case-insensitive";

// --- TASK-040, TASK-043: list facts (statistics about one whole published list)
//
// A list fact describes ONE published national list (male or female, one
// resource version): never a sum or union across the two
// (`docs/contracts/list-facts.md`, ADR-0015). ADR-0018 adds the one
// comparison allowed (`overlap`, counts of surnames) and the named selections,
// each at `NAMED_SURNAME_FLOOR` (`@name-atlas/contracts`) people or more.

/**
 * The list-facts pipeline: the gate, confidence and rights checks and the
 * methods below, run by `bin/build-list-facts.ts`. Recorded on the artefact as
 * `pipeline_version`; it is not the artefact's `schema_version` (`list_facts@2`).
 * `@2` (TASK-043) keeps each row's key and published string past the parser,
 * for the named selections and the overlap, and adds the eight methods below.
 */
export const LIST_FACTS_METHOD_VERSION = "list_facts_pipeline@2";

/** People, surnames, extremes, medians, thresholds and quantiles of one list. */
export const LIST_SUMMARY_METHOD_VERSION = "list_summary@1";

/** The shared-surname curve, n one half, the pair figure and the seeded example rooms. */
export const LIST_COLLISION_METHOD_VERSION = "list_collision@1";

/** Expected distinct surnames, the share without a namesake, reach-half and the example crowd. */
export const LIST_CROWD_METHOD_VERSION = "list_crowd@1";

/**
 * Stored shares and probabilities are rounded to nine decimal places with
 * `Number(x.toFixed(9))`, the rule `shareOf` and `DISTRIBUTION_SHARE_PRECISION`
 * already use. Expected counts are rounded the same way; the birthday reference
 * is rounded half up from its exact rational value to the same nine places.
 * Counts are exact integers and are never rounded. Every decision against one
 * half (`n_half` of the curve and of each reach set) is taken on the unrounded
 * chance; only the stored values are rounded.
 */
export const LIST_FACTS_PRECISION = 9;

/** `at_least` values of the summary's thresholds. */
export const LIST_SUMMARY_THRESHOLDS: readonly number[] = [2, 10, 20, 100, 1000, 10000, 50000];

/** Quantiles reported over surnames and over people; compared as exact thousandths, never as floats. */
export const LIST_SUMMARY_QUANTILES: readonly number[] = [0.5, 0.9, 0.99, 0.999];

/** The shared-surname curve runs from n = 2 to this n (or to the list's people, if fewer). */
export const LIST_COLLISION_CURVE_MAX = 300;

/** Seeded example rooms per list. */
export const LIST_EXAMPLE_ROOMS = 64;

/**
 * PRNG seeds (mulberry32). The rooms of the male list use 20260120 and of the
 * female list 20260121; each list's example crowd uses its room seed plus
 * {@link LIST_CROWD_SEED_OFFSET}.
 */
export const LIST_ROOM_SEEDS = { national_male: 20260120, national_female: 20260121 } as const;
export const LIST_CROWD_SEED_OFFSET = 1000;

/** Crowd sizes for the expected number of distinct surnames. */
export const LIST_CROWD_SIZES: readonly number[] = [100, 1000, 10000, 100000, 1000000];

/** The crowd the share without a namesake and the example crowd are for. */
export const LIST_CROWD_SIZE = 1000;

/** The sets reach-half is computed for: the list's k most common surnames, unnamed. */
export const LIST_REACH_SETS = [
  { set: "TOP_1", k: 1 },
  { set: "TOP_10", k: 10 },
  { set: "TOP_100", k: 100 },
] as const;

/** Every distinct count on the list with how many surnames have it (plate I's dots). */
export const LIST_DOTS_METHOD_VERSION = "list_dots@1";

/** The fewest most common surnames that carry a share q of the list's people. */
export const LIST_CONCENTRATION_METHOD_VERSION = "list_concentration@1";

/** Surnames and people per band of bearers, and the surnames under 10. */
export const LIST_BANDS_METHOD_VERSION = "list_bands@1";

/** Surnames and people whose key ends with each of the partition's fixed endings. */
export const LIST_ENDINGS_METHOD_VERSION = "list_endings@1";

/** Surnames and people by the first letter of the key, the top letter and the rarest Polish one. */
export const LIST_INITIALS_METHOD_VERSION = "list_initials@1";

/** Surnames and people whose key holds a hyphen, and ADR-0018 `HYPHENATED_TOP`. */
export const LIST_HYPHENATED_METHOD_VERSION = "list_hyphenated@1";

/** ADR-0018 `TOP_3`: the list's three most common surnames, named at or above the floor. */
export const LIST_NAMED_TOP_METHOD_VERSION = "list_named_top@1";

/**
 * The two lists' sets of keys compared (ADR-0018 §2.3), `ON_BOTH_TOP` and
 * `ONE_LIST_TOP`.
 */
export const LIST_OVERLAP_METHOD_VERSION = "list_overlap@1";

/** The shares q of a list's people `concentration` reports; compared as exact thousandths. */
export const LIST_CONCENTRATION_QUANTILES: readonly number[] = [0.1, 0.5, 0.9];

/**
 * The bands of bearers per surname, `from` to `to` inclusive (`to` null: no
 * upper bound). Contiguous from the publisher's minimum count, 2.
 */
export const LIST_COUNT_BANDS: readonly { readonly from: number; readonly to: number | null }[] = [
  { from: 2, to: 2 },
  { from: 3, to: 9 },
  { from: 10, to: 99 },
  { from: 100, to: 999 },
  { from: 1000, to: 9999 },
  { from: 10000, to: null },
];

/** The birthday comparison: equally likely days in a year. A model constant, not PESEL data. */
export const BIRTHDAY_REFERENCE_DAYS = 365;
