"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import {
  addEntry,
  cardsFor,
  initialEntries,
  LABELS,
  MAX_ENTRIES,
  setLabel,
  setSurname,
  submissions,
} from "./family-surnames-state.js";
import type { Card, Entry, Outcome } from "./family-surnames-state.js";
import { lookup, lookupEach } from "./family-surnames-lookup.js";
import { FamilyCards, labelText } from "./family-surnames-view.js";

/**
 * The family surnames view's one client island (TASK-169 §6.3).
 *
 * Everything it holds is in memory and is gone on refresh: it writes nothing
 * to browser storage and nothing to the address bar (§9). There is deliberately
 * no `<form>`: a form submitted before this script has loaded would put the
 * surnames into the URL as a query string. The button and the Enter key look
 * the surnames up instead, one ordinary request each.
 */

interface Submission {
  readonly entries: readonly Entry[];
  readonly outcomes: readonly (Outcome | undefined)[];
}

/** The app's tsconfig has no DOM library, so a field's value is read as `offer-form.tsx` reads it. */
function valueOf(event: { readonly target: unknown }): string {
  return (event.target as { readonly value: string }).value;
}

const browserFetch = (url: string): Promise<Response> => fetch(url);

export function FamilySurnamesForm({ lang }: { lang: Lang }) {
  const t = UI[lang];
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [submission, setSubmission] = useState<Submission | null>(null);
  // Answers to an earlier submission are dropped when they land late.
  const generation = useRef(0);

  const record = (gen: number, index: number, outcome: Outcome): void => {
    if (gen !== generation.current) return;
    setSubmission((current) => {
      if (current === null) return current;
      const outcomes = [...current.outcomes];
      outcomes[index] = outcome;
      return { ...current, outcomes };
    });
  };

  const submit = (): void => {
    const submitted = submissions(entries);
    generation.current += 1;
    const gen = generation.current;
    setSubmission({ entries: submitted, outcomes: submitted.map(() => undefined) });
    void lookupEach(browserFetch, submitted, (index, outcome) => record(gen, index, outcome));
  };

  // A retry asks again for this card's inputs only; no other card changes.
  const retry = (card: Card): void => {
    if (submission === null) return;
    const gen = generation.current;
    for (const index of card.indexes) {
      const entry = submission.entries[index];
      if (entry === undefined) continue;
      record(gen, index, { kind: "LOADING" });
      void lookup(browserFetch, entry.surname).then((outcome) => record(gen, index, outcome));
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  const cards = submission === null ? [] : cardsFor(submission.entries, submission.outcomes);

  return (
    <>
      <div className="family-inputs" role="group" aria-label={t.familyTitle}>
        {entries.map((entry, index) => {
          const n = String(index + 1);
          return (
            <div className="family-input" key={n}>
              <label htmlFor={`family-surname-${n}`}>{t.familyInputLabel}</label>
              <input
                id={`family-surname-${n}`}
                name={`surname-${n}`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={entry.surname}
                onChange={(e) => setEntries((cur) => setSurname(cur, index, valueOf(e)))}
                onKeyDown={onKeyDown}
              />
              <select
                aria-label={t.familyLabelLabel}
                value={entry.label ?? ""}
                onChange={(e) => setEntries((cur) => setLabel(cur, index, valueOf(e)))}
              >
                <option value="">{t.familyNoLabel}</option>
                {LABELS.map((label) => (
                  <option key={label} value={label}>
                    {labelText(label, lang)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        <div className="family-actions">
          {entries.length < MAX_ENTRIES ? (
            <button type="button" onClick={() => setEntries((cur) => addEntry(cur))}>
              {t.familyAdd}
            </button>
          ) : null}
          <button type="button" className="family-submit" onClick={submit}>
            {t.familySubmit}
          </button>
        </div>
      </div>
      <div aria-live="polite">
        <FamilyCards cards={cards} lang={lang} onRetry={retry} />
      </div>
    </>
  );
}
