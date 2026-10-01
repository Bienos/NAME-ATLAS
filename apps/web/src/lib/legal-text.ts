import { CONTACT_EMAIL } from "./contact.js";
import { accountsVariant } from "./legal-accounts.js";
import type { Lang } from "./messages.js";

/**
 * The privacy notice and the terms of use (TASK-046), in both languages.
 *
 * Every statement about what is collected, logged or kept rests on the code or
 * on the vendor's own documentation, as read on 2026-09-30 (the sources are in
 * `docs/progress/2026-09-30-privacy-and-terms-pages.md`). If the site starts
 * doing something new with data — a form, analytics, a cookie — this text
 * changes in the same change, or it stops being true.
 *
 * The controller's name and place are the project owner's, given for
 * publication on 2026-09-30.
 */

export const CONTROLLER_NAME = "Patryk Cicbowski";
export const CONTROLLER_PLACE = "Iława";

/** The date each document was last changed, ISO. The privacy notice changed for the offer's forms (TASK-057). */
export const LEGAL_UPDATED: Readonly<Record<LegalKind, string>> = {
  privacy: "2026-10-01",
  terms: "2026-09-30",
};

/**
 * The date of the accounts variant of both documents (TASK-062), shown, and
 * recorded as the version of the terms a reader accepted, only when accounts
 * are on. The base text keeps `LEGAL_UPDATED`.
 */
export const ACCOUNTS_LEGAL_UPDATED = "2026-10-01";

export interface LegalSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly items?: readonly string[];
}

export interface LegalDocument {
  readonly title: string;
  readonly updatedLabel: string;
  readonly sections: readonly LegalSection[];
}

export type LegalKind = "privacy" | "terms";

const who = `${CONTROLLER_NAME}, ${CONTROLLER_PLACE}`;

