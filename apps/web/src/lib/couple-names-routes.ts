import { randomUUID } from "node:crypto";
import type { Accounts } from "@name-atlas/accounts";
import { LlmError } from "@name-atlas/llm";
import type { CompleteJsonInput, CompleteJsonResult } from "@name-atlas/llm";
import type {
  BirthNameLookup,
  GivenNameMeaningFacts,
  ReadingKey,
  StoredReading,
} from "@name-atlas/truth";
import { readingKey } from "@name-atlas/truth";
import { accountPath } from "./account-paths.js";
import { isSameSiteRequest } from "./account-routes.js";
import type { AccountLog } from "./account-routes.js";
import {
  checkReading,
  COUPLE_NAMES_FIELDS,
  COUPLE_NAMES_MAX_OUTPUT_TOKENS,
  COUPLE_NAMES_PATHS,
  coupleNamesPath,
} from "./couple-names-config.js";
import type { ReadingStatus } from "./couple-names-config.js";
import {
  parseReadingOutput,
  READING_INSTRUCTIONS,
  READING_SCHEMA,
  readingInput,
  whyNoReading,
} from "./couple-names-reading.js";
import type { Lang } from "./messages.js";
import { cookieValue, sessionCookieName } from "./session-cookie.js";

/**
 * `POST /api/couple-names` (TASK-156, ADR-0047 §2.3–§2.4): the page's one
 * button, as a function over its dependencies, so it is tested without a
 * server, a database or the model.
 *
 * Same-site only; a signed-in reader only. It resolves the two names again,
 * reads their meanings, and answers 303 back to the page in every case. It
 * calls the model only when both names have a quoted meaning, no reading is
 * stored for the pair under these claims and this prompt, the day's cap is
 * not reached and a key is set. The model gets the two claims' entries and
 * nothing else (`readingInput`). Its text is checked (`checkReading`) in both
 * languages; a text that fails is asked for once more, and a second failure
 * stores nothing. A text that passes is stored once per pair: a second click
 * finds the first click's row.
 *
 * Logged: ids, kinds, token counts and durations. Never a text, never a name
 * a reader typed, never the key.
 */

export interface CoupleNamesRouteDeps {
  readonly accounts: Pick<Accounts, "sessionFromToken">;
  readonly secure: boolean;
  readonly findName: (typed: string) => Promise<BirthNameLookup>;
  readonly readMeaning: (givenNameId: string) => Promise<GivenNameMeaningFacts>;
  readonly findReading: (key: ReadingKey) => Promise<StoredReading | null>;
  readonly storeReading: (
    key: ReadingKey,
    reading: {
      readonly reading_id: string;
      readonly model: string;
      readonly text_pl: string;
      readonly text_en: string;
    },
  ) => Promise<StoredReading>;
  readonly countReadingsSince: (since: Date) => Promise<number>;
  /** The model call, or null when no key is set: nothing is sent. */
  readonly complete: ((input: CompleteJsonInput) => Promise<CompleteJsonResult>) | null;
  readonly model: string;
  readonly promptVersion: string;
  readonly dailyCap: number;
  readonly now?: () => Date;
  readonly newId?: () => string;
  readonly log: AccountLog;
}

const NO_STORE = { "cache-control": "no-store" } as const;
const MAX_FORM_BYTES = 1_024;
/** Two tries at most: the first text, and one more when it fails the check or the call fails. */
const ATTEMPTS = 2;

function see(location: string): Response {
  return new Response(null, { status: 303, headers: { location, ...NO_STORE } });
}

