import type { Metadata } from "next";
import { OfferRoute, offerMetadata } from "../../../lib/offer-page.js";

/**
 * `/pl/oferta` — the offer (TASK-057, TASK-165). Dynamic: it reads the session
 * cookie for the free plan's links and a tester's test-mode purchases.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = offerMetadata("pl");

export default function Page() {
  return <OfferRoute lang="pl" />;
}
