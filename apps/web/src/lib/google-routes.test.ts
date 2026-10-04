import { GoogleError } from "@name-atlas/accounts";
import type { GoogleIdentity } from "@name-atlas/accounts";
import { describe, expect, it, vi } from "vitest";
import { googleStartPath, safeNext } from "./account-paths.js";
import {
  flightCookie,
  googleCookieName,
  handleGoogleCallback,
  handleGoogleStart,
  readFlight,
} from "./google-routes.js";
import type { GoogleCallbackDeps } from "./google-routes.js";

const ORIGIN = "https://atlas.test";
const STATE = "A".repeat(43);
const VERIFIER = "B".repeat(43);
const SESSION = "S".repeat(43);
const TERMS_TOKEN = "T".repeat(43);
const GOOGLE = { clientId: "client.apps.googleusercontent.com", clientSecret: "shh-secret" };
const IDENTITY: GoogleIdentity = {
  subject: "1234567890",
  email: "reader.secret@example.test",
  emailVerified: true,
};

function deps(overrides: Partial<GoogleCallbackDeps> = {}) {
  const logged: { event: string; fields: unknown }[] = [];
  const signInWithGoogle = vi.fn();
  const exchange = vi.fn(() => Promise.resolve(IDENTITY));
  const d: GoogleCallbackDeps = {
    google: GOOGLE,
    origin: ORIGIN,
    secure: true,
    accounts: { signInWithGoogle } as unknown as GoogleCallbackDeps["accounts"],
    exchange,
    log: {
      info: (event, fields) => logged.push({ event, fields }),
      warn: (event, fields) => logged.push({ event, fields }),
    },
    ...overrides,
  };
  return { d, logged, signInWithGoogle, exchange };
}

function cookieFor(next: string | null, lang: "pl" | "en" = "pl"): string {
  const set = flightCookie({ state: STATE, verifier: VERIFIER, lang, next }, true);
  return set.split(";")[0] ?? "";
}

function callback(query: string, cookie: string | null): Request {
  const headers = new Headers();
  if (cookie !== null) headers.set("cookie", cookie);
  return new Request(`${ORIGIN}/api/account/google/callback?${query}`, { headers });
}

function location(response: Response): string {
  expect(response.status).toBe(303);
  return response.headers.get("location") ?? "";
}

describe("the return address (TASK-084)", () => {
  it("accepts the family tree's page as well as a surname's, and nothing else", () => {
    expect(safeNext("/pl/konto/drzewa")).toBe("/pl/konto/drzewa");
    expect(safeNext("/en/account/trees")).toBe("/en/account/trees");
    expect(safeNext("/pl/konto/drzewa/../zaloz")).toBeNull();
    expect(safeNext("//evil.test")).toBeNull();
    expect(safeNext("https://evil.test/pl/konto/drzewa")).toBeNull();
  });

  it("builds the start address with the language and the page to return to", () => {
    expect(googleStartPath("pl", "/pl/konto/drzewa")).toBe(
      "/api/account/google?lang=pl&next=%2Fpl%2Fkonto%2Fdrzewa",
    );
    expect(googleStartPath("en", null)).toBe("/api/account/google?lang=en");
  });
});

