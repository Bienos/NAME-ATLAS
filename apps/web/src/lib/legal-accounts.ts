import type { LegalDocument, LegalKind, LegalSection } from "./legal-text.js";
import type { Lang } from "./messages.js";

/**
 * What the privacy notice and the terms say once accounts exist (TASK-062).
 *
 * They are shown only when accounts are on (`accounts-config.ts`), so the notice
 * never describes a cookie, a stored address or a mail provider the site does
 * not have. The base text in `legal-text.ts` is left as it is; this module
 * changes it in four places for the notice and adds one section to the terms,
 * and it **throws** when a heading it expects is not there, so a renamed
 * section fails the build instead of publishing a notice that no longer
 * matches.
 *
 * Every statement rests on the code (ADR-0027, `packages/accounts`) or on the
 * vendor's own pages, as in the base text:
 *
 * - Resend: certified under the EU–U.S. Data Privacy Framework and its UK
 *   extension; its DPA carries standard contractual clauses
 *   (`resend.com/changelog/data-privacy-framework-certification`,
 *   `resend.com/legal/dpa`, seen 2026-10-01 through a web search; the DPA was
 *   not read in full).
 * - Retention of a pending address: `purgeExpired` deletes one created more
 *   than 7 days ago whose link has lapsed, and runs once a day, so the address
 *   is gone within 8 days of being given.
 *
 * What it does **not** say: how long a deleted account stays in a backup. The
 * VM's data-load scripts dump the whole database, and TASK-063 must exclude
 * schema `accounts` from them before accounts go on; TASK-049's backup states
 * its own retention when it exists.
 */

interface PrivacyWords {
  readonly whatWeDoNot: string;
  readonly dataHeading: string;
  readonly processorsHeading: string;
  readonly rightsHeading: string;
  readonly noAccountsParagraph: string;
  readonly sections: readonly LegalSection[];
  readonly oracleItem: string;
  readonly resendItem: string;
  readonly rightsParagraph: string;
}

