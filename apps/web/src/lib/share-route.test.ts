import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ShareFacts from "./share-facts.js";

const answerSlug = vi.hoisted(() => vi.fn());
const shareFacts = vi.hoisted(() => vi.fn());
const renderShareCard = vi.hoisted(() => vi.fn());

vi.mock("./surname-page.js", () => ({ answerSlug, requestOrigin: () => "https://atlas.test" }));
vi.mock("./share-facts.js", async (importOriginal) => ({
  ...(await importOriginal<typeof ShareFacts>()),
  shareFacts,
}));
vi.mock("./share-card.js", () => ({ renderShareCard }));

const { shareCardResponse } = await import("./share-route.js");

const PUBLIC_CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

beforeEach(() => {
  answerSlug.mockReset();
  shareFacts.mockReset();
  renderShareCard.mockReset();
  answerSlug.mockResolvedValue({ kind: "RESULT", response: {} });
  shareFacts.mockReturnValue({ card: "summary" });
  // The real renderer draws a PNG; what matters here is the headers it is given.
  renderShareCard.mockImplementation(
    (_facts: unknown, _host: unknown, headers: Record<string, string>) =>
      new Response("png", { status: 200, headers: { "Content-Type": "image/png", ...headers } }),
  );
});

describe("the share-card route with accounts off (TASK-064, AC-1)", () => {
  it("is as it was: public, cached at the edge, no gate argument needed", async () => {
    const response = await shareCardResponse("kowalski", "summary", "pl", "atlas.test");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(PUBLIC_CACHE);
    expect(answerSlug).toHaveBeenCalledTimes(1);
    const explicit = await shareCardResponse("kowalski", "summary", "pl", "atlas.test", "off");
    expect(explicit.headers.get("cache-control")).toBe(PUBLIC_CACHE);
  });
});

describe("the share-card route with accounts on (TASK-064, AC-2, AC-3, AC-4)", () => {
  it("answers 401 with no cache and a challenge, and never reads the register", async () => {
    const response = await shareCardResponse("kowalski", "summary", "pl", "atlas.test", "sign-in");
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("www-authenticate")).toMatch(/^Cookie /u);
    expect(response.headers.get("content-type")).not.toMatch(/image/u);
    expect(answerSlug).not.toHaveBeenCalled();
    expect(renderShareCard).not.toHaveBeenCalled();
  });

  it("answers 503 with no cache when the accounts database cannot say, and never reads the register", async () => {
    const response = await shareCardResponse(
      "kowalski",
      "summary",
      "en",
      "atlas.test",
      "unavailable",
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("60");
    expect(answerSlug).not.toHaveBeenCalled();
  });

  it("serves the image to a session, and lets no shared cache keep it", async () => {
    const response = await shareCardResponse("kowalski", "summary", "pl", "atlas.test", "open");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("cache-control")).not.toContain("public");
    expect(response.headers.get("cache-control")).not.toContain("s-maxage");
    expect(answerSlug).toHaveBeenCalledTimes(1);
  });

  it("is a 404 for a card that does not exist, whatever the verdict, before the gate or the register", async () => {
    for (const gate of ["off", "open", "sign-in", "unavailable"] as const) {
      const response = await shareCardResponse("kowalski", "horoscope", "pl", null, gate);
      expect(response.status, gate).toBe(404);
    }
    expect(answerSlug).not.toHaveBeenCalled();
  });

  it("keeps the register's own answers for a session: unknown, retired and not-ready", async () => {
    answerSlug.mockResolvedValueOnce({ kind: "NOT_FOUND" });
    expect((await shareCardResponse("x", "summary", "pl", null, "open")).status).toBe(404);
    answerSlug.mockResolvedValueOnce({ kind: "UNAVAILABLE" });
    expect((await shareCardResponse("x", "summary", "pl", null, "open")).status).toBe(503);
    answerSlug.mockResolvedValueOnce({ kind: "MOVED", current_slug: "nowak" });
    const moved = await shareCardResponse("x", "summary", "en", null, "open");
    expect(moved.status).toBe(308);
    expect(moved.headers.get("location")).toBe("/en/surname/nowak/card/summary");
    shareFacts.mockReturnValueOnce(null);
    expect((await shareCardResponse("x", "rarity", "pl", null, "open")).status).toBe(404);
  });
});
