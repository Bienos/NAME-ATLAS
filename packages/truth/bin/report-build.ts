#!/usr/bin/env tsx
/**
 * Freezes one surname's report as its next version, under the INTERNAL_TEST
 * entitlement (TASK-119), and prints what it froze as JSON. With
 * `--given-name`, the full-name report for that first name and surname
 * (TASK-124).
 *
 *   pnpm report:build -- --surname KOWALCZYK
 *   pnpm report:build -- --surname KOWALCZYK --given-name JAN
 *
 * It writes: `DATABASE_URL` must be a role that may insert into the report
 * tables, not the read-only web role. Nothing is offered or sold. A full name
 * is never printed (ADR-0032 §7): the output identifies the version by its id.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { buildFullNameReport, buildReport } from "../src/report.js";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  const value = process.argv[i + 1]?.trim();
  return value === undefined || value === "" || value.startsWith("--") ? "" : value;
}

const surname = arg("--surname");
const givenName = arg("--given-name");
if (surname === undefined || surname === "" || givenName === "") {
  console.error("usage: pnpm report:build -- --surname NAME [--given-name NAME]");
  process.exit(2);
}

const db = createDb(createPool(loadDbConfig(), { max: 2 }));
try {
  const outcome =
    givenName === undefined
      ? await buildReport(db, surname)
      : await buildFullNameReport(db, { givenName, surname });
  if (outcome.kind !== "BUILT") {
    console.error(
      givenName === undefined ? `[report] ${surname}: ${outcome.kind}` : `[report] ${outcome.kind}`,
    );
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
