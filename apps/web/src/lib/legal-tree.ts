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
 * code (migration 0028's policies, `@name-atlas/family`) or on a decision
 * (D-028: a tree lives as long as its account; D-031: the declined-contact
 * rule, which awaits legal review before anything here goes live).
 */

interface TreeWords {
  readonly termsAfter: string;
  readonly terms: LegalSection;
  readonly privacyAfter: string;
  readonly privacy: LegalSection;
}

const WORDS: Record<Lang, TreeWords> = {
  pl: {
    termsAfter: "Konto",
    terms: {
      heading: "Drzewo i osoby żyjące",
      paragraphs: [
        "Drzewo rodzinne budujesz sam, z własnej wiedzy: wpisujesz imiona, nazwiska, lata i miejsca urodzenia, i zaznaczasz, czy osoba żyje. Serwis niczego nie dopisuje i niczego nie zgaduje.",
        "Osobę bez roku zgonu traktujemy jako żyjącą. Wpisując osobę żyjącą, oświadczasz, że masz prawo wpisać jej dane, na przykład jako członek jej rodziny, i odpowiadasz za to, co o niej wpisujesz. Przy pierwszej takiej osobie prosimy Cię o potwierdzenie tego na osobnym ekranie.",
        "Osoby żyjące widzisz tylko Ty. Nie pokazujemy ich nikomu innemu, nie porównujemy ich z cudzymi drzewami i nie udostępniamy ich osobom, które zaprosisz do drzewa, dopóki sam tego nie włączysz.",
        "Drzewo możesz w każdej chwili wyeksportować i usunąć. Usunięcie konta usuwa je razem z kontem. Osoba, która dowie się, że jest w czyimś drzewie, może napisać do nas na adres z polityki prywatności; odpowiemy i, jeśli będzie trzeba, poprosimy Cię o usunięcie wpisu.",
      ],
    },
    privacyAfter: "Konto: po co, jak długo, komu",
    privacy: {
      heading: "Drzewo rodzinne",
      paragraphs: [
        "Jeśli masz konto i budujesz drzewo, przechowujemy to, co w nim wpiszesz: nazwę drzewa; dla każdej osoby imiona, nazwisko, nazwisko rodowe, rok i miejsce urodzenia (jako kod miejscowości z rejestru TERYT i nazwę), rok zgonu, oznaczenie, czy osoba żyje, Twoje uwagi o źródle i notatki; powiązania rodzic–dziecko; oraz zapis, kto i kiedy coś zmienił (bez treści zmiany).",
        "Dane o Tobie przetwarzamy, żeby prowadzić konto i drzewo, o które prosisz (art. 6 ust. 1 lit. b RODO). Dane innych osób wpisujesz Ty i odpowiadasz za to, że masz do tego prawo; my przechowujemy je na Twoje zlecenie w ramach tej samej umowy.",
        "Drzewo jest prywatne. Widzisz je Ty, a osoby, które do niego zaprosisz, widzą osoby zmarłe; osoby żyjące i te bez roku zgonu widzą tylko wtedy, gdy im to włączysz. Nikt inny nie ma do niego dostępu. Osoby żyjące nie są porównywane z innymi drzewami.",
        "Drzewo przechowujemy tak długo, jak istnieje konto. Usuwasz je sam, w całości lub osobę po osobie; usunięcie konta usuwa je od razu. W każdej chwili możesz je pobrać.",
      ],
    },
  },
  en: {
    termsAfter: "The account",
    terms: {
      heading: "The tree and living people",
      paragraphs: [
        "You build the family tree yourself, from your own knowledge: you enter given names, surnames, years and places of birth, and you mark whether a person is living. The site adds nothing and guesses nothing.",
        "A person without a year of death counts as living. By entering a living person you state that you have the right to enter their data, for example as a member of their family, and you are responsible for what you enter about them. At the first such person we ask you to confirm this on a separate screen.",
        "Living people are seen by you alone. We show them to nobody else, we do not compare them with other people's trees, and we do not share them with the people you invite to the tree until you turn that on yourself.",
        "You can export and delete the tree at any time. Deleting the account deletes it with the account. A person who learns that they are in someone's tree may write to us at the address in the privacy notice; we will answer and, if need be, ask you to remove the entry.",
      ],
    },
    privacyAfter: "The account: why, how long, who",
    privacy: {
      heading: "The family tree",
      paragraphs: [
        "If you have an account and build a tree, we keep what you enter in it: the tree's name; for each person the given names, surname, birth surname, year and place of birth (as a locality code from the TERYT register and a name), year of death, whether the person is living, your notes on the source and other notes; the parent–child links; and a record of who changed something and when (without the content of the change).",
        "We process data about you to run the account and the tree you ask for (art. 6(1)(b) GDPR). Data about other people is entered by you, and you are responsible for having the right to enter it; we keep it on your behalf under the same contract.",
        "The tree is private. You see it, and the people you invite see the deceased; they see living people, and people without a year of death, only when you turn that on for them. Nobody else has access. Living people are not compared with other trees.",
        "We keep the tree as long as the account exists. You delete it yourself, as a whole or person by person; deleting the account deletes it at once. You can download it at any time.",
      ],
    },
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

/** The accounts variant with the tree's statements in it. */
export function treeVariant(kind: LegalKind, lang: Lang, doc: LegalDocument): LegalDocument {
  const words = WORDS[lang];
  return kind === "terms"
    ? insertAfter(doc, words.termsAfter, words.terms)
    : insertAfter(doc, words.privacyAfter, words.privacy);
}

/** The heading of the terms' clause, for the consent step's link. */
export function treeTermsHeading(lang: Lang): string {
  return WORDS[lang].terms.heading;
}
