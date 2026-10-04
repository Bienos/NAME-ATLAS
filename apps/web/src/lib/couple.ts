import type { SurnameResultResponse } from "@name-atlas/contracts";

/**
 * The couple report's names list (TASK-100 §3.3.1, ADR-0035 §2.2), pure.
 *
 * Which names a couple could carry, from the two surnames and the other
 * grammatical form each one's result gives (`other_form`), and what one
 * register lookup says about each. Nothing here is computed from the two
 * surnames together beyond joining their written forms: no count, share or
 * figure of the pair.
 */

/** At most this many names, in the order `coupleNames` builds them. */
export const COUPLE_NAMES_LIMIT = 8;

/** One partner's surname as its result writes it, and its other form if the result gives one. */
export interface CouplePart {
  readonly display: string;
  readonly otherForm: string | null;
}

/** The part as a result gives it: its display name and `other_form`, when resolved. */
export function partOf(response: SurnameResultResponse | null): CouplePart | null {
  if (response === null || response.status !== "RESOLVED" || response.surname === null) {
    return null;
  }
  return {
    display: response.surname.display_name,
    otherForm: response.other_form?.surname.display_name ?? null,
  };
}

/**
 * A, B, each one's other form, then the joined names A-B and B-A, and the
 * joined names again with each part in its other form where it has one.
 * Each name once (letter case aside), at most `COUPLE_NAMES_LIMIT`.
 */
export function coupleNames(a: CouplePart, b: CouplePart): string[] {
  const otherA = a.otherForm ?? a.display;
  const otherB = b.otherForm ?? b.display;
  const candidates = [
    a.display,
    b.display,
    a.otherForm,
    b.otherForm,
    `${a.display}-${b.display}`,
    `${b.display}-${a.display}`,
    `${otherA}-${otherB}`,
    `${otherB}-${otherA}`,
  ];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of candidates) {
    if (name === null) continue;
    const key = name.toLocaleUpperCase("pl");
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names.slice(0, COUPLE_NAMES_LIMIT);
}

/** One count on one list, as the register states it. */
export interface NameCount {
  readonly group: string | null;
  readonly count: number;
  readonly snapshot_date: string;
}

/** What one register lookup said about a name. */
export type NameRow =
  /** On the list: one count per list it is on, never added up. */
  | { readonly name: string; readonly kind: "LISTED"; readonly counts: readonly NameCount[] }
  /** The register does not list it. Never a zero. */
  | { readonly name: string; readonly kind: "NOT_LISTED" }
  /** The lookup gave no figure that can be shown (failed, blocked, not derived, ambiguous). */
  | { readonly name: string; readonly kind: "NO_FIGURE" };

/**
 * A name's row from its validated result, or from `null` when the lookup
 * failed. Only an unresolved name, or a resolved one the register has no
 * evidence for, reads as "not on the list"; anything else that carries no
 * count is no figure, not an absence.
 */
export function nameRow(name: string, response: SurnameResultResponse | null): NameRow {
  if (response === null) return { name, kind: "NO_FIGURE" };
  if (response.status === "UNRESOLVED") return { name, kind: "NOT_LISTED" };
  if (response.status !== "RESOLVED" || response.population === null) {
    return { name, kind: "NO_FIGURE" };
  }
  const population = response.population;
  if (population.state === "READY") {
    const counts = population.observations.flatMap((observation) =>
      observation.value.status === "KNOWN" && observation.value.value !== null
        ? [
            {
              group: observation.comparability_group,
              count: observation.value.value,
              snapshot_date: observation.snapshot_date,
            },
          ]
        : [],
    );
    return counts.length > 0 ? { name, kind: "LISTED", counts } : { name, kind: "NO_FIGURE" };
  }
  if (population.state === "UNAVAILABLE" && population.reason_code === "NO_APPLICABLE_EVIDENCE") {
    return { name, kind: "NOT_LISTED" };
  }
  return { name, kind: "NO_FIGURE" };
}
