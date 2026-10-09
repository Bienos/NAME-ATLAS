import { z } from "zod";

/**
 * The given-name list-facts artefact (TASK-178, ADR-0051,
 * `docs/contracts/given-name-list-facts.md`): statistics about each whole
 * published first-name list of dataset 219, one list per year of birth and
 * sex, derived offline by `packages/truth` and committed.
 *
 * The lists of the two sexes, and of different years, are different universes
 * (ADR-0042 §4): no field adds across them. `change`, `number_one` and
 * `always_top10` compare the lists' sets and sequences of names and add
 * nothing. A share is a share of the children on the published list, never
 * of all births (ADR-0043 §4). The only first-name strings are ADR-0051 §2.4's
 * selections, each at `NAMED_GIVEN_NAME_FLOOR` children or more on its list.
 */

export const GIVEN_NAME_LIST_FACTS_SCHEMA_VERSION = "given_name_list_facts@1" as const;

/** A first name is stored as a string only with at least this many children on its list. */
export const NAMED_GIVEN_NAME_FLOOR = 100;

/** The `TOP_10` selections: the ten most common names of a list. */
export const GIVEN_NAME_LIST_TOP_SIZE = 10;

/**
 * The publisher's threshold for a year, restated here so the schema can refuse
 * a block that misstates it (ADR-0042 §2: 5 up to 2012, 2 from 2013).
 */
export function givenNameListThreshold(birthYear: number): number {
  return birthYear <= 2012 ? 5 : 2;
}

/** ADR-0051 §2.4's tie rule: count descending, then the published string in code-unit order. */
export function inGivenNameSelectionOrder(
  items: readonly { readonly published: string; readonly count: number }[],
): boolean {
  return items.every((item, i) => {
    const prev = items[i - 1];
    if (prev === undefined) return true;
    return (
      prev.count > item.count || (prev.count === item.count && prev.published < item.published)
    );
  });
}

const fraction = z.number().min(0).max(1);
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u);
const resourceId = z.string().regex(/^\d+$/u);
const birthYear = z.number().int().min(1900).max(2100);
const EPSILON = 1e-9;

export const givenNameListSexSchema = z.enum(["MALE", "FEMALE"]);

/** A first name as the source publishes it, with its count on the one list it is selected from. */
export const namedGivenNameSchema = z.object({
  published: z.string().min(1),
  count: z.number().int().min(NAMED_GIVEN_NAME_FLOOR),
});

/** One list: the first names given to the children of one sex born in one year. */
export const givenNameListYearSchema = z
  .object({
    birth_year: birthYear,
    /** The registry resource the list was read from. */
    resource_id: resourceId,
    /** The publisher's threshold: a name given fewer times is not on the list. */
    publication_threshold: positiveInt,
    /** Names on the list: its rows. */
    names: positiveInt,
    /** Children on the published list: the sum of its counts. A sum within one list. */
    children: positiveInt,
    min_count: positiveInt,
    max_count: positiveInt,
    /** `TOP_1`: the most common name, and its share of the list's children. */
    top: namedGivenNameSchema.extend({ share: fraction }),
    /** The share of the list's children given one of its ten most common names. */
    top10_share: fraction,
    /** How many of the most common names cover at least half the list's children. */
    half_names: positiveInt,
    /** The first letter (as spelled) of the most children's names, and its share. */
    top_letter: z.object({ letter: z.string().min(1).max(2), share: fraction }),
    /** The share of the list's children whose name ends in "A", as spelled. */
    ends_a_share: fraction,
  })
  .refine((y) => y.publication_threshold === givenNameListThreshold(y.birth_year), {
    message:
      "publication_threshold must be the publisher's threshold for the year: 5 to 2012, 2 from 2013",
  })
  .refine((y) => y.min_count >= y.publication_threshold && y.max_count >= y.min_count, {
    message: "min_count must be at or above the threshold, and max_count at or above min_count",
  })
  .refine((y) => y.top.count === y.max_count, {
    message: "top must be the list's most common name: its count is max_count",
  })
  .refine((y) => Math.abs(y.top.share - y.top.count / y.children) <= EPSILON, {
    message: "top.share must be top.count over the list's children",
  })
  .refine((y) => y.top10_share >= y.top.share - EPSILON, {
    message: "top10_share must be at least top.share: the ten most common include the first",
  })
  .refine((y) => y.half_names <= y.names, {
    message: "half_names cannot exceed the list's names",
  })
  .refine((y) => y.names * y.min_count <= y.children && y.children <= y.names * y.max_count, {
    message: "children must fit within names × min_count … names × max_count",
  });

