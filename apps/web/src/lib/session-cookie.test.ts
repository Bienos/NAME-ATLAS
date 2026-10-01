import { describe, expect, it } from "vitest";
import {
  clearedSessionCookie,
  cookieValue,
  SESSION_COOKIE_DAYS,
  sessionCookie,
  sessionCookieName,
} from "./session-cookie.js";

const TOKEN = "A".repeat(43);

describe("the session cookie (TASK-062, ADR-0027 §2.5)", () => {
  it("is HttpOnly, SameSite=Lax, site-wide, and Secure with the __Host- prefix on HTTPS", () => {
    const value = sessionCookie(TOKEN, true);
    expect(value.startsWith(`__Host-na_session=${TOKEN};`)).toBe(true);
    for (const part of ["Path=/", "HttpOnly", "SameSite=Lax", "Secure"]) {
      expect(value, part).toContain(part);
    }
    expect(value).not.toContain("Domain");
  });

  it("is not Secure and has no prefix where the site is served over HTTP", () => {
    const value = sessionCookie(TOKEN, false);
    expect(value.startsWith(`na_session=${TOKEN};`)).toBe(true);
    expect(value).not.toContain("Secure");
    expect(value).toContain("HttpOnly");
    expect(sessionCookieName(false)).toBe("na_session");
  });

  it("outlives any session row: the database decides (400 days)", () => {
    expect(sessionCookie(TOKEN, true)).toContain(`Max-Age=${String(SESSION_COOKIE_DAYS * 86_400)}`);
    expect(SESSION_COOKIE_DAYS).toBeGreaterThan(30);
  });

  it("is removed with an empty value and Max-Age=0, under the same attributes", () => {
    for (const secure of [true, false]) {
      const value = clearedSessionCookie(secure);
      expect(value.startsWith(`${sessionCookieName(secure)}=;`)).toBe(true);
      expect(value).toContain("Max-Age=0");
      expect(value).toContain("HttpOnly");
      expect(value).toContain("Path=/");
    }
  });

  it("is read out of a Cookie header by name, among others", () => {
    const name = sessionCookieName(true);
    expect(cookieValue(`a=1; ${name}=${TOKEN}; b=2`, name)).toBe(TOKEN);
    expect(cookieValue(`${name}=${TOKEN}`, name)).toBe(TOKEN);
    expect(cookieValue(`x${name}=${TOKEN}`, name)).toBeNull();
    expect(cookieValue(`${name}=; a=1`, name)).toBeNull();
    expect(cookieValue("a=1", name)).toBeNull();
    expect(cookieValue(null, name)).toBeNull();
    expect(cookieValue("novalue", name)).toBeNull();
  });
});
