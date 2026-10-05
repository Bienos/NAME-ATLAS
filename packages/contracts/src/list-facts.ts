import { z } from "zod";

/**
 * List facts — statistics about one whole published PESEL list
 * (`docs/contracts/list-facts.md`, ADR-0015, ADR-0018, ADR-0019, TASK-040,
 * TASK-043, TASK-044).
 *
 * Every figure here describes **one** list: the national male list or the
 * national female list of one resource version. The two lists are two
 * universes. The artefact carries them side by side under separate keys and
 * nothing in it is a sum or a union across them. The one comparison ADR-0018
 * allows is `overlap`: how many surnames (never people) are on one list only
 * or on both, compared by `canonical_key_v2`.
 *
 * Surname strings cross this boundary only as ADR-0018's named selections
 * (`named_top`, `hyphenated.top`, `overlap.on_both_top`,
 * `overlap.one_list_top`): each chosen by a fixed list-scope rule in the
 * generator, and each at {@link NAMED_SURNAME_FLOOR} people or more on its
 * list. Every other figure is about the shape of a list, never about a named
 * surname: those are surname claims and stay in the claim chain.
 *
 * Shares, probabilities and expectations are stored rounded to 9 decimals,
 * never to display precision (shares and probabilities as fractions in
 * [0, 1]); counts are exact integers. Rounding for display is presentation.
 * Every decision against one half (`n_half`) is taken on the unrounded chance.
 *
 * `list_facts@3` (ADR-0019) adds, per list, the editions of the list's one
 * series (`editions`) and what changed between its first and last edition
 * (`change`): list-scope figures compared over time within one series, never
 * across the two lists, and never a cause.
 *
 * `list_facts@4` (TASK-106, ADR-0019 §2.2 as amended) lets the first edition
 * be the list's 2019-06-30 edition, as a surname's change over time already
 * reads it (ADR-0020 §2.2): it is in no series, so its `series` is null and
 * its `universe_note_code` says that its description differs.
 */
export const LIST_FACTS_SCHEMA_VERSION = "list_facts@4" as const;

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

/** True when the ISO dates `key` gives strictly rise along `items` (ISO dates order as strings). */
function datesAscending<T>(items: readonly T[], key: (item: T) => string): boolean {
  return items.every((item, i) => i === 0 || key(items[i - 1]!) < key(item));
}

/** Orders two strings by Unicode code point (not by UTF-16 code unit, as `<` does). */
function compareCodePoints(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = (x[i]!.codePointAt(0) ?? 0) - (y[i]!.codePointAt(0) ?? 0);
    if (d !== 0) return d;
  }
  return x.length - y.length;
}

/**
 * ADR-0018 §2.2: a surname is named only when it has at least this many
 * people on its list. A selection below it is stored as no name at all.
 */
export const NAMED_SURNAME_FLOOR = 20;

/** ADR-0018 §2.1 `TOP_3`: how many of the list's most common surnames `named_top` names. */
export const LIST_NAMED_TOP_SIZE = 3;

/**
 * The letters `initials` reports, in this order: the 32 letters of the
 * Polish alphabet, then Q, V and X. A surname counts under a letter when the
 * first letter of its `canonical_key_v2` is that letter (lower case, with no
 * combining mark after it); every other first letter counts as `outside`.
 */
export const LIST_INITIAL_LETTERS = [
  "A",
  "Ą",
  "B",
  "C",
  "Ć",
  "D",
  "E",
  "Ę",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "Ł",
  "M",
  "N",
  "Ń",
  "O",
  "Ó",
  "P",
  "R",
  "S",
  "Ś",
  "T",
  "U",
  "W",
  "Y",
  "Z",
  "Ź",
  "Ż",
  "Q",
  "V",
  "X",
] as const;

/** The letters of the Polish alphabet: {@link LIST_INITIAL_LETTERS} without Q, V and X. */
export const POLISH_ALPHABET = LIST_INITIAL_LETTERS.slice(0, 32) as readonly ListInitialLetter[];

export type ListInitialLetter = (typeof LIST_INITIAL_LETTERS)[number];

/**
 * The endings `endings` reports for each list, in this order (TASK-043 §3).
 * An ending is a spelling matched on the last letters of the surname's
 * `canonical_key_v2`, never an origin. Each set is disjoint: no ending is a
 * suffix of another, so no surname counts under two.
 */
