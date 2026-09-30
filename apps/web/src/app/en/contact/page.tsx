import type { Metadata } from "next";
import { ContactView, contactMetadata } from "../../../lib/contact-page.js";

/** `/en/contact` — the contact page (TASK-047). */

export const metadata: Metadata = contactMetadata("en");

export default function Page() {
  return <ContactView lang="en" />;
}
