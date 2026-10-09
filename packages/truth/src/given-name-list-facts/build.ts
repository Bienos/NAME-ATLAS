/**
 * `given_name_list_facts_pipeline@1` — from the bytes of the registry's
 * first-name birth files to the `given_name_list_facts@1` artefact (TASK-178,
 * ADR-0051, `docs/contracts/given-name-list-facts.md`).
 *
 * Pure: bytes in, facts out, no file system and no database. The generator
 * (`bin/build-given-name-list-facts.ts`) reads the files and writes the result.
 *
 * Every resource passes these steps, fail-closed, in this order:
 *
 *   1. its byte size and SHA-256 equal the registry's (`births-registry.ts`);
 *   2. the bytes parse as the confirmed shape (`parseBirthNameFile`), which
 *      refuses a count below the year's threshold and a year or sex the
 *      resource does not hold;
 *   3. the completeness gate: SHA-256 and row count equal the registry's
 *      (`assessUniverseCompleteness`), and the counts add up to the registry's
 *      `official_people_sum`;
 *   4. the derived-statistic confidence rule returns VERIFIED;
 *   5. the source's rights allow the FREE surface.
 *
 * Then the lists: every year from the first to the last, for each sex, exactly
 * once across the resources (ADR-0042 §3). Each year's block is computed from
 * that one list; `change`, `number_one` and `always_top10` compare the lists'
 * sets and sequences of names and add nothing. The boys' and the girls' lists
 * are computed apart and placed side by side.
 */
import {
  GIVEN_NAME_LIST_FACTS_SCHEMA_VERSION,
  GIVEN_NAME_LIST_TOP_SIZE,
  NAMED_GIVEN_NAME_FLOOR,
  givenNameListFactsArtefactSchema,
  givenNameListThreshold,
} from "@name-atlas/contracts";
import type {
  GivenNameListFactsArtefact,
  GivenNameListSex,
  GivenNameListSexFacts,
  GivenNameListYear,
  NamedGivenName,
  NumberOneRun,
} from "@name-atlas/contracts";
import {
  BIRTH_NAMES_RIGHTS_PROFILE,
  BIRTH_NAMES_SOURCE,
  decodePeselBytes,
  parseBirthNameFile,
  sha256Hex,
} from "@name-atlas/sources";
import type { BirthNameList, BirthNameResourceDescriptor } from "@name-atlas/sources";
import { assessUniverseCompleteness } from "../completeness.js";
import { assessDerivedStatistic } from "../confidence.js";
import { roundListValue } from "../list-facts/histogram.js";
import { evaluateSurface } from "../rights.js";
import {
  GIVEN_NAME_LIST_FACTS_METHOD_VERSION,
  RANK_CONFIDENCE_ASSESSMENT_METHOD,
  RANK_CONFIDENCE_ASSESSMENT_VERSION,
} from "../version.js";

/** The generator, recorded on the artefact as `generated_by`. */
export const GIVEN_NAME_LIST_FACTS_GENERATOR = "packages/truth/bin/build-given-name-list-facts.ts";

/** Why the artefact was refused. Each is a distinct, reportable situation. */
export type GivenNameListFactsRefusalReason =
  | "BYTES_NOT_OFFICIAL"
  | "UNIVERSE_INCOMPLETE"
  | "CONFIDENCE_NOT_VERIFIED"
  | "FREE_SURFACE_NOT_ALLOWED"
  | "LIST_TWICE"
  | "YEARS_NOT_CONSECUTIVE"
  | "SEXES_MISMATCHED"
  | "NAME_BELOW_FLOOR"
  | "CONTRACT_VIOLATED";