export const LIST_ENDINGS = {
  national_male: ["ski", "ak", "ek", "cki", "ik", "czyk", "uk", "ewicz", "owicz"],
  national_female: ["ska", "ak", "ek", "cka", "ik", "czyk", "uk", "ewicz", "owicz"],
} as const;

/** True when no entry is a suffix of another (an entry twice counts as a suffix). */
function suffixDisjoint(endings: readonly string[]): boolean {
  return endings.every((a, i) => endings.every((b, j) => i === j || !a.endsWith(b)));
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

/**
 * A surname named by an ADR-0018 selection: its `canonical_key_v2`, its
 * source string exactly as published, and its people on its list, never
 * below {@link NAMED_SURNAME_FLOOR}.
 */
export const namedSurnameSchema = z.object({
  key: z.string().min(1),
  published: z.string().min(1),
  count: z.number().int().min(NAMED_SURNAME_FLOOR),
});

/** Named surnames in the selection order: count descending, ties by key in code-point order. */
function inSelectionOrder(items: readonly { key: string; count: number }[]): boolean {
  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1]!;
    const b = items[i]!;
    if (a.count < b.count) return false;
    if (a.count === b.count && compareCodePoints(a.key, b.key) >= 0) return false;
  }
  return true;
}

/** `list_dots@1`: every distinct count on the list, ascending, with how many surnames have it. */
export const listDotsSchema = z.object({
  method_version: z.string().min(1),
  histogram: z
    .array(z.object({ count: positiveInt, surnames: positiveInt }))
    .min(1)
    .refine((items) => strictlyAscending(items, (item) => item.count), {
      message: "dots.histogram must be ascending by count, with no duplicates",
    }),
});

/** For a share q of the list's people: the fewest most common surnames that carry it, and their people. */
export const concentrationLevelSchema = z.object({
  q: fraction,
  surnames: positiveInt,
  people: positiveInt,
});

/** `list_concentration@1`. */
export const listConcentrationSchema = z
  .object({
    method_version: z.string().min(1),
    /** Ascending by `q`, no duplicates; holds q = 0.5. */
    levels: z
      .array(concentrationLevelSchema)
      .min(1)
      .refine((items) => strictlyAscending(items, (level) => level.q), {
        message: "concentration.levels must be ascending by q, with no duplicates",
      }),
    /** The surnames outside the q = 0.5 set: the list's surnames less that set's. */
    beyond_half: nonNegativeInt,
  })
  .refine((c) => c.levels.some((level) => level.q === 0.5), {
    message: "concentration.levels must hold q = 0.5, the set beyond_half is measured against",
  })
  .refine(
    (c) =>
      c.levels.every(
        (level, i) =>
          i === 0 ||
          (level.surnames >= c.levels[i - 1]!.surnames && level.people >= c.levels[i - 1]!.people),
      ),
    { message: "concentration.levels must not fall in surnames or people as q rises" },
  );

/** One band of bearers per surname, `from` to `to` inclusive (`to` null: no upper bound). */
export const countBandSchema = z.object({
  from: positiveInt,
  to: positiveInt.nullable(),
  surnames: nonNegativeInt,
  people: nonNegativeInt,
});

/** `list_bands@1`. */
export const listBandsSchema = z
  .object({
    method_version: z.string().min(1),
    /** Contiguous, ascending, the last one open-ended. */
    ranges: z.array(countBandSchema).min(1),
    /** The surnames with fewer than 10 bearers: the bands below 10, stored so no page adds them. */
    under_10: nonNegativeInt,
  })
  .refine(
    (b) =>
      b.ranges.every((band, i) => {
        const last = i === b.ranges.length - 1;
        if (last !== (band.to === null)) return false;
        if (band.to !== null && band.to < band.from) return false;
        const previous = b.ranges[i - 1];
        return previous === undefined || (previous.to !== null && band.from === previous.to + 1);
      }),
    {
      message: "bands.ranges must be contiguous and ascending, with only the last one open-ended",
    },
  )
  .refine(
    (b) =>
      b.ranges.every(
        (band) =>
          band.people >= band.from * band.surnames &&
          (band.to === null || band.people <= band.to * band.surnames),
      ),
    { message: "a band's people must lie between its surnames times its lower and upper bound" },
  )
  .refine((b) => b.ranges.some((band) => band.from === 10), {
    message: "bands.ranges must have a band starting at 10, so under_10 is a set of whole bands",
  })
  .refine(
    (b) =>
      b.under_10 ===
      b.ranges
        .filter((band) => band.to !== null && band.to < 10)
        .reduce((sum, band) => sum + band.surnames, 0),
    { message: "bands.under_10 must equal the surnames of the bands below 10" },
  );

