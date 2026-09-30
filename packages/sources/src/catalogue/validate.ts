/**
 * Catalogue validation (TASK-038 AC-10).
 *
 * Runs before any write, so an invalid catalogue is refused with nothing
 * stored. It checks what the database cannot: key hygiene, the reserved
 * PESEL key, and the status rules of tasks/038 §5 that make a row claim more
 * than its evidence supports. The schema's own CHECK constraints and enums
 * still apply on insert.
 */
import { PESEL_SOURCE_KEY } from "../registry.js";
import { MVP_LABEL_PRODUCTION_STATUS } from "./catalogue.js";
import type { CatalogueEntry } from "./catalogue.js";

export class SourceCatalogueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceCatalogueError";
  }
}

/** snake_case with at least two segments, e.g. `pl_teryt`. */
const SOURCE_KEY_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)+$/u;

/** Keys owned elsewhere, which the catalogue must never write. */
export const RESERVED_SOURCE_KEYS: readonly string[] = [PESEL_SOURCE_KEY];

function problemsOf(entry: CatalogueEntry): string[] {
  const { source, rights } = entry;
  const problems: string[] = [];

  if (!SOURCE_KEY_PATTERN.test(source.source_key)) {
    problems.push("source_key is not snake_case with at least two segments");
  }
  if (RESERVED_SOURCE_KEYS.includes(source.source_key)) {
    problems.push("source_key is reserved by another registry owner");
  }
  if (source.name.trim() === "") {
    problems.push("name is blank");
  }
  if (source.geographic_scope.length === 0) {
    problems.push("geographic_scope is empty");
  }
  // tasks/038 §5 rule 1: no legal review has been performed on any source.
  if (source.production_status === "APPROVED" || rights.review_status === "APPROVED") {
    problems.push("claims APPROVED, but no legal review has been performed");
  }
  // §5 rule 3.
  if ((source.production_status === "BLOCKED") !== (rights.review_status === "BLOCKED")) {
    problems.push("production_status and review_status disagree about BLOCKED");
  }
  // A BLOCKED source must also be refused by the importer's `rightsRefusal` (AC-11).
  if (source.production_status === "BLOCKED" && rights.automated_access !== "PROHIBITED") {
    problems.push("BLOCKED but automated_access is not PROHIBITED");
  }
  // §5 rule 2, for classified entries.
  if (
    entry.mvp_label !== null &&
    MVP_LABEL_PRODUCTION_STATUS[entry.mvp_label] !== source.production_status
  ) {
    problems.push(`production_status does not follow the §7 label "${entry.mvp_label}"`);
  }
  if (rights.attribution_text !== null && !rights.attribution_required) {
    problems.push("attribution_text is set but attribution is not required");
  }
  return problems;
}

/** Throws {@link SourceCatalogueError} listing every problem found; writes nothing. */
export function validateSourceCatalogue(entries: readonly CatalogueEntry[]): void {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const key = entry.source.source_key;
    if (seen.has(key)) {
      problems.push(`${key}: duplicate source_key`);
    }
    seen.add(key);
    for (const problem of problemsOf(entry)) {
      problems.push(`${key}: ${problem}`);
    }
  }

  if (problems.length > 0) {
    throw new SourceCatalogueError(
      `source catalogue refused, nothing written:\n  ${problems.join("\n  ")}`,
    );
  }
}
