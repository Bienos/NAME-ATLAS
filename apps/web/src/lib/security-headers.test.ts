import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config.js";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./security-headers.js";

function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split(";").map((d) => {
      const [name = "", ...values] = d.trim().split(/\s+/);
      return [name, values.join(" ")];
    }),
  );
}

describe("security headers (TASK-048)", () => {
  it("next.config applies every header to every path", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toEqual([{ source: "/:path*", headers: [...SECURITY_HEADERS] }]);
  });

  it("carries the baseline set", () => {
    const byKey = new Map(SECURITY_HEADERS.map((h) => [h.key, h.value]));
    expect(byKey.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains");
    expect(byKey.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(byKey.get("X-Frame-Options")).toBe("DENY");
    expect(byKey.get("Permissions-Policy")).toContain("camera=()");
    expect(byKey.get("Permissions-Policy")).toContain("geolocation=()");
    expect(byKey.get("Content-Security-Policy-Report-Only")).toBe(CONTENT_SECURITY_POLICY);
  });

  it("does not enforce the CSP yet, and never blocks the share cards or opens CORS", () => {
    const keys = SECURITY_HEADERS.map((h) => h.key);
    expect(keys).not.toContain("Content-Security-Policy");
    expect(keys).not.toContain("Cross-Origin-Resource-Policy");
    expect(keys).not.toContain("Access-Control-Allow-Origin");
    expect(
      SECURITY_HEADERS.find((h) => h.key === "Strict-Transport-Security")?.value,
    ).not.toContain("preload");
  });

  it("keeps the policy strict: no wildcard, no eval, no inline scripts", () => {
    const d = directives(CONTENT_SECURITY_POLICY);
    expect(d.get("default-src")).toBe("'self'");
    expect(d.get("script-src")).toBe("'self'");
    expect(d.get("object-src")).toBe("'none'");
    expect(d.get("base-uri")).toBe("'self'");
    expect(d.get("frame-ancestors")).toBe("'none'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/(^|\s)\*(\s|;|$)/);
    expect(CONTENT_SECURITY_POLICY).not.toContain("unsafe-eval");
  });
});