/** Surnames and people on one list whose key ends with `ending`, and the share of the list's people. */
export const endingSchema = z.object({
  /** The ending as the key's last letters, lower case, without the dash: "ski" for -ski. */
  ending: z.string().regex(/^\p{Ll}+$/u),
  surnames: nonNegativeInt,
  people: nonNegativeInt,
  share_of_people: fraction,
});

/** `list_endings@1`. */
export const listEndingsSchema = z.object({
  method_version: z.string().min(1),
  entries: z
    .array(endingSchema)
    .min(1)
    .refine((items) => suffixDisjoint(items.map((item) => item.ending)), {
      message: "endings must be disjoint: no ending may be a suffix of another",
    }),
});

const initialLetterSchema = z.enum(LIST_INITIAL_LETTERS);

/** A letter at least one surname on the list starts with. Absent letters are never a zero. */
export const presentInitialSchema = z.strictObject({
  letter: initialLetterSchema,
  surnames: positiveInt,
  people: positiveInt,
});

/** A letter no surname on the list starts with: stated as absent, never as zero people. */
export const absentInitialSchema = z.strictObject({
  letter: initialLetterSchema,
  absent: z.literal(true),
});

export const listInitialSchema = z.union([presentInitialSchema, absentInitialSchema]);

type ListInitialEntry = z.infer<typeof listInitialSchema>;

function presentPeople(entry: ListInitialEntry | undefined): number | null {
  return entry === undefined || "absent" in entry ? null : entry.people;
}

/** `list_initials@1`. */
export const listInitialsSchema = z
  .object({
    method_version: z.string().min(1),
    /** Each of {@link LIST_INITIAL_LETTERS} once, in that order. */
    letters: z
      .array(listInitialSchema)
      .refine(
        (items) =>
          items.length === LIST_INITIAL_LETTERS.length &&
          items.every((item, i) => item.letter === LIST_INITIAL_LETTERS[i]),
        {
          message:
            "initials.letters must hold each letter of the Polish alphabet, then Q, V and X, " +
            "once and in that order",
        },
      ),
    /** The letter with the most people. */
    top: initialLetterSchema,
    /** The letter of the Polish alphabet with the fewest people, among the letters present. */
    rarest_polish: initialLetterSchema,
    /** Surnames whose first letter is none of the letters above, and their people. */
    outside: z.object({ surnames: nonNegativeInt, people: nonNegativeInt }),
  })
  .refine(
    (initials) => {
      const people = initials.letters.map(presentPeople);
      const top = presentPeople(initials.letters.find((item) => item.letter === initials.top));
      return top !== null && people.every((value) => value === null || value <= top);
    },
    { message: "initials.top must be a letter present on the list, with the most people" },
  )
  .refine(
    (initials) => {
      const polish = initials.letters.filter((item) => POLISH_ALPHABET.includes(item.letter));
      const rarest = presentPeople(polish.find((item) => item.letter === initials.rarest_polish));
      return (
        rarest !== null &&
        polish.map(presentPeople).every((value) => value === null || value >= rarest)
      );
    },
    {
      message:
        "initials.rarest_polish must be a Polish letter present on the list, with the fewest " +
        "people among the Polish letters present",
    },
  );

/** `list_hyphenated@1`: the surnames whose key contains a hyphen. */
export const listHyphenatedSchema = z
  .object({
    method_version: z.string().min(1),
    surnames: nonNegativeInt,
    people: nonNegativeInt,
    /** ADR-0018 `HYPHENATED_TOP`, or null when there is none at or above the floor. */
    top: namedSurnameSchema.nullable(),
  })
  .refine((h) => h.top === null || (h.top.key.includes("-") && h.top.count <= h.people), {
    message: "hyphenated.top must be a hyphenated surname among the ones counted",
  });

