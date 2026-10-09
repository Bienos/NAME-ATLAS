import type { Metadata } from "next";
import { AtlasView, atlasMetadata } from "../../../lib/atlas-page.js";

/** `/pl/atlas` — statistics about each whole published list (TASK-178). */

export const dynamic = "force-dynamic";

export const metadata: Metadata = atlasMetadata("pl");

export default function Page() {
  return <AtlasView lang="pl" />;
}
