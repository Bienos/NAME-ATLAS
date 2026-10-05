#!/usr/bin/env tsx
/**
 * Assesses every surname's premium eligibility (TASK-117) and
 * prints the tally as Markdown.
 *
 *   pnpm premium:eligibility > premium-eligibility.md
 *   pnpm premium:eligibility -- --limit 2000 --concurrency 4
 *
 * Read-only. Each surname is read through the query service, as a page is, so
 * a full register takes a while; progress goes to stderr.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import {
  premiumEligibilityRun,
  premiumEligibilityRunMarkdown,
} from "../src/premium-eligibility.js";

function flag(name: string): number | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = Number(process.argv[i + 1]);
  if (!Number.isInteger(value) || value < 1) {
    console.error(`--${name} needs a positive whole number`);
    process.exit(2);
  }
  return value;
}

const concurrency = flag("concurrency") ?? 4;
const limit = flag("limit");
const db = createDb(createPool(loadDbConfig(), { max: concurrency + 1 }));
try {
  const started = Date.now();
  const tally = await premiumEligibilityRun(db, {
    concurrency,
    ...(limit === undefined ? {} : { limit }),
    onProgress: (read) => {
      if (read % 10_000 === 0) console.error(`[eligibility] ${read} surnames read`);
    },
  });
  console.log(`# Name Atlas — premium eligibility (${new Date().toISOString().slice(0, 10)})\n`);
  console.log(premiumEligibilityRunMarkdown(tally));
  console.error(`[eligibility] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
} finally {
  await db.destroy();
}
