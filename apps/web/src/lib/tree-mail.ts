import type { OutgoingMail } from "@name-atlas/accounts";
import type { Lang } from "./messages.js";

/**
 * The one mail the tree sends (TASK-094, ADR-0029 §2.6.20): an invitation,
 * at the owner's request, naming the owner and that a private tree exists.
 * It carries no relationship, no date, no place and no name of the invited
 * person; the link's token is spent by the answer on the page it opens, not
 * by opening it, because a mail scanner may open every link. There is no
 * reminder.
 */

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
  readonly invites: (inviter: string) => string;
  readonly what: string;
  readonly linkLead: string;
  readonly expiry: string;
  readonly ifNotYou: string;
  readonly signature: string;
}

const WORDS: Readonly<Record<Lang, Words>> = {
  pl: {
    subject: "Zaproszenie do prywatnego drzewa rodzinnego w Name Atlas",
    greeting: "Dzień dobry,",
    invites: (inviter) =>
      `${inviter} prowadzi w Name Atlas prywatne drzewo rodzinne i zaprasza Cię, żebyś potwierdził lub potwierdziła, że jesteś jedną z osób w tym drzewie.`,
    what: "Po zalogowaniu zobaczysz tylko to, co ta osoba wpisała o Tobie, i zdecydujesz: to ja, to nie ja albo nie chcę kontaktu. Nic więcej z drzewa nie zobaczysz i nikt nie zobaczy nic więcej o Tobie.",
    linkLead: "Link:",
    expiry: "Link działa 14 dni i można go użyć jeden raz. Nie wyślemy przypomnienia.",
    ifNotYou:
      "Jeśli nie chcesz odpowiadać, zignoruj tę wiadomość: nic się nie stanie i nikt nie dowie się, czy ją otworzyłeś.",
    signature: "Name Atlas",
  },
  en: {
    subject: "An invitation to a private family tree on Name Atlas",
    greeting: "Hello,",
    invites: (inviter) =>
      `${inviter} keeps a private family tree on Name Atlas and invites you to confirm that you are one of the people in it.`,
    what: "After signing in you will see only what that person wrote about you, and you decide: it is me, it is not me, or I want no contact. You see nothing else of the tree, and nobody sees anything more about you.",
    linkLead: "Link:",
    expiry: "The link works for 14 days and can be used once. We will not send a reminder.",
    ifNotYou:
      "If you do not want to answer, ignore this message: nothing happens, and nobody learns whether you opened it.",
    signature: "Name Atlas",
  },
};

/** The invitation, to the address the owner typed, naming the owner by the address of their account. */
export function invitationMail(
  to: string,
  lang: Lang,
  link: string,
  inviter: string,
): OutgoingMail {
  const w = WORDS[lang];
  const lines = [w.invites(inviter), w.what];
  const text = [
    w.greeting,
    "",
    ...lines,
    "",
    `${w.linkLead} ${link}`,
    "",
    w.expiry,
    "",
    w.ifNotYou,
    "",
    w.signature,
  ].join("\n");
  const html = [
    `<p>${escapeHtml(w.greeting)}</p>`,
    ...lines.map((line) => `<p>${escapeHtml(line)}</p>`),
    `<p>${escapeHtml(w.linkLead)} <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
    `<p>${escapeHtml(w.expiry)}</p>`,
    `<p>${escapeHtml(w.ifNotYou)}</p>`,
    `<p>${escapeHtml(w.signature)}</p>`,
  ].join("\n");
  return { to, subject: w.subject, text, html };
}