/** The first year's list against the last year's: counts of names by exact spelling. */
export const givenNameListChangeSchema = z
  .object({
    first_year: birthYear,
    last_year: birthYear,
    on_last_not_first: nonNegativeInt,
    on_first_not_last: nonNegativeInt,
    on_both: nonNegativeInt,
  })
  .refine((c) => c.first_year < c.last_year, {
    message: "change.first_year must come before change.last_year",
  });

/** A run of consecutive years with the same most common name. */
export const numberOneRunSchema = z
  .object({
    published: z.string().min(1),
    from_year: birthYear,
    to_year: birthYear,
    years: positiveInt,
  })
  .refine((r) => r.to_year >= r.from_year && r.years === r.to_year - r.from_year + 1, {
    message: "a number-one run must span from_year to to_year, years being their count",
  });

function consecutive(years: readonly number[]): boolean {
  return years.every((year, i) => i === 0 || year === (years[i - 1] ?? Number.NaN) + 1);
}

/** One sex's lists, year by year, and the comparisons of their sets of names. */
export const givenNameListSexFactsSchema = z
  .object({
    sex: givenNameListSexSchema,
    /** Every year from the artefact's first to its last, ascending. */
    years: z.array(givenNameListYearSchema).min(2),
    change: givenNameListChangeSchema,
    /** Each year's `TOP_1`, as runs of consecutive years, in year order. */
    number_one: z.array(numberOneRunSchema).min(1),
    /** The names in every year's ten most common, in code-unit order. */
    always_top10: z.array(z.string().min(1)),
    /** The first year's ten most common names, in selection order. */
    top_first: z.array(namedGivenNameSchema).min(1).max(GIVEN_NAME_LIST_TOP_SIZE),
    /** The last year's ten most common names, in selection order. */
    top_last: z.array(namedGivenNameSchema).min(1).max(GIVEN_NAME_LIST_TOP_SIZE),
  })
  .refine((s) => consecutive(s.years.map((y) => y.birth_year)), {
    message: "years must be consecutive and ascending, each year once",
  })
  .refine(
    (s) => {
      const first = s.years[0];
      const last = s.years[s.years.length - 1];
      return (
        first !== undefined &&
        last !== undefined &&
        s.change.first_year === first.birth_year &&
        s.change.last_year === last.birth_year &&
        s.change.on_both + s.change.on_last_not_first === last.names &&
        s.change.on_both + s.change.on_first_not_last === first.names
      );
    },
    {
      message:
        "change must compare the first year with the last: on_both + on_last_not_first is the " +
        "last year's names, on_both + on_first_not_last the first year's",
    },
  )
  .refine(
    (s) => {
      let expected = s.years[0]?.birth_year;
      for (const run of s.number_one) {
        if (run.from_year !== expected) return false;
        for (let year = run.from_year; year <= run.to_year; year++) {
          const block = s.years.find((y) => y.birth_year === year);
          if (block === undefined || block.top.published !== run.published) return false;
        }
        expected = run.to_year + 1;
      }
      return expected === (s.years[s.years.length - 1]?.birth_year ?? Number.NaN) + 1;
    },
    {
      message:
        "number_one must cover every year once, in order, each run naming the years' own top",
    },
  )
  .refine(
    (s) =>
      s.number_one.every(
        (run, i) => i === 0 || run.published !== (s.number_one[i - 1]?.published ?? ""),
      ),
    { message: "two consecutive number_one runs must name different names: a run is maximal" },
  )
  .refine(
    (s) =>
      inGivenNameSelectionOrder(s.top_first) &&
      inGivenNameSelectionOrder(s.top_last) &&
      s.top_first[0]?.count === s.years[0]?.max_count &&
      s.top_last[0]?.count === s.years[s.years.length - 1]?.max_count &&
      s.top_first[0]?.published === s.years[0]?.top.published &&
      s.top_last[0]?.published === s.years[s.years.length - 1]?.top.published,
    {
      message: "top_first and top_last must be in selection order and led by their year's top name",
    },
  )
  .refine(
    (s) =>
      s.always_top10.every((name, i) => i === 0 || (s.always_top10[i - 1] ?? "") < name) &&
      s.always_top10.every(
        (name) =>
          s.top_first.some((n) => n.published === name) &&
          s.top_last.some((n) => n.published === name),
      ),
    {
      message:
        "always_top10 must be sorted, each name once, and each in the first and the last " +
        "year's ten most common",
    },
  );