describe("starting a Google sign-in", () => {
  it("sends the browser to Google with a fresh state and PKCE, and keeps them in an HttpOnly cookie", () => {
    const tokens = [STATE, VERIFIER];
    const { d } = deps();
    const response = handleGoogleStart(
      new Request(`${ORIGIN}${googleStartPath("en", "/en/account/trees")}`),
      d,
      () => tokens.shift() ?? "",
    );
    const to = new URL(location(response));
    expect(to.host).toBe("accounts.google.com");
    expect(to.searchParams.get("state")).toBe(STATE);
    expect(to.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/account/google/callback`);
    expect(to.searchParams.get("code_challenge")).not.toBe(VERIFIER);
    expect(to.toString()).not.toContain(VERIFIER);
    expect(to.toString()).not.toContain(GOOGLE.clientSecret);

    const set = response.headers.get("set-cookie") ?? "";
    expect(set).toMatch(/^__Host-na_google=/u);
    expect(set).toContain("HttpOnly");
    expect(set).toContain("SameSite=Lax");
    expect(set).toContain("Secure");
    expect(set).toContain("Max-Age=600");
    expect(readFlight(set.split(";")[0] ?? "", true)).toEqual({
      state: STATE,
      verifier: VERIFIER,
      lang: "en",
      next: "/en/account/trees",
    });
  });

  it("drops a return address that is not one of ours", () => {
    const { d } = deps();
    const response = handleGoogleStart(
      new Request(`${ORIGIN}/api/account/google?lang=pl&next=https%3A%2F%2Fevil.test`),
      d,
    );
    const flight = readFlight((response.headers.get("set-cookie") ?? "").split(";")[0] ?? "", true);
    expect(flight?.next).toBeNull();
  });
});

describe("Google's return (the callback)", () => {
  it("signs a known reader in and goes back to the tree, clearing the flight cookie", async () => {
    const { d, signInWithGoogle, exchange } = deps();
    signInWithGoogle.mockResolvedValue({
      kind: "SIGNED_IN",
      userId: "u1",
      sessionToken: SESSION,
      expiresAt: new Date(),
    });
    const response = await handleGoogleCallback(
      callback(`code=abc&state=${STATE}`, cookieFor("/pl/konto/drzewa")),
      d,
    );
    expect(location(response)).toBe("/pl/konto/drzewa");
    expect(exchange).toHaveBeenCalledWith({
      code: "abc",
      verifier: VERIFIER,
      redirectUri: `${ORIGIN}/api/account/google/callback`,
    });
    expect(signInWithGoogle).toHaveBeenCalledWith({ identity: IDENTITY, language: "pl" });
    const cookies = response.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith(`${googleCookieName(true)}=;`))).toBe(true);
    expect(cookies.some((c) => c.startsWith(`__Host-na_session=${SESSION}`))).toBe(true);
  });

  it("sends a first sign-in to the terms step with our token, and no session", async () => {
    const { d, signInWithGoogle } = deps();
    signInWithGoogle.mockResolvedValue({ kind: "NEEDS_TERMS", token: TERMS_TOKEN });
    const response = await handleGoogleCallback(
      callback(`code=abc&state=${STATE}`, cookieFor("/en/account/trees", "en")),
      d,
    );
    expect(location(response)).toBe(
      `/en/account/welcome?token=${TERMS_TOKEN}&next=%2Fen%2Faccount%2Ftrees`,
    );
    expect(response.headers.getSetCookie().some((c) => c.includes("na_session"))).toBe(false);
  });

  it.each([
    ["no flight cookie", `code=abc&state=${STATE}`, null],
    ["another state", `code=abc&state=${"Z".repeat(43)}`, "cookie"],
    ["no state", "code=abc", "cookie"],
    ["no code", `state=${STATE}`, "cookie"],
  ])("refuses %s without asking Google", async (_label, query, cookie) => {
    const { d, exchange, signInWithGoogle } = deps();
    const response = await handleGoogleCallback(
      callback(query, cookie === null ? null : cookieFor(null)),
      d,
    );
    expect(location(response)).toBe("/pl/konto/zaloguj?status=google-failed");
    expect(exchange).not.toHaveBeenCalled();
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  it("says `google-cancelled` when the reader backs out at Google", async () => {
    const { d, exchange } = deps();
    const response = await handleGoogleCallback(
      callback(`error=access_denied&state=${STATE}`, cookieFor("/pl/konto/drzewa")),
      d,
    );
    expect(location(response)).toBe(
      "/pl/konto/zaloguj?status=google-cancelled&next=%2Fpl%2Fkonto%2Fdrzewa",
    );
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each([
    ["UNVERIFIED", "google-unverified"],
    ["OTHER_GOOGLE", "google-other"],
  ])("answers %s with its own word", async (kind, word) => {
    const { d, signInWithGoogle } = deps();
    signInWithGoogle.mockResolvedValue({ kind });
    const response = await handleGoogleCallback(
      callback(`code=abc&state=${STATE}`, cookieFor(null)),
      d,
    );
    expect(location(response)).toBe(`/pl/konto/zaloguj?status=${word}`);
  });

  it("logs a failed exchange by its kind alone: no code, no address", async () => {
    const { d, logged } = deps({
      exchange: () => Promise.reject(new GoogleError("EXCHANGE")),
    });
    const response = await handleGoogleCallback(
      callback(`code=secret-code&state=${STATE}`, cookieFor(null)),
      d,
    );
    expect(location(response)).toBe("/pl/konto/zaloguj?status=google-failed");
    expect(logged).toEqual([{ event: "google_sign_in_failed", fields: { error: "EXCHANGE" } }]);
    expect(JSON.stringify(logged)).not.toContain("secret-code");
    expect(location(response)).not.toContain("secret-code");
  });

  it("logs nothing Google sent when the service fails", async () => {
    const { d, signInWithGoogle, logged } = deps();
    signInWithGoogle.mockRejectedValue(new Error(`boom ${IDENTITY.email}`));
    const response = await handleGoogleCallback(
      callback(`code=abc&state=${STATE}`, cookieFor(null)),
      d,
    );
    expect(location(response)).toBe("/pl/konto/zaloguj?status=google-failed");
    expect(JSON.stringify(logged)).not.toContain(IDENTITY.email);
  });
});
