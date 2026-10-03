import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { familyTreeEnabled } from "../../../lib/family-config.js";
import { TreeLandingView, treeLandingMetadata } from "../../../lib/tree-landing.js";

/** `/en/family-tree` (TASK-076): the tree's landing page. A 404 unless the tree is on. */

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return familyTreeEnabled() ? treeLandingMetadata("en") : {};
}

export default function Page() {
  if (!familyTreeEnabled()) notFound();
  return <TreeLandingView lang="en" />;
}
