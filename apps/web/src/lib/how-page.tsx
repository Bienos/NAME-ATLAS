import type { Metadata } from "next";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";
import { howPath } from "./site-links.js";
import { howDocument } from "./how-text.js";

/** `/pl/jak-to-dziala` and `/en/how-it-works` (TASK-052). Static: no database. */

export function howMetadata(lang: Lang): Metadata {
  return {
    title: `${howDocument(lang).title} — Name Atlas`,
    alternates: {
      canonical: howPath(lang),
      languages: { pl: howPath("pl"), en: howPath("en") },
    },
  };
}

export function HowView({ lang }: { readonly lang: Lang }) {
  const doc = howDocument(lang);
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={howPath(other)}
      world={{ mode: "quiet" }}
      current="how"
      mainClassName="reading how"
    >
      <h1 className="page-title">{doc.title}</h1>
      <p className="page-lede">{doc.lede}</p>
      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {section.items === undefined ? null : (
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
