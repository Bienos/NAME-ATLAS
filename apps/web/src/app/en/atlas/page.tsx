import type { Metadata } from "next";
import { AtlasView, atlasMetadata } from "../../../lib/atlas-page.js";

/** `/en/atlas` — statistics about each whole published list (TASK-178). */

export const dynamic = "force-dynamic";

export const metadata: Metadata = atlasMetadata("en");

export default function Page() {
  return <AtlasView lang="en" />;
}
