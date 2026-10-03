import { createHash, timingSafeEqual } from "node:crypto";
import {
  exchangeGoogleCode,
  GoogleError,
  googleAuthorizeUrl,
  isTokenShape,
  newToken,
} from "@name-atlas/accounts";
import type { Accounts, GoogleConfig, GoogleIdentity } from "@name-atlas/accounts";
import { accountPath, GOOGLE_CALLBACK_PATH, safeNext } from "./account-paths.js";
import type { AccountLog } from "./account-routes.js";
import type { Lang } from "./messages.js";
import { cookieValue, sessionCookie } from "./session-cookie.js";

/**
 * Google sign-in's two GET routes (TASK-084, ADR-0033), as functions over an
 * injected service, configuration and token exchange, so both are tested
 * without a server, a database or Google.
 *
 * - `GET /api/account/google?lang=pl&next=…` makes a fresh `state` and PKCE
 *   verifier, keeps them in a ten-minute `HttpOnly` cookie with the language
 *   and the checked `next`, and sends the browser to Google.
 * - `GET /api/account/google/callback?code=…&state=…` is where Google sends
 *   it back. The `state` must match the cookie's (so another site cannot finish
 *   a sign-in it started in this browser), and the code is redeemed with the
 *   cookie's verifier. The cookie is cleared on every answer.
 *
 * As the POST routes, every answer is a 303 to a page with a status word, and
 * nothing Google sent (the code, the address, the subject) is logged or put in
 * an address. The one exception is the terms step's own token, which is ours.
 */

export interface GoogleRouteDeps {
  readonly google: GoogleConfig;
  /** The site's absolute origin (`SITE_ORIGIN`): Google's return address is built from it. */
  readonly origin: string;
  readonly secure: boolean;
  readonly log: AccountLog;
}

export interface GoogleCallbackDeps extends GoogleRouteDeps {
  readonly accounts: Pick<Accounts, "signInWithGoogle">;
  readonly now?: () => Date;
  /** Test seam: redeems the code. Defaults to `exchangeGoogleCode` over `fetch`. */
  readonly exchange?: (input: {
    readonly code: string;
    readonly verifier: string;
    readonly redirectUri: string;
  }) => Promise<GoogleIdentity>;
}

/** How long the round trip to Google may take. */
export const GOOGLE_COOKIE_SECONDS = 600;

const NO_STORE = { "cache-control": "no-store" } as const;

export function googleCookieName(secure: boolean): string {
  return secure ? "__Host-na_google" : "na_google";
}

function cookieAttributes(secure: boolean, maxAge: number): string {
  return `Path=/; Max-Age=${String(maxAge)}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

interface Flight {
  readonly state: string;
  readonly verifier: string;
  readonly lang: Lang;
  readonly next: string | null;
}

/** The cookie's value: four fields joined by dots; the tokens are base64url and `next` is percent-encoded. */
export function flightCookie(flight: Flight, secure: boolean): string {
  const value = [
    flight.state,
    flight.verifier,
    flight.lang,
    encodeURIComponent(flight.next ?? ""),
  ].join(".");
  return `${googleCookieName(secure)}=${value}; ${cookieAttributes(secure, GOOGLE_COOKIE_SECONDS)}`;
}

export function clearedFlightCookie(secure: boolean): string {
  return `${googleCookieName(secure)}=; ${cookieAttributes(secure, 0)}`;
}

/** The flight a cookie carries, or null for a missing or malformed one. */
export function readFlight(header: string | null, secure: boolean): Flight | null {
  const value = cookieValue(header, googleCookieName(secure));
  if (value === null) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [state, verifier, lang, encodedNext] = parts as [string, string, string, string];
  if (!isTokenShape(state) || !isTokenShape(verifier)) return null;
  if (lang !== "pl" && lang !== "en") return null;
  let next: string | null = null;
  if (encodedNext !== "") {
    try {
      next = safeNext(decodeURIComponent(encodedNext));
    } catch {
      next = null;
    }
  }
  return { state, verifier, lang, next };
}

function see(path: string, cookies: readonly string[]): Response {
  const headers = new Headers({ location: path, ...NO_STORE });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

function sameState(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function googleRedirectUri(origin: string): string {
  return `${origin}${GOOGLE_CALLBACK_PATH}`;
}

/** `GET /api/account/google`: to Google, with a fresh state and verifier in the cookie. */
export function handleGoogleStart(
  request: Request,
  deps: GoogleRouteDeps,
  makeToken: () => string = () => newToken(),
): Response {
  const url = new URL(request.url);
  const lang: Lang = url.searchParams.get("lang") === "en" ? "en" : "pl";
  const flight: Flight = {
    state: makeToken(),
    verifier: makeToken(),
    lang,
    next: safeNext(url.searchParams.get("next")),
  };
  const to = googleAuthorizeUrl({
    config: deps.google,
    redirectUri: googleRedirectUri(deps.origin),
    state: flight.state,
    verifier: flight.verifier,
    language: lang,
  });
  return see(to, [flightCookie(flight, deps.secure)]);
}

/** `GET /api/account/google/callback`. Never throws. */
export async function handleGoogleCallback(
  request: Request,
  deps: GoogleCallbackDeps,
): Promise<Response> {
  const { secure } = deps;
  const cleared = clearedFlightCookie(secure);
  const flight = readFlight(request.headers.get("cookie"), secure);
  const lang: Lang = flight?.lang ?? "pl";
  const next = flight?.next ?? null;
  const toSignIn = (status: string) => {
    const query: Record<string, string> = { status };
    if (next !== null) query["next"] = next;
    return see(accountPath(lang, "sign-in", query), [cleared]);
  };

  const params = new URL(request.url).searchParams;
  const state = params.get("state");
  if (flight === null || state === null || !sameState(state, flight.state)) {
    deps.log.warn("google_state_mismatch", { cookie: flight !== null });
    return toSignIn("google-failed");
  }
  // The reader closed Google's screen or refused: not a failure of ours.
  if (params.get("error") !== null) return toSignIn("google-cancelled");
  const code = params.get("code");
  if (code === null || code === "" || code.length > 2_048) return toSignIn("google-failed");

  try {
    const redirectUri = googleRedirectUri(deps.origin);
    const identity =
      deps.exchange === undefined
        ? await exchangeGoogleCode({
            config: deps.google,
            code,
            verifier: flight.verifier,
            redirectUri,
            now: (deps.now ?? (() => new Date()))(),
          })
        : await deps.exchange({ code, verifier: flight.verifier, redirectUri });

    const result = await deps.accounts.signInWithGoogle({ identity, language: lang });
    switch (result.kind) {
      case "SIGNED_IN":
        return see(next ?? accountPath(lang, "account"), [
          cleared,
          sessionCookie(result.sessionToken, secure),
        ]);
      case "NEEDS_TERMS": {
        const query: Record<string, string> = { token: result.token };
        if (next !== null) query["next"] = next;
        return see(accountPath(lang, "welcome", query), [cleared]);
      }
      case "UNVERIFIED":
        return toSignIn("google-unverified");
      case "OTHER_GOOGLE":
        return toSignIn("google-other");
    }
  } catch (error) {
    deps.log.warn("google_sign_in_failed", {
      error:
        error instanceof GoogleError
          ? error.problem
          : error instanceof Error
            ? error.name
            : "unknown",
    });
    return toSignIn("google-failed");
  }
}
