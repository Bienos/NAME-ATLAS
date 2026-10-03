import type { AccountStep } from "./account-paths.js";
import type { Lang } from "./messages.js";

/**
 * The words of the account's pages, in both languages (TASK-062; the Google
 * terms step and buttons, TASK-084).
 *
 * A page prints its message from a *status word* in the address (`?status=…`),
 * never from text in it, and only from the words listed for that step: an
 * unknown word prints nothing. The words that follow a sign-up and a reset are
 * written so they hold for an address with an account and one without
 * (ADR-0027 §2.7).
 */

export interface StatusWords {
  readonly text: string;
  /** `problem` is announced to a screen reader at once; `ok` politely. */
  readonly tone: "ok" | "problem";
}

type StatusMap = Readonly<Record<string, StatusWords>>;

export interface AccountText {
  readonly headings: Readonly<Record<AccountStep, string>>;
  readonly nav: string;
  readonly email: string;
  readonly password: string;
  readonly newPassword: string;
  readonly passwordHint: string;
  readonly terms: {
    readonly before: string;
    readonly termsLink: string;
    readonly between: string;
    readonly privacyLink: string;
    readonly after: string;
  };
  readonly ledes: Readonly<Record<AccountStep, string>>;
  readonly submit: Readonly<Record<Exclude<AccountStep, "account">, string>>;
  readonly links: {
    readonly noAccount: string;
    readonly signUp: string;
    readonly haveAccount: string;
    readonly signIn: string;
    readonly forgot: string;
    readonly requestNew: string;
  };
  readonly google: {
    /** The button, in the words Google's branding guidelines allow. */
    readonly button: string;
    /** Between the button and the email form. */
    readonly or: string;
    /** On the sign-in page when the reader came from the family tree. */
    readonly forTree: string;
  };
  readonly account: {
    readonly signedInAs: string;
    /** For an account made through Google that has no password yet. */
    readonly viaGoogle: string;
    readonly setPassword: string;
    readonly deleteLedeNoPassword: string;
    readonly deleteConfirm: string;
    readonly termsAccepted: (version: string, accepted: string) => string;
    readonly signOut: string;
    readonly deleteHeading: string;
    readonly deleteLede: string;
    readonly deletePassword: string;
    readonly deleteSubmit: string;
  };
  readonly status: Readonly<Record<AccountStep, StatusMap>>;
}

const problem = (text: string): StatusWords => ({ text, tone: "problem" });
const ok = (text: string): StatusWords => ({ text, tone: "ok" });

function passwordProblems(words: {
  readonly tooShort: string;
  readonly tooLong: string;
  readonly sameAsEmail: string;
  readonly tooCommon: string;
}): StatusMap {
  return {
    "too-short": problem(words.tooShort),
    "too-long": problem(words.tooLong),
    "same-as-email": problem(words.sameAsEmail),
    "too-common": problem(words.tooCommon),
  };
}

