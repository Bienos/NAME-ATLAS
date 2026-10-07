import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientKey, evictExpired, rateLimit } from "./lib/rate-limit.js";
import type { RateLimitStore } from "./lib/rate-limit.js";
import { LONGEST_WINDOW_MS, policyFor } from "./lib/request-policy.js";
import { BABY_NAMES_CACHE_CONTROL, isBabyNamesPath } from "./lib/baby-names-config.js";
import { COUPLE_CACHE_CONTROL, isCouplePath } from "./lib/couple-config.js";
import {
  FULL_NAME_COMPARE_CACHE_CONTROL,
  isFullNameComparePath,
} from "./lib/full-name-compare-config.js";
import { COUPLE_NAMES_CACHE_CONTROL, isCoupleNamesPath } from "./lib/couple-names-config.js";
import { isReportPath, REPORT_CACHE_CONTROL } from "./lib/report-config.js";

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

// Module scope, so it is shared across the invocations one instance serves.
const store: RateLimitStore = new Map();

let lastEviction = 0;
const EVICT_EVERY_MS = 60_000;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const policy = policyFor(pathname);
  const now = Date.now();

  // Opportunistic: keeps the map from growing by one entry per stranger, with
  // no timer to own and nothing to shut down.
  if (now - lastEviction > EVICT_EVERY_MS) {
    lastEviction = now;
    evictExpired(store, { limit: 0, windowMs: LONGEST_WINDOW_MS }, now);
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
  // The couple report is one reader's page: never kept by a browser or a cache (TASK-100).
  if (isCouplePath(pathname)) response.headers.set("cache-control", COUPLE_CACHE_CONTROL);
  // A report preview is an internal artifact: never kept by a browser or a cache (TASK-120).
  if (isReportPath(pathname)) response.headers.set("cache-control", REPORT_CACHE_CONTROL);
  // The baby-names page is one signed-in reader's: never kept by a browser or a cache (TASK-141).
  if (isBabyNamesPath(pathname)) response.headers.set("cache-control", BABY_NAMES_CACHE_CONTROL);
  // The full-name comparison is one signed-in reader's: never kept by a browser or a cache (TASK-155).
  if (isFullNameComparePath(pathname)) {
    response.headers.set("cache-control", FULL_NAME_COMPARE_CACHE_CONTROL);
  }
  // The couple first-names page is one signed-in reader's: never kept by a browser or a cache (TASK-156).
  if (isCoupleNamesPath(pathname)) {
    response.headers.set("cache-control", COUPLE_NAMES_CACHE_CONTROL);
  }
  return response;
}

/**
 * What the limiter sees.
 *
 * `robots.txt`, `llms.txt`, `sitemap.xml` and the sitemap pages are **excluded on purpose**:
 * they are how a crawler discovers what it may read, and rate-limiting the map
 * while publishing the territory would be self-defeating. Static assets are
 * excluded because they never reach the database — the three icons included,
 * which every page asks for.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|llms.txt|sitemap).*)",
  ],
};
