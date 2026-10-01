import { createLogger } from "@name-atlas/logging";
import { handleAccountsPurge } from "../../../../lib/account-routes.js";
import { accountsRuntime } from "../../../../lib/accounts-runtime.js";

/**
 * `GET /api/cron/accounts-purge` — Vercel's daily cron (`vercel.json`, TASK-062).
 * It removes what has expired from schema `accounts`, among it the pending
 * addresses the privacy notice promises are gone after 7 days. Accounts off: 204.
 * Otherwise the call must carry `Authorization: Bearer $CRON_SECRET`.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const runtime = accountsRuntime();
  return handleAccountsPurge(
    request,
    runtime === null ? null : { accounts: runtime.accounts, cronSecret: runtime.cronSecret },
    createLogger({ service: "web", base: { route: "/api/cron/accounts-purge" } }),
  );
}
