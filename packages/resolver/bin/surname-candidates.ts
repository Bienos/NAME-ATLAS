#!/usr/bin/env tsx
/**
 * Developer-facing fuzzy candidate demo (TASK-015).
 *
 *   pnpm demo:surname-candidates "Cichwoski"
 *
 * Runs exact resolution first, exactly as a caller must: suggestions exist only
 * for an input that resolved to nothing. Prints each candidate's features and
 * explanation codes, and the length threshold that applied, so the reason a
 * candidate is on the list is visible rather than implied.
 *
 * Exits non-zero when nothing was suggested, so an empty list is never mistaken
 * for a suggestion in a script. An empty list is frequently the correct answer.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { resolveSurname } from "../src/lookup.js";
import { MIN_FUZZY_INPUT_LENGTH, suggestSurnames } from "../src/candidates.js";

function parseSurname(argv: readonly string[]): string {
  const surname = argv.find((arg) => !arg.startsWith("--"));
  if (surname === undefined || surname === "") {
    throw new Error('usage: demo:surname-candidates "<surname>"');
  }
  return surname;
}

async function main(): Promise<void> {
  const input = parseSurname(process.argv.slice(2));
  const db = createDb(createPool(loadDbConfig()));
  try {
    console.log(`[cand] input              ${JSON.stringify(input)}`);

    const exact = await resolveSurname(db, input);
    if (exact.kind === "LOOKUP_FAILED") {
      console.log(`[cand] exact lookup       FAILED at ${exact.stage}`);
      process.exitCode = 1;
      return;
    }
    console.log(`[cand] exact resolution   ${exact.resolution.resolution_status}`);
    if (exact.resolution.resolution_status === "EXACT") {
      console.log(
        `[cand] resolved           ${exact.resolution.resolved_canonical_display ?? "(none)"}`,
      );
      console.log("[cand] no suggestions     an exact surname wins outright (canonical 13 §32.3)");
      return;
    }

    const result = await suggestSurnames(db, input);
    if (result.kind === "LOOKUP_FAILED") {
      console.log(`[cand] retrieval          FAILED — ${result.message}`);
      process.exitCode = 1;
      return;
    }
    if (result.kind === "NO_SUGGESTIONS") {
      console.log(`[cand] suggestions        NONE (${result.reason})`);
      console.log(`[cand] why                ${result.message}`);
      if (result.reason === "INPUT_TOO_SHORT") {
        console.log(
          `[cand] note               fuzzy retrieval starts at ${String(MIN_FUZZY_INPUT_LENGTH)} characters; ` +
            "shorter inputs retrieve unrelated real surnames, so nothing is offered",
        );
      }
      process.exitCode = 1;
      return;
    }

    console.log(`[cand] outcome            ${result.outcome}`);
    console.log(`[cand] decision mode      ${result.decision_mode} (never AUTO)`);
    console.log(
      `[cand] threshold          ${String(result.similarity_threshold)} (${result.threshold_version})`,
    );
    console.log(`[cand] shortlist size     ${String(result.shortlist_size)} before rerank`);
    console.log(`[cand] candidates         ${String(result.candidates.length)}`);
    for (const [index, candidate] of result.candidates.entries()) {
      const f = candidate.features;
      console.log(
        `[cand]   ${String(index + 1).padStart(2)}. ${candidate.generated_form.padEnd(24)} ` +
          `trigram ${f.trigram_similarity.toFixed(3)}  edits ${String(f.edit_distance)}  ` +
          `${f.transposition_detected ? "transposed" : "          "}  ` +
          `score ${candidate.retrieval_rank_score.toFixed(4)}`,
      );
      console.log(`[cand]       ${candidate.explanation_codes.join(", ")}`);
    }
    console.log(`[cand] tier               ${result.candidates[0]?.tier ?? "(none)"}`);
    console.log(`[cand] method             ${result.method_version}`);
    console.log(
      "[cand] note               suggestions only; nothing here resolves, and no claim, count " +
        "or citation can be derived from a fuzzy candidate",
    );
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[cand] unexpected error:", err);
  process.exitCode = 1;
});
