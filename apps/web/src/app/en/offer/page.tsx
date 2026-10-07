import type { Metadata } from "next";
import { OfferRoute, offerMetadata } from "../../../lib/offer-page.js";

/**
 * `/en/offer` — the offer (TASK-057, TASK-167). Dynamic: it reads the session
 * cookie for the free plan's links and a tester's test-mode purchases.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = offerMetadata("en");

export default function Page() {
  return <OfferRoute lang="en" />;
}
