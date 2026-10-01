import { createHash, timingSafeEqual } from "node:crypto";
import { isTokenShape, MailError } from "@name-atlas/accounts";
import type { Accounts, Mailer, OutgoingMail } from "@name-atlas/accounts";
import { accountPath, isAccountAction } from "./account-paths.js";
import type { AccountAction, AccountStep } from "./account-paths.js";
import type { Lang } from "./messages.js";
import {
  clearedSessionCookie,
  cookieValue,
  sessionCookie,
  sessionCookieName,
} from "./session-cookie.js";

/**
 * The account's POST routes (TASK-062, ADR-0027), as functions over an injected
 * service, mailer and clock, so every one is tested without a server, a
 * database or a network.
 *
 * What each does, and what none does:
 *
 * - **Same site only.** A POST whose `Origin` is not this site's (or, with no
 *   `Origin` or a `null` one, whose `Sec-Fetch-Site` is not `same-origin`) is refused before
 *   anything is read. Together with `SameSite=Lax` on the cookie this is the
 *   protection against another site posting a reader's session.
 * - **Answers by redirect.** Every answer is a 303 to a page with a *status
 *   word* in the query. No message, no address and no password is ever in a
 *   redirect, a response body or a log line, and a page prints its text from the
 *   word, so a crafted link can say only what the page already could.
 * - **Mail after the answer.** The service returns the message; `after` sends it
 *   once the response has gone, so how long the provider takes cannot tell a
 *   caller whether an address has an account (ADR-0027 §2.8).
 * - **No enumeration.** Sign-up and reset answer the same word for an address
 *   with an account and one without, and sign-in answers one word for a wrong
 *   password, an unknown address and a pending one.
 */

export interface AccountLog {
  info(event: string, fields?: Readonly<Record<string, string | number | boolean | null>>): void;
  warn(event: string, fields?: Readonly<Record<string, string | number | boolean | null>>): void;
}

export interface AccountRouteDeps {
  readonly accounts: Pick<
    Accounts,
    | "signUp"
    | "completeSignUp"
    | "signIn"
    | "sessionFromToken"
    | "signOut"
    | "requestPasswordReset"
    | "resetPassword"
    | "deleteAccount"
  >;
  readonly mailer: Mailer;
  /** Runs a task once the response has been sent (`after` from `next/server`). */
  readonly after: (task: () => Promise<void>) => void;
  readonly secure: boolean;
  /** The terms text's date, recorded as the version the reader accepted. */
  readonly termsVersion: string;
  readonly log: AccountLog;
}

/** A form of a few short fields: anything bigger is not one of ours. */
const MAX_BODY_BYTES = 8_192;
const FIELD_MAX = 1_024;

const NO_STORE = { "cache-control": "no-store" } as const;

/** The first value of a header that may list several (a proxy chain), trimmed, or null. */
function firstValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first ? first : null;
}

/**
 * Whether the request was made by a page of this site (see the header).
 *
 * The site's host is the one the browser asked for: `X-Forwarded-Host` where a
 * proxy sets it, else `Host`. A browser sets neither on a cross-site form, so a
 * page of another site cannot make them match its own `Origin`. The request's
 * `url` is the last resort only, because Next fills its host from the server's
 * own configuration (`localhost`), not from what the browser typed.
 */
export function isSameSiteRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  // A page whose Referrer-Policy is `no-referrer` makes the browser write
  // `Origin: null` on its own same-origin form posts. `Sec-Fetch-Site`, which a
  // page cannot set, still says where the request came from: a sandboxed or
  // opaque-origin page of another site is `cross-site`, never `same-origin`.
  if (origin === "null") return request.headers.get("sec-fetch-site") === "same-origin";
  if (origin !== null) {
    try {
      const parsed = new URL(origin);
      const web = parsed.protocol === "https:" || parsed.protocol === "http:";
      const host =
        firstValue(request.headers.get("x-forwarded-host")) ??
        firstValue(request.headers.get("host")) ??
        new URL(request.url).host;
      return web && parsed.host === host;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

async function readForm(request: Request): Promise<FormData | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return null;
  const type = request.headers.get("content-type") ?? "";
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)/iu.test(type)) return null;
  try {
    return await request.formData();
  } catch {
    return null;
  }
}

/** A text field, or "" when it is missing, not text, or too long to be one of ours. */
function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" && value.length <= FIELD_MAX ? value : "";
}

function languageOf(form: FormData): Lang {
  return field(form, "lang") === "en" ? "en" : "pl";
}

