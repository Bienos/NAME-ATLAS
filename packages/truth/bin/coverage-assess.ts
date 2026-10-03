#!/usr/bin/env tsx
/**
 * Assesses every surname's coverage on the PAID surface (TASK-075) and prints
 * the tally as Markdown.
 *
 *   pnpm coverage:assess > coverage-assessment.md
 *   pnpm coverage:assess -- --limit 2000 --concurrency 4
 *
 * Read-only. Each surname is read through the query service, as a page is, so
 * a full register takes a while; progress goes to stderr.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { coverageRun, coverageRunMarkdown } from "../src/coverage-assessment.js";

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
  const tally = await coverageRun(db, {
    concurrency,
    ...(limit === undefined ? {} : { limit }),
    onProgress: (read) => {
      if (read % 10_000 === 0) console.error(`[coverage] ${read} surnames read`);
    },
  });
  console.log(
    `# Name Atlas — coverage on the paid surface (${new Date().toISOString().slice(0, 10)})\n`,
  );
  console.log(coverageRunMarkdown(tally));
  console.error(`[coverage] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
} finally {
  await db.destroy();
}
