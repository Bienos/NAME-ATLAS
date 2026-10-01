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