const PRIVACY: Record<Lang, PrivacyWords> = {
  pl: {
    whatWeDoNot: "Czego nie robimy",
    dataHeading: "Jakie dane przetwarzamy",
    processorsHeading: "Komu powierzamy dane",
    rightsHeading: "Twoje prawa",
    noAccountsParagraph:
      "Name Atlas nie ma reklam. Konto jest dobrowolne: żeby czytać serwis, nie trzeba go zakładać. Statystyki odwiedzin zbiera Vercel Web Analytics bez plików cookie i bez nazwiska w adresie (niżej). Formularze na stronie oferty niczego nie wysyłają do serwisu: przygotowują wiadomość e-mail w Twoim programie pocztowym, a wysyłasz ją sam. Bez konta serwis nie zapisuje w przeglądarce plików cookie ani podobnych danych; po zalogowaniu zapisuje jeden plik cookie, który utrzymuje Cię zalogowanym (niżej). Nie profilujemy nikogo i nie podejmujemy zautomatyzowanych decyzji.",
    sections: [
      {
        heading: "Konto: jakie dane",
        paragraphs: [
          "Konto zakładasz, podając adres e-mail. Wysyłamy na niego link ważny 24 godziny; dopiero po jego otwarciu ustawiasz hasło i akceptujesz regulamin, więc nikt nie założy konta na cudzy adres. Przechowujemy w bazie danych:",
        ],
        items: [
          "adres e-mail, wybrany język, czas założenia konta i ostatniego logowania;",
          "wersję regulaminu, którą zaakceptowałeś, i czas akceptacji;",
          "hasło: nie przechowujemy go, tylko jego skrót (scrypt), z którego nie da się go odtworzyć;",
          "skróty (SHA-256) jednorazowych linków z wiadomości i identyfikatora sesji, nie same linki i identyfikatory;",
          "po nieudanym logowaniu: skrót adresu i czas próby, żeby ograniczyć zgadywanie hasła.",
        ],
      },
      {
        heading: "Konto: po co, jak długo, komu",
        paragraphs: [
          "Dane konta służą do prowadzenia konta, o które prosisz. Podstawą jest wykonanie umowy na Twoje żądanie (art. 6 ust. 1 lit. b RODO). Skróty nieudanych logowań chronią konto przed zgadywaniem hasła, na podstawie naszego prawnie uzasadnionego interesu (lit. f).",
          "Po zalogowaniu serwis zapisuje w przeglądarce jeden plik cookie z identyfikatorem sesji (HttpOnly, Secure, SameSite=Lax). Jest niezbędny do działania konta i służy tylko do tego. Znika po wylogowaniu. Sesja na serwerze trwa 30 dni; korzystanie z niej w drugiej połowie tego czasu odnawia ją na kolejne 30, a zmiana hasła kończy wszystkie sesje.",
          "Adres, który nie dokończył zakładania konta, kasujemy w ciągu 8 dni od podania (usuwanie działa raz dziennie). Konto trwa, dopóki go nie usuniesz. Na stronie konta usuwasz je sam, podając hasło: konto, sesje i linki znikają z bazy od razu. Skróty nieudanych logowań kasujemy po godzinie.",
          "Wiadomości z linkiem wysyła w naszym imieniu Resend, Inc. (USA), który dostaje Twój adres i treść wiadomości. Nie przekazujemy mu nic poza tym.",
        ],
      },
    ],
    oracleItem:
      "Oracle — serwer bazy danych we Frankfurcie. Otrzymuje zapytanie o nazwisko, ale nie adres IP odwiedzającego; trzyma też dane konta (wyżej).",
    resendItem:
      "Resend, Inc. (USA) — wysyłanie wiadomości z linkiem do konta. Przekazanie do USA opiera się na certyfikacji Resend w EU-U.S. Data Privacy Framework i na standardowych klauzulach umownych, jak Resend deklaruje.",
    rightsParagraph:
      "Konto usuniesz sam na jego stronie; z pozostałych praw skorzystasz, pisząc na adres podany wyżej.",
  },
  en: {
    whatWeDoNot: "What we do not do",
    dataHeading: "What data we process",
    processorsHeading: "Who processes data for us",
    rightsHeading: "Your rights",
    noAccountsParagraph:
      "Name Atlas has no advertising. An account is optional: you do not need one to read the site. Visit statistics are collected by Vercel Web Analytics without cookies and without the surname in the address (below). The forms on the offer page send nothing to the site: they prepare an email in your own mail program, and you send it yourself. Without an account the site stores no cookies or similar data in your browser; once you sign in it stores one cookie that keeps you signed in (below). We do not profile anyone and make no automated decisions.",
    sections: [
      {
        heading: "The account: what data",
        paragraphs: [
          "You create an account by giving an email address. We send a link to it, valid for 24 hours; only after you open it do you set the password and accept the terms, so nobody can open an account on someone else's address. We keep in the database:",
        ],
        items: [
          "the email address, the language chosen, and the times the account was created and last signed in;",
          "the version of the terms you accepted, and when;",
          "the password: we do not keep it, only a hash of it (scrypt) from which it cannot be recovered;",
          "hashes (SHA-256) of the one-time links in the emails and of the session identifier, not the links or identifiers themselves;",
          "after a failed sign-in: a hash of the address and the time of the attempt, to limit password guessing.",
        ],
      },
      {
        heading: "The account: why, how long, who",
        paragraphs: [
          "The account data is used to run the account you ask for. The basis is performing a contract at your request (art. 6(1)(b) GDPR). The hashes of failed sign-ins protect the account from password guessing, on the basis of our legitimate interest (point (f)).",
          "Once you sign in, the site stores one cookie in your browser holding a session identifier (HttpOnly, Secure, SameSite=Lax). It is necessary for the account to work and is used for nothing else. It goes when you sign out. The session on the server lasts 30 days; using it in the second half of that time renews it for another 30, and changing the password ends every session.",
          "An address that did not finish opening an account is deleted within 8 days of being given (the deletion runs once a day). The account lasts until you delete it. You delete it yourself on the account page, with your password: the account, its sessions and links leave the database at once. The hashes of failed sign-ins are deleted after an hour.",
          "The emails with the link are sent on our behalf by Resend, Inc. (USA), which receives your address and the text of the message. We give it nothing else.",
        ],
      },
    ],
    oracleItem:
      "Oracle — the database server in Frankfurt. It receives the surname query but not the visitor's IP address; it also holds the account data (above).",
    resendItem:
      "Resend, Inc. (USA) — sending the account's link emails. The transfer to the USA rests on Resend's certification under the EU-U.S. Data Privacy Framework and on standard contractual clauses, as Resend states.",
    rightsParagraph:
      "You delete the account yourself on its page; for your other rights, write to the address above.",
  },
};

