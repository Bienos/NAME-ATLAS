import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

/** Internal only. Never indexed, and never reachable without the gate in `page.tsx`. */
export const metadata: Metadata = {
  title: "Name Atlas — inspector",
  description: "Internal read-only surname trace.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