const PL: AccountText = {
  headings: {
    account: "Twoje konto",
    "sign-in": "Zaloguj się",
    "sign-up": "Załóż konto",
    reset: "Nie pamiętasz hasła?",
    confirm: "Dokończ zakładanie konta",
    "new-password": "Ustaw nowe hasło",
    welcome: "Jeszcze tylko regulamin",
  },
  nav: "Konto",
  email: "Adres e-mail",
  password: "Hasło",
  newPassword: "Nowe hasło",
  passwordHint:
    "Co najmniej 10 znaków, bez innych wymagań. Najlepiej długie hasło, którego nie używasz nigdzie indziej.",
  terms: {
    before: "Akceptuję ",
    termsLink: "regulamin",
    between: " i przyjmuję do wiadomości ",
    privacyLink: "politykę prywatności",
    after: ".",
  },
  ledes: {
    account: "",
    "sign-in": "Konto nie jest potrzebne do czytania serwisu.",
    "sign-up":
      "Podaj adres e-mail. Wyślemy na niego link; hasło ustawisz i regulamin zaakceptujesz dopiero po jego otwarciu.",
    reset: "Podaj adres. Jeśli jest do niego konto, wyślemy link do ustawienia nowego hasła.",
    confirm: "Wybierz hasło i zaakceptuj regulamin. Link działa raz.",
    "new-password": "Wybierz nowe hasło. Po zmianie wszystkie sesje, także ta, zostaną zakończone.",
    welcome:
      "Logujesz się przez Google pierwszy raz. Zaakceptuj regulamin, żeby założyć konto. Od Google dostajemy tylko adres e-mail i identyfikator konta, nigdy hasło.",
  },
  submit: {
    "sign-in": "Zaloguj",
    "sign-up": "Wyślij link",
    reset: "Wyślij link",
    confirm: "Utwórz konto",
    "new-password": "Zmień hasło",
    welcome: "Załóż konto",
  },
  google: {
    button: "Kontynuuj z Google",
    or: "lub e-mailem",
    forTree: "Zaloguj się, żeby zacząć drzewo rodzinne. Wrócisz do niego od razu.",
  },
  links: {
    noAccount: "Nie masz konta?",
    signUp: "Załóż je",
    haveAccount: "Masz już konto?",
    signIn: "Zaloguj się",
    forgot: "Nie pamiętasz hasła?",
    requestNew: "Poproś o nowy link",
  },
  account: {
    signedInAs: "Zalogowano jako",
    viaGoogle: "Logujesz się przez Google. Hasła nie masz, ale możesz je ustawić.",
    setPassword: "Ustaw hasło",
    deleteLedeNoPassword:
      "Konto, wszystkie jego sesje, linki i połączenie z Google znikają z bazy od razu i nie da się tego cofnąć.",
    deleteConfirm: "Rozumiem, że konto zniknie na stałe.",
    // Polish dates end in "r." already, so the sentence takes no full stop of its own.
    termsAccepted: (version, accepted) => `Regulamin z ${version}, zaakceptowany ${accepted}`,
    signOut: "Wyloguj",
    deleteHeading: "Usuń konto",
    deleteLede:
      "Konto, wszystkie jego sesje i linki znikają z bazy od razu i nie da się tego cofnąć. Podaj hasło, żeby potwierdzić.",
    deletePassword: "Hasło",
    deleteSubmit: "Usuń konto na stałe",
  },
  status: {
    account: {
      welcome: ok("Konto gotowe. Jesteś zalogowany."),
      "wrong-password": problem("Hasło się nie zgadza. Konto nie zostało usunięte."),
      unconfirmed: problem("Zaznacz potwierdzenie. Konto nie zostało usunięte."),
      error: problem("Coś poszło nie tak po naszej stronie. Spróbuj za chwilę."),
    },
    "sign-in": {
      rejected: problem(
        "Adres lub hasło się nie zgadzają albo konto nie zostało jeszcze dokończone. Sprawdź i spróbuj jeszcze raz.",
      ),
      throttled: problem(
        "Za dużo nieudanych prób dla tego adresu. Spróbuj za kilkanaście minut albo ustaw nowe hasło.",
      ),
      signedout: ok("Wylogowano."),
      reset: ok("Hasło zmienione. Zaloguj się nowym."),
      deleted: ok("Konto usunięte."),
      "google-cancelled": ok("Logowanie przez Google przerwane. Nic nie zostało zapisane."),
      "google-failed": problem(
        "Nie udało się zalogować przez Google. Spróbuj jeszcze raz za chwilę.",
      ),
      "google-unverified": problem(
        "Google nie potwierdził tego adresu e-mail, więc nie możemy na nim założyć konta.",
      ),
      "google-other": problem(
        "To konto jest już połączone z innym kontem Google. Zaloguj się tamtym albo hasłem.",
      ),
      "google-expired": problem(
        "Minęła ponad godzina od wyboru konta Google. Zaloguj się przez Google jeszcze raz.",
      ),
      error: problem("Coś poszło nie tak po naszej stronie. Spróbuj za chwilę."),
    },
    "sign-up": {
      sent: ok(
        "Jeśli ten adres może założyć konto, wysłaliśmy na niego wiadomość z linkiem, ważnym 24 godziny. Jeśli masz już konto, zaloguj się albo ustaw nowe hasło.",
      ),
      email: problem("To nie wygląda jak adres e-mail. Sprawdź i spróbuj jeszcze raz."),
      error: problem("Coś poszło nie tak po naszej stronie. Spróbuj za chwilę."),
    },
    reset: {
      sent: ok(
        "Jeśli do tego adresu jest konto, wysłaliśmy na niego link do ustawienia nowego hasła, ważny godzinę.",
      ),
      error: problem("Coś poszło nie tak po naszej stronie. Spróbuj za chwilę."),
    },
    confirm: {
      expired: problem("Ten link wygasł albo został już użyty. Załóż konto jeszcze raz."),
      terms: problem("Żeby założyć konto, zaakceptuj regulamin."),
      ...passwordProblems({
        tooShort: "Hasło musi mieć co najmniej 10 znaków.",
        tooLong: "Hasło może mieć najwyżej 128 znaków.",
        sameAsEmail: "Hasło nie może być takie samo jak adres e-mail.",
        tooCommon: "To hasło jest zbyt popularne. Wybierz inne.",
      }),
      error: problem("Coś poszło nie tak po naszej stronie. Spróbuj za chwilę."),
    },
    "new-password": {
      expired: problem("Ten link wygasł albo został już użyty. Poproś o nowy."),
      ...passwordProblems({
        tooShort: "Hasło musi mieć co najmniej 10 znaków.",
        tooLong: "Hasło może mieć najwyżej 128 znaków.",
        sameAsEmail: "Hasło nie może być takie samo jak adres e-mail.",
        tooCommon: "To hasło jest zbyt popularne. Wybierz inne.",
      }),
      error: problem("Coś poszło nie tak po naszej stronie. Spróbuj za chwilę."),
    },
    welcome: {
      terms: problem("Żeby założyć konto, zaakceptuj regulamin."),
      expired: problem(
        "Minęła ponad godzina od wyboru konta Google. Zaloguj się przez Google jeszcze raz.",
      ),
      error: problem("Coś poszło nie tak po naszej stronie. Spróbuj za chwilę."),
    },
  },
};

