import { describe, expect, it } from "vitest";
import {
  exchangeGoogleCode,
  GOOGLE_TOKEN_URL,
  GoogleError,
  googleAuthorizeUrl,
  identityFromIdToken,
  loadGoogleConfig,
  pkceChallenge,
} from "./google.js";

const CONFIG = { clientId: "client-123.apps.googleusercontent.com", clientSecret: "secret-xyz" };
const NOW = new Date("2026-10-04T12:00:00.000Z");
const SECONDS = NOW.getTime() / 1000;

/** An unsigned JWT with these claims: the signature part is never read (ADR-0033 §2.3). */
function jwt(claims: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256", typ: "JWT" })}.${part(claims)}.c2lnbmF0dXJl`;
}

const GOOD = {
  iss: "https://accounts.google.com",
  aud: CONFIG.clientId,
  sub: "110169484474386276334",
  email: "anna.nowak@example.com",
  email_verified: true,
  iat: SECONDS - 10,
  exp: SECONDS + 3600,
  name: "Anna Nowak",
  picture: "https://example.com/a.png",
};

describe("loadGoogleConfig", () => {
  it("needs both variables", () => {
    expect(loadGoogleConfig({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b" })).toEqual({
      clientId: "a",
      clientSecret: "b",
    });
    expect(loadGoogleConfig({ GOOGLE_CLIENT_ID: "a" })).toBeNull();
    expect(loadGoogleConfig({ GOOGLE_CLIENT_ID: " ", GOOGLE_CLIENT_SECRET: "b" })).toBeNull();
  });
});

describe("pkceChallenge", () => {
  it("is RFC 7636's S256 (appendix B's example)", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});

describe("googleAuthorizeUrl", () => {
  it("asks for the code flow with PKCE, the state and only openid and email", () => {
    const url = new URL(
      googleAuthorizeUrl({
        config: CONFIG,
        redirectUri: "https://name-atlas.pl/api/account/google/callback",
        state: "state-1",
        verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        language: "pl",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const q = url.searchParams;
    expect(q.get("client_id")).toBe(CONFIG.clientId);
    expect(q.get("response_type")).toBe("code");
    expect(q.get("scope")).toBe("openid email");
    expect(q.get("state")).toBe("state-1");
    expect(q.get("code_challenge")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.get("redirect_uri")).toBe("https://name-atlas.pl/api/account/google/callback");
    expect(url.toString()).not.toContain(CONFIG.clientSecret);
  });
});

describe("identityFromIdToken", () => {
  it("keeps the subject, the address and whether it is verified, and nothing else", () => {
    expect(identityFromIdToken(jwt(GOOD), CONFIG.clientId, NOW)).toEqual({
      subject: GOOD.sub,
      email: GOOD.email,
      emailVerified: true,
    });
  });

  it("accepts the issuer without its scheme and a string 'true'", () => {
    const identity = identityFromIdToken(
      jwt({ ...GOOD, iss: "accounts.google.com", email_verified: "true" }),
      CONFIG.clientId,
      NOW,
    );
    expect(identity.emailVerified).toBe(true);
  });

  it("reports an unverified address as such", () => {
    const identity = identityFromIdToken(
      jwt({ ...GOOD, email_verified: false }),
      CONFIG.clientId,
      NOW,
    );
    expect(identity.emailVerified).toBe(false);
  });

  it.each([
    ["another issuer", { iss: "https://evil.example" }],
    ["another audience", { aud: "someone-else" }],
    ["several audiences without azp", { aud: [CONFIG.clientId, "other"] }],
    ["an expired token", { exp: SECONDS - 1 }],
    ["a token issued in the future", { iat: SECONDS + 3600 }],
    ["no subject", { sub: undefined }],
    ["no address", { email: undefined }],
  ])("refuses %s", (_label, change) => {
    expect(() => identityFromIdToken(jwt({ ...GOOD, ...change }), CONFIG.clientId, NOW)).toThrow(
      GoogleError,
    );
  });

  it("accepts several audiences when azp is this client", () => {
    const token = jwt({ ...GOOD, aud: [CONFIG.clientId, "other"], azp: CONFIG.clientId });
    expect(identityFromIdToken(token, CONFIG.clientId, NOW).subject).toBe(GOOD.sub);
  });

  it.each(["", "abc", "a.b", "a.!!!.c", `a.${Buffer.from("[1]").toString("base64url")}.c`])(
    "refuses a malformed token %j",
    (token) => {
      expect(() => identityFromIdToken(token, CONFIG.clientId, NOW)).toThrow(GoogleError);
    },
  );
});

describe("exchangeGoogleCode", () => {
  function fakeFetch(respond: () => Response | Promise<Response>) {
    const calls: { url: string; init: RequestInit }[] = [];
    const fn = ((url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return Promise.resolve(respond());
    }) as typeof fetch;
    return { fn, calls };
  }

  it("posts the code, the verifier and the client's credentials, and reads the ID token", async () => {
    const { fn, calls } = fakeFetch(() =>
      Response.json({ id_token: jwt(GOOD), access_token: "x" }),
    );
    const identity = await exchangeGoogleCode({
      config: CONFIG,
      code: "code-1",
      verifier: "verifier-1",
      redirectUri: "https://name-atlas.pl/api/account/google/callback",
      now: NOW,
      fetch: fn,
    });
    expect(identity.subject).toBe(GOOD.sub);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(GOOGLE_TOKEN_URL);
    const body = new URLSearchParams(String(calls[0]?.init.body));
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code-1");
    expect(body.get("code_verifier")).toBe("verifier-1");
    expect(body.get("client_secret")).toBe(CONFIG.clientSecret);
  });

  it("is EXCHANGE when Google refuses the code or cannot be reached", async () => {
    const refused = fakeFetch(() => Response.json({ error: "invalid_grant" }, { status: 400 }));
    await expect(
      exchangeGoogleCode({
        config: CONFIG,
        code: "c",
        verifier: "v",
        redirectUri: "r",
        now: NOW,
        fetch: refused.fn,
      }),
    ).rejects.toMatchObject({ problem: "EXCHANGE" });
    const down = (() => Promise.reject(new TypeError("fetch failed"))) as typeof fetch;
    await expect(
      exchangeGoogleCode({
        config: CONFIG,
        code: "c",
        verifier: "v",
        redirectUri: "r",
        now: NOW,
        fetch: down,
      }),
    ).rejects.toMatchObject({ problem: "EXCHANGE" });
  });

  it("is TOKEN when the answer has no ID token", async () => {
    const { fn } = fakeFetch(() => Response.json({ access_token: "x" }));
    await expect(
      exchangeGoogleCode({
        config: CONFIG,
        code: "c",
        verifier: "v",
        redirectUri: "r",
        now: NOW,
        fetch: fn,
      }),
    ).rejects.toMatchObject({ problem: "TOKEN" });
  });
});
