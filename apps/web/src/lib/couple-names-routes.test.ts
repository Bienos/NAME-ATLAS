import { describe, expect, it, vi } from "vitest";
import { LlmError } from "@name-atlas/llm";
import type { CompleteJsonInput } from "@name-atlas/llm";
import type { BirthNameLookup, ReadingKey, StoredReading } from "@name-atlas/truth";
import { COUPLE_NAMES_BANNED } from "./couple-names-config.js";
import {
  ANNA_MEANING,
  MALGORZATA_MEANING,
  PIOTR_MEANING,
  SAMPLE_EN,
  SAMPLE_PL,
} from "./couple-names-fixture.js";
import { handleCoupleNamesPost, startOfUtcDay } from "./couple-names-routes.js";
import type { CoupleNamesRouteDeps } from "./couple-names-routes.js";

/**
 * TASK-156 AC-2 to AC-5: the page's button as a function over fakes: a
 * session store, the names, their meanings, a readings store in memory and
 * a model that answers what the test says. No network, no database.
 */

const ORIGIN = "https://atlas.test";
const SESSION = "S".repeat(43);
const USER = "0199a1b2-0000-7000-8000-00000000aa11";
const NAMES: Record<string, { id: string; display_name: string }> = {
  MAŁGORZATA: { id: "id-malgorzata", display_name: "MAŁGORZATA" },
  PIOTR: { id: "id-piotr", display_name: "PIOTR" },
  ANNA: { id: "id-anna", display_name: "ANNA" },
};

function fakes(
  options: {
    readonly answers?: readonly (unknown | Error)[];
    readonly noKey?: boolean;
    readonly stored?: number;
    readonly cap?: number;
  } = {},
) {
  const store: StoredReading[] = [];
  const answers = [...(options.answers ?? [{ pl: SAMPLE_PL, en: SAMPLE_EN }])];
  const complete = vi.fn((_input: CompleteJsonInput) => {
    const next = answers.shift();
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve({
      value: next,
      usage: { input_tokens: 300, output_tokens: 400 },
      model: "test-model-2026",
    });
  });
  const logged: { event: string; fields: unknown }[] = [];
  let ids = 0;
  const deps: CoupleNamesRouteDeps = {
    accounts: {
      sessionFromToken: vi.fn((token: unknown) =>
        Promise.resolve(token === SESSION ? { userId: USER, email: "reader@example.com" } : null),
      ) as unknown as CoupleNamesRouteDeps["accounts"]["sessionFromToken"],
    },
    secure: true,
    findName: (typed): Promise<BirthNameLookup> => {
      const name = NAMES[typed.trim().toUpperCase()];
      return Promise.resolve(
        name === undefined ? { kind: "NOT_FOUND" } : { kind: "FOUND", given_name: name },
      );
    },
    readMeaning: (id) =>
      Promise.resolve(
        id === "id-malgorzata"
          ? MALGORZATA_MEANING
          : id === "id-piotr"
            ? PIOTR_MEANING
            : ANNA_MEANING,
      ),
    findReading: (key: ReadingKey) =>
      Promise.resolve(
        store.find(
          (r) =>
            r.given_name_a_id === key.a.given_name_id &&
            r.given_name_b_id === key.b.given_name_id &&
            r.claim_a_id === key.a.claim_id &&
            r.claim_b_id === key.b.claim_id &&
            r.prompt_version === key.prompt_version,
        ) ?? null,
      ),
    storeReading: (key, reading) => {
      const row: StoredReading = {
        reading_id: reading.reading_id,
        given_name_a_id: key.a.given_name_id,
        given_name_b_id: key.b.given_name_id,
        claim_a_id: key.a.claim_id,
        claim_b_id: key.b.claim_id,
        prompt_version: key.prompt_version,
        model: reading.model,
        text_pl: reading.text_pl,
        text_en: reading.text_en,
        created_at: "2026-10-06T12:00:00.000Z",
      };
      store.push(row);
      return Promise.resolve(row);
    },
    countReadingsSince: () => Promise.resolve((options.stored ?? 0) + store.length),
    complete: options.noKey === true ? null : complete,
    model: "test-model",
    promptVersion: "couple_names_reading@1",
    dailyCap: options.cap ?? 200,
    now: () => new Date("2026-10-06T12:00:00Z"),
    newId: () => `reading-${String(++ids)}`,
    log: {
      info: (event, fields) => logged.push({ event, fields }),
      warn: (event, fields) => logged.push({ event, fields }),
    },
  };
  return { deps, complete, store, logged };
}

