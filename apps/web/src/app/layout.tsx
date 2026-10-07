import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { GoogleAnalytics } from "../lib/consent-banner.js";
import { GA_SCRIPT_URL } from "../lib/google-analytics.js";
import { SiteAnalytics, SiteSpeedInsights } from "../lib/site-analytics.js";
import { SITE_COPY, SITE_PREVIEW_IMAGE } from "../lib/site-metadata.js";
import { siteOrigin } from "../lib/surname-page.js";
import "./globals.css";
import "../design-system/brand-system.css";
import "../design-system/compare.css";
import "../design-system/family-surnames.css";

/**
 * The three type voices of the brand (ADR-0021, TASK-052): Fraunces for the
 * surname, the headlines and the one big number; Instrument Sans for what a
 * reader reads and taps; IBM Plex Mono for evidence — source lines, dates,
 * chips. next/font/google fetches them at build time and serves them from this
 * app: no request to Google from a reader's browser, fallback metrics adjusted
 * to avoid layout shift, and each face exposed as the CSS variable
 * `globals.css` uses. `latin-ext` carries every Polish letter. (The share card
 * reads its own copies from `apps/web/assets/fonts`; see that folder's README.)
 */
const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  // The optical-size axis: a 96px surname is drawn from the display cut, a
  // 22px card title from the text cut, by `font-optical-sizing: auto`.
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const ui = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

const data = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-data",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

/**
 * The web app's root layout (TASK-001; reworked by TASK-017 and TASK-023).
 *
 * `<html lang="pl">` is the document default, and it is Polish because
 * `PRODUCT.md` §2's primary user is Polish.
 *
 * It is **not** the whole answer, and that was a real bug until TASK-023: this
 * app answers in Polish and English from the same route tree, so every English
 * page was announced to a screen reader as Polish, which reads English prose
 * with Polish phonetics. A root layout owns the `<html>` element and a page
 * cannot change its attributes, so each page instead sets `lang` on its own
 * `<main>` — the nearest `lang` wins, which is exactly what HTML specifies.
 * `htmlLang` in `lib/messages.ts` is the single source of the value.
 */
const origin = siteOrigin();
export const metadata: Metadata = {
  ...(origin === null ? {} : { metadataBase: new URL(origin) }),
  title: "Name Atlas",
  description: SITE_COPY.pl.description,
  openGraph: {
    ...SITE_COPY.pl,
    siteName: "Name Atlas",
    type: "website",
    locale: "pl_PL",
    images: [SITE_PREVIEW_IMAGE],
  },
  twitter: { card: "summary_large_image" },
};

/**
 * Every page renders in the dusk scope (ADR-0021): the body carries `.dusk`,
 * which re-points the system's token names at the dusk values, and each page
 * draws its own world behind it (`site-shell.tsx`). Vercel Web Analytics (#58)
 * and Vercel Speed Insights follow the page, with the surname kept out of
 * their events (TASK-058).
 * Google's tag is in every page's head; it counts page views on production
 * only, and sets its cookies only after the visitor accepts the consent
 * banner (TASK-109, ADR-0038; TASK-115, ADR-0040).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={`${display.variable} ${ui.variable} ${data.variable}`}>
      <head>
        <script async src={GA_SCRIPT_URL} />
      </head>
      <body className="dusk">
        {children}
        <SiteAnalytics />
        <SiteSpeedInsights />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
