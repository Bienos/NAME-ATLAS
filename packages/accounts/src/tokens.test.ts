import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { emailKey, hashToken, isTokenShape, newToken, TOKEN_BYTES } from "./tokens.js";

describe("TASK-061 AC-2: tokens", () => {
  it("are 32 random bytes as 43 base64url characters, different each time", () => {
    const a = newToken();
    const b = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(Buffer.from(a, "base64url")).toHaveLength(TOKEN_BYTES);
    expect(a).not.toBe(b);
  });

  it("are kept as their SHA-256, 32 bytes", () => {
    const token = "A".repeat(43);
    expect(hashToken(token)).toEqual(createHash("sha256").update(token, "utf8").digest());
    expect(hashToken(token)).toHaveLength(32);
  });

  it("accept only the shape they are issued in, so a malformed one never reaches the database", () => {
    expect(isTokenShape(newToken())).toBe(true);
    for (const bad of [
      "",
      "short",
      "A".repeat(42),
      "A".repeat(44),
      `${"A".repeat(42)}=`,
      `${"A".repeat(42)} `,
      `${"A".repeat(42)}'`,
      "../".repeat(15),
      null,
      undefined,
      42,
      {},
    ]) {
      expect(isTokenShape(bad), String(bad)).toBe(false);
    }
  });

  it("key a sign-in failure by a digest that is not the plain SHA-256 of the address", () => {
    const key = emailKey("anna@example.com");
    expect(key).toHaveLength(32);
    expect(key).not.toEqual(createHash("sha256").update("anna@example.com").digest());
    expect(emailKey("anna@example.com")).toEqual(key);
    expect(emailKey("ania@example.com")).not.toEqual(key);
  });
});
