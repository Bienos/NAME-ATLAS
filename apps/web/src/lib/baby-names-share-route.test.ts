import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { babyCardResponse, babyCardRoute } from "./baby-names-share-route.js";
import { pngSize, shareDeps } from "./baby-names-share-test-fixtures.js";

/**
 * TASK-152 AC-1 to AC-3: the card routes' gating and the images they draw.
 * The renderer is real: `next/og` draws each card under vitest, so the size
 * and the headers of every PNG are those a reader gets.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  resetAccountsRuntimeForTests();
});

const FREE = { userId: "free" };
const PAID = { userId: "paid" };
const BOUGHT = { paid: ["babynames" as const] };

function request(
  card: string,
  query: Record<string, string>,
  session: { userId: string } | null,
  lang: "pl" | "en" = "pl",
) {
  const deps = shareDeps(BOUGHT);
  return {
    deps,
    response: babyCardResponse({
      lang,
      card,
      query,
      session,
      hostHeader: "atlas.test",
      deps,
    }),
  };
}

describe("the baby-names card routes' gating (AC-3)", () => {
  it("answer 404 without a session, reading nothing", async () => {
    const { deps, response } = request("story", { imie: "Zofia", sex: "girls" }, null);
    expect((await response).status).toBe(404);
    expect(deps.calls).toEqual({ findName: 0, readFacts: 0, hasFullView: 0 });
  });

  it("answer 404 for an unknown card, a query without a sex, and a name on no list", async () => {
    for (const [card, query] of [
      ["summary", { imie: "Zofia", sex: "girls" }],
      ["story", { imie: "Zofia" }],
      ["story", { imie: "Zofia", sex: "both" }],
      ["story", { sex: "girls" }],
      ["story", { imie: "Rara", sex: "girls" }],
      ["story", { imie: "Nikt", sex: "girls" }],
    ] as const) {
      const { response } = request(card, query, FREE);
      const answer = await response;
      expect(answer.status, JSON.stringify([card, query])).toBe(404);
      expect(answer.headers.get("content-type")).not.toMatch(/image/u);
    }
  });

  it("answer 404 for a sex the name has no count for on its latest list (never a 0 card)", async () => {
    const { response } = request("story", { imie: "Zofia", sex: "boys" }, FREE);
    expect((await response).status).toBe(404);
    const square = request("square", { imie: "Zofia", sex: "boys" }, PAID);
    expect((await square.response).status).toBe(404);
  });

  it("answer 404 for the paid card to an account without the entitlement, before any claim is read", async () => {
    const { deps, response } = request("paid", { imie: "Zofia", sex: "girls" }, FREE);
    const answer = await response;
    expect(answer.status).toBe(404);
    expect(await answer.text()).not.toMatch(/8,99|zł|kup|buy|checkout/iu);
    expect(deps.calls.hasFullView).toBe(1);
    expect(deps.calls.findName).toBe(0);
    expect(deps.calls.readFacts).toBe(0);
  });

  it("answer 404 for the paid card of a sex on no list since 2000, even to an entitled account", async () => {
    const { response } = request("paid", { imie: "Zofia", sex: "boys" }, PAID);
    expect((await response).status).toBe(404);
  });

  it("answer 404 from the route with the flag off or accounts off, before the cookie is read", async () => {
    const req = new Request(
      "https://atlas.test/pl/imiona-dla-dziecka/karta/story?imie=Zofia&sex=girls",
    );
    for (const value of [undefined, "0", "true"]) {
      vi.stubEnv("BABY_NAMES_ENABLED", value);
      const answer = await babyCardRoute(req, Promise.resolve({ card: "story" }), "pl");
      expect(answer.status, String(value)).toBe(404);
    }
    vi.stubEnv("BABY_NAMES_ENABLED", "1");
    vi.stubEnv("ACCOUNTS_DATABASE_URL", undefined);
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("GOOGLE_CLIENT_ID", undefined);
    resetAccountsRuntimeForTests();
    const off = await babyCardRoute(req, Promise.resolve({ card: "story" }), "pl");
    expect(off.status).toBe(404);
  });
});

describe("the images (AC-1, AC-2, AC-5)", () => {
  it("draw the free story card for a signed-in reader without the entitlement: 1080 × 1920 PNG, private, no-store", async () => {
    const { deps, response } = request("story", { imie: "zofia", sex: "girls" }, FREE);
    const answer = await response;
    expect(answer.status).toBe(200);
    expect(answer.headers.get("content-type")).toBe("image/png");
    expect(answer.headers.get("cache-control")).toBe("private, no-store");
    expect(pngSize(Buffer.from(await answer.arrayBuffer()))).toEqual({ width: 1080, height: 1920 });
    // The free card reads the FREE surface's facts, not the history.
    expect(deps.calls).toEqual({ findName: 1, readFacts: 1, hasFullView: 0 });
  });

  it("draw the free square card: 1080 × 1080", async () => {
    const { response } = request("square", { name: "Zofia", sex: "girls" }, FREE, "en");
    const answer = await response;
    expect(answer.status).toBe(200);
    expect(answer.headers.get("cache-control")).toBe("private, no-store");
    expect(pngSize(Buffer.from(await answer.arrayBuffer()))).toEqual({ width: 1080, height: 1080 });
  });

  it("draw the paid story card for an entitled account: 1080 × 1920, private, no-store", async () => {
    const { deps, response } = request("paid", { imie: "Zofia", sex: "girls" }, PAID);
    const answer = await response;
    expect(answer.status).toBe(200);
    expect(answer.headers.get("content-type")).toBe("image/png");
    expect(answer.headers.get("cache-control")).toBe("private, no-store");
    expect(pngSize(Buffer.from(await answer.arrayBuffer()))).toEqual({ width: 1080, height: 1920 });
    expect(deps.calls).toEqual({ findName: 1, readFacts: 1, hasFullView: 1 });
  });
});