/** `list_named_top@1`: ADR-0018 `TOP_3`, those of the three at or above the floor. */
export const listNamedTopSchema = z.object({
  method_version: z.string().min(1),
  items: z.array(namedSurnameSchema).max(LIST_NAMED_TOP_SIZE).refine(inSelectionOrder, {
    message: "named_top.items must be by count descending, ties by key, each key once",
  }),
});

/**
 * `UNIVERSE_DESCRIPTION_DIFFERS`: the 2019-06-30 files describe their universe in
 * fewer words than the series; the owner ruled them the same universe (ADR-0020 §2.2).
 */
export const LIST_EDITION_NOTE_CODES = ["UNIVERSE_DESCRIPTION_DIFFERS"] as const;

/** ADR-0019 §2.2: why a resource the publisher lists in a series is not one of its editions. */
export const LIST_EDITION_GAP_REASONS = ["PUBLISHER_DUPLICATE"] as const;

const resourceId = z.string().regex(/^\d+$/u);

/**
 * One edition of the list's series: its lineage, pinned to the registry, and
 * its surnames and people (ADR-0019 §2.3). Figures of one edition, never a
 * sum across editions or lists.
 */
export const listEditionSchema = z.object({
  /**
   * The series the edition belongs to (the registry's `series`), or null for the
   * 2019-06-30 edition that precedes it, which is in no series (`list_facts@4`).
   */
  series: z.string().min(1).nullable(),
  /** Null, or why a reader must be told this edition is described differently. */
  universe_note_code: z.enum(LIST_EDITION_NOTE_CODES).nullable(),
  /** dane.gov.pl resource id. */
  resource_id: resourceId,
  /** The register's reference date the publisher states for the edition. */
  data_date: isoDate,
  /** SHA-256 of the exact bytes read; equals the registry's. */
  sha256,
  /** Data rows in the file; equals the registry's official row count. */
  row_count: positiveInt,
  /** Surnames on the edition: its rows. */
  surnames: positiveInt,
  /** People on the edition: the sum of its counts. A sum within one edition. */
  people: positiveInt,
  /** The smallest count on the edition: its publication floor. */
  min_count: positiveInt,
});

/** A date of the series with no edition: a resource refused, and why. Never a value. */
export const listEditionGapSchema = z.object({
  data_date: isoDate,
  /** The refused resource. */
  resource_id: resourceId,
  reason: z.enum(LIST_EDITION_GAP_REASONS),
  /** `PUBLISHER_DUPLICATE`: the edition whose bytes the refused resource repeats. */
  duplicate_of: resourceId,
});

/**
 * `list_editions@2`: the editions of the list's one series, in date order, and its
 * gaps; since `list_facts@4` the first may be the list's 2019 edition, in no series.
 */
export const listEditionsSchema = z
  .object({
    method_version: z.string().min(1),
    /** The list's one series (ADR-0019 §2.1). */
    series: z.string().min(1),
    /** Strictly ascending by `data_date`; at least the first and the last edition. */
    items: z
      .array(listEditionSchema)
      .min(2)
      .refine((items) => datesAscending(items, (item) => item.data_date), {
        message: "editions must be in ascending order of data_date, with no date twice",
      }),
    /** Strictly ascending by `data_date`. */
    gaps: z
      .array(listEditionGapSchema)
      .refine((gaps) => datesAscending(gaps, (gap) => gap.data_date), {
        message: "edition gaps must be in ascending order of data_date, with no date twice",
      }),
  })
  .refine(
    (e) =>
      e.items.every((item, i) =>
        item.series === null
          ? i === 0 && item.universe_note_code === "UNIVERSE_DESCRIPTION_DIFFERS"
          : item.series === e.series && item.universe_note_code === null,
      ),
    {
      message:
        "every edition of a list must belong to the list's one series, but the first, which " +
        "may be in none and must then say that its description differs",
    },
  )
  .refine((e) => e.items.every((item) => item.row_count === item.surnames), {
    message: "an edition's surnames must be its rows",
  })
  .refine((e) => e.items.every((item) => item.min_count === e.items[0]?.min_count), {
    message:
      "every edition must have the same publication floor (min_count): editions are compared " +
      "only on the same floor (ADR-0019 §1)",
  })
  .refine((e) => new Set(e.items.map((item) => item.sha256)).size === e.items.length, {
    message:
      "two editions must not share a SHA-256: a publisher duplicate is a gap, not an edition",
  })
  .refine(
    (e) => {
      const ids = [...e.items.map((i) => i.resource_id), ...e.gaps.map((g) => g.resource_id)];
      return new Set(ids).size === ids.length;
    },
    { message: "a resource may be an edition or a gap, once" },
  )
  .refine(
    (e) =>
      e.gaps.every(
        (gap) =>
          e.items.every((item) => item.data_date !== gap.data_date) &&
          e.items.some((item) => item.resource_id === gap.duplicate_of),
      ),
    {
      message:
        "a gap must fall on a date with no edition, and duplicate an edition of the same series",
    },
  );

