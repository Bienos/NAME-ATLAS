import type { Lang } from "./messages.js";

/**
 * The couple first-names page (TASK-156, ADR-0047): "Co mówią Wasze imiona
 * razem". Two first names' sourced origins and meanings side by side and, on
 * request, a reading of the two meanings written by a model from the claims
 * alone. Signed-in only; free with an account for now (ADR-0047 §2.2, §2.6).
 *
 * On only when `COUPLE_NAMES_ENABLED` is exactly `1` and accounts are on.
 * Otherwise both pages and the `POST` route answer 404 and nothing links to
 * them: the meanings are not on production yet (migration 0044).
 *
 * Reads the variable by name and imports nothing that reaches the database,
 * so the middleware and the pages can both use it.
 */

export const COUPLE_NAMES_ENV = "COUPLE_NAMES_ENABLED";

/** The page's two addresses, without their query. */
export const COUPLE_NAMES_PATHS = { pl: "/pl/imiona-pary", en: "/en/couple-names" } as const;

/** The button's route: `POST` with `a`, `b` and `lang`, answering 303 back to the page. */
export const COUPLE_NAMES_API_PATH = "/api/couple-names";

/** Sent with both pages, on or off: the page is one signed-in reader's and never cached. */
export const COUPLE_NAMES_CACHE_CONTROL = "private, no-store";

/** The two names' fields, in the query and in the button's form: `?a=ANNA&b=JAN`. */
export const COUPLE_NAMES_FIELDS = { a: "a", b: "b" } as const;

/** What the route says on its way back: `?reading=failed`, `limit`, `unavailable`. */
export const COUPLE_NAMES_STATUS_FIELD = "reading";
export type ReadingStatus = "failed" | "limit" | "unavailable";
export const READING_STATUSES: readonly ReadingStatus[] = ["failed", "limit", "unavailable"];

/**
 * New readings a UTC day may add, all readers together (ADR-0047 §2.7): a
 * cost cap, nothing else. A stored reading is shown without a call, so the
 * cap counts model calls that succeeded, not page views.
 */
export const COUPLE_NAMES_DAILY_CAP = 200;

/**
 * The model (ADR-0013: OpenAI; ADR-0047 §2.7: a current small model). The one
 * OpenAI's model list named for cost-sensitive work on 2026-10-06. Stored with
 * every reading, so a change here never rewrites one.
 */
export const COUPLE_NAMES_MODEL = "gpt-6-luna";

/** The prompt's version, part of a reading's key: a new prompt makes new readings and keeps the old. */
export const COUPLE_NAMES_PROMPT_VERSION = "couple_names_reading@1";

/** Room for two texts of at most 220 words each, and nothing like a page. */
export const COUPLE_NAMES_MAX_OUTPUT_TOKENS = 1_500;

/** A text the page shows is this long, in words, each language: ADR-0047 §2.3 asks for 120–220. */
export const READING_WORDS = { min: 80, max: 260 } as const;

/**
 * What no message of the page, no rendered page and no stored reading may
 * contain (TASK-100 §3.4, ADR-0035 §2.3, ADR-0047 §2.3): any word that
 * judges whether the names suit each other, any score, percentage or heart.
 * Matched on the lower-cased text. `zgodn(?!ie)` keeps "zgodnie z" (according
 * to), which judges nothing.
 */
export const COUPLE_NAMES_BANNED: readonly RegExp[] = [
  /pasuj/u,
  /pasow/u,
  /zgodn(?!ie)/u,
  /idealn/u,
  /stworz\p{L}* dla siebie/u,
  /procent/u,
  /%/u,
  /match/u,
  /compatib/u,
  /made for each other/u,
  /belong together/u,
  /suit(?:s|ed)? each other/u,
  /perfect/u,
  /\bscore/u,
  /percent/u,
  /[♥❤💕💞💘💖]/u,
];

type Env = Readonly<Record<string, string | undefined>>;

export function coupleNamesEnabled(env: Env = process.env): boolean {
  return env[COUPLE_NAMES_ENV] === "1";
}

/** Whether a request path is one of the page's two addresses. */
export function isCoupleNamesPath(pathname: string): boolean {
  return pathname === COUPLE_NAMES_PATHS.pl || pathname === COUPLE_NAMES_PATHS.en;
}

/** `/pl/imiona-pary?a=…&b=…`, with the route's status word where there is one. */
export function coupleNamesPath(lang: Lang, a: string, b: string, status?: ReadingStatus): string {
  const query = new URLSearchParams({ [COUPLE_NAMES_FIELDS.a]: a, [COUPLE_NAMES_FIELDS.b]: b });
  if (status !== undefined) query.set(COUPLE_NAMES_STATUS_FIELD, status);
  return `${COUPLE_NAMES_PATHS[lang]}?${query.toString()}`;
}

export function readingStatusOf(value: string | undefined): ReadingStatus | null {
  return READING_STATUSES.find((s) => s === value) ?? null;
}

export function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/u).length;
}

export type ReadingCheck =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "BANNED" | "DIGIT" | "SHORT" | "LONG";
      readonly detail: string;
    };

/**
 * Whether a text may be shown as a reading: none of the banned patterns, no
 * digit (a year, a page, a count or a score would all be one), and a length
 * near what the prompt asked for. The route runs it on each language's text
 * before storing; the tests run it on the page's own words too.
 */
export function checkReading(text: string): ReadingCheck {
  const lower = text.normalize("NFC").toLowerCase();
  for (const pattern of COUPLE_NAMES_BANNED) {
    const hit = pattern.exec(lower);
    if (hit !== null) return { ok: false, reason: "BANNED", detail: hit[0] };
  }
  const digit = /\p{Nd}/u.exec(lower);
  if (digit !== null) return { ok: false, reason: "DIGIT", detail: digit[0] };
  const words = countWords(text);
  if (words < READING_WORDS.min) return { ok: false, reason: "SHORT", detail: String(words) };
  if (words > READING_WORDS.max) return { ok: false, reason: "LONG", detail: String(words) };
  return { ok: true };
}
