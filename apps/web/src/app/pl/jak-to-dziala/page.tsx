import type { Metadata } from "next";
import { HowView, howMetadata } from "../../../lib/how-page.js";

/** `/pl/jak-to-dziala` — how the site works (TASK-052). */

export const metadata: Metadata = howMetadata("pl");

export default function Page() {
  return <HowView lang="pl" />;
}
