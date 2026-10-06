"use client";

import { useId, useState, useSyncExternalStore } from "react";
import type { Lang } from "./messages.js";
import {
  ANSWER_MAX,
  DNA_ANSWERS,
  EMPTY_ENQUIRY,
  enquiryHref,
  offerDocument,
  waitlistHref,
} from "./offer-text.js";
import type { DnaAnswer, EnquiryAnswers, WaitlistTier } from "./offer-text.js";

/**
 * The offer page's two forms (TASK-057, TASK-104): a paid tier's waiting list
 * and the 800 zł enquiry. Each prepares a message for the contact form and
 * nothing else: the link's address (the contact page, the message in its
 * fragment) is rebuilt as the reader types, and the reader sends it from
 * there. This page writes nothing (ADR-0017 §2.3, ADR-0026 §2.3).
 *
 * Before the script runs, and without it, a link stands alone, prefilled with
 * the questions and empty answers. With it, the form's button (and Enter in a
 * field) opens the same address, built from what was typed.
 *
 * The browser members used are declared, as in `surname-combobox.tsx`, rather
 * than widening the repository's `lib: ["ES2022"]`.
 */
declare const location: { assign(url: string): void } | undefined;
interface ValueLike {
  readonly value: string;
}

/** Nothing outside changes whether this is the client, so there is nothing to subscribe to. */
const subscribeNever = () => () => undefined;

function valueOf(event: { readonly target: unknown }): string {
  return (event.target as ValueLike).value;
}

export function OfferForm({
  tier,
  lang,
}: {
  /** The genealogist's tier takes an enquiry; every other paid tier a waiting list. */
  readonly tier: WaitlistTier | "genealogy";
  readonly lang: Lang;
}) {
  const kind = tier === "genealogy" ? "enquiry" : "waitlist";
  const doc = offerDocument(lang);
  const id = useId();
  const [surname, setSurname] = useState("");
  const [answers, setAnswers] = useState<EnquiryAnswers>(EMPTY_ENQUIRY);
  const client = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const href =
    tier === "genealogy" ? enquiryHref(answers, lang) : waitlistHref(tier, surname, lang);
  const words = kind === "waitlist" ? doc.waitlist : doc.enquiry;

  if (!client) {
    return (
      <p className="offer-fallback">
        <a className="offer-send" href={href}>
          {words.fallback} <span aria-hidden="true">→</span>
        </a>
      </p>
    );
  }

  const set = (field: keyof EnquiryAnswers) => (event: { readonly target: unknown }) =>
    setAnswers((was) => ({ ...was, [field]: valueOf(event) }));

  return (
    <form
      className="offer-form"
      aria-label={words.heading}
      onSubmit={(event) => {
        event.preventDefault();
        location?.assign(href);
      }}
    >
      {kind === "waitlist" ? (
        <label htmlFor={`${id}-surname`}>
          <span>{doc.waitlist.surname}</span>
          <input
            id={`${id}-surname`}
            type="text"
            autoComplete="family-name"
            maxLength={ANSWER_MAX}
            value={surname}
            onChange={(event) => setSurname(valueOf(event))}
          />
        </label>
      ) : (
        <>
          <label htmlFor={`${id}-name`}>
            <span>{doc.enquiry.fields.name}</span>
            <input
              id={`${id}-name`}
              type="text"
              autoComplete="name"
              maxLength={ANSWER_MAX}
              value={answers.name}
              onChange={set("name")}
            />
          </label>
          <label htmlFor={`${id}-surnames`}>
            <span>{doc.enquiry.fields.surnames}</span>
            <input
              id={`${id}-surnames`}
              type="text"
              maxLength={ANSWER_MAX}
              value={answers.surnames}
              onChange={set("surnames")}
            />
          </label>
          <label htmlFor={`${id}-places`}>
            <span>{doc.enquiry.fields.places}</span>
            <input
              id={`${id}-places`}
              type="text"
              maxLength={ANSWER_MAX}
              value={answers.places}
              onChange={set("places")}
            />
          </label>
          <label htmlFor={`${id}-goal`}>
            <span>{doc.enquiry.fields.goal}</span>
            <textarea
              id={`${id}-goal`}
              rows={3}
              maxLength={ANSWER_MAX}
              value={answers.goal}
              onChange={set("goal")}
            />
          </label>
          <label htmlFor={`${id}-dna`}>
            <span>{doc.enquiry.dna}</span>
            <select
              id={`${id}-dna`}
              value={answers.dna}
              onChange={(event) =>
                setAnswers((was) => ({ ...was, dna: valueOf(event) as DnaAnswer | "" }))
              }
            >
              {(["", ...DNA_ANSWERS] as const).map((a) => (
                <option key={a} value={a}>
                  {doc.enquiry.dnaAnswers[a]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <button type="submit" className="offer-send">
        {words.submit} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
