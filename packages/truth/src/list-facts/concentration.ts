/**
 * `list_concentration@1` — how concentrated ONE list is (TASK-043 §3,
 * plate II).
 *
 * For each q in `LIST_CONCENTRATION_QUANTILES`: the smallest k such that the
 * list's k most common surnames carry at least a share q of its people, and
 * those people. "At least q" is decided in exact integers, q written as
 * thousandths: `people_k * 1000 >= q_thousandths * N`. No float decides it.
 *
 * The k most common surnames are the first k in count-descending order. A tie
 * at the boundary does not change k or the people, because tied surnames
 * carry the same count, so the figures depend on the histogram only.
 *
 * `beyond_half` is the list's surnames outside the q = 0.5 set, stored so the
 * page never subtracts.
 */
import { LIST_CONCENTRATION_METHOD_VERSION, LIST_CONCENTRATION_QUANTILES } from "../version.js";
import { ListFactsInputError } from "./histogram.js";
import type { ListHistogram } from "./histogram.js";
import { thousandths } from "./summary.js";

export interface ConcentrationLevel {
  readonly q: number;
  readonly surnames: number;
  readonly people: number;
}

export interface ListConcentration {
  readonly method_version: string;
  readonly levels: readonly ConcentrationLevel[];
  readonly beyond_half: number;
}

/** The fewest most common surnames whose people are at least a share q of the list's. */
export function concentrationLevel(histogram: ListHistogram, q: number): ConcentrationLevel {
  const t = thousandths(q);
  const target = t * histogram.people;
  if (!Number.isSafeInteger(target)) {
    throw new ListFactsInputError("the list's people exceed exact concentration arithmetic");
  }
  let surnames = 0;
  let people = 0;
  for (let i = histogram.counts.length - 1; i >= 0; i--) {
    const count = histogram.counts[i] ?? 0;
    const multiplicity = histogram.multiplicities[i] ?? 0;
    for (let j = 0; j < multiplicity; j++) {
      surnames += 1;
      people += count;
      if (people * 1000 >= target) return { q, surnames, people };
    }
  }
  throw new ListFactsInputError("unreachable: the histogram's counts do not sum to N");
}

export function listConcentration(histogram: ListHistogram): ListConcentration {
  const levels = LIST_CONCENTRATION_QUANTILES.map((q) => concentrationLevel(histogram, q));
  const half = levels.find((level) => level.q === 0.5);
  if (half === undefined) {
    throw new ListFactsInputError("concentration needs q = 0.5 for beyond_half");
  }
  return {
    method_version: LIST_CONCENTRATION_METHOD_VERSION,
    levels,
    beyond_half: histogram.surnames - half.surnames,
  };
}
