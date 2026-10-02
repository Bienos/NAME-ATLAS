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

export type AccountStep = "account" | "sign-in" | "sign-up" | "reset" | "confirm" | "new-password";

export const ACCOUNT_STEPS: readonly AccountStep[] = [
  "account",
  "sign-in",
  "sign-up",
  "reset",
  "confirm",
  "new-password",
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
  },
  en: {
    account: "",
    "sign-in": "sign-in",
    "sign-up": "sign-up",
    reset: "reset",
    confirm: "confirm",
    "new-password": "new-password",
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
  "sign-up" | "complete" | "sign-in" | "sign-out" | "reset-request" | "reset" | "delete";

export const ACCOUNT_ACTIONS: readonly AccountAction[] = [
  "sign-up",
  "complete",
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

/**
 * Where a sign-in may send the reader on (TASK-064): the surname page they came
 * from, which the deck's prompt names, and nothing else. It is checked again
 * by the sign-in action, because a form field can say anything, and a redirect
 * to an address a stranger chose is how a sign-in page is turned into a trap.
 *
 * Only a surname's page of this site is accepted, `/pl/nazwisko/{slug}` or
 * `/en/surname/{slug}`, with `?view=cards` if the deck was open. The slug is
 * one path segment as `canonicalSlug` writes it (letters percent-encoded, the
 * apostrophe and hyphen kept); an encoded slash, backslash, dot or control
 * character is not a slug, and neither is a segment of dots (`..` would leave
 * the page).
 */
const NEXT_MAX_LENGTH = 200;
const NEXT_PATTERN =
  /^\/(?:pl\/nazwisko|en\/surname)\/((?:[A-Za-z0-9_~'-]|%[0-9A-Fa-f]{2})+)(?:\?view=cards)?$/u;

export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || value.length > NEXT_MAX_LENGTH) return null;
  const match = NEXT_PATTERN.exec(value);
  if (match === null) return null;
  const segment = match[1] ?? "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  if (/[\p{C}/\\]/u.test(decoded) || /^\.*$/u.test(decoded)) return null;
  return value;
}
