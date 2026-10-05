import type { Lang } from "./messages.js";

/**
 * Structured data (TASK-123; `docs/canonical/21` §72–§80).
 *
 * One module, so every page names the site the same way: the `Organization`
 * and `WebSite` carry stable `@id`s on the landing page, and the surname page
 * and the blog point at them. Only types the page's visible content backs:
 * `WebPage` and `BreadcrumbList` on a surname page (§72–§74), never `Person`
 * (§76), `Dataset` (§77) or `FAQPage` (§78).
 *
 * Every URL is absolute, so a caller without `SITE_ORIGIN` emits nothing: a
 * relative `@id` would name a different thing on every host.
 */

export const SITE_NAME = "Name Atlas";

export function organizationId(origin: string): string {
  return `${origin}/#organization`;
}

export function websiteId(origin: string): string {
  return `${origin}/#website`;
}

/** The publisher a page names: the site's `Organization`, by its `@id` where the origin is known. */
export function publisher(origin: string | null): Record<string, string> {
  return origin === null
    ? { "@type": "Organization", name: SITE_NAME }
    : {
        "@type": "Organization",
        "@id": organizationId(origin),
        name: SITE_NAME,
        url: `${origin}/`,
      };
}

/** The landing page's graph (§80): who publishes the site, and the site. */
export function siteGraph(origin: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId(origin),
        name: SITE_NAME,
        url: `${origin}/`,
        logo: { "@type": "ImageObject", url: `${origin}/apple-icon.png` },
      },
      {
        "@type": "WebSite",
        "@id": websiteId(origin),
        name: SITE_NAME,
        url: `${origin}/`,
        inLanguage: ["pl", "en"],
        publisher: { "@id": organizationId(origin) },
      },
    ],
  };
}

/** One step of a visible breadcrumb: its words and its path on this site. */
export interface Crumb {
  readonly name: string;
  readonly path: string;
}

/**
 * A surname page's graph (§73–§74): the page, and the breadcrumb the page
 * shows. The crumbs are the visible ones, passed in, so the two cannot differ.
 */
export function surnamePageGraph({
  origin,
  path,
  name,
  description,
  lang,
  crumbs,
}: {
  origin: string;
  path: string;
  name: string;
  description: string;
  lang: Lang;
  crumbs: readonly Crumb[];
}): Record<string, unknown> {
  const url = `${origin}${path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name,
        description,
        inLanguage: lang,
        isPartOf: { "@id": websiteId(origin) },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: `${origin}${crumb.path}`,
        })),
      },
    ],
  };
}

/** JSON for a `<script type="application/ld+json">`, with `<` escaped so no value can close it. */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</gu, "\\u003c");
}
