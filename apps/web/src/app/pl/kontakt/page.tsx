import type { Metadata } from "next";
import { ContactView, contactMetadata } from "../../../lib/contact-page.js";

/** `/pl/kontakt` — the contact page (TASK-047). */

export const metadata: Metadata = contactMetadata("pl");

export default function Page() {
  return <ContactView lang="pl" />;
}
