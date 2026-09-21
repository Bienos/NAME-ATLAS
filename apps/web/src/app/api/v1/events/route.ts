import { NextResponse } from "next/server";
import { createLogger } from "@name-atlas/logging";
import { readEventBody } from "../../../../lib/events.js";

/**
 * `POST /api/v1/events` — the product-event sink (TASK-024).
 *
 * There is no analytics vendor in this project, and the directive (§54) says not
 * to add one for its own sake. What exists is the structured logger (TASK-019),
 * and it is enough for the metrics the directive names, so events go there.
 *
 * The body is an event name and **nothing else**; `readEventBody` in
 * `lib/events.ts` holds the allow-list and the shape rule. That is the mechanism
 * by which a raw surname, a family detail or a session token cannot reach a log
 * through this route: there is no field to put one in.
 *
 * The response is 202 and carries no body worth reading. Telemetry never tells a
 * client anything, and never fails a reader's page.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const log = createLogger({ service: "web", base: { route: "/api/v1/events" } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  const read = readEventBody(body);
  if (!read.ok) {
    // Refused without logging the body: an unexpected field is exactly the
    // thing that must not be written anywhere. Only its count is recorded.
    log.warn("event_rejected", { fields: read.fields });
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  log.info("product_event", { event: read.event });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