/**
 * `list_change@1` (ADR-0019 §2.3): the list's first edition against its last,
 * compared by `canonical_key_v2`. States what changed, never why. A surname
 * absent from one edition is not on that list (it may be below the floor),
 * never zero people.
 */
export const listChangeSchema = z
  .object({
    method_version: z.string().min(1),
    first_data_date: isoDate,
    last_data_date: isoDate,
    surnames_first: positiveInt,
    surnames_last: positiveInt,
    /** `surnames_last − surnames_first`, stored so that no page subtracts. */
    surnames_delta: z.number().int(),
    people_first: positiveInt,
    people_last: positiveInt,
    /** `people_last − people_first`, stored so that no page subtracts. */
    people_delta: z.number().int(),
    /** The surnames on the last edition and not on the first, and their people on the last. */
    on_last_not_first: z.object({ surnames: nonNegativeInt, people: nonNegativeInt }),
    /** The surnames on the first edition and not on the last, and their people on the first. */
    on_first_not_last: z.object({ surnames: nonNegativeInt, people_on_first: nonNegativeInt }),
    /**
     * For each of the list's `named_top.items`, in their order: its count on the
     * first edition, or null when it is not on the first edition (never zero).
     */
    top3_first_counts: z
      .array(z.object({ key: z.string().min(1), count_first: positiveInt.nullable() }))
      .max(LIST_NAMED_TOP_SIZE),
    /** Whether the ten most common surnames, in order, are the same keys on both editions. */
    top10_unchanged: z.boolean(),
  })
  .refine((c) => c.first_data_date < c.last_data_date, {
    message: "change.first_data_date must come before change.last_data_date",
  })
  .refine(
    (c) =>
      c.surnames_delta === c.surnames_last - c.surnames_first &&
      c.people_delta === c.people_last - c.people_first,
    { message: "each change delta must equal the last edition's figure less the first's" },
  )
  .refine(
    (c) =>
      c.on_last_not_first.surnames <= c.surnames_last &&
      c.on_last_not_first.people <= c.people_last &&
      c.on_first_not_last.surnames <= c.surnames_first &&
      c.on_first_not_last.people_on_first <= c.people_first,
    { message: "the surnames on one edition only must fit within that edition" },
  )
  .refine(
    (c) =>
      c.surnames_last - c.on_last_not_first.surnames ===
      c.surnames_first - c.on_first_not_last.surnames,
    {
      message: "the surnames on both editions must be the same number counted from either edition",
    },
  );

function sumOf<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((sum, item) => sum + value(item), 0);
}