interface TermsWords {
  readonly afterHeading: string;
  readonly section: LegalSection;
}

const TERMS: Record<Lang, TermsWords> = {
  pl: {
    afterHeading: "Usługa",
    section: {
      heading: "Konto",
      paragraphs: [
        "Konto jest bezpłatne i dobrowolne. Zakładając je, akceptujesz ten regulamin; zapisujemy, którą jego wersję i kiedy zaakceptowałeś.",
        "Konto jest dla jednej osoby. Odpowiadasz za swoje hasło: nie udostępniaj go. Jeśli podejrzewasz, że ktoś je zna, ustaw nowe; kończy to wszystkie sesje.",
        "Konto możesz usunąć w każdej chwili na jego stronie. Możemy zamknąć konto używane do nadużyć, na przykład do zgadywania cudzych haseł lub masowego pobierania danych; napiszemy o tym na adres konta.",
        "Konto nie zmienia tego, co serwis pokazuje o nazwiskach: o danych i ich niepewności mówi sekcja wyżej.",
      ],
    },
  },
  en: {
    afterHeading: "The service",
    section: {
      heading: "The account",
      paragraphs: [
        "The account is free and optional. By opening one you accept these terms; we record which version and when.",
        "An account is for one person. You are responsible for your password: do not share it. If you suspect someone knows it, set a new one; that ends every session.",
        "You can delete the account at any time on its page. We may close an account used for abuse, for example to guess other people's passwords or to download data in bulk; we will write to the account's address.",
        "An account does not change what the site shows about surnames: the section above says what the data is and how uncertain.",
      ],
    },
  },
};

function mustFind(sections: readonly LegalSection[], heading: string): void {
  if (!sections.some((section) => section.heading === heading)) {
    throw new Error(`legal-accounts: the base text has no section "${heading}"`);
  }
}

function privacyWithAccounts(lang: Lang, doc: LegalDocument): LegalDocument {
  const words = PRIVACY[lang];
  for (const heading of [
    words.whatWeDoNot,
    words.dataHeading,
    words.processorsHeading,
    words.rightsHeading,
  ]) {
    mustFind(doc.sections, heading);
  }
  const sections = doc.sections.flatMap((section): readonly LegalSection[] => {
    switch (section.heading) {
      case words.whatWeDoNot:
        return [{ ...section, paragraphs: [words.noAccountsParagraph] }];
      case words.dataHeading:
        return [section, ...words.sections];
      case words.processorsHeading: {
        const items = (section.items ?? []).map((item) =>
          item.startsWith("Oracle") ? words.oracleItem : item,
        );
        if (!items.includes(words.oracleItem)) {
          throw new Error("legal-accounts: the base text has no Oracle item");
        }
        return [{ ...section, items: [...items, words.resendItem] }];
      }
      case words.rightsHeading:
        return [{ ...section, paragraphs: [...section.paragraphs, words.rightsParagraph] }];
      default:
        return [section];
    }
  });
  return { ...doc, sections };
}

function termsWithAccounts(lang: Lang, doc: LegalDocument): LegalDocument {
  const words = TERMS[lang];
  mustFind(doc.sections, words.afterHeading);
  const sections = doc.sections.flatMap((section): readonly LegalSection[] =>
    section.heading === words.afterHeading ? [section, words.section] : [section],
  );
  return { ...doc, sections };
}

/** The base document with the account's statements in it. */
export function accountsVariant(kind: LegalKind, lang: Lang, doc: LegalDocument): LegalDocument {
  return kind === "privacy" ? privacyWithAccounts(lang, doc) : termsWithAccounts(lang, doc);
}
