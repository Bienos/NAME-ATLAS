import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { createMigrator, createPool } from "@name-atlas/db";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { createFamily, createFamilyDb } from "@name-atlas/family";
import type { Family } from "@name-atlas/family";

/**
 * TASK-068: the family tree over a real PostgreSQL, as the role that will run
 * it, with the row-level security policies of migration 0030 applied to it.
 *
 * As in `accounts.test.ts`, the roles come from `ops/vm/accounts-roles.sql`
 * itself. The three accounts below are inserted as the superuser, complete,
 * so that no sign-up flow is needed here; every name and date is invented.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ROLES_SQL = readFileSync(path.join(repoRoot, "ops/vm/accounts-roles.sql"), "utf8");

const APP_PASSWORD = "app-role-test-password";
const WEB_PASSWORD = "web-role-test-password";
const OWNER = "0199a1b2-0000-7000-8000-00000000aa01";
const MEMBER = "0199a1b2-0000-7000-8000-00000000aa02";
const STRANGER = "0199a1b2-0000-7000-8000-00000000aa03";

function urlAs(connectionUri: string, user: string, password: string): string {
  const url = new URL(connectionUri);
  url.username = user;
  url.password = password;
  return url.toString();
}

describe("family tree (TASK-068, ADR-0029)", () => {
  let database: TestDatabase | undefined;
  let appPool: ReturnType<typeof createPool> | undefined;
  let webPool: ReturnType<typeof createPool> | undefined;
  let family: Family;
  let treeId = "";
  const people: Record<string, string> = {};

  const db = (): TestDatabase => {
    if (!database) throw new Error("test database was not started");
    return database;
  };
  const app = (): ReturnType<typeof createPool> => {
    if (!appPool) throw new Error("app pool was not started");
    return appPool;
  };
  const web = (): ReturnType<typeof createPool> => {
    if (!webPool) throw new Error("web pool was not started");
    return webPool;
  };

  async function ok<T extends { kind: string }>(result: T, kind: string): Promise<T> {
    expect(result.kind).toBe(kind);
    return result;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
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

    for (const [id, email] of [
      [OWNER, "owner@example.test"],
      [MEMBER, "member@example.test"],
      [STRANGER, "stranger@example.test"],
    ]) {
      await sql`
        INSERT INTO accounts.users
          (user_id, email, email_normalised, language, password_hash, email_verified_at,
           terms_version, terms_accepted_at, created_at, updated_at, last_sign_in_at)
        VALUES
          (${id}, ${email}, ${email}, 'pl', 'scrypt$N=1024,r=8,p=1$00$00', now(), '2026-10-01', now(), now(), now(), null)
      `.execute(db().db);
    }

    appPool = createPool({ databaseUrl: urlAs(db().connectionUri, "nameatlas_app", APP_PASSWORD) });
    webPool = createPool({ databaseUrl: urlAs(db().connectionUri, "nameatlas_web", WEB_PASSWORD) });
    family = createFamily({ db: createFamilyDb(appPool) });
  });

  afterAll(async () => {
    await appPool?.end();
    await webPool?.end();
    await database?.stop();
  });

  it("serializes opposing parent links so concurrent edits cannot create a cycle", async () => {
    const created = await family.createTree({ userId: OWNER, title: "Concurrent fixture" });
    expect(created.kind).toBe("CREATED");
    if (created.kind !== "CREATED") return;
    try {
      const ids: string[] = [];
      for (const givenNames of ["A", "B"]) {
        const person = await family.addPerson({
          userId: OWNER,
          treeId: created.treeId,
          person: { givenNames, surname: "Fixture" },
        });
        if (person.kind !== "OK") throw new Error("fixture person failed");
        ids.push(person.personId);
      }
      const results = await Promise.all([
        family.setParent({ userId: OWNER, childId: ids[0]!, parentId: ids[1]!, role: "PARENT" }),
        family.setParent({ userId: OWNER, childId: ids[1]!, parentId: ids[0]!, role: "PARENT" }),
      ]);
      expect(results.filter((r) => r.kind === "OK")).toHaveLength(1);
      expect(results).toContainEqual({ kind: "INVALID", problem: "WOULD_CYCLE" });
    } finally {
      await family.deleteTree({ userId: OWNER, treeId: created.treeId });
    }
  });

  it("serializes additions to a child so concurrent edits cannot add a third parent", async () => {
    const created = await family.createTree({ userId: OWNER, title: "Parent limit fixture" });
    if (created.kind !== "CREATED") throw new Error("fixture tree failed");
    try {
      const ids: string[] = [];
      for (const givenNames of ["Child", "A", "B", "C"]) {
        const person = await family.addPerson({
          userId: OWNER,
          treeId: created.treeId,
          person: { givenNames, surname: "Fixture" },
        });
        if (person.kind !== "OK") throw new Error("fixture person failed");
        ids.push(person.personId);
      }
      expect(
        await family.setParent({
          userId: OWNER,
          childId: ids[0]!,
          parentId: ids[1]!,
          role: "PARENT",
        }),
      ).toEqual({ kind: "OK" });
      const results = await Promise.all(
        ids
          .slice(2)
          .map((parentId) =>
            family.setParent({ userId: OWNER, childId: ids[0]!, parentId, role: "PARENT" }),
          ),
      );
      expect(results.filter((r) => r.kind === "OK")).toHaveLength(1);
      expect(results).toContainEqual({ kind: "INVALID", problem: "TOO_MANY_PARENTS" });
    } finally {
      await family.deleteTree({ userId: OWNER, treeId: created.treeId });
    }
  });

  it("requires the complete graph before an editor changes parentage", async () => {
    const created = await family.createTree({ userId: OWNER, title: "Visibility fixture" });
    if (created.kind !== "CREATED") throw new Error("fixture tree failed");
    try {
      const ids: string[] = [];
      for (const givenNames of ["A", "B"]) {
        const person = await family.addPerson({
          userId: OWNER,
          treeId: created.treeId,
          person: { givenNames, surname: "Fixture", deathYear: 1900 },
        });
        if (person.kind !== "OK") throw new Error("fixture person failed");
        ids.push(person.personId);
      }
      await family.addMember({
        userId: OWNER,
        treeId: created.treeId,
        memberUserId: MEMBER,
        role: "EDITOR",
      });
      const link = { userId: MEMBER, childId: ids[0]!, parentId: ids[1]!, role: "PARENT" as const };
      expect(await family.setParent(link)).toEqual({ kind: "FORBIDDEN" });
      await family.setSeesLiving({
        userId: OWNER,
        treeId: created.treeId,
        memberUserId: MEMBER,
        seesLiving: true,
      });
      expect(await family.setParent(link)).toEqual({ kind: "OK" });
    } finally {
      await family.deleteTree({ userId: OWNER, treeId: created.treeId });
    }
  });

  it("gives a child one mother and one father, and any other link a PARENT role", async () => {
    const created = await family.createTree({ userId: OWNER, title: "Role fixture" });
    if (created.kind !== "CREATED") throw new Error("fixture tree failed");
    try {
      const ids: string[] = [];
      for (const givenNames of ["Child", "A", "B"]) {
        const person = await family.addPerson({
          userId: OWNER,
          treeId: created.treeId,
          person: { givenNames, surname: "Fixture", deathYear: 1900 },
        });
        if (person.kind !== "OK") throw new Error("fixture person failed");
        ids.push(person.personId);
      }
      const link = (parentId: string, role: "MOTHER" | "FATHER" | "PARENT") =>
        family.setParent({ userId: OWNER, childId: ids[0]!, parentId, role });
      expect(await link(ids[1]!, "MOTHER")).toEqual({ kind: "OK" });
      expect(await link(ids[2]!, "MOTHER")).toEqual({ kind: "INVALID", problem: "ROLE_TAKEN" });
      // The same parent keeps the right to change the role, and a second
      // parent may be a father or a PARENT.
      expect(await link(ids[1]!, "MOTHER")).toEqual({ kind: "OK" });
      expect(await link(ids[2]!, "FATHER")).toEqual({ kind: "OK" });
      // The database holds the same line when the service is not asked.
      await expect(
        sql`INSERT INTO family.parentage (child_id, parent_id, role, created_at)
            VALUES (${ids[0]!}, ${ids[2]!}, 'MOTHER', now())`.execute(db().db),
      ).rejects.toThrow();
    } finally {
      await family.deleteTree({ userId: OWNER, treeId: created.treeId });
    }
  });

  it("does not let an editor who cannot see the living delete a person with hidden links", async () => {
    const created = await family.createTree({ userId: OWNER, title: "Delete fixture" });
    if (created.kind !== "CREATED") throw new Error("fixture tree failed");
    try {
      const parent = await family.addPerson({
        userId: OWNER,
        treeId: created.treeId,
        person: { givenNames: "Parent", surname: "Fixture", deathYear: 1900 },
      });
      const child = await family.addPerson({
        userId: OWNER,
        treeId: created.treeId,
        person: { givenNames: "Child", surname: "Fixture", livingStatus: "LIVING" },
      });
      if (parent.kind !== "OK" || child.kind !== "OK") throw new Error("fixture person failed");
      expect(
        await family.setParent({
          userId: OWNER,
          childId: child.personId,
          parentId: parent.personId,
          role: "PARENT",
        }),
      ).toEqual({ kind: "OK" });
      await family.addMember({
        userId: OWNER,
        treeId: created.treeId,
        memberUserId: MEMBER,
        role: "EDITOR",
      });
      expect(await family.deletePerson({ userId: MEMBER, personId: parent.personId })).toEqual({
        kind: "FORBIDDEN",
      });
      const stored = await sql<{ n: string }>`
        SELECT count(*)::text AS n FROM family.parentage WHERE parent_id = ${parent.personId}
      `.execute(db().db);
      expect(stored.rows[0]?.n).toBe("1");
      await family.setSeesLiving({
        userId: OWNER,
        treeId: created.treeId,
        memberUserId: MEMBER,
        seesLiving: true,
      });
      expect(await family.deletePerson({ userId: MEMBER, personId: parent.personId })).toEqual({
        kind: "OK",
      });
    } finally {
      await family.deleteTree({ userId: OWNER, treeId: created.treeId });
    }
  });

  it("moves the tree's updated_at when an editor changes it", async () => {
    const created = await family.createTree({ userId: OWNER, title: "Touch fixture" });
    if (created.kind !== "CREATED") throw new Error("fixture tree failed");
    try {
      await family.addMember({
        userId: OWNER,
        treeId: created.treeId,
        memberUserId: MEMBER,
        role: "EDITOR",
      });
      const stamp = async (): Promise<string> => {
        const row = await sql<{ at: string }>`
          SELECT updated_at::text AS at FROM family.trees WHERE tree_id = ${created.treeId}
        `.execute(db().db);
        return row.rows[0]?.at ?? "";
      };
      const before = await stamp();
      await new Promise((resolve) => setTimeout(resolve, 20));
      const added = await family.addPerson({
        userId: MEMBER,
        treeId: created.treeId,
        person: { givenNames: "Added", surname: "ByEditor", deathYear: 1900 },
      });
      expect(added.kind).toBe("OK");
      expect(await stamp()).not.toBe(before);
    } finally {
      await family.deleteTree({ userId: OWNER, treeId: created.treeId });
    }
  });

  it("rechecks living visibility after a graph edit waits for the tree lock", async () => {
    const created = await family.createTree({ userId: OWNER, title: "Permission concurrency" });
    if (created.kind !== "CREATED") throw new Error("tree refused");
    const id = created.treeId;
    const child = await family.addPerson({
      userId: OWNER,
      treeId: id,
      person: { givenNames: "Child", surname: "Fixture", deathYear: 1980 },
    });
    const parent = await family.addPerson({
      userId: OWNER,
      treeId: id,
      person: { givenNames: "Parent", surname: "Fixture", deathYear: 1960 },
    });
    if (child.kind !== "OK" || parent.kind !== "OK") throw new Error("people refused");
    await ok(
      await family.addMember({ userId: OWNER, treeId: id, memberUserId: MEMBER, role: "EDITOR" }),
      "OK",
    );
    await ok(
      await family.setSeesLiving({
        userId: OWNER,
        treeId: id,
        memberUserId: MEMBER,
        seesLiving: true,
      }),
      "OK",
    );
    const blocker = createPool({ databaseUrl: db().connectionUri });
    const client = await blocker.connect();
    let revoke: ReturnType<Family["setSeesLiving"]> | undefined;
    let link: ReturnType<Family["setParent"]> | undefined;
    const waitForLock = async (count: number) => {
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        const result = await sql<{ n: number }>`
          SELECT count(*)::int AS n FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
          WHERE l.locktype = 'advisory' AND NOT l.granted
            AND a.datname = current_database() AND a.usename = 'nameatlas_app'
        `.execute(db().db);
        if ((result.rows[0]?.n ?? 0) >= count) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error("tree operations did not wait for the shared lock");
    };
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [id]);
      revoke = family.setSeesLiving({
        userId: OWNER,
        treeId: id,
        memberUserId: MEMBER,
        seesLiving: false,
      });
      await waitForLock(1);
      link = family.setParent({
        userId: MEMBER,
        childId: child.personId,
        parentId: parent.personId,
        role: "PARENT",
      });
      await waitForLock(2);
      await client.query("COMMIT");
      expect(await revoke).toEqual({ kind: "OK" });
      expect(await link).toEqual({ kind: "FORBIDDEN" });
      const tree = await family.getTree({ userId: OWNER, treeId: id });
      if (tree.kind !== "OK") throw new Error("tree unreadable");
      expect(tree.tree.parentage).toEqual([]);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      await Promise.allSettled([revoke, link]);
      client.release();
      await blocker.end();
    }
  });

  it("creates a tree and its people, and a death year makes a person DECEASED (AC-1)", async () => {
    const created = await ok(
      await family.createTree({ userId: OWNER, title: " Rodzina Zielińskich " }),
      "CREATED",
    );
    if (created.kind !== "CREATED") return;
    treeId = created.treeId;

    const add = async (key: string, person: Parameters<Family["addPerson"]>[0]["person"]) => {
      const result = await ok(await family.addPerson({ userId: OWNER, treeId, person }), "OK");
      if (result.kind === "OK") people[key] = result.personId;
    };
    await add("marta", {
      givenNames: "Marta",
      surname: "Zielińska",
      birthYear: 1991,
      livingStatus: "LIVING",
      notes: "ja",
    });
    await add("andrzej", {
      givenNames: "Andrzej",
      surname: "Zieliński",
      birthYear: 1962,
      birthPlaceCode: "0960432",
    });
    await add("józef", {
      givenNames: "Józef",
      surname: "Zieliński",
      birthYear: 1934,
      deathYear: 2009,
      livingStatus: "LIVING",
    });
    await add("halina", {
      givenNames: "Halina",
      surname: "Zielińska",
      birthSurname: "Kaczmarek",
      birthYear: 1937,
      deathYear: 2015,
    });

    const tree = await family.getTree({ userId: OWNER, treeId });
    expect(tree.kind).toBe("OK");
    if (tree.kind !== "OK") return;
    expect(tree.tree.tree.title).toBe("Rodzina Zielińskich");
    expect(tree.tree.tree.role).toBe("OWNER");
    expect(tree.tree.persons).toHaveLength(4);
    const józef = tree.tree.persons.find((p) => p.id === people["józef"]);
    expect(józef?.living_status).toBe("DECEASED");
    expect(józef?.treated_as_living).toBe(false);
    const andrzej = tree.tree.persons.find((p) => p.id === people["andrzej"]);
    expect(andrzej?.living_status).toBe("UNKNOWN");
    expect(andrzej?.treated_as_living).toBe(true);
    expect(tree.tree.place_codes).toEqual(["0960432"]);
    expect(tree.tree.hidden_living_count).toBe(0);
    expect(tree.tree.members).toEqual([]);
  });

  it("refuses an invalid person without touching the database", async () => {
    const result = await family.addPerson({
      userId: OWNER,
      treeId,
      person: { givenNames: "", surname: "X", birthYear: 2000, deathYear: 1990 },
    });
    expect(result).toEqual({ kind: "INVALID", problems: ["GIVEN_NAMES", "DEATH_BEFORE_BIRTH"] });
  });

  it("links parents with a role, two at most, never in a loop (AC-2)", async () => {
    await ok(
      await family.setParent({
        userId: OWNER,
        childId: people["marta"]!,
        parentId: people["andrzej"]!,
        role: "FATHER",
      }),
      "OK",
    );
    await ok(
      await family.setParent({
        userId: OWNER,
        childId: people["andrzej"]!,
        parentId: people["józef"]!,
        role: "FATHER",
      }),
      "OK",
    );
    await ok(
      await family.setParent({
        userId: OWNER,
        childId: people["andrzej"]!,
        parentId: people["halina"]!,
        role: "MOTHER",
      }),
      "OK",
    );

    const third = await family.setParent({
      userId: OWNER,
      childId: people["andrzej"]!,
      parentId: people["marta"]!,
      role: "PARENT",
    });
    expect(third).toEqual({ kind: "INVALID", problem: "TOO_MANY_PARENTS" });
    const loop = await family.setParent({
      userId: OWNER,
      childId: people["józef"]!,
      parentId: people["marta"]!,
      role: "PARENT",
    });
    expect(loop).toEqual({ kind: "INVALID", problem: "WOULD_CYCLE" });
    const self = await family.setParent({
      userId: OWNER,
      childId: people["marta"]!,
      parentId: people["marta"]!,
      role: "PARENT",
    });
    expect(self).toEqual({ kind: "INVALID", problem: "SAME_PERSON" });

    // A link that exists takes the new role.
    await ok(
      await family.setParent({
        userId: OWNER,
        childId: people["marta"]!,
        parentId: people["andrzej"]!,
        role: "PARENT",
      }),
      "OK",
    );
    const tree = await family.getTree({ userId: OWNER, treeId });
    if (tree.kind !== "OK") return;
    expect(tree.tree.parentage).toHaveLength(3);
    expect(tree.tree.parentage.find((e) => e.child_id === people["marta"])?.role).toBe("PARENT");
  });

  it("keeps a parent from another tree out, by the service and by the policy (AC-3)", async () => {
    const other = await family.createTree({ userId: MEMBER, title: "Linia Wróblów" });
    if (other.kind !== "CREATED") throw new Error("second tree refused");
    const outsider = await family.addPerson({
      userId: MEMBER,
      treeId: other.treeId,
      person: { givenNames: "Stanisław", surname: "Wróbel", deathYear: 1998 },
    });
    if (outsider.kind !== "OK") throw new Error("outsider refused");
    // The service cannot even see the outsider as OWNER: it answers NOT_FOUND.
    const linked = await family.setParent({
      userId: OWNER,
      childId: people["marta"]!,
      parentId: outsider.personId,
      role: "PARENT",
    });
    expect(linked).toEqual({ kind: "NOT_FOUND" });
    // The policy refuses the row even when the SQL names both ids directly.
    const client = await app().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.user_id', $1, true)", [OWNER]);
      await expect(
        client.query(
          "INSERT INTO family.parentage (child_id, parent_id, role, created_at) VALUES ($1, $2, 'PARENT', now())",
          [people["marta"], outsider.personId],
        ),
      ).rejects.toMatchObject({ code: "42501" });
      await client.query("ROLLBACK");
    } finally {
      // A failed assertion above skips the ROLLBACK; never hand back a client mid-transaction.
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("shows a stranger nothing, by the policy, not by the service (AC-4)", async () => {
    expect(await family.getTree({ userId: STRANGER, treeId })).toEqual({ kind: "NOT_FOUND" });
    expect(await family.listTrees(STRANGER)).toEqual([]);
    expect(
      await family.addPerson({
        userId: STRANGER,
        treeId,
        person: { givenNames: "X", surname: "Y" },
      }),
    ).toEqual({ kind: "NOT_FOUND" });
    expect(await family.deleteTree({ userId: STRANGER, treeId })).toEqual({ kind: "NOT_FOUND" });

    // Direct SQL as the app role, with no user set and then with the stranger set.
    const client = await app().connect();
    try {
      const none = await client.query("SELECT count(*)::int AS n FROM family.persons");
      expect(none.rows[0].n).toBe(0);
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.user_id', $1, true)", [STRANGER]);
      const asStranger = await client.query("SELECT count(*)::int AS n FROM family.trees");
      expect(asStranger.rows[0].n).toBe(0);
      await client.query("ROLLBACK");
      // And as the owner, the policy opens the tree.
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.user_id', $1, true)", [OWNER]);
      const asOwner = await client.query(
        "SELECT count(*)::int AS n FROM family.persons WHERE tree_id = $1",
        [treeId],
      );
      expect(asOwner.rows[0].n).toBe(4);
      await client.query("ROLLBACK");
    } finally {
      // A failed assertion above skips the ROLLBACK; never hand back a client mid-transaction.
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("hides the living and the unknown from a member until the owner says otherwise (AC-5)", async () => {
    await ok(
      await family.addMember({ userId: OWNER, treeId, memberUserId: MEMBER, role: "VIEWER" }),
      "OK",
    );
    expect(
      await family.addMember({ userId: OWNER, treeId, memberUserId: MEMBER, role: "VIEWER" }),
    ).toEqual({
      kind: "INVALID",
      problem: "ALREADY_MEMBER",
    });
    expect(
      await family.addMember({ userId: OWNER, treeId, memberUserId: OWNER, role: "VIEWER" }),
    ).toEqual({
      kind: "INVALID",
      problem: "SELF",
    });

    const asViewer = await family.getTree({ userId: MEMBER, treeId });
    expect(asViewer.kind).toBe("OK");
    if (asViewer.kind !== "OK") return;
    expect(asViewer.tree.tree.role).toBe("VIEWER");
    expect(asViewer.tree.persons.map((p) => p.given_names).sort()).toEqual(["Halina", "Józef"]);
    expect(asViewer.tree.hidden_living_count).toBe(2);
    // Józef → Andrzej and Halina → Andrzej touch a hidden person: not shown.
    expect(asViewer.tree.parentage).toEqual([]);
    expect(asViewer.tree.members).toBeNull();
    expect(asViewer.tree.persons.every((p) => p.notes === null)).toBe(true);

    // A viewer may not write.
    expect(
      await family.addPerson({ userId: MEMBER, treeId, person: { givenNames: "X", surname: "Y" } }),
    ).toEqual({ kind: "FORBIDDEN" });
    expect(await family.deletePerson({ userId: MEMBER, personId: people["józef"]! })).toEqual({
      kind: "FORBIDDEN",
    });
    expect(await family.deleteTree({ userId: MEMBER, treeId })).toEqual({ kind: "FORBIDDEN" });

    await ok(
      await family.setSeesLiving({ userId: OWNER, treeId, memberUserId: MEMBER, seesLiving: true }),
      "OK",
    );
    const seeing = await family.getTree({ userId: MEMBER, treeId });
    if (seeing.kind !== "OK") return;
    expect(seeing.tree.persons).toHaveLength(4);
    expect(seeing.tree.hidden_living_count).toBe(0);
    expect(seeing.tree.parentage).toHaveLength(3);

    // A member may not change who sees what.
    expect(
      await family.setSeesLiving({
        userId: MEMBER,
        treeId,
        memberUserId: MEMBER,
        seesLiving: false,
      }),
    ).toEqual({ kind: "FORBIDDEN" });

    const summaries = await family.listTrees(MEMBER);
    expect(summaries.map((t) => [t.title, t.role, t.person_count])).toEqual(
      expect.arrayContaining([
        ["Rodzina Zielińskich", "VIEWER", 4],
        ["Linia Wróblów", "OWNER", 1],
      ]),
    );
  });

  it("records who sees what, and the app role can neither change nor remove an audit row (AC-6)", async () => {
    const client = await app().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.user_id', $1, true)", [OWNER]);
      const kinds = await client.query<{ kind: string }>(
        "SELECT kind FROM family.audit_events WHERE tree_id = $1 ORDER BY at, event_id",
        [treeId],
      );
      const seen = kinds.rows.map((r) => r.kind);
      for (const expected of [
        "TREE_CREATED",
        "PERSON_CREATED",
        "PARENT_SET",
        "MEMBER_ADDED",
        "SEES_LIVING_CHANGED",
      ]) {
        expect(seen).toContain(expected);
      }
      const names = await client.query(
        "SELECT to_jsonb(a)::text AS row FROM family.audit_events a WHERE tree_id = $1",
        [treeId],
      );
      for (const r of names.rows as { row: string }[]) {
        expect(r.row).not.toMatch(/Zieli|Marta|Halina/u);
      }
      const deleted = await client.query("DELETE FROM family.audit_events WHERE tree_id = $1", [
        treeId,
      ]);
      expect(deleted.rowCount).toBe(0);
      const updated = await client.query(
        "UPDATE family.audit_events SET kind = 'EXPORTED' WHERE tree_id = $1",
        [treeId],
      );
      expect(updated.rowCount).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      // A failed assertion above skips the ROLLBACK; never hand back a client mid-transaction.
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
    const exported = await family.exportTree({ userId: OWNER, treeId });
    expect(exported.kind).toBe("OK");
  });

  it("gives the read-only role nothing of the schema (AC-7)", async () => {
    await expect(web().query("SELECT * FROM family.trees")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      web().query("SELECT family.hidden_living_count('0199a1b2-0000-7000-8000-000000000000')"),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("deletes a tree with its people, links, members and audit rows, and an account with its trees (AC-8)", async () => {
    const mine = await family.createTree({ userId: OWNER, title: "Do usunięcia" });
    if (mine.kind !== "CREATED") throw new Error("tree refused");
    await ok(await family.deleteTree({ userId: OWNER, treeId: mine.treeId }), "OK");
    expect(await family.getTree({ userId: OWNER, treeId: mine.treeId })).toEqual({
      kind: "NOT_FOUND",
    });

    await sql`DELETE FROM accounts.users WHERE user_id = ${OWNER}`.execute(db().db);
    const left = await sql<{ n: number }>`
      SELECT (SELECT count(*) FROM family.trees WHERE tree_id = ${treeId})::int
           + (SELECT count(*) FROM family.persons WHERE tree_id = ${treeId})::int
           + (SELECT count(*) FROM family.members WHERE tree_id = ${treeId})::int
           + (SELECT count(*) FROM family.audit_events WHERE tree_id = ${treeId})::int AS n
    `.execute(db().db);
    expect(left.rows[0]?.n).toBe(0);
    // The member's own tree is untouched.
    expect((await family.listTrees(MEMBER)).map((t) => t.title)).toEqual(["Linia Wróblów"]);
  });

  it("0030 down refuses while a tree is stored and changes nothing (AC-9)", async () => {
    const migrator = createMigrator(db().db);
    // `0031` (given names, TASK-076) sits above and holds nothing here.
    const givenNames = await migrator.migrateDown();
    expect(givenNames.results?.map((r) => r.migrationName)).toEqual(["0031_given_names"]);
    const { error } = await migrator.migrateDown();
    expect(String(error)).toMatch(/refusing to drop schema family/u);
    const still = await sql<{ n: number }>`SELECT count(*)::int AS n FROM family.trees`.execute(
      db().db,
    );
    expect(still.rows[0]?.n).toBe(1);
  });
});
