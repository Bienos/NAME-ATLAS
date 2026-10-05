"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights, computeRoute } from "@vercel/speed-insights/react";
import { useParams, usePathname } from "next/navigation";
import { analyticsUrl } from "./analytics-path.js";

/**
 * Vercel Web Analytics (#58) and Vercel Speed Insights, with the surname kept
 * out of every event (TASK-058). A client component, because `beforeSend` is a
 * function and the root layout is a server component. The privacy notice
 * (`legal-text.ts`) describes what is sent; if this changes, that text changes
 * with it.
 */
export function beforeSend<E extends { readonly url: string }>(event: E): E | null {
  const url = analyticsUrl(event.url);
  return url === null ? null : { ...event, url };
}

/**
 * The route a Speed Insights data point carries beside its address. Vercel's
 * script takes only the address from `beforeSend` and the route from the
 * component, so the route is redacted here. `computeRoute` turns the path into
 * the route's pattern (`/pl/nazwisko/[slug]`) only when the path and the
 * params match exactly; a surname slug keeps its Polish letters, and when the
 * two differ in encoding it returns the path as it is, so the result goes
 * through `analyticsUrl` as well. An optional catch-all with nothing in it
 * (`/pl/konto/drzewa`) has an undefined param, which `computeRoute` does not
 * take.
 */
export function speedInsightsRoute(
  pathname: string | null,
  params: Readonly<Record<string, string | string[] | undefined>> | null,
): string | null {
  const defined =
    params === null
      ? null
      : Object.fromEntries(
          Object.entries(params).filter(
            (entry): entry is [string, string | string[]] => entry[1] !== undefined,
          ),
        );
  const route = computeRoute(pathname, defined);
  return route === null ? null : analyticsUrl(route);
}

export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}

/**
 * `@vercel/speed-insights/next` with the route redacted: the same component,
 * base path and configuration (Vercel's resilient intake), but the route is
 * ours, because the Next wrapper takes no `route`.
 */
export function SiteSpeedInsights() {
  const route = speedInsightsRoute(usePathname(), useParams());
  return (
    <SpeedInsights
      route={route}
      beforeSend={beforeSend}
      framework="next"
      basePath={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH}
      configString={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG}
    />
  );
}
