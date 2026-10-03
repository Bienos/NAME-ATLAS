import { createHash } from "node:crypto";

/**
 * Google sign-in (TASK-084, ADR-0033): OpenID Connect's authorization-code flow
 * with PKCE, by hand, over `fetch`. No library and no hosted identity service.
 *
 * The ID token is taken from Google's token endpoint, over TLS, in exchange for
 * a code that only this site's secret and this browser's PKCE verifier can
 * redeem. OpenID Connect Core §3.1.3.7 allows the TLS validation of that
 * endpoint to stand in for checking the token's signature in this case, so the
 * token is decoded, not verified against Google's keys; its issuer, audience
 * and expiry are still checked (ADR-0033 §2.3). A token from anywhere else (a
 * form, a query, a cookie) is never accepted.
 *
 * Only three claims are kept: `sub` (the account's stable identifier), `email`
 * and whether Google has verified it. The name, the picture and Google's own
 * tokens are dropped here and never stored.
 */

export interface GoogleConfig {
  readonly clientId: string;
  readonly clientSecret: string;
}

export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS: ReadonlySet<string> = new Set([
  "https://accounts.google.com",
  "accounts.google.com",
]);
/** How far Google's clock may run ahead of ours before a token is "not yet issued". */
const CLOCK_SKEW_SECONDS = 300;
const TOKEN_TIMEOUT_MS = 10_000;

/** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, both or neither: missing either, Google sign-in is off. */
export function loadGoogleConfig(env: NodeJS.ProcessEnv = process.env): GoogleConfig | null {
  const clientId = env["GOOGLE_CLIENT_ID"]?.trim();
  const clientSecret = env["GOOGLE_CLIENT_SECRET"]?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** PKCE's S256 challenge (RFC 7636 §4.2) of a verifier. */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

/** Where the browser is sent to choose a Google account. */
export function googleAuthorizeUrl(input: {
  readonly config: GoogleConfig;
  readonly redirectUri: string;
  readonly state: string;
  readonly verifier: string;
  readonly language: "pl" | "en";
}): string {
  const query = new URLSearchParams({
    client_id: input.config.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email",
    state: input.state,
    code_challenge: pkceChallenge(input.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
    hl: input.language,
  });
  return `${GOOGLE_AUTHORIZE_URL}?${query.toString()}`;
}

export interface GoogleIdentity {
  readonly subject: string;
  readonly email: string;
  readonly emailVerified: boolean;
}

export type GoogleProblem =
  /** The token endpoint refused the code, or could not be reached. */
  | "EXCHANGE"
  /** The answer carried no ID token, or one whose claims do not hold. */
  | "TOKEN";

export class GoogleError extends Error {
  constructor(readonly problem: GoogleProblem) {
    super(`google sign-in failed: ${problem}`);
    this.name = "GoogleError";
  }
}

function payloadOf(idToken: string): Record<string, unknown> {
  const parts = idToken.split(".");
  if (parts.length !== 3 || parts[1] === undefined) throw new GoogleError("TOKEN");
  try {
    const parsed: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new GoogleError("TOKEN");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new GoogleError("TOKEN");
  }
}

/**
 * The identity an ID token names, once its claims are checked against this
 * site's client and the clock. Throws `GoogleError("TOKEN")` otherwise.
 */
export function identityFromIdToken(idToken: string, clientId: string, now: Date): GoogleIdentity {
  const claims = payloadOf(idToken);
  const seconds = Math.floor(now.getTime() / 1000);
  const { iss, aud, exp, iat, sub, email, email_verified: verified } = claims;
  const audiences = Array.isArray(aud) ? aud : [aud];
  const ok =
    typeof iss === "string" &&
    ISSUERS.has(iss) &&
    audiences.includes(clientId) &&
    (audiences.length === 1 || claims["azp"] === clientId) &&
    typeof exp === "number" &&
    exp > seconds &&
    (iat === undefined || (typeof iat === "number" && iat <= seconds + CLOCK_SKEW_SECONDS)) &&
    typeof sub === "string" &&
    sub.length >= 1 &&
    sub.length <= 255 &&
    typeof email === "string" &&
    email.length <= 254;
  if (!ok) throw new GoogleError("TOKEN");
  return {
    subject: sub,
    email,
    emailVerified: verified === true || verified === "true",
  };
}

/** Redeems the callback's code at Google's token endpoint and returns the identity it names. */
export async function exchangeGoogleCode(input: {
  readonly config: GoogleConfig;
  readonly code: string;
  readonly verifier: string;
  readonly redirectUri: string;
  readonly now: Date;
  readonly fetch?: typeof fetch;
}): Promise<GoogleIdentity> {
  const call = input.fetch ?? fetch;
  let response: Response;
  try {
    response = await call(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: input.code,
        code_verifier: input.verifier,
        redirect_uri: input.redirectUri,
        client_id: input.config.clientId,
        client_secret: input.config.clientSecret,
      }).toString(),
      signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
    });
  } catch {
    throw new GoogleError("EXCHANGE");
  }
  if (!response.ok) throw new GoogleError("EXCHANGE");
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GoogleError("TOKEN");
  }
  const idToken =
    typeof body === "object" && body !== null
      ? (body as { id_token?: unknown }).id_token
      : undefined;
  if (typeof idToken !== "string") throw new GoogleError("TOKEN");
  return identityFromIdToken(idToken, input.config.clientId, input.now);
}
