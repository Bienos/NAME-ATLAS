import { answerSlug } from "../../../../lib/surname-page.js";
import { ogFacts } from "../../../../lib/og-facts.js";
import { renderOgCard } from "../../../../lib/og-card.js";
import { summaryFacts } from "../../../../lib/share-facts.js";

/**
 * The Open Graph image for a canonical surname page (TASK-024, directive §22–§23).
 *
 * Built from the **validated public projection** and nothing else: the surname,
 * the count per partition, `1 in X` only when rarity is READY, the product
 * name. No LLM, no research triggered by a crawler, no client-supplied value.
 * `ogFacts` is a pure function over the payload and is unit-tested, so what
 * the card may say is decided once, in one place (`ogFacts`, and `summaryFacts`
 * for the key figures on one card, TASK-060); `renderOgCard` decides only
 * how it looks, once for both languages.
 *
 * Deterministic for a given projection; Next serves the route with its own
 * cache headers, and the surname's facts change only when a new resource
 * version is ingested.
 */

export const alt = "Name Atlas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const answer = await answerSlug(slug, null);
  const response = answer.kind === "RESULT" ? answer.response : null;
  return renderOgCard(
    ogFacts(response, "en"),
    response === null ? null : summaryFacts(response, "en"),
  );
}
