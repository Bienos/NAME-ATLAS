import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  GENERATED_OVERVIEW_PATH,
  findWorkspaceRoot,
  loadNationalOverview,
  renderOverviewModule,
} from "../src/lib/national-overview.js";

/**
 * Writes the landing page's national overview as a typed module
 * (tasks/WEB-000-landing-page.md §5). Run it after the source manifest or
 * the PESEL fixtures change; the unit tests fail until it is.
 */
const root = findWorkspaceRoot(process.cwd());
const target = join(root, GENERATED_OVERVIEW_PATH);
writeFileSync(target, renderOverviewModule(loadNationalOverview(root)));
console.log(`wrote ${GENERATED_OVERVIEW_PATH}`);
