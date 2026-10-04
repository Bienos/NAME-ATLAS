import { createLogger } from "@name-atlas/logging";
import { familyRuntime } from "../../../../../../lib/family-runtime.js";
import { handleTreeExport } from "../../../../../../lib/tree-export.js";

/**
 * `GET /api/v1/trees/{id}/export` — the tree as a JSON download (TASK-098,
 * ADR-0029 §2.4.14). The tree off: 404, as if the route did not exist. The
 * handler is in `lib/tree-export.ts`; a Next route module may export only its
 * handlers.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<Response> {
  const runtime = familyRuntime();
  if (runtime === null) return new Response("Not found", { status: 404 });
  const { id } = await context.params;
  return handleTreeExport(id, request, {
    family: runtime.family,
    accounts: runtime.accounts,
    secure: runtime.secure,
    log: createLogger({ service: "web", base: { route: "/api/v1/trees/export" } }),
  });
}
