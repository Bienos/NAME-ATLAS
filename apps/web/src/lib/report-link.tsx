import { contactFormHref } from "./contact.js";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * "Report a problem" (TASK-050): the contact form, opened with the surname and
 * the page's address already in the message. Until 2026-09-30's option A, a
 * prefilled `mailto:`, lost its address (the owner withheld it on 2026-10-06),
 * the reader's own mail program sent the report; now the contact form does,
 * through `/api/contact`, which stores nothing. A report never changes a claim
 * by itself (`docs/canonical/19` §116): the source is checked first.
 */

/**
 * The contact page's address with the report prefilled: the "error in the data"
 * topic, and a message naming the surname(s) and the page, with room for what
 * is wrong and for a source. It travels in the fragment (`contactFormHref`),
 * which the browser never sends to the server.
 */
export function reportHref(surnames: readonly string[], pageUrl: string, lang: Lang): string {
  const t = UI[lang];
  const message = [
    `${t.reportSubject}: ${surnames.join(" / ")}`,
    "",
    `${t.reportBodyPage}: ${pageUrl}`,
    "",
    `${t.reportBodyWhat}:`,
    "",
    "",
    `${t.reportBodySource}:`,
    "",
  ].join("\n");
  return contactFormHref(lang, { topic: t.contactTopicOptions[0], message });
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
      <a href={reportHref(surnames, pageUrl, lang)}>{UI[lang].reportLink}</a>
    </p>
  );
}
