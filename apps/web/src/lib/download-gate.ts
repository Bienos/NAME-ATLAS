import type { AccountsRuntime } from "./accounts-runtime.js";
import { cookieValue, sessionCookieName } from "./session-cookie.js";

/**
 * Who may take a share card's image (TASK-064, ADR-0027 §5.4).
 *
 * - `off`: accounts are not switched on, so the image is public as it always was.
 * - `open`: the request carries a session cookie that names a live session.
 * - `sign-in`: it does not. A request with no cookie costs no database read.
 * - `unavailable`: there is a cookie and the accounts database cannot say what it
 *   names. The image is withheld rather than given: the reader is not told to sign
 *   in again, because the reader may well be signed in.
 */
export type GateVerdict = "off" | "open" | "sign-in" | "unavailable";

export async function downloadGate(
  runtime: Pick<AccountsRuntime, "accounts" | "secure"> | null,
  cookieHeader: string | null,
): Promise<GateVerdict> {
  if (runtime === null) return "off";
  const token = cookieValue(cookieHeader, sessionCookieName(runtime.secure));
  if (token === null) return "sign-in";
  try {
    return (await runtime.accounts.sessionFromToken(token)) === null ? "sign-in" : "open";
  } catch {
    return "unavailable";
  }
}