const EN: AccountText = {
  headings: {
    account: "Your account",
    "sign-in": "Sign in",
    "sign-up": "Create an account",
    reset: "Forgot your password?",
    confirm: "Finish creating your account",
    "new-password": "Set a new password",
    welcome: "One last step: the terms",
  },
  nav: "Account",
  email: "Email address",
  password: "Password",
  newPassword: "New password",
  passwordHint:
    "At least 10 characters, no other rules. A long password you use nowhere else is best.",
  terms: {
    before: "I accept the ",
    termsLink: "terms of use",
    between: " and have read the ",
    privacyLink: "privacy notice",
    after: ".",
  },
  ledes: {
    account: "",
    "sign-in": "You do not need an account to read the site.",
    "sign-up":
      "Enter your email address. We will send a link to it; you choose the password and accept the terms only after opening it.",
    reset:
      "Enter your address. If there is an account for it, we will send a link to set a new password.",
    confirm: "Choose a password and accept the terms. The link works once.",
    "new-password":
      "Choose a new password. When you change it, every session, this one too, is ended.",
    welcome:
      "This is your first sign-in with Google. Accept the terms to create your account. Google gives us only your email address and an account identifier, never a password.",
  },
  submit: {
    "sign-in": "Sign in",
    "sign-up": "Send the link",
    reset: "Send the link",
    confirm: "Create the account",
    "new-password": "Change the password",
    welcome: "Create the account",
  },
  google: {
    button: "Continue with Google",
    or: "or with email",
    forTree: "Sign in to start your family tree. You will go straight back to it.",
  },
  links: {
    noAccount: "No account?",
    signUp: "Create one",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    forgot: "Forgot your password?",
    requestNew: "Ask for a new link",
  },
  account: {
    signedInAs: "Signed in as",
    viaGoogle: "You sign in with Google. You have no password, but you can set one.",
    setPassword: "Set a password",
    deleteLedeNoPassword:
      "The account, all its sessions, links and its Google connection leave the database at once, and this cannot be undone.",
    deleteConfirm: "I understand the account will be gone for good.",
    termsAccepted: (version, accepted) => `Terms of ${version} accepted on ${accepted}.`,
    signOut: "Sign out",
    deleteHeading: "Delete the account",
    deleteLede:
      "The account, all its sessions and links leave the database at once, and this cannot be undone. Enter your password to confirm.",
    deletePassword: "Password",
    deleteSubmit: "Delete the account for good",
  },
  status: {
    account: {
      welcome: ok("Your account is ready. You are signed in."),
      "wrong-password": problem("The password does not match. The account was not deleted."),
      unconfirmed: problem("Tick the confirmation. The account was not deleted."),
      error: problem("Something went wrong on our side. Try again in a moment."),
    },
    "sign-in": {
      rejected: problem(
        "The address or the password does not match, or the account has not been finished yet. Check and try again.",
      ),
      throttled: problem(
        "Too many failed attempts for this address. Try again in a quarter of an hour or set a new password.",
      ),
      signedout: ok("Signed out."),
      reset: ok("Password changed. Sign in with the new one."),
      deleted: ok("Account deleted."),
      "google-cancelled": ok("Signing in with Google was cancelled. Nothing was saved."),
      "google-failed": problem("Signing in with Google did not work. Try again in a moment."),
      "google-unverified": problem(
        "Google has not verified this email address, so we cannot open an account for it.",
      ),
      "google-other": problem(
        "This account is already connected to a different Google account. Sign in with that one or with your password.",
      ),
      "google-expired": problem(
        "More than an hour has passed since you chose a Google account. Sign in with Google again.",
      ),
      error: problem("Something went wrong on our side. Try again in a moment."),
    },
    "sign-up": {
      sent: ok(
        "If this address can open an account, we have sent a message with a link to it, valid for 24 hours. If you already have an account, sign in or set a new password.",
      ),
      email: problem("That does not look like an email address. Check it and try again."),
      error: problem("Something went wrong on our side. Try again in a moment."),
    },
    reset: {
      sent: ok(
        "If there is an account for this address, we have sent a link to it for setting a new password, valid for an hour.",
      ),
      error: problem("Something went wrong on our side. Try again in a moment."),
    },
    confirm: {
      expired: problem("This link has expired or has already been used. Create the account again."),
      terms: problem("To create an account, accept the terms."),
      ...passwordProblems({
        tooShort: "The password must have at least 10 characters.",
        tooLong: "The password can have at most 128 characters.",
        sameAsEmail: "The password cannot be the same as the email address.",
        tooCommon: "That password is too common. Choose another.",
      }),
      error: problem("Something went wrong on our side. Try again in a moment."),
    },
    "new-password": {
      expired: problem("This link has expired or has already been used. Ask for a new one."),
      ...passwordProblems({
        tooShort: "The password must have at least 10 characters.",
        tooLong: "The password can have at most 128 characters.",
        sameAsEmail: "The password cannot be the same as the email address.",
        tooCommon: "That password is too common. Choose another.",
      }),
      error: problem("Something went wrong on our side. Try again in a moment."),
    },
    welcome: {
      terms: problem("To create an account, accept the terms."),
      expired: problem(
        "More than an hour has passed since you chose a Google account. Sign in with Google again.",
      ),
      error: problem("Something went wrong on our side. Try again in a moment."),
    },
  },
};

export const ACCOUNT_TEXT: Readonly<Record<Lang, AccountText>> = { pl: PL, en: EN };

/** The words for a status word on a step, or null for an unknown one. */
export function statusWords(
  lang: Lang,
  step: AccountStep,
  word: string | null,
): StatusWords | null {
  if (word === null) return null;
  // `hasOwn`, because the word comes from an address and `Object.prototype` has names too.
  const map = ACCOUNT_TEXT[lang].status[step];
  return Object.hasOwn(map, word) ? (map[word] ?? null) : null;
}
