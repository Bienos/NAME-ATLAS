import { describe, expect, it } from "vitest";
import {
  createPasswordHasher,
  hashPassword,
  needsRehash,
  PASSWORD_PARAMS,
  verifyPassword,
} from "./password.js";

/** Cheap parameters for the many hashes a test makes; one test uses the real ones. */
const CHEAP = { N: 1_024, r: 8, p: 1 } as const;

describe("TASK-061 AC-6: password hashing", () => {
  it("records its parameters and verifies the right password only", async () => {
    const stored = await hashPassword("correct horse battery", CHEAP);
    expect(stored).toMatch(/^scrypt\$N=1024,r=8,p=1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/u);
    expect(await verifyPassword(stored, "correct horse battery")).toBe(true);
    expect(await verifyPassword(stored, "correct horse batterY")).toBe(false);
    expect(await verifyPassword(stored, "")).toBe(false);
  });

  it("makes a different hash for the same password, from a fresh salt", async () => {
    const a = await hashPassword("same password here", CHEAP);
    const b = await hashPassword("same password here", CHEAP);
    expect(a).not.toBe(b);
    expect(await verifyPassword(a, "same password here")).toBe(true);
    expect(await verifyPassword(b, "same password here")).toBe(true);
  });

  it("treats a password and its NFKC form as the same password", async () => {
    // U+FB01 (the "fi" ligature) normalises to "fi".
    const stored = await hashPassword("ﬁnal-password-1", CHEAP);
    expect(await verifyPassword(stored, "final-password-1")).toBe(true);
  });

  it("refuses a hash this module did not write, or a malformed one, without throwing", async () => {
    const good = await hashPassword("some password 1", CHEAP);
    const [, params, salt, key] = good.split("$") as [string, string, string, string];
    for (const bad of [
      "",
      "plain-text-password",
      "bcrypt$10$abc$def",
      `scrypt$${params}$${salt}`,
      `scrypt$${params}$${salt}$${key}$extra`,
      `scrypt$N=1000,r=8,p=1$${salt}$${key}`, // not a power of two
      `scrypt$N=512,r=8,p=1$${salt}$${key}`, // below the floor
      `scrypt$N=2147483648,r=8,p=1$${salt}$${key}`, // a tampered row asking for gigabytes
      `scrypt$N=1024,r=99,p=1$${salt}$${key}`,
      `scrypt$N=1024,r=8,p=99$${salt}$${key}`,
      `scrypt$${params}$AAAA$${key}`, // salt too short
      `scrypt$${params}$${salt}$AAAA`, // key too short
    ]) {
      expect(await verifyPassword(bad, "some password 1"), bad).toBe(false);
    }
  });

  it("says when a hash was made with weaker parameters than the current ones", async () => {
    const weak = await hashPassword("a password to age", CHEAP);
    expect(needsRehash(weak, CHEAP)).toBe(false);
    expect(needsRehash(weak, PASSWORD_PARAMS)).toBe(true);
    expect(needsRehash("not a hash", CHEAP)).toBe(true);
  });

  it("uses scrypt N=2^16, r=8, p=2 in production, and the hasher applies its parameters", async () => {
    expect(PASSWORD_PARAMS).toEqual({ N: 65_536, r: 8, p: 2 });
    const stored = await hashPassword("a long enough password");
    expect(stored.startsWith("scrypt$N=65536,r=8,p=2$")).toBe(true);
    expect(await verifyPassword(stored, "a long enough password")).toBe(true);
    const hasher = createPasswordHasher(CHEAP);
    const cheap = await hasher.hash("another password!");
    expect(cheap.startsWith("scrypt$N=1024,r=8,p=1$")).toBe(true);
    expect(hasher.needsRehash(cheap)).toBe(false);
    expect(await hasher.verify(cheap, "another password!")).toBe(true);
  });
});
