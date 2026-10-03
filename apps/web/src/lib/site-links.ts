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

/** The blog's index, and one post of it (TASK-071). Slugs are shared by a post's two languages. */
export function blogPath(lang: Lang): string {
  return lang === "en" ? "/en/blog" : "/pl/blog";
}

export function blogPostPath(lang: Lang, slug: string): string {
  return `${blogPath(lang)}/${slug}`;
}

/**
 * The footer's blog and social links (TASK-057, TASK-071). The blog leads to
 * its own index. The owner asked for the three social links to lead to the
 * home page until each has an address of its own; when one does, its address
 * replaces `homePath` here and nowhere else.
 */
export function followLinks(
  lang: Lang,
): readonly { readonly label: string; readonly href: string }[] {
  return [
    { label: "Blog", href: blogPath(lang) },
    ...["Instagram", "TikTok", "YouTube"].map((label) => ({ label, href: homePath(lang) })),
  ];
}
