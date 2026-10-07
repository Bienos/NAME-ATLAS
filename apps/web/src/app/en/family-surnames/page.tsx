import type { Metadata } from "next";
import { FamilySurnamesPage, familySurnamesMetadata } from "../../../lib/family-surnames-page.js";

/** `/en/family-surnames` — surnames from the visitor's family (TASK-169). Never indexed. */

export const metadata: Metadata = familySurnamesMetadata("en");

export default function Page() {
  return <FamilySurnamesPage lang="en" />;
}