export const listFactsSchema = z
  .object({
    partition: listPartitionSchema,
    source: listSourceSchema,
    assessment: listAssessmentSchema,
    summary: listSummarySchema,
    collision: listCollisionSchema,
    crowd: listCrowdSchema,
    dots: listDotsSchema,
    concentration: listConcentrationSchema,
    bands: listBandsSchema,
    endings: listEndingsSchema,
    initials: listInitialsSchema,
    hyphenated: listHyphenatedSchema,
    named_top: listNamedTopSchema,
    editions: listEditionsSchema,
    change: listChangeSchema,
  })
  .refine(
    (l) =>
      sumOf(l.dots.histogram, (d) => d.surnames) === l.summary.surnames &&
      sumOf(l.dots.histogram, (d) => d.count * d.surnames) === l.summary.people,
    { message: "dots must add up to the list's surnames, and count × surnames to its people" },
  )
  .refine(
    (l) =>
      l.concentration.levels.every(
        (level) =>
          level.surnames <= l.summary.surnames &&
          level.people <= l.summary.people &&
          level.people * 1000 >= Math.round(level.q * 1000) * l.summary.people,
      ),
    { message: "each concentration level must carry at least its share q of the list's people" },
  )
  .refine(
    (l) =>
      l.concentration.beyond_half ===
      l.summary.surnames -
        (l.concentration.levels.find((level) => level.q === 0.5)?.surnames ?? Number.NaN),
    { message: "concentration.beyond_half must be the list's surnames less the q = 0.5 set" },
  )
  .refine(
    (l) =>
      sumOf(l.bands.ranges, (b) => b.surnames) === l.summary.surnames &&
      sumOf(l.bands.ranges, (b) => b.people) === l.summary.people,
    { message: "bands must add up to the list's surnames and people" },
  )
  .refine(
    (l) => {
      const fixed: readonly string[] = LIST_ENDINGS[l.partition];
      const endings = l.endings.entries.map((e) => e.ending);
      return endings.length === fixed.length && endings.every((e, i) => e === fixed[i]);
    },
    { message: "endings must be the fixed set of endings for the list's partition, in order" },
  )
  .refine(
    (l) =>
      sumOf(l.endings.entries, (e) => e.surnames) <= l.summary.surnames &&
      sumOf(l.endings.entries, (e) => e.people) <= l.summary.people &&
      l.endings.entries.every(
        (e) => Math.abs(e.share_of_people - e.people / l.summary.people) <= 1e-9,
      ),
    {
      message:
        "endings must fit within the list, each share of people being its people over the list's",
    },
  )
  .refine(
    (l) => {
      const present = l.initials.letters.filter(
        (item): item is z.infer<typeof presentInitialSchema> => !("absent" in item),
      );
      return (
        sumOf(present, (i) => i.surnames) + l.initials.outside.surnames === l.summary.surnames &&
        sumOf(present, (i) => i.people) + l.initials.outside.people === l.summary.people
      );
    },
    { message: "initials and outside must add up to the list's surnames and people" },
  )
  .refine(
    (l) =>
      l.hyphenated.surnames <= l.summary.surnames &&
      l.hyphenated.people <= l.summary.people &&
      (l.hyphenated.top === null || l.hyphenated.top.count <= l.summary.max_count),
    { message: "hyphenated must fit within the list" },
  )
  .refine(
    (l) => l.named_top.items.length === 0 || l.named_top.items[0]!.count === l.summary.max_count,
    { message: "named_top must start with the list's most common surname" },
  )
  .refine(
    (l) => {
      const last = l.editions.items[l.editions.items.length - 1];
      return (
        last !== undefined &&
        last.resource_id === l.source.external_record_id &&
        last.sha256 === l.source.sha256 &&
        last.row_count === l.source.row_count &&
        last.data_date === l.source.snapshot_date &&
        last.surnames === l.summary.surnames &&
        last.people === l.summary.people &&
        last.min_count === l.summary.min_count
      );
    },
    {
      message:
        "the last edition must be the list itself: its source's resource, SHA-256, rows and " +
        "date, and its summary's surnames, people and min_count",
    },
  )
  .refine(
    (l) => {
      const first = l.editions.items[0];
      const last = l.editions.items[l.editions.items.length - 1];
      return (
        first !== undefined &&
        last !== undefined &&
        l.change.first_data_date === first.data_date &&
        l.change.last_data_date === last.data_date &&
        l.change.surnames_first === first.surnames &&
        l.change.surnames_last === last.surnames &&
        l.change.people_first === first.people &&
        l.change.people_last === last.people
      );
    },
    { message: "change must compare the list's first edition with its last" },
  )
  .refine(
    (l) =>
      l.change.top3_first_counts.length === l.named_top.items.length &&
      l.change.top3_first_counts.every((entry, i) => entry.key === l.named_top.items[i]?.key),
    { message: "change.top3_first_counts must follow named_top.items, key by key" },
  );

/** The surname ADR-0018 `ON_BOTH_TOP` selects, with its source string and people on each list. */
export const onBothTopSchema = z.object({
  key: z.string().min(1),
  male: namedSurnameSchema.omit({ key: true }),
  female: namedSurnameSchema.omit({ key: true }),
});

/**
 * `list_overlap@1` (ADR-0018 §2.3): the two lists' sets of surnames compared
 * by `canonical_key_v2`. Counts of surnames only; no field adds people.
 */
