import { createLogger } from "@name-atlas/logging";
import { familyRuntime } from "../../../../lib/family-runtime.js";
import { handleTreePost } from "../../../../lib/tree-routes.js";

/**
 * `POST /api/tree/<action>` — the tree's forms post here (TASK-076,
 * ADR-0029). The tree off: 404, as if the route did not exist. The handlers
 * are in `lib/tree-routes.ts`; a Next route module may export only its handlers.
 */

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ readonly action: string }> },
): Promise<Response> {
  const runtime = familyRuntime();
  if (runtime === null) return new Response("Not found", { status: 404 });
  const { action } = await context.params;
  return handleTreePost(action, request, {
    family: runtime.family,
    accounts: runtime.accounts,
    secure: runtime.secure,
    livingTermsVersion: runtime.livingTermsVersion,
    log: createLogger({ service: "web", base: { route: "/api/tree" } }),
  });
}
