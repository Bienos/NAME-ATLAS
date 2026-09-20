#!/usr/bin/env tsx
/**
 * Developer-facing distribution demo (TASK-012).
 *
 *   pnpm demo:surname-distribution "Nowak"
 *
 * Calls `deriveCurrentDistribution` and prints. Against the committed
 * fixtures it is *expected* to report `INCOMPLETE_UNIVERSE` and write
 * nothing. Exits non-zero when no distribution was produced, so a refusal is
 * never mistaken for a distribution in a script.
 *
 * Every share printed is a share of the **covered set** — the surname's own
 * sum across the voivodeships the publisher listed — and the coverage line
 * says what fraction of the surname's registered bearers that set is. A
 * `LOW_COVERAGE` or `COVERAGE_UNKNOWN` state is printed before any figure,
 * because that is the order a reader must take them in.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { deriveCurrentDistribution } from "../src/distribution.js";

function parseSurname(argv: readonly string[]): string {
  const surname = argv.find((arg) => !arg.startsWith("--"));
  if (surname === undefined || surname === "") {
    throw new Error('usage: demo:surname-distribution "<surname>"');
  }
  return surname;
}

function percent(share: number): string {
  return `${(share * 100).toFixed(1).padStart(5)}%`;
}

async function main(): Promise<void> {
  const surname = parseSurname(process.argv.slice(2));
  const db = createDb(createPool(loadDbConfig()));
  try {
    const result = await deriveCurrentDistribution(db, surname);
    console.log(`[dist] input              ${JSON.stringify(surname)}`);
    console.log(`[dist] resolution status  ${result.resolution_status}`);
    if (result.kind === "NO_RESULT") {
      console.log(`[dist] result             NO_RESULT (${result.reason})`);
      console.log(`[dist] detail             ${result.message}`);
      for (const u of result.incomplete_universes ?? []) {
        console.log(
          `[dist]   resource ${u.external_record_id ?? "(none)"}  reason ${u.reason}  rows expected ${u.expected_row_count ?? "(unknown)"}  rows persisted ${u.actual_row_count}`,
        );
      }
      process.exitCode = 1;
      return;
    }
    console.log(`[dist] surname            ${result.surname.canonical_display}`);
    console.log(`[dist] claims             ${result.current_distribution.length}`);
    for (const [index, claim] of result.current_distribution.entries()) {
      console.log(`[dist] ── claim ${index + 1} ───────────────────────────────`);
      console.log(`[dist]   state            ${claim.state}`);
      if (claim.state !== "READY") {
        console.log(
          `[dist]   WARNING          this is NOT the surname's distribution; present it only as ` +
            `"of the ${claim.covered_count} bearers with a registered voivodeship"`,
        );
      }
      console.log(`[dist]   regions present  ${claim.regions_present}`);
      console.log(`[dist]   covered count    ${claim.covered_count}`);
      console.log(`[dist]   national count   ${claim.national_count ?? "(no complete universe)"}`);
      console.log(
        `[dist]   coverage         ${claim.coverage_ratio === null ? "(unknown)" : `${(claim.coverage_ratio * 100).toFixed(1)}%`} (threshold ${claim.low_coverage_threshold})`,
      );
      for (const entry of claim.entries) {
        console.log(
          `[dist]     ${(entry.terc_code ?? "??").padEnd(3)} ${entry.place_display_name.padEnd(20)} ${String(entry.count).padStart(7)}  ${percent(entry.share_of_covered)} of covered`,
        );
      }
      console.log(`[dist]   resource         ${claim.universe.external_record_id ?? "(none)"}`);
      console.log(`[dist]   comparability    ${claim.universe.comparability_group ?? "(none)"}`);
      console.log(`[dist]   snapshot date    ${claim.snapshot_date}`);
      console.log(`[dist]   confidence       ${claim.confidence.status}`);
      console.log(
        `[dist]   citation         ${claim.citation.title} (${claim.citation.terms_version ?? "terms unknown"})`,
      );
      console.log(`[dist]   method           ${claim.method_version}`);
    }
    console.log(`[dist] ── surface eligibility ────────────────────────`);
    for (const surface of result.surface_eligibility) {
      console.log(
        `[dist]   ${surface.surface.padEnd(9)} ${surface.decision.padEnd(12)} ${surface.reason_code}`,
      );
    }
    console.log(
      "[dist] note               shares are of the covered set, never of the national count; " +
        "the sex partitions are never combined",
    );
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[dist] unexpected error:", err);
  process.exitCode = 1;
});
