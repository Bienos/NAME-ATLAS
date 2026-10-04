import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { createDb, createPool } from "@name-atlas/db";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  createAccounts,
  createAccountsDb,
  createPasswordHasher,
  hashToken,
} from "@name-atlas/accounts";
import { createFamily, createFamilyDb } from "@name-atlas/family";
import type { Family } from "@name-atlas/family";
import {
  importTerytRegisters,
  readTerytManifest,
  seedSourceCatalogue,
  seedVoivodeshipPlaces,
  terytFileInput,
} from "@name-atlas/sources";
import { loadTreePage } from "../../../apps/web/src/lib/tree-load.js";
import { searchPlaces } from "../../../apps/web/src/lib/tree-places.js";
import { handleTreePost } from "../../../apps/web/src/lib/tree-routes.js";
import type { TreeRouteDeps } from "../../../apps/web/src/lib/tree-routes.js";

/**
 * TASK-076 AC-4 and AC-5 against a real PostgreSQL, as the roles that will
 * run it: the pages' loader and the routes over `@name-atlas/family` and
 * `@name-atlas/accounts` on `nameatlas_app`, with migration 0028's policies
 * applied, and the birthplace lookup on `nameatlas_web` over the TERYT
 * excerpt (`fixtures/teryt`, GENUINE DATA, 14 lines of the official files).
 *
 * The two accounts are inserted complete, as `family.test.ts` does; every
 * name and date of the family is invented.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ROLES_SQL = readFileSync(path.join(repoRoot, "ops/vm/accounts-roles.sql"), "utf8");
const fixture = (name: string): Uint8Array =>
  readFileSync(path.join(repoRoot, "fixtures/teryt", name));

const APP_PASSWORD = "app-role-test-password";
const WEB_PASSWORD = "web-role-test-password";
const OWNER = "0199a1b2-0000-7000-8000-00000000cc01";
const MEMBER = "0199a1b2-0000-7000-8000-00000000cc02";
const OWNER_TOKEN = "O".repeat(43);
const MEMBER_TOKEN = "M".repeat(43);
const OLD_TERMS = "2026-10-01";
const CLAUSE = "2026-10-03";
const ORIGIN = "https://atlas.test";

function urlAs(connectionUri: string, user: string, password: string): string {
  const url = new URL(connectionUri);
  url.username = user;
  url.password = password;
  return url.toString();
}

function post(action: string, fields: Record<string, string>, token = OWNER_TOKEN): Request {
  return new Request(`${ORIGIN}/api/tree/${action}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: ORIGIN,
      cookie: `__Host-na_session=${token}`,
    },
    body: new URLSearchParams({ lang: "pl", ...fields }).toString(),
  });
}

function location(response: Response): URL {
  expect(response.status).toBe(303);
  return new URL(response.headers.get("location") ?? "", ORIGIN);
}

describe("the tree pages over a real database (TASK-076)", () => {
  let database: TestDatabase | undefined;
  let appPool: ReturnType<typeof createPool> | undefined;
  let webPool: ReturnType<typeof createPool> | undefined;
  let family: Family;
  let deps: TreeRouteDeps;
  let treeId = "";
  let rootId = "";
  let livingId = "";

  const db = (): TestDatabase => {
    if (!database) throw new Error("test database was not started");
    return database;
  };

  async function termsOf(userId: string): Promise<string | null> {
    const row = await sql<{ v: string | null }>`
      SELECT terms_version AS v FROM accounts.users WHERE user_id = ${userId}
    `.execute(db().db);
    return row.rows[0]?.v ?? null;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    await seedSourceCatalogue(database.db);
    await seedVoivodeshipPlaces(database.db);
    const manifest = readTerytManifest();
    const imported = await importTerytRegisters(database.db, {
      terc: terytFileInput(manifest, "TERC", fixture("terc-urzedowy-excerpt-2026-09-30.csv"), {
        excerpt: true,
      }),
      simc: terytFileInput(manifest, "SIMC", fixture("simc-urzedowy-excerpt-2026-09-30.csv"), {
        excerpt: true,
      }),
    });
    expect(imported.kind).toBe("IMPORTED");

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nameatlas') THEN
          CREATE ROLE nameatlas;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nameatlas_web') THEN
          CREATE ROLE nameatlas_web LOGIN;
        END IF;
      END
      $$
    `.execute(db().db);
    await sql.raw(`ALTER ROLE nameatlas_web PASSWORD '${WEB_PASSWORD}'`).execute(db().db);
    await sql`
      DO $$
      BEGIN
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO nameatlas_web', current_database());
      END
      $$
    `.execute(db().db);
    await sql`GRANT USAGE ON SCHEMA public TO nameatlas_web`.execute(db().db);
    await sql`GRANT SELECT ON ALL TABLES IN SCHEMA public TO nameatlas_web`.execute(db().db);
    await sql.raw(ROLES_SQL).execute(db().db);
    await sql.raw(`ALTER ROLE nameatlas_app PASSWORD '${APP_PASSWORD}'`).execute(db().db);

    for (const [id, email, token] of [
      [OWNER, "owner@example.test", OWNER_TOKEN],
      [MEMBER, "member@example.test", MEMBER_TOKEN],
    ] as const) {
      await sql`
        INSERT INTO accounts.users
          (user_id, email, email_normalised, language, password_hash, email_verified_at,
           terms_version, terms_accepted_at, created_at, updated_at, last_sign_in_at)
        VALUES
          (${id}, ${email}, ${email}, 'pl', 'scrypt$N=1024,r=8,p=1$00$00', now(), ${OLD_TERMS}, now(), now(), now(), null)
      `.execute(db().db);
      await sql`
        INSERT INTO accounts.sessions (session_id, user_id, token_hash, created_at, last_used_at, expires_at)
        VALUES (gen_random_uuid(), ${id}, ${hashToken(token)}, now(), now(), now() + interval '30 days')
      `.execute(db().db);
    }

    appPool = createPool({ databaseUrl: urlAs(db().connectionUri, "nameatlas_app", APP_PASSWORD) });
    webPool = createPool({ databaseUrl: urlAs(db().connectionUri, "nameatlas_web", WEB_PASSWORD) });
    family = createFamily({ db: createFamilyDb(appPool) });
    const accounts = createAccounts({
      db: createAccountsDb(appPool),
      hasher: createPasswordHasher(),
      links: { verify: () => "", reset: () => "" },
    });
    deps = {
      family,
      accounts,
      secure: true,
      livingTermsVersion: CLAUSE,
      log: { info: () => undefined, warn: () => undefined },
    };
  });

  afterAll(async () => {
    await appPool?.end();
    await webPool?.end();
    await database?.stop();
  });

  it("the routes create a tree and its first person, who becomes the root, as the session's user", async () => {
    const created = location(
      await handleTreePost(
        "create-tree",
        post("create-tree", { title: "Rodzina Zielińskich" }),
        deps,
      ),
    );
    const match = /^\/pl\/konto\/drzewa\/([0-9a-f-]{36})\/dodaj$/u.exec(created.pathname);
    expect(match).not.toBeNull();
    treeId = match?.[1] ?? "";

    const added = location(
      await handleTreePost(
        "add-person",
        post("add-person", {
          tree: treeId,
          given: "Józef",
          surname: "Zieliński",
          birth: "1934",
          death: "2009",
          living: "UNKNOWN",
        }),
        deps,
      ),
    );
    expect(added.pathname).toBe(`/pl/konto/drzewa/${treeId}`);
    expect(added.searchParams.get("status")).toBe("added");
    rootId = added.searchParams.get("person") ?? "";
    const read = await family.getTree({ userId: OWNER, treeId });
    expect(read.kind).toBe("OK");
    if (read.kind !== "OK") return;
    expect(read.tree.tree.root_person_id).toBe(rootId);
    expect(read.tree.persons[0]?.living_status).toBe("DECEASED");
  });

  it("AC-4: a living parent on the older terms goes to the consent step and is saved by the POST that accepts, which records the version", async () => {
    expect(await termsOf(OWNER)).toBe(OLD_TERMS);
    const fields = {
      tree: treeId,
      child: rootId,
      role: "MOTHER",
      given: "Marianna",
      surname: "Zielińska",
      birth: "1906",
      living: "LIVING",
    };
    const consent = location(await handleTreePost("add-person", post("add-person", fields), deps));
    expect(consent.pathname).toBe("/pl/konto/drzewa/zgoda");
    expect(consent.searchParams.get("given")).toBe("Marianna");
    const before = await family.getTree({ userId: OWNER, treeId });
    expect(before.kind === "OK" && before.tree.persons).toHaveLength(1);

    const refused = location(
      await handleTreePost("accept-living-terms", post("accept-living-terms", fields), deps),
    );
    expect(refused.searchParams.get("status")).toBe("terms");
    expect(await termsOf(OWNER)).toBe(OLD_TERMS);

    const saved = location(
      await handleTreePost(
        "accept-living-terms",
        post("accept-living-terms", { ...fields, terms: "on" }),
        deps,
      ),
    );
    expect(saved.searchParams.get("status")).toBe("added");
    livingId = saved.searchParams.get("person") ?? "";
    expect(await termsOf(OWNER)).toBe(CLAUSE);
    const after = await family.getTree({ userId: OWNER, treeId });
    if (after.kind !== "OK") throw new Error("tree not readable");
    expect(after.tree.persons.map((p) => p.living_status).sort()).toEqual(["DECEASED", "LIVING"]);
    expect(after.tree.parentage).toEqual([
      { child_id: rootId, parent_id: livingId, role: "MOTHER" },
    ]);

    // On the clause's version, the next living person needs no step.
    const again = location(
      await handleTreePost(
        "add-person",
        post("add-person", {
          tree: treeId,
          child: rootId,
          role: "FATHER",
          given: "Franciszek",
          surname: "Zieliński",
          birth: "1903",
        }),
        deps,
      ),
    );
    expect(again.searchParams.get("status")).toBe("added");
  });

  it("AC-5: the owner's pedigree has the slots; a member without sees_living gets the deceased and the count", async () => {
    const owner = await loadTreePage({
      enabled: true,
      lang: "pl",
      segments: [treeId],
      query: {},
      session: { userId: OWNER, termsVersion: CLAUSE },
      deps: { family, places: null },
    });
    if (owner.kind !== "view" || owner.data.kind !== "tree")
      throw new Error("expected the owner's pedigree");
    expect(owner.data.tree.tree.role).toBe("OWNER");
    expect(owner.data.slots.map((s) => [s.n, s.person?.given_names ?? null])).toEqual([
      [1, "Józef"],
      [2, "Franciszek"],
      [3, "Marianna"],
      [4, null],
      [5, null],
      [6, null],
      [7, null],
    ]);
    expect(owner.data.question).toMatchObject({ kind: "ask", role: "FATHER" });
    expect(owner.data.tree.hidden_living_count).toBe(0);

    const membership = await family.addMember({
      userId: OWNER,
      treeId,
      memberUserId: MEMBER,
      role: "VIEWER",
    });
    expect(membership.kind).toBe("OK");
    const member = await loadTreePage({
      enabled: true,
      lang: "en",
      segments: [treeId],
      query: {},
      session: { userId: MEMBER, termsVersion: OLD_TERMS },
      deps: { family, places: null },
    });
    if (member.kind !== "view" || member.data.kind !== "tree")
      throw new Error("expected the member's pedigree");
    expect(member.data.tree.tree.role).toBe("VIEWER");
    expect(member.data.tree.persons.map((p) => p.given_names).sort()).toEqual(["Józef"]);
    expect(member.data.tree.hidden_living_count).toBe(2);
    expect(member.data.tree.parentage).toEqual([]);
    expect(member.data.slots.map((s) => s.person?.given_names ?? null)).toEqual([
      "Józef",
      null,
      null,
    ]);
    // The Konstelacja (TASK-091) draws the same slots for both, and the member's hidden count.
    const sky = await loadTreePage({
      enabled: true,
      lang: "pl",
      segments: [treeId, "konstelacja"],
      query: { sel: "3" },
      session: { userId: OWNER, termsVersion: CLAUSE },
      deps: { family, places: null },
    });
    if (sky.kind !== "view" || sky.data.kind !== "constellation")
      throw new Error("expected the owner's constellation");
    expect(sky.data.slots.map((s) => s.n)).toEqual(owner.data.slots.map((s) => s.n));
    expect(sky.data.picked).toBe(3);
    expect(sky.data.unplacedCount).toBe(0);
    const memberSky = await loadTreePage({
      enabled: true,
      lang: "en",
      segments: [treeId, "constellation"],
      query: { sel: "3" },
      session: { userId: MEMBER, termsVersion: OLD_TERMS },
      deps: { family, places: null },
    });
    if (memberSky.kind !== "view" || memberSky.data.kind !== "constellation")
      throw new Error("expected the member's constellation");
    expect(memberSky.data.slots.map((s) => s.person?.given_names ?? null)).toEqual([
      "Józef",
      null,
      null,
    ]);
    expect(memberSky.data.picked).toBe(3);
    expect(memberSky.data.tree.hidden_living_count).toBe(2);

    // The member's forms are not pages, and the member's routes are refused by the policies.
    const form = await loadTreePage({
      enabled: true,
      lang: "en",
      segments: [treeId, "add"],
      query: {},
      session: { userId: MEMBER, termsVersion: CLAUSE },
      deps: { family, places: null },
    });
    expect(form).toEqual({ kind: "redirect", to: `/en/account/trees/${treeId}` });
    const refused = location(
      await handleTreePost(
        "add-person",
        post("add-person", { tree: treeId, given: "X", surname: "Y", death: "1900" }, MEMBER_TOKEN),
        deps,
      ),
    );
    expect(refused.searchParams.get("status")).toBe("forbidden");

    // And the dashboard lists the tree for both, with the role.
    const trees = await loadTreePage({
      enabled: true,
      lang: "pl",
      segments: undefined,
      query: {},
      session: { userId: MEMBER, termsVersion: CLAUSE },
      deps: { family, places: null },
    });
    if (trees.kind !== "view" || trees.data.kind !== "trees") throw new Error("expected the trees");
    expect(trees.data.trees).toMatchObject([{ tree_id: treeId, role: "VIEWER", person_count: 1 }]);
  });

  it("the birthplace lookup finds TERYT localities by a typed prefix, as the read-only role, with their district and voivodeship", async () => {
    const web = createDb(webPool!);
    const matches = await searchPlaces(web, "szkl");
    expect(matches.map((m) => m.name)).toEqual(["Szklary", "Szklary-Huta"]);
    expect(matches[0]).toMatchObject({
      code: expect.stringMatching(/^[0-9]{7}$/u),
      district: expect.any(String),
      region: expect.any(String),
    });
    expect(await searchPlaces(web, "s")).toEqual([]);
    expect(await searchPlaces(web, "%")).toEqual([]);
    expect(await searchPlaces(web, "Ząbkowice")).toMatchObject([{ name: "Ząbkowice Śląskie" }]);
    // A code a match gives is accepted by the form's save.
    const code = matches[0]?.code ?? "";
    const saved = location(
      await handleTreePost(
        "add-person",
        post("add-person", {
          tree: treeId,
          given: "Jan",
          surname: "Szklarski",
          death: "1950",
          place_code: `${code} ${matches[0]?.name ?? ""}`,
          place: "szkl",
        }),
        deps,
      ),
    );
    expect(saved.searchParams.get("status")).toBe("added");
    const read = await family.getTree({ userId: OWNER, treeId });
    if (read.kind !== "OK") throw new Error("tree not readable");
    expect(read.tree.persons.find((p) => p.given_names === "Jan")?.birth).toEqual({
      year: null,
      approx: false,
      place_code: code,
      place_text: "Szklary",
    });
    expect(read.tree.place_codes).toContain(code);
  });
});
