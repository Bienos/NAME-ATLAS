import type { LegalDocument, LegalKind, LegalSection } from "./legal-text.js";
import type { Lang } from "./messages.js";

/**
 * What the terms and the privacy notice say once the family tree exists
 * (TASK-076; ADR-0026 §2.5, ADR-0029 §2.4.12). Applied on top of the accounts
 * variant (`legal-accounts.ts`), and only when the tree is on
 * (`family-config.ts`), so the base text and the accounts text are left as
 * they are. It **throws** when a heading it expects is not there.
 *
 * The clause is what the one-time consent step points at: an account whose
 * recorded terms version predates `TREE_LEGAL_UPDATED` is asked to accept
 * again before its first living person is saved. Every statement rests on the
 * code (migrations 0028 and 0033's tables and policies, `@name-atlas/family`,
 * `tree-mail.ts`; checked again in the legal review of 2026-10-04) or on a decision
 * (D-028: a tree lives as long as its account; D-031: the declined-contact
 * rule, which awaits legal review before anything here goes live).
 */

interface TreeWords {
  readonly termsAfter: string;
  readonly terms: LegalSection;
  readonly privacyAfter: string;
  readonly privacy: LegalSection;
  readonly processorsHeading: string;
  readonly oracleItem: string;
  readonly resendItem: string;
}

