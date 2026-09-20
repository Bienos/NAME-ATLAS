import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

/**
 * The web app's root layout (TASK-001, reworked by TASK-017).
 *
 * `lang` is set per request by the page, which is the only place that knows
 * which language was asked for; this layout declares the default so a crawler
 * and a screen reader are never left guessing. Polish is the default because
 * `PRODUCT.md` §2's primary user is Polish.
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
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
