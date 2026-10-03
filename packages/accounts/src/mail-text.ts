/**
 * The two messages accounts send (ADR-0027), in Polish and English.
 *
 * Plain on purpose: a sentence, one link, and what to do if the reader did not
 * ask. The link carries a token that is spent by the form on the page it opens
 * (the password, and the terms), not by opening it (ADR-0027 §2.6), because a
 * mail scanner may open every link in a message.
 */

export type Language = "pl" | "en";

export interface OutgoingMail {
  readonly to: string;
  readonly subject: string;
  /** The plain-text part. */
  readonly text: string;
  readonly html: string;
  /** Where a reply goes, when not to the sender (the contact form: the writer's own address). */
  readonly replyTo?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface Words {
  readonly subject: string;
  readonly greeting: string;
  readonly lines: readonly string[];
  readonly linkLead: string;
  readonly ifNotYou: string;
  readonly signature: string;
}

function compose(to: string, link: string, words: Words): OutgoingMail {
  const text = [
    words.greeting,
    "",
    ...words.lines,
    "",
    `${words.linkLead} ${link}`,
    "",
    words.ifNotYou,
    "",
    words.signature,
  ].join("\n");
  const html = [
    `<p>${escapeHtml(words.greeting)}</p>`,
    ...words.lines.map((line) => `<p>${escapeHtml(line)}</p>`),
    `<p>${escapeHtml(words.linkLead)} <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
    `<p>${escapeHtml(words.ifNotYou)}</p>`,
    `<p>${escapeHtml(words.signature)}</p>`,
  ].join("\n");
  return { to, subject: words.subject, text, html };
}

const VERIFY: Record<Language, Words> = {
  pl: {
    subject: "Potwierdź adres e-mail w Name Atlas",
    greeting: "Dzień dobry,",
    lines: [
      "Ktoś, najpewniej Ty, podał ten adres e-mail, zakładając konto w Name Atlas.",
      "Otwórz link, wybierz hasło i zaakceptuj regulamin na stronie, która się pojawi. Dopiero wtedy konto powstanie. Link działa 24 godziny.",
    ],
    linkLead: "Link:",
    ifNotYou: "Jeśli to nie Ty, zignoruj tę wiadomość: bez tego konto nie powstanie.",
    signature: "Name Atlas",
  },
  en: {
    subject: "Confirm your email address for Name Atlas",
    greeting: "Hello,",
    lines: [
      "Someone, most likely you, gave this email address to create a Name Atlas account.",
      "Open the link, choose a password and accept the terms on the page that appears. Only then is the account created. The link works for 24 hours.",
    ],
    linkLead: "Link:",
    ifNotYou: "If this was not you, ignore this message: without that, no account is created.",
    signature: "Name Atlas",
  },
};

const RESET: Record<Language, Words> = {
  pl: {
    subject: "Zmiana hasła w Name Atlas",
    greeting: "Dzień dobry,",
    lines: [
      "Dostaliśmy prośbę o zmianę hasła do konta w Name Atlas, założonego na ten adres e-mail.",
      "Otwórz link i ustaw nowe hasło na stronie, która się pojawi. Link działa godzinę i można go użyć jeden raz.",
    ],
    linkLead: "Link:",
    ifNotYou:
      "Jeśli to nie Ty prosiłeś o zmianę, zignoruj tę wiadomość: hasło pozostanie bez zmian.",
    signature: "Name Atlas",
  },
  en: {
    subject: "Reset your Name Atlas password",
    greeting: "Hello,",
    lines: [
      "We received a request to change the password of the Name Atlas account created with this email address.",
      "Open the link and set a new password on the page that appears. The link works for one hour and can be used once.",
    ],
    linkLead: "Link:",
    ifNotYou: "If you did not ask for this, ignore this message: your password stays as it is.",
    signature: "Name Atlas",
  },
};

export function verificationMail(to: string, language: Language, link: string): OutgoingMail {
  return compose(to, link, VERIFY[language]);
}

export function resetMail(to: string, language: Language, link: string): OutgoingMail {
  return compose(to, link, RESET[language]);
}
