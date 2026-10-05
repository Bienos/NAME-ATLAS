"use client";

import { Analytics } from "@vercel/analytics/next";
import type { BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { usePathname } from "next/navigation";
import { analyticsUrl } from "./analytics-path.js";

/**
 * Vercel Web Analytics (#58), with the surname kept out of every event
 * (TASK-058). A client component, because `beforeSend` is a function and the
 * root layout is a server component. The privacy notice (`legal-text.ts`)
 * describes what is sent; if this changes, that text changes with it.
 */
export function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = analyticsUrl(event.url);
  return url === null ? null : { ...event, url };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}

/** A Speed Insights measurement as its `beforeSend` sees it. */
export interface SpeedInsightsEvent {
  readonly type: "vital";
  readonly url: string;
  readonly route?: string;
}

/** The measurement's address, filtered as the visit statistics' are. */
export function speedInsightsBeforeSend(event: SpeedInsightsEvent): SpeedInsightsEvent | null {
  const url = analyticsUrl(event.url);
  return url === null ? null : { ...event, url };
}

/**
 * The route Speed Insights files a measurement under: the page's own path,
 * filtered. Null, and no script at all, when the path cannot be read.
 */
export function speedInsightsRoute(pathname: string | null): string | null {
  return pathname === null ? null : analyticsUrl(pathname);
}

/**
 * Vercel Speed Insights, with the same filter. Vercel's script passes only a
 * measurement's address through `beforeSend` and sends its route untouched, so
 * the route is ours, not `@vercel/speed-insights/next`'s: that one matches the
 * route's params against the path, and a slug with Polish letters can be
 * percent-encoded in one and not the other, which leaves the surname in place.
 * The two variables are the ones the Next.js wrapper passes.
 */
export function SiteSpeedInsights() {
  const route = speedInsightsRoute(usePathname());
  return (
    <SpeedInsights
      framework="next"
      route={route}
      beforeSend={speedInsightsBeforeSend}
      basePath={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH}
      configString={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG}
    />
  );
}
