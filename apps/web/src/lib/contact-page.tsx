import type { Metadata } from "next";
import { htmlLang, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { NamePrint } from "./name-print.js";
import { CONTACT_EMAIL, contactPath, SiteFooter } from "./site-footer.js";

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
    <>
      <main lang={htmlLang(lang)}>
        <div className="masthead">
          <h1>
            <a href={lang === "en" ? "/?lang=en" : "/"}>
              <NamePrint className="logo-mark" size="small" />
              {t.title}
            </a>
          </h1>
          <a href={contactPath(other)}>{t.langSwitch}</a>
        </div>
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
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
