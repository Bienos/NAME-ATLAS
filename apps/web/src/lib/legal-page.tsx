import type { Metadata } from "next";
import { formatDate, htmlLang, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { NamePrint } from "./name-print.js";
import { SiteFooter } from "./site-footer.js";
import { LEGAL_UPDATED, legalDocument, legalPath } from "./legal-text.js";
import type { LegalKind } from "./legal-text.js";

/**
 * `/pl/prywatnosc`, `/en/privacy`, `/pl/regulamin`, `/en/terms` (TASK-046).
 * Static: the text is in `legal-text.ts`; no database, no request data.
 */

export function legalMetadata(kind: LegalKind, lang: Lang): Metadata {
  return {
    title: `${legalDocument(kind, lang).title} — Name Atlas`,
    alternates: {
      canonical: legalPath(kind, lang),
      languages: { pl: legalPath(kind, "pl"), en: legalPath(kind, "en") },
    },
  };
}

export function LegalView({ kind, lang }: { readonly kind: LegalKind; readonly lang: Lang }) {
  const t = UI[lang];
  const doc = legalDocument(kind, lang);
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <>
      <main lang={htmlLang(lang)} className="legal">
        <div className="masthead">
          <h1>
            <a href={lang === "en" ? "/?lang=en" : "/"}>
              <NamePrint className="logo-mark" size="small" />
              {t.title}
            </a>
          </h1>
          <a href={legalPath(kind, other)}>{t.langSwitch}</a>
        </div>
        <h2>{doc.title}</h2>
        <p className="legal-updated">
          {doc.updatedLabel}:{" "}
          <time dateTime={LEGAL_UPDATED}>{formatDate(LEGAL_UPDATED, lang)}</time>
        </p>
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h3>{section.heading}</h3>
            {section.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {section.items && (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
