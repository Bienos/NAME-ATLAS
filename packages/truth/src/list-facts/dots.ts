/**
 * `list_dots@1` — every distinct count on ONE list, ascending, with how many
 * surnames have it (TASK-043 §3, plate I: one dot per surname).
 *
 * It is the list's histogram as stored: the surnames add up to the list's
 * surnames, and count × surnames to its people. Positions and sizes of the
 * dots are presentation geometry, drawn in the page from these pairs.
 */
import { LIST_DOTS_METHOD_VERSION } from "../version.js";
import type { ListHistogram } from "./histogram.js";

export interface ListDots {
  readonly method_version: string;
  readonly histogram: readonly { readonly count: number; readonly surnames: number }[];
}

export function listDots(histogram: ListHistogram): ListDots {
  return {
    method_version: LIST_DOTS_METHOD_VERSION,
    histogram: histogram.counts.map((count, i) => ({
      count,
      surnames: histogram.multiplicities[i] ?? 0,
    })),
  };
}
