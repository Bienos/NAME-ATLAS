import type { Metadata } from "next";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { CONTACT_EMAIL, contactPath } from "./site-footer.js";
import { SiteShell } from "./site-shell.js";

/**
 * `/pl/kontakt` and `/en/contact` (TASK-047): where to write, and about what.
 * Static: no database, no request data.
 */

export function contactMetadata(lang: Lang): Metadata {
  return {
    title: `${UI[lang].contactHeading} — Name Atlas`,
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
      mainClassName="reading"
    >
      <section>
        <h2>{t.contactHeading}</h2>
        <p>{t.contactIntro}</p>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p>{t.contactTopicsLead}</p>
        <ul>
          {t.contactTopics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
        <p>{t.contactReportHint}</p>
        <p>{t.contactNoPromise}</p>
      </section>
    </SiteShell>
  );
}
