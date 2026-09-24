import { describe, expect, it } from "vitest";
import { GET } from "./route.js";

/**
 * Request shape for `GET /api/v1/surname-prefix`. Everything past the database
 * boundary is exercised against a real PostgreSQL by
 * `tests/integration/src/surname-prefix.test.ts` and against the running app.
 */
describe("GET /api/v1/surname-prefix — request shape", () => {
  it("rejects a request with no q parameter", async () => {
    const response = await GET(new Request("http://localhost/api/v1/surname-prefix"));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.retryable).toBe(false);
  });

  it("answers a failure with the error envelope and a request id, never a bare 500", async () => {
    // No DATABASE_URL in this suite, so the lookup fails after validation.
    const response = await GET(new Request("http://localhost/api/v1/surname-prefix?q=kow"));
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: { code: string; request_id: string } };
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(response.headers.get("x-request-id")).toBe(body.error.request_id);
  });
});
