import { htmlLang, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { legalPath } from "./legal-text.js";
import { CONTACT_EMAIL } from "./contact.js";
import { followLinks, offerPath } from "./site-links.js";

export { CONTACT_EMAIL };

/** The contact page in each language. */
export function contactPath(lang: Lang): string {
  return lang === "en" ? "/en/contact" : "/pl/kontakt";
}

/**
 * The footer every page ends with: the data note, the offer, the contact and
 * the legal pages, then the blog and the social links (TASK-057).
 */
export function SiteFooter({ lang }: { readonly lang: Lang }) {
  const t = UI[lang];
  return (
    <footer lang={htmlLang(lang)}>
      {t.footer}
      <p className="footer-contact">
        <a href={offerPath(lang)}>{t.navOffer}</a>
        {" · "}
        <a href={contactPath(lang)}>{t.contactLink}</a>
        {" · "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        {" · "}
        <a href={legalPath("privacy", lang)}>{t.privacyLink}</a>
        {" · "}
        <a href={legalPath("terms", lang)}>{t.termsLink}</a>
      </p>
      <nav className="footer-follow" aria-label={t.followLabel}>
        {followLinks(lang).map((link) => (
          <a key={link.label} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
