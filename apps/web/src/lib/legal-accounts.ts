import type { LegalDocument, LegalKind, LegalSection } from "./legal-text.js";
import type { Lang } from "./messages.js";

/**
 * What the privacy notice and the terms say once accounts exist (TASK-062).
 *
 * They are shown only when accounts are on (`accounts-config.ts`), so the notice
 * never describes a cookie, a stored address or a mail provider the site does
 * not have. The base text in `legal-text.ts` is left as it is; this module
 * changes it in five places for the notice and adds one section to the terms,
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
  readonly requiredHeading: string;
  readonly noAccountsParagraph: string;
  readonly sections: readonly LegalSection[];
  readonly oracleItem: string;
  readonly resendItem: string;
  readonly rightsParagraph: string;
  readonly requiredParagraph: string;
}

const PRIVACY: Record<Lang, PrivacyWords> = {
  pl: {
    whatWeDoNot: "Czego nie robimy",
    dataHeading: "Jakie dane przetwarzamy",
    processorsHeading: "Komu powierzamy dane",
    rightsHeading: "Twoje prawa",
    requiredHeading: "Czy musisz podać dane",
    noAccountsParagraph:
      "Name Atlas nie ma reklam. Konto jest dobrowolne: żeby czytać serwis, nie trzeba go zakładać. Statystyki odwiedzin zbierają, bez nazwiska w adresie, Vercel Web Analytics (bez plików cookie) i Google Analytics (niżej). Szybkość wczytywania stron mierzy Vercel Speed Insights, również bez nazwiska w adresie i bez plików cookie. Formularze na stronie oferty niczego nie wysyłają do serwisu: przygotowują wiadomość e-mail w Twoim programie pocztowym, a wysyłasz ją sam. Bez konta i bez Twojej zgody na Google Analytics serwis nie zapisuje w przeglądarce plików cookie (zapamiętuje tylko Twój wybór w tej sprawie); po zalogowaniu zapisuje jeden plik cookie, który utrzymuje Cię zalogowanym (niżej). Nie profilujemy nikogo i nie podejmujemy zautomatyzowanych decyzji.",
    sections: [
      {
        heading: "Konto: jakie dane",
        paragraphs: [
          "Konto zakładasz, podając adres e-mail. Wysyłamy na niego link ważny 24 godziny; dopiero po jego otwarciu ustawiasz hasło i akceptujesz regulamin, więc nikt nie założy konta na cudzy adres. Przechowujemy w bazie danych:",
        ],
        items: [
          "adres e-mail, wybrany język, czas założenia konta, potwierdzenia adresu, ostatniej zmiany konta i ostatniego logowania;",
          "wersję regulaminu, którą zaakceptowałeś, i czas akceptacji;",
          "hasło: nie przechowujemy go, tylko jego skrót (scrypt), z którego nie da się go odtworzyć;",
          "skróty (SHA-256) jednorazowych linków z wiadomości i identyfikatora sesji, nie same linki i identyfikatory; przy linku: do czego służy (potwierdzenie adresu, nowe hasło, akceptacja regulaminu), kiedy powstał, kiedy wygasa i kiedy go użyto; przy sesji: kiedy powstała, kiedy ostatnio jej użyto i kiedy wygasa;",
          "po nieudanym logowaniu: skrót adresu i czas próby, żeby ograniczyć zgadywanie hasła.",
        ],
      },
      {
        heading: "Konto: po co, jak długo, komu",
        paragraphs: [
          "Dane konta służą do prowadzenia konta, o które prosisz. Podstawą jest wykonanie umowy na Twoje żądanie (art. 6 ust. 1 lit. b RODO). Skróty nieudanych logowań chronią konto przed zgadywaniem hasła, na podstawie naszego prawnie uzasadnionego interesu (lit. f).",
          "Po zalogowaniu serwis zapisuje w przeglądarce jeden plik cookie z identyfikatorem sesji, __Host-na_session (HttpOnly, Secure, SameSite=Lax). Jest niezbędny do działania konta i służy tylko do tego. Przeglądarka może go trzymać do 400 dni, ale działa tylko, dopóki trwa sesja na serwerze; po wylogowaniu znika. Sesja na serwerze trwa 30 dni; korzystanie z niej w drugiej połowie tego czasu odnawia ją na kolejne 30, a ustawienie nowego hasła kończy wszystkie sesje.",
          "Adres, który nie dokończył zakładania konta, kasujemy w ciągu 8 dni od podania (usuwanie działa raz dziennie). Konto trwa, dopóki go nie usuniesz. Na stronie konta usuwasz je sam, podając hasło: konto, sesje i linki znikają z bazy od razu. Wygasłe sesje kasujemy raz dziennie, a linki z wiadomości 7 dni po wygaśnięciu. Skróty nieudanych logowań po godzinie przestają się liczyć i kasujemy je najpóźniej w ciągu doby; udane logowanie kasuje je od razu.",
          "Wiadomości z linkiem do założenia konta i do ustawienia nowego hasła wysyła w naszym imieniu Resend, Inc. (USA), który dostaje Twój adres i treść wiadomości. Nie przekazujemy mu nic poza tym.",
          "Dzienniki serwisu zapisują identyfikator konta (przy założeniu i usunięciu konta), nigdy adres e-mail ani treść. Przechowuje je Vercel, jak dziennik żądań (wyżej).",
        ],
      },
    ],
    oracleItem:
      "Oracle — serwer bazy danych we Frankfurcie. Otrzymuje zapytanie o nazwisko, ale nie adres IP odwiedzającego; trzyma też dane konta (wyżej).",
    resendItem:
      "Resend, Inc. (USA) — wysyłanie wiadomości z linkiem do założenia konta i do ustawienia nowego hasła oraz dostarczanie wiadomości z formularza kontaktowego na naszą skrzynkę. Przekazanie do USA opiera się na certyfikacji Resend w EU-U.S. Data Privacy Framework i na standardowych klauzulach umownych, jak Resend deklaruje.",
    rightsParagraph:
      "Konto usuniesz sam na jego stronie; z pozostałych praw skorzystasz, pisząc na adres podany wyżej.",
    requiredParagraph:
      "Konto jest dobrowolne. Żeby je założyć, musisz podać adres e-mail i ustawić hasło (przy logowaniu przez Google hasło nie jest potrzebne); bez nich konto nie może działać.",
  },
  en: {
    whatWeDoNot: "What we do not do",
    dataHeading: "What data we process",
    processorsHeading: "Who processes data for us",
    rightsHeading: "Your rights",
    requiredHeading: "Whether you must give data",
    noAccountsParagraph:
      "Name Atlas has no advertising. An account is optional: you do not need one to read the site. Visit statistics are collected, without the surname in the address, by Vercel Web Analytics (without cookies) and Google Analytics (below). Vercel Speed Insights measures how fast pages load, also without the surname in the address and without cookies. The forms on the offer page send nothing to the site: they prepare an email in your own mail program, and you send it yourself. Without an account and without your consent to Google Analytics the site stores no cookies in your browser (it only remembers that choice); once you sign in it stores one cookie that keeps you signed in (below). We do not profile anyone and make no automated decisions.",
    sections: [
      {
        heading: "The account: what data",
        paragraphs: [
          "You create an account by giving an email address. We send a link to it, valid for 24 hours; only after you open it do you set the password and accept the terms, so nobody can open an account on someone else's address. We keep in the database:",
        ],
        items: [
          "the email address, the language chosen, and the times the account was created, its address confirmed, last changed and last signed in;",
          "the version of the terms you accepted, and when;",
          "the password: we do not keep it, only a hash of it (scrypt) from which it cannot be recovered;",
          "hashes (SHA-256) of the one-time links in the emails and of the session identifier, not the links or identifiers themselves; for a link: what it is for (confirming the address, a new password, accepting the terms), when it was made, when it expires and when it was used; for a session: when it began, when it was last used and when it expires;",
          "after a failed sign-in: a hash of the address and the time of the attempt, to limit password guessing.",
        ],
      },
      {
        heading: "The account: why, how long, who",
        paragraphs: [
          "The account data is used to run the account you ask for. The basis is performing a contract at your request (art. 6(1)(b) GDPR). The hashes of failed sign-ins protect the account from password guessing, on the basis of our legitimate interest (point (f)).",
          "Once you sign in, the site stores one cookie in your browser holding a session identifier, __Host-na_session (HttpOnly, Secure, SameSite=Lax). It is necessary for the account to work and is used for nothing else. The browser may keep it for up to 400 days, but it works only while the session on the server lasts; it goes when you sign out. The session on the server lasts 30 days; using it in the second half of that time renews it for another 30, and setting a new password ends every session.",
          "An address that did not finish opening an account is deleted within 8 days of being given (the deletion runs once a day). The account lasts until you delete it. You delete it yourself on the account page, with your password: the account, its sessions and links leave the database at once. Expired sessions are deleted once a day, and the links in the emails 7 days after they expire. The hashes of failed sign-ins stop counting after an hour and are deleted within a day at the latest; a successful sign-in deletes them at once.",
          "The emails with the links to open the account and to set a new password are sent on our behalf by Resend, Inc. (USA), which receives your address and the text of the message. We give it nothing else.",
          "The site's logs record the account's identifier (when an account is created and deleted), never the email address or any content. Vercel keeps them, like the request log (above).",
        ],
      },
    ],
    oracleItem:
      "Oracle — the database server in Frankfurt. It receives the surname query but not the visitor's IP address; it also holds the account data (above).",
    resendItem:
      "Resend, Inc. (USA) — sending the emails with the links to open the account and to set a new password, and delivering the contact form's messages to our mailbox. The transfer to the USA rests on Resend's certification under the EU-U.S. Data Privacy Framework and on standard contractual clauses, as Resend states.",
    rightsParagraph:
      "You delete the account yourself on its page; for your other rights, write to the address above.",
    requiredParagraph:
      "An account is optional. To open one you must give an email address and set a password (signing in with Google needs no password); without them the account cannot work.",
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
    words.requiredHeading,
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
        // The base text names Resend for the contact form; the account's item replaces it.
        const withoutResend = items.filter((item) => !item.startsWith("Resend"));
        return [{ ...section, items: [...withoutResend, words.resendItem] }];
      }
      case words.rightsHeading:
        return [{ ...section, paragraphs: [...section.paragraphs, words.rightsParagraph] }];
      case words.requiredHeading:
        return [{ ...section, paragraphs: [...section.paragraphs, words.requiredParagraph] }];
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