const WORDS: Record<Lang, TreeWords> = {
  pl: {
    termsAfter: "Konto",
    terms: {
      heading: "Drzewo i osoby żyjące",
      paragraphs: [
        "Drzewo rodzinne budujesz sam, z własnej wiedzy: wpisujesz imiona, nazwiska, lata i miejsca urodzenia, i zaznaczasz, czy osoba żyje. Serwis niczego nie dopisuje i niczego nie zgaduje.",
        "Osobę, której nie oznaczysz jako zmarłej, traktujemy jako żyjącą; wpisany rok zgonu oznacza osobę zmarłą. Wpisując osobę żyjącą, oświadczasz, że masz prawo wpisać jej dane, na przykład jako członek jej rodziny, i odpowiadasz za to, co o niej wpisujesz. Przy pierwszej takiej osobie prosimy Cię o potwierdzenie tego na osobnym ekranie.",
        "Drzewo widzisz tylko Ty. Nie pokazujemy go nikomu innemu i nie porównujemy osób żyjących z cudzymi drzewami. Wyjątkiem jest osoba, którą zaprosisz, żeby potwierdziła swoją kartę: widzi tylko tę kartę z imionami swoich rodziców i sama ją poprawia.",
        "Drzewo możesz w każdej chwili wyeksportować i usunąć. Usunięcie konta usuwa je razem z kontem. Osoba, która dowie się, że jest w czyimś drzewie, może napisać do nas na adres z polityki prywatności; odpowiemy i, jeśli będzie trzeba, poprosimy Cię o usunięcie wpisu.",
      ],
    },
    privacyAfter: "Konto: po co, jak długo, komu",
    privacy: {
      heading: "Drzewo rodzinne",
      paragraphs: [
        "Jeśli masz konto i budujesz drzewo, przechowujemy to, co w nim wpiszesz: nazwę drzewa; dla każdej osoby imiona, nazwisko, nazwisko rodowe, rok i miejsce urodzenia oraz rok i miejsce zgonu (miejsce jako kod miejscowości z rejestru TERYT i nazwę; przy roku oznaczenie, że jest przybliżony), to, czy osoba żyje, zmarła, czy nie wiadomo, Twoje uwagi o źródle i notatki; powiązania rodzic–dziecko z rolą rodzica (matka, ojciec, rodzic); kto wpisał osobę i kiedy. Zapisujemy też, kto i kiedy zmienił coś w drzewie, jakiego rodzaju była to zmiana i której osoby dotyczyła, bez treści zmiany.",
        "Dane o Tobie przetwarzamy, żeby prowadzić konto i drzewo, o które prosisz (art. 6 ust. 1 lit. b RODO). Dane innych osób wpisujesz Ty i odpowiadasz za to, że masz do tego prawo; my przechowujemy je na Twoje zlecenie w ramach tej samej umowy.",
        "Drzewo jest prywatne: widzisz je tylko Ty. Osoba, która potwierdziła swoją kartę, widzi tylko tę kartę z imionami swoich rodziców. Nikt inny nie ma do drzewa dostępu. Osoby żyjące nie są porównywane z innymi drzewami.",
        "Drzewo przechowujemy tak długo, jak istnieje konto. Usuwasz je sam, w całości lub osobę po osobie; usunięcie konta usuwa je od razu. W każdej chwili możesz je pobrać (plik JSON). Zapis zmian, zaproszenia i lista adresów, których nie zapraszamy ponownie, trwają tyle co drzewo. Gdy ktoś inny usunie swoje konto, jego identyfikator znika z tych zapisów, a same zapisy zostają w drzewie. Dzienniki serwisu zapisują identyfikator drzewa, nigdy jego treść.",
        "Osobę żyjącą możesz zaprosić, żeby sama potwierdziła swoją kartę; nie zapraszamy nikogo, kto według wpisanego roku urodzenia nie ma 18 lat. Na adres e-mail, który wpiszesz, wysyłamy przez Resend jedną wiadomość z Twoim adresem e-mail jako zapraszającego i linkiem ważnym 14 dni. Adresu nie zapisujemy przy osobie: przy zaproszeniu przechowujemy jego skrót, kto i kiedy zaprosił oraz odpowiedź. Gdy osoba odpowie, że to nie ona albo że nie chce kontaktu, albo później zrezygnuje z karty, skrót trafia na listę adresów, których w tym drzewie nie zaprosimy ponownie. Zapisujemy, kto i kiedy potwierdził kartę i czy osoba nie chce kontaktu. Osoba, która potwierdzi kartę, sama poprawia swoje dane i może ukryć przed Tobą rok i miejsce urodzenia oraz nazwisko rodowe.",
      ],
    },
    processorsHeading: "Komu powierzamy dane",
    oracleItem:
      "Oracle — serwer bazy danych we Frankfurcie. Otrzymuje zapytanie o nazwisko, ale nie adres IP odwiedzającego; trzyma też dane konta i drzew (wyżej).",
    resendItem:
      "Resend, Inc. (USA) — wysyłanie wiadomości z linkiem do założenia konta i do ustawienia nowego hasła, zaproszeń do potwierdzenia karty w drzewie oraz dostarczanie wiadomości z formularza kontaktowego na naszą skrzynkę. Przekazanie do USA opiera się na certyfikacji Resend w EU-U.S. Data Privacy Framework i na standardowych klauzulach umownych, jak Resend deklaruje.",
  },
  en: {
    termsAfter: "The account",
    terms: {
      heading: "The tree and living people",
      paragraphs: [
        "You build the family tree yourself, from your own knowledge: you enter given names, surnames, years and places of birth, and you mark whether a person is living. The site adds nothing and guesses nothing.",
        "A person you do not mark as deceased counts as living; a year of death entered marks the person as deceased. By entering a living person you state that you have the right to enter their data, for example as a member of their family, and you are responsible for what you enter about them. At the first such person we ask you to confirm this on a separate screen.",
        "The tree is seen by you alone. We show it to nobody else, and we do not compare living people with other people's trees. The one exception is a person you invite to confirm their own card: they see only that card, with their parents' names, and correct it themselves.",
        "You can export and delete the tree at any time. Deleting the account deletes it with the account. A person who learns that they are in someone's tree may write to us at the address in the privacy notice; we will answer and, if need be, ask you to remove the entry.",
      ],
    },
    privacyAfter: "The account: why, how long, who",
    privacy: {
      heading: "The family tree",
      paragraphs: [
        "If you have an account and build a tree, we keep what you enter in it: the tree's name; for each person the given names, surname, birth surname, year and place of birth and year and place of death (the place as a locality code from the TERYT register and a name; with a year, a mark that it is approximate), whether the person is living, deceased or not known, your notes on the source and other notes; the parent–child links, with the parent's role (mother, father, parent); who entered the person and when. We also record who changed something in the tree and when, what kind of change it was and which person it concerned, without the content of the change.",
        "We process data about you to run the account and the tree you ask for (art. 6(1)(b) GDPR). Data about other people is entered by you, and you are responsible for having the right to enter it; we keep it on your behalf under the same contract.",
        "The tree is private: you alone see it. A person who has confirmed their card sees only that card, with their parents' names. Nobody else has access to the tree. Living people are not compared with other trees.",
        "We keep the tree as long as the account exists. You delete it yourself, as a whole or person by person; deleting the account deletes it at once. You can download it at any time (a JSON file). The record of changes, the invitations and the list of addresses not to invite again last as long as the tree. When someone else deletes their account, their identifier leaves those records, and the records stay in the tree. The site's logs record a tree's identifier, never its content.",
        "You can invite a living person to confirm their own card; nobody whose year of birth entered makes them under 18 is invited. To the email address you enter we send, through Resend, one message giving your email address as the inviter and a link valid for 14 days. The address is not stored with the person: with the invitation we keep its hash, who invited and when, and the answer. If the person answers that it is not them or that they want no contact, or later gives up the card, the hash goes on a list of addresses this tree will not invite again. We record who confirmed the card and when, and whether the person wants no contact. A person who confirms their card corrects their own data and may hide the year and place of birth and the birth surname from you.",
      ],
    },
    processorsHeading: "Who processes data for us",
    oracleItem:
      "Oracle — the database server in Frankfurt. It receives the surname query but not the visitor's IP address; it also holds the account and tree data (above).",
    resendItem:
      "Resend, Inc. (USA) — sending the emails with the links to open the account and to set a new password and the invitations to confirm a card in a tree, and delivering the contact form's messages to our mailbox. The transfer to the USA rests on Resend's certification under the EU-U.S. Data Privacy Framework and on standard contractual clauses, as Resend states.",
  },
};

