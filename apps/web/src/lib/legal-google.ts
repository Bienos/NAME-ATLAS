import type { LegalDocument, LegalKind, LegalSection } from "./legal-text.js";
import type { Lang } from "./messages.js";

/**
 * What the privacy notice says once Google sign-in exists (TASK-084, ADR-0033).
 *
 * Shown only when Google is configured (`googleEnabled`), on top of the
 * accounts variant (`legal-accounts.ts`), so the notice never describes a
 * sign-in the site does not offer. It adds one section after the account's
 * and one item to the list of who processes data; it **throws** when a
 * heading it expects is not there, as `legal-accounts.ts` does. The terms are
 * unchanged: an account made through Google accepts the same text on the
 * terms step.
 *
 * Every statement rests on the code: `packages/accounts/src/google.ts` asks
 * Google for `openid email` only and keeps the subject, the address and
 * whether it is verified; migration 0032 stores the subject alone; the flight
 * cookie (`google-routes.ts`) lives ten minutes and holds the state, the PKCE
 * verifier, the language and the page to return to. That Google Ireland
 * Limited is the controller of a Google account for users in the EEA and
 * Switzerland is Google's own privacy policy's statement; it awaits the legal
 * review the rest of the account text awaits (ADR-0023 §2.5).
 */

interface GoogleWords {
  readonly afterHeading: string;
  readonly processorsHeading: string;
  readonly section: LegalSection;
  readonly processorItem: string;
}

const WORDS: Record<Lang, GoogleWords> = {
  pl: {
    afterHeading: "Konto: po co, jak długo, komu",
    processorsHeading: "Komu powierzamy dane",
    section: {
      heading: "Logowanie przez Google",
      paragraphs: [
        "Konto możesz też założyć i otwierać przez Google. Logujesz się wtedy na stronie Google, a Google przekazuje nam tylko trzy rzeczy: identyfikator Twojego konta Google, adres e-mail i informację, czy Google ten adres potwierdził. Nie dostajemy Twojego hasła, imienia, zdjęcia ani dostępu do skrzynki.",
        "Zapisujemy przy Twoim koncie identyfikator konta Google, czas połączenia i ostatniego logowania przez Google. Adres e-mail zapisujemy jak przy zwykłym koncie. Jeśli konto na ten adres już istnieje, łączymy je z kontem Google, bo Google potwierdził, że adres należy do Ciebie. Regulamin akceptujesz sam na osobnym ekranie przy pierwszym logowaniu.",
        "Na czas logowania serwis zapisuje w przeglądarce drugi plik cookie (HttpOnly, SameSite=Lax), ważny 10 minut. Zawiera jednorazowe kody, które chronią logowanie przed podszyciem, oraz język i stronę, na którą wrócisz. Kasujemy go zaraz po powrocie z Google.",
        "Podstawa jest ta sama co dla konta: wykonanie umowy na Twoje żądanie (art. 6 ust. 1 lit. b RODO). Konto bez hasła usuwasz na jego stronie, zaznaczając potwierdzenie; połączenie z Google znika razem z kontem. Hasło możesz ustawić w każdej chwili przez link „Nie pamiętasz hasła?”.",
      ],
    },
    processorItem:
      "Google Ireland Limited (Irlandia) — logowanie przez Google, jeśli je wybierzesz. Na swojej stronie Google działa jako osobny administrator Twojego konta Google, według własnej polityki prywatności.",
  },
  en: {
    afterHeading: "The account: why, how long, who",
    processorsHeading: "Who processes data for us",
    section: {
      heading: "Signing in with Google",
      paragraphs: [
        "You can also create and open an account with Google. You then sign in on Google's page, and Google gives us three things only: your Google account's identifier, your email address, and whether Google has verified that address. We do not receive your password, name, picture or any access to your mailbox.",
        "We keep the Google account's identifier with your account, with the times it was connected and last used. The email address is kept as for any account. If an account for that address already exists, we connect it to the Google account, because Google has confirmed the address is yours. You accept the terms yourself, on a separate screen, the first time you sign in.",
        "While you sign in, the site stores a second cookie in your browser (HttpOnly, SameSite=Lax), valid for 10 minutes. It holds one-time codes that protect the sign-in from being hijacked, and the language and page you return to. It is deleted as soon as you come back from Google.",
        'The basis is the same as for the account: performing a contract at your request (art. 6(1)(b) GDPR). You delete an account without a password on its page by ticking the confirmation; the Google connection goes with the account. You can set a password at any time through the "Forgot your password?" link.',
      ],
    },
    processorItem:
      "Google Ireland Limited (Ireland) — signing in with Google, if you choose it. On its own page Google acts as a separate controller of your Google account, under its own privacy policy.",
  },
};

/** The privacy notice with Google sign-in in it; the terms as they are. */
export function googleVariant(kind: LegalKind, lang: Lang, doc: LegalDocument): LegalDocument {
  if (kind !== "privacy") return doc;
  const words = WORDS[lang];
  for (const heading of [words.afterHeading, words.processorsHeading]) {
    if (!doc.sections.some((section) => section.heading === heading)) {
      throw new Error(`legal-google: the accounts text has no section "${heading}"`);
    }
  }
  const sections = doc.sections.flatMap((section): readonly LegalSection[] => {
    if (section.heading === words.afterHeading) return [section, words.section];
    if (section.heading === words.processorsHeading) {
      return [{ ...section, items: [...(section.items ?? []), words.processorItem] }];
    }
    return [section];
  });
  return { ...doc, sections };
}
