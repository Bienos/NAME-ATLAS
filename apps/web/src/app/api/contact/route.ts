import { createLogger } from "@name-atlas/logging";
import { contactMailer, handleContactPost } from "../../../lib/contact-routes.js";

/**
 * `POST /api/contact` — the contact page's form posts here. The handler is in
 * `lib/contact-routes.ts`; a Next route module may export only its handlers.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handleContactPost(request, {
    mailer: contactMailer(),
    log: createLogger({ service: "web", base: { route: "/api/contact" } }),
  });
}
