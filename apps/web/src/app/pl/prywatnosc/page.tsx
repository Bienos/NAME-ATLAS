import type { Metadata } from "next";
import { LegalView, legalMetadata } from "../../../lib/legal-page.js";

/** `/pl/prywatnosc` (TASK-046). */

export const metadata: Metadata = legalMetadata("privacy", "pl");

export default function Page() {
  return <LegalView kind="privacy" lang="pl" />;
}
