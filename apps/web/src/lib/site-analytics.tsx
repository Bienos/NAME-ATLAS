"use client";

import { Analytics } from "@vercel/analytics/next";
import type { BeforeSendEvent } from "@vercel/analytics/next";
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
