import type { Metadata } from "next";
import type { Lang } from "./messages.js";

/** Landing copy, not surname facts. No register access is needed by a crawler. */
export const SITE_COPY = {
  pl: {
    title: "Name Atlas — Każde nazwisko gdzieś się zaczęło.",
    description:
      "Sprawdź swoje nazwisko: liczby, rzadkość, miejsca i historia tam, gdzie potwierdzają ją źródła. " +
      "Odkrywaj odpowiedzi w kartach — za darmo, bez konta.",
  },
  en: {
    title: "Name Atlas — Every surname began somewhere.",
    description:
      "Explore your Polish surname: counts, rarity, places and history where sources support it. " +
      "Discover the answers in cards — free, no account needed.",
  },
} as const;

/** Public asset: no function invocation or image query string for a preview crawler. */
export const SITE_PREVIEW_IMAGE = {
  url: "/share/name-atlas-v2.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "Name Atlas — Każde nazwisko gdzieś się zaczęło. Sprawdź swoje nazwisko.",
} as const;

export function landingMetadata(lang: Lang, origin: string | null): Metadata {
  const copy = SITE_COPY[lang];
  const path = lang === "pl" ? "/" : "/?lang=en";
  const url = origin === null ? path : `${origin}${path}`;
  return {
    ...copy,
    alternates: {
      canonical: url,
      languages: {
        "pl-PL": origin === null ? "/" : `${origin}/`,
        "en-GB": origin === null ? "/?lang=en" : `${origin}/?lang=en`,
        "x-default": origin === null ? "/" : `${origin}/`,
      },
    },
    openGraph: {
      ...copy,
      siteName: "Name Atlas",
      type: "website",
      locale: lang === "pl" ? "pl_PL" : "en_GB",
      url,
      images: [
        {
          ...SITE_PREVIEW_IMAGE,
          url: origin === null ? SITE_PREVIEW_IMAGE.url : `${origin}${SITE_PREVIEW_IMAGE.url}`,
        },
      ],
    },
    twitter: {
      ...copy,
      card: "summary_large_image",
      images: [origin === null ? SITE_PREVIEW_IMAGE.url : `${origin}${SITE_PREVIEW_IMAGE.url}`],
    },
  };
}
