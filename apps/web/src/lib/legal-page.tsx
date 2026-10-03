import type { Metadata } from "next";
import { formatDate } from "./messages.js";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";
import { accountsEnabled } from "./accounts-config.js";
import { familyTreeEnabled } from "./family-config.js";
import { legalDocument, legalPath, legalUpdated } from "./legal-text.js";
import type { LegalKind } from "./legal-text.js";

/**
 * `/pl/prywatnosc`, `/en/privacy`, `/pl/regulamin`, `/en/terms` (TASK-046).
 * Static: the text is in `legal-text.ts`; no database, no request data. When
 * accounts are on (`accounts-config.ts`, read at build) it says so
 * (`legal-accounts.ts`), and its date is the accounts variant's; when the
 * family tree is on too (TASK-073), it carries the tree's statements
 * (`legal-tree.ts`) and that variant's date.
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
  const accounts = accountsEnabled();
  const tree = familyTreeEnabled();
  const doc = legalDocument(kind, lang, accounts, tree);
  const updated = legalUpdated(kind, accounts, tree);
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={legalPath(kind, other)}
      world={{ mode: "quiet" }}
      mainClassName="reading legal"
    >
      <h2>{doc.title}</h2>
      <p className="legal-updated">
        {doc.updatedLabel}: <time dateTime={updated}>{formatDate(updated, lang)}</time>
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
    </SiteShell>
  );
}
