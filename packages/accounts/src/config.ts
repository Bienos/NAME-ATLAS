import type { ResendConfig } from "./mailer.js";

/**
 * The mail configuration (ADR-0027 §2.8): `RESEND_API_KEY` and
 * `ACCOUNTS_MAIL_FROM`, both or neither. Missing either returns null, and
 * accounts are off: a sign-up that cannot be confirmed must not be accepted.
 */
export function loadMailConfig(env: NodeJS.ProcessEnv = process.env): ResendConfig | null {
  const apiKey = env["RESEND_API_KEY"]?.trim();
  const from = env["ACCOUNTS_MAIL_FROM"]?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}
