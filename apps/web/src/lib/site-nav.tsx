import { accountPath } from "./account-paths.js";
import { accountsEnabled } from "./accounts-config.js";
import { familyTreeEnabled } from "./family-config.js";
import { htmlLang, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { atlasPath, comparePagePath, homePath, howPath, offerPath } from "./site-links.js";
import { treeLandingPath } from "./tree-paths.js";
import { SearchForm } from "./search-form.js";

/** Which of the header's places the page is, for `aria-current`. */
export type NavPlace = "atlas" | "compare" | "how" | "offer" | "account" | "trees" | null;

function Links({ lang, current }: { lang: Lang; current: NavPlace }) {
  const t = UI[lang];
  const links: readonly (readonly [Exclude<NavPlace, null>, string, string])[] = [
    ["atlas", atlasPath(lang), t.navAtlas],
    ["compare", comparePagePath(lang), t.navCompare],
    ["how", howPath(lang), t.navHow],
    ["offer", offerPath(lang), t.navOffer],
    // Only when accounts exist (TASK-062): read at render, so a static page bakes it at build.
    ...(accountsEnabled()
      ? ([["account", accountPath(lang, "account"), t.navAccount]] as const)
      : []),
    // And the tree's landing page beside it, only when the family tree is on
    // (TASK-076): the pages themselves need a session, the landing says why.
    ...(familyTreeEnabled() ? ([["trees", treeLandingPath(lang), t.navTrees]] as const) : []),
  ];
  return (
    <>
      {links.map(([place, href, label]) => (
        <a
          key={place}
          className={`nav-${place}`}
          href={href}
          aria-current={place === current ? "page" : undefined}
        >
          {label}
        </a>
      ))}
    </>
  );
}

/**
 * The language switch as the brand writes it: `PL | EN`, the page's own
 * language marked and the other one a link to this same page in it.
 */
function LangSwitch({ lang, otherPath }: { lang: Lang; otherPath: string }) {
  const t = UI[lang];
  const pl =
    lang === "pl" ? (
      <span aria-current="true">PL</span>
    ) : (
      <a href={otherPath} hrefLang="pl" lang="pl" aria-label={t.langNamePl}>
        PL
      </a>
    );
  const en =
    lang === "en" ? (
      <span aria-current="true">EN</span>
    ) : (
      <a href={otherPath} hrefLang="en" lang="en" aria-label={t.langNameEn}>
        EN
      </a>
    );
  return (
    <p className="lang-switch">
      {pl}
      <span aria-hidden="true"> | </span>
      {en}
    </p>
  );
}

/**
 * The header every page opens with (TASK-052, ADR-0021): the wordmark in plain
 * type, the four places — the atlas, the comparison, how it works and the
 * offer (TASK-057) — and the language switch. A page that answers a surname
 * also carries the search here, compact, so a second search is one keystroke
 * away (TASK-023 §2.6).
 *
 * On a phone the places fold into a native disclosure, so the menu needs no
 * script and works with a keyboard and a screen reader as is.
 */
export function SiteNav({
  lang,
  otherPath,
  current = null,
  search = null,
}: {
  lang: Lang;
  /** This page in the other language. */
  otherPath: string;
  current?: NavPlace;
  /** The compact search and the surname it holds; null leaves the header without one. */
  search?: { readonly query: string } | null;
}) {
  const t = UI[lang];
  return (
    <header className="site-nav" lang={htmlLang(lang)}>
      <a className="wordmark" href={homePath(lang)}>
        {t.title}
      </a>
      {search === null ? null : <SearchForm lang={lang} query={search.query} variant="compact" />}
      <nav className="site-links" aria-label={t.siteNavLabel}>
        <Links lang={lang} current={current} />
      </nav>
      <LangSwitch lang={lang} otherPath={otherPath} />
      <details className="nav-menu">
        <summary>{t.navMenu}</summary>
        <nav aria-label={t.siteNavLabel}>
          <Links lang={lang} current={current} />
        </nav>
      </details>
    </header>
  );
}
