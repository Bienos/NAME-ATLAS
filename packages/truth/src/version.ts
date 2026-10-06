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
 * `pipeline_version`; it is not the artefact's `schema_version` (`list_facts@4`).
 * `@2` (TASK-043) keeps each row's key and published string past the parser,
 * for the named selections and the overlap, and adds the eight methods below.
 * `@3` (TASK-044, ADR-0019) reads every edition of each list's series through
 * the same gates, refuses a publisher duplicate, and adds `editions` and
 * `change`. Every `@2` method and figure is unchanged.
 * `@4` (TASK-106, ADR-0019 §2.2 as amended) reads each list's 2019-06-30
 * edition first, with its own header, as a surname's change over time does
 * (`PESEL_TREND_EDITIONS`); every other step is unchanged.
 */
export const LIST_FACTS_METHOD_VERSION = "list_facts_pipeline@4";

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

/**
 * Each edition of the list's series: lineage, surnames, people and floor, and the
 * series' gaps. `@2` (TASK-106): the first edition may be the 2019 one, in no series.
 */
export const LIST_EDITIONS_METHOD_VERSION = "list_editions@2";

/**
 * The list's first edition against its last, by `canonical_key_v2`: the
 * changes in surnames and people, the surnames on one edition only, the
 * first-edition counts of `TOP_3` and whether the top {@link LIST_CHANGE_TOP_SIZE}
 * are the same keys in the same order.
 */
export const LIST_CHANGE_METHOD_VERSION = "list_change@1";

/** How many of the most common surnames `change.top10_unchanged` compares. */
export const LIST_CHANGE_TOP_SIZE = 10;

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

/**
 * `SURNAME_DISTRIBUTION_SHIFT` (TASK-051, ADR-0020): a surname's national count
 * across the editions of one published list. Bumped when the points, the
 * denominator, the rounding or the lineage change; a new version is a new claim
 * key, so the old claim is superseded and never rewritten.
 */
export const DISTRIBUTION_SHIFT_METHOD_VERSION = "distribution_shift@1";

/** How the two changes are rounded: per cent, one decimal, half away from zero. */
export const DISTRIBUTION_SHIFT_ROUNDING = "percent_one_decimal_half_away_from_zero";

// --- TASK-054: ARCHIVE_AVAILABILITY (ADR-0024) ------------------------------

/** The `ARCHIVE_AVAILABILITY` derivation method. */
export const ARCHIVE_AVAILABILITY_METHOD_VERSION = "archive_availability@1";

/** Shape version of the `ARCHIVE_AVAILABILITY` claim payload. */
export const ARCHIVE_AVAILABILITY_PAYLOAD_VERSION = "archive_availability_payload@1";

/**
 * The confidence rule for a count of search matches: `VERIFIED` within the
 * searched scope (`docs/canonical/11` §11), because the claim states what the
 * source's search returned, not that every match is the surname.
 */
export const ARCHIVE_CONFIDENCE_ASSESSMENT_METHOD = "archive_search_scope";
export const ARCHIVE_CONFIDENCE_ASSESSMENT_VERSION = "archive_scope@1";

/** A surname searched more recently than this is not searched again (ADR-0024 §2.6). */
export const ARCHIVE_REFRESH_DAYS = 90;

/**
 * The localities lookup (TASK-090): a locality is listed when its official
 * name's canonical key is the surname's, by the resolver's own key. Not a
 * derivation and not a claim; the code names the match rule so a reader of
 * the section knows what "the same name" means.
 */
export const LOCALITY_MATCH_METHOD = "official_name_exact_key";
export const LOCALITY_MATCH_VERSION = "locality_match@1";
// --- TASK-073: NOTABLE_BEARERS (ADR-0030) -----------------------------------

/** The `NOTABLE_BEARERS` derivation method. */
export const NOTABLE_BEARERS_METHOD_VERSION = "notable_bearers@1";

/** Shape version of the `NOTABLE_BEARERS` claim payload. */
export const NOTABLE_BEARERS_PAYLOAD_VERSION = "notable_bearers_payload@1";

/**
 * The confidence rule for what a query returned: `VERIFIED` within the queried
 * scope, as `ARCHIVE_AVAILABILITY`'s. The claim states whom Wikidata names with
 * the surname on the stated date, not that any of them is related to anyone.
 */
export const BEARERS_CONFIDENCE_ASSESSMENT_METHOD = "wikidata_query_scope";
export const BEARERS_CONFIDENCE_ASSESSMENT_VERSION = "wikidata_scope@1";

/** A surname queried more recently than this is not queried again (ADR-0030 §2.6). */
export const BEARERS_REFRESH_DAYS = 30;

/** How many bearers the free page and deck show; the rest are for the paid report (ADR-0030 §2.7). */
export const BEARERS_SHOWN_FREE = 3;

/**
 * Given-name claims (TASK-122, ADR-0032 §6). The count is the publisher's own
 * on one list; the rank is a competition rank within that list, over the
 * names a complete import stored (placeholders are not names).
 */
export const GIVEN_NAME_POPULATION_METHOD_VERSION = "given_name_population@1";
export const GIVEN_NAME_RANK_METHOD_VERSION = "given_name_rank@1";

/**
 * Claims on the first names given to children, by year (TASK-137, ADR-0043).
 * The count is the publisher's own on one list (a year of birth and a sex);
 * the rank is a competition rank among that list's names; the trend is
 * D-044 §6's rule (`BIRTH_TREND_WINDOW_YEARS`, `BIRTH_TREND_CHANGE_PERCENT`).
 * Bump the trend's version if either parameter changes.
 *
 * `@2` (D-044 §6 as amended 2026-10-06): the trend compares the name's share
 * of the children on each list (count ÷ the list's `people_sum`), not its
 * raw count. `@1` compared raw counts; its claims are superseded when `@2` runs.
 */
export const GIVEN_NAME_BIRTH_COUNT_METHOD_VERSION = "given_name_birth_count@1";
export const GIVEN_NAME_BIRTH_RANK_METHOD_VERSION = "given_name_birth_rank@1";
export const GIVEN_NAME_BIRTH_TREND_METHOD_VERSION = "given_name_birth_trend@2";

/**
 * First-name meanings (TASK-147, ADR-0045, D-046): one `GIVEN_NAME_MEANING`
 * claim per name, carrying what each public-domain work states about it.
 * Confidence compares the language of origin each work states
 * (`GIVEN_NAME_MEANING_AGREEMENT_BASIS`). The glosses are not compared: the
 * works write them in different languages, and comparing a translation would
 * compare the project's words, not the works'.
 */
export const GIVEN_NAME_MEANING_METHOD_VERSION = "given_name_meaning@1";
export const GIVEN_NAME_MEANING_PAYLOAD_VERSION = "given_name_meaning_payload@1";
export const GIVEN_NAME_MEANING_CONFIDENCE_ASSESSMENT_METHOD = "onomastic_origin_agreement_rule";
export const GIVEN_NAME_MEANING_CONFIDENCE_ASSESSMENT_VERSION = "given_name_origin_confidence@1";
export const GIVEN_NAME_MEANING_AGREEMENT_BASIS =
  "the same origin code, stated by every work that states an origin";
