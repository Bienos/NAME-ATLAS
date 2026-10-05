import { analyticsUrl } from "./analytics-path.js";
import type { Lang } from "./messages.js";

/**
 * Google Analytics 4 on every page, its cookies only after the visitor agrees
 * (TASK-109, ADR-0038; TASK-115, ADR-0040).
 *
 * Google's script is in every page's HTML and, on production's host, counts
 * every page view in consent mode: until the visitor presses "Accept" on the
 * banner (`consent-banner.tsx`), and after "Reject", `analytics_storage` is
 * denied, so Google sets no cookie (`_ga`, `_ga_<id>`). The choice itself is kept in `localStorage`, which is what lets the banner
 * stay away on the next page; the privacy notice says so. Every address GA is
 * given goes through `analyticsUrl` first, so GA, like Vercel Web Analytics,
 * never sees a searched surname, a tree's id or a query.
 *
 * Pure: the component hands it the browser's values.
 */

export const GA_MEASUREMENT_ID = "G-ZC9D1RK4NN";

/** Google's script, rendered into every page by the root layout. */
export const GA_SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

/**
 * The hosts whose page views GA counts: production's primary domain (the
 * other production hosts redirect to it). Elsewhere (staging, previews, CI's
 * end-to-end run, a local `next start`) the script loads but is never
 * configured, so it sends nothing.
 */
export const GA_HOSTS: readonly string[] = ["name-atlas.pl"];

export function gaCounts(hostname: string): boolean {
  return GA_HOSTS.includes(hostname);
}

/** The `localStorage` key that holds the visitor's choice. */
export const CONSENT_KEY = "name-atlas:analytics-consent";

/** The event the privacy page's button fires to open the banner again. */
export const CONSENT_REOPEN_EVENT = "name-atlas:analytics-consent-reopen";

export type Consent = "granted" | "denied";

export function parseConsent(value: string | null | undefined): Consent | null {
  return value === "granted" || value === "denied" ? value : null;
}

/** The banner's language follows the page's: `/en/…` is English, the rest Polish. */
export function consentLang(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "pl";
}

export interface GaPageParams {
  readonly page_location: string;
  readonly page_title: string;
  readonly page_referrer?: string;
}

/**
 * What GA is told about the page: the redacted address, the redacted path as
 * the title (a surname page's title is the surname), and the referrer
 * redacted the same way. Null when the address cannot be read: then nothing
 * is sent.
 */
export function gaPageParams(href: string, referrer: string): GaPageParams | null {
  const location = analyticsUrl(href);
  if (location === null) return null;
  const title = analyticsUrl(new URL(location, "http://localhost").pathname) ?? "/";
  const ref = referrer === "" ? null : analyticsUrl(referrer);
  return ref === null
    ? { page_location: location, page_title: title }
    : { page_location: location, page_title: title, page_referrer: ref };
}

/** The consent state GA starts from on every page: everything off, and the ad signals stay off. */
export const CONSENT_DEFAULT = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

export const CONSENT_COPY: Readonly<
  Record<
    Lang,
    {
      readonly label: string;
      readonly text: string;
      readonly accept: string;
      readonly reject: string;
      readonly privacy: string;
      readonly change: string;
    }
  >
> = {
  pl: {
    label: "Zgoda na pliki cookie Google Analytics",
    text: "Korzystamy z Google Analytics, żeby wiedzieć, które strony są czytane. Bez Twojej zgody Google liczy odsłony bez plików cookie; za zgodą zapisze je w przeglądarce. Nazwiska z adresu nie wysyłamy. Możesz zmienić zdanie w każdej chwili na stronie polityki prywatności.",
    accept: "Zgadzam się",
    reject: "Nie zgadzam się",
    privacy: "Polityka prywatności",
    change: "Zmień zgodę na Google Analytics",
  },
  en: {
    label: "Consent to Google Analytics cookies",
    text: "We use Google Analytics to learn which pages are read. Without your consent Google counts page views without cookies; with it, Google stores cookies in your browser. We never send the surname in the address. You can change your mind at any time on the privacy notice page.",
    accept: "Accept",
    reject: "Reject",
    privacy: "Privacy notice",
    change: "Change consent to Google Analytics",
  },
};
