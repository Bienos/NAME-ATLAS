import { createHash, randomUUID } from "node:crypto";
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
 * TASK-094 (ADR-0029 §2.6.20–23): invitations and claims over a real
 * PostgreSQL, as the app role, with the policies of migration 0033 applied to
 * it. The flow end to end, then what each answer leaves behind, then the
 * limits and the policies. Every name, date and address is invented.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ROLES_SQL = readFileSync(path.join(repoRoot, "ops/vm/accounts-roles.sql"), "utf8");

const APP_PASSWORD = "app-role-test-password";
const OWNER = "0199a1b2-0000-7000-8000-00000000ab01";
const MEMBER = "0199a1b2-0000-7000-8000-00000000ab02";
const RELATIVE = "0199a1b2-0000-7000-8000-00000000ab03";
const OTHER = "0199a1b2-0000-7000-8000-00000000ab04";
const LEAVER = "0199a1b2-0000-7000-8000-00000000ab05";

function hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function urlAs(connectionUri: string, user: string, password: string): string {
  const url = new URL(connectionUri);
  url.username = user;
  url.password = password;
  return url.toString();
}

describe("invitations and claims (TASK-094, ADR-0029 §2.6)", () => {
  let database: TestDatabase | undefined;
  let appPool: ReturnType<typeof createPool> | undefined;
  let family: Family;
  let treeId = "";
  let martaId = "";
  let ewaId = "";
  let jozefId = "";
  let token = "";

  const db = (): TestDatabase => {
    if (!database) throw new Error("test database was not started");
    return database;
  };
  const app = (): ReturnType<typeof createPool> => {
    if (!appPool) throw new Error("app pool was not started");
    return appPool;
  };

  /** A fresh token's hash and an address's hash, as the route makes them. */
  const fresh = (): string => hex(randomUUID());
  const address = (email: string): string => hex(`accounts:email:${email}`);

  async function invite(personId: string, email: string, tokenHash = fresh()) {
    return family.invite({
      userId: OWNER,
      treeId,
      personId,
      tokenHash,
      addressHash: address(email),
    });
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
    await sql.raw(ROLES_SQL).execute(db().db);
    await sql.raw(`ALTER ROLE nameatlas_app PASSWORD '${APP_PASSWORD}'`).execute(db().db);
    for (const [id, email] of [
      [OWNER, "owner@example.test"],
      [MEMBER, "member@example.test"],
      [RELATIVE, "relative@example.test"],
      [OTHER, "other@example.test"],
      [LEAVER, "leaver@example.test"],
    ]) {
      await sql`
        INSERT INTO accounts.users
          (user_id, email, email_normalised, language, password_hash, email_verified_at,
           terms_version, terms_accepted_at, created_at, updated_at, last_sign_in_at)
        VALUES
          (${id}, ${email}, ${email}, 'pl', 'scrypt$N=1024,r=8,p=1$00$00', now(), '2026-10-03', now(), now(), now(), null)
      `.execute(db().db);
    }
    appPool = createPool({ databaseUrl: urlAs(db().connectionUri, "nameatlas_app", APP_PASSWORD) });
    family = createFamily({ db: createFamilyDb(appPool) });

    const created = await family.createTree({ userId: OWNER, title: "Rodzina Zielińskich" });
    if (created.kind !== "CREATED") throw new Error("fixture tree failed");
    treeId = created.treeId;
    const add = async (person: Parameters<Family["addPerson"]>[0]["person"]): Promise<string> => {
      const result = await family.addPerson({ userId: OWNER, treeId, person });
      if (result.kind !== "OK") throw new Error("fixture person failed");
      return result.personId;
    };
    martaId = await add({
      givenNames: "Marta",
      surname: "Zielińska",
      birthYear: 1991,
      birthPlaceText: "Szczebrzeszyn",
      livingStatus: "LIVING",
      notes: "the owner's note",
    });
    ewaId = await add({ givenNames: "Ewa", surname: "Zielińska", birthYear: 1964 });
    jozefId = await add({
      givenNames: "Józef",
      surname: "Zieliński",
      birthYear: 1934,
      deathYear: 2009,
    });
    await family.setParent({ userId: OWNER, childId: martaId, parentId: ewaId, role: "MOTHER" });
    await family.addMember({ userId: OWNER, treeId, memberUserId: MEMBER, role: "EDITOR" });
    await family.setSeesLiving({ userId: OWNER, treeId, memberUserId: MEMBER, seesLiving: true });
  });

  afterAll(async () => {
    await appPool?.end();
    await database?.stop();
  });

  it("AC-1: refuses, by name, the people and addresses that cannot be invited, and anyone but the owner", async () => {
    expect(await invite(jozefId, "j@example.test")).toEqual({
      kind: "INVALID",
      problem: "NOT_LIVING",
    });
    const minor = await family.addPerson({
      userId: OWNER,
      treeId,
      person: {
        givenNames: "Zosia",
        surname: "Zielińska",
        birthYear: new Date().getUTCFullYear() - 10,
        livingStatus: "LIVING",
      },
    });
    if (minor.kind !== "OK") throw new Error("fixture minor failed");
    expect(await invite(minor.personId, "z@example.test")).toEqual({
      kind: "INVALID",
      problem: "MINOR",
    });
    await family.deletePerson({ userId: OWNER, personId: minor.personId });
    expect(
      await family.invite({
        userId: MEMBER,
        treeId,
        personId: martaId,
        tokenHash: fresh(),
        addressHash: address("x@example.test"),
      }),
    ).toEqual({ kind: "FORBIDDEN" });
    expect(
      await family.invite({
        userId: OTHER,
        treeId,
        personId: martaId,
        tokenHash: fresh(),
        addressHash: address("x@example.test"),
      }),
    ).toEqual({ kind: "NOT_FOUND" });
    expect(await family.invitationOf({ userId: OWNER, personId: martaId })).toBeNull();
  });

  it("AC-1, AC-2: the owner invites; a second pending invitation is refused; the token opens the row and the parents' names, and nothing else", async () => {
    token = randomUUID();
    // The route hands the service the normalised address's hash; the test hashes the same text each time.
    const sent = await invite(martaId, "marta@example.test", hex(token));
    expect(sent.kind).toBe("OK");
    expect(await invite(martaId, "again@example.test")).toEqual({
      kind: "INVALID",
      problem: "PENDING",
    });
    const state = await family.invitationOf({ userId: OWNER, personId: martaId });
    expect(state).toMatchObject({ answered_at: null, answer: null });
    expect(await family.invitationOf({ userId: MEMBER, personId: martaId })).toBeNull();

    const opened = await family.openInvitation({ userId: RELATIVE, tokenHash: hex(token) });
    expect(opened.kind).toBe("OK");
    if (opened.kind !== "OK") return;
    expect(opened.card.person).toMatchObject({
      id: martaId,
      given_names: "Marta",
      surname: "Zielińska",
      birth: { year: 1991, place_text: "Szczebrzeszyn" },
      hidden_fields: [],
      claimed_at: null,
    });
    expect(opened.card.parents).toEqual([
      { given_names: "Ewa", surname: "Zielińska", role: "MOTHER" },
    ]);
    // Nothing else: not the tree, not its people, not its members.
    expect(await family.getTree({ userId: RELATIVE, treeId })).toEqual({ kind: "NOT_FOUND" });
    expect(await family.listTrees(RELATIVE)).toEqual([]);
    expect(await family.listCards(RELATIVE)).toEqual([]);
    expect(
      await family.openInvitation({ userId: RELATIVE, tokenHash: hex("not-a-token") }),
    ).toEqual({ kind: "NOT_FOUND" });

    // By the policy: with the token the relative reads two rows of `persons` (their own and the parent); without it none.
    const client = await app().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.user_id', $1, true)", [RELATIVE]);
      await client.query("SELECT set_config('app.invitation', $1, true)", [hex(token)]);
      const withToken = await client.query<{ given_names: string }>(
        "SELECT given_names FROM family.persons WHERE tree_id = $1 ORDER BY given_names",
        [treeId],
      );
      expect(withToken.rows.map((r) => r.given_names)).toEqual(["Ewa", "Marta"]);
      const members = await client.query("SELECT user_id FROM family.members WHERE tree_id = $1", [
        treeId,
      ]);
      expect(members.rowCount).toBe(0);
      const trees = await client.query("SELECT tree_id FROM family.trees WHERE tree_id = $1", [
        treeId,
      ]);
      expect(trees.rowCount).toBe(0);
      await client.query("ROLLBACK");
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.user_id', $1, true)", [RELATIVE]);
      const without = await client.query(
        "SELECT person_id FROM family.persons WHERE tree_id = $1",
        [treeId],
      );
      expect(without.rowCount).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("AC-3: 'to ja' claims the row; the claimant corrects and hides; the owner sees blanks and the list; the owner's update is CLAIMED, a parent link still works", async () => {
    expect(
      await family.answerInvitation({ userId: RELATIVE, tokenHash: hex(token), answer: "ME" }),
    ).toEqual({
      kind: "OK",
      treeId,
      personId: martaId,
    });
    expect(
      await family.answerInvitation({ userId: RELATIVE, tokenHash: hex(token), answer: "ME" }),
    ).toEqual({ kind: "ANSWERED" });
    expect(await family.openInvitation({ userId: RELATIVE, tokenHash: hex(token) })).toEqual({
      kind: "ANSWERED",
    });
    expect(await family.invitationOf({ userId: OWNER, personId: martaId })).toMatchObject({
      answer: "ME",
    });

    const cards = await family.listCards(RELATIVE);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ person_id: martaId, given_names: "Marta" });
    expect(await family.getCard({ userId: OTHER, personId: martaId })).toEqual({
      kind: "NOT_FOUND",
    });

    expect(
      await family.updateCard({
        userId: RELATIVE,
        personId: martaId,
        card: {
          givenNames: "Marta Anna",
          surname: "Zielińska",
          birthSurname: "Wróbel",
          birthYear: 1992,
          birthPlaceText: "Zamość",
          hiddenFields: ["birth_year", "surname"],
        },
      }),
    ).toEqual({ kind: "INVALID", problems: ["HIDDEN_FIELDS"] });
    expect(
      await family.updateCard({
        userId: RELATIVE,
        personId: martaId,
        card: {
          givenNames: "Marta Anna",
          surname: "Zielińska",
          birthSurname: "Wróbel",
          birthYear: 1992,
          birthPlaceText: "Zamość",
          hiddenFields: ["birth_place", "birth_year"],
        },
      }),
    ).toEqual({ kind: "OK" });
    const mine = await family.getCard({ userId: RELATIVE, personId: martaId });
    expect(mine.kind).toBe("OK");
    if (mine.kind !== "OK") return;
    expect(mine.card.person).toMatchObject({
      given_names: "Marta Anna",
      birth_surname: "Wróbel",
      birth: { year: 1992, place_text: "Zamość" },
      hidden_fields: ["birth_year", "birth_place"],
    });
    expect(mine.card.person.claimed_at).not.toBeNull();

    for (const reader of [OWNER, MEMBER]) {
      const seen = await family.getTree({ userId: reader, treeId });
      if (seen.kind !== "OK") throw new Error("the owner and the editor read the tree");
      const marta = seen.tree.persons.find((p) => p.id === martaId);
      expect(marta).toMatchObject({
        given_names: "Marta Anna",
        birth_surname: "Wróbel",
        birth: { year: null, approx: false, place_code: null, place_text: null },
        living_status: "LIVING",
        claimed: true,
        claimed_by_me: false,
        hidden_fields: ["birth_year", "birth_place"],
        contact_declined: false,
      });
      expect(marta?.notes).toBe("the owner's note");
    }
    expect(
      await family.updatePerson({
        userId: OWNER,
        personId: martaId,
        person: { givenNames: "Marta", surname: "Zielińska", livingStatus: "LIVING" },
      }),
    ).toEqual({ kind: "CLAIMED" });
    expect(
      await family.updatePerson({
        userId: MEMBER,
        personId: martaId,
        person: { givenNames: "Marta", surname: "Zielińska", livingStatus: "LIVING" },
      }),
    ).toEqual({ kind: "CLAIMED" });
    expect(
      await family.setParent({
        userId: OWNER,
        childId: martaId,
        parentId: jozefId,
        role: "FATHER",
      }),
    ).toEqual({ kind: "OK" });
    expect(
      await family.removeParent({ userId: OWNER, childId: martaId, parentId: jozefId }),
    ).toEqual({ kind: "OK" });

    // Nobody else claims a claimed row; one account claims one row per tree.
    const second = randomUUID();
    expect((await invite(ewaId, "ewa@example.test", hex(second))).kind).toBe("OK");
    expect(
      await family.answerInvitation({ userId: RELATIVE, tokenHash: hex(second), answer: "ME" }),
    ).toEqual({
      kind: "INVALID",
      problem: "ALREADY_IN_TREE",
    });
    expect(await family.openInvitation({ userId: OTHER, tokenHash: hex(second) })).toMatchObject({
      kind: "OK",
    });
    expect(await invite(martaId, "someone@example.test")).toEqual({
      kind: "INVALID",
      problem: "CLAIMED",
    });

    const kinds = await sql<{ kind: string }>`
      SELECT kind FROM family.audit_events WHERE tree_id = ${treeId} AND kind IN ('INVITATION_SENT', 'PERSON_CLAIMED') ORDER BY at
    `.execute(db().db);
    expect(kinds.rows.map((r) => r.kind)).toEqual([
      "INVITATION_SENT",
      "PERSON_CLAIMED",
      "INVITATION_SENT",
    ]);
  });

  it("AC-5: leaving clears the claim and the hidden fields, suppresses the address, and the owner's next invitation of it is SUPPRESSED", async () => {
    expect(await family.leaveTree({ userId: OTHER, personId: martaId })).toEqual({
      kind: "NOT_FOUND",
    });
    expect(await family.leaveTree({ userId: RELATIVE, personId: martaId })).toEqual({ kind: "OK" });
    expect(await family.listCards(RELATIVE)).toEqual([]);
    const after = await family.getTree({ userId: OWNER, treeId });
    if (after.kind !== "OK") throw new Error("the owner reads the tree");
    const marta = after.tree.persons.find((p) => p.id === martaId);
    expect(marta).toMatchObject({
      claimed: false,
      hidden_fields: [],
      birth: { year: 1992, place_text: "Zamość" },
      birth_surname: "Wróbel",
    });
    expect(await invite(martaId, "marta@example.test")).toEqual({
      kind: "INVALID",
      problem: "SUPPRESSED",
    });
    expect((await invite(martaId, "another@example.test")).kind).toBe("OK");
    const released = await sql<{ n: number }>`
      SELECT count(*)::int AS n FROM family.audit_events WHERE tree_id = ${treeId} AND kind = 'CLAIM_RELEASED'
    `.execute(db().db);
    expect(released.rows[0]?.n).toBe(1);
  });

  it("AC-4: 'to nie ja' suppresses the address; 'nie chcę kontaktu' also makes the row the owner's alone", async () => {
    const notMe = randomUUID();
    // Ewa's second-token invitation is still pending from above: withdraw it the owner's way first.
    const pending = await family.invitationOf({ userId: OWNER, personId: ewaId });
    if (pending === null) throw new Error("Ewa's invitation is pending");
    expect(
      await family.withdrawInvitation({ userId: OWNER, invitationId: pending.invitation_id }),
    ).toEqual({ kind: "OK" });
    expect((await invite(ewaId, "ewa@example.test", hex(notMe))).kind).toBe("OK");
    expect(
      await family.answerInvitation({ userId: OTHER, tokenHash: hex(notMe), answer: "NOT_ME" }),
    ).toEqual({
      kind: "OK",
      treeId,
      personId: ewaId,
    });
    expect(await family.invitationOf({ userId: OWNER, personId: ewaId })).toMatchObject({
      answer: "NOT_ME",
    });
    expect(await invite(ewaId, "ewa@example.test")).toEqual({
      kind: "INVALID",
      problem: "SUPPRESSED",
    });
    expect(await family.listCards(OTHER)).toEqual([]);

    const noContact = randomUUID();
    expect((await invite(ewaId, "ewa2@example.test", hex(noContact))).kind).toBe("OK");
    expect(
      await family.answerInvitation({
        userId: OTHER,
        tokenHash: hex(noContact),
        answer: "NO_CONTACT",
      }),
    ).toEqual({
      kind: "OK",
      treeId,
      personId: ewaId,
    });
    expect(await invite(ewaId, "third@example.test")).toEqual({
      kind: "INVALID",
      problem: "DECLINED",
    });
    const owner = await family.getTree({ userId: OWNER, treeId });
    if (owner.kind !== "OK") throw new Error("the owner reads the tree");
    expect(owner.tree.persons.find((p) => p.id === ewaId)).toMatchObject({
      contact_declined: true,
      claimed: false,
    });
    const member = await family.getTree({ userId: MEMBER, treeId });
    if (member.kind !== "OK") throw new Error("the editor reads the tree");
    expect(member.tree.persons.map((p) => p.id)).not.toContain(ewaId);
    // The editor sees Marta without the link to a parent they cannot read.
    expect(member.tree.parentage.some((r) => r.parent_id === ewaId)).toBe(false);
    const declined = await sql<{ n: number }>`
      SELECT count(*)::int AS n FROM family.audit_events WHERE tree_id = ${treeId} AND kind = 'CONTACT_DECLINED'
    `.execute(db().db);
    expect(declined.rows[0]?.n).toBe(1);
  });

  it("AC-1: ten invitations per tree per 30 days, and an expired one gives way to a new one", async () => {
    const people: string[] = [];
    for (let i = 0; i < 9; i += 1) {
      const added = await family.addPerson({
        userId: OWNER,
        treeId,
        person: { givenNames: `Osoba${i}`, surname: "Zielińska", livingStatus: "LIVING" },
      });
      if (added.kind !== "OK") throw new Error("fixture person failed");
      people.push(added.personId);
    }
    const sent = await sql<{ n: number }>`
      SELECT count(*)::int AS n FROM family.invitations WHERE tree_id = ${treeId} AND sent_at > now() - interval '30 days'
    `.execute(db().db);
    const room = 10 - (sent.rows[0]?.n ?? 0);
    expect(room).toBeGreaterThan(0);
    for (let i = 0; i < room; i += 1) {
      expect((await invite(people[i]!, `p${i}@example.test`)).kind).toBe("OK");
    }
    expect(await invite(people[room]!, "over@example.test")).toEqual({
      kind: "INVALID",
      problem: "LIMIT",
    });

    // Age the first of them past its expiry: the service then takes a new one for that person once the window allows.
    await sql`
      UPDATE family.invitations SET sent_at = now() - interval '40 days', expires_at = now() - interval '26 days'
      WHERE tree_id = ${treeId} AND person_id = ${people[0]}
    `.execute(db().db);
    const aged = randomUUID();
    const expired = await sql<{ token_hash: string }>`
      SELECT token_hash FROM family.invitations WHERE person_id = ${people[0]}
    `.execute(db().db);
    expect(expired.rows).toHaveLength(1);
    expect(
      await family.openInvitation({ userId: OTHER, tokenHash: expired.rows[0]!.token_hash }),
    ).toEqual({ kind: "EXPIRED" });
    expect(
      await family.answerInvitation({
        userId: OTHER,
        tokenHash: expired.rows[0]!.token_hash,
        answer: "ME",
      }),
    ).toEqual({ kind: "EXPIRED" });
    expect((await invite(people[0]!, "p0-again@example.test", hex(aged))).kind).toBe("OK");
    const now = await sql<{ n: number }>`
      SELECT count(*)::int AS n FROM family.invitations WHERE person_id = ${people[0]}
    `.execute(db().db);
    expect(now.rows[0]?.n).toBe(1);
  });

  it("ADR-0029 §2.6.22: deleting a claimant's account leaves the tree as leaving does, and the deletion succeeds", async () => {
    const kasiaToken = randomUUID();
    const added = await family.addPerson({
      userId: OWNER,
      treeId,
      person: {
        givenNames: "Kasia",
        surname: "Zielińska",
        birthYear: 1990,
        livingStatus: "LIVING",
      },
    });
    if (added.kind !== "OK") throw new Error("fixture person failed");
    // Make room in the window for one more invitation.
    await sql`
      UPDATE family.invitations SET sent_at = now() - interval '40 days' WHERE tree_id = ${treeId}
    `.execute(db().db);
    expect((await invite(added.personId, "kasia@example.test", hex(kasiaToken))).kind).toBe("OK");
    expect(
      (await family.answerInvitation({ userId: LEAVER, tokenHash: hex(kasiaToken), answer: "ME" }))
        .kind,
    ).toBe("OK");
    expect(
      await family.updateCard({
        userId: LEAVER,
        personId: added.personId,
        card: {
          givenNames: "Kasia",
          surname: "Zielińska",
          birthYear: 1990,
          hiddenFields: ["birth_year"],
        },
      }),
    ).toMatchObject({ kind: "OK" });

    // `deleteAccount`'s statement (packages/accounts/src/service.ts), as the app role.
    await sql`DELETE FROM accounts.users WHERE user_id = ${LEAVER}`.execute(createFamilyDb(app()));

    const row = await sql<{
      claimed_by_user_id: string | null;
      claimed_at: Date | null;
      hidden_fields: string[];
    }>`
      SELECT claimed_by_user_id, claimed_at, hidden_fields FROM family.persons WHERE person_id = ${added.personId}
    `.execute(db().db);
    expect(row.rows).toEqual([{ claimed_by_user_id: null, claimed_at: null, hidden_fields: [] }]);
    const after = await family.getTree({ userId: OWNER, treeId });
    if (after.kind !== "OK") throw new Error("the owner reads the tree");
    expect(after.tree.persons.find((p) => p.id === added.personId)).toMatchObject({
      claimed: false,
      hidden_fields: [],
      birth: { year: 1990 },
    });
    expect(await invite(added.personId, "kasia@example.test")).toEqual({
      kind: "INVALID",
      problem: "SUPPRESSED",
    });
    const released = await sql<{ user_id: string | null }>`
      SELECT user_id FROM family.audit_events
      WHERE person_id = ${added.personId} AND kind = 'CLAIM_RELEASED'
    `.execute(db().db);
    expect(released.rows).toEqual([{ user_id: null }]);
  });

  it("0033 down refuses while a claim is stored, and the policies read nothing of a declined row for a member", async () => {
    const claimToken = randomUUID();
    const added = await family.addPerson({
      userId: OWNER,
      treeId,
      person: { givenNames: "Piotr", surname: "Wróbel", livingStatus: "LIVING" },
    });
    if (added.kind !== "OK") throw new Error("fixture person failed");
    // Make room in the window for one more invitation.
    await sql`
      UPDATE family.invitations SET sent_at = now() - interval '40 days' WHERE tree_id = ${treeId} AND person_id <> ${added.personId}
    `.execute(db().db);
    expect((await invite(added.personId, "piotr@example.test", hex(claimToken))).kind).toBe("OK");
    expect(
      (await family.answerInvitation({ userId: OTHER, tokenHash: hex(claimToken), answer: "ME" }))
        .kind,
    ).toBe("OK");
    const migrator = createMigrator(db().db);
    // Down to the migration before 0033: later ones roll back first, then 0033 refuses.
    const { error } = await migrator.migrateTo("0032_accounts_google_identities");
    expect(String(error)).toMatch(/refusing to drop the claims/u);
    const still = await sql<{ n: number }>`
      SELECT count(*)::int AS n FROM family.persons WHERE claimed_by_user_id IS NOT NULL
    `.execute(db().db);
    expect(still.rows[0]?.n).toBe(1);
  });
});
