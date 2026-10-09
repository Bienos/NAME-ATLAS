import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import { accountPath } from "./account-paths.js";
import { accountsEnabled } from "./accounts-config.js";
import { BABY_NAMES_PATHS, babyNamesEnabled } from "./baby-names-config.js";
import { familyTreeEnabled } from "./family-config.js";
import { FAMILY_SURNAMES_PATHS } from "./family-surnames-page.js";
import { fillTemplate, formatInteger, UI } from "./messages.js";
import { rich } from "./list-atlas.js";
import type { Lang } from "./messages.js";
import { atlasPath, comparePagePath, howPath, offerPath } from "./site-links.js";
import { treeLandingPath, treePath } from "./tree-paths.js";

/**
 * The landing's sections below the hero (TASK-053, TASK-065; four sections
 * since TASK-178): what Name Atlas is and why, how to use it, what to expect
 * (the six questions and one real card), and one tile per other tool. Each is
 * static or renders what it is given; none derives a figure. The hero itself
 * keeps ADR-0021's words.
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

/** A section's head: the eyebrow, the heading and, beside it, an optional lede. */
function SectionHead({
  id,
  eyebrow,
  heading,
  lede,
  blue = false,
}: {
  id: string;
  eyebrow: string;
  heading: string;
  lede?: ReactNode;
  blue?: boolean;
}) {
  return (
    <div className="ld-head">
      <div>
        <p className={blue ? "ld-eyebrow ld-eyebrow-blue" : "ld-eyebrow"}>{eyebrow}</p>
        <h2 id={id}>
          <Scatter text={heading} />
        </h2>
      </div>
      {lede === undefined ? null : <p className="ld-head-lede">{lede}</p>}
    </div>
  );
}

/**
 * What it is and why it exists (TASK-178): `PRODUCT.md` §1 in three
 * paragraphs, and the three promises the how-it-works page keeps, with the
 * way to that page.
 */
