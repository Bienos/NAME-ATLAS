import { NextResponse } from "next/server";

/**
 * Static health check. TASK-001 §2.17 / §8.7: returns a static OK payload.
 * Deliberately has no dependency on the database or any other service —
 * it proves the app boots and serves, nothing more.
 */
export function GET(): NextResponse {
  return NextResponse.json({ status: "ok" });
}
