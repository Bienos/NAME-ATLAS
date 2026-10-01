import { normalisePassword, PASSWORD_MAX, PASSWORD_MIN } from "./password.js";

/**
 * What an address and a password must look like (ADR-0027 §2.4).
 *
 * Deliberately plain. An address is checked for shape only: the real test is
 * that the verification mail arrives. A password has a length and a short
 * blocklist and no composition rules (NIST SP 800-63B).
 */

export type EmailCheck =
  | { readonly ok: true; readonly email: string; readonly normalised: string }
  | { readonly ok: false };

const EMAIL_MAX = 254;
const LOCAL_MAX = 64;

/** The address as typed (trimmed) and the form that is unique and looked up (NFC, lower case). */
export function checkEmail(input: unknown): EmailCheck {
  if (typeof input !== "string") return { ok: false };
  const email = input.trim();
  if (email.length < 3 || email.length > EMAIL_MAX) return { ok: false };
  // No whitespace and no control character anywhere: a header cannot be injected through it.
  if (/\s/u.test(email) || [...email].some((char) => (char.codePointAt(0) ?? 0) < 0x20)) {
    return { ok: false };
  }
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@")) return { ok: false };
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > LOCAL_MAX) return { ok: false };
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return { ok: false };
  if (domain.includes("..") || domain.length < 4) return { ok: false };
  return { ok: true, email, normalised: email.normalize("NFC").toLowerCase() };
}

export type PasswordProblem = "TOO_SHORT" | "TOO_LONG" | "SAME_AS_EMAIL" | "TOO_COMMON";

/** The commonest passwords that satisfy the length rule, lower case. */
const COMMON = new Set([
  "password12",
  "password123",
  "password1234",
  "passw0rd123",
  "1234567890",
  "12345678910",
  "123456789012",
  "0123456789",
  "9876543210",
  "qwertyuiop",
  "qwerty1234",
  "qwerty12345",
  "qwerty123456",
  "1q2w3e4r5t",
  "zaq12wsx",
  "zaq1zaq1zaq1",
  "haslo12345",
  "haslohaslo",
  "polska1234",
  "abcdefghij",
  "iloveyou12",
  "letmein123",
  "welcome123",
  "admin12345",
  "changeme123",
]);

/**
 * The first thing wrong with a password, or null. `email` is the normalised
 * address it is for, when there is one: a password equal to it is refused.
 */
export function checkPassword(password: string, email: string | null): PasswordProblem | null {
  const normalised = normalisePassword(password);
  const length = [...normalised].length;
  if (length < PASSWORD_MIN) return "TOO_SHORT";
  if (length > PASSWORD_MAX) return "TOO_LONG";
  const lower = normalised.toLowerCase();
  if (email !== null && lower === email.toLowerCase()) return "SAME_AS_EMAIL";
  if (COMMON.has(lower) || new Set([...lower]).size === 1) return "TOO_COMMON";
  return null;
}
