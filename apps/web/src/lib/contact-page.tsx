import type { Metadata } from "next";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { OPERATOR_NIP } from "./contact.js";
import { ContactForm } from "./contact-form.js";
import { CONTACT_EMAIL, contactPath } from "./site-footer.js";
import { SiteShell } from "./site-shell.js";

/**
 * `/pl/kontakt` and `/en/contact` (TASK-047): a form that sends the message to
 * the owner's inbox (`/api/contact`), what to write about, and the address for
 * anyone who prefers their own mail. Static: no database, no request data.
 */

export function contactMetadata(lang: Lang): Metadata {
  return {
    title: `${UI[lang].contactHeading} | Name Atlas`,
    alternates: {
      canonical: contactPath(lang),
      languages: { pl: contactPath("pl"), en: contactPath("en") },
    },
  };
}

export function ContactView({ lang }: { readonly lang: Lang }) {
  const t = UI[lang];
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={contactPath(other)}
      world={{ mode: "quiet" }}
      mainClassName="contact"
    >
      <section className="contact-intro">
        <h2>{t.contactHeading}</h2>
        <p className="contact-lede">{t.contactIntro}</p>
        <p>{t.contactTopicsLead}</p>
        <ul>
          {t.contactTopics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
        <p>{t.contactReportHint}</p>
        <p>{t.contactNoPromise}</p>
        <p className="contact-direct">
          {t.contactDirect} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p className="contact-operator">{t.contactOperator(OPERATOR_NIP)}</p>
      </section>
      <section className="contact-card">
        <ContactForm lang={lang} />
      </section>
    </SiteShell>
  );
}
