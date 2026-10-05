#!/usr/bin/env tsx
/**
 * Builds every surname's DiscoveryIndex on the PAID surface (TASK-116) and
 * prints the tally as Markdown.
 *
 *   pnpm discovery:index > discovery-index.md
 *   pnpm discovery:index -- --limit 2000 --concurrency 4
 *
 * Read-only. Each surname is read through the query service, as a page is, so
 * a full register takes a while; progress goes to stderr.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { discoveryRun, discoveryRunMarkdown } from "../src/discovery-index.js";

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
  const tally = await discoveryRun(db, {
    concurrency,
    ...(limit === undefined ? {} : { limit }),
    onProgress: (read) => {
      if (read % 10_000 === 0) console.error(`[discovery] ${read} surnames read`);
    },
  });
  console.log(
    `# Name Atlas — DiscoveryIndex on the paid surface (${new Date().toISOString().slice(0, 10)})\n`,
  );
  console.log(discoveryRunMarkdown(tally));
  console.error(`[discovery] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
} finally {
  await db.destroy();
}
