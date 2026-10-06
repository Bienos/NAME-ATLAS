import type { Lang } from "./messages.js";
import { contactPath } from "./site-links.js";

/**
 * What every way of writing to Name Atlas shares (TASK-047). Since 2026-10-06,
 * at the project owner's request, the site publishes no address and names no
 * person: the contact form is the one channel, and the "report a problem" link
 * and the offer's forms hand their message to it. The inbox the form delivers
 * to is server-side only, in `contact-routes.ts`.
 */

/** The longest message the contact form takes, in characters (form and route alike). */
export const CONTACT_MESSAGE_MAX = 5_000;

/** What a link may hand the contact form to start from. */
export interface ContactPrefill {
  /** One of `UI[lang].contactTopicOptions`; the form keeps its default otherwise. */
  readonly topic?: string;
  readonly message: string;
}

/**
 * The contact page with its form prefilled. The prefill rides in the address's
 * fragment, which the browser keeps to itself: nothing of it reaches the
 * server or its logs until the reader sends the message.
 */
export function contactFormHref(lang: Lang, prefill: ContactPrefill): string {
  const params = new URLSearchParams();
  if (prefill.topic !== undefined) params.set("topic", prefill.topic);
  params.set("message", prefill.message);
  return `${contactPath(lang)}#${params.toString()}`;
}

/** The prefill a fragment (`location.hash`, with or without `#`) carries, or null when it carries none. */
export function readContactPrefill(hash: string): ContactPrefill | null {
  const params = new URLSearchParams(hash.replace(/^#/u, ""));
  const message = params.get("message");
  if (message === null) return null;
  const topic = params.get("topic");
  return topic === null ? { message } : { topic, message };
}
