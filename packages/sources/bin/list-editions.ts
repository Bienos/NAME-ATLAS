/**
 * Prints every earlier PESEL edition the registry lists (TASK-045), one per
 * line: `<resource_id> <role> <data_date> <official_row_count>`. The shell
 * scripts that fetch, import and gate the editions read the registry through
 * this, so the registry stays the only list.
 *
 *   pnpm exec tsx packages/sources/bin/list-editions.ts
 */
import { PESEL_EDITIONS } from "../src/registry.js";

for (const r of PESEL_EDITIONS) {
  console.log(`${r.resource_id} ${r.role} ${r.data_date} ${String(r.official_row_count)}`);
}
