import type { Accounts } from "@name-atlas/accounts";
import { TREE_SCHEMA_VERSION } from "@name-atlas/contracts";
import type { ApiErrorResponse } from "@name-atlas/contracts";
import type { Family } from "@name-atlas/family";
import type { AccountLog } from "./account-routes.js";
import type { Lang } from "./messages.js";
import { cookieValue, sessionCookieName } from "./session-cookie.js";
import { isId } from "./tree-paths.js";

/**
 * `GET /api/v1/trees/{id}/export` (TASK-098; ADR-0029 §2.4.14; the contract
 * `docs/contracts/tree.md`): the tree as one JSON file, for the reader who may
 * open it, as they see it. The service does the reading and the hiding and
 * records the export; this only maps the session and the outcome to an
 * answer. As a function over its dependencies, so it is tested without a
 * server or a database.
 *
 * - No session: 401. The page that carries the link needs one, so this is an
 *   old link, not a reader. A tree the session may not open: 404, not told
 *   apart from none (ADR-0029 §2.3.9). An id that is not one: 404.
 * - The file: `content-disposition: attachment` with a name of the id's first
 *   eight characters, never of the title; `private, no-store`.
 * - `places` is empty: the register holds no coordinates for a locality
 *   (TASK-092), and a code it cannot place is left out by the contract.
 * - Nothing a reader wrote is logged: ids, a status and a duration only.
 */

export interface TreeExportDeps {
  readonly family: Pick<Family, "exportTree">;
  readonly accounts: Pick<Accounts, "sessionFromToken">;
  readonly secure: boolean;
  readonly log: AccountLog & { readonly correlationId: string };
}

const NO_STORE = { "cache-control": "no-store" } as const;

function envelope(requestId: string): ApiErrorResponse {
  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "the request could not be completed",
      retryable: false,
      request_id: requestId,
    },
  };
}

/** The file's name: the language's word and the id's first eight characters, nothing a reader typed. */
export function exportFileName(lang: Lang, treeId: string): string {
  return `${lang === "en" ? "tree" : "drzewo"}-${treeId.slice(0, 8)}.json`;
}

export async function handleTreeExport(
  treeId: string,
  request: Request,
  deps: TreeExportDeps,
): Promise<Response> {
  const startedAt = Date.now();
  const requestId = deps.log.correlationId;
  if (!isId(treeId)) return new Response("Not found", { status: 404, headers: NO_STORE });
  const lang: Lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "pl";
  const id = treeId.toLowerCase();

  try {
    const token = cookieValue(request.headers.get("cookie"), sessionCookieName(deps.secure));
    const session = token === null ? null : await deps.accounts.sessionFromToken(token);
    if (session === null) {
      deps.log.info("tree_export_rejected", { status: 401, ms: Date.now() - startedAt });
      return new Response("Sign in to download a tree", { status: 401, headers: NO_STORE });
    }
    const result = await deps.family.exportTree({ userId: session.userId, treeId: id });
    if (result.kind !== "OK") {
      deps.log.info("tree_export_rejected", { status: 404, ms: Date.now() - startedAt });
      return new Response("Not found", { status: 404, headers: NO_STORE });
    }
    // The contract's object (`treeResponseSchema`, which the tests hold it to): the service's read
    // with the version in front and `places` in the place of `place_codes`.
    const { place_codes: _codes, ...tree } = result.tree;
    const body = { schema_version: TREE_SCHEMA_VERSION, ...tree, places: [] };
    deps.log.info("tree_exported", {
      status: 200,
      treeId: id,
      persons: body.persons.length,
      ms: Date.now() - startedAt,
    });
    return new Response(JSON.stringify(body, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${exportFileName(lang, id)}"`,
        "cache-control": "private, no-store",
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    deps.log.warn("tree_export_failed", {
      status: 500,
      error: error instanceof Error ? error.name : "unknown",
      ms: Date.now() - startedAt,
    });
    return new Response(JSON.stringify(envelope(requestId)), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", ...NO_STORE },
    });
  }
}