/** Midnight UTC of the day `now` is in: the cap counts a UTC day. */
export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function handleCoupleNamesPost(
  request: Request,
  deps: CoupleNamesRouteDeps,
): Promise<Response> {
  if (!isSameSiteRequest(request)) {
    return new Response("Forbidden", { status: 403, headers: NO_STORE });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  const type = request.headers.get("content-type") ?? "";
  if (
    (Number.isFinite(length) && length > MAX_FORM_BYTES) ||
    !/^application\/x-www-form-urlencoded/iu.test(type)
  ) {
    return new Response("Bad request", { status: 400, headers: NO_STORE });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400, headers: NO_STORE });
  }
  const lang: Lang = form.get("lang") === "en" ? "en" : "pl";
  const field = (name: string): string => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim().slice(0, 80) : "";
  };
  const typed = { a: field(COUPLE_NAMES_FIELDS.a), b: field(COUPLE_NAMES_FIELDS.b) };
  const back = (status?: ReadingStatus, names = typed): Response =>
    see(coupleNamesPath(lang, names.a, names.b, status));

  const token = cookieValue(request.headers.get("cookie"), sessionCookieName(deps.secure));
  let session: Awaited<ReturnType<Accounts["sessionFromToken"]>>;
  try {
    session = token === null ? null : await deps.accounts.sessionFromToken(token);
  } catch {
    deps.log.warn("couple_names_failed", { reason: "session_lookup" });
    return back("failed");
  }
  if (session === null) {
    return see(accountPath(lang, "sign-in", { next: COUPLE_NAMES_PATHS[lang] }));
  }
  if (typed.a === "" || typed.b === "") return back();

  const [a, b] = await Promise.all([deps.findName(typed.a), deps.findName(typed.b)]);
  if (a.kind !== "FOUND" || b.kind !== "FOUND") return back();
  const names = { a: a.given_name.display_name, b: b.given_name.display_name };
  const same = a.given_name.id === b.given_name.id;
  const meaningA = await deps.readMeaning(a.given_name.id);
  const meaningB = same ? meaningA : await deps.readMeaning(b.given_name.id);
  if (
    whyNoReading(meaningA) !== null ||
    whyNoReading(meaningB) !== null ||
    meaningA.state !== "READY" ||
    meaningB.state !== "READY"
  ) {
    return back(undefined, names);
  }
  const key = readingKey(
    { given_name_id: a.given_name.id, claim_id: meaningA.claim_id },
    { given_name_id: b.given_name.id, claim_id: meaningB.claim_id },
    deps.promptVersion,
  );
  if ((await deps.findReading(key)) !== null) return back(undefined, names);
  if (deps.complete === null) return back("unavailable", names);

  const now = deps.now ?? (() => new Date());
  const today = await deps.countReadingsSince(startOfUtcDay(now()));
  if (today >= deps.dailyCap) {
    deps.log.info("couple_names_capped", { today, cap: deps.dailyCap });
    return back("limit", names);
  }

  const input: CompleteJsonInput = {
    model: deps.model,
    instructions: READING_INSTRUCTIONS,
    input: readingInput({ name: names.a, meaning: meaningA }, { name: names.b, meaning: meaningB }),
    schema: READING_SCHEMA,
    maxOutputTokens: COUPLE_NAMES_MAX_OUTPUT_TOKENS,
  };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    let result: CompleteJsonResult;
    try {
      result = await deps.complete(input);
    } catch (error: unknown) {
      const kind = error instanceof LlmError ? error.kind : "UNKNOWN";
      deps.log.warn("couple_names_call_failed", { attempt, kind, ms: Date.now() - startedAt });
      if (kind === "NO_KEY") return back("unavailable", names);
      continue;
    }
    const texts = parseReadingOutput(result.value);
    const checks =
      texts === null
        ? [{ ok: false as const, reason: "SHAPE" as const, detail: "" }]
        : [checkReading(texts.pl), checkReading(texts.en)].filter((c) => !c.ok);
    const usage = {
      input_tokens: result.usage?.input_tokens ?? null,
      output_tokens: result.usage?.output_tokens ?? null,
    };
    if (texts === null || checks.length > 0) {
      const failed = checks.find((c) => !c.ok);
      deps.log.warn("couple_names_text_refused", {
        attempt,
        model: result.model,
        reason: failed !== undefined && !failed.ok ? failed.reason : "SHAPE",
        ms: Date.now() - startedAt,
        ...usage,
      });
      continue;
    }
    const stored = await deps.storeReading(key, {
      reading_id: (deps.newId ?? randomUUID)(),
      model: result.model,
      text_pl: texts.pl,
      text_en: texts.en,
    });
    deps.log.info("couple_names_reading_stored", {
      attempt,
      reading_id: stored.reading_id,
      model: result.model,
      ms: Date.now() - startedAt,
      ...usage,
    });
    return back(undefined, names);
  }
  return back("failed", names);
}