export const listOverlapSchema = z.object({
  method_version: z.string().min(1),
  /** Surnames on the male list and not on the female list. */
  male_only: nonNegativeInt,
  /** Surnames on both lists. */
  both: nonNegativeInt,
  /** Surnames on the female list and not on the male list. */
  female_only: nonNegativeInt,
  /** ADR-0018 `ON_BOTH_TOP`, or null when there is none at or above the floor on both lists. */
  on_both_top: onBothTopSchema.nullable(),
  /** ADR-0018 `ONE_LIST_TOP` for each list, or null when there is none at or above the floor. */
  one_list_top: z.object({
    male: namedSurnameSchema.nullable(),
    female: namedSurnameSchema.nullable(),
  }),
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
    concentration_q: list.concentration.levels.map((level) => level.q),
    band_edges: list.bands.ranges.map((band) => [band.from, band.to]),
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
    /** The one comparison of the two lists ADR-0018 allows: counts of surnames, never people. */
    overlap: listOverlapSchema,
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
  .refine((a) => a.lists.male.editions.series !== a.lists.female.editions.series, {
    message: "the two lists must be two series: editions are never compared across lists",
  })
  .refine((a) => modelParameters(a.lists.male) === modelParameters(a.lists.female), {
    message:
      "both lists must use the same model parameters: crowd_size, the curve's n, the number " +
      "of example rooms, expected_distinct's n, thresholds' at_least, quantiles' q, " +
      "concentration's q and the bands' edges",
  })
  .refine(
    (a) =>
      a.overlap.male_only + a.overlap.both === a.lists.male.summary.surnames &&
      a.overlap.female_only + a.overlap.both === a.lists.female.summary.surnames,
    {
      message:
        "overlap must add up: male_only + both is the male list's surnames, female_only + both " +
        "the female list's",
    },
  )
  .refine(
    (a) =>
      (a.overlap.on_both_top === null || a.overlap.both > 0) &&
      (a.overlap.one_list_top.male === null || a.overlap.male_only > 0) &&
      (a.overlap.one_list_top.female === null || a.overlap.female_only > 0),
    { message: "an overlap selection needs a surname in the part it is selected from" },
  )
  .refine(
    (a) =>
      (a.overlap.on_both_top === null ||
        (a.overlap.on_both_top.male.count <= a.lists.male.summary.max_count &&
          a.overlap.on_both_top.female.count <= a.lists.female.summary.max_count)) &&
      (a.overlap.one_list_top.male === null ||
        a.overlap.one_list_top.male.count <= a.lists.male.summary.max_count) &&
      (a.overlap.one_list_top.female === null ||
        a.overlap.one_list_top.female.count <= a.lists.female.summary.max_count),
    { message: "an overlap selection's count must fit within its own list" },
  );

export type ListPartition = z.infer<typeof listPartitionSchema>;
export type ListFacts = z.infer<typeof listFactsSchema>;
export type ListFactsArtefact = z.infer<typeof listFactsArtefactSchema>;
export type NamedSurname = z.infer<typeof namedSurnameSchema>;
export type ListDots = z.infer<typeof listDotsSchema>;
export type ConcentrationLevel = z.infer<typeof concentrationLevelSchema>;
export type ListConcentration = z.infer<typeof listConcentrationSchema>;
export type CountBand = z.infer<typeof countBandSchema>;
export type ListBands = z.infer<typeof listBandsSchema>;
export type ListEnding = z.infer<typeof endingSchema>;
export type ListEndings = z.infer<typeof listEndingsSchema>;
export type ListInitial = z.infer<typeof listInitialSchema>;
export type ListInitials = z.infer<typeof listInitialsSchema>;
export type ListHyphenated = z.infer<typeof listHyphenatedSchema>;
export type ListNamedTop = z.infer<typeof listNamedTopSchema>;
export type OnBothTop = z.infer<typeof onBothTopSchema>;
export type ListOverlap = z.infer<typeof listOverlapSchema>;
export type ListEdition = z.infer<typeof listEditionSchema>;
export type ListEditionGap = z.infer<typeof listEditionGapSchema>;
export type ListEditions = z.infer<typeof listEditionsSchema>;
export type ListChange = z.infer<typeof listChangeSchema>;
