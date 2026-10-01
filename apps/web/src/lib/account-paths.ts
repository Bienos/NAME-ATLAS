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
