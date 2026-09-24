import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
import "./globals.css";

/*
 * The three voices of the visual system (§6.1), in their open-source MVP
 * form. next/font downloads them at build time and serves them from this
 * origin, so no visitor's browser ever contacts a font CDN. `subsets` only
 * chooses what is preloaded: the Polish letters (latin-ext) and the stacked
 * diacritics real PESEL surnames use (NGUYỄN, vietnamese) still load on
 * demand through unicode-range, in the same typefaces.
 */
const display = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

const ui = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const data = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Name Atlas — Every surname begins somewhere",
    template: "%s — Name Atlas",
  },
  description:
    "Enter a surname to see what Poland's official PESEL register records about it, with the source and date behind every figure.",
};

export const viewport: Viewport = {
  themeColor: "#f3f0e8",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${data.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