const PRIVACY: Record<Lang, LegalDocument> = {
  pl: {
    title: "Polityka prywatności",
    updatedLabel: "Ostatnia zmiana",
    sections: [
      {
        heading: "Kto jest administratorem",
        paragraphs: [
          `Administratorem danych osobowych w serwisie Name Atlas jest ${who}. Kontakt: ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: "Czego nie robimy",
        paragraphs: [
          "Name Atlas nie ma kont ani reklam. Statystyki odwiedzin zbiera Vercel Web Analytics bez plików cookie i bez nazwiska w adresie (niżej). Formularze na stronie oferty niczego nie wysyłają do serwisu: przygotowują wiadomość e-mail w Twoim programie pocztowym, a wysyłasz ją sam. Serwis nie zapisuje w przeglądarce plików cookie ani podobnych danych. Nie profilujemy nikogo i nie podejmujemy zautomatyzowanych decyzji.",
        ],
      },
      {
        heading: "Jakie dane przetwarzamy",
        paragraphs: [
          "Przy każdym otwarciu strony serwer otrzymuje, jak w każdym serwisie internetowym:",
        ],
        items: [
          "adres IP urządzenia;",
          "adres otwieranej strony, a więc także nazwisko, które jest w adresie lub zostało wpisane w wyszukiwarkę;",
          "dane techniczne żądania: czas, rodzaj przeglądarki, kod odpowiedzi.",
        ],
      },
      {
        heading: "Po co i na jakiej podstawie",
        paragraphs: [
          "Te dane są potrzebne, żeby wyświetlić stronę, chronić serwis przed nadużyciami (limit zapytań z jednego adresu) i wykrywać błędy. Podstawą jest nasz prawnie uzasadniony interes w działaniu i bezpieczeństwie serwisu (art. 6 ust. 1 lit. f RODO).",
          "Jeśli napiszesz do nas e-mail, przetwarzamy Twój adres i treść wiadomości, żeby odpowiedzieć i załatwić sprawę, na tej samej podstawie.",
          "Statystyki odwiedzin (które strony są oglądane, ile razy i skąd) prowadzimy na tej samej podstawie. Zbiera je Vercel Web Analytics: bez plików cookie; odwiedzający są rozróżniani skrótem obliczonym z żądania, kasowanym po 24 godzinach. Dla każdej odsłony zapisuje czas, adres strony, stronę odsyłającą, kraj, region i miasto, system, przeglądarkę i typ urządzenia. Zanim adres trafi do statystyk, nasz kod zastępuje w nim nazwisko oznaczeniem [slug] i usuwa parametry zapytania, więc statystyki nie zawierają wyszukiwanego nazwiska.",
          "Jeśli zapiszesz się na listę oczekujących albo zapytasz o badanie genealogiczne, przetwarzamy Twój adres i to, co napiszesz, żeby odpowiedzieć i dać znać, gdy usługa ruszy. Podstawą jest działanie na Twoje żądanie przed zawarciem umowy (art. 6 ust. 1 lit. b RODO). Nie wysyłaj nam wyników testu DNA ani informacji o zdrowiu: to dane szczególnie chronione, a do pierwszej odpowiedzi nie są potrzebne.",
          "Zanim przekażemy Twoje dane genealogom, którzy prowadzą badanie, zapytamy Cię o zgodę i powiemy, kim są.",
        ],
      },
      {
        heading: "Jak długo",
        paragraphs: [
          "Do limitu zapytań adres IP jest trzymany tylko w pamięci serwera, na czas jednominutowego okna limitu, i nasz kod nigdzie go nie zapisuje. Własne dzienniki serwisu nie zawierają adresu IP ani wyszukiwanego nazwiska.",
          "Dostawca hostingu (Vercel) przechowuje dziennik żądań, w tym adres strony, od jednej godziny do jednego dnia, zależnie od planu usługi.",
          "Wiadomości e-mail przechowujemy tak długo, jak to potrzebne do załatwienia sprawy. Zapis na listę oczekujących trzymamy do startu usługi albo do Twojej prośby o wypisanie.",
          "Statystyki odwiedzin Vercel przechowuje przez miesiąc (okno raportowania naszego planu) i może dłużej.",
        ],
      },
      {
        heading: "Komu powierzamy dane",
        items: [
          "Vercel Inc. (USA) — hosting serwisu i statystyki odwiedzin (Vercel Web Analytics); strony są generowane we Frankfurcie. Przekazanie do USA opiera się na EU-U.S. Data Privacy Framework i standardowych klauzulach umownych.",
          "Oracle — serwer bazy danych we Frankfurcie. Otrzymuje zapytanie o nazwisko, ale nie adres IP odwiedzającego.",
          "Google — skrzynka pocztowa, na którą przychodzą wiadomości.",
        ],
        paragraphs: [],
      },
      {
        heading: "Twoje prawa",
        paragraphs: [
          "Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia i ograniczenia przetwarzania oraz prawo sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie. Napisz na adres podany wyżej. Sam adres IP zwykle nie pozwala nam ustalić, kim jesteś; wtedy możemy nie być w stanie wskazać Twoich danych (art. 11 RODO).",
          "Możesz wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa, uodo.gov.pl).",
        ],
      },
      {
        heading: "Dane pokazywane w serwisie",
        paragraphs: [
          "Liczby na stronach nazwisk pochodzą z publicznych zestawień rejestru PESEL i innych opublikowanych źródeł. To liczby zbiorcze, na przykład ile osób nosi dane nazwisko. Serwis nie pokazuje danych żadnej konkretnej osoby.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy notice",
    updatedLabel: "Last changed",
    sections: [
      {
        heading: "Who is responsible",
        paragraphs: [
          `The controller of personal data on Name Atlas is ${who}, Poland. Contact: ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: "What we do not do",
        paragraphs: [
          "Name Atlas has no accounts or advertising. Visit statistics are collected by Vercel Web Analytics without cookies and without the surname in the address (below). The forms on the offer page send nothing to the site: they prepare an email in your own mail program, and you send it yourself. The site stores no cookies or similar data in your browser. We do not profile anyone and make no automated decisions.",
        ],
      },
      {
        heading: "What data we process",
        paragraphs: ["Each time a page is opened, the server receives, as on any website:"],
        items: [
          "the device's IP address;",
          "the address of the page, and so any surname that is in the address or was typed into the search;",
          "technical details of the request: time, browser type, response code.",
        ],
      },
      {
        heading: "Why, and on what basis",
        paragraphs: [
          "This data is needed to show the page, to protect the site from abuse (a limit on requests from one address) and to find errors. The basis is our legitimate interest in running the site and keeping it secure (Article 6(1)(f) GDPR).",
          "If you email us, we process your address and your message to reply and deal with the matter, on the same basis.",
          "Visit statistics (which pages are viewed, how often and from where) rest on the same basis. Vercel Web Analytics collects them: no cookies; visitors are told apart by a hash computed from the request, discarded after 24 hours. For each page view it records the time, the page address, the referring page, the country, region and city, the operating system, the browser and the device type. Before the address reaches the statistics, our code replaces the surname in it with [slug] and removes the query parameters, so the statistics never contain the surname searched for.",
          "If you join the waiting list or ask about genealogy research, we process your address and what you write to reply and to tell you when the service starts. The basis is taking steps at your request before entering into a contract (Article 6(1)(b) GDPR). Do not send us DNA results or health information: they are specially protected data, and a first reply does not need them.",
          "Before we pass your details to the genealogists who carry out the research, we will ask for your consent and tell you who they are.",
        ],
      },
      {
        heading: "How long",
        paragraphs: [
          "For the request limit, the IP address is held in the server's memory only, for the limit's one-minute window, and our code never writes it anywhere. The site's own logs contain neither the IP address nor the surname searched for.",
          "The hosting provider (Vercel) keeps a request log, including the page address, for between one hour and one day, depending on the service plan.",
          "Emails are kept as long as needed to deal with the matter. A place on the waiting list is kept until the service starts or until you ask to be taken off.",
          "Vercel keeps the visit statistics for one month (our plan's reporting window), and may keep them longer.",
        ],
      },
      {
        heading: "Who processes data for us",
        items: [
          "Vercel Inc. (USA): hosting and visit statistics (Vercel Web Analytics); pages are generated in Frankfurt. Transfers to the USA rely on the EU-U.S. Data Privacy Framework and standard contractual clauses.",
          "Oracle: the database server, in Frankfurt. It receives the query for a surname, not the visitor's IP address.",
          "Google: the mailbox that receives email.",
        ],
        paragraphs: [],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You have the right to access your data, to have it corrected, erased or its processing restricted, and to object to processing based on legitimate interest. Write to the address above. An IP address alone usually does not tell us who you are; in that case we may be unable to identify your data (Article 11 GDPR).",
          "You may complain to the Polish supervisory authority, the President of the Personal Data Protection Office (ul. Stawki 2, 00-193 Warsaw, uodo.gov.pl), or to the authority where you live.",
        ],
      },
      {
        heading: "The data the site shows",
        paragraphs: [
          "The figures on surname pages come from public PESEL register summaries and other published sources. They are aggregate figures, such as how many people bear a surname. The site shows no data about any individual.",
        ],
      },
    ],
  },
};

