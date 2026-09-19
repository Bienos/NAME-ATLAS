#!/usr/bin/env tsx
/**
 * Developer-facing rank demo (TASK-009 §9 AC-19).
 *
 *   pnpm demo:surname-rank -- "Nowak"
 *
 * Exercises the real derivation service — the same function the integration
 * tests call. No SQL and no business logic of its own: it parses an argument,
 * calls `deriveCurrentRank`, and prints.
 *
 * Against the repository's committed fixtures this is *expected* to report
 * `INCOMPLETE_UNIVERSE` and write nothing. That is the completeness gate
 * working, not a failure of the demo. A rank appears only once a full official
 * resource version has been imported.
 *
 * Exits non-zero when no rank was produced, so a refusal is never mistaken for
 * a rank in a script.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { deriveCurrentRank } from "../src/rank.js";

function parseSurname(argv: readonly string[]): string {
  const surname = argv.find((arg) => !arg.startsWith("--"));
  if (surname === undefined || surname === "") {
    throw new Error('usage: demo:surname-rank -- "<surname>"');
  }
  return surname;
}

async function main(): Promise<void> {
  const surname = parseSurname(process.argv.slice(2));
  const pool = createPool(loadDbConfig());
  const db = createDb(pool);

  try {
    const result = await deriveCurrentRank(db, surname);

    console.log(`[rank] input              ${JSON.stringify(surname)}`);
    console.log(`[rank] resolution status  ${result.resolution_status}`);

    if (result.kind === "NO_RESULT") {
      console.log(`[rank] result             NO_RESULT (${result.reason})`);
      if (result.surname) {
        console.log(`[rank] surname            ${result.surname.canonical_display}`);
      }
      console.log(`[rank] detail             ${result.message}`);
      for (const u of result.incomplete_universes ?? []) {
        console.log(`[rank] ── rejected universe ───────────────────────`);
        console.log(`[rank]   resource         ${u.external_record_id ?? "(none)"}`);
        console.log(`[rank]   reason           ${u.reason}`);
        console.log(`[rank]   rows expected    ${u.expected_row_count ?? "(unknown)"}`);
        console.log(`[rank]   rows persisted   ${u.actual_row_count}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`[rank] surname            ${result.surname.canonical_display}`);
    console.log(`[rank] canonical key      ${result.surname.canonical_key}`);
    console.log(`[rank] claims             ${result.current_rank.length}`);

    for (const [index, claim] of result.current_rank.entries()) {
      console.log(`[rank] ── claim ${index + 1} ─────────────────────────────`);
      console.log(`[rank]   rank             ${claim.rank} of ${claim.universe.size}`);
      console.log(`[rank]   count            ${claim.count}`);
      console.log(`[rank]   universe         ${claim.universe.kind}`);
      console.log(`[rank]   resource         ${claim.universe.external_record_id ?? "(none)"}`);
      console.log(`[rank]   comparability    ${claim.universe.comparability_group ?? "(none)"}`);
      console.log(`[rank]   ties policy      ${claim.ties_policy}`);
      console.log(`[rank]   algorithm        ${claim.algorithm_version}`);
      console.log(`[rank]   snapshot date    ${claim.snapshot_date}`);
      console.log(`[rank]   population scope ${claim.source_population_scope}`);
      console.log(`[rank]   confidence       ${claim.confidence.status}`);
      console.log(
        `[rank]   assessed by      ${claim.confidence.assessment_method}` +
          ` ${claim.confidence.assessment_version}`,
      );
      console.log(`[rank]   citation         ${claim.citation.title}`);
      console.log(`[rank]   locator          ${claim.citation.supporting_locator ?? "(none)"}`);
      console.log(`[rank]   method           ${claim.method_version}`);
    }

    console.log(`[rank] ── surface eligibility ──────────────────────`);
    for (const surface of result.surface_eligibility) {
      console.log(
        `[rank]   ${surface.surface.padEnd(9)} ${surface.decision.padEnd(12)} ${surface.reason_code}`,
      );
    }

    // Each resource version is its own universe. The male and female PESEL
    // resources are in different comparability groups and TASK-004 §14 U-1
    // forbids summing them, so there is no all-Poland rank to report.
    if (result.current_rank.length > 1) {
      console.log(
        "[rank] note               each rank is within one resource version only; there is no " +
          "all-Poland rank, because the sex partitions may not be combined",
      );
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[rank] unexpected error:", err);
  process.exitCode = 1;
});
