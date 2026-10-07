import type { Lang } from "./messages.js";

/**
 * The account's addresses (TASK-062, ADR-0027): the pages a reader opens and
 * the routes their forms post to. Pure, so the header, the pages, the mail's
 * links and the redirects all take them from here and a renamed page is
 * renamed once.
 *
 * The pages are one catch-all route per language, `/pl/konto/[[...step]]` and
 * `/en/account/[[...step]]`, so a step is a slug and an unknown slug is a 404.
 */

export type AccountStep =
  "account" | "sign-in" | "sign-up" | "reset" | "confirm" | "new-password" | "welcome";

export const ACCOUNT_STEPS: readonly AccountStep[] = [
  "account",
  "sign-in",
  "sign-up",
  "reset",
  "confirm",
  "new-password",
  "welcome",
];

const BASE: Readonly<Record<Lang, string>> = { pl: "/pl/konto", en: "/en/account" };

const SLUG: Readonly<Record<Lang, Readonly<Record<AccountStep, string>>>> = {
  pl: {
    account: "",
    "sign-in": "zaloguj",
    "sign-up": "zaloz",
    reset: "reset",
    confirm: "potwierdz",
    "new-password": "nowe-haslo",
    welcome: "witaj",
  },
  en: {
    account: "",
    "sign-in": "sign-in",
    "sign-up": "sign-up",
    reset: "reset",
    confirm: "confirm",
    "new-password": "new-password",
    welcome: "welcome",
  },
};

/** The address of a step, with a query when it has one (a status word, a token). */
export function accountPath(
  lang: Lang,
  step: AccountStep,
  query: Readonly<Record<string, string>> = {},
): string {
  const slug = SLUG[lang][step];
  const path = slug === "" ? BASE[lang] : `${BASE[lang]}/${slug}`;
  const search = new URLSearchParams(query).toString();
  return search === "" ? path : `${path}?${search}`;
}

/** The step a catch-all route's segments name, or null for none (404). */
export function stepFromSlug(
  lang: Lang,
  segments: readonly string[] | undefined,
): AccountStep | null {
  const parts = segments ?? [];
  if (parts.length > 1) return null;
  const slug = parts[0] ?? "";
  for (const step of ACCOUNT_STEPS) {
    if (SLUG[lang][step] === slug) return step;
  }
  return null;
}

export type AccountAction =
  | "sign-up"
  | "complete"
  | "google-complete"
  | "sign-in"
  | "sign-out"
  | "reset-request"
  | "reset"
  | "delete";

export const ACCOUNT_ACTIONS: readonly AccountAction[] = [
  "sign-up",
  "complete",
  "google-complete",
  "sign-in",
  "sign-out",
  "reset-request",
  "reset",
  "delete",
];

export const ACCOUNT_API_PREFIX = "/api/account/";

export function isAccountAction(value: string): value is AccountAction {
  return (ACCOUNT_ACTIONS as readonly string[]).includes(value);
}

/** The route a form posts to. */
export function actionPath(action: AccountAction): string {
  return `${ACCOUNT_API_PREFIX}${action}`;
}

/** Google sign-in's two GET routes (TASK-084): the start, and Google's return address. */
export const GOOGLE_START_PATH = "/api/account/google";
export const GOOGLE_CALLBACK_PATH = "/api/account/google/callback";

/** The address that starts a Google sign-in, carrying the language and where to go after. */
export function googleStartPath(lang: Lang, next: string | null): string {
  const query = new URLSearchParams({ lang });
  if (next !== null) query.set("next", next);
  return `${GOOGLE_START_PATH}?${query.toString()}`;
}

/** The family tree's own page (TASK-076), the other place a sign-in may return to (TASK-084). */
const TREE_HOMES: ReadonlySet<string> = new Set(["/pl/konto/drzewa", "/en/account/trees"]);
/** An invitation to a tree (TASK-094): the page with its token, which the mail links to and a sign-in comes back to. */
const TREE_INVITATION =
  /^\/(?:pl\/konto\/drzewa\/zaproszenie|en\/account\/trees\/invitation)\?t=[A-Za-z0-9_-]{43}$/u;

