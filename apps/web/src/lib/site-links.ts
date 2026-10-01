import type { Lang } from "./messages.js";

/**
 * The site's own addresses, per language (TASK-052). The header, the footer
 * and the pages link with these, so a renamed route is renamed once.
 */
export function homePath(lang: Lang): string {
  return lang === "en" ? "/?lang=en" : "/";
}

/** The landing's atlas section: the plates about each whole published list. */
export function atlasPath(lang: Lang): string {
  return `${homePath(lang)}#atlas`;
}

export function comparePagePath(lang: Lang): string {
  return lang === "en" ? "/en/compare" : "/pl/porownaj";
}

export function howPath(lang: Lang): string {
  return lang === "en" ? "/en/how-it-works" : "/pl/jak-to-dziala";
}

/** The offer: the free tier and the two coming ones (TASK-057, ADR-0026). */
export function offerPath(lang: Lang): string {
  return lang === "en" ? "/en/offer" : "/pl/oferta";
}

/**
 * The footer's blog and social links (TASK-057). The owner asked for all four
 * to lead to the home page until each has an address of its own; when one
 * does, its address replaces `homePath` here and nowhere else.
 */
export function followLinks(
  lang: Lang,
): readonly { readonly label: string; readonly href: string }[] {
  return ["Blog", "Instagram", "TikTok", "YouTube"].map((label) => ({
    label,
    href: homePath(lang),
  }));
}
