import type { Metadata } from "next";
import { FAMILY_METADATA } from "../../../lib/family-card.js";
import { FamilyView } from "../../../lib/family-view.js";

/**
 * `/en/family-surnames` — the family surnames view (TASK-040). Never indexed,
 * and it reads no parameter: no surname is ever part of this page's URL.
 */

export const metadata: Metadata = FAMILY_METADATA;

export default function Page() {
  return <FamilyView lang="en" />;
}