function post(
  fields: Record<string, string>,
  { cookie = `__Host-na_session=${SESSION}`, origin = ORIGIN } = {},
): Request {
  return new Request(`${ORIGIN}/api/couple-names`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin,
      host: "atlas.test",
      cookie,
    },
    body: new URLSearchParams(fields).toString(),
  });
}

const PAIR = { a: "Małgorzata", b: "Piotr", lang: "pl" };
const BACK = "/pl/imiona-pary?a=MA%C5%81GORZATA&b=PIOTR";

describe("POST /api/couple-names (TASK-156)", () => {
  it("writes, checks and stores one reading for the pair, then goes back to the page (AC-2)", async () => {
    const { deps, complete, store, logged } = fakes();
    const response = await handleCoupleNamesPost(post(PAIR), deps);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(BACK);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(complete).toHaveBeenCalledTimes(1);
    expect(store).toHaveLength(1);
    expect(store[0]).toMatchObject({
      reading_id: "reading-1",
      given_name_a_id: "id-malgorzata",
      given_name_b_id: "id-piotr",
      claim_a_id: "claim-malgorzata",
      claim_b_id: "claim-piotr",
      prompt_version: "couple_names_reading@1",
      model: "test-model-2026",
      text_pl: SAMPLE_PL,
      text_en: SAMPLE_EN,
    });
    expect(logged.map((l) => l.event)).toEqual(["couple_names_reading_stored"]);
    expect(JSON.stringify(logged)).not.toContain("perł");
    expect(JSON.stringify(logged)).not.toContain("MAŁGORZATA");
  });

  it("gives the model the two claims' entries only: no surname, no account, no typed text, no year (AC-5)", async () => {
    const { deps, complete } = fakes();
    await handleCoupleNamesPost(post({ ...PAIR, a: "małgorzata " }), deps);
    const input = complete.mock.calls[0]?.[0];
    expect(input?.model).toBe("test-model");
    expect(input?.schema.name).toBe("couple_names_reading");
    expect(input?.maxOutputTokens).toBeGreaterThan(0);
    const material = JSON.parse(input?.input ?? "{}") as { names: { name: string }[] };
    expect(material.names.map((n) => n.name)).toEqual(["MAŁGORZATA", "PIOTR"]);
    const sent = `${input?.instructions ?? ""}\n${input?.input ?? ""}`;
    expect(sent).not.toContain(USER);
    expect(sent).not.toContain("reader@example.com");
    expect(sent).not.toContain("małgorzata ");
    expect(sent).not.toMatch(/1884|1933|Glossary|s\. 4|claim-|id-/u);
  });

  it("asks once more when the text fails the check, and stores nothing after a second failure (AC-4)", async () => {
    const bad = { pl: `${SAMPLE_PL} Pasujecie do siebie.`, en: SAMPLE_EN };
    const { deps, complete, store, logged } = fakes({ answers: [bad, bad] });
    const response = await handleCoupleNamesPost(post(PAIR), deps);
    expect(response.headers.get("location")).toBe(`${BACK}&reading=failed`);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(store).toHaveLength(0);
    expect(logged.map((l) => l.event)).toEqual([
      "couple_names_text_refused",
      "couple_names_text_refused",
    ]);
    expect(logged[0]?.fields).toMatchObject({ attempt: 1, reason: "BANNED", input_tokens: 300 });
  });

  it("stores the second answer when the first fails: a digit, a wrong shape, or a failed call", async () => {
    for (const first of [
      { pl: `${SAMPLE_PL} W roku 1884.`, en: SAMPLE_EN },
      { pl: SAMPLE_PL },
      new LlmError("TIMEOUT"),
      new LlmError("HTTP", 500),
    ]) {
      const { deps, complete, store } = fakes({
        answers: [first, { pl: SAMPLE_PL, en: SAMPLE_EN }],
      });
      const response = await handleCoupleNamesPost(post(PAIR), deps);
      expect(response.headers.get("location"), JSON.stringify(first)).toBe(BACK);
      expect(complete).toHaveBeenCalledTimes(2);
      expect(store).toHaveLength(1);
    }
  });

  it("makes no call when a reading is stored, whichever way round the pair is typed (AC-2)", async () => {
    const { deps, complete, store } = fakes();
    await handleCoupleNamesPost(post(PAIR), deps);
    await handleCoupleNamesPost(post({ a: "Piotr", b: "Małgorzata", lang: "en" }), deps);
    const response = await handleCoupleNamesPost(
      post({ a: "PIOTR", b: "MAŁGORZATA", lang: "en" }),
      deps,
    );
    expect(response.headers.get("location")).toBe("/en/couple-names?a=PIOTR&b=MA%C5%81GORZATA");
    expect(complete).toHaveBeenCalledTimes(1);
    expect(store).toHaveLength(1);
  });

  it("never calls the model for a name with an origin only, and goes back so the page explains (AC-3)", async () => {
    const { deps, complete, store } = fakes();
    const response = await handleCoupleNamesPost(post({ a: "Anna", b: "Piotr", lang: "pl" }), deps);
    expect(response.headers.get("location")).toBe("/pl/imiona-pary?a=ANNA&b=PIOTR");
    expect(complete).not.toHaveBeenCalled();
    expect(store).toHaveLength(0);
  });

  it("goes back without a call when a name is not found or missing", async () => {
    const { deps, complete } = fakes();
    expect(
      (await handleCoupleNamesPost(post({ a: "Zzqx", b: "Piotr", lang: "pl" }), deps)).headers.get(
        "location",
      ),
    ).toBe("/pl/imiona-pary?a=Zzqx&b=Piotr");
    expect(
      (await handleCoupleNamesPost(post({ a: "", b: "Piotr", lang: "pl" }), deps)).headers.get(
        "location",
      ),
    ).toBe("/pl/imiona-pary?a=&b=Piotr");
    expect(complete).not.toHaveBeenCalled();
  });

  it("says readings are unavailable without a key, and sends nothing (AC-8)", async () => {
    const { deps, store } = fakes({ noKey: true });
    const response = await handleCoupleNamesPost(post(PAIR), deps);
    expect(response.headers.get("location")).toBe(`${BACK}&reading=unavailable`);
    expect(store).toHaveLength(0);
  });

  it("stops at the day's cap, counted from midnight UTC", async () => {
    const { deps, complete } = fakes({ stored: 200, cap: 200 });
    const response = await handleCoupleNamesPost(post(PAIR), deps);
    expect(response.headers.get("location")).toBe(`${BACK}&reading=limit`);
    expect(complete).not.toHaveBeenCalled();
    expect(startOfUtcDay(new Date("2026-10-06T23:59:59Z")).toISOString()).toBe(
      "2026-10-06T00:00:00.000Z",
    );
    expect(startOfUtcDay(new Date("2026-10-06T00:00:00Z")).toISOString()).toBe(
      "2026-10-06T00:00:00.000Z",
    );
  });

  it("sends a stranger to sign in, refuses another site, and refuses a wrong form", async () => {
    const { deps, complete } = fakes();
    expect(
      (await handleCoupleNamesPost(post(PAIR, { cookie: "" }), deps)).headers.get("location"),
    ).toBe("/pl/konto/zaloguj?next=%2Fpl%2Fimiona-pary");
    expect(
      (await handleCoupleNamesPost(post(PAIR, { origin: "https://evil.example" }), deps)).status,
    ).toBe(403);
    const json = new Request(`${ORIGIN}/api/couple-names`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, host: "atlas.test" },
      body: "{}",
    });
    expect((await handleCoupleNamesPost(json, deps)).status).toBe(400);
    expect(complete).not.toHaveBeenCalled();
  });

  it("the sample reading itself passes every rule the route holds a text to", () => {
    for (const sample of [SAMPLE_PL, SAMPLE_EN]) {
      const lower = sample.toLowerCase();
      for (const pattern of COUPLE_NAMES_BANNED) expect(lower).not.toMatch(pattern);
      expect(sample).not.toMatch(/\d/u);
    }
  });
});
