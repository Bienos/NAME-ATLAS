import { describe, expect, it } from "vitest";
import { POST } from "./route.js";
import { PRODUCT_EVENTS } from "../../../../lib/events.js";

/** TASK-024 AC-7 — the event sink accepts a name and nothing else. */
function post(body: unknown): Request {
  return new Request("http://localhost/api/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/v1/events", () => {
  it("accepts every allow-listed event", async () => {
    for (const event of PRODUCT_EVENTS) {
      const res = await POST(post({ event }));
      expect(res.status).toBe(202);
    }
  });

  it("rejects an unknown event name", async () => {
    expect((await POST(post({ event: "user_typed_surname" }))).status).toBe(400);
  });

  it("rejects any field other than event — there is nowhere to put a surname", async () => {
    expect((await POST(post({ event: "share_started", surname: "NOWAK" }))).status).toBe(400);
    expect((await POST(post({ event: "share_started", q: "x" }))).status).toBe(400);
  });

  it("rejects a non-object body and malformed JSON", async () => {
    expect((await POST(post(["share_started"]))).status).toBe(400);
    expect((await POST(post("{not json"))).status).toBe(400);
    expect((await POST(post(null))).status).toBe(400);
  });
});
