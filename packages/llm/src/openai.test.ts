import { describe, expect, it, vi } from "vitest";
import { apiKeyFromEnv, completeJson, LlmError, OPENAI_CHAT_COMPLETIONS_URL } from "./openai.js";
import type { CompleteJsonInput } from "./openai.js";

/**
 * TASK-156: the model client over a stubbed `fetch`. No key reaches the
 * network in tests (ADR-0013: CI holds none).
 */

const INPUT: CompleteJsonInput = {
  model: "test-model",
  instructions: "Write a reading.",
  input: '{"entries":[]}',
  schema: {
    name: "reading",
    schema: {
      type: "object",
      properties: { pl: { type: "string" }, en: { type: "string" } },
      required: ["pl", "en"],
      additionalProperties: false,
    },
  },
  maxOutputTokens: 500,
};

function answer(body: unknown, status = 200) {
  return vi.fn((_url: string | URL | Request, _init?: RequestInit) =>
    Promise.resolve(
      new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
    ),
  );
}

const completion = (content: string | null, extra: Record<string, unknown> = {}) => ({
  model: "test-model-2026",
  choices: [{ message: { content, ...extra }, finish_reason: "stop" }],
  usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 },
});

async function failure(promise: Promise<unknown>): Promise<LlmError> {
  try {
    await promise;
  } catch (error: unknown) {
    if (error instanceof LlmError) return error;
    throw error;
  }
  throw new Error("expected the call to fail");
}

describe("completeJson (TASK-156)", () => {
  it("sends the developer and user messages, a strict JSON schema and the token cap, with the key in one header", async () => {
    const fetch = answer(completion('{"pl":"Tekst.","en":"Text."}'));
    const result = await completeJson(INPUT, { apiKey: "sk-test-key", fetch });
    expect(result.value).toEqual({ pl: "Tekst.", en: "Text." });
    expect(result.usage).toEqual({ input_tokens: 120, output_tokens: 80 });
    expect(result.model).toBe("test-model-2026");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(OPENAI_CHAT_COMPLETIONS_URL);
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer sk-test-key");
    expect(headers["content-type"]).toBe("application/json");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toEqual({
      model: "test-model",
      messages: [
        { role: "developer", content: "Write a reading." },
        { role: "user", content: '{"entries":[]}' },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "reading", strict: true, schema: INPUT.schema.schema },
      },
      max_completion_tokens: 500,
    });
  });

  it("sends nothing without a key, and never puts the key in an error", async () => {
    const fetch = answer(completion("{}"));
    for (const apiKey of [undefined, "", "   "]) {
      const error = await failure(completeJson(INPUT, { apiKey, fetch }));
      expect(error.kind).toBe("NO_KEY");
    }
    expect(fetch).not.toHaveBeenCalled();
    const http = await failure(
      completeJson(INPUT, { apiKey: "sk-secret-value", fetch: answer({ error: {} }, 401) }),
    );
    expect(http.kind).toBe("HTTP");
    expect(http.status).toBe(401);
    expect(http.message).not.toContain("sk-secret-value");
  });

  it("names a refusal, a truncated answer, a non-JSON answer and a non-object answer", async () => {
    const cases: [unknown, string][] = [
      [completion(null, { refusal: "I can't help with that." }), "REFUSED"],
      [
        {
          ...completion('{"pl":"x"'),
          choices: [{ message: { content: '{"pl":"x"' }, finish_reason: "length" }],
        },
        "TRUNCATED",
      ],
      [completion("not json"), "BAD_OUTPUT"],
      [completion("[1,2]"), "BAD_OUTPUT"],
      [completion(null), "BAD_OUTPUT"],
      [{ choices: [] }, "BAD_OUTPUT"],
      ["<html>", "BAD_OUTPUT"],
    ];
    for (const [body, kind] of cases) {
      const error = await failure(completeJson(INPUT, { apiKey: "k", fetch: answer(body) }));
      expect(error.kind, JSON.stringify(body)).toBe(kind);
    }
  });

  it("reads an error status as HTTP even when its body is not JSON", async () => {
    const error = await failure(
      completeJson(INPUT, { apiKey: "k", fetch: answer("Bad gateway", 502) }),
    );
    expect(error.kind).toBe("HTTP");
    expect(error.status).toBe(502);
  });

  it("gives up after the timeout and names it", async () => {
    const fetch = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );
    const error = await failure(completeJson(INPUT, { apiKey: "k", fetch, timeoutMs: 5 }));
    expect(error.kind).toBe("TIMEOUT");
  });

  it("reads a failed request as NETWORK", async () => {
    const fetch = vi.fn(() => Promise.reject(new Error("ECONNRESET")));
    const error = await failure(
      completeJson(INPUT, { apiKey: "k", fetch: fetch as unknown as typeof globalThis.fetch }),
    );
    expect(error.kind).toBe("NETWORK");
  });

  it("returns null usage when the API gives none", async () => {
    const body = { ...completion('{"pl":"a","en":"b"}'), usage: undefined };
    const result = await completeJson(INPUT, { apiKey: "k", fetch: answer(body) });
    expect(result.usage).toBeNull();
  });

  it("reads the key from the environment, trimmed, or not at all", () => {
    expect(apiKeyFromEnv({ OPENAI_API_KEY: " sk-x " })).toBe("sk-x");
    expect(apiKeyFromEnv({ OPENAI_API_KEY: "" })).toBeUndefined();
    expect(apiKeyFromEnv({})).toBeUndefined();
  });
});