const TERMS: Record<Lang, LegalDocument> = {
  pl: {
    title: "Regulamin",
    updatedLabel: "Ostatnia zmiana",
    sections: [
      {
        heading: "Usługa",
        paragraphs: [
          `Name Atlas to bezpłatny serwis z informacjami o polskich nazwiskach, prowadzony przez: ${who}, ${CONTACT_EMAIL}. Korzystanie z serwisu nie wymaga rejestracji. Wystarczy urządzenie z dostępem do internetu i aktualna przeglądarka.`,
        ],
      },
      {
        heading: "Dane i ich niepewność",
        paragraphs: [
          "Każda liczba jest podana ze źródłem, zakresem zbioru i datą. Źródła mogą zawierać błędy, a zbiory mają swoje ograniczenia, które opisujemy przy danych. Znaczenia i pochodzenie nazwisk to interpretacje naukowe, nie ustalone fakty.",
        ],
      },
      {
        heading: "Nazwisko to nie rodzina",
        paragraphs: [
          "Osoby o tym samym nazwisku nie muszą być spokrewnione. Serwis nie ustala pochodzenia, przodków ani pokrewieństwa i nie należy go tak używać.",
        ],
      },
      {
        heading: "Dostępność",
        paragraphs: [
          "Serwis jest udostępniany w obecnej postaci, bez gwarancji nieprzerwanego działania. Może się zmieniać, a jego części mogą być wyłączane.",
        ],
      },
      {
        heading: "Dozwolone korzystanie",
        paragraphs: [
          "Nie wolno zakłócać działania serwisu ani pobierać jego treści automatycznie w sposób niezgodny z plikiem robots.txt lub omijający limity zapytań.",
        ],
      },
      {
        heading: "Źródła i prawa",
        paragraphs: [
          "Dane źródłowe należą do ich wydawców i są udostępniane na ich warunkach. Każda strona podaje źródło. Kto wykorzystuje dane dalej, powinien przestrzegać licencji i wymogów oznaczenia źródła.",
        ],
      },
      {
        heading: "Odpowiedzialność",
        paragraphs: [
          "Odpowiadamy w zakresie, w jakim wymagają tego bezwzględnie obowiązujące przepisy. Nic w tym regulaminie nie ogranicza praw konsumenta wynikających z przepisów.",
        ],
      },
      {
        heading: "Zgłoszenia i reklamacje",
        paragraphs: [
          `Błędy w danych, reklamacje i inne sprawy prosimy zgłaszać na adres ${CONTACT_EMAIL}. Zgłoszenie błędu nie zmienia strony od razu: najpierw sprawdzamy źródło.`,
        ],
      },
      {
        heading: "Prawo i zmiany",
        paragraphs: [
          "Regulamin podlega prawu polskiemu; nie pozbawia to konsumenta ochrony, którą dają mu przepisy kraju jego zamieszkania. Zmiany regulaminu publikujemy na tej stronie z nową datą.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of use",
    updatedLabel: "Last changed",
    sections: [
      {
        heading: "The service",
        paragraphs: [
          `Name Atlas is a free information service about Polish surnames, run by ${who}, Poland, ${CONTACT_EMAIL}. No registration is needed. You need an internet-connected device and a current browser.`,
        ],
      },
      {
        heading: "The data and its uncertainty",
        paragraphs: [
          "Every figure is shown with its source, the scope of its dataset and its date. Sources can contain errors, and datasets have limits, which we describe next to the data. Meanings and origins of surnames are scholarly interpretations, not established facts.",
        ],
      },
      {
        heading: "A surname is not a family",
        paragraphs: [
          "People with the same surname are not necessarily related. The site does not establish ancestry, descent or kinship and should not be used to.",
        ],
      },
      {
        heading: "Availability",
        paragraphs: [
          "The site is provided as it is, without a promise of uninterrupted operation. It may change, and parts of it may be withdrawn.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "Do not disrupt the site, and do not download its content automatically in a way that disregards robots.txt or works around the request limits.",
        ],
      },
      {
        heading: "Sources and rights",
        paragraphs: [
          "Source data belongs to its publishers and is made available on their terms. Every page names its source. Anyone reusing the data should follow the licence and attribution requirements.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "We are liable to the extent mandatory law requires. Nothing in these terms limits a consumer's statutory rights.",
        ],
      },
      {
        heading: "Reports and complaints",
        paragraphs: [
          `Please send errors in the data, complaints and other matters to ${CONTACT_EMAIL}. A report of an error does not change the page at once: the source is checked first.`,
        ],
      },
      {
        heading: "Law and changes",
        paragraphs: [
          "These terms are governed by Polish law; this does not deprive a consumer of the protection given by the law of the country where they live. Changes are published on this page with a new date.",
        ],
      },
    ],
  },
};

/**
 * The document as it stands. `accounts` says whether the site has accounts
 * (`accountsEnabled`): then the notice and the terms say so (`legal-accounts.ts`);
 * otherwise this is the text as it was before accounts, unchanged.
 */
export function legalDocument(kind: LegalKind, lang: Lang, accounts = false): LegalDocument {
  const base = kind === "privacy" ? PRIVACY[lang] : TERMS[lang];
  return accounts ? accountsVariant(kind, lang, base) : base;
}

/** The date the document last changed, for the page and for the version recorded. */
export function legalUpdated(kind: LegalKind, accounts = false): string {
  return accounts ? ACCOUNTS_LEGAL_UPDATED : LEGAL_UPDATED[kind];
}

export function legalPath(kind: LegalKind, lang: Lang): string {
  if (kind === "privacy") return lang === "en" ? "/en/privacy" : "/pl/prywatnosc";
  return lang === "en" ? "/en/terms" : "/pl/regulamin";
}
