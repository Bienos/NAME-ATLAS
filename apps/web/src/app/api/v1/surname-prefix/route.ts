import { db as sharedDb } from "../../../../lib/db.js";
import { NextResponse } from "next/server";
import { createLogger } from "@name-atlas/logging";
import { prefixSuggestions } from "@name-atlas/resolver";
import { currentSlugsFor, surnameRoute } from "@name-atlas/seo";
import { SURNAME_PREFIX_SCHEMA_VERSION, surnamePrefixResponseSchema } from "@name-atlas/contracts";
import type { ApiErrorResponse, SurnamePrefixResponse } from "@name-atlas/contracts";

/**
 * `GET /api/v1/surname-prefix?q=<typed>[&lang=pl|en]` — suggest-as-you-type
 * (`docs/contracts/surname-prefix.md`).
 *
 * A thin route: `prefixSuggestions` in `@name-atlas/resolver` chooses and
 * orders the surnames, `currentSlugsFor` in `@name-atlas/seo` supplies their
 * addresses. Too short and invalid input are expected answers and return 200
 * with a status; only a missing parameter or a failure is an error envelope
 * (`docs/canonical/16` §78–§79).
 *
 * What was typed is never logged (`docs/canonical/19` §85) — only its length
 * band and the outcome. Short-lived public caching is allowed because the
 * answer depends on nothing but the register and the query string.
 */
export const dynamic = "force-dynamic";

function error(
  code: "INVALID_REQUEST" | "INTERNAL_ERROR",
  message: string,
  retryable: boolean,
  id: string,
) {
  const body: ApiErrorResponse = { error: { code, message, retryable, request_id: id } };
  return body;
}

export async function GET(request: Request): Promise<NextResponse> {
  const log = createLogger({ service: "web", base: { route: "/api/v1/surname-prefix" } });
  const requestId = log.correlationId;
  const startedAt = Date.now();
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const lang = url.searchParams.get("lang") === "en" ? "en" : "pl";

  if (q === null) {
    log.warn("request_rejected", { status: 400, code: "INVALID_REQUEST" });
    return NextResponse.json(
      error("INVALID_REQUEST", "the 'q' query parameter is required", false, requestId),
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  try {
    const db = sharedDb();
    const outcome = await prefixSuggestions(db, q);
    let body: SurnamePrefixResponse;
    if (outcome.kind === "SUGGESTIONS") {
      const slugs = await currentSlugsFor(
        db,
        lang,
        outcome.items.map((i) => i.surname_id),
      );
      body = {
        schema_version: SURNAME_PREFIX_SCHEMA_VERSION,
        status: "SUGGESTIONS",
        items: outcome.items.map((i) => {
          const slug = slugs.get(i.surname_id);
          return {
            display_name: i.display_name,
            path: slug === undefined ? null : surnameRoute(slug, lang),
          };
        }),
      };
    } else {
      body = { schema_version: SURNAME_PREFIX_SCHEMA_VERSION, status: outcome.kind, items: [] };
    }
    // The response is validated before it leaves: a payload that violates its
    // own contract is a bug and must not reach a client.
    const parsed = surnamePrefixResponseSchema.parse(body);
    log.info("request_completed", {
      status: 200,
      result_status: parsed.status,
      items: parsed.items.length,
      input_length_band: q.trim().length < 4 ? "2-3" : q.trim().length < 8 ? "4-7" : "8+",
      ms: Date.now() - startedAt,
    });
    return NextResponse.json(parsed, {
      status: 200,
      headers: { "cache-control": "public, max-age=300", "x-request-id": requestId },
    });
  } catch (cause: unknown) {
    log.error("request_failed", { cause, ms: Date.now() - startedAt });
    return NextResponse.json(
      error("INTERNAL_ERROR", "suggestions are unavailable", true, requestId),
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
}
