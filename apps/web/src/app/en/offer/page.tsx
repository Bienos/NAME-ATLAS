import type { Metadata } from "next";
import { OfferView, offerMetadata } from "../../../lib/offer-page.js";

/** `/en/offer` — the offer: free now, two tiers coming (TASK-057). */

export const metadata: Metadata = offerMetadata("en");

export default function Page() {
  return <OfferView lang="en" />;
}
