import { createLogger } from "@name-atlas/logging";
import { accountsRuntime } from "../../../../lib/accounts-runtime.js";
import { handleGoogleStart } from "../../../../lib/google-routes.js";

/**
 * `GET /api/account/google` — starts a Google sign-in (TASK-084, ADR-0033).
 * A 404 unless accounts are on with Google configured. The handler is in
 * `lib/google-routes.ts`.
 */

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const runtime = accountsRuntime();
  if (runtime === null || runtime.google === null) {
    return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  }
  return handleGoogleStart(request, {
    google: runtime.google,
    origin: runtime.origin,
    secure: runtime.secure,
    log: createLogger({ service: "web", base: { route: "/api/account/google" } }),
  });
}