export class GivenNameListFactsRefusedError extends Error {
  override readonly name = "GivenNameListFactsRefusedError";
  readonly reason: GivenNameListFactsRefusalReason;
  constructor(reason: GivenNameListFactsRefusalReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

export interface BirthResourceInput {
  readonly descriptor: BirthNameResourceDescriptor;
  readonly bytes: Uint8Array;
}

/** One name on one list, as published, with its count. */
export interface ListName {
  readonly published: string;
  readonly count: number;
}

/** A list's names in selection order: count descending, ties by the published string in code-unit order. */
export function inSelectionOrder(names: readonly ListName[]): ListName[] {
  return [...names].sort((a, b) =>
    a.count !== b.count ? b.count - a.count : a.published < b.published ? -1 : 1,
  );
}

/** The first letter of a name as spelled: its first code point. */
export function firstLetter(published: string): string {
  return Array.from(published)[0] ?? "";
}

/**
 * One list's block (`given_name_list_year@1`), from its names in any order.
 * Every share is of the list's own children, rounded to the artefact's
 * precision; the half is the smallest number of most common names whose
 * children are at least half the list's, decided in integers.
 */
export function listYear(
  birthYear: number,
  resourceId: string,
  names: readonly ListName[],
): GivenNameListYear {
  const ordered = inSelectionOrder(names);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (first === undefined || last === undefined) {
    throw new GivenNameListFactsRefusedError(
      "UNIVERSE_INCOMPLETE",
      `the ${String(birthYear)} list has no names`,
    );
  }
  const children = ordered.reduce((sum, name) => sum + name.count, 0);
  const top10 = ordered.slice(0, GIVEN_NAME_LIST_TOP_SIZE);
  const top10Children = top10.reduce((sum, name) => sum + name.count, 0);
  let halfNames = 0;
  let seen = 0;
  for (const name of ordered) {
    seen += name.count;
    halfNames += 1;
    if (seen * 2 >= children) break;
  }
  const byLetter = new Map<string, number>();
  let endsA = 0;
  for (const name of ordered) {
    const letter = firstLetter(name.published);
    byLetter.set(letter, (byLetter.get(letter) ?? 0) + name.count);
    if (name.published.endsWith("A")) endsA += name.count;
  }
  const topLetter = [...byLetter.entries()].sort((a, b) =>
    a[1] !== b[1] ? b[1] - a[1] : a[0] < b[0] ? -1 : 1,
  )[0];
  if (topLetter === undefined) throw new Error("unreachable: a list with names has a letter");
  if (first.count < NAMED_GIVEN_NAME_FLOOR) {
    throw new GivenNameListFactsRefusedError(
      "NAME_BELOW_FLOOR",
      `the ${String(birthYear)} list's most common name has ${String(first.count)} children, ` +
        `below the floor of ${String(NAMED_GIVEN_NAME_FLOOR)} for a named selection`,
    );
  }
  return {
    birth_year: birthYear,
    resource_id: resourceId,
    publication_threshold: givenNameListThreshold(birthYear),
    names: ordered.length,
    children,
    min_count: last.count,
    max_count: first.count,
    top: {
      published: first.published,
      count: first.count,
      share: roundListValue(first.count / children),
    },
    top10_share: roundListValue(top10Children / children),
    half_names: halfNames,
    top_letter: { letter: topLetter[0], share: roundListValue(topLetter[1] / children) },
    ends_a_share: roundListValue(endsA / children),
  };
}

/** The ten most common names of a list, each at or above the floor, in selection order. */
export function topTen(birthYear: number, names: readonly ListName[]): NamedGivenName[] {
  const top = inSelectionOrder(names).slice(0, GIVEN_NAME_LIST_TOP_SIZE);
  for (const name of top) {
    if (name.count < NAMED_GIVEN_NAME_FLOOR) {
      throw new GivenNameListFactsRefusedError(
        "NAME_BELOW_FLOOR",
        `a name among the ${String(birthYear)} list's ten most common has ${String(name.count)} ` +
          `children, below the floor of ${String(NAMED_GIVEN_NAME_FLOOR)}`,
      );
    }
  }
  return top.map((name) => ({ published: name.published, count: name.count }));
}

/** Each year's `TOP_1` as maximal runs of consecutive years (`given_name_list_sequence@1`). */
export function numberOneRuns(years: readonly GivenNameListYear[]): NumberOneRun[] {
  const runs: NumberOneRun[] = [];
  for (const year of years) {
    const current = runs[runs.length - 1];
    if (current !== undefined && current.published === year.top.published) {
      runs[runs.length - 1] = { ...current, to_year: year.birth_year, years: current.years + 1 };
    } else {
      runs.push({
        published: year.top.published,
        from_year: year.birth_year,
        to_year: year.birth_year,
        years: 1,
      });
    }
  }
  return runs;
}

/** The names in every year's ten most common, in code-unit order. */
export function alwaysTopTen(lists: readonly (readonly ListName[])[]): string[] {
  const tens = lists.map(
    (list) =>
      new Set(
        inSelectionOrder(list)
          .slice(0, GIVEN_NAME_LIST_TOP_SIZE)
          .map((name) => name.published),
      ),
  );
  const first = tens[0];
  if (first === undefined) return [];
  return [...first]
    .filter((name) => tens.every((ten) => ten.has(name)))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The first and the last year's sets of names compared by exact spelling (`given_name_list_change@1`). */
export function listChange(
  firstYear: number,
  first: readonly ListName[],
  lastYear: number,
  last: readonly ListName[],
): GivenNameListSexFacts["change"] {
  const firstNames = new Set(first.map((name) => name.published));
  const lastNames = new Set(last.map((name) => name.published));
  let both = 0;
  for (const name of firstNames) if (lastNames.has(name)) both += 1;
  return {
    first_year: firstYear,
    last_year: lastYear,
    on_last_not_first: lastNames.size - both,
    on_first_not_last: firstNames.size - both,
    on_both: both,
  };
}

interface GatedResource {
  readonly descriptor: BirthNameResourceDescriptor;
  readonly sha256: string;
  readonly byteSize: number;
  readonly rowCount: number;
  readonly peopleSum: number;
  readonly lists: readonly BirthNameList[];
}

/** Steps 1–5 above, on one resource. */
function gateResource({ descriptor, bytes }: BirthResourceInput): GatedResource {
  const actualSha = sha256Hex(bytes);
  if (
    bytes.byteLength !== descriptor.official_byte_size ||
    actualSha !== descriptor.official_sha256
  ) {
    throw new GivenNameListFactsRefusedError(
      "BYTES_NOT_OFFICIAL",
      `resource ${descriptor.resource_id} is not the registry's pinned bytes: ` +
        `${String(bytes.byteLength)} bytes, SHA-256 ${actualSha} (the registry pins ` +
        `${String(descriptor.official_byte_size)} bytes, ${descriptor.official_sha256})`,
    );
  }
  const lists = parseBirthNameFile(decodePeselBytes(bytes), descriptor);
  const rowCount = lists.reduce((sum, list) => sum + list.rows.length, 0);
  const peopleSum = lists.reduce(
    (sum, list) => sum + list.rows.reduce((inner, row) => inner + row.count, 0),
    0,
  );
  const completeness = assessUniverseCompleteness({
    externalRecordId: descriptor.resource_id,
    actualContentHash: actualSha,
    actualRowCount: rowCount,
    descriptor: {
      officialSha256: descriptor.official_sha256,
      officialRowCount: descriptor.official_row_count,
    },
  });
  if (completeness.kind !== "COMPLETE") {
    throw new GivenNameListFactsRefusedError(
      "UNIVERSE_INCOMPLETE",
      `resource ${descriptor.resource_id} is not the complete published file ` +
        `(${completeness.reason}): ${completeness.message}`,
    );
  }
  if (peopleSum !== descriptor.official_people_sum) {
    throw new GivenNameListFactsRefusedError(
      "UNIVERSE_INCOMPLETE",
      `resource ${descriptor.resource_id} adds up to ${String(peopleSum)} children where the ` +
        `registry pins ${String(descriptor.official_people_sum)}`,
    );
  }
  const confidence = assessDerivedStatistic({
    computationReproducible: true,
    inputsComplete: true,
    upstreamEvidenceVerified: true,
    noMaterialConflict: true,
  });
  if (confidence.status !== "VERIFIED") {
    throw new GivenNameListFactsRefusedError("CONFIDENCE_NOT_VERIFIED", confidence.rationale);
  }
  const free = evaluateSurface(BIRTH_NAMES_RIGHTS_PROFILE, "FREE");
  if (free.decision !== "ALLOWED") {
    throw new GivenNameListFactsRefusedError(
      "FREE_SURFACE_NOT_ALLOWED",
      `the birth lists' rights profile gives the FREE surface ${free.decision} (${free.reason_code})`,
    );
  }
  return {
    descriptor,
    sha256: actualSha,
    byteSize: bytes.byteLength,
    rowCount,
    peopleSum,
    lists,
  };
}

function sexFacts(
  sex: GivenNameListSex,
  lists: ReadonlyMap<number, { readonly resourceId: string; readonly names: readonly ListName[] }>,
): GivenNameListSexFacts {
  const years = [...lists.keys()].sort((a, b) => a - b);
  for (const [i, year] of years.entries()) {
    const previous = years[i - 1];
    if (previous !== undefined && year !== previous + 1) {
      throw new GivenNameListFactsRefusedError(
        "YEARS_NOT_CONSECUTIVE",
        `the ${sex} lists skip from ${String(previous)} to ${String(year)}; every year between ` +
          "the first and the last must be present",
      );
    }
  }
  const firstYear = years[0];
  const lastYear = years[years.length - 1];
  if (firstYear === undefined || lastYear === undefined || firstYear === lastYear) {
    throw new GivenNameListFactsRefusedError(
      "YEARS_NOT_CONSECUTIVE",
      `the ${sex} lists must cover at least two years`,
    );
  }
  const first = lists.get(firstYear);
  const last = lists.get(lastYear);
  if (first === undefined || last === undefined) throw new Error("unreachable: years are keys");
  const blocks = years.map((year) => {
    const list = lists.get(year);
    if (list === undefined) throw new Error("unreachable: years are keys");
    return listYear(year, list.resourceId, list.names);
  });
  return {
    sex,
    years: blocks,
    change: listChange(firstYear, first.names, lastYear, last.names),
    number_one: numberOneRuns(blocks),
    always_top10: alwaysTopTen(years.map((year) => lists.get(year)?.names ?? [])),
    top_first: topTen(firstYear, first.names),
    top_last: topTen(lastYear, last.names),
  };
}

/** The whole artefact from every resource's bytes, validated against the contract. */
export function buildGivenNameListFactsArtefact(
  inputs: readonly BirthResourceInput[],
): GivenNameListFactsArtefact {
  const gated = inputs.map(gateResource);
  const bySex: Record<
    GivenNameListSex,
    Map<number, { readonly resourceId: string; readonly names: readonly ListName[] }>
  > = { MALE: new Map(), FEMALE: new Map() };
  for (const resource of gated) {
    for (const list of resource.lists) {
      const sexLists = bySex[list.sex];
      if (sexLists.has(list.birthYear)) {
        throw new GivenNameListFactsRefusedError(
          "LIST_TWICE",
          `the ${list.sex} list of ${String(list.birthYear)} is in two resources; one list per ` +
            "year and sex, never two (ADR-0042 §3)",
        );
      }
      sexLists.set(list.birthYear, {
        resourceId: resource.descriptor.resource_id,
        names: list.rows.map((row) => ({ published: row.name, count: row.count })),
      });
    }
  }
  const male = sexFacts("MALE", bySex.MALE);
  const female = sexFacts("FEMALE", bySex.FEMALE);
  if (
    male.change.first_year !== female.change.first_year ||
    male.change.last_year !== female.change.last_year
  ) {
    throw new GivenNameListFactsRefusedError(
      "SEXES_MISMATCHED",
      "the boys' and the girls' lists must cover the same years",
    );
  }
  const artefact: GivenNameListFactsArtefact = {
    schema_version: GIVEN_NAME_LIST_FACTS_SCHEMA_VERSION,
    generated_by: GIVEN_NAME_LIST_FACTS_GENERATOR,
    pipeline_version: GIVEN_NAME_LIST_FACTS_METHOD_VERSION,
    dataset_id: 219,
    source_page_url: BIRTH_NAMES_SOURCE.homepage_or_reference_url,
    resources: gated.map((resource) => ({
      resource_id: resource.descriptor.resource_id,
      sha256: resource.sha256,
      byte_size: resource.byteSize,
      row_count: resource.rowCount,
      people_sum: resource.peopleSum,
      years: [...resource.descriptor.years],
      sexes: [...resource.descriptor.sexes],
    })),
    assessment: {
      completeness: "COMPLETE",
      confidence_status: "VERIFIED",
      confidence_method: RANK_CONFIDENCE_ASSESSMENT_METHOD,
      confidence_version: RANK_CONFIDENCE_ASSESSMENT_VERSION,
      free_surface: "ALLOWED",
    },
    first_year: male.change.first_year,
    last_year: male.change.last_year,
    sexes: { male, female },
  };
  const parsed = givenNameListFactsArtefactSchema.safeParse(artefact);
  if (!parsed.success) {
    throw new GivenNameListFactsRefusedError(
      "CONTRACT_VIOLATED",
      `the computed artefact does not satisfy its contract: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}
