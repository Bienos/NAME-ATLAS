import type { Metadata } from "next";
import { HowView, howMetadata } from "../../../lib/how-page.js";

/** `/en/how-it-works` — how the site works (TASK-052). */

export const metadata: Metadata = howMetadata("en");

export default function Page() {
  return <HowView lang="en" />;
}
