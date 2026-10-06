import { checkEmail, createResendMailer, MailError } from "@name-atlas/accounts";
import type { Mailer, OutgoingMail, ResendConfig } from "@name-atlas/accounts";
import { isSameSiteRequest } from "./account-routes.js";
import { CONTACT_MESSAGE_MAX } from "./contact.js";
import { UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { contactPath } from "./site-links.js";

/**
 * `POST /api/contact` — the contact page's form. It sends the message to
 * `CONTACT_INBOX` through Resend, with the writer's address as the reply-to,
 * and stores nothing. The page answers each outcome with a status word:
 * `sent`, `invalid`, `failed` or `unavailable` (no mail configuration).
 *
 * A form posted without script gets a 303 back to the contact page with
 * `?status=`; the form's script asks for JSON and gets `{ status }`.
 */

/**
 * The inbox the form delivers to, given by the project owner on 2026-09-30.
 * Server-side only: since 2026-10-06 the site shows no address anywhere, at
 * the owner's request, so nothing a browser receives may import this module
 * for it (`contact-form.tsx` imports only a type from here).
 */
export const CONTACT_INBOX = "cihypatryk@gmail.com";

export type ContactStatus = "sent" | "invalid" | "failed" | "unavailable";

const NAME_MAX = 120;
const MAX_BODY_BYTES = 32_768;

/**
 * The mail configuration: `RESEND_API_KEY` and a sender on a domain verified
 * with Resend, `CONTACT_MAIL_FROM` or else the accounts' `ACCOUNTS_MAIL_FROM`.
 * Either missing: null, and the form says sending is not switched on.
 */
export function contactMailConfig(env: NodeJS.ProcessEnv = process.env): ResendConfig | null {
  const apiKey = env["RESEND_API_KEY"]?.trim();
  const from = (env["CONTACT_MAIL_FROM"] ?? env["ACCOUNTS_MAIL_FROM"])?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export function contactMailer(env: NodeJS.ProcessEnv = process.env): Mailer | null {
  const config = contactMailConfig(env);
  return config === null ? null : createResendMailer(config);
}

export interface ContactMessage {
  readonly lang: Lang;
  readonly name: string;
  readonly email: string;
  readonly topic: string;
  readonly message: string;
}

/** No control characters but tab and newlines, and Windows line ends made plain. */
function clean(value: string): string {
  const kept = [...value.replaceAll("\r\n", "\n")].filter((char) => {
    const code = char.codePointAt(0) ?? 0;
    return char === "\n" || char === "\t" || (code >= 0x20 && code !== 0x7f);
  });
  return kept.join("").trim();
}

function oneLine(value: string): string {
  return clean(value).replace(/\s+/gu, " ");
}

/** The message as the form sent it, or null when it is not one the form can send. */
export function readContactForm(form: FormData): ContactMessage | null {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const lang: Lang = text("lang") === "en" ? "en" : "pl";
  const email = checkEmail(text("email"));
  const name = oneLine(text("name"));
  const message = clean(text("message"));
  const topics: readonly string[] = UI[lang].contactTopicOptions;
  const topic = topics.includes(text("topic")) ? text("topic") : topics[topics.length - 1]!;
  if (!email.ok || name.length > NAME_MAX) return null;
  if (message.length === 0 || message.length > CONTACT_MESSAGE_MAX) return null;
  return { lang, name, email: email.email, topic, message };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** The mail the owner receives. A reply goes to the writer. */
export function contactMail(input: ContactMessage): OutgoingMail {
  const who = input.name === "" ? input.email : `${input.name} <${input.email}>`;
  const lines = [
    `Od: ${who}`,
    `Temat: ${input.topic}`,
    `Język strony: ${input.lang}`,
    "",
    input.message,
  ];
  return {
    to: CONTACT_INBOX,
    replyTo: input.email,
    subject: `Name Atlas, kontakt: ${input.topic}`,
    text: lines.join("\n"),
    html: `<div style="white-space:pre-wrap">${escapeHtml(lines.join("\n"))}</div>`,
  };
}

export interface ContactRouteDeps {
  readonly mailer: Mailer | null;
  readonly log: { warn(event: string, fields: Record<string, unknown>): void };
}

function answer(request: Request, lang: Lang, status: ContactStatus): Response {
  const headers = { "cache-control": "no-store" };
  if ((request.headers.get("accept") ?? "").includes("application/json")) {
    return Response.json({ status }, { status: status === "sent" ? 200 : 400, headers });
  }
  return new Response(null, {
    status: 303,
    headers: { ...headers, location: `${contactPath(lang)}?status=${status}#form` },
  });
}

export async function handleContactPost(
  request: Request,
  deps: ContactRouteDeps,
): Promise<Response> {
  if (!isSameSiteRequest(request)) return new Response("Forbidden", { status: 403 });
  const length = Number(request.headers.get("content-length") ?? "0");
  const type = request.headers.get("content-type") ?? "";
  if (
    (Number.isFinite(length) && length > MAX_BODY_BYTES) ||
    !/^(application\/x-www-form-urlencoded|multipart\/form-data)/iu.test(type)
  ) {
    return new Response("Bad request", { status: 400 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const lang: Lang = form.get("lang") === "en" ? "en" : "pl";
  // The hidden field a person never sees: a filled one is a script, told it was sent.
  const trap = form.get("website");
  if (typeof trap === "string" && trap !== "") return answer(request, lang, "sent");
  const message = readContactForm(form);
  if (message === null) return answer(request, lang, "invalid");
  if (deps.mailer === null) return answer(request, lang, "unavailable");
  try {
    await deps.mailer.send(contactMail(message));
  } catch (error) {
    // The status and nothing else: not the address, not the message.
    deps.log.warn("contact_mail_failed", {
      status: error instanceof MailError ? error.status : null,
    });
    return answer(request, lang, "failed");
  }
  return answer(request, lang, "sent");
}