/** The baby-names page (TASK-141) and its list (TASK-146), signed-in only: a sign-in comes back to it, without its query. */
const BABY_NAMES_HOMES: ReadonlySet<string> = new Set([
  "/pl/imiona-dla-dziecka",
  "/en/baby-names",
  "/pl/imiona-dla-dziecka/lista",
  "/en/baby-names/list",
]);

/** The full-name comparison (TASK-155), signed-in only: a sign-in comes back to it, without its query. */
const FULL_NAME_COMPARE_HOMES: ReadonlySet<string> = new Set([
  "/pl/porownaj/imie-i-nazwisko",
  "/en/compare/full-name",
]);

/**
 * The baby-names page with the name a signed-out reader typed (TASK-159): the
 * language's own field and nothing else, its value as `URLSearchParams` writes
 * it. No literal `.`, which separates the Google flight cookie's parts.
 */
const BABY_NAMES_TYPED =
  /^\/(?:pl\/imiona-dla-dziecka\?imie=|en\/baby-names\?name=)((?:[A-Za-z0-9*_-]|\+|%[0-9A-Fa-f]{2})+)$/u;

function babyNamesTypedNext(value: string): boolean {
  const match = BABY_NAMES_TYPED.exec(value);
  if (match === null) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent((match[1] ?? "").replaceAll("+", " "));
  } catch {
    return false;
  }
  return !/\p{C}/u.test(decoded) && decoded.trim() !== "";
}

/** Whether a `next` leads to the family tree, for the sign-in page's line about it. */
export function isTreeNext(next: string | null): boolean {
  return next !== null && (TREE_HOMES.has(next) || TREE_INVITATION.test(next));
}

/**
 * Where a sign-in may send the reader on (TASK-064): the surname page they came
 * from, which the deck's prompt names, the family tree's page (TASK-084),
 * an invitation to a tree with its token (TASK-094), or the baby-names page
 * (TASK-141), bare or with the name typed before signing in (TASK-159), and
 * nothing else. It is checked again
 * by the sign-in action, because a form field can say anything, and a redirect
 * to an address a stranger chose is how a sign-in page is turned into a trap.
 *
 * Only a surname's page of this site is accepted, `/pl/nazwisko/{slug}` or
 * `/en/surname/{slug}`, with `?view=cards` if the deck was open, or its share
 * studio (TASK-093), `/pl/nazwisko/{slug}/udostepnij` or `/en/surname/{slug}/share`,
 * with `?card={card}` naming one of the studio's cards. The slug is
 * one path segment as `canonicalSlug` writes it (letters percent-encoded, the
 * apostrophe and hyphen kept); an encoded slash, backslash, dot or control
 * character is not a slug, and neither is a segment of dots (`..` would leave
 * the page).
 */
const NEXT_MAX_LENGTH = 200;
const NEXT_SLUG = "((?:[A-Za-z0-9_~'-]|%[0-9A-Fa-f]{2})+)";
/** The share studio's cards (TASK-093), as `SHARE_CARDS` in `share-facts.ts` lists them. */
const STUDIO_CARD = "(?:rarity|neighbours|where|change|other|meaning|print|summary)";
const NEXT_PATTERN = new RegExp(
  `^/(?:pl/nazwisko/${NEXT_SLUG}(?:\\?view=cards|/udostepnij(?:\\?card=${STUDIO_CARD})?)?` +
    `|en/surname/${NEXT_SLUG}(?:\\?view=cards|/share(?:\\?card=${STUDIO_CARD})?)?)$`,
  "u",
);

export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || value.length > NEXT_MAX_LENGTH) return null;
  if (TREE_HOMES.has(value) || TREE_INVITATION.test(value)) return value;
  if (BABY_NAMES_HOMES.has(value) || babyNamesTypedNext(value)) return value;
  if (FULL_NAME_COMPARE_HOMES.has(value)) return value;
  const match = NEXT_PATTERN.exec(value);
  if (match === null) return null;
  const segment = match[1] ?? match[2] ?? "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  if (/[\p{C}/\\]/u.test(decoded) || /^\.*$/u.test(decoded)) return null;
  return value;
}
