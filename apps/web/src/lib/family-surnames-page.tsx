import type { Metadata } from "next";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";
import { FamilySurnamesForm } from "./family-surnames-client.js";

/**
 * The family surnames view (TASK-169): up to four surnames, each with its own
 * free result, on one page that keeps nothing.
 *
 * Never indexed and not in the sitemap. The address carries no surname: the
 * page is the same for every visitor, and the surnames exist only in the
 * client island's memory (§5, §9).
 */

export const FAMILY_SURNAMES_PATHS: Readonly<Record<Lang, string>> = {
  pl: "/pl/nazwiska-w-rodzinie",
  en: "/en/family-surnames",
};

export function familySurnamesMetadata(lang: Lang): Metadata {
  return {
    title: `${UI[lang].familyTitle} · Name Atlas`,
    robots: { index: false, follow: false },
  };
}

export function FamilySurnamesPage({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <SiteShell
      lang={lang}
      otherPath={FAMILY_SURNAMES_PATHS[lang === "pl" ? "en" : "pl"]}
      world={{ mode: "quiet" }}
      mainClassName="family atlas-v1"
    >
      <header>
        <h1 className="page-title">{t.familyTitle}</h1>
        <p className="page-lede">{t.familyIntro}</p>
      </header>
      <FamilySurnamesForm lang={lang} />
    </SiteShell>
  );
}
