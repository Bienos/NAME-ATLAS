"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { CONTACT_MESSAGE_MAX as MESSAGE_MAX, readContactPrefill } from "./contact.js";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import type { ContactStatus } from "./contact-routes.js";

/**
 * The contact page's form. It posts to `/api/contact`, which sends the message
 * to the owner's inbox and stores nothing. Without script it is a plain form
 * and the route sends the reader back with `?status=`, read here; with it, the outcome is
 * shown in place and the typed message is kept.
 *
 * A link may bring the reader here with a topic and a message in the address's
 * fragment (`contactFormHref`): the "report a problem" link and the offer's
 * forms do. They stand in the fields until the reader types.
 */

/** The browser members read, declared as `offer-form.tsx` does, rather than widening `lib`. */
declare const location: { readonly search: string; readonly hash: string } | undefined;

const STATUSES: readonly ContactStatus[] = ["sent", "invalid", "failed", "unavailable"];

/** The address does not change while the page is open, so there is nothing to subscribe to. */
const subscribeNever = () => () => undefined;

/** The outcome a post made without script came back with, from `?status=`. */
function statusFromAddress(): ContactStatus | null {
  const word = new URLSearchParams(location?.search ?? "").get("status");
  return STATUSES.find((known) => known === word) ?? null;
}

/** The fragment as a string, so the snapshot is stable between reads; parsed where it is used. */
function hashFromAddress(): string {
  return location?.hash ?? "";
}

function valueOf(event: { readonly target: unknown }): string {
  return (event.target as { readonly value: string }).value;
}

export function ContactForm({ lang }: { readonly lang: Lang }) {
  const t = UI[lang];
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const prefill = readContactPrefill(
    useSyncExternalStore(subscribeNever, hashFromAddress, () => ""),
  );
  const topics: readonly string[] = t.contactTopicOptions;
  // What the reader chose or typed wins; before that, what the link brought; before that, the defaults.
  const [chosen, setTopic] = useState<string | null>(null);
  const topic =
    chosen ??
    (prefill?.topic !== undefined && topics.includes(prefill.topic)
      ? prefill.topic
      : t.contactTopicOptions[0]);
  const [typed, setMessage] = useState<string | null>(null);
  const message = typed ?? prefill?.message ?? "";
  const returned = useSyncExternalStore(subscribeNever, statusFromAddress, () => null);
  const [own, setStatus] = useState<ContactStatus | "sending" | null>(null);
  const status = own ?? returned;

  const words: Record<ContactStatus, string> = {
    sent: t.contactSent,
    invalid: t.contactInvalid,
    failed: t.contactFailed,
    unavailable: t.contactUnavailable,
  };
  const settled = status === null || status === "sending" ? null : status;

  return (
    <form
      id="form"
      className="contact-form"
      method="post"
      action="/api/contact"
      aria-label={t.contactFormLabel}
      onSubmit={(event) => {
        event.preventDefault();
        setStatus("sending");
        const body = new URLSearchParams({ lang, name, email, topic, message, website: "" });
        fetch("/api/contact", {
          method: "POST",
          headers: { accept: "application/json" },
          body,
        })
          .then(async (response) => {
            const data = (await response.json()) as { status?: ContactStatus };
            const next = data.status ?? "failed";
            setStatus(next);
            if (next === "sent") setMessage("");
          })
          .catch(() => setStatus("failed"));
      }}
    >
      <input type="hidden" name="lang" value={lang} />
      <div className="contact-row">
        <label htmlFor={`${id}-name`}>
          {t.contactName}
          <input
            id={`${id}-name`}
            name="name"
            autoComplete="name"
            maxLength={120}
            value={name}
            onChange={(event) => setName(valueOf(event))}
          />
        </label>
        <label htmlFor={`${id}-email`}>
          {t.contactEmail}
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(valueOf(event))}
          />
        </label>
      </div>
      <fieldset className="contact-topics">
        <legend>{t.contactTopic}</legend>
        {t.contactTopicOptions.map((option) => (
          <label key={option} className="contact-chip">
            <input
              type="radio"
              name="topic"
              value={option}
              checked={topic === option}
              onChange={() => setTopic(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      <label htmlFor={`${id}-message`}>
        {t.contactMessage}
        <textarea
          id={`${id}-message`}
          name="message"
          required
          rows={7}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(event) => setMessage(valueOf(event))}
        />
        <span className="contact-count" aria-hidden="true">
          {message.length} / {MESSAGE_MAX}
        </span>
      </label>
      <label className="contact-trap" aria-hidden="true">
        {t.contactTrap}
        <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
      <div className="contact-actions">
        <button className="offer-send" type="submit" disabled={status === "sending"}>
          {status === "sending" ? t.contactSending : t.contactSend}{" "}
          <span aria-hidden="true">→</span>
        </button>
        <p className="contact-privacy">{t.contactPrivacyNote}</p>
      </div>
      <div className="contact-status" role="status" aria-live="polite">
        {settled === null ? null : <p className={`contact-status-${settled}`}>{words[settled]}</p>}
      </div>
    </form>
  );
}
