import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientKey, evictExpired, rateLimit } from "./lib/rate-limit.js";
import type { RateLimitPolicy, RateLimitStore } from "./lib/rate-limit.js";

/**
 * Request rate limiting (TASK-029).
 *
 * Every surname page is a database query against an **unbounded, publicly
 * guessable URL space**: `/pl/nazwisko/{anything}`. Publishing a sitemap of
 * 248,406 of them invites exactly the traffic that turns that into a problem,
 * so there is a limit before there is an audience.
 *
 * The limits are deliberately generous. A person reading surnames clicks a few
 * times a minute; 60 a minute is far above that and far below what it takes to
 * exhaust a connection pool. A well-behaved crawler stays under it comfortably,
 * which matters — the point is to survive indexing, not to prevent it.
 *
 * See `lib/rate-limit.ts` for what this does **not** do: the store is
 * per-process, so on a serverless deployment this is a speed bump against one
 * client and not a defence against a distributed flood. That belongs in a CDN
 * or WAF rule, upstream of here, where it can reject a request before it costs
 * a database connection.
 */

/** Pages: generous, because a reader clicking around must never hit this. */
const PAGE_POLICY: RateLimitPolicy = { limit: 60, windowMs: 60_000 };

/** The JSON API: tighter, because it is a machine surface with no reader behind it. */
const API_POLICY: RateLimitPolicy = { limit: 30, windowMs: 60_000 };

/**
 * Suggest-as-you-type has a reader behind it and fires as they type — a few
 * requests per surname even with the client's pause between keystrokes. Its own
 * bucket (the key carries the limit), so typing can never starve the other API
 * routes, and a ceiling that still bounds one client to two queries a second.
 */
const PREFIX_POLICY: RateLimitPolicy = { limit: 120, windowMs: 60_000 };
const PREFIX_PATH = "/api/v1/surname-prefix";

// Module scope, so it is shared across the invocations one instance serves.
const store: RateLimitStore = new Map();

let lastEviction = 0;
const EVICT_EVERY_MS = 60_000;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const policy =
    pathname === PREFIX_PATH
      ? PREFIX_POLICY
      : pathname.startsWith("/api/")
        ? API_POLICY
        : PAGE_POLICY;
  const now = Date.now();

  // Opportunistic: keeps the map from growing by one entry per stranger, with
  // no timer to own and nothing to shut down.
  if (now - lastEviction > EVICT_EVERY_MS) {
    lastEviction = now;
    evictExpired(
      store,
      {
        limit: 0,
        windowMs: Math.max(PAGE_POLICY.windowMs, API_POLICY.windowMs, PREFIX_POLICY.windowMs),
      },
      now,
    );
  }

  const decision = rateLimit(store, `${policy.limit}:${clientKey(request.headers)}`, policy, now);

  if (!decision.allowed) {
    // 429 with `Retry-After`, because a crawler that is told when to come back
    // comes back — one that is refused without a reason may simply drop the URL.
    return new NextResponse("Too many requests. Please slow down.", {
      status: 429,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "retry-after": String(decision.resetSeconds),
        "x-ratelimit-limit": String(decision.limit),
        "x-ratelimit-remaining": "0",
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("x-ratelimit-limit", String(decision.limit));
  response.headers.set("x-ratelimit-remaining", String(decision.remaining));
  return response;
}

/**
 * What the limiter sees.
 *
 * `robots.txt`, `sitemap.xml` and the sitemap pages are **excluded on purpose**:
 * they are how a crawler discovers what it may read, and rate-limiting the map
 * while publishing the territory would be self-defeating. Static assets are
 * excluded because they never reach the database — the three icons included,
 * which every page asks for.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap).*)",
  ],
};
