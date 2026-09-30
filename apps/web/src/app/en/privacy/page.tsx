import type { Metadata } from "next";
import { LegalView, legalMetadata } from "../../../lib/legal-page.js";

/** `/en/privacy` (TASK-046). */

export const metadata: Metadata = legalMetadata("privacy", "en");

export default function Page() {
  return <LegalView kind="privacy" lang="en" />;
}
