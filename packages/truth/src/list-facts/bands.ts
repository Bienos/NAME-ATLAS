/**
 * `list_bands@1` — ONE list's surnames and people per band of bearers
 * (TASK-043 §3, plate III): `LIST_COUNT_BANDS`, contiguous from 2 and open
 * at the top, so the bands add up to the list's surnames and people.
 *
 * `under_10` is the surnames with fewer than 10 bearers, the bands below 10
 * taken together, stored so that the page never adds two figures.
 */
import { LIST_BANDS_METHOD_VERSION, LIST_COUNT_BANDS } from "../version.js";
import { ListFactsInputError } from "./histogram.js";
import type { ListHistogram } from "./histogram.js";

export interface CountBand {
  readonly from: number;
  readonly to: number | null;
  readonly surnames: number;
  readonly people: number;
}

export interface ListBands {
  readonly method_version: string;
  readonly ranges: readonly CountBand[];
  readonly under_10: number;
}

export function listBands(histogram: ListHistogram): ListBands {
  const ranges = LIST_COUNT_BANDS.map(({ from, to }) => {
    let surnames = 0;
    let people = 0;
    for (let i = 0; i < histogram.counts.length; i++) {
      const count = histogram.counts[i] ?? 0;
      if (count < from || (to !== null && count > to)) continue;
      const k = histogram.multiplicities[i] ?? 0;
      surnames += k;
      people += count * k;
    }
    return { from, to, surnames, people };
  });
  const covered = ranges.reduce((sum, band) => sum + band.surnames, 0);
  if (covered !== histogram.surnames) {
    throw new ListFactsInputError(
      `the bands hold ${covered} of the list's ${histogram.surnames} surnames`,
    );
  }
  return {
    method_version: LIST_BANDS_METHOD_VERSION,
    ranges,
    under_10: ranges
      .filter((band) => band.to !== null && band.to < 10)
      .reduce((sum, band) => sum + band.surnames, 0),
  };
}
