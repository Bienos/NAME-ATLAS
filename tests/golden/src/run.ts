import type { ForbiddenRule } from "./forbidden-resolution.js";

/**
 * Runs the `forbidden` list of one case and returns every rule it broke.
 *
 * Every rule runs, always. Stopping at the first violation would report one
 * symptom of a change that broke three invariants, and a golden corpus whose
 * failure message understates the damage is worse than no message.
 */
export interface Violation {
  readonly code: string;
  readonly clause: string;
  readonly observed: string;
}

export function runForbidden<O>(
  registry: Readonly<Record<string, ForbiddenRule<O>>>,
  codes: readonly string[],
  observation: O,
): readonly Violation[] {
  const violations: Violation[] = [];
  for (const code of codes) {
    const rule = registry[code];
    /* v8 ignore next 3 -- unreachable: the code type is a key of the registry. */
    if (!rule) {
      throw new Error(`forbidden code ${code} has no predicate`);
    }
    const observed = rule.check(observation);
    if (observed !== null) violations.push({ code, clause: rule.clause, observed });
  }
  return violations;
}

/** One readable block per violation, for the assertion message. */
export function formatViolations(caseId: string, violations: readonly Violation[]): string {
  return violations
    .map((v) => `${caseId} violated ${v.code}\n  clause: ${v.clause}\n  observed: ${v.observed}`)
    .join("\n");
}
