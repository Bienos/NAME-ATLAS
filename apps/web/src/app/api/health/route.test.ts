import { describe, expect, it } from "vitest";
import { GET } from "./route.js";

describe("GET /api/health", () => {
  it("returns a static ok payload", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual({ status: "ok" });
  });
});
