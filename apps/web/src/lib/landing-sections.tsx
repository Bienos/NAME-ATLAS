import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import { accountPath, googleStartPath } from "./account-paths.js";
import { googleEnabled } from "./accounts-config.js";
import { familyTreeEnabled } from "./family-config.js";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { offerDocument } from "./offer-text.js";
import { comparePagePath, howPath, offerPath } from "./site-links.js";
import { treeLandingPath, treePath } from "./tree-paths.js";

/**
 * The landing's sections below the hero (TASK-053; extended and reordered in
 * TASK-065): the second screen says what you get and shows it, then the
 * offer, how it works and compare. Each is static or renders what it is
 * given; none derives a figure. The hero itself keeps ADR-0021's words.
 */

/**
 * The surnames the hero offers as a first tap (TASK-065): each on the 2026
 * lists, each linked to its search answer, which opens its deck (ADR-0019
 * §2.6). None is carried by so few people that a count could point at them.
 */
export const LANDING_TRIES = ["NOWAK", "ZAREMBA", "KOWALSKA", "ŻMUDA-TRZEBIATOWSKI"] as const;

/** The surname whose cards the landing shows before a search (TASK-065); the field's placeholder names the same one. */
export const LANDING_EXAMPLE = "ZAREMBA";

/**
 * Where a letter starts from before it settles into its word, from its index
 * alone, so the server and the browser agree and hydration has nothing to
 * mend. The stylesheet moves it; without scroll-driven animation, or with
 * reduced motion, the letter is simply where it belongs.
 */
function scatterFrom(n: number): CSSProperties {
  const dx = ((n * 37) % 11) - 5;
  const dy = ((n * 53) % 13) - 6;
  const r = ((n * 29) % 7) - 3;
  return {
    "--i": n,
    "--dx": `${String(dx * 14)}px`,
    "--dy": `${String(dy * 12)}px`,
    "--r": `${String(r * 25)}deg`,
  } as CSSProperties;
}

/**
 * Text whose letters can move on their own (TASK-065's motion): the whole
 * text once, for assistive technology and for anything that reads the page,
 * then the letters, hidden from it, each in its word so a line never breaks
 * inside one.
 */
export function Scatter({ text }: { text: string }) {
  let n = 0;
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span className="scatter" aria-hidden="true">
        {text.split(" ").map((word, w) => (
          <Fragment key={`${String(w)}-${word}`}>
            {w > 0 ? " " : null}
            <span className="scatter-word">
              {Array.from(word).map((letter) => {
                const i = n++;
                return (
                  <span key={i} className="scatter-letter" style={scatterFrom(i)}>
                    {letter}
                  </span>
                );
              })}
            </span>
          </Fragment>
        ))}
      </span>
    </>
  );
}

/** The search's own address for a surname: a resolved one redirects to its deck. */
export function trySearchPath(surname: string, lang: Lang): string {
  const params = new URLSearchParams({ surname });
  if (lang === "en") params.set("lang", "en");
  return `/?${params.toString()}`;
}

/**
 * "Spróbuj: NOWAK · ZAREMBA · …", on the second screen. Each letter is its
 * own flap, so the stylesheet can turn them over one by one as a departures
 * board does; the link's name is the whole surname.
 */
