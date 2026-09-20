#!/usr/bin/env tsx
/**
 * Developer-facing rarity demo (TASK-014).
 *
 *   pnpm demo:surname-rarity "Nowak"
 *
 * Calls `deriveRarityContext` and prints. Against the committed fixtures it
 * is *expected* to report `INCOMPLETE_UNIVERSE` and write nothing: no
 * complete universe, no denominator. Exits non-zero when no figure was
 * produced, so a refusal is never mistaken for a figure in a script.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { deriveRarityContext } from "../src/rarity.js";

function parseSurname(argv: readonly string[]): string {
  const surname = argv.find((arg) => !arg.startsWith("--"));
  if (surname === undefined || surname === "") {
    throw new Error('usage: demo:surname-rarity "<surname>"');
  }
  return surname;
}

async function main(): Promise<void> {
  const surname = parseSurname(process.argv.slice(2));
  const db = createDb(createPool(loadDbConfig()));
  try {
    const result = await deriveRarityContext(db, surname);
    console.log(`[rarity] input              ${JSON.stringify(surname)}`);
    console.log(`[rarity] resolution status  ${result.resolution_status}`);
    if (result.kind === "NO_RESULT") {
      console.log(`[rarity] result             NO_RESULT (${result.reason})`);
      console.log(`[rarity] detail             ${result.message}`);
      for (const u of result.incomplete_universes ?? []) {
        console.log(
          `[rarity]   resource ${u.external_record_id ?? "(none)"}  reason ${u.reason}  rows expected ${u.expected_row_count ?? "(unknown)"}  rows persisted ${u.actual_row_count}`,
        );
      }
      process.exitCode = 1;
      return;
    }
    console.log(`[rarity] surname            ${result.surname.canonical_display}`);
    console.log(`[rarity] claims             ${result.rarity_context.length}`);
    for (const [index, claim] of result.rarity_context.entries()) {
      console.log(`[rarity] ── claim ${index + 1} ─────────────────────────────`);
      console.log(`[rarity]   about 1 in       ${claim.one_in_x}`);
      console.log(
        `[rarity]   of               ${claim.denominator} (${claim.denominator_kind}: ${claim.universe_label_code})`,
      );
      console.log(`[rarity]   count            ${claim.numerator}`);
      console.log(`[rarity]   share            ${claim.share}`);
      console.log(`[rarity]   rounding         ${claim.rounding}`);
      console.log(
        `[rarity]   supporting rank  ${claim.supporting_rank ?? "(no CURRENT_RANK claim)"} of ${claim.universe.size}`,
      );
      console.log(`[rarity]   resource         ${claim.universe.external_record_id ?? "(none)"}`);
      console.log(`[rarity]   comparability    ${claim.universe.comparability_group ?? "(none)"}`);
      console.log(`[rarity]   snapshot date    ${claim.snapshot_date}`);
      console.log(`[rarity]   confidence       ${claim.confidence.status}`);
      console.log(
        `[rarity]   citation         ${claim.citation.title} (${claim.citation.terms_version ?? "terms unknown"})`,
      );
      console.log(`[rarity]   method           ${claim.method_version}`);
    }
    console.log(`[rarity] ── surface eligibility ──────────────────────`);
    for (const surface of result.surface_eligibility) {
      console.log(
        `[rarity]   ${surface.surface.padEnd(9)} ${surface.decision.padEnd(12)} ${surface.reason_code}`,
      );
    }
    if (result.rarity_context.length > 1) {
      console.log(
        "[rarity] note               each figure is within one resource version only; the sex partitions are never combined",
      );
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[rarity] unexpected error:", err);
  process.exitCode = 1;
});
