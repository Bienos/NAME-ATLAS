import type { ReactNode } from "react";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { offerDocument } from "./offer-text.js";
import { comparePagePath, howPath, offerPath } from "./site-links.js";

/**
 * The landing's sections around and below the hero (TASK-053; extended and
 * reordered in TASK-065): the example surnames and the cue in the hero, then
 * what you get, how it works, the offer and compare. Each is static or renders
 * what it is given; none derives a figure.
 */

/**
 * The surnames the hero offers as a first tap (TASK-065): each on the 2026
 * lists, each linked to its search answer, which opens its deck (ADR-0019
 * §2.6). None is carried by so few people that a count could point at them.
 */
export const LANDING_TRIES = ["NOWAK", "ZAREMBA", "KOWALSKA", "ŻMUDA-TRZEBIATOWSKI"] as const;

/** The surname whose cards the landing shows before a search (TASK-065); the field's placeholder names the same one. */
export const LANDING_EXAMPLE = "ZAREMBA";

/** The search's own address for a surname: a resolved one redirects to its deck. */
export function trySearchPath(surname: string, lang: Lang): string {
  const params = new URLSearchParams({ surname });
  if (lang === "en") params.set("lang", "en");
  return `/?${params.toString()}`;
}

/** "Spróbuj: NOWAK · ZAREMBA · …", under the search pill. */
export function LandingTries({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <p className="landing-try">
      <span className="landing-try-label">{t.landingTry}</span>
      {LANDING_TRIES.map((surname) => (
        <a key={surname} href={trySearchPath(surname, lang)} lang="pl">
          {surname}
        </a>
      ))}
    </p>
  );
}

/** The link at the foot of the hero to the first section below it. */
export function LandingCue({ lang, target }: { lang: Lang; target: string }) {
  const t = UI[lang];
  return (
    <a className="landing-cue" href={target}>
      {t.landingCue}
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 10l6 6 6-6" />
      </svg>
    </a>
  );
}

/** What the landing shows of one surname's deck: faces rendered by `deckCards`, with their numbers in the deck. */
export interface LandingExample {
  readonly surname: string;
  /** The deck's address: the surname's page with `?view=cards`. */
  readonly deckPath: string;
  readonly cards: readonly {
    readonly number: number;
    readonly key: string;
    readonly title: string;
    readonly face: ReactNode;
  }[];
}

/**
 * "Co dostaniesz": the example's cards laid flat on the ground, each the
 * deck's own face with its source and date at its foot, and the way to the
 * whole deck. Nothing without an example.
 */
export function LandingPreview({ example, lang }: { example: LandingExample | null; lang: Lang }) {
  if (example === null || example.cards.length === 0) return null;
  const t = UI[lang];
  return (
    <section id="preview" className="landing-preview" aria-labelledby="landing-preview-heading">
      <h2 id="landing-preview-heading">{t.previewHeading}</h2>
      <p className="landing-preview-lede">
        {t.previewLede} <b lang="pl">{example.surname}</b>:
      </p>
      <ul className="preview-cards">
        {example.cards.map((card) => (
          <li key={card.key}>
            <article className="dk-card preview-card" aria-label={card.title}>
              <span className="dk-spine" aria-hidden="true">
                {example.surname} · NAME ATLAS
              </span>
              <span className="dk-index" aria-hidden="true">
                {String(card.number).padStart(2, "0")}
              </span>
              {card.face}
            </article>
          </li>
        ))}
      </ul>
      <p className="landing-more">
        <a href={example.deckPath}>
          {t.previewAll} <span lang="pl">{example.surname}</span>
        </a>
        <span className="landing-preview-share">{t.previewShare}</span>
      </p>
    </section>
  );
}

/** How it works, in three sentences, then the page that says it in full. */
export function LandingHow({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <section id="how" className="landing-how" aria-labelledby="landing-how-heading">
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
 * The offer in one strip (TASK-065): the three tiers as the offer page words
 * them — `offerDocument` is the one owner of their names, prices and status —
 * then the page itself and its waiting list. Nothing here can be bought.
 */
export function LandingOffer({ lang }: { lang: Lang }) {
  const t = UI[lang];
  const doc = offerDocument(lang);
  return (
    <section id="offer" className="landing-offer" aria-labelledby="landing-offer-heading">
      <h2 id="landing-offer-heading">{t.offerHeading}</h2>
      <p className="landing-offer-lede">{doc.lede}</p>
      <ul className="offer-strip">
        {doc.tiers.map((tier) => (
          <li key={tier.key} className={tier.soon ? "is-soon" : "is-now"}>
            <p className="strip-status">{tier.soon ? doc.soon : doc.now}</p>
            <h3>{tier.name}</h3>
            <p className="strip-price">{tier.price}</p>
            <p className="strip-lede">{tier.lede}</p>
          </li>
        ))}
      </ul>
      <p className="landing-more">
        <a href={offerPath(lang)}>{t.offerAll}</a>
        <a href={`${offerPath(lang)}#tier-family`}>{t.offerWaitlist}</a>
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