export function LandingWhat({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <section id="what" className="ld-section ld-what" aria-labelledby="ld-what-heading">
      <SectionHead id="ld-what-heading" eyebrow={t.ldWhatEyebrow} heading={t.ldWhatTitle} />
      <div className="ld-cols">
        <div className="ld-prose">
          {t.ldWhatParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <ol className="ld-promises">
          {t.ldPromises.map(([title, body], i) => (
            <li key={title}>
              <span className="ld-k">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="landing-more">
        <a href={howPath(lang)}>{t.landingHowMore}</a>
      </p>
    </section>
  );
}

/** How to use it (TASK-178): three steps, a real sequence, then the surnames to try. */
export function LandingSteps({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <section id="how" className="ld-section ld-how" aria-labelledby="ld-how-heading">
      <SectionHead
        id="ld-how-heading"
        eyebrow={t.ldHowEyebrow}
        heading={t.ldHowTitle}
        lede={t.ldHowLede}
      />
      <ol className="ld-steps">
        {t.ldSteps.map(([title, body], i) => (
          <li key={title}>
            <span className="ld-k">{String(i + 1).padStart(2, "0")}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <LandingTries lang={lang} />
    </section>
  );
}

/**
 * What to expect (TASK-178): the six questions a search answers
 * (`pitchAnswers`, TASK-065) and one of the example surname's cards, the
 * deck's own face with its source and date, with the way to the whole deck.
 * Without an example the questions stand alone.
 */
export function LandingExpect({ example, lang }: { example: LandingExample | null; lang: Lang }) {
  const t = UI[lang];
  const card = example?.cards[0] ?? null;
  return (
    <section id="expect" className="ld-section ld-expect" aria-labelledby="ld-expect-heading">
      <SectionHead
        id="ld-expect-heading"
        eyebrow={t.pitchEyebrow}
        heading={t.ldExpectTitle}
        lede={t.pitchLede}
      />
      <div className="ld-expect-grid">
        <ol className="ld-qa">
          {t.pitchAnswers.map(([question, answer], i) => (
            <li key={question}>
              <span className="ld-k">{String(i + 1).padStart(2, "0")}</span>
              <h3>{question}</h3>
              <p>{answer}</p>
            </li>
          ))}
        </ol>
        {example === null || card === null ? null : (
          <div className="ld-example">
            <p className="ld-example-lede">
              {t.ldExampleLede} <span lang="pl">{example.surname}</span>:
            </p>
            <article className="dk-card preview-card ld-card" aria-label={card.title}>
              <span className="dk-spine" aria-hidden="true">
                {example.surname} · NAME ATLAS
              </span>
              <span className="dk-index" aria-hidden="true">
                {String(card.number).padStart(2, "0")}
              </span>
              {card.face}
            </article>
            <p className="ld-example-note">
              {t.ldExampleNote}{" "}
              <a href={example.deckPath}>
                {t.previewAll} <span lang="pl">{example.surname}</span>
              </a>
            </p>
          </div>
        )}
      </div>
      <p className="ld-note">{t.pitchNote}</p>
    </section>
  );
}

/** The two surname lists' sizes for the Atlas tile: one figure per list, never summed. */
export interface AtlasFigures {
  readonly male: number;
  readonly female: number;
}

function Tile({
  href,
  tag,
  title,
  body,
  go,
  featured = false,
  children,
}: {
  href: string;
  tag: string;
  title: string;
  body: string;
  go: string;
  featured?: boolean;
  children?: ReactNode;
}) {
  return (
    <a className={featured ? "ld-tile ld-tile-feat" : "ld-tile"} href={href}>
      <span className="ld-tile-tag">{tag}</span>
      <h3>{title}</h3>
      {children}
      <p>{body}</p>
      <span className="ld-tile-go">
        {go} <span aria-hidden="true">→</span>
      </span>
    </a>
  );
}

/**
 * Everything else, one tile each (TASK-178): the Atlas, featured, with one
 * figure per surname list from the artefact; the comparison; the family
 * surnames; baby names and the tree only when they are on. The offer is one
 * line; the price list lives on its page.
 */
export function LandingTools({ figures, lang }: { figures: AtlasFigures | null; lang: Lang }) {
  const t = UI[lang];
  const treeOn = familyTreeEnabled();
  const babyOn = babyNamesEnabled() && accountsEnabled();
  return (
    <section id="tools" className="ld-section ld-tools" aria-labelledby="ld-tools-heading">
      <SectionHead
        id="ld-tools-heading"
        eyebrow={t.ldToolsEyebrow}
        heading={t.ldToolsTitle}
        blue
        lede={rich(
          t.ldToolsLede,
          { offer: <a href={offerPath(lang)}>{t.ldToolsOffer}</a> },
          {},
          lang,
        )}
      />
      <div className="ld-tiles">
        <Tile
          href={atlasPath(lang)}
          tag={t.ldTileAtlasTag}
          title={t.ldTileAtlasTitle}
          body={t.ldTileAtlasBody}
          go={t.ldTileAtlasGo}
          featured
        >
          {figures === null ? null : (
            <p className="ld-tile-figs">
              <span>
                <b>{formatInteger(figures.male, lang)}</b>
                <span>{fillTemplate(t.lfP1SurnamesMale, {}, { n: figures.male }, lang)}</span>
              </span>
              <span>
                <b>{formatInteger(figures.female, lang)}</b>
                <span>{fillTemplate(t.lfP1SurnamesFemale, {}, { n: figures.female }, lang)}</span>
              </span>
            </p>
          )}
        </Tile>
        <Tile
          href={comparePagePath(lang)}
          tag={t.ldTileCompareTag}
          title={t.ldTileCompareTitle}
          body={t.ldTileCompareBody}
          go={t.ldTileCompareGo}
        />
        <Tile
          href={FAMILY_SURNAMES_PATHS[lang]}
          tag={t.ldTileFamilyTag}
          title={t.ldTileFamilyTitle}
          body={t.ldTileFamilyBody}
          go={t.ldTileFamilyGo}
        />
        {babyOn ? (
          <Tile
            href={BABY_NAMES_PATHS[lang]}
            tag={t.ldTileBabyTag}
            title={t.ldTileBabyTitle}
            body={t.ldTileBabyBody}
            go={t.ldTileBabyGo}
          />
        ) : null}
        {treeOn ? (
          <Tile
            href={treeLandingPath(lang)}
            tag={t.ldTileTreeTag}
            title={t.ldTileTreeTitle}
            body={t.ldTileTreeBody}
            go={t.ldTileTreeGo}
          />
        ) : null}
      </div>
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
