import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { href, Population, Result } from "./result-view.js";
import type { Card, Entry, FamilyLabel } from "./family-surnames-state.js";

/**
 * The family surnames view's cards (TASK-169 §6.3, §10).
 *
 * Each card is one surname's free result in compact form, drawn by the surname
 * page's own components: the count chapter (`Population`, every figure with its
 * source, scope, date and assessment) for a resolved surname, and `Result`'s own
 * clarification or not-found state otherwise. Nothing is derived here and
 * nothing is computed across cards (AC-10): the list is the cards, in input
 * order, and the notice (AC-11).
 *
 * Pure: no hooks, so it renders to markup in a test. The retry handler is the
 * client component's.
 */

export function labelText(label: FamilyLabel, lang: Lang): string {
  const t = UI[lang];
  switch (label) {
    case "SELF":
      return t.familyLabelSelf;
    case "FATHER":
      return t.familyLabelFather;
    case "MOTHER":
      return t.familyLabelMother;
    case "OTHER":
      return t.familyLabelOther;
  }
}

/** What was typed, with its label: shown on the card, never sent anywhere. */
function Entered({ entries, lang }: { entries: readonly Entry[]; lang: Lang }) {
  const t = UI[lang];
  return (
    <p className="family-entered">
      {t.familyEntered}:{" "}
      {entries.map((e, i) => (
        <span key={i}>
          {i > 0 ? ", " : null}
          <span className="family-typed">{e.surname}</span>
          {e.label === null ? null : ` (${labelText(e.label, lang)})`}
        </span>
      ))}
    </p>
  );
}

function RetryButton({ onRetry, lang }: { onRetry: (() => void) | null; lang: Lang }) {
  return (
    <button type="button" className="family-retry" onClick={onRetry ?? undefined}>
      {UI[lang].familyRetry}
    </button>
  );
}

export function FamilyCard({
  card,
  lang,
  onRetry = null,
}: {
  card: Card;
  lang: Lang;
  onRetry?: (() => void) | null;
}) {
  const t = UI[lang];
  const { outcome } = card;
  const body = (() => {
    switch (outcome.kind) {
      case "LOADING":
        return <p className="family-loading">{t.familyLoading}</p>;
      case "INVALID":
        return (
          <section>
            <h3>{t.invalidHeading}</h3>
            <p className="absent">{t.invalidBody}</p>
          </section>
        );
      case "RATE_LIMITED":
        return (
          <section>
            <h3>{t.familyRateLimitedHeading}</h3>
            <p className="absent">{t.familyRateLimitedBody}</p>
            <RetryButton onRetry={onRetry} lang={lang} />
          </section>
        );
      case "ERROR":
        return (
          <section>
            <h3>{t.unavailableHeading}</h3>
            <p className="absent">{t.unavailableBody}</p>
            <RetryButton onRetry={onRetry} lang={lang} />
          </section>
        );
      case "RESULT": {
        const { response } = outcome;
        if (response.status !== "RESOLVED" || response.surname === null) {
          return <Result response={response} lang={lang} />;
        }
        const surname = response.surname.display_name;
        return (
          <>
            <h3 className="family-surname">{surname}</h3>
            {response.population === null ? null : (
              <Population
                section={response.population}
                surname={surname}
                number={1}
                next={null}
                lang={lang}
                anchor={`count-${card.key.replace(/[^A-Za-z0-9-]/gu, "-")}`}
              />
            )}
            {/* Through the search, which sends it on to the surname's stored address:
                a link is never recomputed from the display form (`currentPathFor`). */}
            <p className="family-full">
              <a href={href(surname, lang)}>{t.familyFullPage}</a>
            </p>
          </>
        );
      }
    }
  })();
  return (
    <article className="family-card" data-card={card.key}>
      <Entered entries={card.entries} lang={lang} />
      {body}
    </article>
  );
}

export function FamilyCards({
  cards,
  lang,
  onRetry = null,
}: {
  cards: readonly Card[];
  lang: Lang;
  onRetry?: ((card: Card) => void) | null;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="family-results">
      <p className="family-notice" role="note">
        {UI[lang].familyNotice}
      </p>
      {cards.map((card) => (
        <FamilyCard
          key={card.key}
          card={card}
          lang={lang}
          onRetry={onRetry === null ? null : () => onRetry(card)}
        />
      ))}
    </div>
  );
}
