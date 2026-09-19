import { describe, expect, it } from "vitest";
import { GET } from "./route.js";

/**
 * Request-shape handling for `GET /api/v1/surname-results`.
 *
 * These cases are rejected **before** any database connection is opened, so
 * they need no database. Everything past that point — resolution, the truth
 * lookup, rights and projection — is exercised end to end by
 * `tests/integration/src/surname-result-api.test.ts` against a real
 * PostgreSQL, because mocking the service here would prove nothing about
 * the real chain (TASK-006 AC-22).
 */
describe("GET /api/v1/surname-results — request shape", () => {
  it("rejects a request with no surname parameter", async () => {
    const response = await GET(new Request("http://localhost/api/v1/surname-results"));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; retryable: boolean } };
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.retryable).toBe(false);
  });

  it("rejects an unknown surface", async () => {
    const response = await GET(
      new Request("http://localhost/api/v1/surname-results?surname=Nowak&surface=BILLBOARD"),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.message).toContain("FREE");
  });

  it("carries a request id on every error", async () => {
    const response = await GET(new Request("http://localhost/api/v1/surname-results"));
    const body = (await response.json()) as { error: { request_id: string } };
    expect(body.error.request_id.length).toBeGreaterThan(0);
  });

  it("leaks nothing about the implementation in a rejection", async () => {
    const response = await GET(new Request("http://localhost/api/v1/surname-results"));
    const serialized = JSON.stringify(await response.json());
    for (const leak of ["postgres", "SELECT", "node_modules", "/home/", "Error:", "at "]) {
      expect(serialized).not.toContain(leak);
    }
  });
});