function insertAfter(doc: LegalDocument, heading: string, section: LegalSection): LegalDocument {
  if (!doc.sections.some((s) => s.heading === heading)) {
    throw new Error(`legal-tree: the text has no section "${heading}"`);
  }
  return {
    ...doc,
    sections: doc.sections.flatMap((s) => (s.heading === heading ? [s, section] : [s])),
  };
}

/** The processors' list with the database and the mail service also naming the tree. */
function withTreeProcessors(doc: LegalDocument, words: TreeWords): LegalDocument {
  const section = doc.sections.find((s) => s.heading === words.processorsHeading);
  const items = section?.items ?? [];
  if (
    !items.some((item) => item.startsWith("Oracle")) ||
    !items.some((item) => item.startsWith("Resend"))
  ) {
    throw new Error(
      `legal-tree: the text has no Oracle and Resend items under "${words.processorsHeading}"`,
    );
  }
  return {
    ...doc,
    sections: doc.sections.map((s) =>
      s.heading === words.processorsHeading
        ? {
            ...s,
            items: items.map((item) =>
              item.startsWith("Oracle")
                ? words.oracleItem
                : item.startsWith("Resend")
                  ? words.resendItem
                  : item,
            ),
          }
        : s,
    ),
  };
}

/** The accounts variant with the tree's statements in it. */
export function treeVariant(kind: LegalKind, lang: Lang, doc: LegalDocument): LegalDocument {
  const words = WORDS[lang];
  return kind === "terms"
    ? insertAfter(doc, words.termsAfter, words.terms)
    : withTreeProcessors(insertAfter(doc, words.privacyAfter, words.privacy), words);
}

/** The heading of the terms' clause, for the consent step's link. */
export function treeTermsHeading(lang: Lang): string {
  return WORDS[lang].terms.heading;
}
