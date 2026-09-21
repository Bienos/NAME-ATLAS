/**
 * A fixed-window rate limiter (TASK-029).
 *
 * Pure and storage-agnostic so the policy is testable without a request, a
 * clock or a network.
 *
 * ## What this can and cannot do
 *
 * The default store is a `Map` in the process. On a long-lived server that is a
 * real limit. **On a serverless host it is per-instance**: ten instances means
 * ten times the allowance, and an attacker spread across instances sees a
 * proportionally higher ceiling. It is a speed bump against one impatient
 * client or one misbehaving script, not a defence against a distributed flood.
 *
 * The real defence for that is upstream — a CDN or WAF rule — and it belongs
 * there because it must reject traffic before it costs a database connection.
 * This exists because "nothing at all" is worse than a speed bump, and because
 * the honest thing is to say which one it is rather than to imply the other.
 */

export interface RateLimitDecision {
  readonly allowed: boolean;
  /** Requests still permitted in this window. */
  readonly remaining: number;
  /** Seconds until the window resets, for `Retry-After`. */
  readonly resetSeconds: number;
  readonly limit: number;
}

export interface RateLimitPolicy {
  /** Requests permitted per window. */
  readonly limit: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
}

interface Window {
  count: number;
  startedAt: number;
}

export type RateLimitStore = Map<string, Window>;

/**
 * Fixed window rather than sliding: it needs one integer per key instead of a
 * list of timestamps, which matters when the key space is every IP that ever
 * visits. The cost is that a client can spend its whole allowance at the end of
 * one window and again at the start of the next. For a speed bump that is fine;
 * it is recorded so nobody mistakes it for a token bucket.
 */
export function rateLimit(
  store: RateLimitStore,
  key: string,
  policy: RateLimitPolicy,
  now: number,
): RateLimitDecision {
  const existing = store.get(key);
  const window: Window =
    existing === undefined || now - existing.startedAt >= policy.windowMs
      ? { count: 0, startedAt: now }
      : existing;

  window.count += 1;
  store.set(key, window);

  const elapsed = now - window.startedAt;
  const resetSeconds = Math.max(0, Math.ceil((policy.windowMs - elapsed) / 1000));
  const allowed = window.count <= policy.limit;

  return {
    allowed,
    remaining: Math.max(0, policy.limit - window.count),
    resetSeconds,
    limit: policy.limit,
  };
}

/**
 * Drops windows that have expired.
 *
 * Without this the store grows by one entry per distinct client for the life of
 * the process — an unbounded map keyed by something a stranger chooses, which
 * is a memory leak with a public trigger. Called opportunistically rather than
 * on a timer, so there is nothing to shut down.
 */
export function evictExpired(store: RateLimitStore, policy: RateLimitPolicy, now: number): number {
  let removed = 0;
  for (const [key, window] of store) {
    if (now - window.startedAt >= policy.windowMs) {
      store.delete(key);
      removed += 1;
    }
  }
  return removed;
}

/**
 * The client's address, from the headers a proxy sets.
 *
 * `x-forwarded-for` is a comma-separated chain and only the **first** entry is
 * the original client; the rest are proxies. It is also trivially forged when
 * nothing trusted sets it, which is why the limit it feeds is a speed bump.
 * `null` where no address can be read — those requests share one bucket rather
 * than bypassing the limit entirely.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "unknown";
}
