import { after } from "next/server";
import { createLogger } from "@name-atlas/logging";
import { handleAccountPost } from "../../../../lib/account-routes.js";
import { accountsRuntime } from "../../../../lib/accounts-runtime.js";

/**
 * `POST /api/account/<action>` — the account's forms post here (TASK-062,
 * ADR-0027). Accounts off: 404, as if the route did not exist. The handlers are
 * in `lib/account-routes.ts`; a Next route module may export only its handlers.
 */

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ readonly action: string }> },
): Promise<Response> {
  const runtime = accountsRuntime();
  if (runtime === null) return new Response("Not found", { status: 404 });
  const { action } = await context.params;
  return handleAccountPost(action, request, {
    accounts: runtime.accounts,
    mailer: runtime.mailer,
    secure: runtime.secure,
    termsVersion: runtime.termsVersion,
    after: (task) => {
      after(task);
    },
    log: createLogger({ service: "web", base: { route: "/api/account" } }),
  });
}
