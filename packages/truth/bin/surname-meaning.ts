#!/usr/bin/env tsx
/**
 * `SURNAME_MEANING` demo (TASK-022, ADR-0008).
 *
 *   pnpm demo:surname-meaning KOWALCZYK [NOWAK …]
 *
 * Several surnames run in one process, one after another (TASK-081: the VM's
 * `meanings` step derives every surname of a work this way).
 *
 * Prints what the chain actually holds, including the case that will be the
 * answer for every surname until an onomastic source is imported: **no sourced
 * meaning**. That is not a failure of this script, and it prints as a plain
 * statement rather than an empty result.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { deriveSurnameMeaning } from "../src/meaning.js";

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  process.stderr.write("usage: surname-meaning <surname> [<surname> …]\n");
  process.exit(2);
}

const db = createDb(createPool(loadDbConfig()));
try {
  for (const input of inputs) {
    const result = await deriveSurnameMeaning(db, input);

    if (result.kind === "NO_RESULT") {
      process.stdout.write(`${input}: ${result.reason} — ${result.message}\n`);
    } else if (result.meaning === null) {
      process.stdout.write(
        `${result.surname.canonical_display}: NO SOURCED MEANING.\n` +
          "  No admissible onomastic work covers this surname. That is a stated gap, not a\n" +
          "  guess withheld: ADR-0008 §2 forbids generating a meaning.\n",
      );
    } else {
      const m = result.meaning;
      process.stdout.write(
        `${result.surname.canonical_display}: ${m.confidence_status} ` +
          `(${String(m.interpretations.length)} interpretation(s))\n`,
      );
      for (const i of m.interpretations) {
        process.stdout.write(
          `  - ${i.literal_gloss}\n` +
            `    root: ${i.root_form ?? "(none proposed)"} (${i.root_language ?? "—"}), ` +
            `type: ${i.formation_type}\n` +
            `    ${i.work_author_or_publisher}, ${i.work_title} (${String(i.work_year)}), ${i.locator}\n`,
        );
      }
      process.stdout.write(`  rationale: ${m.rationale ?? "(none)"}\n`);
    }
  }
} finally {
  await db.destroy();
}