export function LandingTries({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <p className="landing-try">
      <span className="landing-try-label">{t.landingTry}</span>
      {LANDING_TRIES.map((surname) => (
        <a
          key={surname}
          className="flap"
          href={trySearchPath(surname, lang)}
          lang="pl"
          aria-label={surname}
        >
          {Array.from(surname).map((letter, i) => (
            <span
              key={`${String(i)}-${letter}`}
              className="flap-letter"
              style={{ "--i": i } as CSSProperties}
              aria-hidden="true"
            >
              {letter}
            </span>
          ))}
        </a>
      ))}
    </p>
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
 * The second screen, "Co dostaniesz": what a search gives, as six questions
 * with what answers each, the surnames to try, and the example's cards laid
 * flat on the ground, each the deck's own face with its source and date, with
 * the way to the whole deck. Without an example the cards are left out and
 * the rest stands.
 */
export function LandingPitch({ example, lang }: { example: LandingExample | null; lang: Lang }) {
  const t = UI[lang];
  const cards = example !== null && example.cards.length > 0 ? example : null;
  return (
    <section id="pitch" className="landing-pitch" aria-labelledby="landing-pitch-heading">
      <div className="pitch-head">
        <p className="pitch-eyebrow">{t.pitchEyebrow}</p>
        <h2 id="landing-pitch-heading">
          <Scatter text={t.pitchHeading} />
        </h2>
      </div>
      <p className="pitch-lede">{t.pitchLede}</p>
      <ol className="pitch-answers">
        {t.pitchAnswers.map(([question, answer]) => (
          <li key={question}>
            <h3>{question}</h3>
            <p>{answer}</p>
          </li>
        ))}
      </ol>
      <p className="pitch-note">{t.pitchNote}</p>
      <LandingTries lang={lang} />
      {cards === null ? null : (
        <div className="pitch-cards">
          <h3 className="pitch-cards-title">
            {t.previewLede} <span lang="pl">{cards.surname}</span>:
          </h3>
          <ul className="preview-cards">
            {cards.cards.map((card, i) => (
              <li key={card.key}>
                {/* Dealt face down and turned over as it comes into view
                    (the stylesheet; nothing here moves). The back is
                    decoration and says only whose deck it is. */}
                <div className="flip" style={{ "--i": i } as CSSProperties}>
                  <div className="flip-back" aria-hidden="true">
                    <span className="flip-back-name">{cards.surname}</span>
                    <span className="flip-back-brand">NAME ATLAS</span>
                  </div>
                  <article className="dk-card preview-card" aria-label={card.title}>
                    <span className="dk-spine" aria-hidden="true">
                      {cards.surname} · NAME ATLAS
                    </span>
                    <span className="dk-index" aria-hidden="true">
                      {String(card.number).padStart(2, "0")}
                    </span>
                    {card.face}
                  </article>
                </div>
              </li>
            ))}
          </ul>
          <p className="landing-more">
            <a href={cards.deckPath}>
              {t.previewAll} <span lang="pl">{cards.surname}</span>
            </a>
          </p>
        </div>
      )}
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
 * The offer in one strip (TASK-065): the tiers as the offer page words
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
        <a href={`${offerPath(lang)}#tier-smaller`}>{t.offerWaitlist}</a>
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

/** Sign-in that returns to the reader's trees (TASK-084). */
function treeSignInPath(lang: Lang): string {
  return accountPath(lang, "sign-in", { next: treePath(lang, { page: "trees" }) });
}

/**
 * The family tree's quiet way in under the hero's search (TASK-084): one line,
 * only when the tree is on. Searching a surname still needs no account.
 */
export function LandingTreeLine({ lang }: { lang: Lang }) {
  if (!familyTreeEnabled()) return null;
  const t = UI[lang];
  return (
    <p className="landing-tree-line">
      {t.landingTreeLine} <a href={treeSignInPath(lang)}>{t.landingTreeStart}</a>
      <span aria-hidden="true"> · </span>
      <a href={treeSignInPath(lang)}>{t.landingTreeSignIn}</a>
    </p>
  );
}

/**
 * The family tree's section on the landing (TASK-084), after what the cards
 * give: what the tree is in three lines, then Google's one-click start (when
 * Google is configured) and the other ways in. Only when the tree is on; it
 * is free with an account (D-034).
 */
export function LandingTree({ lang }: { lang: Lang }) {
  if (!familyTreeEnabled()) return null;
  const t = UI[lang];
  const next = treePath(lang, { page: "trees" });
  return (
    <section className="landing-tree" aria-labelledby="landing-tree-heading">
      <p className="landing-tree-eyebrow">{t.landingTreeEyebrow}</p>
      <h2 id="landing-tree-heading">{t.landingTreeHeading}</h2>
      <ul>
        {t.landingTreePoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="tree-actions">
        {googleEnabled() ? (
          <a className="offer-send" href={googleStartPath(lang, next)}>
            {t.landingTreeGoogle}
          </a>
        ) : null}
        <a
          className={googleEnabled() ? "offer-send tree-ghost" : "offer-send"}
          href={treeSignInPath(lang)}
        >
          {googleEnabled() ? t.landingTreeOther : t.landingTreeStart}
        </a>
      </p>
      <p className="landing-more">
        <a href={treeLandingPath(lang)}>{t.landingTreeMore}</a>
      </p>
      <p className="landing-tree-free">{t.landingTreeFree}</p>
    </section>
  );
}
