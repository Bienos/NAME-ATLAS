import { CONTACT_EMAIL } from "./contact.js";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * "Report a problem" (TASK-050, option A by the project owner's ruling of
 * 2026-09-30): a `mailto:` prefilled with the surname and the page's address.
 *
 * Nothing reaches the server: the reader's own mail program sends the message
 * to `CONTACT_EMAIL`, so the site stores and logs no free text and the privacy
 * notice (TASK-046) stays true. A report never changes a claim by itself
 * (`docs/canonical/19` §116): the source is checked first.
 */

/**
 * The `mailto:` address. Subject and body are percent-encoded with
 * `encodeURIComponent`, which writes a space as `%20`: RFC 6068 requires that,
 * and a `+` would reach the reader's mail program as a literal plus.
 */
export function reportMailto(surnames: readonly string[], pageUrl: string, lang: Lang): string {
  const t = UI[lang];
  const subject = `${t.reportSubject}: ${surnames.join(" / ")}`;
  const body = [
    `${t.reportBodyPage}: ${pageUrl}`,
    "",
    `${t.reportBodyWhat}:`,
    "",
    "",
    `${t.reportBodySource}:`,
    "",
  ].join("\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function ReportLink({
  surnames,
  pageUrl,
  lang,
}: {
  readonly surnames: readonly string[];
  readonly pageUrl: string;
  readonly lang: Lang;
}) {
  if (surnames.length === 0) return null;
  return (
    <p className="report">
      <a href={reportMailto(surnames, pageUrl, lang)}>{UI[lang].reportLink}</a>
    </p>
  );
}
