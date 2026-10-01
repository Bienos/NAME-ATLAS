import { answerSlug, requestOrigin } from "./surname-page.js";
import { pageSlug } from "./slug.js";
import { isShareCard, shareFacts } from "./share-facts.js";
import { renderShareCard } from "./share-card.js";
import type { GateVerdict } from "./download-gate.js";
import type { Lang } from "./messages.js";

/**
 * The share-card routes (TASK-056): `/pl/nazwisko/{slug}/karta/{card}` and
 * `/en/surname/{slug}/card/{card}`. One handler for both. An unknown card, an
 * address that names no surname and a section that is not ready all answer
 * 404 with no image: a card is drawn only where the page has the answer. A
 * retired address redirects, and a database that cannot answer is a 503.
 */

/** Cached at the edge for an hour: the facts change only when data is loaded. */
const CACHE = { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };

/**
 * With accounts on, an image goes to one reader (TASK-064): a shared cache that
 * kept it would hand it to a reader with no session, so nothing keeps it.
 */
const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The gate (TASK-064, `download-gate.ts`) comes after the card is known and
 * before the register is read: a request without a session costs no register
 * query and learns nothing about which surnames exist. `off`, the default, is a
 * site without accounts, where the image is public.
 */
export async function shareCardResponse(
  rawSlug: string,
  card: string,
  lang: Lang,
  hostHeader: string | null,
  gate: GateVerdict = "off",
): Promise<Response> {
  if (!isShareCard(card)) return new Response("Not found", { status: 404 });
  if (gate === "sign-in") {
    return new Response("Sign in to save the image", {
      status: 401,
      headers: { "Cache-Control": "no-store", "WWW-Authenticate": 'Cookie realm="name-atlas"' },
    });
  }
  if (gate === "unavailable") {
    return new Response("Unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
  const answer = await answerSlug(pageSlug(rawSlug), null, lang);
  // A database that cannot answer is not a missing card: try again later.
  if (answer.kind === "UNAVAILABLE") {
    return new Response("Unavailable", { status: 503, headers: { "Retry-After": "60" } });
  }
  // A retired address moves its cards with it, as the page does (ADR-0010 §2).
  if (answer.kind === "MOVED") {
    const base = lang === "en" ? "/en/surname" : "/pl/nazwisko";
    const segment = lang === "en" ? "card" : "karta";
    return new Response(null, {
      status: 308,
      headers: {
        Location: `${base}/${encodeURIComponent(answer.current_slug)}/${segment}/${card}`,
      },
    });
  }
  if (answer.kind !== "RESULT") return new Response("Not found", { status: 404 });
  const facts = shareFacts(answer.response, card, lang);
  if (facts === null) return new Response("Not found", { status: 404 });
  const origin = requestOrigin(hostHeader);
  const host = origin === null ? null : new URL(origin).host;
  return renderShareCard(facts, host, gate === "open" ? PRIVATE : CACHE);
}
