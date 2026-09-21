import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
