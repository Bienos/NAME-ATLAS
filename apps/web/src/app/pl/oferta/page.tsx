import type { Metadata } from "next";
import { OfferView, offerMetadata } from "../../../lib/offer-page.js";

/** `/pl/oferta` — the offer: free now, two tiers coming (TASK-057). */

export const metadata: Metadata = offerMetadata("pl");

export default function Page() {
  return <OfferView lang="pl" />;
}
