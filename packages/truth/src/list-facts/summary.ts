/**
 * `list_summary@1` — people, surnames, extremes, medians, thresholds and
 * quantiles of ONE published list (TASK-040, `docs/contracts/list-facts.md`).
 *
 * Every comparison against a fraction is made in exact integer arithmetic:
 * a quantile q is written as thousandths, and "a share of at least q" is
 * `part * 1000 >= q_thousandths * whole`. No float decides a boundary.
 */
import {
  LIST_SUMMARY_METHOD_VERSION,
  LIST_SUMMARY_QUANTILES,
  LIST_SUMMARY_THRESHOLDS,
} from "../version.js";
import { ListFactsInputError } from "./histogram.js";
import type { ListHistogram } from "./histogram.js";

export interface ListThreshold {
  readonly at_least: number;
  readonly surnames: number;
  readonly people: number;
}

export interface ListQuantile {
  readonly q: number;
  readonly count: number;
}

export interface ListSummary {
  readonly method_version: string;
  readonly people: number;
  readonly surnames: number;
  readonly max_count: number;
  readonly min_count: number;
  readonly median_count_per_surname: number;
  readonly median_count_per_person: number;
  readonly thresholds: readonly ListThreshold[];
  readonly surname_quantiles: readonly ListQuantile[];
  readonly person_quantiles: readonly ListQuantile[];
}

/** A quantile q as a whole number of thousandths, for exact integer comparisons. */
export function thousandths(q: number): number {
  const t = Math.round(q * 1000);
  if (t < 1 || t > 1000 || Math.abs(t / 1000 - q) > 1e-12) {
    throw new ListFactsInputError(
      `a quantile must be a whole number of thousandths in (0, 1], got ${q}`,
    );
  }
  return t;
}

/**
 * The median count per surname: the ceil(R/2)-th smallest count, R the
 * list's surnames (the lower median when R is even).
 */
export function medianCountPerSurname(histogram: ListHistogram): number {
  const target = Math.ceil(histogram.surnames / 2);
  let seen = 0;
  for (let i = 0; i < histogram.counts.length; i++) {
    seen += histogram.multiplicities[i] ?? 0;
    if (seen >= target) return histogram.counts[i] ?? 0;
  }
  throw new ListFactsInputError("unreachable: the histogram's multiplicities do not sum to R");
}

/**
 * The median count per person (the upper weighted median): the largest count
 * c such that the people on surnames with count >= c are at least half the
 * list's people.
 */
export function medianCountPerPerson(histogram: ListHistogram): number {
  let people = 0;
  for (let i = histogram.counts.length - 1; i >= 0; i--) {
    const count = histogram.counts[i] ?? 0;
    people += count * (histogram.multiplicities[i] ?? 0);
    if (2 * people >= histogram.people) return count;
  }
  throw new ListFactsInputError("unreachable: the histogram's counts do not sum to N");
}

/** Surnames with at least `atLeast` bearers, and the people who carry them. */
export function listThreshold(histogram: ListHistogram, atLeast: number): ListThreshold {
  let surnames = 0;
  let people = 0;
  for (let i = 0; i < histogram.counts.length; i++) {
    const count = histogram.counts[i] ?? 0;
    if (count < atLeast) continue;
    const k = histogram.multiplicities[i] ?? 0;
    surnames += k;
    people += count * k;
  }
  return { at_least: atLeast, surnames, people };
}

/**
 * The surname quantile: the smallest count c such that the share of surnames
 * with count <= c is at least q.
 */
export function surnameQuantile(histogram: ListHistogram, q: number): number {
  const t = thousandths(q);
  let seen = 0;
  for (let i = 0; i < histogram.counts.length; i++) {
    seen += histogram.multiplicities[i] ?? 0;
    if (seen * 1000 >= t * histogram.surnames) return histogram.counts[i] ?? 0;
  }
  throw new ListFactsInputError("unreachable: the histogram's multiplicities do not sum to R");
}

/**
 * The person quantile: the smallest count c such that the share of people
 * on surnames with count <= c is at least q.
 */
export function personQuantile(histogram: ListHistogram, q: number): number {
  const t = thousandths(q);
  let people = 0;
  for (let i = 0; i < histogram.counts.length; i++) {
    const count = histogram.counts[i] ?? 0;
    people += count * (histogram.multiplicities[i] ?? 0);
    if (people * 1000 >= t * histogram.people) return count;
  }
  throw new ListFactsInputError("unreachable: the histogram's counts do not sum to N");
}

export function listSummary(histogram: ListHistogram): ListSummary {
  const { counts } = histogram;
  const min = counts[0];
  const max = counts[counts.length - 1];
  if (min === undefined || max === undefined) {
    throw new ListFactsInputError("a list with no rows has no summary");
  }
  // The quantiles' products stay exact only while N * 1000 is below 2^53.
  if (!Number.isSafeInteger(histogram.people * 1000)) {
    throw new ListFactsInputError("the list's people exceed exact quantile arithmetic");
  }
  return {
    method_version: LIST_SUMMARY_METHOD_VERSION,
    people: histogram.people,
    surnames: histogram.surnames,
    max_count: max,
    min_count: min,
    median_count_per_surname: medianCountPerSurname(histogram),
    median_count_per_person: medianCountPerPerson(histogram),
    thresholds: LIST_SUMMARY_THRESHOLDS.map((t) => listThreshold(histogram, t)),
    surname_quantiles: LIST_SUMMARY_QUANTILES.map((q) => ({
      q,
      count: surnameQuantile(histogram, q),
    })),
    person_quantiles: LIST_SUMMARY_QUANTILES.map((q) => ({
      q,
      count: personQuantile(histogram, q),
    })),
  };
}
