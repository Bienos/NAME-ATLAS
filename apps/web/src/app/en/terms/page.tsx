import type { Metadata } from "next";
import { LegalView, legalMetadata } from "../../../lib/legal-page.js";

/** `/en/terms` (TASK-046). */

export const metadata: Metadata = legalMetadata("terms", "en");

export default function Page() {
  return <LegalView kind="terms" lang="en" />;
}
