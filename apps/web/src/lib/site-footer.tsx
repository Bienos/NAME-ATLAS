import { htmlLang, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { legalPath } from "./legal-text.js";
import { CONTACT_EMAIL } from "./contact.js";
import { DIRECTORY_LINK } from "./directory-text.js";
import {
  atlasPath,
  blogPath,
  comparePagePath,
  contactPath,
  DIRECTORY_PATH,
  followLinks,
  homePath,
  howPath,
  offerPath,
} from "./site-links.js";

export { CONTACT_EMAIL, contactPath };

/** The year in the closing line, read at render (a static page bakes it at build). */
function year(): number {
  return new Date().getUTCFullYear();
}

/**
 * The footer every page ends with. A call to write, on the contact page's form;
 * the wordmark with the data note; the site's places in three groups; the
 * social links; then the closing line with a way back to the top.
 */
export function SiteFooter({ lang }: { readonly lang: Lang }) {
  const t = UI[lang];
  const groups: readonly {
    readonly heading: string;
    readonly links: readonly (readonly [string, string])[];
  }[] = [
    {
      heading: t.footerExplore,
      links: [
        [atlasPath(lang), t.navAtlas],
        [comparePagePath(lang), t.navCompare],
        // The surname directory is Polish only (TASK-129).
        ...(lang === "pl" ? [[DIRECTORY_PATH, DIRECTORY_LINK] as const] : []),
        [howPath(lang), t.navHow],
        [offerPath(lang), t.navOffer],
      ],
    },
    {
      heading: t.footerRead,
      links: [[blogPath(lang), t.blogTitle]],
    },
    {
      heading: t.footerSite,
      links: [
        [contactPath(lang), t.contactLink],
        [legalPath("privacy", lang), t.privacyLink],
        [legalPath("terms", lang), t.termsLink],
      ],
    },
  ];
  const social = followLinks(lang).filter((link) => link.label !== "Blog");
  return (
    <footer lang={htmlLang(lang)} className="site-footer">
      <a className="footer-cta" href={contactPath(lang)}>
        <span className="footer-cta-title">{t.footerCtaTitle}</span>
        <span className="footer-cta-action">
          {t.footerCtaAction} <span aria-hidden="true">→</span>
        </span>
      </a>
      <div className="footer-grid">
        <div className="footer-brand">
          <a className="footer-wordmark" href={homePath(lang)}>
            {t.title}
          </a>
          <p className="footer-tagline">{t.tagline}</p>
          <p className="footer-note">{t.footer}</p>
        </div>
        {groups.map((group) => (
          <nav key={group.heading} className="footer-group" aria-label={group.heading}>
            <h2>{group.heading}</h2>
            <ul>
              {group.links.map(([href, label]) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <nav className="footer-group footer-follow" aria-label={t.followLabel}>
          <h2>{t.footerFollow}</h2>
          <ul>
            {social.map((link) => (
              <li key={link.label}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="footer-base">
        <p>
          © {year()} {t.title}
        </p>
        <a className="footer-top" href="#top">
          {t.footerTop} <span aria-hidden="true">↑</span>
        </a>
      </div>
    </footer>
  );
}
