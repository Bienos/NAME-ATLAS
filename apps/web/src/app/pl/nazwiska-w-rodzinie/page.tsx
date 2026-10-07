import type { Metadata } from "next";
import { FamilySurnamesPage, familySurnamesMetadata } from "../../../lib/family-surnames-page.js";

/** `/pl/nazwiska-w-rodzinie` — surnames from the visitor's family (TASK-169). Never indexed. */

export const metadata: Metadata = familySurnamesMetadata("pl");

export default function Page() {
  return <FamilySurnamesPage lang="pl" />;
}
