/**
 * `list_editions@1` — the editions of one list's series (ADR-0019 §2.1–2.3,
 * TASK-044 §1): each edition's lineage, its surnames, its people and its
 * smallest count, in date order, and the dates of the series that have no
 * edition, each with the reason.
 *
 * Figures of one edition at a time. Nothing here adds two editions, and
 * nothing here can be given the other list: one series is one list.
 *
 * A gap is never a value. A resource the registry refused as a publisher
 * duplicate is recorded only as a gap, and only when its bytes are exactly
 * those of an edition of the same series.
 */
import { LIST_EDITIONS_METHOD_VERSION } from "../version.js";
import { ListFactsInputError } from "./histogram.js";

/** One edition of the series. */
export interface EditionFigures {
  readonly series: string;
  readonly resource_id: string;
  readonly data_date: string;
  readonly sha256: string;
  readonly row_count: number;
  readonly surnames: number;
  readonly people: number;
  readonly min_count: number;
}

/** Why a resource of the series is not an edition (ADR-0019 §2.2). */
export type EditionGapReason = "PUBLISHER_DUPLICATE";

/** A resource of the series the registry refused, with the SHA-256 it was refused on. */
export interface RefusedEdition {
  readonly series: string;
  readonly resource_id: string;
  readonly data_date: string;
  readonly sha256: string;
  readonly reason: EditionGapReason;
  readonly duplicate_of: string;
}

export interface EditionGap {
  readonly data_date: string;
  readonly resource_id: string;
  readonly reason: EditionGapReason;
  readonly duplicate_of: string;
}

export interface ListEditions {
  readonly method_version: string;
  readonly series: string;
  readonly items: readonly EditionFigures[];
  readonly gaps: readonly EditionGap[];
}

/** One edition's figures from its lineage and its counts (any order). */
export function editionFigures(
  lineage: {
    readonly series: string;
    readonly resource_id: string;
    readonly data_date: string;
    readonly sha256: string;
  },
  counts: readonly number[],
): EditionFigures {
  if (counts.length === 0) {
    throw new ListFactsInputError(`edition ${lineage.resource_id} has no rows`);
  }
  let people = 0;
  let min = Number.POSITIVE_INFINITY;
  for (const count of counts) {
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new ListFactsInputError(`a list count must be a positive integer, got ${count}`);
    }
    people += count;
    if (count < min) min = count;
  }
  if (!Number.isSafeInteger(people)) {
    throw new ListFactsInputError(`edition ${lineage.resource_id} has more people than 2^53`);
  }
  return {
    series: lineage.series,
    resource_id: lineage.resource_id,
    data_date: lineage.data_date,
    sha256: lineage.sha256,
    row_count: counts.length,
    surnames: counts.length,
    people,
    min_count: min,
  };
}

/**
 * The series' editions and gaps. Refuses (throws) unless the editions are at
 * least two, all of `series`, in strictly ascending date order and with no
 * two sharing a SHA-256; and unless each refused resource is of `series`,
 * falls on a date with no edition and repeats, byte for byte, the edition it
 * names as the original.
 */
export function listEditions(
  series: string,
  items: readonly EditionFigures[],
  refused: readonly RefusedEdition[],
): ListEditions {
  if (items.length < 2) {
    throw new ListFactsInputError("a series needs a first and a last edition to compare");
  }
  for (const [i, item] of items.entries()) {
    if (item.series !== series) {
      throw new ListFactsInputError(
        `edition ${item.resource_id} is of series ${item.series}, not ${series}`,
      );
    }
    const previous = items[i - 1];
    if (previous !== undefined && !(previous.data_date < item.data_date)) {
      throw new ListFactsInputError(
        `editions must be in ascending date order: ${previous.data_date} (${previous.resource_id}) ` +
          `comes before ${item.data_date} (${item.resource_id})`,
      );
    }
    const twin = items.slice(0, i).find((other) => other.sha256 === item.sha256);
    if (twin !== undefined) {
      throw new ListFactsInputError(
        `editions ${twin.resource_id} and ${item.resource_id} have the same SHA-256: a publisher ` +
          "duplicate is not an edition",
      );
    }
  }

  const gaps = [...refused]
    .sort((a, b) => (a.data_date < b.data_date ? -1 : a.data_date > b.data_date ? 1 : 0))
    .map((resource): EditionGap => {
      if (resource.series !== series) {
        throw new ListFactsInputError(
          `refused resource ${resource.resource_id} is of series ${resource.series}, not ${series}`,
        );
      }
      const original = items.find((item) => item.resource_id === resource.duplicate_of);
      if (original === undefined || original.sha256 !== resource.sha256) {
        throw new ListFactsInputError(
          `refused resource ${resource.resource_id} is recorded as a duplicate of ` +
            `${resource.duplicate_of}, which is not an edition with the same SHA-256`,
        );
      }
      if (items.some((item) => item.data_date === resource.data_date)) {
        throw new ListFactsInputError(
          `refused resource ${resource.resource_id} falls on ${resource.data_date}, a date with ` +
            "an edition",
        );
      }
      return {
        data_date: resource.data_date,
        resource_id: resource.resource_id,
        reason: resource.reason,
        duplicate_of: resource.duplicate_of,
      };
    });

  return { method_version: LIST_EDITIONS_METHOD_VERSION, series, items: [...items], gaps };
}
