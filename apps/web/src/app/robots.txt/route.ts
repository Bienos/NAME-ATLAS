import { indexingEnabled, siteOrigin } from "../../lib/seo.js";

/**
 * `/robots.txt` (TASK-027; `docs/canonical/21` §36, §40).
 *
 * Two postures, and the closed one is the default:
 *
 * - `SEO_INDEXING_ENABLED` unset — `Disallow: /`. Not a placeholder: no page has
 *   been cleared for publication, and a crawler reading them anyway would index
 *   pages whose own `<meta name="robots">` says `noindex`, which wastes its
 *   budget and ours. An alpha that is not ready to be indexed says so here too.
 * - enabled — the surname routes are crawlable, and §36's internal search, the
 *   comparison page and the API are not. §35: a query string is never canonical,
 *   so nothing carrying one is offered.
 */

export const dynamic = "force-dynamic";

/** Sharing crawlers may read public pages while search engines remain governed by the flag. */
const previewAgents = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "WhatsApp",
  "TelegramBot",
];

const previewRules = [
  ...previewAgents.map((agent) => `User-agent: ${agent}`),
  "Allow: /",
  "Disallow: /api/",
  "Disallow: /pl/konto",
  "Disallow: /en/account",
  "Disallow: /?",
  "Allow: /?lang=en$",
  "",
].join("\n");

export function GET(): Response {
  const origin = siteOrigin();
  const sitemap = origin === null ? null : `${origin}/sitemap.xml`;

  const body = indexingEnabled()
    ? [
        "User-agent: *",
        // §36 — the internal search is a query-string surface and out of index.
        "Disallow: /?",
        "Disallow: /pl/porownaj",
        "Disallow: /en/compare",
        "Disallow: /api/",
        "Allow: /pl/nazwisko/",
        "Allow: /en/surname/",
        ...(sitemap === null ? [] : ["", `Sitemap: ${sitemap}`]),
        "",
      ].join("\n")
    : [
        "# SEO_INDEXING_ENABLED is not set: no surname page has been cleared for",
        "# publication, and every one of them serves `noindex` (ADR-0009 §5).",
        "User-agent: *",
        "Disallow: /",
        "",
      ].join("\n");

  return new Response(`${previewRules}\n${body}`, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Short: flipping the flag should take effect without waiting out a cache.
      "cache-control": "public, max-age=300",
    },
  });
}
