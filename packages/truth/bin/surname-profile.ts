#!/usr/bin/env tsx
/**
 * Developer-facing truth-chain demo (TASK-005 §7 AC-24/AC-25).
 *
 *   pnpm demo:surname -- "Nowak"
 *
 * Exercises the real derivation service — the same function the integration
 * tests call. This file contains no SQL and no business logic of its own; it
 * parses an argument, calls `deriveCurrentPopulation`, and prints. If it
 * grew a second code path it would stop proving anything.
 *
 * Exits non-zero when the query produces no result, so a failed lookup is
 * never mistaken for a successful one in a script.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { deriveCurrentPopulation } from "../src/derive.js";

function parseSurname(argv: readonly string[]): string {
  const surname = argv.find((arg) => !arg.startsWith("--"));
  if (surname === undefined || surname === "") {
    throw new Error('usage: demo:surname -- "<surname>"');
  }
  return surname;
}

async function main(): Promise<void> {
  const surname = parseSurname(process.argv.slice(2));
  const pool = createPool(loadDbConfig());
  const db = createDb(pool);

  try {
    const result = await deriveCurrentPopulation(db, surname);

    console.log(`[truth] input              ${JSON.stringify(surname)}`);
    console.log(`[truth] resolution status  ${result.resolution_status}`);

    if (result.kind === "NO_RESULT") {
      console.log(`[truth] result             NO_RESULT (${result.reason})`);
      if (result.surname) {
        console.log(`[truth] surname            ${result.surname.canonical_display}`);
      }
      console.log(`[truth] detail             ${result.message}`);
      // Absence is a legitimate answer, not a crash — but it is not success.
      process.exitCode = 1;
      return;
    }

    console.log(`[truth] surname            ${result.surname.canonical_display}`);
    console.log(`[truth] canonical key      ${result.surname.canonical_key}`);
    console.log(`[truth] surname_id         ${result.surname.surname_id}`);
    console.log(`[truth] claims             ${result.current_population.length}`);

    for (const [index, claim] of result.current_population.entries()) {
      console.log(`[truth] ── claim ${index + 1} ─────────────────────────────`);
      console.log(`[truth]   count            ${claim.count}`);
      console.log(`[truth]   snapshot date    ${claim.snapshot_date}`);
      console.log(`[truth]   country          ${claim.country_code}`);
      console.log(`[truth]   population scope ${claim.source_population_scope}`);
      console.log(`[truth]   comparability    ${claim.comparability_group ?? "(none)"}`);
      console.log(`[truth]   confidence       ${claim.confidence.status}`);
      console.log(
        `[truth]   assessed by      ${claim.confidence.assessment_method}` +
          ` ${claim.confidence.assessment_version}`,
      );
      console.log(`[truth]   citation         ${claim.citation.title}`);
      console.log(`[truth]   publisher        ${claim.citation.publisher ?? "(none)"}`);
      console.log(`[truth]   published        ${claim.citation.publication_date ?? "(none)"}`);
      console.log(`[truth]   url              ${claim.citation.url_or_reference}`);
      console.log(`[truth]   locator          ${claim.citation.supporting_locator ?? "(none)"}`);
      console.log(`[truth]   terms            ${claim.citation.terms_version ?? "(none)"}`);
      console.log(`[truth]   method           ${claim.method_version}`);
    }

    console.log(`[truth] ── surface eligibility ──────────────────────`);
    for (const surface of result.surface_eligibility) {
      console.log(
        `[truth]   ${surface.surface.padEnd(9)} ${surface.decision.padEnd(12)} ${surface.reason_code}`,
      );
    }

    // The two counts of a surname present in both PESEL resources are NOT
    // summable: different comparability groups, undisambiguated partition.
    if (result.current_population.length > 1) {
      console.log(
        "[truth] note               multiple snapshots are reported separately and must not " +
          "be summed (different comparability groups)",
      );
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[truth] unexpected error:", err);
  process.exitCode = 1;
});
