import { describe, expect, it } from "vitest";
import { clientKey, evictExpired, rateLimit } from "./rate-limit.js";
import type { RateLimitPolicy, RateLimitStore } from "./rate-limit.js";

const POLICY: RateLimitPolicy = { limit: 3, windowMs: 1000 };

describe("rateLimit", () => {
  it("allows up to the limit and refuses the next", () => {
    const store: RateLimitStore = new Map();
    const at = (n: number) => rateLimit(store, "a", POLICY, 1000 + n);
    expect(at(0).allowed).toBe(true);
    expect(at(1).allowed).toBe(true);
    expect(at(2).allowed).toBe(true);
    expect(at(3).allowed).toBe(false);
  });

  it("counts down the remaining allowance and never goes negative", () => {
    const store: RateLimitStore = new Map();
    expect(rateLimit(store, "a", POLICY, 0).remaining).toBe(2);
    expect(rateLimit(store, "a", POLICY, 1).remaining).toBe(1);
    expect(rateLimit(store, "a", POLICY, 2).remaining).toBe(0);
    expect(rateLimit(store, "a", POLICY, 3).remaining).toBe(0);
  });

  it("keeps separate clients separate", () => {
    const store: RateLimitStore = new Map();
    for (let i = 0; i < 3; i += 1) rateLimit(store, "a", POLICY, 0);
    expect(rateLimit(store, "a", POLICY, 0).allowed).toBe(false);
    // One noisy client must not lock everyone else out.
    expect(rateLimit(store, "b", POLICY, 0).allowed).toBe(true);
  });

  it("starts a new window once the old one has passed", () => {
    const store: RateLimitStore = new Map();
    for (let i = 0; i < 4; i += 1) rateLimit(store, "a", POLICY, 0);
    expect(rateLimit(store, "a", POLICY, 999).allowed).toBe(false);
    expect(rateLimit(store, "a", POLICY, 1000).allowed).toBe(true);
  });

  it("reports when the window resets, for Retry-After", () => {
    const store: RateLimitStore = new Map();
    expect(rateLimit(store, "a", POLICY, 0).resetSeconds).toBe(1);
    expect(rateLimit(store, "a", POLICY, 500).resetSeconds).toBe(1);
    // Never negative: a client told to retry in -3 seconds retries immediately.
    expect(rateLimit(store, "a", POLICY, 999).resetSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe("evictExpired", () => {
  it("drops expired windows so the map cannot grow without bound", () => {
    // The store is keyed by something a stranger chooses, so without eviction
    // it is a memory leak with a public trigger.
    const store: RateLimitStore = new Map();
    for (let i = 0; i < 500; i += 1) rateLimit(store, `client-${String(i)}`, POLICY, 0);
    expect(store.size).toBe(500);
    expect(evictExpired(store, POLICY, 5000)).toBe(500);
    expect(store.size).toBe(0);
  });

  it("keeps windows that are still live", () => {
    const store: RateLimitStore = new Map();
    rateLimit(store, "fresh", POLICY, 900);
    rateLimit(store, "stale", POLICY, 0);
    evictExpired(store, POLICY, 1000);
    expect([...store.keys()]).toEqual(["fresh"]);
  });
});

describe("clientKey", () => {
  it("takes the first entry of x-forwarded-for, which is the client", () => {
    // The rest of the chain is proxies; using the last would bucket everyone
    // behind one proxy together.
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" });
    expect(clientKey(h)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientKey(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("buckets unidentifiable requests together rather than exempting them", () => {
    // Returning a unique key per unknown request would give every anonymous
    // caller its own full allowance, which is the same as no limit at all.
    expect(clientKey(new Headers())).toBe("unknown");
    expect(clientKey(new Headers())).toBe(clientKey(new Headers()));
  });
});
