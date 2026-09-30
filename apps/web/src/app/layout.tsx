import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Name Atlas — what's in your surname?",
  description:
    "Look up a Polish surname: how common it is today, where it may come from, and the sources behind every line.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
