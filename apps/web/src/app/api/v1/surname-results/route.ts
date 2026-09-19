import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
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
  const requestId = randomUUID();
  const url = new URL(request.url);
  const surname = url.searchParams.get("surname");
  const surfaceParam = url.searchParams.get("surface");

  if (surname === null) {
    return NextResponse.json(
      errorBody("INVALID_REQUEST", "the 'surname' query parameter is required", false, requestId),
      { status: 400 },
    );
  }

  const allowedSurfaces = ["INTERNAL", "FREE", "PAID", "SEO"] as const;
  type Surface = (typeof allowedSurfaces)[number];
  let surface: Surface = "FREE";
  if (surfaceParam !== null) {
    if (!(allowedSurfaces as readonly string[]).includes(surfaceParam)) {
      return NextResponse.json(
        errorBody(
          "INVALID_REQUEST",
          `'surface' must be one of: ${allowedSurfaces.join(", ")}`,
          false,
          requestId,
        ),
        { status: 400 },
      );
    }
    surface = surfaceParam as Surface;
  }

  const pool = createPool(loadDbConfig());
  const db = createDb(pool);

  try {
    const outcome = await querySurnameResult(db, surname, { surface });

    switch (outcome.kind) {
      case "OK":
        return NextResponse.json(outcome.response, {
          status: 200,
          // Cache by state, not by an assumed truth lifetime
          // (docs/canonical/16 §84). A conservative policy until a real
          // caching decision is made; ETag support is a later task.
          headers: { "cache-control": "no-store", "x-request-id": requestId },
        });

      case "INVALID_INPUT":
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
        console.error(`[surname-results] ${requestId}: ${outcome.reason}`);
        return NextResponse.json(
          errorBody(
            "SERVICE_UNAVAILABLE",
            "the surname service is temporarily unavailable",
            true,
            requestId,
          ),
          { status: 503 },
        );
    }
  } catch (cause: unknown) {
    // Nothing from `cause` reaches the client: no message, no stack, no SQL,
    // no file path (docs/canonical/16 §78).
    console.error(`[surname-results] ${requestId}: unexpected error`, cause);
    return NextResponse.json(
      errorBody("INTERNAL_ERROR", "the request could not be completed", false, requestId),
      { status: 500 },
    );
  } finally {
    await db.destroy();
  }
}
