import { describe, expect, it, vi } from "vitest";
import { treeResponseSchema } from "@name-atlas/contracts";
import type { TreeRead } from "@name-atlas/family";
import { exportFileName, handleTreeExport } from "./tree-export.js";
import type { TreeExportDeps } from "./tree-export.js";
import { tree, treeForMember, TREE_ID } from "./tree-fixture.js";

const ORIGIN = "https://atlas.test";
const SESSION = "S".repeat(43);
const USER = "0199a1b2-0000-7000-8000-00000000aa11";

function fakes(read = tree()) {
  const family = {
    exportTree: vi.fn((): Promise<{ kind: string; tree?: TreeRead }> =>
      Promise.resolve({ kind: "OK", tree: read }),
    ),
  };
  const accounts = {
    sessionFromToken: vi.fn((token: unknown) =>
      Promise.resolve(token === SESSION ? { userId: USER, termsVersion: "2026-10-03" } : null),
    ),
  };
  const logged: { event: string; fields: unknown }[] = [];
  const deps: TreeExportDeps = {
    family: family as unknown as TreeExportDeps["family"],
    accounts: accounts as unknown as TreeExportDeps["accounts"],
    secure: true,
    log: {
      correlationId: "req-1",
      info: (event, fields) => logged.push({ event, fields }),
      warn: (event, fields) => logged.push({ event, fields }),
    },
  };
  return { deps, family, accounts, logged };
}

function get(path: string, cookie: string | null = `__Host-na_session=${SESSION}`): Request {
  const headers = new Headers();
  if (cookie !== null) headers.set("cookie", cookie);
  return new Request(`${ORIGIN}${path}`, { headers });
}

describe("the tree's export (TASK-098)", () => {
  it("AC-1: 404 for an id that is not one, 401 without a session, 404 for a tree the session may not open", async () => {
    const { deps, family } = fakes();
    expect((await handleTreeExport("nope", get("/api/v1/trees/nope/export"), deps)).status).toBe(
      404,
    );
    const signedOut = await handleTreeExport(
      TREE_ID,
      get(`/api/v1/trees/${TREE_ID}/export`, null),
      deps,
    );
    expect(signedOut.status).toBe(401);
    expect(signedOut.headers.get("cache-control")).toBe("no-store");
    expect(family.exportTree).not.toHaveBeenCalled();
    family.exportTree.mockResolvedValueOnce({ kind: "NOT_FOUND" });
    expect(
      (await handleTreeExport(TREE_ID, get(`/api/v1/trees/${TREE_ID}/export`), deps)).status,
    ).toBe(404);
  });

  it("AC-1, AC-2: 200 as a file, the contract's shape with the version and no places, in the language asked for", async () => {
    const { deps, family } = fakes();
    const response = await handleTreeExport(
      TREE_ID.toUpperCase(),
      get(`/api/v1/trees/${TREE_ID}/export?lang=en`),
      deps,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="tree-${TREE_ID.slice(0, 8)}.json"`,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBe("req-1");
    expect(family.exportTree).toHaveBeenCalledWith({ userId: USER, treeId: TREE_ID });
    const body: unknown = await response.json();
    expect(treeResponseSchema.safeParse(body).success).toBe(true);
    const fixture = tree();
    expect(body).toEqual({
      schema_version: "1.1",
      tree: fixture.tree,
      persons: fixture.persons,
      parentage: fixture.parentage,
      members: fixture.members,
      hidden_living_count: 0,
      places: [],
    });
    expect(body).not.toHaveProperty("place_codes");
    const polish = await handleTreeExport(TREE_ID, get(`/api/v1/trees/${TREE_ID}/export`), deps);
    expect(polish.headers.get("content-disposition")).toContain(
      `drzewo-${TREE_ID.slice(0, 8)}.json`,
    );
    expect(exportFileName("pl", TREE_ID)).toBe("drzewo-0199a1b2.json");
  });

  it("AC-3: a member's export is the member's view, as the service gives it", async () => {
    const { deps } = fakes(treeForMember());
    const response = await handleTreeExport(TREE_ID, get(`/api/v1/trees/${TREE_ID}/export`), deps);
    const body = treeResponseSchema.parse(await response.json());
    expect(body.tree.role).toBe("VIEWER");
    expect(body.members).toBeNull();
    expect(body.hidden_living_count).toBe(4);
    expect(body.persons.every((p) => p.living_status === "DECEASED")).toBe(true);
  });

  it("AC-5: a failure is the error envelope with the request id, and no log line carries a name or the title", async () => {
    const { deps, family, logged } = fakes();
    await handleTreeExport(TREE_ID, get(`/api/v1/trees/${TREE_ID}/export`), deps);
    family.exportTree.mockRejectedValueOnce(new Error("Zielińska leaked?"));
    const failed = await handleTreeExport(TREE_ID, get(`/api/v1/trees/${TREE_ID}/export`), deps);
    expect(failed.status).toBe(500);
    expect(await failed.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "the request could not be completed",
        retryable: false,
        request_id: "req-1",
      },
    });
    const text = JSON.stringify(logged);
    expect(text).not.toContain("Zieli");
    expect(text).not.toContain("Marta");
    expect(text).not.toContain("Rodzina");
    expect(logged.map((l) => l.event)).toEqual(["tree_exported", "tree_export_failed"]);
  });
});