function see(path: string, cookies: readonly string[] = []): Response {
  const headers = new Headers({ location: path, ...NO_STORE });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

/** A page's status word for a password or terms problem, from the service's. */
export function problemStatus(problem: string): string {
  return problem.toLowerCase().replaceAll("_", "-");
}

function sendAfter(deps: AccountRouteDeps, mail: OutgoingMail | null): void {
  if (mail === null) return;
  deps.after(async () => {
    try {
      await deps.mailer.send(mail);
    } catch (error) {
      // The status and nothing else: not the address, not the provider's body.
      deps.log.warn("account_mail_failed", {
        status: error instanceof MailError ? error.status : null,
      });
    }
  });
}

/** The page a failed action returns to, with the token kept so the reader can try again. */
function back(step: AccountStep, lang: Lang, status: string, token?: string): Response {
  const query: Record<string, string> = { status };
  if (token !== undefined && isTokenShape(token)) query["token"] = token;
  return see(accountPath(lang, step, query));
}

async function run(
  action: AccountAction,
  form: FormData,
  request: Request,
  deps: AccountRouteDeps,
): Promise<Response> {
  const lang = languageOf(form);
  const { accounts, secure } = deps;
  const sessionToken = cookieValue(request.headers.get("cookie"), sessionCookieName(secure));

  switch (action) {
    case "sign-up": {
      const result = await accounts.signUp({ email: field(form, "email"), language: lang });
      if (result.kind === "INVALID") return back("sign-up", lang, "email");
      sendAfter(deps, result.mail);
      return back("sign-up", lang, "sent");
    }

    case "complete": {
      const token = field(form, "token");
      const result = await accounts.completeSignUp({
        token,
        password: field(form, "password"),
        termsVersion: deps.termsVersion,
        termsAccepted: field(form, "terms") !== "",
      });
      if (result.kind === "INVALID_OR_EXPIRED") return back("confirm", lang, "expired");
      if (result.kind === "INVALID") {
        return back("confirm", lang, problemStatus(result.problem), token);
      }
      deps.log.info("account_created", { userId: result.userId });
      return see(accountPath(lang, "account", { status: "welcome" }), [
        sessionCookie(result.sessionToken, secure),
      ]);
    }

    case "sign-in": {
      const result = await accounts.signIn({
        email: field(form, "email"),
        password: field(form, "password"),
      });
      if (result.kind === "THROTTLED") return back("sign-in", lang, "throttled");
      if (result.kind === "REJECTED") return back("sign-in", lang, "rejected");
      return see(accountPath(lang, "account"), [sessionCookie(result.sessionToken, secure)]);
    }

    case "sign-out": {
      try {
        await accounts.signOut(sessionToken);
      } catch (error) {
        // The row could not be ended now (it expires by itself), but this browser
        // must still stop presenting the token: the cookie is cleared regardless.
        deps.log.warn("account_sign_out_failed", {
          error: error instanceof Error ? error.name : "unknown",
        });
      }
      return see(accountPath(lang, "sign-in", { status: "signedout" }), [
        clearedSessionCookie(secure),
      ]);
    }

    case "reset-request": {
      const { mail } = await accounts.requestPasswordReset({
        email: field(form, "email"),
        language: lang,
      });
      sendAfter(deps, mail);
      return back("reset", lang, "sent");
    }

    case "reset": {
      const token = field(form, "token");
      const result = await accounts.resetPassword({
        token,
        newPassword: field(form, "password"),
      });
      if (result.kind === "INVALID_OR_EXPIRED") return back("new-password", lang, "expired");
      if (result.kind === "INVALID") {
        return back("new-password", lang, problemStatus(result.problem), token);
      }
      // Every session of the account is gone, this browser's included.
      return see(accountPath(lang, "sign-in", { status: "reset" }), [clearedSessionCookie(secure)]);
    }

    case "delete": {
      const session = await accounts.sessionFromToken(sessionToken);
      if (session === null)
        return see(accountPath(lang, "sign-in"), [clearedSessionCookie(secure)]);
      const result = await accounts.deleteAccount({
        userId: session.userId,
        password: field(form, "password"),
      });
      if (result.kind === "WRONG_PASSWORD") return back("account", lang, "wrong-password");
      deps.log.info("account_deleted", { userId: session.userId });
      return see(accountPath(lang, "sign-in", { status: "deleted" }), [
        clearedSessionCookie(secure),
      ]);
    }
  }
}

/**
 * One POST to `/api/account/<action>`. Never throws: a service or database
 * failure is a status word on the page the reader came from, and the log line
 * carries the error's *name* and nothing it says.
 */
export async function handleAccountPost(
  action: string,
  request: Request,
  deps: AccountRouteDeps,
): Promise<Response> {
  if (!isAccountAction(action))
    return new Response("Not found", { status: 404, headers: NO_STORE });
  if (!isSameSiteRequest(request)) {
    return new Response("Forbidden", { status: 403, headers: NO_STORE });
  }
  const form = await readForm(request);
  if (form === null) return new Response("Bad request", { status: 400, headers: NO_STORE });

  try {
    return await run(action, form, request, deps);
  } catch (error) {
    deps.log.warn("account_route_failed", {
      action,
      error: error instanceof Error ? error.name : "unknown",
    });
    const lang = languageOf(form);
    const token = field(form, "token");
    const page: Record<AccountAction, AccountStep> = {
      "sign-up": "sign-up",
      complete: "confirm",
      "sign-in": "sign-in",
      "sign-out": "sign-in",
      "reset-request": "reset",
      reset: "new-password",
      delete: "account",
    };
    return back(page[action], lang, "error", token === "" ? undefined : token);
  }
}

function sameSecret(given: string | null, expected: string): boolean {
  if (given === null) return false;
  // Digests, so the comparison is constant-time whatever the lengths are.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(`Bearer ${expected}`).digest();
  return timingSafeEqual(a, b);
}

/**
 * `GET /api/cron/accounts-purge`, called daily by Vercel's cron with
 * `Authorization: Bearer $CRON_SECRET`. Accounts off: 204 and nothing done.
 * Otherwise a call without the bearer is refused, and the answer carries
 * counts and nothing else.
 */
export async function handleAccountsPurge(
  request: Request,
  runtime: {
    readonly accounts: Pick<Accounts, "purgeExpired">;
    readonly cronSecret: string;
  } | null,
  log: AccountLog,
): Promise<Response> {
  if (runtime === null) return new Response(null, { status: 204, headers: NO_STORE });
  if (!sameSecret(request.headers.get("authorization"), runtime.cronSecret)) {
    return new Response("Unauthorized", { status: 401, headers: NO_STORE });
  }
  try {
    const counts = await runtime.accounts.purgeExpired();
    log.info("accounts_purged", counts);
    return Response.json(counts, { headers: NO_STORE });
  } catch (error) {
    log.warn("accounts_purge_failed", { error: error instanceof Error ? error.name : "unknown" });
    return new Response("Failed", { status: 500, headers: NO_STORE });
  }
}
