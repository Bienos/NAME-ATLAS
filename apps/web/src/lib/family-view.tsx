"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { htmlLang, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { NamePrint } from "./name-print.js";
import { FAMILY_PATH, FamilyCard, labelWord } from "./family-card.js";
import {
  cardsOf,
  emptyEntries,
  LABELS,
  LOADING,
  lookupsOf,
  parseLabel,
  requestPath,
  stateOf,
  withLabel,
  withSurname,
} from "./family-state.js";
import type { CardState, Entry, SlotId } from "./family-state.js";

/**
 * The family surnames view (TASK-040): up to four surnames, one ordinary lookup
 * each, and the free result of each on one page.
 *
 * What it keeps out of every request, and how (§9):
 *
 * - **Labels.** A lookup takes a surname string and nothing else, so a label
 *   has no way into a URL, header or body.
 * - **Anything that marks the lookup as this page's.** One `GET` to the path any
 *   client uses, with no request options at all: no header, no body, no flag.
 *   The page's `no-referrer` policy (`FAMILY_METADATA`) stops the browser adding
 *   this page's address as a `Referer`.
 * - **The URL and browser storage.** Nothing is written to either. There is no
 *   `<form>` element: a form submitted before the script loads would put the
 *   typed surnames into the page's query string, so the inputs are plain fields
 *   and "Show results" is a button that only this script can act on.
 * - **Spelling services.** Spellcheck and autocorrect are off on the inputs;
 *   some browsers send checked text to a remote service.
 *
 * Refreshing or leaving the page forgets everything, because nothing was kept.
 */

/**
 * The browser members this island reads, declared rather than widening the
 * repository's `lib: ["ES2022"]` (the convention of `surname-combobox.tsx`).
 */
interface ValueLike {
  readonly value: string;
}
interface CompositionLike {
  readonly isComposing?: boolean;
}

/** The single argument is the whole request: the path, and no options. */
export type Fetch = (path: string) => Promise<Response>;

const browserFetch: Fetch = (path) => fetch(path);

/** One lookup, as a card state. A failed connection is an error, never an unknown surname. */
export async function lookUp(surname: string, fetchFn: Fetch = browserFetch): Promise<CardState> {
  let response: Response;
  try {
    response = await fetchFn(requestPath(surname));
  } catch {
    return { kind: "ERROR", retryable: true };
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // The middleware's 429 is plain text, and a proxy error may be HTML.
    body = null;
  }
  return stateOf(response.status, body);
}

/**
 * One request per lookup, all at once, each reported as it lands, so a slow or
 * failing surname never holds back or clears another (§10).
 */
export async function runLookups(
  lookups: readonly Entry[],
  onState: (slot: SlotId, state: CardState) => void,
  fetchFn: Fetch = browserFetch,
): Promise<void> {
  await Promise.all(
    lookups.map(async (entry) => {
      onState(entry.slot, await lookUp(entry.surname, fetchFn));
    }),
  );
}

export function FamilyView({ lang }: { lang: Lang }) {
  const t = UI[lang];
  const [entries, setEntries] = useState<readonly Entry[]>(emptyEntries);
  // What was asked, fixed at the moment of asking; editing an input after
  // that does not relabel a card that is already showing its answer.
  const [asked, setAsked] = useState<readonly Entry[]>([]);
  const [states, setStates] = useState<ReadonlyMap<SlotId, CardState>>(() => new Map());
  // A newer "Show results" owns the cards; answers to an older one are dropped.
  const round = useRef(0);

  const look = (lookups: readonly Entry[], current: number): void => {
    void runLookups(lookups, (slot, state) => {
      if (round.current !== current) return;
      setStates((previous) => new Map(previous).set(slot, state));
    });
  };

  const show = (): void => {
    const lookups = lookupsOf(entries);
    round.current += 1;
    setAsked(lookups);
    setStates(new Map(lookups.map((entry) => [entry.slot, LOADING])));
    look(lookups, round.current);
  };

  const retry = (slot: SlotId): void => {
    const entry = asked.find((candidate) => candidate.slot === slot);
    if (entry === undefined) return;
    setStates((previous) => new Map(previous).set(slot, LOADING));
    look([entry], round.current);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    // Enter while an input method is composing a character confirms the
    // character, not the search.
    if (event.key !== "Enter" || (event.nativeEvent as unknown as CompositionLike).isComposing) {
      return;
    }
    event.preventDefault();
    show();
  };

  const cards = cardsOf(asked, states);

  return (
    <>
      <main lang={htmlLang(lang)} className="family">
        <div className="masthead">
          <h1>
            <a href={lang === "en" ? "/?lang=en" : "/"}>
              <NamePrint className="logo-mark" size="small" />
              {t.title}
            </a>
          </h1>
          <a href={FAMILY_PATH[lang === "pl" ? "en" : "pl"]}>{t.langSwitch}</a>
        </div>
        <h2 className="family-heading">{t.familyTitle}</h2>

        {/* Before any input or figure, and always on screen: the layout lists
            a visitor's family surnames, and this is the sentence that refuses
            the inference that the results describe their relatives (AC-11). */}
        <p className="warning">{t.familyNotice}</p>
        <p className="note family-lede">{t.familyLede}</p>

        <div className="family-inputs" role="search">
          {entries.map((entry) => (
            <div className="family-row" key={entry.slot}>
              <label htmlFor={entry.slot}>{t.familyPrompt}</label>
              <input
                id={entry.slot}
                name={entry.slot}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t.searchPlaceholder}
                value={entry.surname}
                onChange={(event) => {
                  const { value } = event.target as unknown as ValueLike;
                  setEntries((current) => withSurname(current, entry.slot, value));
                }}
                onKeyDown={onKeyDown}
              />
              <select
                aria-label={t.familyLabelPrompt}
                value={entry.label ?? ""}
                onChange={(event) => {
                  const label = parseLabel((event.target as unknown as ValueLike).value);
                  setEntries((current) => withLabel(current, entry.slot, label));
                }}
              >
                <option value="">{t.familyNoLabel}</option>
                {LABELS.map((label) => (
                  <option key={label} value={label}>
                    {labelWord(label, lang)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button type="button" onClick={show}>
            {t.familyShow}
          </button>
        </div>

        {cards.length === 0 ? null : (
          <div className="family-cards" aria-live="polite">
            {cards.map((card) => (
              <FamilyCard
                key={card.key}
                card={card}
                lang={lang}
                onRetry={() => {
                  retry(card.key);
                }}
              />
            ))}
          </div>
        )}
      </main>
      <footer lang={htmlLang(lang)}>{t.footer}</footer>
    </>
  );
}
