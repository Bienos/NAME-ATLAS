import type { Metadata } from "next";
import { LegalView, legalMetadata } from "../../../lib/legal-page.js";

/** `/pl/regulamin` (TASK-046). */

export const metadata: Metadata = legalMetadata("terms", "pl");

export default function Page() {
  return <LegalView kind="terms" lang="pl" />;
}
