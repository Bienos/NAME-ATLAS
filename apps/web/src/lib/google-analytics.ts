import { analyticsUrl } from "./analytics-path.js";
import type { Lang } from "./messages.js";

/**
 * Google Analytics 4, only after the visitor agrees (TASK-109, ADR-0038).
 *
 * GA sets cookies (`_ga`, `_ga_<id>`), so under the ePrivacy rules nothing of
 * Google's loads until the visitor presses "Accept" on the banner
 * (`google-analytics.tsx`). The choice itself is kept in `localStorage`, which
 * is what lets the banner stay away on the next page; the privacy notice says
 * so. Every address GA is given goes through `analyticsUrl` first, so GA, like
 * Vercel Web Analytics, never sees a searched surname, a tree's id or a query.
 *
 * Pure: the component hands it the browser's values.
 */

export const GA_MEASUREMENT_ID = "G-ZC9D1RK4NN";

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

/** The consent state GA starts from: everything off, and the ad signals stay off. */
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
    label: "Zgoda na statystyki Google",
    text: "Za Twoją zgodą korzystamy z Google Analytics, żeby wiedzieć, które strony są czytane. Google zapisze w przeglądarce pliki cookie. Nazwiska z adresu nie wysyłamy. Możesz zmienić zdanie w każdej chwili na stronie polityki prywatności.",
    accept: "Zgadzam się",
    reject: "Nie zgadzam się",
    privacy: "Polityka prywatności",
    change: "Zmień zgodę na Google Analytics",
  },
  en: {
    label: "Consent to Google statistics",
    text: "With your consent we use Google Analytics to learn which pages are read. Google will store cookies in your browser. We never send the surname in the address. You can change your mind at any time on the privacy notice page.",
    accept: "Accept",
    reject: "Reject",
    privacy: "Privacy notice",
    change: "Change consent to Google Analytics",
  },
};
