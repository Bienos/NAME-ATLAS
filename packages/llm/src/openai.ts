/**
 * The model client (TASK-156; ADR-0013, ADR-0047 §2.7): one call to OpenAI's
 * Chat Completions API over plain `fetch`, asking for a JSON-schema response
 * so the answer is one object of a known shape. Server-side only; no SDK and
 * no dependency.
 *
 * What it does not do: it never decides what is true (ARCHITECTURE.md §4,
 * ADR-0013). The caller gives it the material and validates the object that
 * comes back; nothing here reaches a claim, a confidence or a count.
 *
 * The key is `OPENAI_API_KEY`, read from the environment by the caller at call
 * time (`apiKeyFromEnv`) and passed in. It is sent in one header and is never
 * logged, never stored and never part of an error: an `LlmError` carries a
 * kind, an HTTP status where there is one, and nothing from the request.
 * Without a key nothing is sent and the call fails as `NO_KEY`.
 *
 * Checked against the API reference on 2026-10-06: `messages` with the
 * `developer` and `user` roles (`system` is deprecated for current models),
 * `response_format` `json_schema` with `strict: true`, `max_completion_tokens`;
 * the text at `choices[0].message.content`, a refusal at
 * `choices[0].message.refusal`, `finish_reason` `length` when cut short, and
 * `usage.prompt_tokens` / `usage.completion_tokens`.
 */

export const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";
export const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

const DEFAULT_TIMEOUT_MS = 30_000;

export type LlmFailureKind =
  /** No key: nothing was sent. */
  | "NO_KEY"
  /** The API answered with an error status. */
  | "HTTP"
  /** No answer within the timeout; the request was aborted. */
  | "TIMEOUT"
  /** The request could not be made or the answer could not be read. */
  | "NETWORK"
  /** The model refused the request (`message.refusal`). */
  | "REFUSED"
  /** The answer was cut short at the token limit (`finish_reason: "length"`). */
  | "TRUNCATED"
  /** The answer was not the JSON object asked for. */
  | "BAD_OUTPUT";

export class LlmError extends Error {
  readonly kind: LlmFailureKind;
  readonly status: number | null;

  constructor(kind: LlmFailureKind, status: number | null = null) {
    super(`model call failed: ${kind}${status === null ? "" : ` (${String(status)})`}`);
    this.name = "LlmError";
    this.kind = kind;
    this.status = status;
  }
}

/** A JSON schema for one object, as the API's strict mode requires it: every field required, no others. */
export interface JsonObjectSchema {
  readonly type: "object";
  readonly properties: Readonly<Record<string, unknown>>;
  readonly required: readonly string[];
  readonly additionalProperties: false;
}

export interface CompleteJsonInput {
  readonly model: string;
  /** The developer message: who the model writes for and the rules it keeps. */
  readonly instructions: string;
  /** The user message: the material, and nothing else. */
  readonly input: string;
  readonly schema: { readonly name: string; readonly schema: JsonObjectSchema };
  readonly maxOutputTokens: number;
}

export interface CompleteJsonOptions {
  readonly apiKey: string | undefined;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  readonly url?: string;
}

export interface TokenUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
}

export interface CompleteJsonResult {
  /** The parsed object. The caller checks its shape; strict mode makes it match the schema. */
  readonly value: unknown;
  readonly usage: TokenUsage | null;
  /** The model the API says answered. */
  readonly model: string;
}

/** The key as the environment holds it, trimmed, or undefined when unset or blank. */
export function apiKeyFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string | undefined {
  const key = env[OPENAI_API_KEY_ENV]?.trim();
  return key === undefined || key === "" ? undefined : key;
}

const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const integer = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;

export async function completeJson(
  input: CompleteJsonInput,
  options: CompleteJsonOptions,
): Promise<CompleteJsonResult> {
  const apiKey = options.apiKey?.trim();
  if (apiKey === undefined || apiKey === "") throw new LlmError("NO_KEY");
  const doFetch = options.fetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await doFetch(options.url ?? OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages: [
          { role: "developer", content: input.instructions },
          { role: "user", content: input.input },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: input.schema.name, strict: true, schema: input.schema.schema },
        },
        max_completion_tokens: input.maxOutputTokens,
      }),
      signal: controller.signal,
    });
  } catch (error: unknown) {
    clearTimeout(timer);
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new LlmError(aborted ? "TIMEOUT" : "NETWORK");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    clearTimeout(timer);
    throw new LlmError(response.ok ? "BAD_OUTPUT" : "HTTP", response.status);
  }
  clearTimeout(timer);
  if (!response.ok) throw new LlmError("HTTP", response.status);

  const top = record(body);
  const choices = top?.["choices"];
  const first = record(Array.isArray(choices) ? choices[0] : null);
  const message = record(first?.["message"]);
  if (message === null) throw new LlmError("BAD_OUTPUT");
  const refusal = message["refusal"];
  if (typeof refusal === "string" && refusal !== "") throw new LlmError("REFUSED");
  if (first?.["finish_reason"] === "length") throw new LlmError("TRUNCATED");
  const content = message["content"];
  if (typeof content !== "string" || content.trim() === "") throw new LlmError("BAD_OUTPUT");
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new LlmError("BAD_OUTPUT");
  }
  if (record(value) === null) throw new LlmError("BAD_OUTPUT");

  const usage = record(top?.["usage"]);
  const inTokens = integer(usage?.["prompt_tokens"]);
  const outTokens = integer(usage?.["completion_tokens"]);
  return {
    value,
    usage:
      inTokens === null || outTokens === null
        ? null
        : { input_tokens: inTokens, output_tokens: outTokens },
    model: typeof top?.["model"] === "string" ? top["model"] : input.model,
  };
}
