import { htmlLang, UI } from "./messages.js";
import type { Lang } from "./messages.js";

/**
 * The project's contact address (TASK-047), given by the project owner on
 * 2026-09-30. Stored here once; every footer, the contact pages and
 * `/.well-known/security.txt` read it from this constant.
 */
export const CONTACT_EMAIL = "cihypatryk@gmail.com";

/** The contact page in each language. */
export function contactPath(lang: Lang): string {
  return lang === "en" ? "/en/contact" : "/pl/kontakt";
}

/** The footer every page ends with: the data note, then the contact. */
export function SiteFooter({ lang }: { readonly lang: Lang }) {
  const t = UI[lang];
  return (
    <footer lang={htmlLang(lang)}>
      {t.footer}
      <p className="footer-contact">
        <a href={contactPath(lang)}>{t.contactLink}</a>
        {" · "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </footer>
  );
}
