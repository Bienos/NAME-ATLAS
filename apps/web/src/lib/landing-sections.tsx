import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { comparePagePath, howPath } from "./site-links.js";

/**
 * The landing's last two sections, after the atlas (TASK-053, the redesign
 * proposal's landing order: hero, the atlas, how it works, compare, footer).
 * Both are static: they restate rules the product already keeps and point to
 * pages that already exist.
 */

/** How it works, in three sentences, then the page that says it in full. */
export function LandingHow({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <section className="landing-how" aria-labelledby="landing-how-heading">
      <h2 id="landing-how-heading">{t.navHow}</h2>
      <ol>
        {t.landingHowPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ol>
      <p className="landing-more">
        <a href={howPath(lang)}>{t.landingHowMore}</a>
      </p>
    </section>
  );
}

/**
 * Two fields that open the comparison. The same `GET` as the comparison's own
 * picker (`compare-request.ts`): typed surnames become the pair's address.
 * Its own ids, so they never collide with the search field's.
 */
export function LandingCompare({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <section className="landing-compare" aria-labelledby="landing-compare-heading">
      <h2 id="landing-compare-heading">{t.compareHeading}</h2>
      <p>{t.compareIntro}</p>
      <form className="compare-form" action={comparePagePath(lang)} method="get">
        <label htmlFor="landing-qa">{t.compareFirstLabel}</label>
        <input
          id="landing-qa"
          name="qa"
          type="text"
          placeholder={t.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="words"
        />
        <label htmlFor="landing-qb">{t.compareSecondLabel}</label>
        <input
          id="landing-qb"
          name="qb"
          type="text"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="words"
        />
        <button type="submit">{t.compareAction}</button>
      </form>
    </section>
  );
}
