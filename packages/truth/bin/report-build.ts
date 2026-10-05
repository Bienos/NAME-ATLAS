#!/usr/bin/env tsx
/**
 * Freezes one surname's report as its next version, under the INTERNAL_TEST
 * entitlement (TASK-119), and prints what it froze as JSON.
 *
 *   pnpm report:build -- --surname KOWALCZYK
 *
 * It writes: `DATABASE_URL` must be a role that may insert into the report
 * tables, not the read-only web role. Nothing is offered or sold.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { buildReport } from "../src/report.js";

const i = process.argv.indexOf("--surname");
const surname = i === -1 ? undefined : process.argv[i + 1]?.trim();
if (surname === undefined || surname === "" || surname.startsWith("--")) {
  console.error("usage: pnpm report:build -- --surname NAME");
  process.exit(2);
}

const db = createDb(createPool(loadDbConfig(), { max: 2 }));
try {
  const outcome = await buildReport(db, surname);
  if (outcome.kind !== "BUILT") {
    console.error(`[report] ${surname}: ${outcome.kind}`);
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify(
        {
          report_id: outcome.report_id,
          report_version_id: outcome.report_version_id,
          version_number: outcome.version_number,
          eligibility: {
            state: outcome.eligibility.state,
            reason_codes: outcome.eligibility.reason_codes,
          },
          sections: outcome.sections.map((s) => ({
            section_type: s.section_type,
            claims: s.claims.length,
            body: s.body_payload,
          })),
        },
        null,
        2,
      ),
    );
  }
} finally {
  await db.destroy();
}
