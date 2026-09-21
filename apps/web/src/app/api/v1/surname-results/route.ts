import { db as sharedDb } from "../../../../lib/db.js";
import { NextResponse } from "next/server";
import { createLogger } from "@name-atlas/logging";
import { querySurnameResult } from "@name-atlas/truth";
import type { ApiErrorResponse, PublicErrorCode } from "@name-atlas/contracts";

/**
 * `GET /api/v1/surname-results?surname=<raw>[&surface=FREE]`
 *
 * The thin same-origin BFF route handler (`docs/canonical/16` §3, §4;
 * `ARCHITECTURE.md` §6). It parses the request, maps a typed outcome to an
 * HTTP status and body, and serializes. It performs **no** surname
 * resolution, claim interpretation, confidence calculation, rights
 * evaluation or source selection, and holds no SQL — all of that is
 * `querySurnameResult` in `@name-atlas/truth`.
 *
 * `docs/canonical/16` §7's endpoint inventory lists a search resource and a
 * full profile resource. This is narrower than either: one fact, read by
 * surname string, with no search semantics. It is expected to be folded into
 * the profile resource when that lands; until then it is its own path so the
 * contract stays honest about what it returns.
 *
 * Expected unresolved and ambiguous outcomes are **200** responses carrying
 * an explicit status, not errors (`docs/canonical/16` §79). Only malformed
 * input and genuine failures produce the §78 error envelope.
 */

export const dynamic = "force-dynamic";

function errorBody(
  code: PublicErrorCode,
  message: string,
  retryable: boolean,
  requestId: string,
): ApiErrorResponse {
  return { error: { code, message, retryable, request_id: requestId } };
}

export async function GET(request: Request): Promise<NextResponse> {
  // One logger per request. Its correlation ID is the `request_id` a client sees
  // in an error envelope and the `x-request-id` header, so a user quoting an id
  // can be matched to exactly these lines (TASK-019).
  const log = createLogger({ service: "web", base: { route: "/api/v1/surname-results" } });
  const requestId = log.correlationId;
  const startedAt = Date.now();
  const url = new URL(request.url);
  const surname = url.searchParams.get("surname");
  const surfaceParam = url.searchParams.get("surface");

  if (surname === null) {
    log.warn("request_rejected", { status: 400, code: "INVALID_REQUEST" });
    return NextResponse.json(
      errorBody("INVALID_REQUEST", "the 'surname' query parameter is required", false, requestId),
      { status: 400 },
    );
  }

  // **This endpoint answers on the free surface and no other.**
  //
  // `evaluateSurface` treats `INTERNAL` as the most permissive surface: it is
  // where a value whose commercial rights are unresolved may still be read, for
  // research and rights review. Letting an anonymous caller name it in a query
  // string handed that permission to anyone with a URL, which is a rights
  // bypass — `docs/canonical/12` §6.3's matrix distinguishes the surfaces
  // precisely so they cannot be chosen by the audience. (Caught by review
  // 2026-09-21; the parameter had accepted all four since TASK-006.)
  //
  // `PAID` needs an entitlement and `SEO` a projection, neither of which
  // exists. When they do, the surface will follow from the caller's
  // authorisation, never from a parameter.
  const surface = "FREE" as const;
  if (surfaceParam !== null && surfaceParam !== "FREE") {
    log.warn("request_rejected", { status: 400, code: "INVALID_REQUEST", field: "surface" });
    return NextResponse.json(
      errorBody(
        "INVALID_REQUEST",
        "'surface' may only be FREE on this endpoint; other surfaces require authorisation",
        false,
        requestId,
      ),
      { status: 400 },
    );
  }

  // Configuration and connection are inside the try. `loadDbConfig` throws when
  // `DATABASE_URL` is absent, and a misconfigured deployment must answer with
  // the §78 error envelope like any other failure — not with a bare 500 that
  // carries no request id. (Found by inspection 2026-09-21: the same bug
  // `page.tsx` had, still here.)

  try {
    const db = sharedDb();
    const outcome = await querySurnameResult(db, surname, { surface });

    switch (outcome.kind) {
      case "OK":
        // The surname itself is deliberately not logged. docs/canonical/19 §85
        // requires request bodies redacted by default, and a search term tied to
        // a timestamp is the visitor's, not the register's. The outcome is what
        // diagnosis needs.
        log.info("request_completed", {
          status: 200,
          surface,
          result_status: outcome.response.status,
          population_state: outcome.response.population?.state ?? null,
          rarity_state: outcome.response.rarity?.state ?? null,
          distribution_state: outcome.response.distribution?.state ?? null,
          suggestions_state: outcome.response.suggestions?.state ?? null,
          ms: Date.now() - startedAt,
        });
        return NextResponse.json(outcome.response, {
          status: 200,
          // Cache by state, not by an assumed truth lifetime
          // (docs/canonical/16 §84). A conservative policy until a real
          // caching decision is made; ETag support is a later task.
          headers: { "cache-control": "no-store", "x-request-id": requestId },
        });

      case "INVALID_INPUT":
        log.info("request_rejected", {
          status: 400,
          code: "INVALID_SURNAME_INPUT",
          // The validation verdict, not the input that produced it.
          reason: outcome.reason,
          ms: Date.now() - startedAt,
        });
        return NextResponse.json(
          errorBody(
            "INVALID_SURNAME_INPUT",
            `the surname could not be accepted: ${outcome.reason}`,
            false,
            requestId,
          ),
          { status: 400 },
        );

      case "UNAVAILABLE":
        // The reason is logged internally, never returned. A client gets a
        // stable code and nothing that describes our infrastructure.
        log.error("request_unavailable", {
          status: 503,
          reason: outcome.reason,
          ms: Date.now() - startedAt,
        });
        return NextResponse.json(
          errorBody(
            "SERVICE_UNAVAILABLE",
            "the surname service is temporarily unavailable",
            true,
            requestId,
          ),
          { status: 503 },
        );

      default: {
        // Exhaustiveness, stated rather than assumed: a new outcome kind added
        // to `SurnameQueryOutcome` fails this assignment at compile time
        // instead of silently falling through to a 500.
        const unreachable: never = outcome;
        throw new Error(`unhandled outcome: ${JSON.stringify(unreachable)}`);
      }
    }
  } catch (cause: unknown) {
    // Nothing from `cause` reaches the client: no message, no stack, no SQL,
    // no file path (docs/canonical/16 §78). It is logged, redacted, so a
    // connection string inside it cannot land in a log file either.
    log.error("request_failed", { status: 500, cause, ms: Date.now() - startedAt });
    return NextResponse.json(
      errorBody("INTERNAL_ERROR", "the request could not be completed", false, requestId),
      { status: 500 },
    );
  }
}
