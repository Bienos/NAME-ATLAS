import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

/**
 * The three type voices of the Visual System v1 (§6). next/font/google fetches
 * them at build time and serves them from this app: no request to Google from a
 * reader's browser, fallback metrics adjusted to avoid layout shift, and each face
 * exposed as the CSS variable `globals.css` uses. `latin-ext` carries every
 * Polish letter. (The share card reads its own copies from `apps/web/assets/fonts`;
 * see that folder's README.)
 */
const display = Newsreader({
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  style: ["normal"],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const ui = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

const data = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  variable: "--font-data",
  display: "swap",
  preload: false,
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
export const metadata: Metadata = {
  title: "Name Atlas",
  description:
    "Honest, sourced answers about Polish surnames: how many people are registered with one, " +
    "how rare it is, and where its bearers have a registered residence — each with its source, " +
    "date and confidence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={`${display.variable} ${ui.variable} ${data.variable}`}>
      <body>{children}</body>
    </html>
  );
}