/** One registry resource the artefact was computed from, pinned to its bytes. */
export const givenNameListResourceSchema = z.object({
  resource_id: resourceId,
  sha256,
  byte_size: positiveInt,
  /** Data rows in the file; equals the registry's official row count. */
  row_count: positiveInt,
  /** The sum of every count in the file; equals the registry's. A sum within one file. */
  people_sum: positiveInt,
  /** The years of birth the file holds. */
  years: z.array(birthYear).min(1),
  /** The sexes the file holds. */
  sexes: z.array(givenNameListSexSchema).min(1).max(2),
});

export const givenNameListAssessmentSchema = z.object({
  completeness: z.literal("COMPLETE"),
  confidence_status: z.literal("VERIFIED"),
  confidence_method: z.string().min(1),
  confidence_version: z.string().min(1),
  free_surface: z.literal("ALLOWED"),
});

export const givenNameListFactsArtefactSchema = z
  .object({
    schema_version: z.literal(GIVEN_NAME_LIST_FACTS_SCHEMA_VERSION),
    /** The script that wrote the artefact, repository-relative. */
    generated_by: z.string().min(1),
    /** The version of the pipeline that wrote it; not the schema's. */
    pipeline_version: z.string().min(1),
    dataset_id: z.literal(219),
    source_page_url: z.string().url(),
    resources: z.array(givenNameListResourceSchema).min(1),
    assessment: givenNameListAssessmentSchema,
    first_year: birthYear,
    last_year: birthYear,
    sexes: z.object({
      male: givenNameListSexFactsSchema,
      female: givenNameListSexFactsSchema,
    }),
  })
  .refine((a) => a.sexes.male.sex === "MALE" && a.sexes.female.sex === "FEMALE", {
    message: "sexes.male must describe the boys' lists and sexes.female the girls'",
  })
  .refine(
    (a) => {
      const ids = a.resources.map((r) => r.resource_id);
      const shas = a.resources.map((r) => r.sha256);
      return new Set(ids).size === ids.length && new Set(shas).size === shas.length;
    },
    { message: "a resource is listed once, and no two resources share a SHA-256" },
  )
  .refine(
    (a) => {
      const covered = new Set<string>();
      for (const r of a.resources) {
        for (const year of r.years) {
          for (const sex of r.sexes) {
            const key = `${String(year)}:${sex}`;
            if (covered.has(key)) return false;
            covered.add(key);
          }
        }
      }
      return true;
    },
    { message: "a year and sex is covered by one resource, never two (ADR-0042 §3)" },
  )
  .refine(
    (a) =>
      [a.sexes.male, a.sexes.female].every(
        (s) =>
          s.years[0]?.birth_year === a.first_year &&
          s.years[s.years.length - 1]?.birth_year === a.last_year &&
          s.years.every((y) =>
            a.resources.some(
              (r) =>
                r.resource_id === y.resource_id &&
                r.years.includes(y.birth_year) &&
                r.sexes.includes(s.sex),
            ),
          ),
      ),
    {
      message:
        "each sex's years must run from first_year to last_year, each read from a listed " +
        "resource that holds that year and sex",
    },
  );

export type GivenNameListSex = z.infer<typeof givenNameListSexSchema>;
export type NamedGivenName = z.infer<typeof namedGivenNameSchema>;
export type GivenNameListYear = z.infer<typeof givenNameListYearSchema>;
export type GivenNameListChange = z.infer<typeof givenNameListChangeSchema>;
export type NumberOneRun = z.infer<typeof numberOneRunSchema>;
export type GivenNameListSexFacts = z.infer<typeof givenNameListSexFactsSchema>;
export type GivenNameListResource = z.infer<typeof givenNameListResourceSchema>;
export type GivenNameListFactsArtefact = z.infer<typeof givenNameListFactsArtefactSchema>;
