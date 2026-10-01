import { createHash, randomBytes } from "node:crypto";

/**
 * Session and email tokens (ADR-0027 §2.5–§2.6): 32 random bytes, handed out as
 * base64url (43 characters) and kept only as their SHA-256.
 *
 * A token has 256 bits of entropy, so a plain SHA-256 is the right store: a
 * slow hash would protect nothing a guess could reach, and a database read
 * cannot be replayed as a cookie or a link.
 */

export const TOKEN_BYTES = 32;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/u;

export function newToken(random: (size: number) => Buffer = randomBytes): string {
  return random(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

/** A malformed token is refused before it reaches the database. */
export function isTokenShape(value: unknown): value is string {
  return typeof value === "string" && TOKEN_SHAPE.test(value);
}

/**
 * The key of a sign-in failure: the SHA-256 of the address, with a prefix that
 * keeps it from being the same digest as anything else this package hashes.
 */
export function emailKey(normalisedEmail: string): Buffer {
  return createHash("sha256").update(`accounts:email:${normalisedEmail}`, "utf8").digest();
}
