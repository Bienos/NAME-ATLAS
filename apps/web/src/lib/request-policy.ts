import type { RateLimitPolicy } from "./rate-limit.js";

/**
 * What each kind of request is held to (TASK-029; the account's bucket,
 * TASK-062). In `lib/` rather than in `middleware.ts` so a test can read it;
 * `middleware.ts` applies it. See that file for why the limits are generous, and
 * `rate-limit.ts` for what a per-instance limit can and cannot do.
 */

/** Pages: generous, because a reader clicking around must never hit this. */
export const PAGE_POLICY: RateLimitPolicy = { limit: 60, windowMs: 60_000 };

/** The JSON API: tighter, because it is a machine surface with no reader behind it. */
export const API_POLICY: RateLimitPolicy = { limit: 30, windowMs: 60_000 };

/**
 * Suggest-as-you-type has a reader behind it and fires as they type — a few
 * requests per surname even with the client's pause between keystrokes. Its own
 * bucket (the key carries the limit), so typing can never starve the other API
 * routes, and a ceiling that still bounds one client to two queries a second.
 */
export const PREFIX_POLICY: RateLimitPolicy = { limit: 120, windowMs: 60_000 };
export const PREFIX_PATH = "/api/v1/surname-prefix";

/**
 * The account's forms (TASK-062): a sign-in, a sign-up or a reset is a person at
 * a keyboard, ten a minute is far above that, and a script guessing passwords
 * or mailing addresses is held to it per instance. Its own bucket. The real
 * controls are the per-address throttle in the database and the mail provider's
 * own limits.
 */
export const ACCOUNT_POLICY: RateLimitPolicy = { limit: 10, windowMs: 60_000 };
export const ACCOUNT_PATH = "/api/account/";

/** The longest window of any policy: what an eviction sweep keeps. */
export const LONGEST_WINDOW_MS = Math.max(
  PAGE_POLICY.windowMs,
  API_POLICY.windowMs,
  PREFIX_POLICY.windowMs,
  ACCOUNT_POLICY.windowMs,
);

/** The limit a path is held to. */
export function policyFor(pathname: string): RateLimitPolicy {
  if (pathname === PREFIX_PATH) return PREFIX_POLICY;
  if (pathname.startsWith(ACCOUNT_PATH)) return ACCOUNT_POLICY;
  return pathname.startsWith("/api/") ? API_POLICY : PAGE_POLICY;
}
